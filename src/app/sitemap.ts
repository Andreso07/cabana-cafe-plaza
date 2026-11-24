import type { MetadataRoute } from "next";
import { leerConfig } from "@/lib/config";
import { URL_SITIO } from "@/lib/sitio";

// Se arma en cada visita (no al compilar): depende de lo que diga el panel.
export const dynamic = "force-dynamic";

/** Mapa de la web para Google: las páginas públicas («Qué hacer cerca» solo si tiene planes). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const conPlanes = await leerConfig()
    .then((c) => c.queHacer.length > 0)
    .catch(() => true);
  const pagina = (ruta: string, prioridad: number, frecuencia: "daily" | "weekly" | "monthly") => ({
    url: `${URL_SITIO}${ruta}`,
    changeFrequency: frecuencia,
    priority: prioridad,
  });
  return [
    pagina("/", 1, "daily"),
    ...(conPlanes ? [pagina("/que-hacer-cerca", 0.7, "monthly")] : []),
    pagina("/fotos", 0.5, "weekly"),
    pagina("/resena", 0.5, "weekly"),
    pagina("/condiciones", 0.3, "monthly"),
    pagina("/privacidad", 0.3, "monthly"),
  ];
}
