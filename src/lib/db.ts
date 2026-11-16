// Conexión a Postgres (Supabase en producción, Docker en local).
// DATABASE_URL en .env.local y en Vercel: la cadena del "Session pooler" de Supabase (puerto 5432).
import { after } from "next/server";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const global = globalThis as unknown as { __sql?: Sql };

/**
 * El "Transaction pooler" de Supabase (puerto 6543) pierde o cruza respuestas cuando
 * postgres.js envía varias consultas seguidas por la misma conexión, que es lo que pasa
 * con dos visitantes a la vez. Medido el 2026-11-10 con 48 consultas en paralelo:
 * puerto 6543 → 2 respuestas entregadas a la consulta equivocada y 25 sin respuesta;
 * puerto 5432 (Session pooler, mismo servidor y credenciales) → 48 correctas.
 * Por eso, si la cadena apunta al 6543 del pooler, se usa el 5432.
 */
export function urlSegura(url: string): string {
  const u = new URL(url);
  if (u.hostname.endsWith(".pooler.supabase.com") && u.port === "6543") {
    u.port = "5432";
    console.warn("[db] DATABASE_URL usa el Transaction pooler (6543); se usa el Session pooler (5432).");
    return u.toString();
  }
  return url;
}

/** Segundos sin uso tras los que se cierra una conexión. */
const SEGUNDOS_INACTIVA = 2;

/**
 * Mantiene viva la función unos segundos después de responder, para que la conexión inactiva
 * alcance a cerrarse. Sin esto, Vercel congela la instancia al responder, el temporizador de
 * cierre se congela con ella y la conexión queda ocupando un cupo del pooler durante minutos:
 * el 2026-11-16 se juntaron 15 así y el panel respondía 500 («max clients reached in session
 * mode»). Fuera de una petición (scripts, tareas) `after` no existe y no hace falta.
 */
function soltarAlTerminar() {
  try {
    after(() => new Promise((listo) => setTimeout(listo, (SEGUNDOS_INACTIVA + 1) * 1000)));
  } catch {
    // Sin petición en curso: nada que esperar.
  }
}

export function db(): Sql {
  if (global.__sql) {
    soltarAlTerminar();
    return global.__sql;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  // En desarrollo se guarda en globalThis para que la recarga en caliente no abra
  // una conexión nueva en cada cambio de código.
  global.__sql = postgres(urlSegura(url), {
    // En modo sesión cada conexión ocupa uno de los 15 cupos del pooler del plan gratis, y
    // cada instancia de Vercel tiene las suyas: dos por instancia, y se cierran a los pocos
    // segundos sin uso (ver soltarAlTerminar). Varias consultas a la vez comparten la conexión
    // en fila; en modo sesión eso es seguro (lo que cruzaba respuestas era el modo transacción).
    max: 2,
    idle_timeout: SEGUNDOS_INACTIVA,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    prepare: false,
  });
  soltarAlTerminar();
  return global.__sql;
}
