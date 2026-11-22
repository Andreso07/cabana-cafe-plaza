"use client";

import { usePathname } from "next/navigation";

type Tema = "navidad" | "halloween";

/**
 * Adornos de temporada (se eligen en el panel → Configuración → Temporada). Tres partes, cada una en
 * su sitio del layout: la franja con el mensaje (arriba de todo), las luces (bajo la barra) y el cielo
 * (nieve en Navidad, murciélagos en Halloween), encima de la página sin tapar clics. En el panel no
 * sale nada: ahí se trabaja.
 */
export function Temporada({ tema, parte, mensaje }: { tema: Tema; parte: "franja" | "luces" | "cielo"; mensaje?: string }) {
  const ruta = usePathname();
  if (ruta.startsWith("/admin")) return null;

  if (parte === "franja") {
    return (
      <p
        className={`franja-temporada relative z-50 overflow-hidden px-4 py-1.5 text-center text-xs font-extrabold text-white sm:text-sm ${
          tema === "navidad" ? "bg-[#b3261e]" : "bg-[#3b1e54]"
        }`}
      >
        {mensaje}
      </p>
    );
  }

  if (parte === "luces") {
    return (
      <div className="luces-temporada pointer-events-none absolute inset-x-0 -bottom-3 h-4" data-tema={tema} aria-hidden>
        {/* El cable */}
        <svg className="absolute inset-x-0 top-0 h-2 w-full" viewBox="0 0 100 4" preserveAspectRatio="none">
          <path d="M0,0 Q2.5,4 5,0 T10,0 T15,0 T20,0 T25,0 T30,0 T35,0 T40,0 T45,0 T50,0 T55,0 T60,0 T65,0 T70,0 T75,0 T80,0 T85,0 T90,0 T95,0 T100,0" fill="none" stroke={tema === "navidad" ? "#2b4a28" : "#1b1b1b"} strokeWidth="0.4" />
        </svg>
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="bombillo" data-color={i % 4} style={{ left: `${i * 5 + 2.5}%`, ["--n" as string]: i % 4 }} />
        ))}
      </div>
    );
  }

  // Cielo: posiciones fijas (no al azar), para que el servidor y el navegador pinten lo mismo.
  if (tema === "halloween") {
    return (
      <div className="murcielagos pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="murcielago"
            style={{
              top: `${8 + ((i * 23) % 70)}%`,
              fontSize: `${16 + ((i * 5) % 12)}px`,
              animationDuration: `${12 + ((i * 7) % 10)}s`,
              animationDelay: `-${(i * 11) % 19}s`,
            }}
          >
            <span className="aleteo">🦇</span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="nieve pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="copo"
          style={{
            left: `${(i * 37) % 100}%`,
            fontSize: `${10 + ((i * 7) % 12)}px`,
            animationDuration: `${9 + ((i * 5) % 9)}s`,
            animationDelay: `-${(i * 13) % 17}s`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}
