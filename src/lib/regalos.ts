import type { Descuento } from "@/config/cabana";
import { db } from "./db";

type Promo = Extract<Descuento, { tipo: "compra" }>;

/**
 * Las primeras reservas de una promoción que se llevan el regalo (p. ej. las 3 primeras del Black
 * Friday ganan una noche entre semana). Cuentan solo las PAGADAS (confirmadas), hechas en los días de
 * la promoción (hora Colombia) y con ese descuento aplicado. El orden es el del pago: cuando el
 * cliente reportó su comprobante en la web o, si no, cuando se confirmó el pago.
 * Devuelve los códigos de las ganadoras, en orden (como mucho `regalos`).
 */
export async function ganadorasDelRegalo(p: Promo): Promise<string[]> {
  const cupos = p.regalos ?? 0;
  if (cupos <= 0) return [];
  const filas = await db()<{ codigo: string }[]>`
    select codigo from reservas
    where estado = 'confirmada'
      and descuento_nombre = ${p.nombre}
      and (creada_en at time zone 'America/Bogota')::date between ${p.compraDesde}::date and ${p.compraHasta}::date
    order by coalesce(pago_reportado_en, pago_fecha, creada_en), codigo
    limit ${cupos}`;
  return filas.map((f) => f.codigo);
}

/** Todas las promociones con regalo de la configuración, con sus ganadoras (para el panel). */
export async function ganadorasDeTodas(descuentos: Descuento[]): Promise<Map<string, Promo>> {
  const conRegalo = descuentos.filter((d): d is Promo => d.tipo === "compra" && (d.regalos ?? 0) > 0);
  const mapa = new Map<string, Promo>();
  for (const p of conRegalo) for (const c of await ganadorasDelRegalo(p)) mapa.set(c, p);
  return mapa;
}
