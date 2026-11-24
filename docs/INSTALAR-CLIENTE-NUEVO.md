# Instalar la web de reservas para un cliente nuevo

Guía para montar este mismo sistema para otra cabaña. Cada cliente tiene **su propia copia**: su web,
su base de datos y su panel. Los datos de un cliente nunca se mezclan con los de otro.

Tiempo: unos **30–45 minutos** con el cliente al lado (o con sus fotos y datos ya reunidos).

---

## 0. Antes de empezar: qué pedirle al cliente

| Qué | Para qué |
|---|---|
| Nombre de la cabaña, municipio y departamento | Datos básicos y Google |
| Número de WhatsApp (con 57 adelante) | Botón de WhatsApp y avisos de reservas |
| Logo (PNG con fondo transparente, cuadrado) | Barra de arriba e ícono de la pestaña |
| La mejor foto horizontal del lugar | Banner y vista previa en WhatsApp/Facebook |
| 5–15 fotos más (interior, vista, baño, cocina) | Galería |
| Precios por noche (entre semana, viernes, fin de semana, puente; pareja y grupo) | Precios |
| Capacidad, hora de entrada y salida, reglas, política de cancelación | Textos |
| Llave Bre-B o Nequi y titular | Cobro del anticipo |
| Nombre o razón social, cédula o NIT y correo del responsable | Política de datos (Ley 1581) |
| Enlace de Google Maps de la cabaña | Mapa y ruta |
| Redes sociales | Íconos y Google |

Deja claro el trato **antes** de instalar: precio, mantenimiento mensual, quién es dueño del código
(tú lo licencias; él es dueño de sus datos y su contenido) y que tú quedas como **encargado** de los
datos personales de sus huéspedes (Ley 1581). Ver `D:\2026\pagina cabana\cotizaciones\`.

---

## 1. Base de datos (Supabase)

Lo ideal es que la cuenta de Supabase sea **del cliente** (el plan gratis permite solo 2 proyectos
por cuenta, así que en la tuya no cabrían muchos clientes).

1. En https://supabase.com → **New project**.
   - Nombre: el de la cabaña. Región: **East US (North Virginia)** (la más cercana con buen precio).
   - Contraseña de la base: genera una larga y guárdala en un lugar seguro. **No la mandes por WhatsApp ni la pegues en un chat.**
2. Cuando termine de crearse: botón **Connect** → **Direct** → **Session pooler** (puerto **5432**).
   Copia esa dirección y reemplaza `[YOUR-PASSWORD]` por la contraseña.
   - ⚠️ No uses el *Transaction pooler* (6543): pierde respuestas cuando hay dos visitantes a la vez.

## 2. Preparar la base con la configuración inicial

Desde la carpeta del proyecto, en PowerShell (cambia los datos por los del cliente):

```powershell
$env:DATABASE_URL = "postgresql://postgres.xxxx:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
node scripts/cliente-nuevo.mjs --nombre "Cabaña El Roble" --municipio "Sibundoy" --departamento "Putumayo" --whatsapp 573001234567
```

Debe decir:

```
✓ Tablas creadas o ya existentes (db/schema.sql).
✓ Configuración inicial de «Cabaña El Roble» guardada (reservas en la base: 0).
```

El script crea las tablas y guarda una configuración **neutral**: sin los datos de Cabaña Café Plaza
(ni tu WhatsApp, ni tu Clarity, ni los planes de Consacá). Si la base ya tiene una configuración, **se
niega a seguir** para no pisar los datos de nadie.

Cierra la ventana de PowerShell al terminar (la contraseña quedó en esa variable).

## 3. La web (Vercel)

1. En https://vercel.com → **Add New → Project** → importa el repositorio de GitHub
   `Andreso07/cabana-cafe-plaza`.
   - Nombre del proyecto: el de la cabaña (será su dirección: `nombre-del-proyecto.vercel.app`).
2. Antes de **Deploy**, en **Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La dirección del paso 1 (Session pooler, 5432) |
| `ADMIN_USUARIO` | Usuario del panel para el cliente (ej.: su nombre) |
| `ADMIN_PASSWORD` | Clave larga (mínimo 10 caracteres; mejor 16 o más). Dásela al cliente en persona o por un medio seguro |
| `GOOGLE_SERVICE_ACCOUNT_JSON` y `GOOGLE_CALENDAR_ID` | Opcionales: solo si el cliente quiere ver las reservas en su Google Calendar |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Opcionales: solo si el cliente tiene Wompi. Vacías = pago por transferencia |

3. **Deploy**. Cuando termine, abre la dirección: debe salir la portada con el nombre del cliente.
4. La tarea diaria que evita que Supabase se pause ya viene incluida (`vercel.json`); no hay que hacer nada.

**Plan de Vercel:** para un negocio corresponde el plan **Pro** (unos 20 dólares al mes). Decide con el
cliente si va en tu cuenta (y lo incluyes en el mantenimiento) o en la suya.

**Ojo con las actualizaciones:** todos los proyectos que importan este repositorio se actualizan solos
cada vez que subes algo a `main`. Es bueno (todos reciben las mejoras), pero prueba bien antes de subir.
Si un cambio necesita tablas nuevas, corre otra vez el script del paso 2 con la `DATABASE_URL` de cada
cliente: crea lo que falte y **no toca su configuración ni sus reservas** (se detiene diciendo que ya
tiene configuración; eso es lo esperado).

## 4. Llenar el panel (con el cliente)

Entra a `https://su-direccion.vercel.app/admin` con el usuario y la clave del paso 3. En
**Configuración**, en este orden:

1. **🎨 Marca** — primero esto, porque mientras no suba su logo y su foto, la web muestra los de Café
   Plaza:
   - Sube el **logo** y la **foto del banner** (la vista previa de WhatsApp se arma sola).
   - Elige la **paleta de colores**.
   - Revisa la **descripción para Google** (menos de 160 letras).
   - Clarity y la verificación de Google se hacen en el paso 6.
2. **Textos y ubicación**:
   - vereda, cómo llegar, enlace de Maps y redes;
   - títulos del banner;
   - responsable y correo (obligatorio por la Ley 1581);
   - RNT si lo tiene.
3. **Precios y pago**: precios, capacidad, anticipo, noches mínimas, llave Bre-B / Nequi y titular.
4. **Planes**: las tarjetas de la sección de planes.
5. **Servicios y reglas**: servicios, lo que no incluye, reglas, cancelación y **Qué hacer cerca** (vacío = la página no aparece).
6. **Fechas especiales**: Semana Santa, fin de año y fiestas del pueblo, con precio propio.
7. **Descuentos** y **Temporada** (viene en «Automático»: Navidad y Halloween solos).
8. **Google Calendar**: si lo usa, la dirección secreta iCal de su calendario.
9. **📸 Fotos** (menú de arriba): sube las fotos de la cabaña y ordénalas (las 5 primeras se ven de entrada).

## 5. Dominio propio (opcional)

Si el cliente compra uno (ej.: `cabanaelroble.com`): en Vercel → el proyecto → **Settings → Domains**
→ agrégalo y sigue las instrucciones para el DNS. Márcalo como principal: la vista previa, el sitemap y
Google pasan a usarlo solos.

## 6. Google y Clarity

1. **Search Console** (https://search.google.com/search-console) → **Prefijo de la URL** con su
   dirección → método **Etiqueta HTML** → copia la etiqueta → panel → Marca → «Verificación de Google
   Search Console» → Guardar → en Search Console, **Verificar**. Luego en **Sitemaps** envía `sitemap.xml`.
2. **Microsoft Clarity** (https://clarity.microsoft.com) → nuevo proyecto con su dirección → copia el
   número del proyecto (Configuración → Instalación) → panel → Marca → «Número de Microsoft Clarity».
   Activa el enmascaramiento **Estricto**.
3. **Perfil de Empresa en Google (Maps)**: que el cliente reclame su ficha con su propia cuenta de
   Google y ponga el enlace de su web.

> El archivo `public/google9344ca347ca78012.html` es la verificación de **tu** Search Console para
> Cabaña Café Plaza. Viaja con el código a todos los proyectos; no afecta al cliente, pero dejaría que tu
> cuenta de Google verifique su dirección. Díselo, o pásate a la verificación por etiqueta en tu propio
> panel y borra ese archivo.

## 7. Prueba final (10 minutos)

Desde el celular, en una ventana de incógnito:

- [ ] La portada muestra **su** nombre, logo, foto y colores. Nada de Café Plaza.
- [ ] El botón de WhatsApp abre **su** número.
- [ ] Haz una **reserva de prueba** con tu nombre: debe salir el confeti y los datos de pago **del cliente**.
- [ ] En el panel, la reserva aparece. Márcala como pagada y luego **cancélala** para liberar las fechas.
- [ ] Pega la dirección en un chat de WhatsApp: la vista previa muestra **su** foto.
- [ ] `/condiciones` y `/privacidad` dicen **su** nombre y su responsable.
- [ ] Deja una reseña de prueba, apruébala en el panel y luego **bórrala**.

## Anexo: la web de demostración

Una copia para mostrarle el sistema a otras cabañas («Cabaña Demo», con las fotos de Café Plaza). Se
monta igual que un cliente, con tres diferencias:

1. Base: un proyecto de Supabase **solo para la demo**. En el paso 2 corre
   `node scripts/cliente-nuevo.mjs --demo` (crea las tablas y no guarda configuración).
2. Vercel: además de `DATABASE_URL`, `ADMIN_USUARIO` y `ADMIN_PASSWORD`, agrega `MODO_DEMO` = `1`.
   El usuario y la clave **se muestran en la pantalla de entrar**: usa unos solo para la demo, nunca los
   de tu panel real.
3. Cuando termine el Deploy, abre una vez `https://tu-demo.vercel.app/api/mantenimiento`: ahí se cargan
   los datos de ejemplo. Desde entonces se reinicia sola cada noche, y en Configuración hay un botón
   «Restablecer demostración».

Doble candado: el reinicio solo corre con `MODO_DEMO=1` **y** sobre una base vacía o marcada como
demostración. Si por error alguien pone `MODO_DEMO=1` en la web de un cliente, el reinicio falla sin
borrar nada (pero la franja de demo y la clave visible sí saldrían: no lo hagas).

La demo no sale en Google (noindex y robots.txt), no lleva Clarity, el pago se simula y la franja de
arriba lleva a tu WhatsApp.

## 8. Entrega

- Dale al cliente su usuario y clave del panel en persona (o que él la cambie en Vercel).
- Una capacitación corta: confirmar pagos, bloquear fechas, aprobar reseñas y fotos, cambiar precios.
- Entrégale el enlace de su web y un QR para imprimir (panel → Reseñas → tarjeta QR).
- Anota en tu lista de clientes: dirección, proyecto de Vercel, proyecto de Supabase y fecha del
  próximo cobro de mantenimiento. **No guardes ahí contraseñas.**
