// Wompi llama aquí cuando cambia el estado de un pago.
// Configura esta URL en el panel de Wompi: https://TU-DOMINIO/api/wompi/webhook
import { NextResponse } from "next/server";
import { eventoAutentico, type EventoWompi } from "@/lib/wompi";
import { confirmarPago } from "@/lib/store";
import { sincronizarDespues } from "@/lib/googleCalendar";

export async function POST(req: Request) {
  const secreto = process.env.WOMPI_EVENTS_SECRET;
  if (!secreto) return NextResponse.json({ error: "Wompi no configurado" }, { status: 503 });

  let evento: EventoWompi;
  try {
    evento = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (!eventoAutentico(evento, secreto)) {
    console.warn("[wompi] evento con firma inválida rechazado");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  if (evento.event !== "transaction.updated") return NextResponse.json({ ok: true });

  const tx = evento.data.transaction as {
    id: string;
    status: string;
    reference: string;
    amount_in_cents: number;
  };
  // Solo un pago aprobado confirma. DECLINED, VOIDED o ERROR dejan la reserva
  // pendiente hasta que expire, y el cliente puede volver a intentar.
  if (tx.status !== "APPROVED") return NextResponse.json({ ok: true });

  sincronizarDespues();

  const r = await confirmarPago(tx.reference, tx.amount_in_cents / 100, {
    proveedor: "wompi",
    id: tx.id,
    fecha: new Date().toISOString(),
  });
  if (!r.ok) {
    // Respondemos 200 para que Wompi no reintente: el caso queda anotado y se ve en el panel.
    console.error(`[wompi] pago ${tx.id} de ${tx.reference} no se pudo aplicar: ${r.motivo}`);
  }
  return NextResponse.json({ ok: true });
}
