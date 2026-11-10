"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
