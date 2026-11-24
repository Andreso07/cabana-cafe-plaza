// Franja fija arriba en la web de demostración: deja claro que nada es real y lleva a quien la
// mira a escribirle al vendedor del sistema. El número sale del código (CONFIG_INICIAL), no del
// panel: los visitantes pueden cambiar la configuración de la demo, pero no este enlace.
import { CONFIG_INICIAL } from "@/config/cabana";

export function FranjaDemo() {
  const enlace = `https://wa.me/${CONFIG_INICIAL.whatsapp}?text=${encodeURIComponent(
    "Hola, vi la demostración y quiero una web de reservas para mi cabaña",
  )}`;
  return (
    <div className="bg-[#1f3a5f] text-white text-center text-[13px] font-bold px-4 py-2 leading-snug" role="note">
      🧪 Esto es una <b>demostración</b>: reserva, explora y entra al panel (<a href="/admin/entrar" className="underline">/admin</a>).
      Nada se cobra y todo vuelve a como estaba cada noche.{" "}
      <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-block underline decoration-2 underline-offset-2 font-extrabold">
        ¿Quieres una web así para tu cabaña? Escríbeme
      </a>
    </div>
  );
}
