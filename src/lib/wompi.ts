// Integración con Wompi (pasarela de Bancolombia: Nequi, PSE, tarjetas).
// Documentación: https://docs.wompi.co
//
// Variables de entorno (en .env.local; las de prueba empiezan por pub_test_ / test_):
//   WOMPI_PUBLIC_KEY        llave pública
//   WOMPI_INTEGRITY_SECRET  secreto de integridad (firma del link de pago)
//   WOMPI_EVENTS_SECRET     secreto de eventos (verifica los avisos de pago)
// Sin ellas, la web funciona en "modo simulado": se puede probar el flujo completo
// sin cobrar nada.
import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function wompiConfigurado(): boolean {
  return Boolean(
    process.env.WOMPI_PUBLIC_KEY &&
      process.env.WOMPI_INTEGRITY_SECRET &&
      process.env.WOMPI_EVENTS_SECRET,
  );
}

/** URL del Web Checkout de Wompi para pagar el anticipo de una reserva. */
export function urlDePago(opts: {
  referencia: string;
  montoPesos: number;
  expiraEn: string; // ISO 8601
  urlRetorno: string;
  email: string;
}): string {
  const llave = process.env.WOMPI_PUBLIC_KEY!;
  const secreto = process.env.WOMPI_INTEGRITY_SECRET!;
  const centavos = String(opts.montoPesos * 100);
  // Firma de integridad: referencia + monto + moneda + expiración + secreto.
  const firma = sha256(`${opts.referencia}${centavos}COP${opts.expiraEn}${secreto}`);

  const p = new URLSearchParams({
    "public-key": llave,
    currency: "COP",
    "amount-in-cents": centavos,
    reference: opts.referencia,
    "signature:integrity": firma,
    "redirect-url": opts.urlRetorno,
    "expiration-time": opts.expiraEn,
    "customer-data:email": opts.email,
  });
  return `https://checkout.wompi.co/p/?${p.toString()}`;
}

export type EventoWompi = {
  event: string;
  data: { transaction: Record<string, unknown> };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

function valorEnRuta(obj: Record<string, unknown>, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>(
    (acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined),
    obj,
  );
}

/**
 * Verifica que un evento lo envió Wompi: SHA-256 de los valores de
 * `signature.properties` (en orden) + `timestamp` + secreto de eventos.
 */
export function eventoAutentico(evento: EventoWompi, secreto: string): boolean {
  if (!evento?.signature?.properties || !evento.signature.checksum || !evento.data) return false;
  const valores = evento.signature.properties
    .map((p) => String(valorEnRuta(evento.data, p) ?? ""))
    .join("");
  const esperado = sha256(`${valores}${evento.timestamp}${secreto}`);
  const recibido = evento.signature.checksum.toLowerCase();
  return (
    esperado.length === recibido.length &&
    timingSafeEqual(Buffer.from(esperado), Buffer.from(recibido))
  );
}
