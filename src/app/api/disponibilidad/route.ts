import { NextResponse } from "next/server";
import { eventosExternos, nochesDe } from "@/lib/calendario";
import { sincronizarDespues } from "@/lib/googleCalendar";
import { obtenerNochesOcupadas } from "@/lib/store";
import { hoyEnColombia } from "@/lib/fechas";

export const dynamic = "force-dynamic";

/** Noches ocupadas: reservas y bloqueos de la web, más los eventos del Google Calendar del dueño. */
export async function GET() {
  const [propias, externo] = await Promise.all([obtenerNochesOcupadas(), eventosExternos()]);
  const ocupadas = [...new Set([...propias, ...nochesDe(externo.eventos)])].sort();
  // Las reservas que expiran sin pago no avisan: se quitan de Google en estas revisiones.
  sincronizarDespues(10);
  return NextResponse.json({ hoy: hoyEnColombia(), ocupadas });
}
