// Cálculo de precios. Lo usan el calendario (para mostrar) y el servidor
// (para cobrar): el servidor nunca confía en el total que manda el navegador.
import { PRECIOS } from "@/config/cabana";
import { diaSemana, noches, sumarDias, type Fecha } from "./fechas";
import { esFestivo } from "./festivos";

export type TipoNoche = "semana" | "finDeSemana" | "temporadaAlta";

function enTemporadaAlta(fecha: Fecha): boolean {
  const md = fecha.slice(5); // "MM-DD"
  return PRECIOS.temporadasAltas.some(({ desde, hasta }) =>
    desde <= hasta ? md >= desde && md <= hasta : md >= desde || md <= hasta,
  );
}

/** La noche que empieza en `fecha` es víspera de festivo (puente). */
export function esNochePuente(fecha: Fecha): boolean {
  return esFestivo(sumarDias(fecha, 1));
}

export function tipoNoche(fecha: Fecha): TipoNoche {
  if (enTemporadaAlta(fecha)) return "temporadaAlta";
  const dia = diaSemana(fecha);
  if (dia === 5 || dia === 6 || esNochePuente(fecha) || esFestivo(fecha)) return "finDeSemana";
  return "semana";
}

export function precioNoche(fecha: Fecha): number {
  switch (tipoNoche(fecha)) {
    case "temporadaAlta":
      return PRECIOS.nocheTemporadaAlta;
    case "finDeSemana":
      return PRECIOS.nocheFinDeSemana;
    default:
      return PRECIOS.nocheEntreSemana;
  }
}

export type Cotizacion = {
  noches: { fecha: Fecha; precio: number; tipo: TipoNoche }[];
  total: number;
  anticipo: number;
  saldo: number;
  minNoches: number;
};

export function cotizar(entrada: Fecha, salida: Fecha): Cotizacion {
  const lista = noches(entrada, salida).map((fecha) => ({
    fecha,
    precio: precioNoche(fecha),
    tipo: tipoNoche(fecha),
  }));
  const total = lista.reduce((s, n) => s + n.precio, 0);
  // El anticipo se redondea a mil pesos para que el valor sea fácil de leer.
  const anticipo = Math.round((total * PRECIOS.porcentajeAnticipo) / 100 / 1000) * 1000;
  const minNoches = lista.some((n) => esNochePuente(n.fecha))
    ? PRECIOS.minNochesPuente
    : PRECIOS.minNoches;
  return { noches: lista, total, anticipo, saldo: total - anticipo, minNoches };
}

export function pesos(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
