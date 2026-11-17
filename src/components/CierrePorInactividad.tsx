"use client";
// Vigila la actividad en el panel (mouse, teclado, toques, scroll). Mientras haya actividad, avisa
// al servidor cada pocos minutos para que no venza la sesión aunque no cambies de página. Si pasan
// `minutos` sin actividad en ninguna pestaña del panel, cierra la sesión y vuelve a «Entrar».
// Las pestañas comparten la hora de la última actividad por localStorage.
import { useEffect } from "react";
import { salirPorInactividad } from "@/app/admin/acciones";

const CLAVE = "admin-ultima-actividad";
const PULSO_MS = 5 * 60_000;

function leer(): number {
  try {
    return Number(localStorage.getItem(CLAVE)) || 0;
  } catch {
    return 0;
  }
}

export function CierrePorInactividad({ minutos }: { minutos: number }) {
  useEffect(() => {
    const limite = minutos * 60_000;
    let local = Date.now();
    let ultimoPulso = Date.now();
    let cerrando = false;

    const actividad = () => {
      local = Date.now();
      try {
        localStorage.setItem(CLAVE, String(local));
      } catch {}
    };
    actividad();

    const revisar = () => {
      if (cerrando) return;
      const ultima = Math.max(local, leer());
      const ahora = Date.now();
      if (ahora - ultima >= limite) {
        cerrando = true;
        void salirPorInactividad();
        return;
      }
      // Hubo actividad desde el último aviso: se renueva la sesión en el servidor.
      if (ultima > ultimoPulso && ahora - ultimoPulso >= PULSO_MS) {
        ultimoPulso = ahora;
        fetch("/admin/pulso", { cache: "no-store" }).then((r) => {
          if (r.status === 401) {
            cerrando = true;
            void salirPorInactividad();
          }
        }, () => {});
      }
    };

    const eventos = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }));
    // Se revisa también al volver a la pestaña: con el celular bloqueado los temporizadores se pausan.
    document.addEventListener("visibilitychange", revisar);
    const intervalo = setInterval(revisar, 30_000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, actividad));
      document.removeEventListener("visibilitychange", revisar);
      clearInterval(intervalo);
    };
  }, [minutos]);

  return null;
}
