import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CABANA, PAGO_MANUAL } from "@/config/cabana";
import { formatoLargo } from "@/lib/fechas";
import { pesos } from "@/lib/precios";
import { obtenerReserva } from "@/lib/store";
import { urlDePago, wompiConfigurado } from "@/lib/wompi";
import { Refrescar, SimularPago } from "./acciones";

export const dynamic = "force-dynamic";

export default async function PaginaReserva({ params }: PageProps<"/reserva/[codigo]">) {
  const { codigo } = await params;
  const r = await obtenerReserva(codigo);
  if (!r) notFound();

  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const conWompi = wompiConfigurado();
  const pago =
    r.estado === "pendiente" && conWompi
      ? urlDePago({
          referencia: r.codigo,
          montoPesos: r.anticipo,
          expiraEn: r.expiraEn,
          urlRetorno: `${origen}/reserva/${r.codigo}`,
          email: r.email,
        })
      : null;

  const whatsapp = `https://wa.me/${CABANA.whatsapp}?text=${encodeURIComponent(
    `Hola, tengo la reserva ${r.codigo} en ${CABANA.nombre}`,
  )}`;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href="/" className="text-sm text-suave hover:underline">← {CABANA.nombre}</Link>
      <h1 className="font-titulo text-3xl mt-4">
        {r.estado === "confirmada" && "¡Reserva confirmada!"}
        {r.estado === "pendiente" && "Falta el pago"}
        {r.estado === "expirada" && "La reserva expiró"}
        {r.estado === "cancelada" && "Reserva cancelada"}
      </h1>
      <p className="text-suave mt-1">Código de reserva: <strong className="text-tinta">{r.codigo}</strong></p>

      <div className="mt-6 rounded-2xl border border-linea bg-white p-5 space-y-1 text-sm">
        <p><span className="text-suave">Llegada:</span> {formatoLargo(r.entrada)} desde las {CABANA.checkIn}</p>
        <p><span className="text-suave">Salida:</span> {formatoLargo(r.salida)} hasta las {CABANA.checkOut}</p>
        <p><span className="text-suave">Huéspedes:</span> {r.huespedes}</p>
        <p><span className="text-suave">A nombre de:</span> {r.nombre}</p>
        <hr className="border-linea my-2" />
        <p className="flex justify-between"><span>Total</span><span>{pesos(r.total)}</span></p>
        <p className="flex justify-between font-semibold">
          <span>{r.estado === "confirmada" ? "Anticipo pagado" : "Anticipo a pagar"}</span>
          <span>{pesos(r.anticipo)}</span>
        </p>
        <p className="flex justify-between text-suave"><span>Saldo al llegar</span><span>{pesos(r.total - r.anticipo)}</span></p>
      </div>

      {r.estado === "pendiente" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm">
            Tus fechas están apartadas hasta las{" "}
            <strong>
              {new Date(r.expiraEn).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" })}
            </strong>
            . Si no se recibe el pago, quedan libres otra vez.
          </p>
          {pago ? (
            <a href={pago} className="block text-center rounded-full bg-teja hover:bg-teja-oscura text-white font-medium py-3">
              Pagar {pesos(r.anticipo)} con Nequi, PSE o tarjeta
            </a>
          ) : process.env.NODE_ENV !== "production" ? (
            <SimularPago codigo={r.codigo} />
          ) : (
            <div className="rounded-xl border border-linea bg-white p-4 text-sm space-y-2">
              <p className="font-medium">Paga {pesos(r.anticipo)} por transferencia:</p>
              <p><span className="text-suave">Nequi:</span> <strong>{PAGO_MANUAL.nequi}</strong> · {PAGO_MANUAL.titular}</p>
              {PAGO_MANUAL.llaveBreB && (
                <p><span className="text-suave">Llave Bre-B (desde cualquier banco):</span> <strong>{PAGO_MANUAL.llaveBreB}</strong></p>
              )}
              <p>
                En la descripción escribe tu código <strong>{r.codigo}</strong> y envíanos el comprobante por WhatsApp.
                Confirmamos tu reserva en cuanto lo veamos.
              </p>
              <a
                href={`https://wa.me/${CABANA.whatsapp}?text=${encodeURIComponent(`Hola, adjunto el comprobante de la reserva ${r.codigo} por ${pesos(r.anticipo)}`)}`}
                target="_blank"
                rel="noopener"
                className="block text-center rounded-full bg-[#25D366] text-white font-medium py-3"
              >
                Enviar comprobante por WhatsApp
              </a>
            </div>
          )}
          <Refrescar />
        </div>
      )}

      {r.estado === "confirmada" && (
        <div className="mt-6 text-sm space-y-2">
          <p>Te esperamos. Guarda este código; con él te atendemos por WhatsApp.</p>
          <a href={CABANA.mapsUrl} target="_blank" rel="noopener" className="underline text-cafe">Cómo llegar</a>
        </div>
      )}

      {r.estado === "expirada" && (
        <p className="mt-6 text-sm">
          No recibimos el pago a tiempo. Si ya pagaste, escríbenos por WhatsApp con tu código y lo revisamos.{" "}
          <Link href="/#reservar" className="underline">Hacer una nueva reserva</Link>
        </p>
      )}

      <a href={whatsapp} target="_blank" rel="noopener" className="mt-8 inline-block text-sm underline text-cafe">
        ¿Dudas? Escríbenos por WhatsApp
      </a>
    </main>
  );
}
