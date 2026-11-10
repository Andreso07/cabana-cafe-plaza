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
  "w-full rounded-lg border border-linea bg-white px-3 py-2 outline-none focus:border-teja focus:ring-2 focus:ring-teja/20";

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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-linea bg-white/60 p-4 sm:p-6">
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

      <div className="rounded-2xl border border-linea bg-white p-4 sm:p-6 h-fit">
        {!cot ? (
          <div className="text-suave">
            <p className="font-titulo text-2xl text-tinta">
              Desde {pesos(PRECIOS.nocheEntreSemana)} <span className="text-base font-sans text-suave">/ noche</span>
            </p>
            <p className="mt-2 text-sm">Elige tus fechas en el calendario para ver el total.</p>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-3">
            <div className="text-sm">
              <p><span className="text-suave">Llegada:</span> {formatoLargo(entrada!)}</p>
              <p><span className="text-suave">Salida:</span> {formatoLargo(salida!)}</p>
            </div>
            <ul className="text-sm border-y border-linea py-2">
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
                <label className="text-sm">
                  Huéspedes
                  <select name="huespedes" className={campo} defaultValue={2}>
                    {Array.from({ length: CABANA.capacidad }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Nombre completo
                  <input name="nombre" required minLength={3} autoComplete="name" className={campo} />
                </label>
                <label className="text-sm">
                  Número de documento
                  <input name="documento" required minLength={5} inputMode="numeric" className={campo} />
                </label>
                <label className="text-sm">
                  Correo
                  <input name="email" type="email" required autoComplete="email" className={campo} />
                </label>
                <label className="text-sm">
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
                  className="rounded-full bg-teja hover:bg-teja-oscura text-white font-medium py-3 disabled:opacity-60"
                >
                  {enviando ? "Apartando fechas…" : "Reservar y pagar"}
                </button>
                <p className="text-xs text-suave text-center">
                  {conWompi
                    ? `Apartamos tus fechas ${PRECIOS.minutosApartado} minutos mientras pagas con Nequi, PSE o tarjeta.`
                    : `Apartamos tus fechas ${PRECIOS.minutosApartadoManual / 60} horas mientras pagas por Nequi.`}
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
