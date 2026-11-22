"use client";

import { useEffect } from "react";

/**
 * En el celular no hay mouse que pase por encima, así que los íconos de las tarjetas (`.icono-vivo`)
 * hacen su movimiento solos: al aparecer en pantalla y luego cada pocos segundos, uno tras otro,
 * mientras se vean. Los que no están en pantalla no se animan. En cada vuelta, la tarjeta del plan
 * se mece también (sube y se inclina hacia las esquinas, como con el mouse en el computador); no en
 * la primera, para no cortar la animación con la que aparece. Con «reducir movimiento», nada.
 */
export function IconosEnMovimiento() {
  useEffect(() => {
    if (!matchMedia("(hover: none)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const relojes = new Set<ReturnType<typeof setTimeout>>();
    // Quitar y volver a poner la clase reinicia la animación.
    const reiniciar = (el: Element | null) => {
      if (!el) return;
      el.classList.remove("animar");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("animar");
    };
    const animar = (el: HTMLElement, retraso: number, conTarjeta = false) => {
      const reloj = setTimeout(() => {
        relojes.delete(reloj);
        reiniciar(el);
        if (conTarjeta) reiniciar(el.closest(".tarjeta-plan"));
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
      [...visibles].forEach((el, i) => animar(el, i * 350, true));
    }, 4500);

    return () => {
      obs.disconnect();
      clearInterval(intervalo);
      relojes.forEach(clearTimeout);
    };
  }, []);
  return null;
}
