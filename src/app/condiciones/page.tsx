import Link from "next/link";
import { CABANA, PRECIOS, REGLAS } from "@/config/cabana";

// BORRADOR: revisa estas condiciones y ajústalas a lo que de verdad vas a cumplir.
export default function Condiciones() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-4 leading-relaxed">
      <Link href="/" className="text-sm text-suave hover:underline">← {CABANA.nombre}</Link>
      <h1 className="font-titulo text-3xl">Condiciones de reserva y cancelación</h1>

      <h2 className="font-semibold text-lg pt-2">Pago</h2>
      <p>
        Para confirmar la reserva se paga el {PRECIOS.porcentajeAnticipo}% del valor total en línea.
        El saldo se paga al llegar. Las fechas quedan apartadas mientras se completa el pago
        ({PRECIOS.minutosApartado} minutos en línea, {PRECIOS.minutosApartadoManual / 60} horas por
        transferencia); si no se recibe, vuelven a estar disponibles.
      </p>

      <h2 className="font-semibold text-lg pt-2">Cancelación</h2>
      <ul className="list-disc pl-6">
        <li>Con 15 días o más de anticipación a la llegada: se devuelve el 100% del anticipo.</li>
        <li>Entre 14 y 7 días antes: se devuelve el 50% del anticipo o se cambia la fecha sin costo.</li>
        <li>Con menos de 7 días: no hay devolución; se puede cambiar la fecha una vez, sujeto a disponibilidad.</li>
      </ul>
      <p>Si por causa nuestra no podemos recibirte, devolvemos el 100% de lo pagado.</p>

      <h2 className="font-semibold text-lg pt-2">Estadía</h2>
      <ul className="list-disc pl-6">
        {REGLAS.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <p>
        Al llegar se presenta el documento de identidad de todos los huéspedes adultos, para el registro
        que exige la ley.
      </p>
    </main>
  );
}
