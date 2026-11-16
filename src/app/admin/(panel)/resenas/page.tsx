import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { esAdmin } from "@/lib/admin";
import { cifrasVisitas, listarResenas, type EstadoResena } from "@/lib/resenas";
import { eliminarResena, moderarResena } from "../../acciones";

const ETIQUETA: Record<EstadoResena, string> = {
  pendiente: "bg-sol/30 text-[#7a4e00]",
  aprobada: "bg-cafe/15 text-cafe",
  oculta: "bg-black/10 text-black/50",
};
const boton = "rounded-full px-3 py-1 text-xs font-extrabold";

function Accion({ id, estado, texto, clase }: { id: string; estado: EstadoResena; texto: string; clase: string }) {
  return (
    <form action={moderarResena}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button className={`${boton} ${clase}`}>{texto}</button>
    </form>
  );
}

export default async function Resenas() {
  // Ver la nota en ../page.tsx: layout y página corren en paralelo.
  if (!(await esAdmin())) redirect("/admin/entrar");
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const enlace = `${origen}/resena`;
  const [resenas, visitas, qr] = await Promise.all([
    listarResenas(),
    cifrasVisitas(),
    QRCode.toString(enlace, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b2118", light: "#ffffff" } }),
  ]);
  const pendientes = resenas.filter((r) => r.estado === "pendiente").length;

  return (
    <main className="space-y-10">
      <section>
        <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Reseñas</h1>
        <p className="text-sm font-semibold text-suave">
          Las reseñas nuevas llegan como pendientes y solo se publican las que apruebes. Úsalo para frenar spam e insultos;
          una crítica honesta también ayuda a que confíen en ti.
        </p>
        <ul className="mt-4 space-y-3">
          {resenas.length === 0 && <li className="font-semibold text-suave">Aún no hay reseñas.</li>}
          {resenas.map((r) => (
            <li key={r.id} className={`rounded-[20px] border-[3px] bg-white p-4 ${r.estado === "pendiente" ? "border-sol" : "border-black/5"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sol text-lg tracking-wider">{"★".repeat(r.calificacion)}<span className="text-black/10">{"★".repeat(5 - r.calificacion)}</span></span>
                <strong>{r.nombre}</strong>
                {r.codigo && <span className="text-xs font-mono text-suave">{r.codigo}</span>}
                <span className={`${boton} ${ETIQUETA[r.estado]}`}>{r.estado}</span>
                <span className="text-xs text-suave">
                  {new Date(r.creadaEn).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{r.comentario}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.estado !== "aprobada" && <Accion id={r.id} estado="aprobada" texto="✓ Publicar" clase="bg-cafe text-white" />}
                {r.estado !== "oculta" && <Accion id={r.id} estado="oculta" texto="Ocultar" clase="border-2 border-black/10" />}
                <form action={eliminarResena}>
                  <input type="hidden" name="id" value={r.id} />
                  <BotonConfirmar pregunta={`¿Borrar para siempre la reseña de ${r.nombre}?`} className="text-xs underline text-suave">
                    Borrar
                  </BotonConfirmar>
                </form>
              </div>
            </li>
          ))}
        </ul>
        {pendientes > 0 && <p className="mt-2 text-xs font-bold text-suave">{pendientes} por revisar.</p>}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] border-[3px] border-black/5 bg-white p-5">
          <h2 className="font-titulo text-2xl font-extrabold">QR para la cabaña</h2>
          <p className="text-sm font-semibold text-suave mt-1">
            Lleva a <span className="font-mono">{enlace}</span>, donde el huésped deja su reseña. Imprímelo y ponlo donde se vea
            al salir: junto a la puerta, en la nevera o en el espejo.
          </p>
          <div className="mt-4 mx-auto w-56 [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <div className="rounded-[24px] border-[3px] border-black/5 bg-white p-5">
          <h2 className="font-titulo text-2xl font-extrabold">Visitas a la web</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[["Hoy", visitas.hoy], ["Este mes", visitas.mes], ["Total", visitas.total]].map(([t, v]) => (
              <div key={t} className="rounded-[16px] bg-crema p-3">
                <p className="text-[11px] font-black tracking-widest uppercase text-suave">{t}</p>
                <p className="font-titulo text-2xl font-extrabold">{Number(v).toLocaleString("es-CO")}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-suave">
            Cuenta una vez cada persona que abre la web (no tus entradas al panel ni los robots de los buscadores).
          </p>
        </div>
      </section>
    </main>
  );
}
