import type { Config, Periodo } from "@/config/cabana";
import { hoyEnColombia, type Fecha } from "./fechas";

export type Tema = "navidad" | "halloween";

/** ¿El día (MM-DD) cae en el periodo? Funciona también si cruza de año (1 dic → 7 ene). */
export function enPeriodo(mmdd: string, p: Periodo): boolean {
  return p.desde <= p.hasta ? mmdd >= p.desde && mmdd <= p.hasta : mmdd >= p.desde || mmdd <= p.hasta;
}

/**
 * Qué temporada se ve hoy en la web. Con «auto», la decide la fecha (hora Colombia); con un tema
 * elegido a mano, ese; con «ninguna», nada.
 */
export function temporadaDeHoy(cfg: Pick<Config, "temporada" | "fechasNavidad" | "fechasHalloween">, hoy: Fecha = hoyEnColombia()): Tema | null {
  if (cfg.temporada === "navidad" || cfg.temporada === "halloween") return cfg.temporada;
  if (cfg.temporada !== "auto") return null;
  const mmdd = hoy.slice(5);
  if (enPeriodo(mmdd, cfg.fechasNavidad)) return "navidad";
  if (enPeriodo(mmdd, cfg.fechasHalloween)) return "halloween";
  return null;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** «12-01» → «1 dic». */
export function diaMes(mmdd: string): string {
  const [m, d] = mmdd.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/** «1/12» o «01/12» (día/mes) → «12-01»; null si no es una fecha válida. */
export function leerDiaMes(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const maximo = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  if (!maximo || dia < 1 || dia > maximo) return null;
  return `${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
