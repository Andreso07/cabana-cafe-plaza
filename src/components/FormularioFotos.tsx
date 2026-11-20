"use client";

import Link from "next/link";
import { useState } from "react";
import { esImagen, reducirImagen } from "@/lib/reducirImagen";

const campo =
  "mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold outline-none focus:border-teja focus:bg-white";

const MAX_FOTOS = 5;

export function FormularioFotos({ nombreCabana }: { nombreCabana: string }) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subidas, setSubidas] = useState<number | null>(null);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []).filter(esImagen);
    setError(lista.length > MAX_FOTOS ? `Puedes enviar hasta ${MAX_FOTOS} fotos a la vez. Tomamos las primeras ${MAX_FOTOS}.` : null);
    setArchivos(lista.slice(0, MAX_FOTOS));
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (archivos.length === 0) {
      setError("Elige al menos una foto.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setError(null);
    let ok = 0;
    const fallos: string[] = [];
    for (const [i, archivo] of archivos.entries()) {
      setEnviando(`Subiendo foto ${i + 1} de ${archivos.length}…`);
      try {
        const [imagen, miniatura] = await Promise.all([reducirImagen(archivo, 1600, 0.82), reducirImagen(archivo, 480, 0.75)]);
        const datos = new FormData();
        datos.set("nombre", String(f.get("nombre") ?? ""));
        datos.set("comentario", String(f.get("comentario") ?? ""));
        datos.set("acepta", f.get("acepta") === "on" ? "si" : "no");
        datos.set("web", String(f.get("web") ?? ""));
        datos.set("imagen", imagen, "foto.jpg");
        datos.set("miniatura", miniatura, "mini.jpg");
        const r = await fetch("/api/fotos", { method: "POST", body: datos });
        if (r.ok) {
          ok++;
          continue;
        }
        const json = await r.json().catch(() => ({}));
        // Un error del formulario (nombre, autorización) o un bloqueo vale para todas: se para aquí.
        if ((r.status === 400 && !String(json.error).startsWith("No pudimos leer")) || r.status === 429 || r.status === 503) {
          setError(json.error ?? "No se pudo enviar. Intenta de nuevo.");
          break;
        }
        fallos.push(archivo.name);
      } catch {
        // createImageBitmap no entiende el formato (p. ej. HEIC en un navegador que no lo lee) o no hay red.
        fallos.push(archivo.name);
      }
    }
    setEnviando(null);
    if (fallos.length) {
      setError(`No pudimos enviar ${fallos.length === 1 ? "esta foto" : "estas fotos"}: ${fallos.join(", ")}. Prueba con otra o revisa tu internet.`);
    }
    if (ok > 0) {
      setSubidas(ok);
      setArchivos([]);
    }
  }

  if (subidas !== null) {
    return (
      <div className="rounded-[20px] bg-libre text-libre-texto p-5 text-center font-bold">
        <p className="text-3xl" aria-hidden>📸</p>
        <p className="mt-2 text-lg">¡Gracias! Recibimos {subidas === 1 ? "tu foto" : `tus ${subidas} fotos`}.</p>
        <p className="text-sm font-semibold">Las publicaremos en la web después de revisarlas.</p>
        {error && <p className="mt-2 text-sm text-teja-oscura" role="alert">{error}</p>}
        <button type="button" onClick={() => { setSubidas(null); setError(null); }} className="mt-3 text-sm underline">
          Enviar más fotos
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} method="post" className="flex flex-col gap-3">
      <label className="text-sm font-bold">
        Tus fotos <span className="font-semibold text-suave">(hasta {MAX_FOTOS})</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={elegir}
          className="mt-1 block w-full text-sm font-semibold file:mr-3 file:rounded-full file:border-0 file:bg-teja file:px-4 file:py-2 file:font-extrabold file:text-white"
        />
      </label>
      {archivos.length > 0 && (
        <p className="text-xs font-bold text-suave">
          {archivos.length === 1 ? "1 foto elegida" : `${archivos.length} fotos elegidas`}
        </p>
      )}
      <label className="text-sm font-bold">
        Tu nombre
        <input name="nombre" required minLength={2} maxLength={60} autoComplete="given-name" className={campo} />
        <span className="block text-xs font-semibold text-suave mt-1">Se publica solo tu nombre y la inicial del apellido.</span>
      </label>
      <label className="text-sm font-bold">
        Un comentario <span className="font-semibold text-suave">(opcional)</span>
        <input name="comentario" maxLength={200} placeholder="El amanecer desde la terraza ☕" className={campo} />
      </label>
      {/* Campo trampa para robots: oculto para las personas. */}
      <input name="web" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="text-xs text-suave flex gap-2 items-start">
        <input type="checkbox" name="acepta" required className="mt-0.5 accent-teja" />
        <span>
          Autorizo a {nombreCabana} a publicar estas fotos con mi nombre en su web y sus redes sociales. Confirmo que las
          tomé yo y que las personas que aparecen están de acuerdo. Ver la{" "}
          <Link href="/privacidad" target="_blank" className="underline">política de datos</Link>.
        </span>
      </label>
      {error && <p className="text-sm text-teja-oscura font-bold" role="alert">{error}</p>}
      <button
        disabled={enviando !== null}
        className="boton-goma font-titulo rounded-full bg-teja text-white font-extrabold text-base py-3.5 disabled:opacity-60"
      >
        {enviando ?? "Enviar fotos"}
      </button>
    </form>
  );
}
