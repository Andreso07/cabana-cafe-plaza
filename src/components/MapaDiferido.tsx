"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mini mapa de Google que se carga solo cuando la persona baja hasta él.
 * El mapa trae ~500 KB de scripts de Google; con `loading="lazy"` Chrome igual lo pedía en
 * computador (carga lo que esté a menos de ~1.250 px de la pantalla), aunque nadie llegara a verlo.
 */
export function MapaDiferido({ src, titulo }: { src: string; titulo: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [cargar, setCargar] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setCargar(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setCargar(true);
          obs.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={caja} className="h-52 w-full overflow-hidden rounded-[20px] border-[3px] border-cafe/15 bg-cafe/5">
      {cargar ? (
        <iframe src={src} title={titulo} referrerPolicy="no-referrer-when-downgrade" className="block h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm font-bold text-cafe-oscuro" aria-hidden>
          🗺️ Cargando mapa…
        </div>
      )}
    </div>
  );
}
