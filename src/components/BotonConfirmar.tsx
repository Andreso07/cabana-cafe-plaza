"use client";

/** Botón de envío que pide confirmación antes de una acción que no se deshace fácil. */
export function BotonConfirmar({
  pregunta,
  className,
  children,
}: {
  pregunta: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(pregunta)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
