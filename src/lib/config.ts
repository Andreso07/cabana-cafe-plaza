// Lectura y escritura de la configuración en la base (tabla `configuracion`, una fila).
import { cache } from "react";
import { CONFIG_INICIAL, type Config } from "@/config/cabana";
import { db } from "./db";

/**
 * Configuración vigente. Lo que falte en la base sale de CONFIG_INICIAL, así que
 * un campo nuevo del código funciona aunque nadie lo haya guardado todavía.
 * `cache` evita leerla más de una vez por petición.
 */
export const leerConfig = cache(async (): Promise<Config> => {
  const sql = db();
  const [fila] = await sql<{ datos: Partial<Config> }[]>`select datos from configuracion where id = 1`;
  const guardada = fila?.datos ?? {};
  return {
    ...CONFIG_INICIAL,
    ...guardada,
    precios: { ...CONFIG_INICIAL.precios, ...(guardada.precios ?? {}) },
  };
});

export async function guardarConfig(cambios: Partial<Config>): Promise<Config> {
  const sql = db();
  const actual = await leerConfig();
  const nueva: Config = { ...actual, ...cambios };
  await sql`
    insert into configuracion (id, datos, actualizado_en)
    values (1, ${sql.json(nueva as never)}, now())
    on conflict (id) do update set datos = excluded.datos, actualizado_en = now()`;
  return nueva;
}
