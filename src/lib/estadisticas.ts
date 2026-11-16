// Cifras para las gráficas del panel. Todo se agrega en la base (una fila por día o por mes),
// nunca se traen las reservas una por una.
import { db } from "./db";

export type PuntoDia = { dia: string; visitas: number };
export type PuntoMes = {
  mes: string; // AAAA-MM
  visitas: number;
  reservas: number; // confirmadas que llegan ese mes
  ingresos: number; // total de esas reservas
  noches: number; // noches confirmadas dentro del mes
  dias: number; // días del mes
  futuro: boolean; // mes que aún no empieza
};
export type PuntoSemana = { dia: number; noches: number }; // 0 = domingo

/** Visitas de los últimos `n` días (hoy incluido), con los días sin visitas en 0. */
export async function visitasPorDia(n = 30): Promise<PuntoDia[]> {
  const sql = db();
  return sql<PuntoDia[]>`
    with hoy as (select (now() at time zone 'America/Bogota')::date as d)
    select g::date::text as dia, coalesce(v.total, 0)::int as visitas
      from hoy, generate_series(hoy.d - ${n - 1}::int, hoy.d, interval '1 day') g
      left join visitas v on v.dia = g::date
     order by 1`;
}

/** Los últimos 12 meses y los 3 siguientes (para ver lo que ya está reservado a futuro). */
export async function cifrasPorMes(): Promise<PuntoMes[]> {
  const sql = db();
  return sql<PuntoMes[]>`
    with hoy as (select date_trunc('month', (now() at time zone 'America/Bogota'))::date as m),
    meses as (
      select g::date as ini, (g + interval '1 month')::date as fin
        from hoy, generate_series(hoy.m - interval '11 months', hoy.m + interval '3 months', interval '1 month') g
    )
    select to_char(m.ini, 'YYYY-MM') as mes,
           coalesce((select sum(total) from visitas v where v.dia >= m.ini and v.dia < m.fin), 0)::int as visitas,
           (select count(*) from reservas r where r.estado = 'confirmada' and r.entrada >= m.ini and r.entrada < m.fin)::int as reservas,
           coalesce((select sum(r.total) from reservas r where r.estado = 'confirmada' and r.entrada >= m.ini and r.entrada < m.fin), 0)::int as ingresos,
           (select count(*) from reservas r,
                   generate_series(greatest(r.entrada, m.ini), least(r.salida, m.fin) - 1, interval '1 day') d
             where r.estado = 'confirmada' and r.entrada < m.fin and r.salida > m.ini)::int as noches,
           (m.fin - m.ini)::int as dias,
           m.ini > (select m from hoy) as futuro
      from meses m
     order by m.ini`;
}

/** Noches confirmadas de los últimos 12 meses (y lo ya reservado a futuro), por día de la semana. */
export async function nochesPorDiaSemana(): Promise<PuntoSemana[]> {
  const sql = db();
  return sql<PuntoSemana[]>`
    select d.dia, coalesce(n.noches, 0)::int as noches
      from generate_series(0, 6) d(dia)
      left join (
        select extract(dow from g)::int as dia, count(*) as noches
          from reservas r, generate_series(r.entrada, r.salida - 1, interval '1 day') g
         where r.estado = 'confirmada' and r.salida > current_date - 365
         group by 1
      ) n on n.dia = d.dia
     order by d.dia`;
}

/** Reservas hechas en la web (de cualquier estado) en los últimos 30 días, para la conversión. */
export async function reservasCreadas30(): Promise<number> {
  const sql = db();
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from reservas where creada_en > now() - interval '30 days'`;
  return r.n;
}
