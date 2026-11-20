"use client";

import { useRef } from "react";

/**
 * Botón de envío que pide confirmación antes de una acción que no se deshace fácil. La pregunta
 * sale en una tarjeta propia (un <dialog> del navegador: se cierra con Esc y no deja tocar lo de
 * atrás) en vez de la alerta gris del navegador.
 */
export function BotonConfirmar({
  pregunta,
  className,
  children,
  textoConfirmar,
}: {
  pregunta: string;
  className?: string;
  children: React.ReactNode;
  /** Texto del botón que confirma. Si no se da, «Sí, borrar», «Sí, quitar»… según el botón. */
  textoConfirmar?: string;
}) {
  const boton = useRef<HTMLButtonElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const confirmar = textoConfirmar ?? (typeof children === "string" ? `Sí, ${children.toLowerCase()}` : "Sí, continuar");

  return (
    <>
      <button type="button" ref={boton} className={className} onClick={() => dialogo.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialogo}
        // Tocar fuera de la tarjeta la cierra, como «No, volver».
        onClick={(e) => e.target === dialogo.current && dialogo.current.close()}
        className="m-auto w-[min(92vw,420px)] rounded-[24px] border-[3px] border-teja bg-white p-0 text-tinta shadow-[0_12px_0_var(--teja)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6">
          <p className="text-3xl" aria-hidden>⚠️</p>
          <p className="mt-2 font-titulo text-xl font-extrabold leading-snug">{pregunta}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {/* El foco empieza en «No, volver»: un Enter distraído no borra nada. */}
            <button
              type="button"
              autoFocus
              onClick={() => dialogo.current?.close()}
              className="rounded-full border-2 border-black/10 px-5 py-2.5 text-sm font-extrabold hover:border-black/30"
            >
              No, volver
            </button>
            <button
              type="button"
              onClick={() => {
                dialogo.current?.close();
                boton.current?.form?.requestSubmit();
              }}
              className="boton-goma rounded-full bg-teja px-5 py-2.5 text-sm font-extrabold text-white"
            >
              {confirmar}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
