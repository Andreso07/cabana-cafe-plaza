"use client";

// Botón de cada plan: busca la próxima estadía libre de ese tipo, la deja marcada en el
// calendario y baja hasta él. Si el plan no sugiere fechas, o no hay ninguna libre, solo baja.
import { LIMITES } from "@/config/cabana";
import { sumarDias } from "@/lib/fechas";
import type { ConfigPrecios } from "@/lib/precios";
import { proximaEstadia, type Sugerencia } from "@/lib/sugerencias";
import { useReserva } from "./EstadoReserva";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «jueves 19 de nov» */
function fechaClara(f: string): string {
  const d = new Date(`${f}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** Texto del botón: «Reservar mañana, jueves 19 de nov» o «Reservar el sábado 9 de ene (2 noches)». */
function textoEstadia(e: { entrada: string; salida: string }, manana: string): string {
  const n = Math.round((Date.parse(e.salida) - Date.parse(e.entrada)) / 86_400_000);
  const cuando = e.entrada === manana ? `mañana, ${fechaClara(e.entrada)}` : `el ${fechaClara(e.entrada)}`;
  return `Reservar ${cuando}${n > 1 ? ` (${n} noches)` : ""}`;
}

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
  // Se busca desde mañana: una reserva para esta misma noche deja poco tiempo para preparar la
  // cabaña. (Quien quiera llegar hoy aún puede elegirlo en el calendario.)
  const manana = disp ? sumarDias(disp.hoy, 1) : "";
  const estadia =
    disp && sugerir !== "ninguno"
      ? proximaEstadia(sugerir, manana, sumarDias(disp.hoy, LIMITES.diasMaximosAdelante), ocupadas, cfg)
      : null;

  const texto = !disp || sugerir === "ninguno"
    ? "Ver fechas disponibles"
    : estadia
      ? textoEstadia(estadia, manana)
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
