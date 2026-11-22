import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/**
 * Qué pueden recorrer los buscadores. El panel, las páginas de cada reserva (llevan datos del
 * cliente) y la API quedan fuera. Ojo: esto es una petición a los buscadores, no una protección;
 * lo que protege el panel es la sesión.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/reserva/", "/api/"] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
