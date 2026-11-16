// Gráfica de columnas de una sola serie, en HTML (nítida en cualquier pantalla y sin librerías).
// Una serie = un color y sin leyenda: el título dice qué se mide. Columnas de máximo 24 px,
// esquinas redondeadas solo arriba, cuadrícula tenue, el valor máximo rotulado y el resto en
// el globo al pasar el dedo o el mouse. Debajo, la tabla con todos los valores.

export type Barra = {
  etiqueta: string; // eje X, corta
  detalle: string; // en el globo y en la tabla, completa
  valor: number;
  tenue?: boolean; // p. ej. meses futuros: se dibujan más claros
};

/** Un tope «redondo» para el eje cuya mitad también sea entera (nada de «12,5 visitas»). */
function topeRedondo(max: number): number {
  if (max <= 0) return 2;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) {
    const t = m * p;
    if (t >= max && Number.isInteger(t / 2)) return t;
  }
  return 10 * p;
}

export function GraficaBarras({
  titulo,
  subtitulo,
  barras,
  formato = (v) => v.toLocaleString("es-CO"),
  formatoEje,
  cadaEtiqueta = 1,
  nota,
}: {
  titulo: string;
  subtitulo?: string;
  barras: Barra[];
  formato?: (v: number) => string;
  formatoEje?: (v: number) => string;
  cadaEtiqueta?: number; // mostrar una etiqueta del eje X cada tantas barras
  nota?: string;
}) {
  const max = Math.max(0, ...barras.map((b) => b.valor));
  const tope = topeRedondo(max);
  const eje = formatoEje ?? formato;
  const iMax = barras.findIndex((b) => b.valor === max && max > 0);
  const total = barras.reduce((s, b) => s + b.valor, 0);

  return (
    <figure className="rounded-[24px] border-[3px] border-black/5 bg-white p-4 sm:p-5">
      <figcaption>
        <h3 className="font-titulo text-lg font-extrabold leading-tight">{titulo}</h3>
        {subtitulo && <p className="text-xs font-semibold text-suave">{subtitulo}</p>}
      </figcaption>

      <div className="mt-4 flex gap-2">
        {/* Eje Y: 0, mitad y tope */}
        <div className="flex flex-col justify-between text-right text-[10px] font-bold text-suave h-40 pb-0 w-12 shrink-0 -mt-1.5">
          <span>{eje(tope)}</span>
          <span>{eje(tope / 2)}</span>
          <span>{eje(0)}</span>
        </div>
        <div className="relative flex-1 min-w-0">
          {/* Cuadrícula: líneas finas y sólidas, un tono sobre el fondo */}
          <div className="absolute inset-x-0 top-0 h-40 flex flex-col justify-between pointer-events-none" aria-hidden>
            <span className="border-t border-black/[0.07]" />
            <span className="border-t border-black/[0.07]" />
            <span className="border-t border-black/20" />
          </div>
          <div className="relative h-40 flex items-end gap-[2px]" role="img" aria-label={`${titulo}. Total ${formato(total)}.`}>
            {barras.map((b, i) => {
              const alto = tope ? (b.valor / tope) * 100 : 0;
              return (
                <div key={i} className="group relative flex-1 h-full flex items-end justify-center">
                  {/* La zona sensible es toda la columna, no solo la barra */}
                  {b.valor > 0 && (
                    <div
                      className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${b.tenue ? "bg-teja/40" : "bg-teja"} group-hover:opacity-80`}
                      style={{ height: `${Math.max(alto, 1.5)}%` }}
                    />
                  )}
                  {i === iMax && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-tinta whitespace-nowrap"
                      style={{ bottom: `calc(${alto}% + 2px)` }}
                    >
                      {formato(b.valor)}
                    </span>
                  )}
                  <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block whitespace-nowrap rounded-[10px] bg-tinta text-white px-2.5 py-1.5 text-xs font-bold shadow-lg">
                    {b.detalle}: {formato(b.valor)}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Eje X */}
          <div className="mt-1 flex gap-[2px] text-[10px] font-bold text-suave">
            {barras.map((b, i) => (
              <span key={i} className="flex-1 text-center whitespace-nowrap overflow-visible">
                {i % cadaEtiqueta === 0 ? b.etiqueta : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {nota && <p className="mt-3 text-xs font-semibold text-suave">{nota}</p>}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-bold text-suave">Ver tabla</summary>
        <table className="mt-2 w-full">
          <tbody>
            {barras.map((b, i) => (
              <tr key={i} className="border-b border-black/5">
                <td className="py-1 font-semibold">{b.detalle}</td>
                <td className="py-1 text-right font-bold">{formato(b.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
