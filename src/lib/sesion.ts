/** @format */

// Reglas de la sesión del panel, sin depender de Next: las usan admin.ts (páginas y acciones)
// y proxy.ts (que renueva la cookie en cada petición al panel).
//
// La cookie guarda «inicio.ultima.firma»:
//  - `ultima` es la última petición al panel. Si pasan INACTIVIDAD_MIN sin ninguna, la sesión vence.
//  - `inicio` es cuándo se escribió la clave. Aunque se use sin parar, a las MAXIMO_HORAS vence igual.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "admin_sesion";
export const INACTIVIDAD_MIN = 30;
export const MAXIMO_HORAS = 1;
const INACTIVIDAD_MS = INACTIVIDAD_MIN * 60_000;
const MAXIMO_MS = MAXIMO_HORAS * 3_600_000;

function secreto(): string {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave || clave.length < 10) {
    throw new Error(
      "Falta ADMIN_PASSWORD en .env.local (mínimo 10 caracteres)",
    );
  }
  return clave;
}

export function firmar(valor: string): string {
  return createHmac("sha256", secreto()).update(valor).digest("hex");
}

export function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Valor de la cookie para una sesión que empezó en `inicio` y acaba de usarse. */
export function valorSesion(inicio: number, ahora = Date.now()): string {
  const datos = `${inicio}.${ahora}`;
  return `${datos}.${firmar(datos)}`;
}

/** Si la cookie es válida y no ha vencido, devuelve cuándo empezó la sesión; si no, null. */
export function inicioDeSesion(
  valor: string | undefined,
  ahora = Date.now(),
): number | null {
  if (!valor) return null;
  const [inicio, ultima, firma] = valor.split(".");
  if (
    !inicio ||
    !ultima ||
    !firma ||
    !iguales(firma, firmar(`${inicio}.${ultima}`))
  )
    return null;
  const i = Number(inicio);
  const u = Number(ultima);
  if (!Number.isFinite(i) || !Number.isFinite(u)) return null;
  if (ahora - u > INACTIVIDAD_MS) return null; // inactiva demasiado tiempo
  if (ahora - i > MAXIMO_MS) return null; // abierta demasiadas horas
  return i;
}

/**
 * Opciones de la cookie. Sin `maxAge`: el navegador la borra al cerrarse (en el celular, a veces
 * la conserva; por eso el vencimiento de verdad lo decide el servidor con las fechas de adentro).
 */
export const opcionesCookie = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
