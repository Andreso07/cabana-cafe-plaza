import { redirect } from "next/navigation";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { esAdmin } from "@/lib/admin";
import { leerConfig } from "@/lib/config";
import { formatoLargo, hoyEnColombia } from "@/lib/fechas";
import { pesos } from "@/lib/precios";
import {
  agregarDescuento,
  agregarFechaEspecial,
  alternarDescuento,
  guardarListas,
  guardarPrecios,
  guardarTextos,
  quitarDescuento,
  quitarFechaEspecial,
} from "../../acciones";

const campo =
  "mt-1 w-full rounded-[12px] border-2 border-black/[0.06] bg-crema px-3 py-2 text-sm font-semibold outline-none focus:border-teja focus:bg-white";
const etiqueta = "text-sm font-bold";
const guardarBtn = "boton-goma font-titulo rounded-full bg-teja text-white font-extrabold px-6 py-2.5";

const NOMBRES: Record<string, string> = {
  textos: "Textos y ubicación",
  precios: "Precios y pago",
  listas: "Servicios y reglas",
  fechas: "Fechas especiales",
  descuentos: "Descuentos",
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
  const cfg = await leerConfig();
  const hoy = hoyEnColombia();

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

      <Tarjeta id="precios" titulo="Precios y pago" ayuda="Precio por noche de la cabaña completa. El calendario, los planes y el cobro usan estos valores.">
        <form action={guardarPrecios} className="grid gap-4 md:grid-cols-3">
          <Campo nombre="semana" titulo="Domingo a jueves" valor={cfg.precios.semana} inputMode="numeric" required />
          <Campo nombre="viernes" titulo="Viernes" valor={cfg.precios.viernes} inputMode="numeric" required />
          <Campo
            nombre="finDeSemana"
            titulo="Sábado, festivos y víspera de festivo"
            valor={cfg.precios.finDeSemana}
            inputMode="numeric"
            required
            ayuda="La víspera es, por ejemplo, el domingo de un puente."
          />
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

      <Tarjeta id="fechas" titulo="Fechas especiales" ayuda="Fechas con un precio propio por noche: Carnaval de Negros y Blancos, temporada de fin de año, eventos. Tienen prioridad sobre los precios normales.">
        <ul className="space-y-2 text-sm font-semibold mb-5">
          {cfg.fechasEspeciales.length === 0 && <li className="text-suave">No hay fechas especiales.</li>}
          {cfg.fechasEspeciales.map((f) => (
            <li key={f.id} className={`flex flex-wrap gap-3 items-center ${f.hasta < hoy ? "opacity-50" : ""}`}>
              <span className="size-2 rounded-full bg-sol" />
              <span><strong>{f.nombre}</strong>: {formatoLargo(f.desde)} → {formatoLargo(f.hasta)} · {pesos(f.precio)} / noche</span>
              <form action={quitarFechaEspecial}>
                <input type="hidden" name="id" value={f.id} />
                <BotonConfirmar pregunta={`¿Quitar «${f.nombre}»?`} className="text-xs underline text-suave">Quitar</BotonConfirmar>
              </form>
            </li>
          ))}
        </ul>
        <form action={agregarFechaEspecial} className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] items-end">
          <Campo nombre="nombre" titulo="Nombre" valor="" placeholder="Carnaval de Negros y Blancos" required />
          <Campo nombre="desde" titulo="Desde" valor="" type="date" min={hoy} required />
          <Campo nombre="hasta" titulo="Hasta (incluido)" valor="" type="date" min={hoy} />
          <Campo nombre="precio" titulo="Precio por noche" valor="" inputMode="numeric" placeholder="300000" required />
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
            </select>
          </label>
          <Campo nombre="minNoches" titulo="Desde cuántas noches" valor="" inputMode="numeric" placeholder="3" ayuda="Solo para «por número de noches»." />
          <Campo nombre="desde" titulo="Llegando desde" valor="" type="date" ayuda="Solo para «por fechas»." />
          <Campo nombre="hasta" titulo="Llegando hasta" valor="" type="date" />
          <div className="md:col-span-3"><button className={guardarBtn}>Agregar descuento</button></div>
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
    </main>
  );
}
