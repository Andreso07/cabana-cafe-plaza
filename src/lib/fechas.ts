// Fechas como texto "AAAA-MM-DD" y aritmética en UTC: así una noche nunca
// se corre de día por la zona horaria del navegador o del servidor.

export type Fecha = string; // "AAAA-MM-DD"

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaValida(f: unknown): f is Fecha {
  if (typeof f !== "string" || !FORMATO.test(f)) return false;
  const d = aDate(f);
  return !Number.isNaN(d.getTime()) && aTexto(d) === f;
}

export function aDate(f: Fecha): Date {
  return new Date(`${f}T00:00:00Z`);
}

export function aTexto(d: Date): Fecha {
  return d.toISOString().slice(0, 10);
}

export function sumarDias(f: Fecha, dias: number): Fecha {
  const d = aDate(f);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
}

export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / 86_400_000);
}

/** Noches de una estadía: desde la entrada, sin incluir el día de salida. */
export function noches(entrada: Fecha, salida: Fecha): Fecha[] {
  const n = diasEntre(entrada, salida);
  return Array.from({ length: Math.max(0, n) }, (_, i) => sumarDias(entrada, i));
}

/** Hoy en Colombia, sin depender de la zona horaria de la máquina. */
export function hoyEnColombia(): Fecha {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(f: Fecha): number {
  return aDate(f).getUTCDay();
}

export function formatoLargo(f: Fecha): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(aDate(f));
}
