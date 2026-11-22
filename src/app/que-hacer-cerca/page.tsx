import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { enlacesDelMapa } from "@/lib/mapa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Qué hacer cerca de Consacá y Sandoná · Cabaña Café Plaza",
  description:
    "Planes cerca de la cabaña: la Basílica de Sandoná y sus sombreros de paja toquilla, el sitio histórico de Bomboná, cafetales, trapiches de panela y la comida típica de Nariño.",
};

/**
 * Página para buscadores y huéspedes: lo que hay para conocer alrededor. Son datos generales y
 * conocidos de la zona; el dueño la revisa y ajusta (horarios y precios cambian, por eso no se dan).
 */
const PLANES: { icono: string; titulo: string; texto: string }[] = [
  {
    icono: "☕",
    titulo: "Cafetales de Nariño",
    texto:
      "La cabaña está entre cafetales. Nariño es reconocido por su café de altura: madruga con una taza, camina entre las matas y mira cómo cambia la montaña con la luz.",
  },
  {
    icono: "⛪",
    titulo: "Sandoná y su Basílica",
    texto:
      "El pueblo vecino es famoso por la Basílica de Nuestra Señora del Rosario, levantada en piedra por su propia gente, y por los sombreros y artesanías tejidos en paja toquilla. Ideal para una tarde de paseo y compras.",
  },
  {
    icono: "🏛️",
    titulo: "Bomboná, historia en Consacá",
    texto:
      "En Consacá se libró en 1822 la Batalla de Bomboná, de la campaña de independencia. El sitio histórico y su monumento quedan muy cerca.",
  },
  {
    icono: "🌋",
    titulo: "Faldas del Galeras",
    texto:
      "Consacá está en las faldas del volcán Galeras. Los paisajes de montaña, los miradores y los atardeceres de la zona son el mejor plan sin salir de la cabaña.",
  },
  {
    icono: "🍯",
    titulo: "Trapiches de panela",
    texto:
      "En la región de Sandoná y Consacá se cultiva caña y se hace panela en trapiches tradicionales. Pregunta en la zona y prueba la panela recién hecha.",
  },
  {
    icono: "🍲",
    titulo: "Comida típica",
    texto:
      "No te vayas sin probar el cuy asado, las empanadas de añejo y el helado de paila, clásicos de la cocina nariñense.",
  },
  {
    icono: "🎭",
    titulo: "Carnaval de Negros y Blancos",
    texto:
      "En los primeros días de enero, Pasto celebra su carnaval, Patrimonio de la Humanidad. Una escapada a la cabaña es un buen descanso antes o después de la fiesta.",
  },
];

export default async function QueHacerCerca() {
  const cfg = await leerConfig();
  const mapa = enlacesDelMapa(cfg.mapsUrl, `${cfg.nombre}, ${cfg.municipio}, ${cfg.departamento}`);
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm font-bold text-suave hover:underline">← {cfg.nombre}</Link>
      <h1 className="font-titulo mt-3 text-[34px] md:text-[42px] font-extrabold leading-tight">
        Qué hacer cerca de la cabaña
      </h1>
      <p className="mt-2 font-semibold text-suave">
        {cfg.nombre} está en la {cfg.vereda}, {cfg.municipio} ({cfg.departamento}). {cfg.comoLlegar} Esto es lo que
        puedes conocer en tu escapada.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {PLANES.map((p) => (
          <li key={p.titulo} className="rounded-[22px] border-[3px] border-black/5 bg-white p-5">
            <h2 className="flex items-center gap-2 font-titulo text-xl font-extrabold">
              <span aria-hidden className="text-2xl">{p.icono}</span> {p.titulo}
            </h2>
            <p className="mt-2 text-sm font-semibold text-tinta/80">{p.texto}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-[24px] bg-cafe-oscuro p-6 text-center text-white">
        <p className="font-titulo text-2xl font-extrabold">¿Te animas?</p>
        <p className="mt-1 text-sm font-semibold text-white/80">Mira las fechas libres y reserva en 2 minutos.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/#reservar" className="boton-goma rounded-full bg-teja px-6 py-3 font-extrabold text-white">
            Ver fechas disponibles →
          </Link>
          <a href={mapa.ruta} target="_blank" rel="noopener" className="rounded-full border-2 border-white/40 bg-white/10 px-6 py-3 font-extrabold text-white hover:bg-white/20">
            🗺️ Cómo llegar
          </a>
        </div>
      </div>
    </main>
  );
}
