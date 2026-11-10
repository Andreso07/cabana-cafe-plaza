import type { Metadata } from "next";
import Link from "next/link";
import { Baloo_2, Nunito } from "next/font/google";
import { CABANA } from "@/config/cabana";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: `${CABANA.nombre} · ${CABANA.municipio}, ${CABANA.departamento}`,
  description: `Cabaña entre cafetales en la ${CABANA.vereda}, ${CABANA.municipio}. Hasta ${CABANA.capacidad} personas. Reserva en línea.`,
};

const whatsapp = `https://wa.me/${CABANA.whatsapp}?text=${encodeURIComponent(
  `Hola, quiero información sobre ${CABANA.nombre}`,
)}`;
const telefono = CABANA.whatsapp.replace(/^57/, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} ${baloo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans overflow-x-hidden">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-crema/90 border-b border-cafe/10">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <span className="size-10 shrink-0 rounded-[14px] bg-teja grid place-items-center text-xl shadow-[0_4px_0_var(--teja-oscura)]" aria-hidden>
                ☕
              </span>
              <span className="min-w-0">
                <span className="block font-titulo font-extrabold text-lg leading-tight text-teja truncate">{CABANA.nombre}</span>
                <span className="block text-[11px] leading-[1.4] font-bold tracking-widest uppercase text-cafe truncate">
                  {CABANA.municipio} · {CABANA.departamento}
                </span>
              </span>
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className="boton-whatsapp shrink-0 flex items-center gap-2 bg-[#25D366] text-white font-extrabold text-sm px-4 py-2.5 rounded-full"
            >
              <span aria-hidden>💬</span>
              <span className="hidden sm:inline">WhatsApp {telefono}</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t-[3px] border-cafe/10 mt-16 bg-white">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-8 text-sm text-suave flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p className="font-semibold">
              {CABANA.nombre} · {CABANA.vereda}, {CABANA.municipio}, {CABANA.departamento}
              {CABANA.rnt && <> · RNT {CABANA.rnt}</>}
            </p>
            <nav className="flex gap-4 font-semibold">
              <Link href="/condiciones" className="hover:underline">Condiciones de reserva</Link>
              <Link href="/privacidad" className="hover:underline">Tratamiento de datos</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
