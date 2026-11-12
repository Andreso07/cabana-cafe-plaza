"use server";
// El cliente escribe el número de comprobante de su pago. Solo se guarda para que el dueño
// lo cruce con el movimiento en Nequi o en el banco; la reserva no se confirma sola.
import { revalidatePath } from "next/cache";
import { reportarPago } from "@/lib/store";

/** Horas que la reserva sigue apartada después de reportar el pago, mientras se verifica. */
const HORAS_PARA_VERIFICAR = 24;

export type EstadoReporte = { error?: string; ok?: boolean };

const MENSAJES = {
  "no-existe": "No encontramos esa reserva.",
  "ya-confirmada": "Esta reserva ya está confirmada.",
  cancelada: "Esta reserva fue cancelada. Escríbenos por WhatsApp.",
  "referencia-invalida": "Escribe el número del comprobante: solo letras y números, entre 4 y 40.",
  "referencia-usada": "Ese comprobante ya se reportó en otra reserva. Si es un error, escríbenos por WhatsApp.",
} as const;

export async function reportar(codigo: string, _previo: EstadoReporte, form: FormData): Promise<EstadoReporte> {
  const referencia = String(form.get("referencia") ?? "").slice(0, 80);
  const r = await reportarPago(codigo.slice(0, 20), referencia, HORAS_PARA_VERIFICAR);
  if (!r.ok) return { error: MENSAJES[r.motivo] };
  revalidatePath(`/reserva/${codigo}`);
  revalidatePath("/admin");
  return { ok: true };
}
