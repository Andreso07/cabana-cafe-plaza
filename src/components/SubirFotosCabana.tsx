"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { esImagen, reducirImagen } from "@/lib/reducirImagen";

const MAX_POR_VEZ = 20;

/** Panel: sube varias fotos de la cabaña, una por petición (Vercel no acepta cuerpos de más de 4,5 MB). */
export function SubirFotosCabana() {
  const router = useRouter();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir() {
    setError(null);
    const fallos: string[] = [];
    for (const [i, archivo] of archivos.entries()) {
      setEstado(`Subiendo ${i + 1} de ${archivos.length}…`);
      try {
        const [imagen, miniatura] = await Promise.all([reducirImagen(archivo, 1600, 0.82), reducirImagen(archivo, 640, 0.78)]);
        const datos = new FormData();
        datos.set("imagen", imagen, "foto.jpg");
        datos.set("miniatura", miniatura, "mini.jpg");
        const r = await fetch("/api/fotos-cabana", { method: "POST", body: datos });
        if (r.ok) continue;
        const json = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 409) {
          setError(json.error);
          break;
        }
        fallos.push(archivo.name);
      } catch {
        fallos.push(archivo.name);
      }
    }
    if (fallos.length) setError(`No se pudieron subir: ${fallos.join(", ")}. Prueba con otra foto o revisa tu internet.`);
    setEstado(null);
    setArchivos([]);
    router.refresh();
  }

  return (
    <div className="rounded-[20px] border-2 border-dashed border-teja/40 bg-crema p-4">
      <label className="text-sm font-bold">
        Agregar fotos <span className="font-semibold text-suave">(hasta {MAX_POR_VEZ} a la vez)</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={estado !== null}
          onChange={(e) => {
            const lista = Array.from(e.target.files ?? []).filter(esImagen);
            setError(lista.length > MAX_POR_VEZ ? `Tomamos las primeras ${MAX_POR_VEZ}.` : null);
            setArchivos(lista.slice(0, MAX_POR_VEZ));
          }}
          className="mt-1 block w-full text-sm font-semibold file:mr-3 file:rounded-full file:border-0 file:bg-teja file:px-4 file:py-2 file:font-extrabold file:text-white"
        />
      </label>
      {archivos.length > 0 && (
        <button
          type="button"
          onClick={subir}
          disabled={estado !== null}
          className="boton-goma mt-3 rounded-full bg-teja px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {estado ?? `Subir ${archivos.length === 1 ? "1 foto" : `${archivos.length} fotos`}`}
        </button>
      )}
      {error && <p className="mt-2 text-sm font-bold text-teja-oscura" role="alert">{error}</p>}
    </div>
  );
}
