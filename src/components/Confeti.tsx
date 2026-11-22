"use client";

import { useEffect, useState } from "react";

const COLORES = ["var(--sol)", "var(--teja)", "var(--cafe)", "#4f9de0", "#e86fa5"];

/**
 * Lluvia de confeti que celebra una vez y se va. `clave` la hace única (código + estado de la
 * reserva): recargar la página no la repite, pero pasar de «apartada» a «confirmada» sí. Si el
 * navegador no deja guardar (incógnito estricto), celebra igual. Quien pide «reducir movimiento» no
 * la ve.
 */
export function Confeti({ clave }: { clave: string }) {
  const [piezas, setPiezas] = useState<{ x: number; d: number; t: number; c: string; r: number; w: number }[]>([]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const marca = `confeti:${clave}`;
    try {
      if (sessionStorage.getItem(marca)) return;
      sessionStorage.setItem(marca, "1");
    } catch {
      // Sin almacenamiento: se celebra igual, solo que podría repetirse al recargar.
    }
    // Se arma en el navegador (no en el servidor) porque cada pieza cae en un lugar al azar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPiezas(
      Array.from({ length: 90 }, () => ({
        x: Math.random() * 100,
        d: Math.random() * 0.8,
        t: 2.2 + Math.random() * 1.6,
        c: COLORES[Math.floor(Math.random() * COLORES.length)],
        r: Math.random() * 360,
        w: 6 + Math.random() * 6,
      })),
    );
    const fin = setTimeout(() => setPiezas([]), 4800);
    return () => clearTimeout(fin);
  }, [clave]);

  if (piezas.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {piezas.map((p, i) => (
        <span
          key={i}
          className="confeti-pieza"
          style={{
            left: `${p.x}%`,
            width: p.w,
            height: p.w * 0.45,
            background: p.c,
            animationDelay: `${p.d}s`,
            animationDuration: `${p.t}s`,
            ["--giro" as string]: `${p.r}deg`,
          }}
        />
      ))}
    </div>
  );
}
