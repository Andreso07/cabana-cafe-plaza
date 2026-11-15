// Cálculo de precios. Lo usan el calendario (para mostrar) y el servidor
// (para cobrar) con la misma configuración: el servidor nunca confía en el
// total que manda el navegador.
import type { Config, Descuento } from "@/config/cabana";
import { diaSemana, noches, sumarDias, type Fecha } from "./fechas";
import { esFestivo } from "./festivos";

/** Lo que el cálculo necesita de la configuración (es lo que viaja al navegador). */
export type ConfigPrecios = Pick<
  Config,
  | "precios"
  | "preciosGrupo"
  | "personasPrecioBase"
  | "nochesCerradas"
  | "porcentajeAnticipo"
  | "minNoches"
  | "fechasEspeciales"
  | "descuentos"
>;

/** Noche que no se alquila (los lunes, por ejemplo), salvo que ese día sea festivo. */
export function nocheCerrada(fecha: Fecha, cfg: Pick<ConfigPrecios, "nochesCerradas">): boolean {
  return cfg.nochesCerradas.includes(diaSemana(fecha)) && !esFestivo(fecha);
}

export type TipoNoche = "semana" | "viernes" | "finDeSemana" | "especial";

/**
 * Tipo y precio de una noche. Con más de `personasPrecioBase` huéspedes se usa el precio
 * de grupo (las «2 parejas»).
 */
export function tipoNoche(
  fecha: Fecha,
  cfg: ConfigPrecios,
  huespedes = 1,
): { tipo: TipoNoche; precio: number; nombre?: string } {
  const grupo = huespedes > cfg.personasPrecioBase;
  const especial = cfg.fechasEspeciales.find((e) => fecha >= e.desde && fecha <= e.hasta);
  if (especial) {
    return { tipo: "especial", precio: grupo ? (especial.precioGrupo ?? especial.precio) : especial.precio, nombre: especial.nombre };
  }
  const tabla = grupo ? cfg.preciosGrupo : cfg.precios;
  const dia = diaSemana(fecha);
  // Sábado, domingo, día festivo o víspera de festivo.
  if (dia === 6 || dia === 0 || esFestivo(fecha) || esFestivo(sumarDias(fecha, 1))) {
    return { tipo: "finDeSemana", precio: tabla.finDeSemana };
  }
  if (dia === 5) return { tipo: "viernes", precio: tabla.viernes };
  return { tipo: "semana", precio: tabla.semana };
}

const aMil = (v: number) => Math.round(v / 1000) * 1000;

export type Cotizacion = {
  noches: { fecha: Fecha; precio: number; tipo: TipoNoche; nombre?: string }[];
  subtotal: number;
  descuento: { nombre: string; porcentaje: number; valor: number } | null;
  total: number;
  anticipo: number;
  saldo: number;
  minNoches: number;
};

function aplica(d: Descuento, entrada: Fecha, n: number): boolean {
  if (!d.activo || d.porcentaje <= 0) return false;
  return d.tipo === "noches" ? n >= d.minNoches : entrada >= d.desde && entrada <= d.hasta;
}

export function cotizar(entrada: Fecha, salida: Fecha, cfg: ConfigPrecios, huespedes: number): Cotizacion {
  const lista = noches(entrada, salida).map((fecha) => ({ fecha, ...tipoNoche(fecha, cfg, huespedes) }));
  const subtotal = lista.reduce((s, n) => s + n.precio, 0);

  // Se aplica el mejor descuento disponible; no se acumulan.
  const mejor = cfg.descuentos
    .filter((d) => aplica(d, entrada, lista.length))
    .sort((a, b) => b.porcentaje - a.porcentaje)[0];
  const descuento = mejor
    ? { nombre: mejor.nombre, porcentaje: mejor.porcentaje, valor: aMil((subtotal * mejor.porcentaje) / 100) }
    : null;

  const total = subtotal - (descuento?.valor ?? 0);
  const anticipo = aMil((total * cfg.porcentajeAnticipo) / 100);
  return { noches: lista, subtotal, descuento, total, anticipo, saldo: total - anticipo, minNoches: cfg.minNoches };
}

export function pesos(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
