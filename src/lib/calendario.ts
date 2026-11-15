// Google Calendar, en las dos direcciones, con el formato iCal (.ics), sin cuentas ni llaves de API:
//
//  - Entrada: la «dirección secreta en formato iCal» del calendario donde el agente de WhatsApp
//    anota las reservas. Cada evento ocupa sus noches en la web.
//  - Salida: un enlace .ics con las reservas y bloqueos de la web, que Google Calendar
//    agrega con «Desde URL». Google lo vuelve a leer cada varias horas (eso lo decide Google).
import { leerConfig } from "./config";
import { hoyEnColombia, sumarDias, type Fecha } from "./fechas";
import type { Bloqueo, Reserva } from "./store";

/** Marca de los eventos que genera esta web, para no importarlos de vuelta. */
export const DOMINIO_UID = "cabana-cafe-plaza";

export type EventoExterno = { desde: Fecha; hasta: Fecha; resumen: string }; // hasta = salida (esa noche no)

// ---------- Lectura de un .ics ----------

/** Junta las líneas partidas (RFC 5545: una línea que sigue empieza con espacio o tab). */
function lineas(ics: string): string[] {
  return ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function desescapar(v: string): string {
  return v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** Un DTSTART/DTEND en hora de Colombia: el día y, si no es de día completo, los minutos desde medianoche. */
function momentoDe(valor: string): { fecha: Fecha; minutos: number | null } | null {
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, a, me, d, h, mi, , z] = m;
  if (!h) return { fecha: `${a}-${me}-${d}`, minutos: null };
  if (z) {
    // UTC → Colombia (UTC−5 todo el año, sin horario de verano).
    const t = new Date(Date.UTC(+a, +me - 1, +d, +h, +mi) - 5 * 3600_000);
    return { fecha: t.toISOString().slice(0, 10), minutos: t.getUTCHours() * 60 + t.getUTCMinutes() };
  }
  // Hora local con TZID (o sin zona): se toma tal cual. Para un calendario en Colombia es exacto.
  return { fecha: `${a}-${me}-${d}`, minutos: +h * 60 + +mi };
}

/** Horas de entrada y salida de una noche, en minutos desde medianoche. */
export type Horario = { entrada: number; salida: number };
export const HORARIO_POR_DEFECTO: Horario = { entrada: 16 * 60, salida: 12 * 60 };

/** «4:00 p. m.» → 960; «12:00 m.» → 720; «10 a. m.» → 600. Si no se entiende, `defecto`. */
export function aMinutos(texto: string, defecto: number): number {
  const m = texto.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*([ap])?/);
  if (!m) return defecto;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  if (h > 23 || min > 59) return defecto;
  if (m[3] === "p" && h < 12) h += 12;
  if (m[3] === "a" && h === 12) h = 0;
  return h * 60 + min;
}

const dia = (f: Fecha) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) / 86_400_000;

/**
 * Noches que ocupa un evento con hora: la noche del día D va de la entrada de D a la salida de D+1,
 * y la ocupa todo evento que se cruce con ese tramo. Así una reserva por horas de 9:00 a. m. a
 * 2:00 p. m. no ocupa ninguna noche si la anterior se fue a las 12:00 y la siguiente llega a las 4:00;
 * una de 3:00 a 6:00 p. m. sí ocupa la noche de ese día.
 */
function nochesConHora(ini: Fecha, iniMin: number, fin: Fecha, finMin: number, h: Horario): { desde: Fecha; hasta: Fecha } | null {
  const s = dia(ini) * 1440 + iniMin;
  let e = dia(fin) * 1440 + finMin;
  if (e <= s) e = s + 60; // sin fin o fin antes del inicio: una hora
  let desde: Fecha | null = null;
  let hasta: Fecha | null = null;
  for (let d = sumarDias(ini, -1); d <= fin; d = sumarDias(d, 1)) {
    const nocheIni = dia(d) * 1440 + h.entrada;
    const nocheFin = (dia(d) + 1) * 1440 + h.salida;
    if (s < nocheFin && e > nocheIni) {
      desde ??= d;
      hasta = sumarDias(d, 1);
    }
  }
  return desde && hasta ? { desde, hasta } : null;
}

/**
 * Eventos de un .ics convertidos a noches ocupadas. Uno de día completo ocupa desde su inicio
 * hasta el día anterior a su fin. Uno con hora ocupa las noches con las que se cruza (ver
 * `nochesConHora`): una reserva por horas que cabe entre la salida y la entrada no ocupa ninguna.
 * Se ignoran los cancelados, los marcados como «Disponible» y los que generó esta misma web.
 * Las repeticiones (RRULE) no se expanden: cuenta solo la primera.
 */
export function leerIcs(ics: string, horario: Horario = HORARIO_POR_DEFECTO): EventoExterno[] {
  const eventos: EventoExterno[] = [];
  let ev: Record<string, string> | null = null;
  for (const linea of lineas(ics)) {
    if (linea === "BEGIN:VEVENT") ev = {};
    else if (linea === "END:VEVENT" && ev) {
      const ini = ev.DTSTART ? momentoDe(ev.DTSTART) : null;
      const fin = ev.DTEND ? momentoDe(ev.DTEND) : null;
      const ignorar =
        !ini ||
        ev.STATUS === "CANCELLED" ||
        ev.TRANSP === "TRANSPARENT" ||
        (ev.UID ?? "").endsWith(`@${DOMINIO_UID}`) ||
        // Los que la web escribe con la API de Google (ver googleCalendar.ts): ya están en la web.
        /^cabana[01][0-9a-f]+@google\.com$/.test(ev.UID ?? "");
      if (!ignorar && ini) {
        const resumen = desescapar(ev.SUMMARY ?? "Ocupado").slice(0, 80);
        if (ini.minutos === null) {
          let hasta = fin?.fecha ?? sumarDias(ini.fecha, 1);
          if (hasta <= ini.fecha) hasta = sumarDias(ini.fecha, 1);
          eventos.push({ desde: ini.fecha, hasta, resumen });
        } else {
          const n = nochesConHora(ini.fecha, ini.minutos, fin?.fecha ?? ini.fecha, fin?.minutos ?? ini.minutos, horario);
          if (n) eventos.push({ ...n, resumen });
        }
      }
      ev = null;
    } else if (ev) {
      const i = linea.indexOf(":");
      if (i > 0) {
        const nombre = linea.slice(0, i).split(";")[0].toUpperCase();
        if (!(nombre in ev)) ev[nombre] = linea.slice(i + 1).trim();
      }
    }
  }
  return eventos;
}

// ---------- Descarga con caché ----------

const VIGENCIA_MS = 2 * 60_000;

type Cache = { url: string; eventos: EventoExterno[]; leido: number; error?: string };
const g = globalThis as unknown as { __calendarioExterno?: Cache };

export type EstadoExterno = {
  configurado: boolean;
  eventos: EventoExterno[];
  leidoEn: string | null;
  error: string | null;
};

/**
 * Eventos del Google Calendar del dueño, leídos como mucho cada 2 minutos.
 * Si Google no responde se usan los últimos que se leyeron bien, y el error queda a la vista
 * en el panel. Nunca lanza: un Google caído no debe tumbar la web de reservas.
 */
export async function eventosExternos(): Promise<EstadoExterno> {
  const { googleIcalUrl: url, checkIn, checkOut } = await leerConfig();
  const horario: Horario = {
    entrada: aMinutos(checkIn, HORARIO_POR_DEFECTO.entrada),
    salida: aMinutos(checkOut, HORARIO_POR_DEFECTO.salida),
  };
  if (!url) return { configurado: false, eventos: [], leidoEn: null, error: null };

  const previo = g.__calendarioExterno?.url === url ? g.__calendarioExterno : undefined;
  if (previo && !previo.error && Date.now() - previo.leido < VIGENCIA_MS) return estado(previo);

  try {
    const r = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Google respondió ${r.status}`);
    const texto = (await r.text()).slice(0, 3_000_000);
    if (!texto.includes("BEGIN:VCALENDAR")) throw new Error("La dirección no devolvió un calendario");
    const desde = sumarDias(hoyEnColombia(), -1);
    const eventos = leerIcs(texto, horario).filter((e) => e.hasta > desde);
    g.__calendarioExterno = { url, eventos, leido: Date.now() };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[calendario] No se pudo leer Google Calendar: ${error}`);
    g.__calendarioExterno = { url, eventos: previo?.eventos ?? [], leido: previo?.leido ?? 0, error };
  }
  return estado(g.__calendarioExterno!);
}

function estado(c: Cache): EstadoExterno {
  return {
    configurado: true,
    eventos: c.eventos,
    leidoEn: c.leido ? new Date(c.leido).toISOString() : null,
    error: c.error ?? null,
  };
}

/** Noches que ocupan los eventos de Google. */
export function nochesDe(eventos: EventoExterno[]): Set<Fecha> {
  const noches = new Set<Fecha>();
  for (const e of eventos) {
    // Tope de un año por evento, por si alguien crea uno larguísimo por error.
    const tope = sumarDias(e.desde, 366);
    for (let f = e.desde; f < e.hasta && f < tope; f = sumarDias(f, 1)) noches.add(f);
  }
  return noches;
}

// ---------- Escritura del .ics que lee Google ----------

function escapar(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const sinGuiones = (f: Fecha) => f.replace(/-/g, "");

/** Parte las líneas a 75 octetos, como pide el formato. */
function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = "";
  for (const c of linea) {
    if (Buffer.byteLength(actual + c) > 74) {
      partes.push(actual);
      actual = " ";
    }
    actual += c;
  }
  partes.push(actual);
  return partes.join("\r\n");
}

export function generarIcs(nombre: string, reservas: Reserva[], bloqueos: Bloqueo[]): string {
  const ahora = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const evento = (uid: string, desde: Fecha, hasta: Fecha, resumen: string, detalle: string) => [
    "BEGIN:VEVENT",
    `UID:${uid}@${DOMINIO_UID}`,
    `DTSTAMP:${ahora}`,
    `DTSTART;VALUE=DATE:${sinGuiones(desde)}`,
    `DTEND;VALUE=DATE:${sinGuiones(hasta)}`,
    `SUMMARY:${escapar(resumen)}`,
    `DESCRIPTION:${escapar(detalle)}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];
  const lineasIcs = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${DOMINIO_UID}//reservas//ES`,
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapar(`${nombre} · reservas web`)}`,
    "X-WR-TIMEZONE:America/Bogota",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...reservas.flatMap((r) =>
      evento(
        r.codigo,
        r.entrada,
        r.salida,
        `${r.estado === "confirmada" ? "Reservada" : "Apartada sin pago"} · ${r.nombre} · ${r.codigo}`,
        `${r.huespedes} personas. Tel. ${r.telefono}. Total ${r.total}, anticipo ${r.anticipo}.` +
          (r.estado === "pendiente" ? " Si no paga a tiempo, las fechas se liberan solas." : ""),
      ),
    ),
    ...bloqueos.flatMap((b) => evento(`bloqueo-${b.id}`, b.desde, sumarDias(b.hasta, 1), `Bloqueada · ${b.motivo}`, b.motivo)),
    "END:VCALENDAR",
  ];
  return lineasIcs.map(plegar).join("\r\n") + "\r\n";
}
