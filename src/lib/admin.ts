// Sesión del panel de administración: una sola clave (ADMIN_PASSWORD en .env.local)
// y una cookie firmada. Suficiente para un único dueño; si entran más personas,
// conviene pasar a cuentas con Supabase Auth.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_sesion";
const DURACION_SEG = 60 * 60 * 12;

function secreto(): string {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave || clave.length < 10) {
    throw new Error("Falta ADMIN_PASSWORD en .env.local (mínimo 10 caracteres)");
  }
  return clave;
}

function firmar(valor: string): string {
  return createHmac("sha256", secreto()).update(valor).digest("hex");
}

function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function claveCorrecta(intento: string): boolean {
  return iguales(firmar(intento), firmar(secreto()));
}

export async function iniciarSesion(): Promise<void> {
  const vence = String(Date.now() + DURACION_SEG * 1000);
  (await cookies()).set(COOKIE, `${vence}.${firmar(vence)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION_SEG,
    path: "/",
  });
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function esAdmin(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const [vence, firma] = valor.split(".");
  if (!vence || !firma || !iguales(firma, firmar(vence))) return false;
  return Number(vence) > Date.now();
}
