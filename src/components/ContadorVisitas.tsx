"use client";

// Avisa una vez por sesión del navegador que alguien abrió la web. No cuenta el panel.
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ContadorVisitas() {
  const ruta = usePathname();
  useEffect(() => {
    if (ruta.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem("visita-contada")) return;
      sessionStorage.setItem("visita-contada", "1");
    } catch {
      // Sin almacenamiento (modo privado estricto): se cuenta igual, una vez por carga.
    }
    void fetch("/api/visita", { method: "POST", keepalive: true }).catch(() => {});
  }, [ruta]);
  return null;
}
