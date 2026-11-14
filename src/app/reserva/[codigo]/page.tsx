import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { leerConfig } from "@/lib/config";
import { formatoLargo } from "@/lib/fechas";
import { pesos } from "@/lib/precios";
import { obtenerReserva } from "@/lib/store";
import { urlDePago, wompiConfigurado } from "@/lib/wompi";
import { Refrescar, ReportarPago, SimularPago } from "./acciones";

export const dynamic = "force-dynamic";

export default async function PaginaReserva({ params }: PageProps<"/reserva/[codigo]">) {
  const { codigo } = await params;
  const [r, cfg] = await Promise.all([obtenerReserva(codigo), leerConfig()]);
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

  const fechas = `del ${formatoLargo(r.entrada)} al ${formatoLargo(r.salida)}`;
  const whatsapp = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(
    `Hola, tengo la reserva ${r.codigo} en ${cfg.nombre}, ${fechas}, a nombre de ${r.nombre}.`,
  )}`;
  const mensajeComprobante = `Hola, soy ${r.nombre}. Te envío el comprobante de la reserva ${r.codigo} (${fechas}, ${r.huespedes} personas) por ${pesos(r.anticipo)}${
    r.pagoReportado ? ` (comprobante ${r.pagoReportado.referencia})` : ""
  }${
    cfg.requisitos ? ` y ${cfg.requisitos.charAt(0).toLowerCase()}${cfg.requisitos.slice(1).replace(/\.$/, "")}` : ""
  }.`;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href="/" className="text-sm font-bold text-suave hover:underline">← {cfg.nombre}</Link>
      <h1 className="font-titulo text-[34px] font-extrabold leading-tight mt-4">
        {r.estado === "confirmada" && "¡Reserva confirmada! 🎉"}
        {r.estado === "pendiente" && "Falta el pago"}
        {r.estado === "expirada" && "La reserva expiró"}
        {r.estado === "cancelada" && "Reserva cancelada"}
      </h1>
      <p className="text-suave font-semibold mt-1">
        Código de reserva: <strong className="text-tinta">{r.codigo}</strong>
      </p>

      <div className="mt-6 rounded-[24px] border-[3px] border-black/5 bg-white p-5 space-y-1 text-sm font-semibold">
        <p><span className="text-suave">Llegada:</span> {formatoLargo(r.entrada)} desde las {cfg.checkIn}</p>
        <p><span className="text-suave">Salida:</span> {formatoLargo(r.salida)} hasta las {cfg.checkOut}</p>
        <p><span className="text-suave">Huéspedes:</span> {r.huespedes}</p>
        <p><span className="text-suave">A nombre de:</span> {r.nombre}</p>
        <hr className="border-linea my-2" />
        {r.descuento > 0 && (
          <p className="flex justify-between text-cafe">
            <span>🎁 {r.descuentoNombre ?? "Descuento"}</span>
            <span>−{pesos(r.descuento)}</span>
          </p>
        )}
        <p className="flex justify-between"><span>Total</span><span>{pesos(r.total)}</span></p>
        <p className="flex justify-between font-extrabold">
          <span>{r.estado === "confirmada" ? "Anticipo pagado" : "Anticipo para separar"}</span>
          <span>{pesos(r.anticipo)}</span>
        </p>
        <p className="flex justify-between text-suave"><span>Saldo al llegar</span><span>{pesos(r.total - r.anticipo)}</span></p>
      </div>

      {r.estado === "pendiente" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold">
            Tus fechas están apartadas hasta las{" "}
            <strong>
              {new Date(r.expiraEn).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
                hour: "numeric",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </strong>
            . Si no se recibe el pago, quedan libres otra vez.
          </p>
          {pago && (
            <a href={pago} className="boton-goma block text-center rounded-full bg-teja text-white font-extrabold py-3.5">
              Pagar {pesos(r.anticipo)} con Nequi, PSE o tarjeta
            </a>
          )}
          {!pago && process.env.NODE_ENV !== "production" && <SimularPago codigo={r.codigo} />}
          {!pago && (
            <div className="rounded-[24px] border-[3px] border-teja bg-white p-5 text-sm font-semibold space-y-4 shadow-[0_8px_0_var(--teja)]">
              <p className="font-titulo text-lg font-extrabold">Separa con {pesos(r.anticipo)}</p>
              <div className="space-y-1">
                <p className="font-extrabold">1. Transfiere {pesos(r.anticipo)}</p>
                {cfg.llaveBreB && (
                  <p>
                    <span className="text-suave">Llave Bre-B (desde Nequi o cualquier banco):</span>{" "}
                    <strong className="select-all text-base">{cfg.llaveBreB}</strong>
                  </p>
                )}
                {cfg.nequi && <p><span className="text-suave">Nequi:</span> <strong>{cfg.nequi}</strong></p>}
                {cfg.titular && <p><span className="text-suave">A nombre de:</span> {cfg.titular}</p>}
                <p>
                  En la descripción o mensaje del pago escribe tu código{" "}
                  <strong className="select-all rounded bg-sol/30 px-1.5 py-0.5">{r.codigo}</strong>.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-extrabold">2. Escribe aquí el número del comprobante</p>
                {r.pagoReportado ? (
                  <p className="rounded-[14px] bg-libre text-libre-texto p-3">
                    ✓ Recibimos el comprobante <strong>{r.pagoReportado.referencia}</strong>. Lo verificamos con el
                    movimiento y te confirmamos. Tus fechas siguen apartadas mientras tanto.
                  </p>
                ) : null}
                <ReportarPago codigo={r.codigo} actual={r.pagoReportado?.referencia} />
              </div>
              <div className="space-y-2">
                <p className="font-extrabold">
                  3. Envíanos el comprobante{cfg.requisitos && <> y {cfg.requisitos.charAt(0).toLowerCase() + cfg.requisitos.slice(1).replace(/\.$/, "")}</>}
                </p>
                <p className="text-xs text-suave">
                  El botón abre WhatsApp con el mensaje listo. <strong>Adjunta allí</strong> las fotos con el clip 📎 antes de
                  enviarlo; en esta página no se sube nada.
                </p>
                <a
                  href={`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(mensajeComprobante)}`}
                  target="_blank"
                  rel="noopener"
                  className="boton-whatsapp block text-center rounded-full bg-[#25D366] text-white font-extrabold py-3"
                >
                  Enviar comprobante por WhatsApp
                </a>
                <p className="text-xs text-suave">Confirmamos tu reserva cuando el pago aparezca en nuestra cuenta.</p>
              </div>
            </div>
          )}
          <Refrescar />
        </div>
      )}

      {r.estado === "confirmada" && (
        <div className="mt-6 text-sm font-semibold space-y-2">
          <p>Te esperamos. Guarda este código; con él te atendemos por WhatsApp.</p>
          <p className="text-suave">{cfg.comoLlegar}</p>
          <a href={cfg.mapsUrl} target="_blank" rel="noopener" className="underline text-cafe">Abrir en Google Maps</a>
        </div>
      )}

      {r.estado === "expirada" && (
        <div className="mt-6 text-sm font-semibold space-y-3">
          <p>
            No recibimos el pago a tiempo. Si ya pagaste, escribe el número del comprobante y escríbenos por WhatsApp
            con tu código: lo revisamos.{" "}
            <Link href="/#reservar" className="underline">Hacer una nueva reserva</Link>
          </p>
          {r.pagoReportado && (
            <p className="rounded-[14px] bg-libre text-libre-texto p-3">
              ✓ Recibimos el comprobante <strong>{r.pagoReportado.referencia}</strong>. Lo revisamos y te escribimos.
            </p>
          )}
          <ReportarPago codigo={r.codigo} actual={r.pagoReportado?.referencia} />
        </div>
      )}

      <a href={whatsapp} target="_blank" rel="noopener" className="mt-8 inline-block text-sm font-bold underline text-cafe">
        ¿Dudas? Escríbenos por WhatsApp
      </a>
    </main>
  );
}
