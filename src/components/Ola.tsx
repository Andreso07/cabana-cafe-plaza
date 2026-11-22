/**
 * Borde ondulado entre dos secciones de distinto color, como el perfil de las montañas. `fondo` es el
 * color de la sección que queda detrás y `color` el de la que empieza (o termina, si va `abajo`).
 */
export function Ola({ fondo, color, abajo = false }: { fondo: string; color: string; abajo?: boolean }) {
  return (
    <div className={fondo} aria-hidden>
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        className={`block h-6 w-full md:h-10 ${color} ${abajo ? "rotate-180" : ""}`}
        fill="currentColor"
      >
        <path d="M0,48 C240,4 480,0 720,22 C960,44 1200,46 1440,10 L1440,48 Z" />
      </svg>
    </div>
  );
}
