// Íconos de las redes sociales configuradas en el panel. Las vacías no se muestran.
import type { Config } from "@/config/cabana";

const ICONOS = {
  facebook: {
    nombre: "Facebook",
    color: "#1877F2",
    d: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z",
  },
  instagram: {
    nombre: "Instagram",
    color: "#E1306C",
    d: "M12 2.2c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s0-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 4.86a4.94 4.94 0 1 0 0 9.88 4.94 4.94 0 0 0 0-9.88Zm0 8.15a3.21 3.21 0 1 1 0-6.42 3.21 3.21 0 0 1 0 6.42Zm5.14-9.5a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z",
  },
  tiktok: {
    nombre: "TikTok",
    color: "#111111",
    d: "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.59-2.6 2.6 2.6 0 0 1 3.38-2.48V9.66a5.73 5.73 0 0 0-.79-.05A5.68 5.68 0 0 0 4.18 15.3 5.68 5.68 0 0 0 9.86 21a5.68 5.68 0 0 0 5.68-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48Z",
  },
} as const;

export function Redes({ redes, grande = false }: { redes: Config["redes"]; grande?: boolean }) {
  const lista = (Object.keys(ICONOS) as (keyof typeof ICONOS)[]).filter((k) => redes[k]);
  if (lista.length === 0) return null;
  return (
    <span className="flex items-center gap-2">
      {lista.map((k) => (
        <a
          key={k}
          href={redes[k]}
          target="_blank"
          rel="noopener"
          aria-label={`${ICONOS[k].nombre} de la cabaña`}
          title={ICONOS[k].nombre}
          className={`grid place-items-center rounded-full bg-white border-2 border-black/5 hover:border-black/20 ${grande ? "size-12" : "size-9"}`}
        >
          <svg viewBox="0 0 24 24" className={grande ? "size-6" : "size-5"} fill={ICONOS[k].color} aria-hidden>
            <path d={ICONOS[k].d} />
          </svg>
        </a>
      ))}
    </span>
  );
}
