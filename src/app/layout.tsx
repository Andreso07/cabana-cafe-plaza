import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Geist } from "next/font/google";
import { CABANA } from "@/config/cabana";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${CABANA.nombre} · ${CABANA.municipio}, ${CABANA.departamento}`,
  description: `Cabaña entre cafetales en la ${CABANA.vereda}, ${CABANA.municipio}. Hasta ${CABANA.capacidad} personas. Reserva en línea.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geist.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-linea mt-16">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-suave flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p>
              {CABANA.nombre} · {CABANA.vereda}, {CABANA.municipio}, {CABANA.departamento}
              {CABANA.rnt && <> · RNT {CABANA.rnt}</>}
            </p>
            <nav className="flex gap-4">
              <Link href="/condiciones" className="hover:underline">Condiciones de reserva</Link>
              <Link href="/privacidad" className="hover:underline">Tratamiento de datos</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
