"use client";

import Link from "next/link";
import { useState } from "react";

const campo =
  "mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold outline-none focus:border-teja focus:bg-white";

const TEXTOS = ["", "Mala", "Regular", "Buena", "Muy buena", "¡Excelente!"];

export function FormularioResena() {
  const [estrellas, setEstrellas] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!estrellas) {
      setError("Elige cuántas estrellas le das.");
      return;
    }
    setEnviando(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: f.get("nombre"),
          calificacion: estrellas,
          comentario: f.get("comentario"),
          codigo: f.get("codigo"),
          acepta: f.get("acepta") === "on",
          web: f.get("web"),
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(json.error ?? "No se pudo enviar. Intenta de nuevo.");
        return;
      }
      setListo(true);
    } catch {
      setError("No hay conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="rounded-[20px] bg-libre text-libre-texto p-5 text-center font-bold">
        <p className="text-3xl" aria-hidden>🙏</p>
        <p className="mt-2 text-lg">¡Gracias por tu reseña!</p>
        <p className="text-sm font-semibold">La publicaremos en la web después de revisarla.</p>
      </div>
    );
  }

  return (
    // method="post": si alguien envía antes de que la página termine de cargar, el navegador no
    // pone el nombre y el comentario en la dirección (con GET quedarían en el historial).
    <form onSubmit={enviar} method="post" className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-bold">¿Cómo estuvo tu estadía?</p>
        <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              onClick={() => setEstrellas(n)}
              className={`text-4xl leading-none transition-transform hover:scale-110 ${n <= estrellas ? "text-sol" : "text-black/15"}`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm font-extrabold text-suave">{TEXTOS[estrellas]}</span>
        </div>
      </div>
      <label className="text-sm font-bold">
        Tu nombre
        <input name="nombre" required minLength={2} maxLength={60} autoComplete="given-name" className={campo} />
        <span className="block text-xs font-semibold text-suave mt-1">Se publica solo tu nombre y la inicial del apellido.</span>
      </label>
      <label className="text-sm font-bold">
        Cuéntanos tu experiencia
        <textarea name="comentario" required minLength={5} maxLength={600} rows={4} className={campo} />
      </label>
      <label className="text-sm font-bold">
        Código de reserva <span className="font-semibold text-suave">(opcional)</span>
        <input name="codigo" maxLength={20} placeholder="CP-…" className={`${campo} uppercase`} />
      </label>
      {/* Campo trampa para robots: oculto para las personas. */}
      <input name="web" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="text-xs text-suave flex gap-2 items-start">
        <input type="checkbox" name="acepta" required className="mt-0.5 accent-teja" />
        <span>
          Autorizo que publiquen mi reseña con mi nombre según la{" "}
          <Link href="/privacidad" target="_blank" className="underline">política de datos</Link>.
        </span>
      </label>
      {error && <p className="text-sm text-teja-oscura font-bold" role="alert">{error}</p>}
      <button
        disabled={enviando}
        className="boton-goma font-titulo rounded-full bg-teja text-white font-extrabold text-base py-3.5 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar reseña"}
      </button>
    </form>
  );
}
