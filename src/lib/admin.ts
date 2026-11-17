// Sesión del panel de administración: una sola clave (ADMIN_PASSWORD en .env.local)
// y una cookie firmada. Suficiente para un único dueño; si entran más personas,
// conviene pasar a cuentas con Supabase Auth.
// Las reglas de vencimiento (inactividad y máximo de horas) están en sesion.ts.
import { cookies } from "next/headers";
import { COOKIE, firmar, iguales, inicioDeSesion, opcionesCookie, valorSesion } from "./sesion";

function secretoFirmado(): string {
  const clave = process.env.ADMIN_PASSWORD ?? "";
  return firmar(clave);
}

export function claveCorrecta(intento: string): boolean {
  return iguales(firmar(intento), secretoFirmado());
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
