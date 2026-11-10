// Festivos de Colombia (Ley 51 de 1983, "Ley Emiliani").
import { aTexto, diaSemana, sumarDias, type Fecha } from "./fechas";

function domingoDePascua(anio: number): Fecha {
  // Algoritmo anónimo gregoriano (Meeus/Jones/Butcher).
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aTexto(new Date(Date.UTC(anio, mes - 1, dia)));
}

/** Traslada al lunes siguiente si no cae en lunes. */
function alLunes(f: Fecha): Fecha {
  const dia = diaSemana(f);
  return dia === 1 ? f : sumarDias(f, (8 - dia) % 7);
}

const cache = new Map<number, Set<Fecha>>();

export function festivosDelAnio(anio: number): Set<Fecha> {
  const enCache = cache.get(anio);
  if (enCache) return enCache;

  const f = (mes: number, dia: number) =>
    `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const pascua = domingoDePascua(anio);

  const lista: Fecha[] = [
    // Fijos
    f(1, 1), f(5, 1), f(7, 20), f(8, 7), f(12, 8), f(12, 25),
    // Trasladables al lunes
    alLunes(f(1, 6)), alLunes(f(3, 19)), alLunes(f(6, 29)), alLunes(f(8, 15)),
    alLunes(f(10, 12)), alLunes(f(11, 1)), alLunes(f(11, 11)),
    // Según la Pascua
    sumarDias(pascua, -3), // Jueves Santo
    sumarDias(pascua, -2), // Viernes Santo
    sumarDias(pascua, 43), // Ascensión (lunes)
    sumarDias(pascua, 64), // Corpus Christi (lunes)
    sumarDias(pascua, 71), // Sagrado Corazón (lunes)
  ];
  const set = new Set(lista);
  cache.set(anio, set);
  return set;
}

export function esFestivo(fecha: Fecha): boolean {
  return festivosDelAnio(Number(fecha.slice(0, 4))).has(fecha);
}
