// Sesión del panel de administración: un usuario y una clave (ADMIN_USUARIO y ADMIN_PASSWORD en
// .env.local y en Vercel) y una cookie firmada. Suficiente para un único dueño; si entran más personas,
// conviene pasar a cuentas con Supabase Auth.
// Las reglas de vencimiento (inactividad y máximo de horas) están en sesion.ts.
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { COOKIE, firmar, iguales, inicioDeSesion, opcionesCookie, valorSesion } from "./sesion";

function secretoFirmado(): string {
  const clave = process.env.ADMIN_PASSWORD ?? "";
  return firmar(clave);
}

export function usuarioConfigurado(): boolean {
  return (process.env.ADMIN_USUARIO ?? "").trim().length >= 3;
}

/**
 * ¿Usuario y clave correctos? Se comparan los dos siempre, y por su firma, para que el tiempo
 * de respuesta no delate cuál de los dos falló. El usuario no distingue mayúsculas.
 */
export function credencialesCorrectas(usuario: string, clave: string): boolean {
  if (!usuarioConfigurado()) return false;
  const esperado = (process.env.ADMIN_USUARIO ?? "").trim().toLowerCase();
  const usuarioBien = iguales(firmar(usuario.trim().toLowerCase()), firmar(esperado));
  const claveBien = iguales(firmar(clave), secretoFirmado());
  return usuarioBien && claveBien;
}

export async function iniciarSesion(): Promise<void> {
  (await cookies()).set(COOKIE, valorSesion(Date.now()), opcionesCookie);
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * «Salir»: además de borrar la cookie de este navegador, anula toda sesión abierta hasta ahora
 * (también una cookie copiada, o la del celular si se entró desde dos sitios).
 */
export async function cerrarTodasLasSesiones(): Promise<void> {
  // La hora es la del servidor de la web (la misma con la que se firman las sesiones), no la de
  // la base: si los relojes difieren un poco, entrar justo después de salir seguiría funcionando.
  const ahora = new Date();
  await db()`
    insert into panel_sesiones (id, validas_desde) values (1, ${ahora})
    on conflict (id) do update set validas_desde = ${ahora}`;
  await cerrarSesion();
}

/** Desde cuándo valen las sesiones (milisegundos). Se lee una vez por petición. */
const validasDesde = cache(async (): Promise<number> => {
  const [fila] = await db()<{ ms: string }[]>`
    select (extract(epoch from validas_desde) * 1000)::bigint as ms from panel_sesiones where id = 1`;
  return fila ? Number(fila.ms) : 0;
});

export async function esAdmin(): Promise<boolean> {
  const inicio = inicioDeSesion((await cookies()).get(COOKIE)?.value);
  if (inicio === null) return false;
  // Si la base no contesta, no se deja entrar: ante la duda, el panel queda cerrado.
  const desde = await validasDesde().catch(() => Number.POSITIVE_INFINITY);
  return inicio > desde;
}
