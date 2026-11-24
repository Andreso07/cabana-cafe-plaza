"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { esImagen } from "@/lib/reducirImagen";

type Pieza = { clave: string; blob: Blob };

/** Redibuja la imagen en un lienzo: la reduce, quita los datos ocultos (EXIF) y, si se pide, la recorta. */
async function dibujar(
  archivo: File,
  opciones: { lado?: number; recorte?: { ancho: number; alto: number }; tipo: "image/png" | "image/jpeg"; calidad?: number },
): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d")!;
  if (opciones.recorte) {
    // Recorte centrado a la proporción pedida (vista previa 1200×630).
    const { ancho, alto } = opciones.recorte;
    const escala = Math.max(ancho / bitmap.width, alto / bitmap.height);
    lienzo.width = ancho;
    lienzo.height = alto;
    const w = bitmap.width * escala;
    const h = bitmap.height * escala;
    ctx.drawImage(bitmap, (ancho - w) / 2, (alto - h) / 2, w, h);
  } else {
    const escala = Math.min(1, (opciones.lado ?? 2000) / Math.max(bitmap.width, bitmap.height));
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  }
  bitmap.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("sin imagen"))), opciones.tipo, opciones.calidad));
}

/**
 * Panel: cambia el logo o el banner de la web. El banner genera tres archivos: el grande, uno más
 * liviano para celulares y la imagen de vista previa al compartir el enlace (WhatsApp, Facebook).
 */
export function SubirImagenMarca({ tipo, actual, esPropia }: { tipo: "logo" | "banner"; actual: string; esPropia: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const claves = tipo === "logo" ? ["logo"] : ["banner", "banner-m", "og"];

  async function subir(archivo: File) {
    setError(null);
    if (!esImagen(archivo)) return setError("Ese archivo no es una imagen.");
    try {
      setEstado("Preparando…");
      const piezas: Pieza[] =
        tipo === "logo"
          ? [{ clave: "logo", blob: await dibujar(archivo, { lado: 400, tipo: "image/png" }) }]
          : [
              { clave: "banner", blob: await dibujar(archivo, { lado: 2000, tipo: "image/jpeg", calidad: 0.82 }) },
              { clave: "banner-m", blob: await dibujar(archivo, { lado: 1000, tipo: "image/jpeg", calidad: 0.8 }) },
              { clave: "og", blob: await dibujar(archivo, { recorte: { ancho: 1200, alto: 630 }, tipo: "image/jpeg", calidad: 0.85 }) },
            ];
      for (const [i, p] of piezas.entries()) {
        setEstado(`Subiendo ${i + 1} de ${piezas.length}…`);
        const datos = new FormData();
        datos.set("imagen", p.blob, `${p.clave}`);
        const r = await fetch(`/api/sitio/${p.clave}`, { method: "POST", body: datos });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo subir.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir. Prueba con otra imagen.");
    } finally {
      setEstado(null);
    }
  }

  async function restaurar() {
    setError(null);
    setEstado("Volviendo a la original…");
    try {
      for (const c of claves) await fetch(`/api/sitio/${c}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setEstado(null);
    }
  }

  return (
    <div className="grid gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={actual}
        alt={tipo === "logo" ? "Logo actual" : "Banner actual"}
        className={tipo === "logo" ? "size-20 rounded-[16px] border-2 border-black/5 bg-white object-contain p-1" : "h-32 w-full rounded-[16px] object-cover"}
      />
      <label className="text-sm font-bold">
        {tipo === "logo" ? "Cambiar logo" : "Cambiar foto del banner"}{" "}
        <span className="font-semibold text-suave">
          {tipo === "logo" ? "(PNG con fondo transparente o JPG, cuadrado)" : "(horizontal, la mejor foto del lugar)"}
        </span>
        <input
          type="file"
          accept="image/*"
          disabled={estado !== null}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void subir(f);
          }}
          className="mt-1 block w-full text-sm font-semibold file:mr-3 file:rounded-full file:border-0 file:bg-teja file:px-4 file:py-2 file:font-extrabold file:text-white"
        />
      </label>
      {estado && <p className="text-sm font-bold text-suave" role="status">{estado}</p>}
      {esPropia && !estado && (
        <button type="button" onClick={restaurar} className="justify-self-start text-xs font-bold text-suave underline">
          Volver a la imagen original
        </button>
      )}
      {error && <p className="text-sm font-bold text-teja-oscura" role="alert">{error}</p>}
    </div>
  );
}
