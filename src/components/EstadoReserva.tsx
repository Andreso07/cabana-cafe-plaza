"use client";

// Estado que comparten la sección de planes y el calendario: la disponibilidad (se pide una
// sola vez) y las fechas elegidas. Así el botón de un plan puede dejar marcadas las fechas en
// el calendario de más abajo.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Fecha } from "@/lib/fechas";

type Disponibilidad = { hoy: Fecha; ocupadas: Fecha[] };

type Estado = {
  disp: Disponibilidad | null;
  ocupadas: Set<Fecha>;
  errorCarga: boolean;
  cargar: () => Promise<void>;
  entrada: Fecha | null;
  salida: Fecha | null;
  elegir: (entrada: Fecha | null, salida: Fecha | null) => void;
  /** Lo usa el botón de un plan: elige las fechas y pide al calendario que vaya a ese mes. */
  elegirDesdePlan: (entrada: Fecha, salida: Fecha) => void;
  /** Cambia cada vez que un plan elige fechas; el calendario lo mira para saltar de mes. */
  foco: { fecha: Fecha; vez: number } | null;
};

const Contexto = createContext<Estado | null>(null);

export function ProveedorReserva({ children }: { children: React.ReactNode }) {
  const [disp, setDisp] = useState<Disponibilidad | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [entrada, setEntrada] = useState<Fecha | null>(null);
  const [salida, setSalida] = useState<Fecha | null>(null);
  const [foco, setFoco] = useState<{ fecha: Fecha; vez: number } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/disponibilidad", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setDisp(await r.json());
      setErrorCarga(false);
    } catch {
      setErrorCarga(true);
    }
  }, []);

  useEffect(() => {
    // La primera carga llega por red: el estado se fija cuando responde, no durante el efecto.
    let vigente = true;
    fetch("/api/disponibilidad", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Disponibilidad) => vigente && setDisp(d))
      .catch(() => vigente && setErrorCarga(true));
    return () => {
      vigente = false;
    };
  }, []);

  const ocupadas = useMemo(() => new Set(disp?.ocupadas ?? []), [disp]);
  const elegir = useCallback((a: Fecha | null, b: Fecha | null) => {
    setEntrada(a);
    setSalida(b);
  }, []);
  const elegirDesdePlan = useCallback((a: Fecha, b: Fecha) => {
    setEntrada(a);
    setSalida(b);
    setFoco((f) => ({ fecha: a, vez: (f?.vez ?? 0) + 1 }));
  }, []);

  return (
    <Contexto.Provider value={{ disp, ocupadas, errorCarga, cargar, entrada, salida, elegir, elegirDesdePlan, foco }}>
      {children}
    </Contexto.Provider>
  );
}

export function useReserva(): Estado {
  const e = useContext(Contexto);
  if (!e) throw new Error("useReserva fuera de <ProveedorReserva>");
  return e;
}
