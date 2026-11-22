"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Envuelve una cuadrícula y la marca como visible cuando entra en pantalla: el CSS de `.aparecer`
 * hace subir a sus hijos uno tras otro. En el celular no hay «pasar el mouse», así que esta es la
 * animación que se ve ahí. Sin JavaScript (o si el navegador no tiene IntersectionObserver) todo se
 * ve quieto y completo, nunca escondido.
 */
export function AparecerAlBajar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"quieto" | "esperando" | "visible">("quieto");

  useEffect(() => {
    const el = caja.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // Si ya está en pantalla al cargar (alguien entró con #planes), no se esconde para luego mostrarse.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    setEstado("esperando");
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setEstado("visible");
        obs.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={caja} data-aparecer={estado} className={`aparecer ${className}`}>
      {children}
    </div>
  );
}
