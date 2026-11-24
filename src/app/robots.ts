import type { MetadataRoute } from "next";
import { esDemo } from "@/lib/demo";
import { URL_SITIO } from "@/lib/sitio";

export const dynamic = "force-dynamic";

/**
 * Qué pueden recorrer los buscadores. El panel, las páginas de cada reserva (llevan datos del
 * cliente) y la API quedan fuera. Ojo: esto es una petición a los buscadores, no una protección;
 * lo que protege el panel es la sesión.
 * La web de demostración no se deja recorrer: no es una cabaña de verdad y no debe salir en Google.
 */
export default function robots(): MetadataRoute.Robots {
  if (esDemo()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/reserva/", "/api/"] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
