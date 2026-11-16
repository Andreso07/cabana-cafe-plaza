// Límite sencillo de peticiones por IP, en memoria de cada servidor. No es exacto (Vercel puede
// tener varias instancias), pero frena a quien manda el mismo formulario cien veces seguidas.
const g = globalThis as unknown as { __limites?: Map<string, number[]> };

export function excedeLimite(clave: string, maximo: number, ventanaMs: number): boolean {
  const mapa = (g.__limites ??= new Map<string, number[]>());
  const ahora = Date.now();
  const recientes = (mapa.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= maximo) {
    mapa.set(clave, recientes);
    return true;
  }
  recientes.push(ahora);
  mapa.set(clave, recientes);
  if (mapa.size > 5000) mapa.clear(); // que no crezca sin fin
  return false;
}

/** ¿Ya se llegó a `maximo` intentos registrados en la ventana? No cuenta este. */
export function bloqueado(clave: string, maximo: number, ventanaMs: number): boolean {
  const mapa = (g.__limites ??= new Map<string, number[]>());
  const ahora = Date.now();
  const recientes = (mapa.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  mapa.set(clave, recientes);
  return recientes.length >= maximo;
}

/** Cuenta un intento (por ejemplo, una clave equivocada). */
export function registrarIntento(clave: string, ventanaMs: number): void {
  const mapa = (g.__limites ??= new Map<string, number[]>());
  const ahora = Date.now();
  mapa.set(clave, [...(mapa.get(clave) ?? []).filter((t) => ahora - t < ventanaMs), ahora]);
}

export function ipDe(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "desconocida";
}
