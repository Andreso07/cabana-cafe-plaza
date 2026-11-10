import Link from "next/link";
import { leerConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

// Basada en la Ley 1581 de 2012. El responsable y el correo se completan en el panel.
export default async function Privacidad() {
  const cfg = await leerConfig();
  const falta = <strong className="text-teja">[pendiente: completar en el panel]</strong>;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-4 leading-relaxed font-semibold">
      <Link href="/" className="text-sm font-bold text-suave hover:underline">← {cfg.nombre}</Link>
      <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Política de tratamiento de datos personales</h1>
      <p>
        En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, {cfg.negocio} ({cfg.nombre}),
        cuyo responsable es {cfg.responsable || falta}, informa cómo trata los datos personales que recoge en este sitio.
      </p>
      <h2 className="font-titulo font-extrabold text-xl pt-2">Qué datos recogemos</h2>
      <p>
        Nombre, número de documento, correo electrónico, celular, las fechas de la reserva y, para separarla,
        la foto de la cédula del responsable que se envía por WhatsApp.
      </p>
      <h2 className="font-titulo font-extrabold text-xl pt-2">Para qué los usamos</h2>
      <ul className="list-disc pl-6">
        <li>Gestionar tu reserva, el pago y la comunicación sobre tu estadía.</li>
        <li>Cumplir obligaciones legales de alojamiento turístico (registro de huéspedes y facturación).</li>
      </ul>
      <p>
        No vendemos ni compartimos tus datos con terceros, salvo la pasarela de pagos para procesar el pago y
        las autoridades cuando la ley lo exija.
      </p>
      <h2 className="font-titulo font-extrabold text-xl pt-2">Tus derechos</h2>
      <p>
        Puedes conocer, actualizar, rectificar y pedir la supresión de tus datos, o revocar esta autorización,
        escribiendo a {cfg.correoContacto || falta}. Responderemos en los plazos de ley.
      </p>
    </main>
  );
}
