"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { reportar, type EstadoReporte } from "./reportar";

/** Campo donde el cliente escribe el número del comprobante de su pago. */
export function ReportarPago({ codigo, actual }: { codigo: string; actual?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoReporte, FormData>(reportar.bind(null, codigo), {});
  return (
    <form action={accion} className="space-y-2">
      <label className="block">
        <span className="font-bold">Número del comprobante</span>
        <span className="block text-xs text-suave">
          Aparece en el comprobante de Nequi o de tu banco como «Referencia» o «Número de aprobación».
        </span>
        <input
          name="referencia"
          required
          minLength={4}
          maxLength={40}
          defaultValue={actual}
          autoComplete="off"
          placeholder="Ej.: M12345678"
          className="mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold uppercase outline-none focus:border-teja focus:bg-white"
        />
      </label>
      <button
        disabled={enviando}
        className="w-full rounded-full bg-cafe text-white font-extrabold py-3 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : actual ? "Corregir el número" : "Ya pagué: enviar el número"}
      </button>
      {estado.error && <p className="text-teja-oscura font-bold" role="alert">{estado.error}</p>}
    </form>
  );
}

/** Mientras la reserva esté pendiente, vuelve a consultar cada 5 s: el aviso de Wompi llega aparte. */
export function Refrescar() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);
  return <p className="text-xs text-suave text-center">Esta página se actualiza sola cuando llegue el pago.</p>;
}

/** Solo aparece en local, sin llaves de Wompi, para probar el flujo completo. */
export function SimularPago({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="rounded-xl border border-dashed border-teja p-4 text-sm space-y-2">
      <p><strong>Modo de prueba:</strong> Wompi no está configurado, así que el pago se simula.</p>
      <button
        type="button"
        disabled={cargando}
        onClick={async () => {
          setCargando(true);
          setError(null);
          const r = await fetch(`/api/reservas/${codigo}/simular-pago`, { method: "POST" });
          if (!r.ok) setError("No se pudo simular el pago.");
          setCargando(false);
          router.refresh();
        }}
        className="w-full rounded-full bg-teja hover:bg-teja-oscura text-white font-medium py-3 disabled:opacity-60"
      >
        Simular pago aprobado
      </button>
      {error && <p className="text-teja-oscura">{error}</p>}
    </div>
  );
}
