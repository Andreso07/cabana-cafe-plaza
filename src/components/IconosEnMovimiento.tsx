"use client";

import { useEffect } from "react";

/**
 * En el celular no hay mouse que pase por encima, así que los íconos de las tarjetas (`.icono-vivo`)
 * hacen su movimiento solos: al aparecer en pantalla y luego cada pocos segundos, uno tras otro,
 * mientras se vean. Los que no están en pantalla no se animan. Con «reducir movimiento», nada.
 */
export function IconosEnMovimiento() {
  useEffect(() => {
    if (!matchMedia("(hover: none)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const relojes = new Set<ReturnType<typeof setTimeout>>();
    const animar = (el: HTMLElement, retraso: number) => {
      const reloj = setTimeout(() => {
        relojes.delete(reloj);
        // Quitar y volver a poner la clase reinicia la animación.
        el.classList.remove("animar");
        void el.offsetWidth;
        el.classList.add("animar");
      }, retraso);
      relojes.add(reloj);
    };

    const visibles = new Set<HTMLElement>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting && !visibles.has(el)) {
            visibles.add(el);
            animar(el, 250);
          } else if (!e.isIntersecting) {
            visibles.delete(el);
          }
        }
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll<HTMLElement>(".icono-vivo").forEach((el) => obs.observe(el));

    const intervalo = setInterval(() => {
      [...visibles].forEach((el, i) => animar(el, i * 350));
    }, 4500);

    return () => {
      obs.disconnect();
      clearInterval(intervalo);
      relojes.forEach(clearTimeout);
    };
  }, []);
  return null;
}
