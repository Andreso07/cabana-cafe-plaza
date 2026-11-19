// Página para que los huéspedes compartan sus fotos (enlace desde /resena y desde la portada).
import Link from "next/link";
import { FormularioFotos } from "@/components/FormularioFotos";
import { Redes } from "@/components/Redes";
import { leerConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comparte tus fotos · Cabaña Café Plaza" };

export default async function Fotos() {
  const cfg = await leerConfig();
  const hayRedes = cfg.redes.facebook || cfg.redes.instagram || cfg.redes.tiktok;
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Comparte tus mejores fotos 📸</h1>
      <p className="mt-2 font-semibold text-suave">
        ¿Te llevaste un buen recuerdo de {cfg.nombre}? Súbelo aquí y lo publicamos en la web para que otros viajeros vean
        cómo se vive.
      </p>
      <div className="mt-6 rounded-[28px] border-[3px] border-teja bg-white p-5 shadow-[0_12px_0_var(--teja)]">
        <FormularioFotos nombreCabana={cfg.nombre} />
      </div>
      {hayRedes && (
        <div className="mt-10 text-center font-extrabold">
          <p>¿Las subes a tus redes? ¡Etiquétanos!</p>
          <div className="mt-2 flex justify-center">
            <Redes redes={cfg.redes} grande />
          </div>
        </div>
      )}
      <p className="mt-8 flex justify-center gap-4 text-center">
        <Link href="/resena" className="text-sm font-bold text-suave underline">Dejar una reseña</Link>
        <Link href="/" className="text-sm font-bold text-suave underline">Ver la web de la cabaña</Link>
      </p>
    </main>
  );
}
