"use client";

import { useEffect } from "react";
import { marcarDispositivoDelDueno } from "@/lib/sinMedicion";

/**
 * Va en el panel: al entrar, este navegador queda marcado como del dueño y desde entonces
 * sus visitas a la web pública no se graban en Clarity ni suman al contador de visitas.
 */
export function MarcarDispositivo() {
  useEffect(() => {
    marcarDispositivoDelDueno();
  }, []);
  return null;
}
