import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leerConfig } from "@/lib/config";
import { enlacesDelMapa } from "@/lib/mapa";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await leerConfig();
  return {
    title: `Qué hacer cerca de ${cfg.municipio}`,
    description: `Planes cerca de ${cfg.nombre}: ${cfg.queHacer.map((p) => p.titulo.toLowerCase()).join(", ")}.`.slice(0, 160),
  };
}

/**
 * Página para buscadores y huéspedes: lo que hay para conocer alrededor. Los planes se escriben en
 * el panel (Configuración → Servicios y reglas → Qué hacer cerca). Sin planes, la página no existe.
 */
export default async function QueHacerCerca() {
  const cfg = await leerConfig();
  if (cfg.queHacer.length === 0) notFound();
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
        {cfg.queHacer.map((p) => (
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
