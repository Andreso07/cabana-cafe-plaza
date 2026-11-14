// Escritura directa en el Google Calendar de la cabaña, con una cuenta de servicio de Google
// Cloud (la API de Calendar no se cobra). Así una reserva de la web aparece en Google al
// momento, y el agente de WhatsApp la ve; el enlace .ics que Google lee cada varias horas
// queda solo de respaldo.
//
// No se escribe evento por evento: se compara lo que debería haber (reservas activas y
// bloqueos) con lo que la web dejó en el calendario, y se corrige la diferencia. Así una
// reserva que expira sin pagar, o una llamada que falló, se arregla en la siguiente pasada.
import { createSign } from "node:crypto";
import { after } from "next/server";
import { hoyEnColombia, sumarDias } from "./fechas";
import { listarBloqueos, reservasParaCalendario, type Bloqueo, type Reserva } from "./store";

type Llave = { client_email: string; private_key: string };

/** Marca de los eventos que crea la web, para no tocar nunca los demás. */
const ORIGEN = "cabana-web";
/** Prefijo del id de los eventos de la web. Google exporta el UID como `<id>@google.com`. */
export const PREFIJO_ID = "cabana";

function credenciales(): { llave: Llave; calendario: string } | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calendario = process.env.GOOGLE_CALENDAR_ID;
  if (!json || !calendario) return null;
  // Con la base de pruebas (Docker) la sincronización borraría del calendario real los eventos
  // de las reservas de verdad, porque esa base no las tiene. Solo la base de producción escribe.
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) return null;
  try {
    const llave = JSON.parse(json) as Llave;
    if (!llave.client_email || !llave.private_key) return null;
    return { llave, calendario };
  } catch {
    console.warn("[google] GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido");
    return null;
  }
}

export function googleConfigurado(): boolean {
  return credenciales() !== null;
}

// ---------- Acceso ----------

const g = globalThis as unknown as {
  __googleToken?: { valor: string; vence: number };
  __googleSync?: { en?: Promise<ResultadoSync>; ultimo?: ResultadoSync; ultimaVez: number };
};

async function token(llave: Llave): Promise<string> {
  const t = g.__googleToken;
  if (t && t.vence > Date.now() + 60_000) return t.valor;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const sinFirma = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: llave.client_email,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  })}`;
  const firma = createSign("RSA-SHA256").update(sinFirma).sign(llave.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${sinFirma}.${firma}` }),
    signal: AbortSignal.timeout(8000),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !j.access_token) throw new Error(`Google no dio acceso: ${j.error_description ?? r.status}`);
  g.__googleToken = { valor: j.access_token, vence: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

class ErrorGoogle extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

async function api<T>(llave: Llave, metodo: string, ruta: string, cuerpo?: unknown): Promise<T | null> {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await token(llave)}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 204) return null;
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!r.ok) throw new ErrorGoogle(r.status, j.error?.message ?? `Google respondió ${r.status}`);
  return j;
}

// ---------- Eventos ----------

type Evento = {
  id: string;
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  colorId: string;
  transparency: "opaque";
  extendedProperties: { private: { origen: string } };
};

const hex = (s: string) => Buffer.from(s).toString("hex");
// Colores de Google Calendar: 10 = verde albahaca, 5 = amarillo plátano, 8 = grafito.
function deReserva(r: Reserva): Evento {
  const confirmada = r.estado === "confirmada";
  return {
    id: `${PREFIJO_ID}0${hex(r.codigo)}`,
    summary: `${confirmada ? "✅ Reservada" : "⏳ Apartada sin pago"} · ${r.nombre} · ${r.codigo}`,
    description: [
      `${r.huespedes} personas · Tel. ${r.telefono}`,
      `Total ${r.total.toLocaleString("es-CO")} · anticipo ${r.anticipo.toLocaleString("es-CO")}`,
      confirmada ? "Pago confirmado." : "Aún sin confirmar el pago: si no se paga a tiempo, la web libera las fechas.",
      "Creado por la web de reservas: no lo edites aquí, usa el panel.",
    ].join("\n"),
    start: { date: r.entrada },
    end: { date: r.salida },
    colorId: confirmada ? "10" : "5",
    transparency: "opaque",
    extendedProperties: { private: { origen: ORIGEN } },
  };
}

function deBloqueo(b: Bloqueo): Evento {
  return {
    id: `${PREFIJO_ID}1${hex(b.id)}`,
    summary: `🔒 Bloqueada · ${b.motivo}`,
    description: "Fechas bloqueadas desde el panel de la web.",
    start: { date: b.desde },
    end: { date: sumarDias(b.hasta, 1) },
    colorId: "8",
    transparency: "opaque",
    extendedProperties: { private: { origen: ORIGEN } },
  };
}

const igual = (a: Evento, b: Partial<Evento>) =>
  a.summary === b.summary &&
  a.description === b.description &&
  a.start.date === b.start?.date &&
  a.end.date === b.end?.date &&
  a.colorId === b.colorId;

// ---------- Sincronización ----------

export type ResultadoSync = {
  ok: boolean;
  en: string;
  creados: number;
  actualizados: number;
  borrados: number;
  error?: string;
};

async function sincronizar(): Promise<ResultadoSync> {
  const c = credenciales();
  const res: ResultadoSync = { ok: true, en: new Date().toISOString(), creados: 0, actualizados: 0, borrados: 0 };
  if (!c) return { ...res, ok: false, error: "No configurado" };
  const cal = `/calendars/${encodeURIComponent(c.calendario)}/events`;
  const desde = sumarDias(hoyEnColombia(), -30);
  try {
    const [reservas, bloqueos] = await Promise.all([reservasParaCalendario(), listarBloqueos()]);
    const deseados = new Map<string, Evento>();
    for (const r of reservas) deseados.set(deReserva(r).id, deReserva(r));
    for (const b of bloqueos) deseados.set(deBloqueo(b).id, deBloqueo(b));

    const actuales = new Map<string, Partial<Evento>>();
    let pagina: string | undefined;
    do {
      const q = new URLSearchParams({
        privateExtendedProperty: `origen=${ORIGEN}`,
        timeMin: `${desde}T00:00:00-05:00`,
        maxResults: "2500",
        ...(pagina ? { pageToken: pagina } : {}),
      });
      const j = await api<{ items: Partial<Evento>[]; nextPageToken?: string }>(c.llave, "GET", `${cal}?${q}`);
      for (const e of j?.items ?? []) if (e.id) actuales.set(e.id, e);
      pagina = j?.nextPageToken;
    } while (pagina);

    for (const [id, e] of deseados) {
      const actual = actuales.get(id);
      if (actual && igual(e, actual)) continue;
      if (actual) {
        await api(c.llave, "PUT", `${cal}/${id}`, e);
        res.actualizados++;
        continue;
      }
      try {
        await api(c.llave, "POST", cal, e);
        res.creados++;
      } catch (err) {
        // 409: ya existe (otra instancia lo creó, o fue borrado y Google guarda el id).
        if (!(err instanceof ErrorGoogle && err.estado === 409)) throw err;
        await api(c.llave, "PUT", `${cal}/${id}`, { ...e, status: "confirmed" });
        res.actualizados++;
      }
    }
    for (const id of actuales.keys()) {
      if (deseados.has(id)) continue;
      try {
        await api(c.llave, "DELETE", `${cal}/${id}`);
        res.borrados++;
      } catch (err) {
        if (!(err instanceof ErrorGoogle && (err.estado === 404 || err.estado === 410))) throw err;
      }
    }
  } catch (e) {
    res.ok = false;
    res.error = e instanceof Error ? e.message : String(e);
    console.warn(`[google] Sincronización fallida: ${res.error}`);
  }
  return res;
}

/** Sincroniza ya, esperando el resultado. Si ya hay una en curso en este servidor, espera esa. */
export async function sincronizarGoogle(): Promise<ResultadoSync> {
  const s = (g.__googleSync ??= { ultimaVez: 0 });
  if (!s.en) {
    s.en = sincronizar().finally(() => {
      s.en = undefined;
    });
  }
  const r = await s.en;
  s.ultimo = r;
  s.ultimaVez = Date.now();
  return r;
}

/**
 * Sincroniza después de responder, sin hacer esperar a quien reservó.
 * Con `siPasaron`, solo si la última vez fue hace más de esos minutos (para las expiraciones,
 * que no avisan: se revisan al consultar la disponibilidad).
 */
export function sincronizarDespues(siPasaron?: number): void {
  if (!googleConfigurado()) return;
  const s = g.__googleSync;
  if (siPasaron && s && Date.now() - s.ultimaVez < siPasaron * 60_000) return;
  after(async () => {
    await sincronizarGoogle();
  });
}

export function ultimaSincronizacion(): ResultadoSync | null {
  return g.__googleSync?.ultimo ?? null;
}
