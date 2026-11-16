// Página a la que lleva el QR de la cabaña: solo el formulario de reseña, pensada para el celular.
import Link from "next/link";
import { FormularioResena } from "@/components/FormularioResena";
import { Redes } from "@/components/Redes";
import { leerConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deja tu reseña · Cabaña Café Plaza" };

export default async function Resena() {
  const cfg = await leerConfig();
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-titulo text-[34px] font-extrabold leading-tight">¡Gracias por visitarnos! 🏡</h1>
      <p className="mt-2 font-semibold text-suave">
        Cuéntanos cómo te fue en {cfg.nombre}. Tu opinión ayuda a otros viajeros y a nosotros a mejorar.
      </p>
      <div className="mt-6 rounded-[28px] border-[3px] border-teja bg-white p-5 shadow-[0_12px_0_var(--teja)]">
        <FormularioResena />
      </div>
      {(cfg.redes.facebook || cfg.redes.instagram || cfg.redes.tiktok) && (
        <div className="mt-10 text-center font-extrabold">
          <p>Síguenos en redes</p>
          <div className="mt-2 flex justify-center">
            <Redes redes={cfg.redes} grande />
          </div>
        </div>
      )}
      <p className="mt-8 text-center">
        <Link href="/" className="text-sm font-bold text-suave underline">Ver la web de la cabaña</Link>
      </p>
    </main>
  );
}
