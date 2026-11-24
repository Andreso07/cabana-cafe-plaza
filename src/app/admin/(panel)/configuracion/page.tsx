import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { esAdmin } from "@/lib/admin";
import { eventosExternos } from "@/lib/calendario";
import { SUGERENCIAS, sugerenciaDe } from "@/lib/sugerencias";
import { googleConfigurado } from "@/lib/googleCalendar";
import { leerConfig } from "@/lib/config";
import { formatoLargo, hoyEnColombia } from "@/lib/fechas";
import { pesos, promoAbierta } from "@/lib/precios";
import { describirMeses, NOMBRES_MES } from "@/config/cabana";
import { listarCodigos } from "@/lib/codigos";
import { FRASES_BASE, PALABRAS_BASE } from "@/lib/palabras";
import {
  agregarCodigo,
  agregarDescuento,
  agregarFechaEspecial,
  alternarDescuento,
  guardarCalendario,
  guardarListas,
  guardarPalabras,
  guardarTemporada,
  guardarPlanes,
  guardarPrecios,
  guardarTextos,
  eliminarCodigo,
  pausarCodigo,
  quitarDescuento,
  nuevoEnlaceCalendario,
  quitarFechaEspecial,
  sincronizarAhora,
} from "../../acciones";

const campo =
  "mt-1 w-full rounded-[12px] border-2 border-black/[0.06] bg-crema px-3 py-2 text-sm font-semibold outline-none focus:border-teja focus:bg-white";
const etiqueta = "text-sm font-bold";
const guardarBtn = "boton-goma font-titulo rounded-full bg-teja text-white font-extrabold px-6 py-2.5";

const NOMBRES: Record<string, string> = {
  textos: "Textos y ubicación",
  precios: "Precios y pago",
  planes: "Planes",
  calendario: "Google Calendar",
  listas: "Servicios y reglas",
  fechas: "Fechas especiales",
  descuentos: "Descuentos",
  codigos: "Códigos de colaboradores",
  temporada: "Temporada",
  palabras: "Palabras no permitidas",
};

function Tarjeta({ id, titulo, ayuda, children }: { id: string; titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[24px] border-[3px] border-black/5 bg-white p-5 md:p-6">
      <h2 className="font-titulo text-2xl font-extrabold">{titulo}</h2>
      {ayuda && <p className="text-sm font-semibold text-suave mt-1">{ayuda}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Campo({ nombre, titulo, valor, ayuda, ...resto }: {
  nombre: string; titulo: string; valor: string | number | null; ayuda?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={etiqueta}>
      {titulo}
      <input name={nombre} defaultValue={valor ?? ""} className={campo} {...resto} />
      {ayuda && <span className="block text-xs font-semibold text-suave mt-1">{ayuda}</span>}
    </label>
  );
}

export default async function Configuracion({ searchParams }: PageProps<"/admin/configuracion">) {
  // Ver la nota en ../page.tsx: layout y página corren en paralelo.
  if (!(await esAdmin())) redirect("/admin/entrar");
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  const sync = typeof sp.sync === "string" && /^\d+-\d+-\d+$/.test(sp.sync) ? sp.sync.split("-") : null;
  const [cfg, externo, codigos] = await Promise.all([leerConfig(), eventosExternos(), listarCodigos()]);
  const hoy = hoyEnColombia();
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const enlaceIcs = cfg.calendarioToken ? `${origen}/api/calendario/${cfg.calendarioToken}.ics` : null;
  const { semana, viernes, finDeSemana } = cfg.precios;
  // Una tarjeta vacía al final para agregar un plan nuevo.
  const tarjetasPlanes = [...cfg.planes, null];

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Configuración</h1>
        <p className="text-sm font-semibold text-suave">Lo que cambies aquí se ve en la web en cuanto guardas.</p>
        <nav className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
          {Object.entries(NOMBRES).map(([id, t]) => (
            <a key={id} href={`#${id}`} className="rounded-full bg-white border-2 border-black/5 px-3 py-1.5 hover:border-teja/40">{t}</a>
          ))}
        </nav>
      </div>

      {ok && (
        <p className="rounded-[16px] bg-cafe/15 text-cafe font-extrabold px-4 py-3" role="status">
          ✅ Guardado: {NOMBRES[ok] ?? ok}.
        </p>
      )}
      {error && (
        <p className="rounded-[16px] bg-teja/10 text-teja-oscura font-extrabold px-4 py-3" role="alert">⚠️ {error}</p>
      )}

      <Tarjeta
        id="temporada"
        titulo="🎉 Temporada"
        ayuda="Viste la web para una fecha: una franja con tu mensaje, luces bajo la barra de arriba y nieve (Navidad) o murciélagos (Halloween). Vuelve a «Normal» cuando pase."
      >
        <form action={guardarTemporada} className="grid gap-4 md:grid-cols-2 items-end">
          <fieldset className="md:col-span-2 flex flex-wrap gap-2">
            <legend className={`${etiqueta} mb-1.5`}>Modo de la web</legend>
            {(
              [
                ["ninguna", "Normal"],
                ["navidad", "🎄 Navidad"],
                ["halloween", "🎃 Halloween"],
              ] as const
            ).map(([valor, nombre]) => (
              <label key={valor} className="flex items-center gap-2 rounded-full border-2 border-black/10 bg-white px-4 py-2 text-sm font-extrabold has-[:checked]:border-cafe has-[:checked]:bg-cafe/10">
                <input type="radio" name="temporada" value={valor} defaultChecked={cfg.temporada === valor} className="accent-[var(--cafe)]" />
                {nombre}
              </label>
            ))}
          </fieldset>
          <Campo nombre="mensajeNavidad" titulo="Mensaje de Navidad" valor={cfg.mensajeNavidad} maxLength={120} ayuda="Sugerido: del 1 de diciembre al 7 de enero." />
          <Campo nombre="mensajeHalloween" titulo="Mensaje de Halloween" valor={cfg.mensajeHalloween} maxLength={120} ayuda="Sugerido: del 20 al 31 de octubre." />
          <div><button className={guardarBtn}>Guardar</button></div>
        </form>
      </Tarjeta>

      <Tarjeta id="precios" titulo="Precios y pago" ayuda="Precio por noche de la cabaña completa. El cobro al reservar usa estos valores según cuántas personas van.">
        <form action={guardarPrecios} className="grid gap-4 md:grid-cols-3">
          <p className="md:col-span-3 text-sm font-extrabold">
            Por noche, 1 pareja (hasta{" "}
            <input
              name="personasPrecioBase"
              defaultValue={cfg.personasPrecioBase}
              inputMode="numeric"
              required
              className="w-12 rounded-[8px] border-2 border-black/[0.06] bg-crema px-1.5 py-0.5 text-center"
            />{" "}
            personas)
          </p>
          <Campo nombre="semana" titulo="Entre semana (martes a jueves)" valor={cfg.precios.semana} inputMode="numeric" required />
          <Campo nombre="viernes" titulo="Viernes" valor={cfg.precios.viernes} inputMode="numeric" required />
          <Campo
            nombre="finDeSemana"
            titulo="Sábado y domingo"
            valor={cfg.precios.finDeSemana}
            inputMode="numeric"
            required
            ayuda="También un día festivo o la víspera de un festivo."
          />
          <Campo
            nombre="puente"
            titulo="Puente: sábado y domingo juntos"
            valor={cfg.precios.puente}
            inputMode="numeric"
            required
            ayuda="Precio de las DOS noches, cuando el lunes es festivo. Una sola de ellas se cobra a precio normal."
          />
          <p className="md:col-span-3 text-sm font-extrabold">Por noche, 2 parejas (desde {cfg.personasPrecioBase + 1} personas)</p>
          <Campo nombre="grupoSemana" titulo="Entre semana (martes a jueves)" valor={cfg.preciosGrupo.semana} inputMode="numeric" required />
          <Campo nombre="grupoViernes" titulo="Viernes" valor={cfg.preciosGrupo.viernes} inputMode="numeric" required />
          <Campo nombre="grupoFinDeSemana" titulo="Sábado y domingo" valor={cfg.preciosGrupo.finDeSemana} inputMode="numeric" required />
          <Campo nombre="grupoPuente" titulo="Puente: sábado y domingo juntos" valor={cfg.preciosGrupo.puente} inputMode="numeric" required />
          <fieldset className="md:col-span-3">
            <legend className={etiqueta}>Noches sin servicio (se abren solas si ese día es festivo)</legend>
            <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold">
              {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => (
                <label key={d} className="flex gap-1.5 items-center">
                  <input type="checkbox" name="nochesCerradas" value={i} defaultChecked={cfg.nochesCerradas.includes(i)} className="accent-teja" />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <Campo nombre="porcentajeAnticipo" titulo="% para separar" valor={cfg.porcentajeAnticipo} inputMode="numeric" required />
          <Campo nombre="minNoches" titulo="Noches mínimas" valor={cfg.minNoches} inputMode="numeric" required />
          <Campo
            nombre="horasApartado"
            titulo="Horas que se apartan las fechas"
            valor={cfg.horasApartado}
            inputMode="numeric"
            required
            ayuda="Tiempo para pagar y enviar el comprobante."
          />
          <Campo nombre="capacidad" titulo="Capacidad (personas)" valor={cfg.capacidad} inputMode="numeric" required />
          <Campo nombre="checkIn" titulo="Hora de entrada" valor={cfg.checkIn} required />
          <Campo nombre="checkOut" titulo="Hora de salida" valor={cfg.checkOut} required />
          <Campo nombre="whatsapp" titulo="WhatsApp" valor={cfg.whatsapp.replace(/^57/, "")} inputMode="tel" required />
          <Campo nombre="llaveBreB" titulo="Llave Bre-B" valor={cfg.llaveBreB} />
          <Campo nombre="nequi" titulo="Número Nequi (opcional)" valor={cfg.nequi} />
          <Campo nombre="titular" titulo="Titular de la cuenta (opcional)" valor={cfg.titular} />
          <div className="md:col-span-2">
            <Campo nombre="requisitos" titulo="Qué más pides para separar" valor={cfg.requisitos} ayuda="Se le muestra al cliente junto al pago." />
          </div>
          <div className="md:col-span-3"><button className={guardarBtn}>Guardar precios y pago</button></div>
        </form>
      </Tarjeta>

      <Tarjeta
        id="planes"
        titulo="Planes"
        ayuda="Las tarjetas de la sección «Planes» de la web. Son la vitrina: lo que se cobra al reservar sale del precio de cada noche, así que mantén los dos de acuerdo."
      >
        <p className="text-xs font-bold text-suave mb-4">
          Lo que cobra la web por noche hoy: entre semana {pesos(semana)} pareja / {pesos(cfg.preciosGrupo.semana)} grupo · viernes{" "}
          {pesos(viernes)} / {pesos(cfg.preciosGrupo.viernes)} · sábado y domingo {pesos(finDeSemana)} /{" "}
          {pesos(cfg.preciosGrupo.finDeSemana)} · puente (las 2 noches) {pesos(cfg.precios.puente)} / {pesos(cfg.preciosGrupo.puente)}.
        </p>
        <form action={guardarPlanes} className="space-y-4">
          <input type="hidden" name="totalPlanes" value={tarjetasPlanes.length} />
          {tarjetasPlanes.map((p, i) => (
            <fieldset
              key={p?.id ?? "nuevo"}
              className={`rounded-[18px] border-2 p-4 grid gap-3 md:grid-cols-[70px_1.5fr_1fr_1fr] ${p ? "border-black/5" : "border-dashed border-teja/30"}`}
            >
              <legend className="px-2 text-xs font-black tracking-widest text-suave uppercase">
                {p ? `Plan ${i + 1}` : "Agregar un plan (opcional)"}
              </legend>
              <input type="hidden" name={`plan-${i}-id`} value={p?.id ?? ""} />
              <Campo nombre={`plan-${i}-icono`} titulo="Ícono" valor={p?.icono ?? ""} placeholder="🏡" />
              <Campo nombre={`plan-${i}-nombre`} titulo="Nombre" valor={p?.nombre ?? ""} placeholder="Plan romántico" />
              <Campo nombre={`plan-${i}-precio`} titulo="Precio" valor={p?.precio ?? ""} inputMode="numeric" placeholder="300000" />
              <Campo nombre={`plan-${i}-unidad`} titulo="Por" valor={p?.unidad ?? ""} placeholder="/ 2 noches" />
              <label className={`${etiqueta} md:col-span-4`}>
                Al pulsar su botón, marcar en el calendario el próximo…
                <select name={`plan-${i}-sugerir`} defaultValue={p ? sugerenciaDe(p) : "ninguno"} className={campo}>
                  {Object.entries(SUGERENCIAS).map(([v, t]) => (
                    <option key={v} value={v}>{t}</option>
                  ))}
                </select>
              </label>
              <label className={`${etiqueta} md:col-span-3`}>
                Qué incluye <span className="font-semibold text-suave">(una línea por punto, máximo 6)</span>
                <textarea name={`plan-${i}-incluye`} rows={3} className={campo} defaultValue={p?.incluye.join("\n") ?? ""} />
              </label>
              <div className="flex flex-col gap-2 text-sm font-bold justify-end">
                <label className="flex gap-2 items-center">
                  <input type="radio" name="destacado" value={i} defaultChecked={p?.destacado} className="accent-teja" />
                  Destacado
                </label>
                {p && (
                  <label className="flex gap-2 items-center text-suave">
                    <input type="checkbox" name={`plan-${i}-quitar`} className="accent-teja" />
                    Quitar
                  </label>
                )}
              </div>
            </fieldset>
          ))}
          <button className={guardarBtn}>Guardar planes</button>
        </form>
      </Tarjeta>

      <Tarjeta
        id="calendario"
        titulo="Google Calendar"
        ayuda="Para que lo que agenda el agente de WhatsApp ocupe la web, y para ver las reservas de la web en tu Google Calendar."
      >
        <div className="space-y-6 text-sm font-semibold">
          <div>
            <h3 className="font-extrabold">1. De Google a la web</h3>
            <p className="text-suave mt-1">
              En Google Calendar (desde el computador): ⚙️ Configuración → en la izquierda, el calendario donde se anotan las
              reservas → «Integrar el calendario» → copia la <strong>Dirección secreta en formato iCal</strong> y pégala aquí. Cada
              evento de ese calendario ocupa sus noches en la web. Usa un calendario solo para la cabaña: una cita personal también
              bloquearía fechas.
            </p>
            <form action={guardarCalendario} className="mt-3 flex flex-wrap gap-2 items-end">
              <label className={`${etiqueta} grow`}>
                Dirección secreta en formato iCal
                <input
                  name="googleIcalUrl"
                  type="url"
                  defaultValue={cfg.googleIcalUrl}
                  placeholder="https://calendar.google.com/calendar/ical/…/private-…/basic.ics"
                  className={`${campo} font-mono text-xs`}
                />
              </label>
              <button className={guardarBtn}>Guardar</button>
            </form>
            {externo.configurado && (
              <div className={`mt-3 rounded-[14px] p-3 ${externo.error ? "bg-teja/10 text-teja-oscura" : "bg-libre text-libre-texto"}`}>
                {externo.error ? (
                  <p>
                    ⚠️ No se pudo leer Google Calendar: {externo.error}.
                    {externo.leidoEn ? " Se usan los últimos eventos que se leyeron bien." : ""}
                  </p>
                ) : (
                  <p>
                    ✓ Conectado. {externo.eventos.length}{" "}
                    {externo.eventos.length === 1 ? "evento próximo ocupa" : "eventos próximos ocupan"} noches en la web.
                  </p>
                )}
                <ul className="mt-2 space-y-0.5 text-tinta">
                  {externo.eventos.slice(0, 15).map((e, j) => (
                    <li key={j}>
                      📅 {formatoLargo(e.desde)} → {formatoLargo(e.hasta)} · {e.resumen}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-extrabold">2. De la web a Google, al instante</h3>
            {googleConfigurado() ? (
              <>
                <p className="text-suave mt-1">
                  Conexión directa activa: cada reserva, pago, cancelación o bloqueo de la web se escribe en tu calendario de la
                  cabaña en segundos (✅ verde = pagada, ⏳ amarillo = apartada sin pago, 🔒 gris = bloqueada). Las que expiran sin
                  pago se quitan solas en los minutos siguientes. No edites esos eventos en Google: se corrigen desde aquí.
                </p>
                {sync && (
                  <p className="mt-2 rounded-[14px] bg-libre text-libre-texto p-3">
                    ✓ Sincronizado: {sync[0]} creados, {sync[1]} actualizados, {sync[2]} borrados.
                  </p>
                )}
                <form action={sincronizarAhora} className="mt-2">
                  <button className="rounded-full border-2 border-black/10 px-4 py-2 text-xs font-extrabold">Sincronizar ahora</button>
                </form>
              </>
            ) : (
              <p className="text-suave mt-1">
                No configurada. Faltan las variables GOOGLE_SERVICE_ACCOUNT_JSON y GOOGLE_CALENDAR_ID en Vercel. Mientras tanto
                puedes usar el enlace de respaldo de abajo.
              </p>
            )}
          </div>

          <div>
            <h3 className="font-extrabold">3. Respaldo: enlace iCal de la web</h3>
            <p className="text-suave mt-1">
              {googleConfigurado()
                ? "Con la conexión directa activa no lo necesitas: si lo agregas en Google verías cada reserva repetida. Sirve solo si algún día quitas la conexión directa."
                : "En Google Calendar: «Otros calendarios» → + → «Desde URL» → pega este enlace. Las reservas de la web aparecen como un calendario aparte. Google lo vuelve a leer solo, cada varias horas: eso lo decide Google."}
            </p>
            {enlaceIcs ? (
              <p className="mt-2 rounded-[12px] bg-crema border-2 border-black/5 px-3 py-2 font-mono text-xs break-all select-all">
                {enlaceIcs}
              </p>
            ) : (
              <p className="mt-2 text-suave">Aún no hay enlace. Créalo con el botón.</p>
            )}
            <p className="mt-1 text-xs text-teja-oscura">
              Quien tenga este enlace ve nombres y teléfonos de tus huéspedes: no lo compartas. Si se filtra, crea uno nuevo y el
              anterior deja de funcionar.
            </p>
            <form action={nuevoEnlaceCalendario} className="mt-2">
              {enlaceIcs ? (
                <BotonConfirmar
                  pregunta="¿Crear un enlace nuevo? El que pegaste en Google dejará de funcionar y tendrás que pegar el nuevo."
                  className="rounded-full border-2 border-black/10 px-4 py-2 text-xs font-extrabold"
                >
                  Crear enlace nuevo
                </BotonConfirmar>
              ) : (
                <button className={guardarBtn}>Crear enlace</button>
              )}
            </form>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta id="fechas" titulo="Fechas especiales" ayuda="Fechas con un precio propio por noche: Carnaval de Negros y Blancos, temporada de fin de año, eventos. Tienen prioridad sobre los precios normales.">
        <ul className="space-y-2 text-sm font-semibold mb-5">
          {cfg.fechasEspeciales.length === 0 && <li className="text-suave">No hay fechas especiales.</li>}
          {cfg.fechasEspeciales.map((f) => (
            <li key={f.id} className={`flex flex-wrap gap-3 items-center ${f.hasta < hoy ? "opacity-50" : ""}`}>
              <span className="size-2 rounded-full bg-sol" />
              <span>
                <strong>{f.nombre}</strong>: {formatoLargo(f.desde)} → {formatoLargo(f.hasta)} · {pesos(f.precio)} / noche
                {f.precioGrupo ? ` (grupo ${pesos(f.precioGrupo)})` : ""}
              </span>
              <form action={quitarFechaEspecial}>
                <input type="hidden" name="id" value={f.id} />
                <BotonConfirmar pregunta={`¿Quitar «${f.nombre}»?`} className="text-xs underline text-suave">Quitar</BotonConfirmar>
              </form>
            </li>
          ))}
        </ul>
        <form action={agregarFechaEspecial} className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] items-end">
          <Campo nombre="nombre" titulo="Nombre" valor="" placeholder="Carnaval de Negros y Blancos" required />
          <Campo nombre="desde" titulo="Desde" valor="" type="date" min={hoy} required />
          <Campo nombre="hasta" titulo="Hasta (incluido)" valor="" type="date" min={hoy} />
          <Campo nombre="precio" titulo="Por noche, pareja" valor="" inputMode="numeric" placeholder="300000" required />
          <Campo nombre="precioGrupo" titulo="Por noche, grupo" valor="" inputMode="numeric" placeholder="Opcional" />
          <button className={guardarBtn}>Agregar</button>
        </form>
      </Tarjeta>

      <Tarjeta id="descuentos" titulo="Descuentos" ayuda="Si a una reserva le aplican varios, se usa el mayor (no se suman). Los activos aparecen en la web.">
        <ul className="space-y-2 text-sm font-semibold mb-5">
          {cfg.descuentos.length === 0 && <li className="text-suave">No hay descuentos.</li>}
          {cfg.descuentos.map((d) => (
            <li key={d.id} className="flex flex-wrap gap-3 items-center">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${d.activo ? "bg-cafe/15 text-cafe" : "bg-black/5 text-black/40"}`}>
                {d.activo ? "activo" : "pausado"}
              </span>
              <span>
                <strong>{d.nombre}</strong>: −{d.porcentaje}%{" "}
                {d.tipo === "noches"
                  ? `desde ${d.minNoches} noches`
                  : d.tipo === "entreSemana"
                    ? `solo noches de martes a jueves, desde ${d.minNoches} ${d.minNoches === 1 ? "noche" : "noches"}`
                    : d.tipo === "meses"
                      ? `todos los planes, ${d.meses.length === 0 ? "todo el año" : `llegando en ${describirMeses(d.meses)}`}${d.minNoches > 1 ? `, desde ${d.minNoches} noches` : ""}`
                      : d.tipo === "compra"
                        ? `🖤 reservando del ${formatoLargo(d.compraDesde)} al ${formatoLargo(d.compraHasta)}, para llegar entre ${formatoLargo(d.desde)} y ${formatoLargo(d.hasta)}${d.sinDesde && d.sinHasta ? ` (sin noches del ${formatoLargo(d.sinDesde)} al ${formatoLargo(d.sinHasta)})` : ""}${d.regalos ? ` · 🎁 las primeras ${d.regalos} pagadas se llevan ${d.regaloTexto}` : ""}${promoAbierta(d) ? " · ABIERTA AHORA" : d.compraHasta < hoy ? " · ya terminó" : " · todavía no empieza"}`
                        : `llegando entre ${formatoLargo(d.desde)} y ${formatoLargo(d.hasta)}`}
              </span>
              <form action={alternarDescuento}>
                <input type="hidden" name="id" value={d.id} />
                <button className="text-xs underline text-suave">{d.activo ? "Pausar" : "Activar"}</button>
              </form>
              <form action={quitarDescuento}>
                <input type="hidden" name="id" value={d.id} />
                <BotonConfirmar pregunta={`¿Borrar el descuento «${d.nombre}»?`} className="text-xs underline text-suave">Borrar</BotonConfirmar>
              </form>
            </li>
          ))}
        </ul>
        <form action={agregarDescuento} className="grid gap-3 md:grid-cols-3 items-end">
          <Campo nombre="nombre" titulo="Nombre" valor="" placeholder="Semana completa" required />
          <Campo nombre="porcentaje" titulo="% de descuento" valor="" inputMode="numeric" placeholder="10" required />
          <label className={etiqueta}>
            Tipo
            <select name="tipo" className={campo} defaultValue="noches">
              <option value="noches">Por número de noches</option>
              <option value="fechas">Por fechas de llegada</option>
              <option value="entreSemana">Solo entre semana (martes a jueves)</option>
              <option value="meses">Todos los planes, por meses</option>
              <option value="compra">🖤 Promoción por fecha de reserva (Black Friday)</option>
            </select>
          </label>
          <Campo nombre="minNoches" titulo="Desde cuántas noches" valor="" inputMode="numeric" placeholder="3" ayuda="Para «por número de noches», «entre semana» y «por meses». En «entre semana», todas las noches deben ser de martes, miércoles o jueves (no festivos). Vacío en «por meses»: desde 1 noche." />
          <Campo nombre="desde" titulo="Llegando desde" valor="" type="date" ayuda="Para «por fechas» y para la promoción." />
          <Campo nombre="hasta" titulo="Llegando hasta" valor="" type="date" />
          <fieldset className="md:col-span-3">
            <legend className={etiqueta}>Meses <span className="font-semibold text-suave">(solo para «por meses»)</span></legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {NOMBRES_MES.map((m, i) => (
                <label key={m} className="flex items-center gap-1.5 rounded-full border-2 border-black/10 bg-white px-3 py-1 text-xs font-bold capitalize has-[:checked]:border-cafe has-[:checked]:bg-cafe/10">
                  <input type="checkbox" name="meses" value={i + 1} className="accent-[var(--cafe)]" />
                  {m}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-suave">
              Cuenta el mes del día de llegada, y el descuento vale para toda la estadía, en cualquier plan (fines de
              semana y festivos incluidos). Sin marcar ninguno: todo el año.
            </p>
          </fieldset>
          <fieldset className="md:col-span-3 grid gap-3 md:grid-cols-4 rounded-[16px] border-2 border-dashed border-black/10 p-3">
            <legend className={`${etiqueta} px-1`}>🖤 Solo para la promoción por fecha de reserva</legend>
            <Campo nombre="compraDesde" titulo="Se puede reservar desde" valor="" type="date" />
            <Campo nombre="compraHasta" titulo="Hasta (incluido)" valor="" type="date" />
            <Campo nombre="sinDesde" titulo="Excepto noches del" valor="" type="date" ayuda="Opcional, ej.: 24 de dic." />
            <Campo nombre="sinHasta" titulo="al" valor="" type="date" ayuda="Ej.: 31 de dic." />
            <Campo nombre="regalos" titulo="Regalo para las primeras" valor="" inputMode="numeric" placeholder="3" ayuda="Reservas pagadas. Vacío: sin regalo." />
            <div className="md:col-span-3">
              <Campo nombre="regaloTexto" titulo="¿Qué se llevan?" valor="" maxLength={80} placeholder="una noche entre semana gratis en febrero o marzo" />
            </div>
            <p className="md:col-span-4 text-xs font-semibold text-suave">
              Vale para quien reserve en esos días (hora Colombia) y llegue entre «Llegando desde» y «Llegando hasta». Si
              alguna noche cae en las fechas excluidas, no aplica. Mientras está abierta sale una franja negra con cuenta
              regresiva en la web, y se apaga sola al terminar.
            </p>
          </fieldset>
          <div className="md:col-span-3"><button className={guardarBtn}>Agregar descuento</button></div>
        </form>
      </Tarjeta>

      <Tarjeta
        id="codigos"
        titulo="Códigos de colaboradores"
        ayuda="Cada colaborador comparte su código o su enlace. No aplica en puentes, fechas especiales ni festivos, y no se suma con los descuentos de arriba: se usa el que rebaje más."
      >
        <ul className="space-y-3 text-sm font-semibold mb-5">
          {codigos.length === 0 && <li className="text-suave">Todavía no hay códigos.</li>}
          {codigos.map((c) => {
            const vencido = c.vence !== null && c.vence < hoy;
            const agotado = c.maxUsos !== null && c.usos >= c.maxUsos;
            const estado = !c.activo ? "pausado" : vencido ? "vencido" : agotado ? "agotado" : "activo";
            const enlace = `${origen}/?codigo=${c.codigo}#reservar`;
            return (
              <li key={c.codigo} className="rounded-[16px] border-2 border-black/5 px-3 py-2.5">
                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${estado === "activo" ? "bg-cafe/15 text-cafe" : "bg-black/5 text-black/40"}`}>
                    {estado}
                  </span>
                  <strong className="font-mono tracking-wide">{c.codigo}</strong>
                  <span>−{c.porcentaje}% · {c.colaborador}</span>
                  <span className="text-suave">
                    {c.vence ? `vence ${formatoLargo(c.vence)}` : "sin vencimiento"}
                    {c.maxUsos !== null && ` · ${c.usos} de ${c.maxUsos} usos`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-suave">
                  {c.confirmadas} {c.confirmadas === 1 ? "reserva pagada" : "reservas pagadas"} · {pesos(c.vendido)} vendidos
                  {c.usos > c.confirmadas && ` · ${c.usos - c.confirmadas} por pagar`}
                </p>
                <p className="mt-1 text-xs break-all">
                  Enlace para compartir: <span className="font-mono select-all">{enlace}</span>
                </p>
                <div className="mt-1 flex gap-3">
                  <form action={pausarCodigo}>
                    <input type="hidden" name="codigo" value={c.codigo} />
                    <button className="text-xs underline text-suave">{c.activo ? "Pausar" : "Activar"}</button>
                  </form>
                  <form action={eliminarCodigo}>
                    <input type="hidden" name="codigo" value={c.codigo} />
                    <BotonConfirmar pregunta={`¿Borrar el código «${c.codigo}»? Las reservas que lo usaron lo conservan.`} className="text-xs underline text-suave">
                      Borrar
                    </BotonConfirmar>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        <form action={agregarCodigo} className="grid gap-3 md:grid-cols-3 items-end">
          <Campo nombre="codigo" titulo="Código" valor="" placeholder="LAURA10" required maxLength={20} ayuda="Letras, números y guiones." />
          <Campo nombre="colaborador" titulo="Colaborador" valor="" placeholder="Laura (Instagram)" required maxLength={60} />
          <Campo nombre="porcentaje" titulo="% de descuento" valor="10" inputMode="numeric" required />
          <Campo nombre="vence" titulo="Vence (incluido)" valor="" type="date" min={hoy} ayuda="Vacío: no vence." />
          <Campo nombre="maxUsos" titulo="Máximo de reservas" valor="" inputMode="numeric" placeholder="Sin límite" ayuda="Cuentan las pagadas y las que apartan fechas." />
          <div><button className={guardarBtn}>Crear código</button></div>
        </form>
      </Tarjeta>

      <Tarjeta id="textos" titulo="Textos y ubicación">
        <form action={guardarTextos} className="grid gap-4 md:grid-cols-2">
          <Campo nombre="nombre" titulo="Nombre de la cabaña" valor={cfg.nombre} required />
          <Campo nombre="negocio" titulo="Nombre del negocio" valor={cfg.negocio} />
          <Campo nombre="heroTitulo" titulo="Título del banner (línea blanca)" valor={cfg.heroTitulo} />
          <Campo nombre="heroDestacado" titulo="Título del banner (línea amarilla)" valor={cfg.heroDestacado} />
          <div className="md:col-span-2">
            <Campo nombre="heroSubtitulo" titulo="Frase bajo el título" valor={cfg.heroSubtitulo} />
          </div>
          <Campo nombre="vereda" titulo="Vereda" valor={cfg.vereda} />
          <Campo nombre="municipio" titulo="Municipio" valor={cfg.municipio} />
          <Campo nombre="departamento" titulo="Departamento" valor={cfg.departamento} />
          <Campo nombre="mapsUrl" titulo="Enlace de Google Maps" valor={cfg.mapsUrl} type="url" ayuda="En Maps: Compartir → Copiar enlace." />
          <div className="md:col-span-2">
            <Campo nombre="comoLlegar" titulo="Cómo llegar" valor={cfg.comoLlegar} />
          </div>
          <Campo nombre="responsable" titulo="Responsable de los datos (nombre y cédula o NIT)" valor={cfg.responsable} ayuda="Aparece en la política de datos (Ley 1581)." />
          <Campo nombre="correoContacto" titulo="Correo de contacto" valor={cfg.correoContacto} type="email" />
          <Campo nombre="rnt" titulo="Número de RNT" valor={cfg.rnt} ayuda="Cuando lo tengas, aparece en el pie de la web." />
          <Campo nombre="facebook" titulo="Facebook" valor={cfg.redes.facebook} type="url" placeholder="https://www.facebook.com/…" />
          <Campo nombre="instagram" titulo="Instagram" valor={cfg.redes.instagram} type="url" placeholder="https://www.instagram.com/…" ayuda="Déjalo vacío si no tienes." />
          <Campo nombre="tiktok" titulo="TikTok" valor={cfg.redes.tiktok} type="url" placeholder="https://www.tiktok.com/@…" ayuda="Déjalo vacío si no tienes." />
          <div className="md:col-span-2"><button className={guardarBtn}>Guardar textos</button></div>
        </form>
      </Tarjeta>

      <Tarjeta id="listas" titulo="Servicios y reglas" ayuda="Una línea por elemento.">
        <form action={guardarListas} className="grid gap-4 md:grid-cols-2">
          <label className={`${etiqueta} md:col-span-2`}>
            Servicios: <span className="font-semibold text-suave">ícono | título | detalle</span>
            <textarea
              name="servicios"
              rows={7}
              className={`${campo} font-mono`}
              defaultValue={cfg.servicios.map((s) => `${s.icono} | ${s.titulo} | ${s.detalle}`).join("\n")}
            />
          </label>
          <label className={etiqueta}>
            No incluye
            <textarea name="noIncluye" rows={3} className={campo} defaultValue={cfg.noIncluye.join("\n")} />
          </label>
          <label className={etiqueta}>
            Reglas de la casa
            <textarea name="reglas" rows={5} className={campo} defaultValue={cfg.reglas.join("\n")} />
          </label>
          <label className={`${etiqueta} md:col-span-2`}>
            Política de cancelación
            <textarea name="cancelacion" rows={5} className={campo} defaultValue={cfg.cancelacion.join("\n")} />
          </label>
          <div className="md:col-span-2"><button className={guardarBtn}>Guardar servicios y reglas</button></div>
        </form>
      </Tarjeta>

      <Tarjeta
        id="palabras"
        titulo="🚫 Palabras no permitidas"
        ayuda="Las reseñas, los comentarios de fotos y los nombres de las reservas que tengan estas palabras o amenazas no se envían: el visitante ve un aviso para cambiarlas. Ya hay una lista base de groserías y amenazas; aquí agregas las tuyas."
      >
        <form action={guardarPalabras} className="grid gap-3">
          <label className={etiqueta}>
            Tus palabras o frases <span className="font-semibold text-suave">(una por línea; termina en * para toda la familia: «grosero*»)</span>
            <textarea name="palabras" rows={5} className={campo} defaultValue={cfg.palabrasProhibidas.join("\n")} placeholder={"estafa\nladrones*\nno vayan"} />
          </label>
          <p className="text-xs font-semibold text-suave">
            No importan mayúsculas, tildes ni trucos como «p.u.t.a», «put4» o «puuuta». Se compara por palabra completa,
            así que una raíz como «puta» no bloquea «computadora».
          </p>
          <details className="text-xs font-semibold text-suave">
            <summary className="cursor-pointer font-extrabold">Ver la lista base ({PALABRAS_BASE.length} palabras y {FRASES_BASE.length} frases de amenaza)</summary>
            <p className="mt-2 leading-relaxed">{PALABRAS_BASE.join(", ")}</p>
            <p className="mt-2 leading-relaxed">{FRASES_BASE.join(" · ")}</p>
          </details>
          <div><button className={guardarBtn}>Guardar palabras</button></div>
        </form>
      </Tarjeta>
    </main>
  );
}
