"use client";

import { useEffect } from "react";

/**
 * En el celular no hay mouse que pase por encima, así que los íconos de las tarjetas (`.icono-vivo`)
 * hacen su movimiento solos, una sola vez: la primera vez que aparecen en pantalla en esa visita. La
 * tarjeta del plan se mece con su ícono (sube y se inclina hacia las esquinas, como con el mouse en el
 * computador), después de que termina de aparecer. Con «reducir movimiento», nada.
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

    // Cada ícono se anima una vez: al verlo, se deja de observar.
    let enCola = 0;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          obs.unobserve(el);
          // Espera a que la tarjeta termine de subir (≈1 s) y escalona las que entran juntas.
          animar(el, 1000 + (enCola++ % 4) * 350, true);
          setTimeout(() => (enCola = Math.max(0, enCola - 1)), 1500);
        }
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll<HTMLElement>(".icono-vivo").forEach((el) => obs.observe(el));

    return () => {
      obs.disconnect();
      relojes.forEach(clearTimeout);
    };
  }, []);
  return null;
}
