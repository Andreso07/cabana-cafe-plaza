-- Esquema de la base de reservas. En Supabase se pega en el SQL Editor y se ejecuta una vez.
-- Se puede volver a ejecutar sin romper nada.

create extension if not exists btree_gist;

create table if not exists reservas (
  codigo      text primary key,
  entrada     date not null,
  salida      date not null,
  huespedes   smallint not null check (huespedes between 1 and 20),
  nombre      text not null,
  documento   text not null,
  email       text not null,
  telefono    text not null,
  total       integer not null check (total > 0),
  anticipo    integer not null check (anticipo > 0 and anticipo <= total),
  estado      text not null default 'pendiente'
              check (estado in ('pendiente', 'confirmada', 'cancelada', 'expirada')),
  creada_en   timestamptz not null default now(),
  expira_en   timestamptz not null,
  pago_proveedor text check (pago_proveedor in ('wompi', 'manual', 'simulado')),
  pago_id     text,
  pago_fecha  timestamptz,
  notas       text,
  check (salida > entrada),
  -- La garantía de fondo: dos reservas activas no pueden compartir una noche,
  -- pase lo que pase en el código. [entrada, salida) deja que una entre el día que otra sale.
  constraint reservas_sin_solape exclude using gist (
    daterange(entrada, salida, '[)') with &&
  ) where (estado in ('pendiente', 'confirmada'))
);

create index if not exists reservas_pendientes_idx on reservas (expira_en) where estado = 'pendiente';
create index if not exists reservas_salida_idx on reservas (salida);

create table if not exists bloqueos (
  id      bigint generated always as identity primary key,
  desde   date not null,
  hasta   date not null,          -- incluido
  motivo  text not null default 'Bloqueado',
  check (hasta >= desde)
);

-- Supabase publica las tablas de "public" en su API REST. Con RLS activo y sin
-- políticas, esa API no puede leer ni escribir nada: solo la web, que entra con
-- la conexión directa a la base, ve los datos de los huéspedes.
alter table reservas enable row level security;
alter table bloqueos enable row level security;
