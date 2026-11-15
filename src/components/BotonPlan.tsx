"use client";

// Botón de cada plan: busca la próxima estadía libre de ese tipo, la deja marcada en el
// calendario y baja hasta él. Si el plan no sugiere fechas, o no hay ninguna libre, solo baja.
import { LIMITES } from "@/config/cabana";
import { sumarDias } from "@/lib/fechas";
import type { ConfigPrecios } from "@/lib/precios";
import { proximaEstadia, type Sugerencia } from "@/lib/sugerencias";
import { useReserva } from "./EstadoReserva";

const corto = (f: string) =>
  new Date(`${f}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function BotonPlan({
  sugerir,
  cfg,
  destacado,
}: {
  sugerir: Sugerencia;
  cfg: Pick<ConfigPrecios, "nochesCerradas" | "minNoches">;
  destacado: boolean;
}) {
  const { disp, ocupadas, elegirDesdePlan } = useReserva();
  const estadia =
    disp && sugerir !== "ninguno"
      ? proximaEstadia(sugerir, disp.hoy, sumarDias(disp.hoy, LIMITES.diasMaximosAdelante), ocupadas, cfg)
      : null;

  const texto = !disp || sugerir === "ninguno"
    ? "Ver fechas disponibles"
    : estadia
      ? `Reservar el próximo: ${corto(estadia.entrada)}`
      : "Sin fechas libres: ver calendario";

  return (
    <button
      type="button"
      onClick={() => {
        if (estadia) elegirDesdePlan(estadia.entrada, estadia.salida);
        document.getElementById("reservar")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={`mt-6 block w-full text-center rounded-full py-3 font-extrabold text-sm border-2 ${
        destacado ? "boton-goma bg-teja text-white border-teja" : "bg-crema border-black/5 text-tinta/70 hover:border-teja/40"
      }`}
    >
      {texto}
    </button>
  );
}
