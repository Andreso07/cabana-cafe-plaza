import Image from "next/image";
import { CABANA, REGLAS, SERVICIOS } from "@/config/cabana";
import { Reservar } from "@/components/Reservar";
import { wompiConfigurado } from "@/lib/wompi";

export default function Inicio() {
  const whatsapp = `https://wa.me/${CABANA.whatsapp}?text=${encodeURIComponent(
    `Hola, quiero información sobre ${CABANA.nombre}`,
  )}`;

  return (
    <main>
      <section className="relative h-[70vh] min-h-[420px] w-full">
        <Image
          src="/cabana.jpg"
          alt={`${CABANA.nombre}: cabaña con techo de teja roja y frente de vidrio entre cafetales, con montañas al fondo`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-5xl px-4 pb-10 text-white">
          <p className="text-sm uppercase tracking-widest opacity-90">
            {CABANA.vereda} · {CABANA.municipio}, {CABANA.departamento}
          </p>
          <h1 className="font-titulo text-4xl sm:text-6xl mt-2">{CABANA.nombre}</h1>
          <p className="mt-3 max-w-xl text-lg opacity-95">
            Despierta entre cafetales, con las montañas de Nariño al frente.
          </p>
          <a
            href="#reservar"
            className="mt-6 inline-block rounded-full bg-teja hover:bg-teja-oscura px-6 py-3 font-medium"
          >
            Ver disponibilidad
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-titulo text-2xl mb-4">La cabaña</h2>
          <ul className="space-y-2">
            {SERVICIOS.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-cafe">●</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-titulo text-2xl mb-4">Antes de venir</h2>
          <ul className="space-y-2">
            {REGLAS.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-teja">●</span> {r}
              </li>
            ))}
          </ul>
          <a href={CABANA.mapsUrl} target="_blank" rel="noopener" className="mt-4 inline-block underline text-cafe">
            Cómo llegar (Google Maps)
          </a>
        </div>
      </section>

      <section id="reservar" className="mx-auto max-w-5xl px-4 scroll-mt-6">
        <h2 className="font-titulo text-3xl mb-6">Reserva tus fechas</h2>
        <Reservar conWompi={wompiConfigurado()} />
      </section>

      <a
        href={whatsapp}
        target="_blank"
        rel="noopener"
        className="fixed bottom-5 right-5 rounded-full bg-[#25D366] text-white shadow-lg px-5 py-3 font-medium hover:brightness-95"
      >
        WhatsApp
      </a>
    </main>
  );
}
