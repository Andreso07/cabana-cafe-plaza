// Próximas fechas libres para cada tipo de plan. Lo usa el botón de cada plan para dejar
// marcada en el calendario la estadía que anuncia (por ejemplo, el próximo viernes libre).
import { diaSemana, sumarDias, type Fecha } from "./fechas";
import { esFestivo } from "./festivos";
import { nocheCerrada, type ConfigPrecios } from "./precios";

export const SUGERENCIAS = {
  ninguno: "No marcar fechas",
  martes: "Martes (1 noche)",
  viernes: "Viernes (1 noche)",
  sabado: "Sábado (1 noche)",
  domingo: "Domingo (1 noche)",
  puente: "Puente: sábado a lunes festivo (2 noches)",
  festivo: "Festivo o víspera entre semana (1 noche)",
} as const;

export type Sugerencia = keyof typeof SUGERENCIAS;

export function esSugerencia(v: unknown): v is Sugerencia {
  return typeof v === "string" && v in SUGERENCIAS;
}

// Planes guardados antes de existir «sugerir»: se deduce de su id cuando se puede.
const POR_ID: Record<string, Sugerencia> = { semana: "martes", finde: "viernes", puente: "puente", domingo: "domingo", festivo: "festivo" };

export function sugerenciaDe(plan: { id: string; sugerir?: string }): Sugerencia {
  return esSugerencia(plan.sugerir) ? plan.sugerir : (POR_ID[plan.id] ?? "ninguno");
}

/** Si la noche `f` sirve como inicio de ese tipo de plan, cuántas noches abarca; si no, 0. */
function noches(tipo: Sugerencia, f: Fecha): number {
  const dia = diaSemana(f);
  switch (tipo) {
    case "martes":
      return dia === 2 ? 1 : 0;
    case "viernes":
      return dia === 5 ? 1 : 0;
    case "sabado":
      return dia === 6 ? 1 : 0;
    case "domingo":
      return dia === 0 ? 1 : 0;
    case "puente":
      return dia === 6 && esFestivo(sumarDias(f, 2)) ? 2 : 0;
    case "festivo":
      return dia >= 1 && dia <= 5 && (esFestivo(f) || esFestivo(sumarDias(f, 1))) ? 1 : 0;
    default:
      return 0;
  }
}

/**
 * La primera estadía libre de ese tipo, desde `hoy` y hasta `ultimoDia`. Libre quiere decir que
 * ninguna de sus noches está ocupada ni es una noche sin servicio (los lunes).
 */
export function proximaEstadia(
  tipo: Sugerencia,
  hoy: Fecha,
  ultimoDia: Fecha,
  ocupadas: Set<Fecha>,
  cfg: Pick<ConfigPrecios, "nochesCerradas" | "minNoches">,
): { entrada: Fecha; salida: Fecha } | null {
  if (tipo === "ninguno") return null;
  for (let f = hoy; f <= ultimoDia; f = sumarDias(f, 1)) {
    const n = Math.max(noches(tipo, f), noches(tipo, f) ? cfg.minNoches : 0);
    if (!n) continue;
    let libre = true;
    for (let i = 0; i < n && libre; i++) {
      const noche = sumarDias(f, i);
      if (ocupadas.has(noche) || nocheCerrada(noche, cfg) || noche > ultimoDia) libre = false;
    }
    if (libre) return { entrada: f, salida: sumarDias(f, n) };
  }
  return null;
}
