"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { FotoCabana } from "@/lib/fotosCabana";

const url = (id: string, mini = false) => `/api/fotos-cabana/${id}${mini ? "?t=mini" : ""}`;
// Clases escritas completas: Tailwind no ve las que se arman con `grid-cols-${n}`.
const COLUMNAS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

/**
 * Galería de la portada. En el celular las fotos se deslizan con el dedo (la siguiente se asoma para
 * que se note que hay más); en el computador, una grande y cuatro pequeñas, como en Airbnb. Al tocar
 * una se abre en grande y se pasa a la siguiente con flechas, con el teclado o deslizando.
 */
export function GaleriaCabana({ fotos, nombre }: { fotos: FotoCabana[]; nombre: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(0);
  // La foto grande solo se pide al abrir el visor: si no, cada visita la descarga sin verla.
  const [abierto, setAbierto] = useState(false);
  const toque = useRef<number | null>(null);

  if (fotos.length === 0) return null;
  const alt = (f: FotoCabana, i: number) => f.descripcion ?? `${nombre}, foto ${i + 1}`;
  const abrir = (i: number) => {
    setActual(i);
    setAbierto(true);
    dialogo.current?.showModal();
  };
  const ir = (paso: number) => setActual((a) => (a + paso + fotos.length) % fotos.length);
  const foto = fotos[actual];

  const miniatura = (f: FotoCabana, i: number, clase: string) => (
    <button key={f.id} type="button" onClick={() => abrir(i)} className={`group relative overflow-hidden rounded-[18px] bg-crema ${clase}`}>
      <Image
        src={url(f.id, true)}
        alt={alt(f, i)}
        width={640}
        height={Math.round((640 * f.alto) / f.ancho)}
        unoptimized
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </button>
  );

  return (
    <div className="mt-8">
      {/* Celular: carrusel deslizable */}
      <div className="md:hidden -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {fotos.map((f, i) => (
          miniatura(f, i, "aspect-[4/3] w-[82%] shrink-0 snap-center")
        ))}
      </div>

      {/* Computador: una grande y hasta cuatro pequeñas */}
      <div className={`hidden md:grid gap-3 ${fotos.length >= 5 ? "grid-cols-4 grid-rows-2 h-[440px]" : `${COLUMNAS[Math.min(fotos.length, 4)]} h-[320px]`}`}>
        {fotos.slice(0, 5).map((f, i) => (
          miniatura(f, i, fotos.length >= 5 && i === 0 ? "col-span-2 row-span-2" : "")
        ))}
      </div>

      {fotos.length > 1 && (
        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={() => abrir(0)}
            className="rounded-full border-[3px] border-black/10 bg-white px-5 py-2 text-sm font-extrabold hover:border-teja/40"
          >
            📷 Ver todas las fotos ({fotos.length})
          </button>
        </p>
      )}

      <dialog
        ref={dialogo}
        aria-label="Fotos de la cabaña"
        onClose={() => setAbierto(false)}
        onClick={(e) => e.target === dialogo.current && dialogo.current.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") ir(1);
          if (e.key === "ArrowLeft") ir(-1);
        }}
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current === null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
        }}
        className="m-auto h-[100dvh] max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/90"
      >
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4" onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}>
          <div className="flex w-full max-w-5xl items-center justify-between text-white">
            <span className="text-sm font-extrabold">{actual + 1} / {fotos.length}</span>
            <button type="button" onClick={() => dialogo.current?.close()} aria-label="Cerrar" className="rounded-full bg-white/15 px-3 py-1 text-xl font-extrabold hover:bg-white/25">
              ✕
            </button>
          </div>
          <div className="relative flex w-full max-w-5xl flex-1 items-center justify-center min-h-0">
            {/* La foto grande va sin optimizar: ya viene reducida a 1600 px desde el panel. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {abierto && <img key={foto.id} src={url(foto.id)} alt={alt(foto, actual)} className="max-h-full max-w-full rounded-[12px] object-contain" />}
            {fotos.length > 1 && (
              <>
                <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior" className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3.5 py-2 text-xl font-extrabold text-tinta shadow hover:bg-white">‹</button>
                <button type="button" onClick={() => ir(1)} aria-label="Foto siguiente" className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3.5 py-2 text-xl font-extrabold text-tinta shadow hover:bg-white">›</button>
              </>
            )}
          </div>
          {foto.descripcion && <p className="text-center text-sm font-bold text-white">{foto.descripcion}</p>}
        </div>
      </dialog>
    </div>
  );
}
