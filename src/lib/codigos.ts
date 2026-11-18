// Códigos de descuento de colaboradores (tabla `codigos_descuento`). Solo los lee el servidor:
// el navegador manda el código que escribió el cliente y recibe su porcentaje si es válido.
import type { Sql } from "postgres";
import { db } from "./db";
import { hoyEnColombia } from "./fechas";
import type { CodigoAplicable } from "./precios";

export const FORMATO_CODIGO = /^[A-Z0-9-]{3,20}$/;

/** «laura 10» → «LAURA10». Devuelve "" si no tiene forma de código. */
export function normalizarCodigo(v: unknown): string {
  if (typeof v !== "string") return "";
  const c = v.toUpperCase().replace(/\s+/g, "").slice(0, 20);
  return FORMATO_CODIGO.test(c) ? c : "";
}

export type CodigoDescuento = {
  codigo: string;
  colaborador: string;
  porcentaje: number;
  activo: boolean;
  vence: string | null;
  maxUsos: number | null;
  /** Reservas activas o pagadas con este código (las que cuentan para el límite). */
  usos: number;
  confirmadas: number;
  /** Suma de los totales de las reservas confirmadas con este código. */
  vendido: number;
  creadoEn: string;
};

type Fila = {
  codigo: string;
  colaborador: string;
  porcentaje: number;
  activo: boolean;
  vence: string | null;
  max_usos: number | null;
  usos: number;
  confirmadas: number;
  vendido: number;
  creado_en: Date;
};

// Cuenta como uso una reserva pagada o una pendiente que todavía aparta fechas.
const USOS = `count(r.codigo) filter (where r.estado = 'confirmada' or (r.estado = 'pendiente' and r.expira_en > now()))::int`;

export async function listarCodigos(): Promise<CodigoDescuento[]> {
  const filas = await db().unsafe<Fila[]>(
    `select c.codigo, c.colaborador, c.porcentaje, c.activo, c.vence::text as vence, c.max_usos, c.creado_en,
            ${USOS} as usos,
            count(r.codigo) filter (where r.estado = 'confirmada')::int as confirmadas,
            coalesce(sum(r.total) filter (where r.estado = 'confirmada'), 0)::int as vendido
       from codigos_descuento c
       left join reservas r on r.codigo_descuento = c.codigo
      group by c.codigo
      order by c.creado_en desc`,
  );
  return filas.map((f) => ({
    codigo: f.codigo,
    colaborador: f.colaborador,
    porcentaje: f.porcentaje,
    activo: f.activo,
    vence: f.vence,
    maxUsos: f.max_usos,
    usos: f.usos,
    confirmadas: f.confirmadas,
    vendido: f.vendido,
    creadoEn: f.creado_en.toISOString(),
  }));
}

export type ResultadoCodigo = { ok: true; codigo: CodigoAplicable } | { ok: false; error: string };

const NO_VALIDO = "Ese código no es válido o ya venció.";

/**
 * ¿El código existe, está activo, no ha vencido y le quedan usos? Con `tx`, se consulta dentro de
 * la transacción de la reserva (bajo su candado), para que dos reservas a la vez no pasen el límite.
 */
export async function validarCodigo(texto: unknown, tx?: Pick<Sql, "unsafe">): Promise<ResultadoCodigo> {
  const codigo = normalizarCodigo(texto);
  if (!codigo) return { ok: false, error: NO_VALIDO };
  const sql = tx ?? db();
  const [f] = await sql.unsafe<{ porcentaje: number; activo: boolean; vence: string | null; max_usos: number | null; usos: number }[]>(
    `select c.porcentaje, c.activo, c.vence::text as vence, c.max_usos, ${USOS} as usos
       from codigos_descuento c
       left join reservas r on r.codigo_descuento = c.codigo
      where c.codigo = $1
      group by c.codigo`,
    [codigo],
  );
  if (!f || !f.activo || (f.vence && f.vence < hoyEnColombia())) return { ok: false, error: NO_VALIDO };
  if (f.max_usos !== null && f.usos >= f.max_usos) return { ok: false, error: "Ese código ya se usó el máximo de veces." };
  return { ok: true, codigo: { codigo, porcentaje: f.porcentaje } };
}

export class CodigoYaExiste extends Error {}

export async function crearCodigo(c: {
  codigo: string;
  colaborador: string;
  porcentaje: number;
  vence: string | null;
  maxUsos: number | null;
}): Promise<void> {
  try {
    await db()`
      insert into codigos_descuento (codigo, colaborador, porcentaje, vence, max_usos)
      values (${c.codigo}, ${c.colaborador}, ${c.porcentaje}, ${c.vence}, ${c.maxUsos})`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new CodigoYaExiste(`El código ${c.codigo} ya existe`);
    throw e;
  }
}

export async function alternarCodigo(codigo: string): Promise<void> {
  await db()`update codigos_descuento set activo = not activo where codigo = ${codigo}`;
}

/** Borra el código. Las reservas que lo usaron conservan el texto, así que siguen en las estadísticas. */
export async function borrarCodigo(codigo: string): Promise<void> {
  await db()`delete from codigos_descuento where codigo = ${codigo}`;
}
