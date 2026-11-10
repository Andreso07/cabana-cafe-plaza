// Conexión a Postgres (Supabase en producción, Docker en local).
// DATABASE_URL en .env.local. En Vercel usa la cadena del "Transaction pooler"
// de Supabase (puerto 6543): con ella no hay sentencias preparadas, de ahí `prepare: false`.
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const global = globalThis as unknown as { __sql?: Sql };

export function db(): Sql {
  if (global.__sql) return global.__sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  // En desarrollo se guarda en globalThis para que la recarga en caliente no abra
  // una conexión nueva en cada cambio de código.
  global.__sql = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return global.__sql;
}
