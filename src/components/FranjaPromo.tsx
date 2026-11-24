"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Franja negra de una promoción por fecha de compra (Black Friday): nombre, porcentaje y cuenta
 * regresiva hasta las 11:59 p. m. (hora Colombia) del último día. La pone el layout solo mientras la
 * promoción está abierta; al llegar a cero se esconde sola. En el panel no sale.
 */
export function FranjaPromo({
  nombre,
  porcentaje,
  hasta,
  regalo,
}: {
  nombre: string;
  porcentaje: number;
  hasta: string;
  /** Cupos de regalo (las primeras N reservas pagadas) y cuántos quedan; null si la promo no trae regalo. */
  regalo: { texto: string; total: number; quedan: number } | null;
}) {
  const ruta = usePathname();
  const fin = Date.parse(`${hasta}T23:59:59-05:00`);
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    // La hora se lee en el navegador: en el servidor no hay «ahora» que coincida con el de la persona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAhora(Date.now());
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  if (ruta.startsWith("/admin")) return null;
  const falta = ahora === null ? null : fin - ahora;
  if (falta !== null && falta <= 0) return null;

  let cuenta = "";
  if (falta !== null) {
    const s = Math.floor(falta / 1000);
    const d = Math.floor(s / 86_400);
    const h = Math.floor((s % 86_400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    const dos = (n: number) => String(n).padStart(2, "0");
    cuenta = d > 0 ? `${d}d ${dos(h)}h ${dos(m)}m ${dos(seg)}s` : `${dos(h)}h ${dos(m)}m ${dos(seg)}s`;
  }

  return (
    <Link
      href="/#reservar"
      className="franja-promo relative z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 overflow-hidden bg-[#111] px-4 py-2 text-center text-xs font-extrabold text-white sm:text-sm"
    >
      <span>
        🖤 <span className="uppercase tracking-wider">{nombre}</span> <span className="text-sol">−{porcentaje}%</span> reservando hoy
      </span>
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono tabular-nums" aria-live="off">
        {cuenta ? `Termina en ${cuenta}` : "Por tiempo limitado"}
      </span>
      <span className="underline decoration-sol underline-offset-2">Ver fechas →</span>
      {regalo && (
        <span className="basis-full text-[11px] font-bold text-white/85 sm:text-xs">
          {regalo.quedan > 0 ? (
            <>
              🎁 Las primeras {regalo.total} reservas pagadas se llevan {regalo.texto} ·{" "}
              <span className="text-sol">
                {regalo.quedan === 1 ? "¡queda 1 cupo!" : `quedan ${regalo.quedan} de ${regalo.total} cupos`}
              </span>
            </>
          ) : (
            <>🎁 Ya se entregaron los {regalo.total} regalos. ¡El descuento sigue vigente!</>
          )}
        </span>
      )}
    </Link>
  );
}
