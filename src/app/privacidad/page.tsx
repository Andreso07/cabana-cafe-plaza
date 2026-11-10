import Link from "next/link";
import { CABANA } from "@/config/cabana";

// BORRADOR basado en la Ley 1581 de 2012. Completa los datos del responsable
// y hazlo revisar antes de publicar.
export default function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-4 leading-relaxed">
      <Link href="/" className="text-sm text-suave hover:underline">← {CABANA.nombre}</Link>
      <h1 className="font-titulo text-3xl">Política de tratamiento de datos personales</h1>
      <p>
        En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, {CABANA.nombre}{" "}
        <strong>[nombre del responsable, cédula o NIT, dirección y correo de contacto]</strong> informa
        cómo trata los datos personales que recoge en este sitio.
      </p>
      <h2 className="font-semibold text-lg pt-2">Qué datos recogemos</h2>
      <p>Nombre, número de documento, correo electrónico, celular y las fechas de la reserva.</p>
      <h2 className="font-semibold text-lg pt-2">Para qué los usamos</h2>
      <ul className="list-disc pl-6">
        <li>Gestionar tu reserva, el pago y la comunicación sobre tu estadía.</li>
        <li>Cumplir obligaciones legales de alojamiento turístico (registro de huéspedes y facturación).</li>
      </ul>
      <p>No vendemos ni compartimos tus datos con terceros, salvo la pasarela de pagos para procesar el pago y las autoridades cuando la ley lo exija.</p>
      <h2 className="font-semibold text-lg pt-2">Tus derechos</h2>
      <p>
        Puedes conocer, actualizar, rectificar y pedir la supresión de tus datos, o revocar esta
        autorización, escribiendo a <strong>[correo de contacto]</strong>. Responderemos en los plazos de ley.
      </p>
    </main>
  );
}
