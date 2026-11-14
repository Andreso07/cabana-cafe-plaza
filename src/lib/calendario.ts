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

/** Fecha de Colombia de un DTSTART/DTEND. Devuelve también si era un día completo. */
function fechaDe(valor: string): { fecha: Fecha; diaCompleto: boolean } | null {
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, a, me, d, h, mi, s, z] = m;
  if (!h) return { fecha: `${a}-${me}-${d}`, diaCompleto: true };
  if (z) {
    // UTC → Colombia (UTC−5 todo el año, sin horario de verano).
    const t = Date.UTC(+a, +me - 1, +d, +h, +mi, +s) - 5 * 3600_000;
    return { fecha: new Date(t).toISOString().slice(0, 10), diaCompleto: false };
  }
  // Hora local con TZID (o sin zona): se toma la fecha tal cual. Para un calendario
  // en Colombia es exacto; en otra zona puede correr un día un evento de madrugada.
  return { fecha: `${a}-${me}-${d}`, diaCompleto: false };
}

/**
 * Eventos de un .ics convertidos a noches ocupadas. Un evento de día completo ocupa desde su
 * inicio hasta el día anterior a su fin; uno con hora, desde el día en que empieza hasta el día
 * anterior al que termina (salir el domingo a mediodía no ocupa la noche del domingo), y como
 * mínimo la noche del día en que empieza.
 * Se ignoran los cancelados, los marcados como «Disponible» y los que generó esta misma web.
 * Las repeticiones (RRULE) no se expanden: cuenta solo la primera.
 */
export function leerIcs(ics: string): EventoExterno[] {
  const eventos: EventoExterno[] = [];
  let ev: Record<string, string> | null = null;
  for (const linea of lineas(ics)) {
    if (linea === "BEGIN:VEVENT") ev = {};
    else if (linea === "END:VEVENT" && ev) {
      const ini = ev.DTSTART ? fechaDe(ev.DTSTART) : null;
      const fin = ev.DTEND ? fechaDe(ev.DTEND) : null;
      const ignorar =
        !ini ||
        ev.STATUS === "CANCELLED" ||
        ev.TRANSP === "TRANSPARENT" ||
        (ev.UID ?? "").endsWith(`@${DOMINIO_UID}`);
      if (!ignorar && ini) {
        let hasta = fin?.fecha ?? sumarDias(ini.fecha, 1);
        if (hasta <= ini.fecha) hasta = sumarDias(ini.fecha, 1);
        eventos.push({ desde: ini.fecha, hasta, resumen: desescapar(ev.SUMMARY ?? "Ocupado").slice(0, 80) });
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
  const { googleIcalUrl: url } = await leerConfig();
  if (!url) return { configurado: false, eventos: [], leidoEn: null, error: null };

  const previo = g.__calendarioExterno?.url === url ? g.__calendarioExterno : undefined;
  if (previo && !previo.error && Date.now() - previo.leido < VIGENCIA_MS) return estado(previo);

  try {
    const r = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Google respondió ${r.status}`);
    const texto = (await r.text()).slice(0, 3_000_000);
    if (!texto.includes("BEGIN:VCALENDAR")) throw new Error("La dirección no devolvió un calendario");
    const desde = sumarDias(hoyEnColombia(), -1);
    const eventos = leerIcs(texto).filter((e) => e.hasta > desde);
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
