// Fotos que comparten los huéspedes (tabla `fotos_huespedes`, db/schema.sql). Se guardan en la base
// ya reducidas por el navegador; aquí solo se comprueba que de verdad sean JPEG y de un tamaño sensato.
import { db } from "./db";

export type EstadoFoto = "pendiente" | "aprobada" | "oculta";

export type Foto = {
  id: string;
  nombre: string;
  comentario: string | null;
  estado: EstadoFoto;
  ancho: number;
  alto: number;
  /** Peso de la foto grande, en bytes. */
  peso: number;
  creadaEn: string;
};

type Fila = Omit<Foto, "creadaEn"> & { creada_en: Date };

const aFoto = (f: Fila): Foto => ({
  id: f.id,
  nombre: f.nombre,
  comentario: f.comentario,
  estado: f.estado,
  ancho: f.ancho,
  alto: f.alto,
  peso: f.peso,
  creadaEn: f.creada_en.toISOString(),
});

// Límites de lo que se acepta. El navegador manda 1600 px y unos 300 KB; esto deja margen.
export const MAX_LADO = 2000;
export const MAX_BYTES_FOTO = 2_500_000;
export const MAX_BYTES_MINI = 400_000;
/** Si hay tantas sin revisar, no se reciben más: frena a quien quiera llenar la base. */
export const MAX_PENDIENTES = 150;

/**
 * Ancho y alto de un JPEG, leídos de su cabecera (marcador SOF). Devuelve null si los bytes no son
 * un JPEG: así no se guarda un HTML, un SVG o cualquier otra cosa disfrazada de foto.
 */
export function medidasJpeg(b: Uint8Array): { ancho: number; alto: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xff) {
      i++; // relleno
      continue;
    }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    const largo = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const alto = (b[i + 5] << 8) | b[i + 6];
      const ancho = (b[i + 7] << 8) | b[i + 8];
      return ancho > 0 && alto > 0 ? { ancho, alto } : null;
    }
    if (largo < 2) return null;
    i += 2 + largo;
  }
  return null;
}

export class DemasiadasPendientes extends Error {}

export async function crearFoto(d: {
  nombre: string;
  comentario: string | null;
  imagen: Buffer;
  miniatura: Buffer;
  ancho: number;
  alto: number;
}): Promise<void> {
  // El límite se cuenta en la misma sentencia que inserta: dos subidas a la vez no lo saltan por mucho.
  const filas = await db()`
    insert into fotos_huespedes (nombre, comentario, imagen, miniatura, ancho, alto)
    select ${d.nombre}, ${d.comentario}, ${d.imagen}, ${d.miniatura}, ${d.ancho}, ${d.alto}
     where (select count(*) from fotos_huespedes where estado = 'pendiente') < ${MAX_PENDIENTES}
    returning id`;
  if (filas.length === 0) throw new DemasiadasPendientes();
}

const COLUMNAS = `id::text as id, nombre, comentario, estado, ancho, alto, octet_length(imagen)::int as peso, creada_en`;

/** Las aprobadas más recientes, para la galería de la portada. */
export async function fotosPublicas(limite = 8): Promise<Foto[]> {
  const filas = await db().unsafe<Fila[]>(
    `select ${COLUMNAS} from fotos_huespedes where estado = 'aprobada' order by creada_en desc limit $1`,
    [limite],
  );
  return filas.map(aFoto);
}

/** Para el panel: todas, las pendientes primero. Sin las imágenes (se piden aparte). */
export async function listarFotos(): Promise<Foto[]> {
  const filas = await db().unsafe<Fila[]>(
    `select ${COLUMNAS} from fotos_huespedes order by (estado = 'pendiente') desc, creada_en desc limit 300`,
  );
  return filas.map(aFoto);
}

/** Los bytes de una foto (grande o miniatura) y su estado, para decidir quién puede verla. */
export async function leerImagen(id: string, mini: boolean): Promise<{ bytes: Buffer; estado: EstadoFoto } | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const [f] = await db().unsafe<{ bytes: Buffer; estado: EstadoFoto }[]>(
    `select ${mini ? "miniatura" : "imagen"} as bytes, estado from fotos_huespedes where id = $1`,
    [id],
  );
  return f ?? null;
}

export async function cambiarEstadoFoto(id: string, estado: EstadoFoto): Promise<void> {
  if (!/^\d{1,18}$/.test(id)) return;
  await db()`update fotos_huespedes set estado = ${estado} where id = ${id}`;
}

export async function borrarFoto(id: string): Promise<void> {
  if (!/^\d{1,18}$/.test(id)) return;
  await db()`delete from fotos_huespedes where id = ${id}`;
}
