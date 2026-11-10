import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { claveCorrecta, cerrarSesion, esAdmin, iniciarSesion } from "@/lib/admin";
import { esFechaValida, formatoLargo, hoyEnColombia } from "@/lib/fechas";
import { pesos } from "@/lib/precios";
import {
  cancelarReserva,
  confirmarPago,
  crearBloqueo,
  listarTodo,
  obtenerReserva,
  quitarBloqueo,
  type EstadoReserva,
} from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración", robots: { index: false } };

async function entrar(form: FormData) {
  "use server";
  if (claveCorrecta(String(form.get("clave") ?? ""))) await iniciarSesion();
  else redirect("/admin?error=1");
  redirect("/admin");
}

async function salir() {
  "use server";
  await cerrarSesion();
  redirect("/admin");
}

async function exigirAdmin() {
  if (!(await esAdmin())) redirect("/admin");
}

async function marcarPagada(form: FormData) {
  "use server";
  await exigirAdmin();
  const codigo = String(form.get("codigo"));
  const r = await obtenerReserva(codigo);
  if (!r) return;
  await confirmarPago(codigo, r.anticipo, {
    proveedor: "manual",
    id: String(form.get("referencia") || "sin referencia"),
    fecha: new Date().toISOString(),
  });
  revalidatePath("/admin");
}

async function cancelar(form: FormData) {
  "use server";
  await exigirAdmin();
  await cancelarReserva(String(form.get("codigo")));
  revalidatePath("/admin");
}

async function bloquear(form: FormData) {
  "use server";
  await exigirAdmin();
  const desde = form.get("desde");
  const hasta = form.get("hasta") || desde;
  if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) return;
  await crearBloqueo(desde, hasta, String(form.get("motivo") || "Bloqueado"));
  revalidatePath("/admin");
}

async function desbloquear(form: FormData) {
  "use server";
  await exigirAdmin();
  await quitarBloqueo(String(form.get("id")));
  revalidatePath("/admin");
}

const ETIQUETA: Record<EstadoReserva, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-green-100 text-green-800",
  cancelada: "bg-gray-200 text-gray-700",
  expirada: "bg-gray-100 text-gray-500",
};

const boton = "rounded-full px-3 py-1 text-xs font-medium";
const campo = "rounded-lg border border-linea bg-white px-3 py-2 text-sm";

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  if (!(await esAdmin())) {
    const { error } = await searchParams;
    return (
      <main className="mx-auto max-w-sm px-4 py-20">
        <h1 className="font-titulo text-2xl mb-4">Administración</h1>
        <form action={entrar} className="flex flex-col gap-3">
          <input type="password" name="clave" placeholder="Clave" required className={campo} autoFocus />
          {error && <p className="text-sm text-teja-oscura">Clave incorrecta.</p>}
          <button className="rounded-full bg-teja text-white py-2 font-medium">Entrar</button>
        </form>
      </main>
    );
  }

  const { reservas, bloqueos } = await listarTodo();
  const hoy = hoyEnColombia();
  const proximas = reservas
    .filter((r) => r.salida >= hoy)
    .sort((a, b) => a.entrada.localeCompare(b.entrada));
  const conProblema = reservas.filter((r) => r.notas);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="font-titulo text-3xl">Reservas</h1>
        <form action={salir}><button className="text-sm underline text-suave">Salir</button></form>
      </div>

      {conProblema.length > 0 && (
        <section className="rounded-xl border border-teja bg-teja/5 p-4 text-sm space-y-1">
          <h2 className="font-semibold">Requieren atención</h2>
          {conProblema.map((r) => <p key={r.codigo}><strong>{r.codigo}</strong>: {r.notas}</p>)}
        </section>
      )}

      <section className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-suave border-b border-linea">
            <tr>
              <th className="py-2 pr-3">Código</th>
              <th className="pr-3">Fechas</th>
              <th className="pr-3">Huésped</th>
              <th className="pr-3">Valor</th>
              <th className="pr-3">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {proximas.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-suave">No hay reservas próximas.</td></tr>
            )}
            {proximas.map((r) => (
              <tr key={r.codigo} className="border-b border-linea align-top">
                <td className="py-3 pr-3 font-mono">{r.codigo}</td>
                <td className="pr-3 py-3">{formatoLargo(r.entrada)}<br />→ {formatoLargo(r.salida)}</td>
                <td className="pr-3 py-3">
                  {r.nombre} · {r.huespedes} pers.<br />
                  <span className="text-suave">{r.documento} · {r.telefono}<br />{r.email}</span>
                </td>
                <td className="pr-3 py-3">
                  {pesos(r.total)}<br />
                  <span className="text-suave">anticipo {pesos(r.anticipo)}</span>
                  {r.pago && <><br /><span className="text-suave">{r.pago.proveedor}: {r.pago.id}</span></>}
                </td>
                <td className="pr-3 py-3">
                  <span className={`${boton} ${ETIQUETA[r.estado]}`}>{r.estado}</span>
                </td>
                <td className="py-3 space-y-2 min-w-44">
                  {(r.estado === "pendiente" || r.estado === "expirada") && (
                    <form action={marcarPagada} className="flex gap-1">
                      <input type="hidden" name="codigo" value={r.codigo} />
                      <input name="referencia" placeholder="Ref. Nequi" className={`${campo} w-24 py-1 text-xs`} />
                      <button className={`${boton} bg-cafe text-white`}>Pagada</button>
                    </form>
                  )}
                  {r.estado !== "cancelada" && (
                    <form action={cancelar}>
                      <input type="hidden" name="codigo" value={r.codigo} />
                      <button className={`${boton} border border-linea`}>Cancelar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-titulo text-2xl mb-3">Bloquear fechas</h2>
        <p className="text-sm text-suave mb-3">
          Para mantenimiento, uso propio o reservas que te hacen por fuera de la web.
        </p>
        <form action={bloquear} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">Desde<br /><input type="date" name="desde" required min={hoy} className={campo} /></label>
          <label className="text-sm">Hasta (incluido)<br /><input type="date" name="hasta" min={hoy} className={campo} /></label>
          <label className="text-sm">Motivo<br /><input name="motivo" placeholder="Mantenimiento" className={campo} /></label>
          <button className="rounded-full bg-teja text-white px-4 py-2 text-sm font-medium">Bloquear</button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {bloqueos.map((b) => (
            <li key={b.id} className="flex gap-3 items-center">
              <span>{formatoLargo(b.desde)} → {formatoLargo(b.hasta)} · {b.motivo}</span>
              <form action={desbloquear}>
                <input type="hidden" name="id" value={b.id} />
                <button className="underline text-suave text-xs">Quitar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
