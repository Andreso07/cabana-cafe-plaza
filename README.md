# Cabaña Café Plaza

Web de reservas de la cabaña en la Vereda Caracol, Consacá (Nariño).
Next.js 16 + TypeScript + Tailwind.

## Arrancar en local

Necesitas Docker Desktop encendido. La primera vez, crea la base y su esquema:

```bash
docker run -d --name cabana-db -e POSTGRES_PASSWORD=cabana_local -e POSTGRES_DB=cabana -p 5433:5432 postgres:17-alpine
docker exec -i cabana-db psql -U postgres -d cabana < db/schema.sql
cp .env.example .env.local
```

Las veces siguientes basta con `docker start cabana-db`. Luego:

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El panel está en http://localhost:3000/admin; la clave es
`ADMIN_PASSWORD` de `.env.local`.

Sin llaves de Wompi la web funciona en **modo simulado**: al reservar aparece un botón
"Simular pago aprobado" para probar el flujo completo sin cobrar.

## Qué cambiar antes de publicar

| Qué | Dónde |
|---|---|
| Precios, temporadas, anticipo, noches mínimas | `src/config/cabana.ts` → `PRECIOS` |
| WhatsApp, enlace de Maps, número de RNT | `src/config/cabana.ts` → `CABANA` |
| Servicios y reglas | `src/config/cabana.ts` |
| Condiciones de cancelación | `src/app/condiciones/page.tsx` |
| Datos del responsable (Ley 1581) | `src/app/privacidad/page.tsx` |

## Cómo funciona una reserva

1. El cliente elige fechas en el calendario. Los precios por noche salen de
   `src/lib/precios.ts` (entre semana, fin de semana o víspera de festivo, temporada alta).
2. Al enviar el formulario, el servidor recalcula el precio y **aparta las fechas 30 minutos**
   (estado `pendiente`). Si otra persona pidió esas noches un instante antes, recibe un 409.
3. El cliente paga el anticipo en el checkout de Wompi (Nequi, PSE, tarjeta).
4. Wompi avisa a `/api/wompi/webhook`; se verifica la firma y la reserva pasa a `confirmada`.
   Si nadie paga, a los 30 minutos pasa a `expirada` y las noches se liberan.
5. Pagos por fuera de la web (Nequi, Bre-B): en `/admin` se marca la reserva como pagada.

Los festivos de Colombia se calculan solos (`src/lib/festivos.ts`, Ley Emiliani).

## Activar Wompi

1. Crea la cuenta de comercio en https://comercios.wompi.co.
2. En *Desarrolladores* copia la llave pública, el secreto de integridad y el de eventos
   a `.env.local` (primero las de prueba, `pub_test_…`).
3. Configura la URL de eventos: `https://TU-DOMINIO/api/wompi/webhook`.

## Base de datos

Postgres: el de Docker en local y Supabase en producción. El esquema está en
`db/schema.sql` y se puede ejecutar más de una vez sin problema.

Dos reservas no pueden compartir una noche, por dos vías: cada escritura toma el mismo
candado de transacción, y además la restricción `reservas_sin_solape` de la base rechaza
cualquier solape aunque el código fallara.

### Crear la base en Supabase

1. Crea una cuenta en https://supabase.com y un proyecto nuevo. Elige la región
   **East US (North Virginia)**, que es la de Vercel por defecto. Guarda la contraseña de
   la base que te pide.
2. En **SQL Editor**, pega el contenido de `db/schema.sql` y pulsa *Run*.
3. En **Connect** (arriba), copia la cadena del **Session pooler** (puerto 5432) y
   reemplaza `[YOUR-PASSWORD]` por tu contraseña. Esa cadena es la `DATABASE_URL` que va en
   las variables de entorno de Vercel.

   **No uses el Transaction pooler (6543).** Con varias consultas a la vez pierde respuestas
   o las entrega a la consulta equivocada (medido: 27 de 48 mal). Si la cadena trae el 6543,
   `src/lib/db.ts` lo cambia solo al 5432 y lo avisa en el log.

Las tablas tienen RLS activado y ninguna política. Así la API pública de Supabase no deja
leer los datos de los huéspedes; solo la web los ve, porque entra con la cadena de conexión.
La cadena de conexión es un secreto: nunca va en el código ni en el repositorio.

## Pendiente antes de producción

- **Correos** de confirmación (por ejemplo con Resend).
- **RNT** y revisión de los textos legales.
