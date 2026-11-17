// Sesión del panel de administración: un usuario y una clave (ADMIN_USUARIO y ADMIN_PASSWORD en
// .env.local y en Vercel) y una cookie firmada. Suficiente para un único dueño; si entran más personas,
// conviene pasar a cuentas con Supabase Auth.
// Las reglas de vencimiento (inactividad y máximo de horas) están en sesion.ts.
import { cookies } from "next/headers";
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

export async function esAdmin(): Promise<boolean> {
  return inicioDeSesion((await cookies()).get(COOKIE)?.value) !== null;
}
