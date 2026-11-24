/**
 * Paletas de color de la web. Cada una cambia los mismos colores de globals.css (teja = botones y
 * acentos, café = franjas y verdes, sol = amarillos, crema y arena = fondos), así que todo el diseño
 * cambia junto. Todas mantienen texto blanco legible sobre los botones y las franjas oscuras.
 * «cafetal» es la original y no cambia nada.
 */
export type Paleta = { id: string; nombre: string; vars: Record<string, string> };

export const PALETAS: Paleta[] = [
  {
    id: "cafetal",
    nombre: "Cafetal (original)",
    vars: { teja: "#c8502f", "teja-oscura": "#8e3318", cafe: "#3f6b3a", "cafe-oscuro": "#2b4a28", sol: "#f5b63f", crema: "#fffbf5", arena: "#f6ead7", linea: "#ece3d6", tinta: "#3b2a20", suave: "#7a6a5e" },
  },
  {
    id: "montana",
    nombre: "Montaña azul",
    vars: { teja: "#c9541f", "teja-oscura": "#8a3610", cafe: "#2f5d7c", "cafe-oscuro": "#1f3f57", sol: "#f2b33d", crema: "#f7f9fb", arena: "#e7eef4", linea: "#dfe7ee", tinta: "#1f2a33", suave: "#5f6b76" },
  },
  {
    id: "bosque",
    nombre: "Bosque",
    vars: { teja: "#a8572a", "teja-oscura": "#6e3517", cafe: "#2e5e4e", "cafe-oscuro": "#1d3d33", sol: "#e0b23a", crema: "#fbfaf5", arena: "#eef0e4", linea: "#e4e6d8", tinta: "#26302b", suave: "#66706a" },
  },
  {
    id: "atardecer",
    nombre: "Atardecer",
    vars: { teja: "#c93d52", "teja-oscura": "#8f2537", cafe: "#6a4c93", "cafe-oscuro": "#45306a", sol: "#f6b94a", crema: "#fff9f6", arena: "#f6e9f0", linea: "#efe0e6", tinta: "#3a2a36", suave: "#7c6a76" },
  },
  {
    id: "mar",
    nombre: "Mar y coral",
    vars: { teja: "#d8573a", "teja-oscura": "#9a3a22", cafe: "#22707a", "cafe-oscuro": "#144a51", sol: "#f4c95d", crema: "#fbfdfc", arena: "#e5f1f0", linea: "#dcebea", tinta: "#1d3133", suave: "#5e7273" },
  },
];

export const paletaDe = (id: string) => PALETAS.find((p) => p.id === id) ?? PALETAS[0];

/** Estilo para la etiqueta <html>: redefine los colores. La original no necesita nada. */
export function estiloPaleta(id: string): Record<string, string> | undefined {
  const p = paletaDe(id);
  if (p.id === "cafetal") return undefined;
  return Object.fromEntries(Object.entries(p.vars).map(([k, v]) => [`--${k}`, v]));
}
