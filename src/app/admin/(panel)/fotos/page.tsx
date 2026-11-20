import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { esAdmin } from "@/lib/admin";
import { listarFotos, MAX_PENDIENTES, type EstadoFoto } from "@/lib/fotos";
import { listarFotosCabana, MAX_FOTOS_CABANA } from "@/lib/fotosCabana";
import { SubirFotosCabana } from "@/components/SubirFotosCabana";
import { describirFotoDeCabana, eliminarFoto, eliminarFotoDeCabana, moderarFoto, moverFotoDeCabana } from "../../acciones";

const ETIQUETA: Record<EstadoFoto, string> = {
  pendiente: "bg-sol/30 text-[#7a4e00]",
  aprobada: "bg-cafe/15 text-cafe",
  oculta: "bg-black/10 text-black/50",
};
const boton = "rounded-full px-3 py-1 text-xs font-extrabold";

function Accion({ id, estado, texto, clase }: { id: string; estado: EstadoFoto; texto: string; clase: string }) {
  return (
    <form action={moderarFoto}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button className={`${boton} ${clase}`}>{texto}</button>
    </form>
  );
}

export default async function FotosHuespedes() {
  // Ver la nota en ../page.tsx: layout y página corren en paralelo.
  if (!(await esAdmin())) redirect("/admin/entrar");
  const h = await headers();
  const enlace = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/fotos`;
  const [fotos, qr, cabana] = await Promise.all([
    listarFotos(),
    QRCode.toString(enlace, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b2118", light: "#ffffff" } }),
    listarFotosCabana(),
  ]);
  const pendientes = fotos.filter((f) => f.estado === "pendiente").length;
  const megas = fotos.reduce((s, f) => s + f.peso, 0) / 1_000_000;

  return (
    <main className="space-y-12">
      <section>
        <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Fotos de la cabaña</h1>
        <p className="text-sm font-semibold text-suave">
          Salen en la portada, justo debajo del banner, en este orden: las 5 primeras se ven de entrada y las demás al
          tocar «Ver todas las fotos». Pon primero las que más venden (la vista, la cama, el baño). Una descripción corta
          ayuda a que se entienda cada foto.
        </p>
        <div className="mt-4">
          {cabana.length < MAX_FOTOS_CABANA ? (
            <SubirFotosCabana />
          ) : (
            <p className="text-sm font-extrabold text-teja-oscura">Llegaste a {MAX_FOTOS_CABANA} fotos: borra alguna para subir más.</p>
          )}
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cabana.length === 0 && <li className="font-semibold text-suave">Aún no hay fotos de la cabaña.</li>}
          {cabana.map((f, i) => (
            <li key={f.id} className="rounded-[20px] border-[3px] border-black/5 bg-white p-3">
              <div className="relative overflow-hidden rounded-[14px] bg-crema">
                <Image src={`/api/fotos-cabana/${f.id}?t=mini`} alt={f.descripcion ?? `Foto ${i + 1}`} width={640} height={Math.round((640 * f.alto) / f.ancho)} unoptimized className="h-40 w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-extrabold text-white">{i + 1}</span>
              </div>
              <form action={describirFotoDeCabana} className="mt-2 flex gap-1.5">
                <input type="hidden" name="id" value={f.id} />
                <input name="descripcion" defaultValue={f.descripcion ?? ""} maxLength={80} placeholder="Ej.: Habitación principal" className="min-w-0 flex-1 rounded-[10px] border-2 border-black/[0.06] bg-crema px-2 py-1 text-xs font-semibold" />
                <button className="rounded-full border-2 border-black/10 px-2.5 text-xs font-extrabold">Guardar</button>
              </form>
              <div className="mt-2 flex items-center gap-2">
                <form action={moverFotoDeCabana}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="hacia" value="antes" />
                  <button disabled={i === 0} aria-label="Mover antes" className={`${boton} border-2 border-black/10 disabled:opacity-30`}>←</button>
                </form>
                <form action={moverFotoDeCabana}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="hacia" value="despues" />
                  <button disabled={i === cabana.length - 1} aria-label="Mover después" className={`${boton} border-2 border-black/10 disabled:opacity-30`}>→</button>
                </form>
                <form action={eliminarFotoDeCabana} className="ml-auto">
                  <input type="hidden" name="id" value={f.id} />
                  <BotonConfirmar pregunta="¿Borrar esta foto de la cabaña?" className="text-xs underline text-suave">Borrar</BotonConfirmar>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-titulo text-[34px] font-extrabold leading-tight">Fotos de huéspedes</h2>
        <p className="text-sm font-semibold text-suave">
          Las fotos nuevas llegan como pendientes. Las que publiques salen en la galería de la web. Para subir una a
          Facebook, descárgala y publícala desde tu página. Antes de aprobar, mira que no salgan niños sin sus papás
          o personas que no quieran aparecer.
        </p>
        {pendientes > 0 && <p className="mt-2 text-sm font-extrabold">{pendientes} por revisar.</p>}
        {pendientes >= MAX_PENDIENTES && (
          <p className="mt-2 text-sm font-extrabold text-teja-oscura">
            Llegaste a {MAX_PENDIENTES} pendientes: la web no recibe más fotos hasta que revises o borres algunas.
          </p>
        )}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.length === 0 && <li className="font-semibold text-suave">Aún no hay fotos.</li>}
          {fotos.map((f) => (
            <li key={f.id} className={`rounded-[20px] border-[3px] bg-white p-3 ${f.estado === "pendiente" ? "border-sol" : "border-black/5"}`}>
              <a href={`/api/fotos/${f.id}`} target="_blank" rel="noopener" className="block overflow-hidden rounded-[14px] bg-crema">
                <Image
                  src={`/api/fotos/${f.id}?t=mini`}
                  alt={`Foto de ${f.nombre}`}
                  width={480}
                  height={Math.round((480 * f.alto) / f.ancho)}
                  unoptimized
                  className="h-48 w-full object-cover"
                />
              </a>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <strong className="text-sm">{f.nombre}</strong>
                <span className={`${boton} ${ETIQUETA[f.estado]}`}>{f.estado}</span>
                <span className="text-xs text-suave">
                  {new Date(f.creadaEn).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              {f.comentario && <p className="mt-1 text-sm font-semibold">{f.comentario}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {f.estado !== "aprobada" && <Accion id={f.id} estado="aprobada" texto="✓ Publicar" clase="bg-cafe text-white" />}
                {f.estado !== "oculta" && <Accion id={f.id} estado="oculta" texto="Ocultar" clase="border-2 border-black/10" />}
                <a href={`/api/fotos/${f.id}?descargar=1`} className={`${boton} border-2 border-black/10`}>
                  ⬇ Descargar
                </a>
                <form action={eliminarFoto}>
                  <input type="hidden" name="id" value={f.id} />
                  <BotonConfirmar pregunta={`¿Borrar para siempre esta foto de ${f.nombre}?`} className="text-xs underline text-suave">
                    Borrar
                  </BotonConfirmar>
                </form>
              </div>
            </li>
          ))}
        </ul>
        {fotos.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-suave">
            Ocupan {megas.toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB de la base. El plan gratis de Supabase
            da 500 MB para todo: borra las que no publiques.
          </p>
        )}
      </section>

      <section className="rounded-[24px] border-[3px] border-black/5 bg-white p-5 max-w-md">
        <h2 className="font-titulo text-2xl font-extrabold">QR para compartir fotos</h2>
        <p className="text-sm font-semibold text-suave mt-1">
          Lleva a <span className="font-mono">{enlace}</span>. La página de reseñas también tiene un botón hacia aquí, así
          que el QR de reseñas que ya tienes impreso sirve para las dos cosas.
        </p>
        <div className="mt-4 mx-auto w-56 [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: qr }} />
      </section>
    </main>
  );
}
