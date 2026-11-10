// Reservas y bloqueos, sobre Postgres (esquema en db/schema.sql).
//
// Dos garantías contra la reserva doble:
//  1. Toda escritura toma el mismo candado de transacción (pg_advisory_xact_lock),
//     así que dos reservas que llegan a la vez se atienden una detrás de otra.
//  2. La restricción `reservas_sin_solape` de la base rechaza cualquier solape que
//     se escape del código.
import { randomBytes } from "node:crypto";
import type { Fecha } from "./fechas";
import { db } from "./db";

export type EstadoReserva = "pendiente" | "confirmada" | "cancelada" | "expirada";

export type Reserva = {
  codigo: string;
  entrada: Fecha;
  salida: Fecha;
  huespedes: number;
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
  total: number;
  anticipo: number;
  estado: EstadoReserva;
  creadaEn: string;
  expiraEn: string;
  pago?: { proveedor: "wompi" | "manual" | "simulado"; id: string; fecha: string };
  notas?: string;
};

export type Bloqueo = { id: string; desde: Fecha; hasta: Fecha; motivo: string };

const CANDADO_RESERVAS = 727_001;

type Fila = {
  codigo: string;
  entrada: string;
  salida: string;
  huespedes: number;
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
  total: number;
  anticipo: number;
  estado: EstadoReserva;
  creada_en: Date;
  expira_en: Date;
  pago_proveedor: "wompi" | "manual" | "simulado" | null;
  pago_id: string | null;
  pago_fecha: Date | null;
  notas: string | null;
};

// Una pendiente vencida se lee como expirada aunque nadie la haya actualizado todavía.
const COLUMNAS = `
  codigo, entrada::text as entrada, salida::text as salida, huespedes, nombre, documento,
  email, telefono, total, anticipo,
  case when estado = 'pendiente' and expira_en <= now() then 'expirada' else estado end as estado,
  creada_en, expira_en, pago_proveedor, pago_id, pago_fecha, notas`;

function aReserva(f: Fila): Reserva {
  return {
    codigo: f.codigo,
    entrada: f.entrada,
    salida: f.salida,
    huespedes: f.huespedes,
    nombre: f.nombre,
    documento: f.documento,
    email: f.email,
    telefono: f.telefono,
    total: f.total,
    anticipo: f.anticipo,
    estado: f.estado,
    creadaEn: f.creada_en.toISOString(),
    expiraEn: f.expira_en.toISOString(),
    ...(f.pago_proveedor && f.pago_id && f.pago_fecha
      ? { pago: { proveedor: f.pago_proveedor, id: f.pago_id, fecha: f.pago_fecha.toISOString() } }
      : {}),
    ...(f.notas ? { notas: f.notas } : {}),
  };
}

function nuevoCodigo(): string {
  // Sin 0/O ni 1/I para que se pueda dictar por teléfono.
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "CP-" + Array.from(randomBytes(6), (b) => abc[b % abc.length]).join("");
}

/** Noches ocupadas desde ayer en adelante (reservas activas y bloqueos). */
export async function obtenerNochesOcupadas(): Promise<Fecha[]> {
  const sql = db();
  const filas = await sql<{ noche: string }[]>`
    select distinct noche::date::text as noche from (
      select generate_series(entrada, salida - 1, interval '1 day') as noche
        from reservas
       where (estado = 'confirmada' or (estado = 'pendiente' and expira_en > now()))
         and salida >= current_date - 1
      union all
      select generate_series(desde, hasta, interval '1 day')
        from bloqueos
       where hasta >= current_date - 1
    ) n
    order by 1`;
  return filas.map((f) => f.noche);
}

export class FechasNoDisponibles extends Error {
  constructor() {
    super("Las fechas elegidas ya no están disponibles");
  }
}

export async function crearReserva(
  d: Omit<Reserva, "codigo" | "estado" | "creadaEn" | "expiraEn" | "pago" | "notas">,
  minutosApartado: number,
): Promise<Reserva> {
  const sql = db();
  try {
    return await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${CANDADO_RESERVAS})`;
      // Libera las noches de las pendientes vencidas antes de comprobar.
      await tx`update reservas set estado = 'expirada' where estado = 'pendiente' and expira_en <= now()`;

      const [choque] = await tx`
        select 1 from reservas
         where estado in ('pendiente', 'confirmada')
           and daterange(entrada, salida, '[)') && daterange(${d.entrada}::date, ${d.salida}::date, '[)')
        union all
        select 1 from bloqueos
         where daterange(desde, hasta, '[]') && daterange(${d.entrada}::date, ${d.salida}::date, '[)')
        limit 1`;
      if (choque) throw new FechasNoDisponibles();

      const [fila] = await tx.unsafe<Fila[]>(
        `insert into reservas (codigo, entrada, salida, huespedes, nombre, documento, email,
                               telefono, total, anticipo, expira_en)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() + make_interval(mins => $11))
         returning ${COLUMNAS}`,
        [
          nuevoCodigo(), d.entrada, d.salida, d.huespedes, d.nombre, d.documento, d.email,
          d.telefono, d.total, d.anticipo, minutosApartado,
        ],
      );
      return aReserva(fila);
    });
  } catch (e) {
    // Si algo se escapó del candado, la restricción de la base lo para.
    if ((e as { code?: string }).code === "23P01") throw new FechasNoDisponibles();
    throw e;
  }
}

export async function obtenerReserva(codigo: string): Promise<Reserva | undefined> {
  const sql = db();
  const [fila] = await sql.unsafe<Fila[]>(
    `select ${COLUMNAS} from reservas where codigo = $1`,
    [codigo],
  );
  return fila ? aReserva(fila) : undefined;
}

export type ResultadoPago =
  | { ok: true; reserva: Reserva }
  | { ok: false; motivo: "no-existe" | "monto-distinto" | "ya-cancelada" | "fechas-ocupadas" };

/**
 * Marca una reserva como pagada. Si el pago llega tarde (la reserva ya expiró),
 * se confirma solo si las noches siguen libres; si no, queda anotada para devolver el dinero.
 * Un aviso repetido de la pasarela no cambia nada.
 */
export async function confirmarPago(
  codigo: string,
  montoPagado: number,
  pago: NonNullable<Reserva["pago"]>,
): Promise<ResultadoPago> {
  const sql = db();
  return sql.begin(async (tx): Promise<ResultadoPago> => {
    await tx`select pg_advisory_xact_lock(${CANDADO_RESERVAS})`;
    await tx`update reservas set estado = 'expirada' where estado = 'pendiente' and expira_en <= now()`;

    const [r] = await tx.unsafe<Fila[]>(
      `select ${COLUMNAS} from reservas where codigo = $1 for update`,
      [codigo],
    );
    if (!r) return { ok: false, motivo: "no-existe" };
    if (r.estado === "confirmada") return { ok: true, reserva: aReserva(r) };
    if (r.estado === "cancelada") return { ok: false, motivo: "ya-cancelada" };
    if (montoPagado !== r.anticipo) return { ok: false, motivo: "monto-distinto" };

    if (r.estado === "expirada") {
      const [choque] = await tx`
        select 1 from reservas
         where codigo <> ${codigo}
           and estado in ('pendiente', 'confirmada')
           and daterange(entrada, salida, '[)') && daterange(${r.entrada}::date, ${r.salida}::date, '[)')
        union all
        select 1 from bloqueos
         where daterange(desde, hasta, '[]') && daterange(${r.entrada}::date, ${r.salida}::date, '[)')
        limit 1`;
      if (choque) {
        await tx`
          update reservas
             set notas = ${`Pago ${pago.id} recibido después de expirar y con las fechas ya ocupadas: devolver el dinero.`}
           where codigo = ${codigo}`;
        return { ok: false, motivo: "fechas-ocupadas" };
      }
    }

    const [fila] = await tx.unsafe<Fila[]>(
      `update reservas
          set estado = 'confirmada', pago_proveedor = $2, pago_id = $3, pago_fecha = $4
        where codigo = $1
      returning ${COLUMNAS}`,
      [codigo, pago.proveedor, pago.id, pago.fecha],
    );
    return { ok: true, reserva: aReserva(fila) };
  });
}

export async function cancelarReserva(codigo: string): Promise<boolean> {
  const sql = db();
  const filas = await sql`update reservas set estado = 'cancelada' where codigo = ${codigo} returning 1`;
  return filas.length > 0;
}

/** Para el panel: lo de los últimos 30 días en adelante (con tope). */
export async function listarTodo(): Promise<{ reservas: Reserva[]; bloqueos: Bloqueo[] }> {
  const sql = db();
  const [reservas, bloqueos] = await Promise.all([
    sql.unsafe<Fila[]>(
      `select ${COLUMNAS} from reservas
        where salida >= current_date - 30 or notas is not null
        order by entrada
        limit 500`,
    ),
    sql<Bloqueo[]>`
      select id::text as id, desde::text as desde, hasta::text as hasta, motivo
        from bloqueos
       where hasta >= current_date - 30
       order by desde
       limit 200`,
  ]);
  return { reservas: reservas.map(aReserva), bloqueos: [...bloqueos] };
}

export async function crearBloqueo(desde: Fecha, hasta: Fecha, motivo: string): Promise<void> {
  const sql = db();
  await sql`insert into bloqueos (desde, hasta, motivo) values (${desde}, ${hasta}, ${motivo})`;
}

export async function quitarBloqueo(id: string): Promise<void> {
  if (!/^\d+$/.test(id)) return;
  const sql = db();
  await sql`delete from bloqueos where id = ${id}`;
}
