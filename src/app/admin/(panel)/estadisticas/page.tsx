import { redirect } from "next/navigation";
import { GraficaBarras } from "@/components/GraficaBarras";
import { esAdmin } from "@/lib/admin";
import { cifrasPorMes, nochesPorDiaSemana, reservasCreadas30, visitasPorDia } from "@/lib/estadisticas";
import { pesos } from "@/lib/precios";
import { listarCodigos } from "@/lib/codigos";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const mesCorto = (m: string) => MESES[Number(m.slice(5, 7)) - 1];
const mesLargo = (m: string) => `${MESES_LARGO[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const pesosCortos = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : v >= 1000 ? `$${Math.round(v / 1000)} mil` : `$${v}`);

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-[20px] border-[3px] border-black/5 bg-white p-4">
      <p className="text-[11px] font-black tracking-widest text-suave uppercase">{titulo}</p>
      <p className="font-titulo text-[28px] font-extrabold leading-tight">{valor}</p>
      <p className="text-xs font-bold text-suave">{detalle}</p>
    </div>
  );
}

export default async function Estadisticas() {
  // Ver la nota en ../page.tsx: layout y página corren en paralelo.
  if (!(await esAdmin())) redirect("/admin/entrar");
  const [dias, meses, semana, creadas, codigos] = await Promise.all([
    visitasPorDia(30),
    cifrasPorMes(),
    nochesPorDiaSemana(),
    reservasCreadas30(),
    listarCodigos(),
  ]);
  const colaboradores = [...codigos].sort((a, b) => b.vendido - a.vendido || b.usos - a.usos);

  const visitas30 = dias.reduce((s, d) => s + d.visitas, 0);
  const conversion = visitas30 ? (creadas / visitas30) * 100 : 0;
  const pasados = meses.filter((m) => !m.futuro);
  const actual = pasados[pasados.length - 1];
  const ocupacionActual = actual?.dias ? Math.round((actual.noches / actual.dias) * 100) : 0;
  const ingresosAno = pasados.reduce((s, m) => s + m.ingresos, 0);

  return (
    <main className="space-y-8">
      <section>
        <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Estadísticas</h1>
        <p className="text-sm font-semibold text-suave">
          Para decidir con datos: cuándo subir o bajar precios, cuándo publicar en redes y qué días promocionar.
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Cifra titulo="Visitas · 30 días" valor={visitas30.toLocaleString("es-CO")} detalle="Personas que abrieron la web" />
          <Cifra titulo="Reservas · 30 días" valor={String(creadas)} detalle="Hechas en la web (pagadas o no)" />
          <Cifra
            titulo="Conversión"
            valor={`${conversion.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`}
            detalle="De cada 100 visitas, cuántas reservan"
          />
          <Cifra
            titulo={`Ocupación · ${actual ? mesCorto(actual.mes) : ""}`}
            valor={`${ocupacionActual}%`}
            detalle={`${actual?.noches ?? 0} de ${actual?.dias ?? 0} noches · año ${pesosCortos(ingresosAno)}`}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <GraficaBarras
          titulo="Visitas por día"
          subtitulo="Últimos 30 días"
          barras={dias.map((d) => ({
            etiqueta: String(Number(d.dia.slice(8))),
            detalle: new Date(`${d.dia}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
            valor: d.visitas,
          }))}
          cadaEtiqueta={5}
          nota="Un salto aquí el día que publicas en Facebook dice que esa publicación funcionó."
        />
        <GraficaBarras
          titulo="Visitas por mes"
          subtitulo="Últimos 12 meses"
          barras={pasados.map((m) => ({ etiqueta: mesCorto(m.mes), detalle: mesLargo(m.mes), valor: m.visitas }))}
          nota="Los meses con más visitas son los que más conviene promocionar."
        />
        <GraficaBarras
          titulo="Reservas confirmadas por mes"
          subtitulo="Por mes de llegada · los 3 próximos meses, más claros, son lo ya reservado"
          barras={meses.map((m) => ({ etiqueta: mesCorto(m.mes), detalle: mesLargo(m.mes), valor: m.reservas, tenue: m.futuro }))}
        />
        <GraficaBarras
          titulo="Ingresos por mes"
          subtitulo="Total de las reservas confirmadas, por mes de llegada"
          barras={meses.map((m) => ({ etiqueta: mesCorto(m.mes), detalle: mesLargo(m.mes), valor: m.ingresos, tenue: m.futuro }))}
          formato={(v) => pesos(v)}
          formatoEje={pesosCortos}
        />
        <GraficaBarras
          titulo="Ocupación por mes"
          subtitulo="Porcentaje de noches ocupadas"
          barras={meses.map((m) => ({
            etiqueta: mesCorto(m.mes),
            detalle: `${mesLargo(m.mes)} (${m.noches} de ${m.dias} noches)`,
            valor: m.dias ? Math.round((m.noches / m.dias) * 100) : 0,
            tenue: m.futuro,
          }))}
          formato={(v) => `${v}%`}
          nota="Meses casi llenos: puedes subir precios o crear una fecha especial. Meses vacíos: un descuento puede ayudar."
        />
        <GraficaBarras
          titulo="Noches vendidas por día de la semana"
          subtitulo="Últimos 12 meses"
          barras={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
            etiqueta: DIAS[d].slice(0, 3),
            detalle: DIAS[d],
            valor: semana.find((s) => s.dia === d)?.noches ?? 0,
          }))}
          nota="Si entre semana casi no se vende, un plan o descuento de martes a jueves puede llenar esas noches."
        />
      </section>

      <section className="rounded-[24px] border-[3px] border-black/5 bg-white p-4 sm:p-5">
        <h3 className="font-titulo text-lg font-extrabold leading-tight">Colaboradores</h3>
        <p className="text-xs font-semibold text-suave">
          Reservas hechas con el código de cada uno, desde que se creó. «Vendido» suma solo las pagadas.
        </p>
        {colaboradores.length === 0 ? (
          <p className="mt-3 text-sm text-suave">
            Todavía no hay códigos. Créalos en Configuración → Códigos de colaboradores.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-suave border-b border-black/10">
                  <th className="py-1.5 pr-3 font-bold">Código</th>
                  <th className="py-1.5 pr-3 font-bold">Colaborador</th>
                  <th className="py-1.5 pr-3 font-bold text-right">Pagadas</th>
                  <th className="py-1.5 pr-3 font-bold text-right">Por pagar</th>
                  <th className="py-1.5 font-bold text-right">Vendido</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => (
                  <tr key={c.codigo} className="border-b border-black/5">
                    <td className="py-1.5 pr-3 font-mono font-bold">{c.codigo}</td>
                    <td className="py-1.5 pr-3 font-semibold">{c.colaborador}</td>
                    <td className="py-1.5 pr-3 text-right font-bold">{c.confirmadas}</td>
                    <td className="py-1.5 pr-3 text-right text-suave">{c.usos - c.confirmadas}</td>
                    <td className="py-1.5 text-right font-bold">{pesos(c.vendido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
