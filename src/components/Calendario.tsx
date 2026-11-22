"use client";

import { useMemo, useState } from "react";
import { aDate, sumarDias, type Fecha } from "@/lib/fechas";
import { esFestivo } from "@/lib/festivos";
import { nocheCerrada, tipoNoche, type ConfigPrecios } from "@/lib/precios";

/**
 * Un comentario simpático sobre las fechas elegidas, para que elegir sea divertido. Mira qué noches
 * son (entre semana, fin de semana, puente, festivo, fecha especial) y cuántas.
 */
function mensajeEstadia(entrada: Fecha, noches: number, cfg: Parameters<typeof tipoNoche>[1]): string {
  const lista = Array.from({ length: noches }, (_, i) => sumarDias(entrada, i));
  const tipos = lista.map((f) => tipoNoche(f, cfg).tipo);
  if (tipos.includes("especial")) return "✨ ¡Fecha especial! Va a ser inolvidable.";
  if (tipos.includes("puente") || lista.some((f) => esFestivo(f))) return "🎉 ¡Plan de puente! A celebrar en la montaña.";
  if (noches >= 5) return `☕ ¡${noches} noches! Ya eres medio cafetero.`;
  if (tipos.every((t) => t === "semana")) {
    return noches === 1 ? "🌿 Una noche entre semana: el secreto mejor guardado." : "🌿 Escapada entre semana: pura tranquilidad.";
  }
  if (noches >= 3) return `😌 ¡${noches} noches! Así sí se descansa.`;
  if (noches === 2 && tipos.includes("viernes")) return "⛰️ Fin de semana en la montaña. ¡Buena elección!";
  if (noches === 1) return "🌙 Una noche para desconectarte.";
  return "🙌 ¡Qué buen plan!";
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** «viernes 4» (y el mes si no es el mismo de `otra`: «viernes 31 de diciembre»). */
function diaClaro(f: Fecha, otra?: Fecha): string {
  const d = aDate(f);
  const base = `${NOMBRES_DIA[d.getUTCDay()]} ${d.getUTCDate()}`;
  return otra && otra.slice(0, 7) !== f.slice(0, 7) ? `${base} de ${MESES[d.getUTCMonth()].toLowerCase()}` : base;
}

type Props = {
  hoy: Fecha;
  ultimoDia: Fecha;
  ocupadas: Set<Fecha>;
  entrada: Fecha | null;
  salida: Fecha | null;
  cfg: ConfigPrecios;
  foco?: { fecha: Fecha; vez: number } | null;
  onCambio: (entrada: Fecha | null, salida: Fecha | null) => void;
};

function diasDelMes(anio: number, mes: number): (Fecha | null)[] {
  const primero = new Date(Date.UTC(anio, mes, 1));
  const total = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const huecos = (primero.getUTCDay() + 6) % 7; // semana empieza en lunes
  const inicio = primero.toISOString().slice(0, 10);
  return [
    ...Array<null>(huecos).fill(null),
    ...Array.from({ length: total }, (_, i) => sumarDias(inicio, i)),
  ];
}


export function Calendario({ hoy, ultimoDia, ocupadas, entrada, salida, cfg, foco, onCambio }: Props) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  // Cuando un plan elige fechas (`foco` cambia), el calendario abre en el mes de la llegada.
  // Se ajusta durante el render, no en un efecto. Un clic del cliente no mueve el calendario.
  const [focoVisto, setFocoVisto] = useState(foco?.vez ?? 0);
  if (foco && foco.vez !== focoVisto) {
    setFocoVisto(foco.vez);
    const a = aDate(hoy);
    const b = aDate(foco.fecha);
    const meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    setDesplazamiento(Math.max(0, Math.min(11, meses)));
  }

  const meses = useMemo(() => {
    const base = aDate(hoy);
    return [0, 1].map((i) => {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + desplazamiento + i, 1));
      return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() };
    });
  }, [hoy, desplazamiento]);

  const maxDesplazamiento = 11;

  // Una noche no se puede tomar si está reservada o si ese día no hay servicio (los lunes).
  const cerrada = (f: Fecha) => !ocupadas.has(f) && nocheCerrada(f, cfg);
  const noDisponible = (f: Fecha) => ocupadas.has(f) || nocheCerrada(f, cfg);

  function nochesLibres(desde: Fecha, hasta: Fecha) {
    for (let f = desde; f < hasta; f = sumarDias(f, 1)) if (noDisponible(f)) return false;
    return true;
  }

  function clic(f: Fecha) {
    setAviso(null);
    // Un día después de la llegada siempre se toma como salida, aunque ya hubiera una: así se puede
    // alargar la estadía (martes→miércoles y luego tocar el jueves) sin empezar de nuevo.
    if (!entrada || f <= entrada) {
      if (noDisponible(f)) {
        setAviso(cerrada(f) ? "Los lunes no hay servicio, salvo festivos. Ese día sí puedes salir." : "Esa noche ya está ocupada.");
        return;
      }
      onCambio(f, null);
      return;
    }
    if (!nochesLibres(entrada, f)) {
      // No se puede salir ese día: hay noches ocupadas en medio. Si ese día está libre,
      // lo más probable es que la persona quiera empezar ahí; se toma como nueva llegada.
      if (!noDisponible(f)) {
        onCambio(f, null);
        setAviso("Había noches no disponibles en medio, así que empezamos de nuevo desde este día.");
      } else {
        setAviso("Hay noches no disponibles en medio. Elige otra fecha de salida.");
      }
      return;
    }
    onCambio(entrada, f);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setDesplazamiento((d) => Math.max(0, d - 1))}
          disabled={desplazamiento === 0}
          className="rounded-full px-3 py-1 text-lg disabled:opacity-30 hover:bg-linea"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className="text-xs font-extrabold bg-white border border-black/5 rounded-full px-3 py-1.5">
          {!entrada ? "Elige el día de llegada" : !salida ? "Ahora elige el día de salida" : "Fechas elegidas"}
        </p>
        <button
          type="button"
          onClick={() => setDesplazamiento((d) => Math.min(maxDesplazamiento, d + 1))}
          disabled={desplazamiento >= maxDesplazamiento}
          className="rounded-full px-3 py-1 text-lg disabled:opacity-30 hover:bg-linea"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      {/* El calendario funciona por noches: el día de salida no se duerme. Se dice con palabras para
          que nadie crea que marcar «4 y 5» son dos noches. */}
      {entrada && !salida && (
        <p className="mb-3 rounded-[14px] bg-sol/20 px-3 py-2 text-center text-xs font-bold">
          Ahora toca el día en que te vas. Ej.: para dormir viernes y sábado, toca el domingo.
        </p>
      )}
      {entrada && salida && (() => {
        const noches = Math.round((aDate(salida).getTime() - aDate(entrada).getTime()) / 86_400_000);
        return (
          <div className="mb-3 rounded-[14px] bg-cafe/10 px-3 py-2 text-center">
            {/* La clave hace que el mensaje vuelva a «saltar» cada vez que cambian las fechas. */}
            <p key={`${entrada}-${salida}`} className="mensaje-pop mb-1 text-base font-extrabold">
              {mensajeEstadia(entrada, noches, cfg)}
            </p>
            <p className="text-sm font-extrabold text-cafe">
              🌙 {noches} {noches === 1 ? "noche" : "noches"}: llegas el {diaClaro(entrada)} y te vas el {diaClaro(salida, entrada)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-suave">
              ¿Una noche más? Toca otro día de salida.{" "}
              <button type="button" onClick={() => { setAviso(null); onCambio(null, null); }} className="font-extrabold text-teja underline">
                Borrar fechas
              </button>
            </p>
          </div>
        );
      })()}

      <div className="grid gap-6 md:grid-cols-2">
        {meses.map(({ anio, mes }, i) => (
          <div key={`${anio}-${mes}`} className={i === 1 ? "hidden md:block" : ""}>
            <h3 className="text-center font-titulo font-extrabold text-lg mb-2">
              {MESES[mes]} {anio}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-black/30 mb-1">
              {DIAS.map((d, j) => (
                <span key={j}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {diasDelMes(anio, mes).map((f, j) => {
                if (!f) return <span key={j} />;
                const pasado = f < hoy || f > ultimoDia;
                const ocupada = ocupadas.has(f);
                const sinServicio = cerrada(f);
                const esEntrada = f === entrada;
                const esSalida = f === salida;
                const enRango = entrada && salida && f > entrada && f < salida;
                // El día de salida puede ser una noche ocupada: se sale antes de que llegue el siguiente.
                const puedeSerSalida = Boolean(entrada && f > entrada && nochesLibres(entrada, f));
                const deshabilitado = pasado || ((ocupada || sinServicio) && !puedeSerSalida);
                const festivo = esFestivo(f);
                const noche = tipoNoche(f, cfg);
                const especial = noche.tipo === "especial";

                // Verde = libre, rojo = reservado. La selección va en teja y el rango en amarillo
                // para no confundirse con ninguno de los dos.
                let clase = "bg-libre border-libre-borde text-libre-texto hover:border-libre-texto";
                // Llegada rellena y salida solo con borde: a la vista no parecen dos noches.
                if (esEntrada) clase = "bg-teja text-white border-teja shadow-[0_3px_0_var(--teja-oscura)] dia-pop";
                else if (esSalida) clase = "bg-white text-teja border-teja border-dashed dia-pop";
                else if (enRango) clase = "bg-sol/30 border-sol dia-ola";
                else if (pasado) clase = "bg-black/[0.03] border-transparent text-black/20";
                else if (ocupada && puedeSerSalida) clase = "bg-ocupado border-ocupado-borde text-ocupado-texto hover:border-ocupado-texto";
                else if (ocupada) clase = "bg-ocupado border-ocupado-borde text-ocupado-texto line-through";
                // Lunes sin servicio: gris, no rojo (no está reservado), pero sí sirve como día de salida.
                else if (sinServicio && puedeSerSalida) clase = "bg-black/[0.04] border-black/10 text-black/50 hover:border-black/30";
                else if (sinServicio) clase = "bg-black/[0.04] border-transparent text-black/30";

                return (
                  <button
                    key={f}
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => clic(f)}
                    className={`dia-cal relative aspect-square rounded-[12px] border-2 flex flex-col items-center justify-center text-sm font-extrabold transition-colors disabled:cursor-not-allowed ${clase}`}
                    // Las noches se pintan una tras otra, como una ola que va de la llegada a la salida.
                    style={enRango ? { animationDelay: `${Math.min((Date.parse(f) - Date.parse(entrada)) / 86_400_000, 14) * 45}ms` } : undefined}
                    aria-label={`${f}${ocupada ? ", ocupado" : ""}${sinServicio ? ", sin servicio" : ""}${festivo ? ", festivo" : ""}${especial ? `, ${noche.nombre}` : ""}`}
                    title={especial ? noche.nombre : undefined}
                    aria-pressed={esEntrada || esSalida}
                  >
                    <span className={festivo && !esEntrada && !esSalida ? "text-teja font-semibold" : ""}>
                      {Number(f.slice(8))}
                    </span>
                    {(esEntrada || esSalida) && (
                      <span className="text-[9px] leading-none font-black uppercase tracking-wide">{esEntrada ? "llega" : "sale"}</span>
                    )}
                    {especial && !pasado && !ocupada && !sinServicio && !esEntrada && !esSalida && (
                      <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-sol" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-suave">
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-libre border border-libre-borde" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-ocupado border border-ocupado-borde" /> Reservado</span>
        {cfg.nochesCerradas.length > 0 && (
          <span className="flex items-center gap-1"><span className="size-3 rounded bg-black/[0.08]" /> Sin servicio (lunes, salvo festivos)</span>
        )}
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-teja" /> Llegada</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-sol/30 border border-sol" /> Noches</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-white border border-dashed border-teja" /> Salida (no se duerme)</span>
        <span className="flex items-center gap-1"><span className="text-teja font-semibold">15</span> Festivo</span>
        {cfg.fechasEspeciales.length > 0 && (
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sol" /> Fecha especial</span>
        )}
      </div>
      {aviso && <p className="mt-2 text-sm text-teja-oscura" role="alert">{aviso}</p>}
    </div>
  );
}
