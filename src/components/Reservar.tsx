"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CABANA, PRECIOS } from "@/config/cabana";
import { formatoLargo, sumarDias, type Fecha } from "@/lib/fechas";
import { cotizar, pesos } from "@/lib/precios";
import { Calendario } from "./Calendario";

type Disponibilidad = { hoy: Fecha; ocupadas: Fecha[] };

const campo =
  "mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold outline-none focus:border-teja focus:bg-white";

export function Reservar({ conWompi }: { conWompi: boolean }) {
  const router = useRouter();
  const [disp, setDisp] = useState<Disponibilidad | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [entrada, setEntrada] = useState<Fecha | null>(null);
  const [salida, setSalida] = useState<Fecha | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      const r = await fetch("/api/disponibilidad", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setDisp(await r.json());
      setErrorCarga(false);
    } catch {
      setErrorCarga(true);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  const ocupadas = useMemo(() => new Set(disp?.ocupadas ?? []), [disp]);
  const cot = entrada && salida ? cotizar(entrada, salida) : null;
  const cortaPorPuente = cot ? cot.noches.length < cot.minNoches : false;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!entrada || !salida) return;
    setEnviando(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entrada,
          salida,
          huespedes: Number(f.get("huespedes")),
          nombre: f.get("nombre"),
          documento: f.get("documento"),
          email: f.get("email"),
          telefono: f.get("telefono"),
          aceptaDatos: f.get("aceptaDatos") === "on",
          aceptaTerminos: f.get("aceptaTerminos") === "on",
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(json.error ?? "No se pudo crear la reserva. Intenta de nuevo.");
        if (r.status === 409) {
          setEntrada(null);
          setSalida(null);
          void cargar();
        }
        return;
      }
      router.push(`/reserva/${json.codigo}`);
    } catch {
      setError("No hay conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (errorCarga) {
    return (
      <p className="text-teja-oscura">
        No pudimos cargar el calendario.{" "}
        <button className="underline" onClick={() => void cargar()}>Reintentar</button>
      </p>
    );
  }
  if (!disp) return <p className="text-suave">Cargando disponibilidad…</p>;

  return (
    <div className="grid gap-6 md:gap-8 lg:grid-cols-[1fr_380px] items-start">
      <div className="rounded-[24px] border-[3px] border-black/5 bg-white p-4 sm:p-5">
        <Calendario
          hoy={disp.hoy}
          ultimoDia={sumarDias(disp.hoy, PRECIOS.diasMaximosAdelante)}
          ocupadas={ocupadas}
          entrada={entrada}
          salida={salida}
          onCambio={(a, b) => {
            setEntrada(a);
            setSalida(b);
            setError(null);
          }}
        />
      </div>

      <div className="rounded-[28px] border-[3px] border-teja bg-white p-5 sm:p-6 shadow-[0_12px_0_var(--teja)] lg:sticky lg:top-24">
        <p className="text-[11px] font-black tracking-widest text-teja/70">TU RESERVA</p>
        {!cot ? (
          <div className="mt-2 text-suave">
            <p className="font-titulo text-[28px] font-extrabold text-tinta leading-none">
              Desde {pesos(PRECIOS.nocheEntreSemana)} <span className="text-base font-sans font-bold text-suave">/ noche</span>
            </p>
            <p className="mt-3 text-sm font-semibold">
              📅 Elige en el calendario el día de llegada y el de salida para ver el total y llenar tus datos.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-2 flex flex-col gap-3">
            <div className="text-sm font-semibold">
              <p><span className="text-suave">Llegada:</span> {formatoLargo(entrada!)}</p>
              <p><span className="text-suave">Salida:</span> {formatoLargo(salida!)}</p>
            </div>
            <ul className="text-sm font-semibold bg-crema rounded-[16px] border-2 border-dashed border-teja/20 px-3 py-2">
              {cot.noches.map((n) => (
                <li key={n.fecha} className="flex justify-between">
                  <span>{formatoLargo(n.fecha)}</span>
                  <span>{pesos(n.precio)}</span>
                </li>
              ))}
            </ul>
            <div className="text-sm space-y-1">
              <p className="flex justify-between font-medium">
                <span>Total ({cot.noches.length} {cot.noches.length === 1 ? "noche" : "noches"})</span>
                <span>{pesos(cot.total)}</span>
              </p>
              <p className="flex justify-between text-teja-oscura font-semibold">
                <span>Pagas hoy ({PRECIOS.porcentajeAnticipo}%)</span>
                <span>{pesos(cot.anticipo)}</span>
              </p>
              <p className="flex justify-between text-suave">
                <span>Al llegar</span>
                <span>{pesos(cot.saldo)}</span>
              </p>
            </div>

            {cortaPorPuente ? (
              <p className="text-sm text-teja-oscura" role="alert">
                En puente festivo la estadía mínima es de {cot.minNoches} noches.
              </p>
            ) : (
              <>
                <label className="text-sm font-bold">
                  Huéspedes
                  <select name="huespedes" className={campo} defaultValue={2}>
                    {Array.from({ length: CABANA.capacidad }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Nombre completo
                  <input name="nombre" required minLength={3} autoComplete="name" className={campo} />
                </label>
                <label className="text-sm font-bold">
                  Número de documento
                  <input name="documento" required minLength={5} inputMode="numeric" className={campo} />
                </label>
                <label className="text-sm font-bold">
                  Correo
                  <input name="email" type="email" required autoComplete="email" className={campo} />
                </label>
                <label className="text-sm font-bold">
                  Celular (WhatsApp)
                  <input name="telefono" type="tel" required autoComplete="tel" className={campo} />
                </label>
                <label className="text-xs text-suave flex gap-2 items-start">
                  <input type="checkbox" name="aceptaDatos" required className="mt-0.5 accent-teja" />
                  <span>
                    Autorizo el tratamiento de mis datos según la{" "}
                    <Link href="/privacidad" target="_blank" className="underline">política de datos</Link>.
                  </span>
                </label>
                <label className="text-xs text-suave flex gap-2 items-start">
                  <input type="checkbox" name="aceptaTerminos" required className="mt-0.5 accent-teja" />
                  <span>
                    Acepto las{" "}
                    <Link href="/condiciones" target="_blank" className="underline">condiciones de reserva y cancelación</Link>.
                  </span>
                </label>
                {error && <p className="text-sm text-teja-oscura" role="alert">{error}</p>}
                <button
                  type="submit"
                  disabled={enviando}
                  className="boton-goma mt-1 font-titulo rounded-full bg-teja text-white font-extrabold text-base py-3.5 disabled:opacity-60"
                >
                  {enviando ? "Apartando fechas…" : "Reservar y pagar →"}
                </button>
                <p className="text-xs text-suave text-center">
                  {conWompi
                    ? `Apartamos tus fechas ${PRECIOS.minutosApartado} minutos mientras pagas con Nequi, PSE o tarjeta.`
                    : `Apartamos tus fechas ${PRECIOS.minutosApartadoManual / 60} horas mientras pagas por Bre-B (desde Nequi o tu banco).`}
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
