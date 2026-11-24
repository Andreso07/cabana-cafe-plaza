import type { Config } from "@/config/cabana";
import { coordenadasDe } from "./mapa";
import { URL_SITIO } from "./sitio";

/**
 * Ficha del alojamiento para Google (schema.org, formato JSON-LD). No se ve en la página: la leen
 * los buscadores para entender qué es, dónde está, cuánto cuesta y cómo lo califican, y con eso
 * pueden mostrarla con estrellas y precio. Todo sale de la configuración del panel y de las
 * reseñas aprobadas: nada se inventa (Google castiga las calificaciones falsas).
 */
export function fichaDelAlojamiento(
  cfg: Config,
  opiniones: { promedio: number | null; total: number },
  img: { logo: string; og: string } = { logo: "/logo.svg", og: "/vista-previa.jpg" },
) {
  const coords = coordenadasDe(cfg.mapsUrl);
  const precios = [...Object.values(cfg.precios), ...Object.values(cfg.preciosGrupo)].filter((p) => p > 0);
  const pesos = (n: number) => `$${n.toLocaleString("es-CO")}`;
  const redes = Object.values(cfg.redes).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${URL_SITIO}/#alojamiento`,
    name: cfg.nombre,
    description: `${cfg.heroSubtitulo} Cabaña completa para hasta ${cfg.capacidad} personas en ${cfg.vereda}, ${cfg.municipio}, ${cfg.departamento}.`,
    url: `${URL_SITIO}/`,
    image: `${URL_SITIO}${img.og}`,
    logo: `${URL_SITIO}${img.logo}`,
    telephone: `+${cfg.whatsapp}`,
    priceRange: precios.length ? `${pesos(Math.min(...precios))} - ${pesos(Math.max(...precios))} COP por noche` : undefined,
    currenciesAccepted: "COP",
    checkinTime: cfg.checkIn,
    checkoutTime: cfg.checkOut,
    petsAllowed: cfg.servicios.some((s) => /mascota|pet/i.test(`${s.titulo} ${s.detalle}`)) || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: cfg.comoLlegar,
      addressLocality: cfg.municipio,
      addressRegion: cfg.departamento,
      addressCountry: "CO",
    },
    geo: coords ? { "@type": "GeoCoordinates", latitude: coords.lat, longitude: coords.lng } : undefined,
    hasMap: cfg.mapsUrl,
    amenityFeature: cfg.servicios.map((s) => ({ "@type": "LocationFeatureSpecification", name: s.titulo, value: true })),
    sameAs: redes.length ? redes : undefined,
    aggregateRating:
      opiniones.promedio !== null && opiniones.total > 0
        ? { "@type": "AggregateRating", ratingValue: opiniones.promedio, reviewCount: opiniones.total, bestRating: 5, worstRating: 1 }
        : undefined,
  };
}

/** Para meterla en un <script>: JSON sin «</» que pudiera cerrar la etiqueta antes de tiempo. */
export function comoScript(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
