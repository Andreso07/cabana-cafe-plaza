// Marca los dispositivos del dueño para que sus propias visitas no se midan (Clarity y el
// contador de visitas). Se pone al entrar al panel y dura un año en ese navegador.
// No es un dato de seguridad: solo dice «no me midas»; si alguien la borra, vuelve a contar.
export const COOKIE_SIN_MEDICION = "cp_sin_medicion";

/** ¿Este navegador es de alguien que entró al panel? Solo en el navegador. */
export function esDispositivoDelDueno(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${COOKIE_SIN_MEDICION}=1`);
}

/** Guarda la marca por un año en este navegador. */
export function marcarDispositivoDelDueno(): void {
  const segura = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_SIN_MEDICION}=1; Path=/; Max-Age=31536000; SameSite=Lax${segura}`;
}
