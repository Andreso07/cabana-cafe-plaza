// Fotos de la cabaña que sube el dueño (tabla `fotos_cabana`, db/schema.sql). Salen en la galería
// de la portada en el orden que él elija. A diferencia de las de huéspedes, no se aprueban.
import { db } from "./db";

export type FotoCabana = {
  id: string;
  descripcion: string | null;
  ancho: number;
  alto: number;
};

/** Máximo de fotos guardadas: la base gratis de Supabase es de 500 MB para todo. */
export const MAX_FOTOS_CABANA = 40;

const valido = (id: string) => /^\d{1,18}$/.test(id);

export async function listarFotosCabana(): Promise<FotoCabana[]> {
  return db()<FotoCabana[]>`
    select id::text as id, descripcion, ancho, alto from fotos_cabana order by orden, id`;
}

export class DemasiadasFotos extends Error {}

/** Agrega la foto al final de la galería. El tope se mira en la misma sentencia que inserta. */
export async function crearFotoCabana(d: {
  descripcion: string | null;
  imagen: Buffer;
  miniatura: Buffer;
  ancho: number;
  alto: number;
}): Promise<void> {
  const filas = await db()`
    insert into fotos_cabana (descripcion, orden, imagen, miniatura, ancho, alto)
    select ${d.descripcion}, coalesce((select max(orden) from fotos_cabana), 0) + 1,
           ${d.imagen}, ${d.miniatura}, ${d.ancho}, ${d.alto}
     where (select count(*) from fotos_cabana) < ${MAX_FOTOS_CABANA}
    returning id`;
  if (filas.length === 0) throw new DemasiadasFotos();
}

export async function leerImagenCabana(id: string, mini: boolean): Promise<Buffer | null> {
  if (!valido(id)) return null;
  const [f] = await db().unsafe<{ bytes: Buffer }[]>(
    `select ${mini ? "miniatura" : "imagen"} as bytes from fotos_cabana where id = $1`,
    [id],
  );
  return f?.bytes ?? null;
}

/** Cambia de puesto con la foto de al lado (antes o después). */
export async function moverFotoCabana(id: string, hacia: "antes" | "despues"): Promise<void> {
  if (!valido(id)) return;
  await db().begin(async (tx) => {
    const [yo] = await tx<{ orden: number }[]>`select orden from fotos_cabana where id = ${id} for update`;
    if (!yo) return;
    const [otra] = hacia === "antes"
      ? await tx<{ id: string; orden: number }[]>`
          select id::text as id, orden from fotos_cabana where orden < ${yo.orden} order by orden desc limit 1 for update`
      : await tx<{ id: string; orden: number }[]>`
          select id::text as id, orden from fotos_cabana where orden > ${yo.orden} order by orden limit 1 for update`;
    if (!otra) return;
    await tx`update fotos_cabana set orden = ${otra.orden} where id = ${id}`;
    await tx`update fotos_cabana set orden = ${yo.orden} where id = ${otra.id}`;
  });
}

export async function describirFotoCabana(id: string, descripcion: string | null): Promise<void> {
  if (!valido(id)) return;
  await db()`update fotos_cabana set descripcion = ${descripcion} where id = ${id}`;
}

export async function borrarFotoCabana(id: string): Promise<void> {
  if (!valido(id)) return;
  await db()`delete from fotos_cabana where id = ${id}`;
}
