/**
 * Dirección pública de la web, para los enlaces absolutos (vista previa en WhatsApp y Facebook,
 * sitemap). En Vercel sale sola de su dominio de producción, así que si un día se compra un
 * dominio propio y se marca como principal, todo pasa a usarlo sin tocar código.
 */
export const URL_SITIO = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
