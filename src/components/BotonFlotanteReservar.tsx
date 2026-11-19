"use client";

import { useEffect, useState } from "react";

/**
 * Botón fijo abajo, solo en el celular: «Ver fechas disponibles». Aparece cuando ya se pasó el banner
 * (donde está el botón de reservar) y se esconde mientras el calendario está en pantalla.
 */
export function BotonFlotanteReservar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const banner = document.getElementById("banner");
    const reservar = document.getElementById("reservar");
    if (!banner || !reservar) return;
    const enPantalla = new Map<Element, boolean>();
    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) enPantalla.set(e.target, e.isIntersecting);
      setVisible(!enPantalla.get(banner) && !enPantalla.get(reservar));
    });
    observador.observe(banner);
    observador.observe(reservar);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-[150%]"
      }`}
      aria-hidden={!visible}
    >
      <a
        href="#reservar"
        tabIndex={visible ? 0 : -1}
        className="boton-goma font-titulo flex items-center justify-center gap-2 rounded-full bg-teja py-3.5 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
      >
        📅 Ver fechas disponibles
      </a>
    </div>
  );
}
