"use client";

import { useMemo, useState } from "react";
import { aDate, sumarDias, type Fecha } from "@/lib/fechas";
import { esFestivo } from "@/lib/festivos";
import { precioNoche } from "@/lib/precios";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

type Props = {
  hoy: Fecha;
  ultimoDia: Fecha;
  ocupadas: Set<Fecha>;
  entrada: Fecha | null;
  salida: Fecha | null;
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

function precioCorto(v: number) {
  return `${Math.round(v / 1000)}k`;
}

export function Calendario({ hoy, ultimoDia, ocupadas, entrada, salida, onCambio }: Props) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  const meses = useMemo(() => {
    const base = aDate(hoy);
    return [0, 1].map((i) => {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + desplazamiento + i, 1));
      return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() };
    });
  }, [hoy, desplazamiento]);

  const maxDesplazamiento = 11;

  function nochesLibres(desde: Fecha, hasta: Fecha) {
    for (let f = desde; f < hasta; f = sumarDias(f, 1)) if (ocupadas.has(f)) return false;
    return true;
  }

  function clic(f: Fecha) {
    setAviso(null);
    if (!entrada || salida || f <= entrada) {
      if (ocupadas.has(f)) {
        setAviso("Esa noche ya está ocupada.");
        return;
      }
      onCambio(f, null);
      return;
    }
    if (!nochesLibres(entrada, f)) {
      setAviso("Hay noches ocupadas en medio. Elige otra fecha de salida.");
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
        <p className="text-sm text-suave">
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

      <div className="grid gap-6 md:grid-cols-2">
        {meses.map(({ anio, mes }, i) => (
          <div key={`${anio}-${mes}`} className={i === 1 ? "hidden md:block" : ""}>
            <h3 className="text-center font-medium mb-2">
              {MESES[mes]} {anio}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-suave mb-1">
              {DIAS.map((d, j) => (
                <span key={j}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {diasDelMes(anio, mes).map((f, j) => {
                if (!f) return <span key={j} />;
                const pasado = f < hoy || f > ultimoDia;
                const ocupada = ocupadas.has(f);
                const esEntrada = f === entrada;
                const esSalida = f === salida;
                const enRango = entrada && salida && f > entrada && f < salida;
                // El día de salida puede ser una noche ocupada: se sale antes de que llegue el siguiente.
                const puedeSerSalida = Boolean(entrada && !salida && f > entrada && nochesLibres(entrada, f));
                const deshabilitado = pasado || (ocupada && !puedeSerSalida);
                const festivo = esFestivo(f);

                let clase = "bg-white hover:border-teja";
                if (esEntrada || esSalida) clase = "bg-teja text-white border-teja";
                else if (enRango) clase = "bg-teja/15 border-teja/30";
                else if (pasado) clase = "bg-transparent text-suave/40";
                else if (ocupada) clase = "bg-linea/70 text-suave line-through";

                return (
                  <button
                    key={f}
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => clic(f)}
                    className={`relative aspect-square rounded-md border border-transparent flex flex-col items-center justify-center text-sm transition-colors disabled:cursor-not-allowed ${clase}`}
                    aria-label={`${f}${ocupada ? ", ocupado" : ""}${festivo ? ", festivo" : ""}`}
                    aria-pressed={esEntrada || esSalida}
                  >
                    <span className={festivo && !esEntrada && !esSalida ? "text-teja font-semibold" : ""}>
                      {Number(f.slice(8))}
                    </span>
                    {!pasado && !ocupada && (
                      <span className={`text-[10px] leading-none ${esEntrada || esSalida ? "text-white/90" : "text-suave"}`}>
                        {precioCorto(precioNoche(f))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-suave">
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-white border border-linea" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-linea" /> Ocupado</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-teja" /> Tu selección</span>
        <span className="flex items-center gap-1"><span className="text-teja font-semibold">15</span> Festivo</span>
        <span>Precio por noche en miles de pesos</span>
      </div>
      {aviso && <p className="mt-2 text-sm text-teja-oscura" role="alert">{aviso}</p>}
    </div>
  );
}
