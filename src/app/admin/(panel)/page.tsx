import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import type { Config } from "@/config/cabana";
import { esAdmin } from "@/lib/admin";
import { leerConfig } from "@/lib/config";
import { diasEntre, formatoLargo, hoyEnColombia, sumarDias } from "@/lib/fechas";
import { pesos } from "@/lib/precios";
import {
  buscarReservas,
  listarBloqueos,
  POR_PAGINA,
  reservasQueLlegan,
  resumen,
  type Reserva,
  type EstadoReserva,
  type FiltroReservas,
} from "@/lib/store";
import { bloquear, cancelar, desbloquear, marcarPagada } from "../acciones";

const ETIQUETA: Record<EstadoReserva, string> = {
  pendiente: "bg-sol/30 text-[#7a4e00]",
  confirmada: "bg-cafe/15 text-cafe",
  cancelada: "bg-black/10 text-black/60",
  expirada: "bg-black/5 text-black/40",
};

const VISTAS = { proximas: "Próximas", pasadas: "Pasadas", todas: "Todas" } as const;
const ESTADOS = ["todos", "pendiente", "confirmada", "expirada", "cancelada"] as const;

const boton = "rounded-full px-3 py-1 text-xs font-extrabold";
const campo = "rounded-[12px] border-2 border-black/[0.06] bg-white px-3 py-2 text-sm font-semibold";

/** Enlace de WhatsApp al celular del huésped, con el número en formato internacional. */
function whatsappDe(telefono: string, texto?: string): string {
  const numero = telefono.replace(/\D/g, "").replace(/^(\d{10})$/, "57$1");
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

function recordatorio(r: Reserva, cfg: Config, cuando: "hoy" | "mañana"): string {
  const nombre = r.nombre.split(" ")[0];
  const saldo = r.total - r.anticipo;
  return [
    `Hola ${nombre} 👋, te escribimos de ${cfg.nombre}.`,
    `Te recordamos que ${cuando === "hoy" ? "hoy" : "mañana"}, ${formatoLargo(r.entrada)}, te esperamos. La entrada es desde las ${cfg.checkIn} y la salida el ${formatoLargo(r.salida)} hasta las ${cfg.checkOut.replace(/\.$/, "")}.`,
    r.estado === "pendiente"
      ? `Aún no hemos confirmado tu pago de ${pesos(r.anticipo)} para separar. Si ya lo hiciste, envíanos el comprobante por aquí.`
      : saldo > 0
        ? `El saldo por pagar al llegar es de ${pesos(saldo)}.`
        : "",
    `Cómo llegar: ${cfg.comoLlegar}`,
    cfg.mapsUrl,
    `Tu código de reserva es ${r.codigo}. ¡Buen viaje!`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function Llegadas({ titulo, cuando, reservas, cfg }: { titulo: string; cuando: "hoy" | "mañana"; reservas: Reserva[]; cfg: Config }) {
  return (
    <div className="rounded-[20px] border-[3px] border-black/5 bg-white p-4">
      <h2 className="font-extrabold">{titulo}</h2>
      {reservas.length === 0 ? (
        <p className="mt-1 text-sm font-semibold text-suave">Nadie.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {reservas.map((r) => {
            const n = diasEntre(r.entrada, r.salida);
            return (
              <li key={r.codigo} className="text-sm">
                <p className="font-bold">
                  {r.nombre} · {r.huespedes} pers. · {n} {n === 1 ? "noche" : "noches"}
                  {r.estado === "pendiente" && <span className={`${boton} ml-2 ${ETIQUETA.pendiente}`}>sin pagar</span>}
                </p>
                <p className="text-xs font-semibold text-suave">
                  {r.codigo} · sale {formatoLargo(r.salida)} · saldo al llegar {pesos(r.total - r.anticipo)}
                </p>
                <a
                  href={whatsappDe(r.telefono, recordatorio(r, cfg, cuando))}
                  target="_blank"
                  rel="noopener"
                  className="mt-1 inline-block rounded-full bg-[#25D366] text-white px-3 py-1.5 text-xs font-extrabold"
                >
                  💬 Enviar recordatorio
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Cifra({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: string }) {
  return (
    <div className={`rounded-[20px] border-[3px] border-black/5 bg-white p-4 ${tono ?? ""}`}>
      <p className="text-[11px] font-black tracking-widest text-suave uppercase">{titulo}</p>
      <p className="font-titulo text-[28px] font-extrabold leading-tight">{valor}</p>
      {detalle && <p className="text-xs font-bold text-suave">{detalle}</p>}
    </div>
  );
}

export default async function Panel({ searchParams }: PageProps<"/admin">) {
  // El layout también lo comprueba, pero Next ejecuta layout y página en paralelo:
  // sin esto, una visita sin sesión consultaría las reservas antes de ser redirigida.
  if (!(await esAdmin())) redirect("/admin/entrar");
  const sp = await searchParams;
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const vista = (uno(sp.vista) in VISTAS ? uno(sp.vista) : "proximas") as FiltroReservas["vista"];
  const estado = ((ESTADOS as readonly string[]).includes(uno(sp.estado)) ? uno(sp.estado) : "todos") as FiltroReservas["estado"];
  const q = uno(sp.q);
  const pagina = Math.max(1, Number(uno(sp.pagina)) || 1);

  const hoy = hoyEnColombia();
  const [cifras, { reservas, total }, bloqueos, lleganHoy, lleganManana, cfg] = await Promise.all([
    resumen(),
    buscarReservas({ vista, estado, q, pagina }),
    listarBloqueos(),
    reservasQueLlegan(hoy),
    reservasQueLlegan(sumarDias(hoy, 1)),
    leerConfig(),
  ]);
  const ocupacion = cifras.diasDelMes ? Math.round((cifras.nochesOcupadasMes / cifras.diasDelMes) * 100) : 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (cambios: Record<string, string | number>) => {
    const p = new URLSearchParams({ vista, estado, q, pagina: String(pagina), ...Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, String(v)])) });
    return `/admin?${p.toString()}`;
  };

  return (
    <main className="space-y-10">
      <section>
        <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Tablero</h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Cifra titulo="Próximas confirmadas" valor={String(cifras.proximasConfirmadas)} detalle="Reservas por llegar" />
          <Cifra
            titulo="Por confirmar"
            valor={String(cifras.pendientes)}
            detalle={cifras.pagosReportados > 0 ? `${cifras.pagosReportados} con comprobante por verificar` : "Esperando pago"}
            tono={cifras.pagosReportados > 0 ? "border-teja bg-teja/5" : cifras.pendientes > 0 ? "border-sol bg-sol/10" : ""}
          />
          <Cifra
            titulo="Ocupación del mes"
            valor={`${ocupacion}%`}
            detalle={`${cifras.nochesOcupadasMes} de ${cifras.diasDelMes} noches`}
          />
          <Cifra titulo="Ventas del mes" valor={pesos(cifras.ingresosMes)} detalle={`Anticipos recibidos: ${pesos(cifras.anticiposMes)}`} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Llegadas titulo={`🛎️ Llegan mañana · ${formatoLargo(sumarDias(hoy, 1))}`} cuando="mañana" reservas={lleganManana} cfg={cfg} />
        <Llegadas titulo={`🏡 Llegan hoy · ${formatoLargo(hoy)}`} cuando="hoy" reservas={lleganHoy} cfg={cfg} />
      </section>

      {cifras.conNotas.length > 0 && (
        <section className="rounded-[20px] border-[3px] border-teja bg-teja/5 p-4 text-sm space-y-1">
          <h2 className="font-extrabold">⚠️ Requieren atención</h2>
          {cifras.conNotas.map((r) => (
            <p key={r.codigo} className="font-semibold"><strong>{r.codigo}</strong> ({r.nombre}): {r.notas}</p>
          ))}
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-titulo text-2xl font-extrabold">Reservas</h2>
          <form className="flex flex-wrap gap-2 items-center" action="/admin">
            <select name="vista" defaultValue={vista} className={campo}>
              {Object.entries(VISTAS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <select name="estado" defaultValue={estado} className={campo}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e === "todos" ? "Todos los estados" : e}</option>)}
            </select>
            <input name="q" defaultValue={q} placeholder="Nombre, cédula, código…" className={`${campo} w-48`} />
            <button className="rounded-full bg-teja text-white px-4 py-2 text-sm font-extrabold">Buscar</button>
          </form>
        </div>
        <p className="mt-2 text-xs font-bold text-suave">{total} {total === 1 ? "reserva" : "reservas"}</p>

        <div className="mt-3 overflow-x-auto rounded-[20px] border-[3px] border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-suave border-b-2 border-black/5">
              <tr>
                <th className="py-3 px-3">Código</th>
                <th className="px-3">Fechas</th>
                <th className="px-3">Huésped</th>
                <th className="px-3">Valor</th>
                <th className="px-3">Estado</th>
                <th className="px-3" />
              </tr>
            </thead>
            <tbody>
              {reservas.length === 0 && (
                <tr><td colSpan={6} className="py-8 px-3 text-center font-semibold text-suave">No hay reservas con esos filtros.</td></tr>
              )}
              {reservas.map((r) => {
                const n = diasEntre(r.entrada, r.salida);
                const enCasa = r.estado === "confirmada" && r.entrada <= hoy && r.salida > hoy;
                const porVerificar = Boolean(r.pagoReportado) && (r.estado === "pendiente" || r.estado === "expirada");
                return (
                  <tr key={r.codigo} className={`border-b border-black/5 align-top ${porVerificar ? "bg-sol/10" : ""}`}>
                    <td className="py-3 px-3 font-mono text-xs">{r.codigo}</td>
                    <td className="py-3 px-3 font-semibold whitespace-nowrap">
                      {formatoLargo(r.entrada)}<br />→ {formatoLargo(r.salida)}
                      <span className="block text-xs text-suave">{n} {n === 1 ? "noche" : "noches"}{enCasa && " · 🏡 hospedados"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold">{r.nombre}</span> · {r.huespedes} pers.
                      <span className="block text-xs text-suave">CC {r.documento} · {r.email}</span>
                      <a
                        href={whatsappDe(r.telefono)}
                        target="_blank"
                        rel="noopener"
                        className="text-xs font-bold text-cafe underline"
                      >
                        💬 {r.telefono}
                      </a>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold">{pesos(r.total)}</span>
                      <span className="block text-xs text-suave">separa {pesos(r.anticipo)}</span>
                      {r.descuento > 0 && <span className="block text-xs text-cafe">🎁 −{pesos(r.descuento)}</span>}
                      {r.pago && <span className="block text-xs text-suave">{r.pago.proveedor}: {r.pago.id}</span>}
                      {porVerificar && r.pagoReportado && (
                        <span className="mt-1 block rounded-lg bg-sol/30 px-2 py-1 text-xs font-bold text-[#7a4e00]">
                          🧾 Comprobante del cliente:
                          <span className="block font-mono text-sm select-all">{r.pagoReportado.referencia}</span>
                          <span className="block font-semibold">
                            {new Date(r.pagoReportado.fecha).toLocaleString("es-CO", {
                              timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                            })}{" "}
                            · búscalo en tu Nequi por {pesos(r.anticipo)}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3"><span className={`${boton} ${ETIQUETA[r.estado]}`}>{r.estado}</span></td>
                    <td className="py-3 px-3 space-y-2 min-w-48">
                      {(r.estado === "pendiente" || r.estado === "expirada") && (
                        <form action={marcarPagada} className="flex gap-1">
                          <input type="hidden" name="codigo" value={r.codigo} />
                          <input
                            name="referencia"
                            placeholder="Ref. del pago"
                            defaultValue={r.pagoReportado?.referencia}
                            className={`${campo} w-28 py-1 text-xs`}
                          />
                          <button className={`${boton} bg-cafe text-white`}>Pagada</button>
                        </form>
                      )}
                      {r.estado !== "cancelada" && (
                        <form action={cancelar}>
                          <input type="hidden" name="codigo" value={r.codigo} />
                          <BotonConfirmar
                            pregunta={`¿Cancelar la reserva ${r.codigo} de ${r.nombre}? Las fechas quedarán libres.`}
                            className={`${boton} border-2 border-black/10`}
                          >
                            Cancelar
                          </BotonConfirmar>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="mt-3 flex gap-2 items-center text-sm font-bold">
            {pagina > 1 && <Link href={enlace({ pagina: pagina - 1 })} className="underline">← Anterior</Link>}
            <span className="text-suave">Página {pagina} de {paginas}</span>
            {pagina < paginas && <Link href={enlace({ pagina: pagina + 1 })} className="underline">Siguiente →</Link>}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-titulo text-2xl font-extrabold">Bloquear fechas</h2>
        <p className="text-sm font-semibold text-suave mb-3">
          Para mantenimiento, uso propio o reservas que te hacen por fuera de la web.
        </p>
        <form action={bloquear} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm font-bold">Desde<br /><input type="date" name="desde" required min={hoy} className={campo} /></label>
          <label className="text-sm font-bold">Hasta (incluido)<br /><input type="date" name="hasta" min={hoy} className={campo} /></label>
          <label className="text-sm font-bold">Motivo<br /><input name="motivo" placeholder="Mantenimiento" className={campo} /></label>
          <button className="rounded-full bg-teja text-white px-4 py-2 text-sm font-extrabold">Bloquear</button>
        </form>
        <ul className="mt-4 space-y-2 text-sm font-semibold">
          {bloqueos.length === 0 && <li className="text-suave">No hay fechas bloqueadas.</li>}
          {bloqueos.map((b) => (
            <li key={b.id} className="flex gap-3 items-center">
              <span>🔒 {formatoLargo(b.desde)} → {formatoLargo(b.hasta)} · {b.motivo}</span>
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
