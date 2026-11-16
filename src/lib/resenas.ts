// Reseñas de los huéspedes y contador de visitas (tablas `resenas` y `visitas`, db/schema.sql).
import { db } from "./db";

export type EstadoResena = "pendiente" | "aprobada" | "oculta";

export type Resena = {
  id: string;
  nombre: string;
  calificacion: number;
  comentario: string;
  codigo: string | null;
  estado: EstadoResena;
  creadaEn: string;
};

type Fila = {
  id: string;
  nombre: string;
  calificacion: number;
  comentario: string;
  codigo: string | null;
  estado: EstadoResena;
  creada_en: Date;
};

const aResena = (f: Fila): Resena => ({
  id: f.id,
  nombre: f.nombre,
  calificacion: f.calificacion,
  comentario: f.comentario,
  codigo: f.codigo,
  estado: f.estado,
  creadaEn: f.creada_en.toISOString(),
});

/** Cómo se muestra el nombre en público: el primero y la inicial del segundo («Laura G.»). */
export function nombrePublico(nombre: string): string {
  const [uno, dos] = nombre.trim().split(/\s+/);
  return dos ? `${uno} ${dos[0].toUpperCase()}.` : uno;
}

export async function crearResena(d: { nombre: string; calificacion: number; comentario: string; codigo: string | null }) {
  const sql = db();
  await sql`
    insert into resenas (nombre, calificacion, comentario, codigo)
    values (${d.nombre}, ${d.calificacion}, ${d.comentario}, ${d.codigo})`;
}

/** Las aprobadas más recientes y el promedio de todas las aprobadas. */
export async function resenasPublicas(limite = 6): Promise<{ resenas: Resena[]; promedio: number | null; total: number }> {
  const sql = db();
  const [filas, [cifras]] = await Promise.all([
    sql<Fila[]>`
      select id::text as id, nombre, calificacion, comentario, codigo, estado, creada_en
        from resenas where estado = 'aprobada'
       order by creada_en desc limit ${limite}`,
    sql<{ promedio: number | null; total: number }[]>`
      select round(avg(calificacion)::numeric, 1)::float as promedio, count(*)::int as total
        from resenas where estado = 'aprobada'`,
  ]);
  return { resenas: filas.map(aResena), promedio: cifras.promedio, total: cifras.total };
}

/** Para el panel: todas, las pendientes primero. */
export async function listarResenas(): Promise<Resena[]> {
  const sql = db();
  const filas = await sql<Fila[]>`
    select id::text as id, nombre, calificacion, comentario, codigo, estado, creada_en
      from resenas
     order by (estado = 'pendiente') desc, creada_en desc
     limit 200`;
  return filas.map(aResena);
}

export async function cambiarEstadoResena(id: string, estado: EstadoResena): Promise<void> {
  if (!/^\d+$/.test(id)) return;
  const sql = db();
  await sql`update resenas set estado = ${estado} where id = ${id}`;
}

export async function borrarResena(id: string): Promise<void> {
  if (!/^\d+$/.test(id)) return;
  const sql = db();
  await sql`delete from resenas where id = ${id}`;
}

// ---------- Visitas ----------

/** Suma una visita al día de hoy en Colombia. Una sola escritura atómica: no se pierden visitas simultáneas. */
export async function sumarVisita(): Promise<void> {
  const sql = db();
  await sql`
    insert into visitas (dia, total) values ((now() at time zone 'America/Bogota')::date, 1)
    on conflict (dia) do update set total = visitas.total + 1`;
}

export async function cifrasVisitas(): Promise<{ total: number; hoy: number; mes: number }> {
  const sql = db();
  const [c] = await sql<{ total: number; hoy: number; mes: number }[]>`
    with hoy as (select (now() at time zone 'America/Bogota')::date as d)
    select coalesce(sum(total), 0)::int as total,
           coalesce(sum(total) filter (where dia = (select d from hoy)), 0)::int as hoy,
           coalesce(sum(total) filter (where dia >= date_trunc('month', (select d from hoy))), 0)::int as mes
      from visitas`;
  return c;
}
