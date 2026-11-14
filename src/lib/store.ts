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
  descuento: number;
  descuentoNombre?: string;
  estado: EstadoReserva;
  creadaEn: string;
  expiraEn: string;
  pago?: { proveedor: "wompi" | "manual" | "simulado"; id: string; fecha: string };
  /** Comprobante que el cliente escribió en la web. No es un pago verificado. */
  pagoReportado?: { referencia: string; fecha: string };
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
  descuento: number;
  descuento_nombre: string | null;
  estado: EstadoReserva;
  creada_en: Date;
  expira_en: Date;
  pago_proveedor: "wompi" | "manual" | "simulado" | null;
  pago_id: string | null;
  pago_fecha: Date | null;
  pago_reportado: string | null;
  pago_reportado_en: Date | null;
  notas: string | null;
};

// Una pendiente vencida se lee como expirada aunque nadie la haya actualizado todavía.
const COLUMNAS = `
  codigo, entrada::text as entrada, salida::text as salida, huespedes, nombre, documento,
  email, telefono, total, anticipo, descuento, descuento_nombre,
  case when estado = 'pendiente' and expira_en <= now() then 'expirada' else estado end as estado,
  creada_en, expira_en, pago_proveedor, pago_id, pago_fecha, pago_reportado, pago_reportado_en, notas`;

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
    descuento: f.descuento,
    ...(f.descuento_nombre ? { descuentoNombre: f.descuento_nombre } : {}),
    estado: f.estado,
    creadaEn: f.creada_en.toISOString(),
    expiraEn: f.expira_en.toISOString(),
    ...(f.pago_proveedor && f.pago_id && f.pago_fecha
      ? { pago: { proveedor: f.pago_proveedor, id: f.pago_id, fecha: f.pago_fecha.toISOString() } }
      : {}),
    ...(f.pago_reportado && f.pago_reportado_en
      ? { pagoReportado: { referencia: f.pago_reportado, fecha: f.pago_reportado_en.toISOString() } }
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
                               telefono, total, anticipo, descuento, descuento_nombre, expira_en)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now() + make_interval(mins => $13))
         returning ${COLUMNAS}`,
        [
          nuevoCodigo(), d.entrada, d.salida, d.huespedes, d.nombre, d.documento, d.email,
          d.telefono, d.total, d.anticipo, d.descuento, d.descuentoNombre ?? null, minutosApartado,
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

/** Mayúsculas, sin espacios ni guiones: así «m 123-456» y «M123456» son el mismo comprobante. */
export function normalizarReferencia(texto: string): string {
  return texto.toUpperCase().replace(/[\s\-.#]/g, "");
}

export type ResultadoReporte =
  | { ok: true; reserva: Reserva }
  | { ok: false; motivo: "no-existe" | "ya-confirmada" | "cancelada" | "referencia-invalida" | "referencia-usada" };

/**
 * El cliente dice que pagó y deja el número de comprobante. No confirma nada: solo lo guarda
 * para que el dueño lo cruce con el movimiento real. Mientras tanto la reserva sigue apartada
 * `horasEspera` horas más, para que no se libere antes de que alguien lo revise.
 * Un comprobante que ya aparece en otra reserva se rechaza: es la forma más común de engaño.
 */
export async function reportarPago(codigo: string, referencia: string, horasEspera: number): Promise<ResultadoReporte> {
  const ref = normalizarReferencia(referencia);
  if (!/^[A-Z0-9]{4,40}$/.test(ref)) return { ok: false, motivo: "referencia-invalida" };
  const sql = db();
  return sql.begin(async (tx): Promise<ResultadoReporte> => {
    await tx`select pg_advisory_xact_lock(${CANDADO_RESERVAS})`;
    await tx`update reservas set estado = 'expirada' where estado = 'pendiente' and expira_en <= now()`;
    const [r] = await tx.unsafe<Fila[]>(`select ${COLUMNAS} from reservas where codigo = $1 for update`, [codigo]);
    if (!r) return { ok: false, motivo: "no-existe" };
    if (r.estado === "confirmada") return { ok: false, motivo: "ya-confirmada" };
    if (r.estado === "cancelada") return { ok: false, motivo: "cancelada" };

    const [usada] = await tx`
      select codigo from reservas
       where codigo <> ${codigo}
         and (pago_reportado = ${ref} or upper(regexp_replace(pago_id, '[\\s\\-.#]', '', 'g')) = ${ref})
       limit 1`;
    if (usada) return { ok: false, motivo: "referencia-usada" };

    // Si ya había expirado no se vuelve a apartar (las noches pueden estar tomadas):
    // queda anotada para que el dueño decida al revisar.
    const [fila] = await tx.unsafe<Fila[]>(
      `update reservas
          set pago_reportado = $2,
              pago_reportado_en = now(),
              expira_en = case when estado = 'pendiente'
                               then greatest(expira_en, now() + make_interval(hours => $3))
                               else expira_en end,
              notas = case when estado = 'expirada'
                           then 'Reportó el pago ' || $2 || ' después de expirar: revisar si las fechas siguen libres.'
                           else notas end
        where codigo = $1
      returning ${COLUMNAS}`,
      [codigo, ref, horasEspera],
    );
    return { ok: true, reserva: aReserva(fila) };
  });
}

export type FiltroReservas = {
  vista: "proximas" | "pasadas" | "todas";
  estado: EstadoReserva | "todos";
  q: string;
  pagina: number;
};

export const POR_PAGINA = 50;

/** Búsqueda del panel: por vista de fechas, estado y texto (nombre, documento, código, teléfono). */
export async function buscarReservas(f: FiltroReservas): Promise<{ reservas: Reserva[]; total: number }> {
  const sql = db();
  const condiciones: string[] = [];
  const params: unknown[] = [];
  const estadoReal = `case when estado = 'pendiente' and expira_en <= now() then 'expirada' else estado end`;

  if (f.vista === "proximas") condiciones.push("salida >= current_date");
  if (f.vista === "pasadas") condiciones.push("salida < current_date");
  if (f.estado !== "todos") {
    params.push(f.estado);
    condiciones.push(`${estadoReal} = $${params.length}`);
  }
  const q = f.q.trim().slice(0, 60);
  if (q) {
    params.push(`%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    const p = `$${params.length}`;
    condiciones.push(`(nombre ilike ${p} or documento ilike ${p} or codigo ilike ${p} or telefono ilike ${p} or email ilike ${p})`);
  }
  const where = condiciones.length ? `where ${condiciones.join(" and ")}` : "";
  const orden = f.vista === "pasadas" ? "entrada desc" : "entrada asc";
  const offset = Math.max(0, f.pagina - 1) * POR_PAGINA;

  const [filas, [cuenta]] = await Promise.all([
    sql.unsafe<Fila[]>(
      `select ${COLUMNAS} from reservas ${where} order by ${orden} limit ${POR_PAGINA} offset ${offset}`,
      params as never[],
    ),
    sql.unsafe<{ n: number }[]>(`select count(*)::int as n from reservas ${where}`, params as never[]),
  ]);
  return { reservas: filas.map(aReserva), total: cuenta.n };
}

export type Resumen = {
  proximasConfirmadas: number;
  pendientes: number;
  pagosReportados: number; // pendientes cuyo cliente ya escribió el comprobante
  nochesOcupadasMes: number;
  diasDelMes: number;
  ingresosMes: number; // total de reservas confirmadas que llegan este mes
  anticiposMes: number;
  conNotas: Reserva[];
};

/** Cifras del tablero, con el mes calendario de Colombia. */
export async function resumen(): Promise<Resumen> {
  const sql = db();
  const [[cifras], notas] = await Promise.all([
    sql<{
      proximas: number; pendientes: number; reportados: number; noches: number; dias: number; ingresos: number; anticipos: number;
    }[]>`
      with mes as (
        select date_trunc('month', (now() at time zone 'America/Bogota'))::date as ini,
               (date_trunc('month', (now() at time zone 'America/Bogota')) + interval '1 month')::date as fin
      )
      select
        (select count(*) from reservas where estado = 'confirmada' and salida >= current_date)::int as proximas,
        (select count(*) from reservas where estado = 'pendiente' and expira_en > now())::int as pendientes,
        (select count(*) from reservas
          where estado = 'pendiente' and expira_en > now() and pago_reportado is not null)::int as reportados,
        (select count(distinct d) from reservas r, mes,
           generate_series(greatest(r.entrada, mes.ini), least(r.salida, mes.fin) - 1, interval '1 day') d
          where r.estado = 'confirmada')::int as noches,
        (select fin - ini from mes)::int as dias,
        (select coalesce(sum(total), 0) from reservas, mes
          where estado = 'confirmada' and entrada >= mes.ini and entrada < mes.fin)::int as ingresos,
        (select coalesce(sum(anticipo), 0) from reservas, mes
          where estado = 'confirmada' and entrada >= mes.ini and entrada < mes.fin)::int as anticipos`,
    sql.unsafe<Fila[]>(`select ${COLUMNAS} from reservas where notas is not null order by creada_en desc limit 20`),
  ]);
  return {
    proximasConfirmadas: cifras.proximas,
    pendientes: cifras.pendientes,
    pagosReportados: cifras.reportados,
    nochesOcupadasMes: cifras.noches,
    diasDelMes: cifras.dias,
    ingresosMes: cifras.ingresos,
    anticiposMes: cifras.anticipos,
    conNotas: notas.map(aReserva),
  };
}

/** Reservas que ocupan noches (confirmadas y apartadas vigentes), del último mes en adelante. */
export async function reservasParaCalendario(): Promise<Reserva[]> {
  const sql = db();
  const filas = await sql.unsafe<Fila[]>(
    `select ${COLUMNAS} from reservas
      where (estado = 'confirmada' or (estado = 'pendiente' and expira_en > now()))
        and salida >= current_date - 30
      order by entrada
      limit 1000`,
  );
  return filas.map(aReserva);
}

export async function listarBloqueos(): Promise<Bloqueo[]> {
  const sql = db();
  const filas = await sql<Bloqueo[]>`
    select id::text as id, desde::text as desde, hasta::text as hasta, motivo
      from bloqueos
     where hasta >= current_date
     order by desde
     limit 200`;
  return [...filas];
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
