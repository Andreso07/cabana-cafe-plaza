// Imágenes de la marca (logo, banner, vista previa) que se cambian desde el panel.
import { cache } from "react";
import { db } from "./db";

export const CLAVES = ["logo", "banner", "banner-m", "og"] as const;
export type ClaveImagen = (typeof CLAVES)[number];

/** Lo que usa la web si el dueño no ha subido nada (archivos de public/). */
export const POR_DEFECTO: Record<ClaveImagen, string> = {
  logo: "/logo.svg",
  banner: "/cabana.jpg",
  "banner-m": "/cabana.jpg",
  og: "/vista-previa.jpg",
};

/** Límites de cada una (ya llegan reducidas desde el navegador). */
export const LIMITES: Record<ClaveImagen, { bytes: number; lado: number; tipos: string[] }> = {
  logo: { bytes: 400_000, lado: 1024, tipos: ["image/png", "image/jpeg"] },
  banner: { bytes: 1_500_000, lado: 2400, tipos: ["image/jpeg"] },
  "banner-m": { bytes: 600_000, lado: 1400, tipos: ["image/jpeg"] },
  og: { bytes: 600_000, lado: 1300, tipos: ["image/jpeg"] },
};

export const esClave = (c: string): c is ClaveImagen => (CLAVES as readonly string[]).includes(c);

/** Medidas de un PNG o JPEG leyendo su cabecera, o null si no es ninguno de los dos. */
export function medidasImagen(b: Buffer): { tipo: "image/png" | "image/jpeg"; ancho: number; alto: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { tipo: "image/png", ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marca = b[i + 1];
      const largo = b.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
        return { tipo: "image/jpeg", alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
      }
      i += 2 + largo;
    }
  }
  return null;
}

/**
 * Dirección de cada imagen para la página: la subida (con su versión, para que el navegador no
 * muestre una vieja guardada) o la de public/. Se lee una vez por petición.
 */
export const direccionesImagenes = cache(async (): Promise<Record<ClaveImagen, string>> => {
  const salida = { ...POR_DEFECTO };
  try {
    const filas = await db()<{ clave: ClaveImagen; v: string }[]>`
      select clave, (extract(epoch from actualizado_en) * 1000)::bigint::text as v from imagenes_sitio`;
    for (const f of filas) salida[f.clave] = `/api/sitio/${f.clave}?v=${f.v}`;
  } catch {
    // Sin base (o sin la tabla todavía): la web sigue con sus imágenes de siempre.
  }
  return salida;
});

export async function leerImagenSitio(clave: ClaveImagen) {
  const [f] = await db()<{ tipo: string; imagen: Buffer }[]>`select tipo, imagen from imagenes_sitio where clave = ${clave}`;
  return f ?? null;
}

export async function guardarImagenSitio(clave: ClaveImagen, tipo: string, imagen: Buffer, ancho: number, alto: number) {
  await db()`
    insert into imagenes_sitio (clave, tipo, imagen, ancho, alto, actualizado_en)
    values (${clave}, ${tipo}, ${imagen}, ${ancho}, ${alto}, now())
    on conflict (clave) do update set tipo = excluded.tipo, imagen = excluded.imagen,
      ancho = excluded.ancho, alto = excluded.alto, actualizado_en = now()`;
}

export async function borrarImagenSitio(clave: ClaveImagen) {
  await db()`delete from imagenes_sitio where clave = ${clave}`;
}
