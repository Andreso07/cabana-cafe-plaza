import Image from "next/image";
import { BotonFlotanteReservar } from "@/components/BotonFlotanteReservar";
import { BotonPlan } from "@/components/BotonPlan";
import { ProveedorReserva } from "@/components/EstadoReserva";
import { FormularioResena } from "@/components/FormularioResena";
import { Redes } from "@/components/Redes";
import { Reservar } from "@/components/Reservar";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { fotosPublicas } from "@/lib/fotos";
import { nombrePublico, resenasPublicas } from "@/lib/resenas";
import { sugerenciaDe } from "@/lib/sugerencias";
import { wompiConfigurado } from "@/lib/wompi";

// Lee precios y textos de la base en cada visita: un cambio en el panel se ve al instante.
export const dynamic = "force-dynamic";

function Etiqueta({ children, tono = "teja" }: { children: React.ReactNode; tono?: "teja" | "cafe" | "suave" }) {
  const estilos = {
    teja: "bg-teja text-white shadow-[0_3px_0_var(--teja-oscura)]",
    cafe: "bg-cafe/15 text-cafe",
    suave: "bg-teja/10 text-teja",
  }[tono];
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold text-[11px] tracking-[0.14em] uppercase px-3.5 py-1.5 rounded-full ${estilos}`}>
      {children}
    </span>
  );
}

export default async function Inicio() {
  const [cfg, opiniones, fotos] = await Promise.all([
    leerConfig(),
    // Si las reseñas fallan, la página se muestra igual, sin esa sección llena.
    resenasPublicas(6).catch(() => ({ resenas: [], promedio: null, total: 0 })),
    fotosPublicas(8).catch(() => []),
  ]);


  // Los planes se editan en el panel (Configuración → Planes).
  const planes = cfg.planes;

  return (
    <main>
      {/* Banner */}
      <section id="banner" className="relative h-[72vh] min-h-[440px] w-full">
        <Image
          src="/cabana.jpg"
          alt={`${cfg.nombre}: cabaña con techo de teja roja y frente de vidrio entre cafetales, con montañas al fondo`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[1120px] px-4 md:px-6 pb-16 text-white">
          <Etiqueta>🏡 {cfg.vereda} · {cfg.municipio}</Etiqueta>
          <h1 className="font-titulo mt-4 text-[40px] sm:text-[60px] leading-[0.95] font-extrabold tracking-tight">
            {cfg.heroTitulo}
            <span className="block text-sol">{cfg.heroDestacado}</span>
          </h1>
          <p className="mt-3 max-w-[46ch] text-base sm:text-lg font-semibold text-white/90">{cfg.heroSubtitulo}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#reservar" className="boton-goma font-titulo bg-teja text-white font-extrabold text-base px-7 py-3.5 rounded-full">
              Reservar fechas →
            </a>
            <a href="#planes" className="font-titulo bg-white/15 backdrop-blur border-2 border-white/40 text-white font-extrabold text-base px-6 py-3 rounded-full hover:bg-white/25">
              Ver planes
            </a>
          </div>
        </div>
        {/* Flecha que rebota: avisa que la página sigue más abajo. */}
        <a
          href="#planes"
          aria-label="Bajar para ver más"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex size-10 items-center justify-center rounded-full border-2 border-white/50 bg-white/15 text-xl font-extrabold text-white backdrop-blur hover:bg-white/30 motion-safe:animate-bounce"
        >
          ↓
        </a>
      </section>

      <ProveedorReserva>
      {/* Planes */}
      <section id="planes" className="scroll-mt-20 mx-auto max-w-[1120px] px-4 md:px-6 py-12 md:py-16">
        <div className="text-center max-w-[640px] mx-auto">
          <Etiqueta tono="suave">🌿 Nuestros planes</Etiqueta>
          <h2 className="font-titulo mt-3 text-[32px] md:text-[42px] leading-[0.95] font-extrabold">Elige tu escapada</h2>
          <p className="mt-3 text-sm md:text-[15px] font-bold text-suave">
            Precios por la cabaña completa, no por persona. Pulsa un plan y te marcamos las próximas fechas libres en el calendario.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 items-stretch">
          {planes.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-[28px] border-[3px] bg-white p-6 flex flex-col ${
                p.destacado ? "border-teja shadow-[0_12px_0_var(--teja)] md:-translate-y-1" : "border-black/10"
              }`}
            >
              {p.destacado && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-teja text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full shadow-[0_3px_0_var(--teja-oscura)]">
                  ⭐ EL MÁS ELEGIDO ⭐
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-titulo font-extrabold text-lg leading-tight uppercase tracking-tight">{p.nombre}</h3>
                  <p className="flex items-baseline gap-1 mt-1 flex-wrap">
                    <span className="text-xs font-bold text-suave">Desde</span>
                    <span className="font-titulo font-extrabold text-[30px] leading-none">{pesos(p.precio)}</span>
                    <span className="text-xs font-bold text-suave">{p.unidad}</span>
                  </p>
                </div>
                <span
                  className={`size-11 shrink-0 rounded-full grid place-items-center text-xl border-2 ${
                    p.destacado ? "bg-teja border-teja" : "bg-crema border-black/5"
                  }`}
                  aria-hidden
                >
                  {p.icono}
                </span>
              </div>
              <ul className="mt-4 space-y-2.5 flex-1">
                {p.incluye.map((item) => (
                  <li key={item} className="flex gap-2 items-start text-sm font-bold leading-snug">
                    <span className="size-5 shrink-0 mt-0.5 rounded-full bg-cafe/15 text-cafe grid place-items-center text-[11px]" aria-hidden>✓</span>
                    <span className="text-tinta/80">{item}</span>
                  </li>
                ))}
              </ul>
              <BotonPlan
                sugerir={sugerenciaDe(p)}
                destacado={p.destacado}
                cfg={{ nochesCerradas: cfg.nochesCerradas, minNoches: cfg.minNoches }}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 bg-sol/20 border-2 border-dashed border-sol/50 rounded-[18px] px-4 py-3 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-[#7a4e00]">
          <span className="bg-white rounded-full px-3 py-1 border border-sol/40">👥 Hasta {cfg.capacidad} personas</span>
          <span className="bg-white rounded-full px-3 py-1 border border-sol/40">💳 Separas con el {cfg.porcentajeAnticipo}%</span>
          <span className="bg-white rounded-full px-3 py-1 border border-sol/40">🕒 Entrada {cfg.checkIn} · Salida {cfg.checkOut}</span>
          {cfg.descuentos
            .filter((d) => d.activo)
            .map((d) => (
              <span key={d.id} className="bg-white rounded-full px-3 py-1 border border-cafe/30 text-cafe">
                🎁 {d.nombre}: −{d.porcentaje}%
              </span>
            ))}
        </div>
      </section>

      {/* Calendario y formulario */}
      <section id="reservar" className="relative scroll-mt-20 fondo-puntos">
        <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-10 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <Etiqueta>📅 Reserva en 2 minutos</Etiqueta>
              <h2 className="font-titulo mt-3 text-[32px] md:text-[42px] leading-[0.95] font-extrabold">Aparta tus fechas</h2>
              <p className="mt-2 text-sm font-bold text-suave">
                Elige llegada y salida, déjanos tus datos y paga el {cfg.porcentajeAnticipo}% para confirmar.
              </p>
            </div>
            <span className="flex items-center gap-2 text-[11px] font-extrabold bg-white border border-black/5 rounded-full px-3 py-2">
              <span className="size-2 rounded-full bg-cafe animate-pulse" /> Disponibilidad en tiempo real
            </span>
          </div>
          <Reservar
            conWompi={wompiConfigurado()}
            cfg={{
              precios: cfg.precios,
              preciosGrupo: cfg.preciosGrupo,
              personasPrecioBase: cfg.personasPrecioBase,
              nochesCerradas: cfg.nochesCerradas,
              porcentajeAnticipo: cfg.porcentajeAnticipo,
              minNoches: cfg.minNoches,
              fechasEspeciales: cfg.fechasEspeciales,
              descuentos: cfg.descuentos.filter((d) => d.activo),
              capacidad: cfg.capacidad,
              horasApartado: cfg.horasApartado,
              checkIn: cfg.checkIn,
              checkOut: cfg.checkOut,
              requisitos: cfg.requisitos,
            }}
          />
        </div>
      </section>

      </ProveedorReserva>

      {/* Servicios */}
      <section id="servicios" className="bg-white border-y-[3px] border-cafe/10">
        <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-12 md:py-16">
          <div className="text-center max-w-[640px] mx-auto">
            <Etiqueta tono="cafe">☕ Lo que vas a encontrar</Etiqueta>
            <h2 className="font-titulo mt-3 text-[32px] md:text-[42px] leading-[0.95] font-extrabold">Todo para descansar</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {cfg.servicios.map((s) => (
              <div key={s.titulo} className="flex gap-3 items-center bg-crema border-2 border-black/[0.05] rounded-[20px] p-4 shadow-[0_3px_0_rgba(0,0,0,0.04)]">
                <span className="size-11 shrink-0 rounded-full bg-white border border-black/5 grid place-items-center text-xl" aria-hidden>
                  {s.icono}
                </span>
                <span className="leading-tight min-w-0">
                  <span className="block font-extrabold text-sm">{s.titulo}</span>
                  <span className="block text-xs font-bold text-suave">{s.detalle}</span>
                </span>
              </div>
            ))}
          </div>
          {cfg.noIncluye.length > 0 && (
            <p className="mt-6 text-center text-sm font-bold text-suave">
              No incluye: {cfg.noIncluye.join(", ").toLowerCase()}.
            </p>
          )}
        </div>
      </section>

      {/* Reseñas */}
      <section id="resenas" className="scroll-mt-20 mx-auto max-w-[1120px] px-4 md:px-6 py-12 md:py-16">
        <div className="text-center max-w-[640px] mx-auto">
          <Etiqueta tono="suave">⭐ Huéspedes felices</Etiqueta>
          <h2 className="font-titulo mt-3 text-[32px] md:text-[42px] leading-[0.95] font-extrabold">Lo que dicen de nosotros</h2>
          {opiniones.promedio !== null && (
            <p className="mt-3 font-extrabold">
              <span className="text-sol text-xl tracking-wider" aria-hidden>{"★".repeat(Math.round(opiniones.promedio))}</span>{" "}
              {opiniones.promedio.toLocaleString("es-CO")} de 5 · {opiniones.total} {opiniones.total === 1 ? "reseña" : "reseñas"}
            </p>
          )}
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px] items-start">
          <div className="grid gap-4 sm:grid-cols-2">
            {opiniones.resenas.length === 0 && (
              <p className="sm:col-span-2 rounded-[20px] border-2 border-dashed border-black/10 p-6 text-center font-semibold text-suave">
                Aún no hay reseñas publicadas. ¿Ya nos visitaste? Sé el primero en contarnos cómo te fue.
              </p>
            )}
            {opiniones.resenas.map((r) => (
              <figure key={r.id} className="rounded-[20px] border-[3px] border-black/5 bg-white p-5">
                <p className="text-sol text-lg tracking-wider" aria-label={`${r.calificacion} de 5 estrellas`}>
                  {"★".repeat(r.calificacion)}
                  <span className="text-black/10">{"★".repeat(5 - r.calificacion)}</span>
                </p>
                <blockquote className="mt-2 text-sm font-semibold text-tinta/80">“{r.comentario}”</blockquote>
                <figcaption className="mt-3 text-xs font-extrabold text-suave">
                  {nombrePublico(r.nombre)} ·{" "}
                  {new Date(r.creadaEn).toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" })}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="rounded-[28px] border-[3px] border-teja bg-white p-5 sm:p-6 shadow-[0_12px_0_var(--teja)]">
            <p className="text-[11px] font-black tracking-widest text-teja/70">DEJA TU RESEÑA</p>
            <div className="mt-3">
              <FormularioResena />
            </div>
          </div>
        </div>
        {/* Fotos de los huéspedes (aprobadas en el panel) */}
        <div className="mt-14">
          <h3 className="font-titulo text-center text-[26px] md:text-[32px] leading-tight font-extrabold">Así lo vivieron nuestros huéspedes</h3>
          {fotos.length > 0 && (
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {fotos.map((f) => (
                <li key={f.id}>
                  <figure>
                    <a href={`/api/fotos/${f.id}`} target="_blank" rel="noopener" className="block overflow-hidden rounded-[18px] border-[3px] border-white shadow-[0_6px_0_rgba(0,0,0,0.06)]">
                      <Image
                        src={`/api/fotos/${f.id}?t=mini`}
                        alt={f.comentario ?? `Foto de ${nombrePublico(f.nombre)} en ${cfg.nombre}`}
                        width={480}
                        height={Math.round((480 * f.alto) / f.ancho)}
                        unoptimized
                        className="aspect-square w-full object-cover transition-transform hover:scale-105"
                      />
                    </a>
                    <figcaption className="mt-1.5 text-xs font-bold text-suave">
                      📸 {nombrePublico(f.nombre)}
                      {f.comentario && <span className="font-semibold"> · {f.comentario}</span>}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-center">
            <a href="/fotos" className="boton-goma inline-block rounded-full bg-white border-[3px] border-teja px-5 py-2.5 font-extrabold text-teja">
              📸 {fotos.length > 0 ? "Comparte tus fotos" : "¿Ya nos visitaste? Comparte tus fotos"}
            </a>
          </p>
        </div>
        {(cfg.redes.facebook || cfg.redes.instagram || cfg.redes.tiktok) && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 font-extrabold">
            <span>Síguenos y mira más fotos</span>
            <Redes redes={cfg.redes} grande />
          </div>
        )}
      </section>

      {/* Antes de venir */}
      <section className="mx-auto max-w-[1120px] px-4 md:px-6">
        <div className="rounded-[28px] border-[3px] border-cafe/15 bg-white p-6 md:p-8 grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-center">
          <div>
            <h2 className="font-titulo text-2xl font-extrabold">Antes de venir</h2>
            <ul className="mt-3 space-y-2">
              {[`Entrada desde las ${cfg.checkIn} y salida hasta las ${cfg.checkOut}`, ...cfg.reglas].map((r) => (
                <li key={r} className="flex gap-2 text-sm font-semibold">
                  <span className="text-teja" aria-hidden>●</span> {r}
                </li>
              ))}
            </ul>
          </div>
          <a
            href={cfg.mapsUrl}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 rounded-[20px] bg-cafe text-white p-5 shadow-[0_6px_0_var(--cafe-oscuro)] hover:translate-y-px"
          >
            <span className="text-3xl" aria-hidden>📍</span>
            <span>
              <span className="block font-titulo font-extrabold text-lg">Cómo llegar</span>
              <span className="block text-sm font-semibold text-white/85">{cfg.comoLlegar}</span>
            </span>
          </a>
        </div>
      </section>
      <BotonFlotanteReservar />
      <div className="h-20 md:hidden" aria-hidden />
    </main>
  );
}
