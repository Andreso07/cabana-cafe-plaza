import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/** Mapa de la web para Google: las páginas públicas. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pagina = (ruta: string, prioridad: number, frecuencia: "daily" | "weekly" | "monthly") => ({
    url: `${URL_SITIO}${ruta}`,
    changeFrequency: frecuencia,
    priority: prioridad,
  });
  return [
    pagina("/", 1, "daily"),
    pagina("/fotos", 0.5, "weekly"),
    pagina("/resena", 0.5, "weekly"),
    pagina("/condiciones", 0.3, "monthly"),
    pagina("/privacidad", 0.3, "monthly"),
  ];
}
