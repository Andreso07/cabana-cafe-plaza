// Conexión a Postgres (Supabase en producción, Docker en local).
// DATABASE_URL en .env.local y en Vercel: la cadena del "Session pooler" de Supabase (puerto 5432).
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

export function db(): Sql {
  if (global.__sql) return global.__sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  // En desarrollo se guarda en globalThis para que la recarga en caliente no abra
  // una conexión nueva en cada cambio de código.
  global.__sql = postgres(urlSegura(url), {
    // En modo sesión cada conexión ocupa un cupo del pooler (unos 15 en el plan gratis):
    // pocas por instancia y se sueltan rápido cuando no hay visitas.
    max: 3,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: false,
  });
  return global.__sql;
}
