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

-- Descuento aplicado a cada reserva (para el panel y para no recalcular con reglas que cambiaron).
alter table reservas add column if not exists descuento integer not null default 0;
alter table reservas add column if not exists descuento_nombre text;

-- Número de comprobante que el cliente dice haber pagado (Nequi, Bre-B, banco), en mayúsculas
-- y sin espacios. Sirve para cruzarlo con el movimiento real y para que un mismo comprobante
-- no se use en dos reservas.
alter table reservas add column if not exists pago_reportado text;
alter table reservas add column if not exists pago_reportado_en timestamptz;
create index if not exists reservas_pago_reportado_idx on reservas (pago_reportado) where pago_reportado is not null;

-- Textos, precios, fechas especiales y descuentos que se editan desde el panel. Una sola fila.
create table if not exists configuracion (
  id             smallint primary key default 1 check (id = 1),
  datos          jsonb not null,
  actualizado_en timestamptz not null default now()
);

-- Reseñas de los huéspedes. Entran como 'pendiente' y solo se publican las que el dueño
-- aprueba en el panel (para frenar spam e insultos, no para esconder críticas).
create table if not exists resenas (
  id           bigint generated always as identity primary key,
  nombre       text not null,
  calificacion smallint not null check (calificacion between 1 and 5),
  comentario   text not null,
  codigo       text,                    -- código de reserva, si lo escribió
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'oculta')),
  creada_en    timestamptz not null default now()
);
create index if not exists resenas_estado_idx on resenas (estado, creada_en desc);

-- Visitas a la web, una fila por día. Las cuenta el navegador una vez por sesión.
create table if not exists visitas (
  dia   date primary key,
  total integer not null default 0
);

-- Supabase publica las tablas de "public" en su API REST. Con RLS activo y sin
-- políticas, esa API no puede leer ni escribir nada: solo la web, que entra con
-- la conexión directa a la base, ve los datos de los huéspedes.
alter table reservas enable row level security;
alter table bloqueos enable row level security;
alter table configuracion enable row level security;
alter table resenas enable row level security;
alter table visitas enable row level security;

-- Códigos de descuento para colaboradores (p. ej. LAURA10). La lista vive en su propia tabla, no en
-- `configuracion`, porque parte de la configuración viaja al navegador y los códigos no deben verse.
create table if not exists codigos_descuento (
  codigo      text primary key check (codigo ~ '^[A-Z0-9-]{3,20}$'),
  colaborador text not null,
  porcentaje  smallint not null check (porcentaje between 1 and 50),
  activo      boolean not null default true,
  vence       date,                -- incluido; sin fecha, no vence
  max_usos    integer check (max_usos > 0),
  creado_en   timestamptz not null default now()
);
alter table codigos_descuento enable row level security;

-- Código con el que se hizo cada reserva (para medir a cada colaborador).
alter table reservas add column if not exists codigo_descuento text;
create index if not exists reservas_codigo_descuento_idx on reservas (codigo_descuento) where codigo_descuento is not null;

-- Fotos que comparten los huéspedes desde /fotos. Quedan «pendiente» hasta que el dueño las apruebe.
-- La imagen va en la base (bytea) para no depender de otra cuenta ni de otra llave: el navegador la
-- reduce antes de subirla (máx. 1600 px, unos 300 KB) y la miniatura (480 px) se guarda aparte.
create table if not exists fotos_huespedes (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  comentario text,
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'oculta')),
  imagen     bytea not null,
  miniatura  bytea not null,
  ancho      integer not null,
  alto       integer not null,
  creada_en  timestamptz not null default now()
);
create index if not exists fotos_huespedes_estado_idx on fotos_huespedes (estado, creada_en desc);
alter table fotos_huespedes enable row level security;

-- Fotos de la cabaña que sube el dueño desde el panel (galería de la portada). No pasan por
-- aprobación. `orden` decide en qué puesto sale cada una; el dueño lo cambia con flechas.
create table if not exists fotos_cabana (
  id          bigint generated always as identity primary key,
  descripcion text,
  orden       integer not null,
  imagen      bytea not null,
  miniatura   bytea not null,
  ancho       integer not null,
  alto        integer not null,
  creada_en   timestamptz not null default now()
);
create index if not exists fotos_cabana_orden_idx on fotos_cabana (orden);
alter table fotos_cabana enable row level security;

-- Panel: desde cuándo valen las sesiones. La cookie del panel es firmada y no se guarda en la base;
-- al tocar «Salir» se mueve esta hora a ahora y toda sesión que empezó antes deja de servir, aunque
-- alguien hubiera copiado la cookie. Una sola fila.
create table if not exists panel_sesiones (
  id            integer primary key default 1 check (id = 1),
  validas_desde timestamptz not null default to_timestamp(0)
);
insert into panel_sesiones (id) values (1) on conflict (id) do nothing;
alter table panel_sesiones enable row level security;

-- Imágenes de la marca que el dueño sube desde el panel: logo, banner (grande y para celular) y la
-- imagen de vista previa al compartir el enlace. Una fila por imagen; si no hay, la web usa las de
-- public/. Así otra cabaña cambia su imagen sin tocar código.
create table if not exists imagenes_sitio (
  clave          text primary key check (clave in ('logo', 'banner', 'banner-m', 'og')),
  tipo           text not null check (tipo in ('image/jpeg', 'image/png')),
  imagen         bytea not null,
  ancho          integer not null,
  alto           integer not null,
  actualizado_en timestamptz not null default now()
);
alter table imagenes_sitio enable row level security;
