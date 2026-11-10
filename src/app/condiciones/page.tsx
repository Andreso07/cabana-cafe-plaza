import Link from "next/link";
import { LIMITES } from "@/config/cabana";
import { leerConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Condiciones() {
  const cfg = await leerConfig();
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-4 leading-relaxed font-semibold">
      <Link href="/" className="text-sm font-bold text-suave hover:underline">← {cfg.nombre}</Link>
      <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Condiciones de reserva y cancelación</h1>

      <h2 className="font-titulo font-extrabold text-xl pt-2">Pago</h2>
      <p>
        La reserva se separa pagando el {cfg.porcentajeAnticipo}% del valor total
        {cfg.requisitos && <> y enviando {cfg.requisitos.charAt(0).toLowerCase() + cfg.requisitos.slice(1)}</>}
        {!cfg.requisitos && "."} El saldo se paga al llegar. Las fechas quedan apartadas mientras se completa
        el pago ({cfg.horasApartado} horas por transferencia, {LIMITES.minutosApartadoWompi} minutos en
        línea); si no se recibe, vuelven a estar disponibles.
      </p>

      <h2 className="font-titulo font-extrabold text-xl pt-2">Cancelación</h2>
      <ul className="list-disc pl-6 space-y-1">
        {cfg.cancelacion.map((c) => <li key={c}>{c}</li>)}
      </ul>

      <h2 className="font-titulo font-extrabold text-xl pt-2">Estadía</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Entrada desde las {cfg.checkIn} y salida hasta las {cfg.checkOut}.</li>
        {cfg.reglas.map((r) => <li key={r}>{r}</li>)}
        {cfg.noIncluye.length > 0 && <li>No incluye: {cfg.noIncluye.join(", ").toLowerCase()}.</li>}
      </ul>
      <p>
        Al llegar se presenta el documento de identidad de todos los huéspedes adultos, para el registro
        que exige la ley.
      </p>
    </main>
  );
}
