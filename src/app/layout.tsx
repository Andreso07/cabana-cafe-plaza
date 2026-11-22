import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Ola } from "@/components/Ola";
import { Baloo_2, Nunito } from "next/font/google";
import { Clarity } from "@/components/Clarity";
import { Navidad } from "@/components/Navidad";
import { ContadorVisitas } from "@/components/ContadorVisitas";
import { Redes } from "@/components/Redes";
import { leerConfig } from "@/lib/config";
import { cifrasVisitas } from "@/lib/resenas";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["600", "700", "800"] });

export async function generateMetadata(): Promise<Metadata> {
  const c = await leerConfig();
  return {
    title: `${c.nombre} · ${c.municipio}, ${c.departamento}`,
    description: `Cabaña entre cafetales en la ${c.vereda}, ${c.municipio}. Hasta ${c.capacidad} personas. Reserva en línea.`,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cfg = await leerConfig();
  // Si la tabla de visitas falla, el pie se muestra igual: el contador no puede tumbar la web.
  const visitas = await cifrasVisitas().then((c) => c.total).catch(() => 0);
  const whatsapp = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(
    `Hola, quiero información sobre ${cfg.nombre}`,
  )}`;
  const telefono = cfg.whatsapp.replace(/^57/, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  return (
    <html lang="es" className={`${nunito.variable} ${baloo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans overflow-x-hidden">
        {cfg.modoNavidad && <Navidad parte="franja" mensaje={cfg.mensajeNavidad} />}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-crema/90 border-b border-cafe/10">
          {cfg.modoNavidad && <Navidad parte="luces" />}
          <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/logo.svg"
                alt=""
                width={40}
                height={40}
                unoptimized
                priority
                className="size-10 shrink-0 rounded-[14px] shadow-[0_4px_0_var(--teja-oscura)]"
              />
              <span className="min-w-0">
                <span className="block font-titulo font-extrabold text-lg leading-tight text-teja truncate">{cfg.nombre}</span>
                <span className="block text-[11px] leading-[1.4] font-bold tracking-widest uppercase text-cafe truncate">
                  {cfg.municipio} · {cfg.departamento}
                </span>
              </span>
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className="boton-whatsapp palpito shrink-0 flex items-center gap-2 bg-[#25D366] text-white font-extrabold text-sm px-4 py-2.5 rounded-full"
            >
              <span aria-hidden>💬</span>
              <span className="hidden sm:inline">WhatsApp {telefono}</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </header>

        <div className="flex-1">{children}</div>
        {cfg.modoNavidad && <Navidad parte="nieve" />}
        <Clarity />

        <div className="mt-16">
          <Ola fondo="bg-crema" color="text-cafe-oscuro" />
        </div>
        <footer className="bg-cafe-oscuro">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-8 text-sm text-white/80 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p className="font-semibold">
              {cfg.nombre} · {cfg.negocio} · {cfg.vereda}, {cfg.municipio}, {cfg.departamento}
              {cfg.rnt && <> · RNT {cfg.rnt}</>}
              <span className="block mt-1 text-xs">
                👀 {visitas.toLocaleString("es-CO")} {visitas === 1 ? "visita" : "visitas"}
              </span>
            </p>
            <nav className="flex flex-wrap items-center gap-4 font-semibold">
              <Link href="/resena" className="hover:underline">Deja tu reseña</Link>
              <Link href="/condiciones" className="hover:underline">Condiciones de reserva</Link>
              <Link href="/privacidad" className="hover:underline">Tratamiento de datos</Link>
              <Redes redes={cfg.redes} />
            </nav>
          </div>
        </footer>
        <ContadorVisitas />
      </body>
    </html>
  );
}
