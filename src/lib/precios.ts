// Cálculo de precios. Lo usan el calendario (para mostrar) y el servidor
// (para cobrar) con la misma configuración: el servidor nunca confía en el
// total que manda el navegador.
import type { Config, Descuento } from "@/config/cabana";
import { diaSemana, noches, sumarDias, type Fecha } from "./fechas";
import { esFestivo } from "./festivos";

/** Lo que el cálculo necesita de la configuración (es lo que viaja al navegador). */
export type ConfigPrecios = Pick<
  Config,
  | "precios"
  | "preciosGrupo"
  | "personasPrecioBase"
  | "nochesCerradas"
  | "porcentajeAnticipo"
  | "minNoches"
  | "fechasEspeciales"
  | "descuentos"
>;

/** Noche que no se alquila (los lunes, por ejemplo), salvo que ese día sea festivo. */
export function nocheCerrada(fecha: Fecha, cfg: Pick<ConfigPrecios, "nochesCerradas">): boolean {
  return cfg.nochesCerradas.includes(diaSemana(fecha)) && !esFestivo(fecha);
}

export type TipoNoche = "semana" | "viernes" | "finDeSemana" | "puente" | "especial";

/**
 * Sábado de puente: el sábado de un fin de semana cuyo lunes es festivo. Las noches del sábado y
 * del domingo de ese puente se venden juntas a un precio cerrado (`precios.puente`).
 */
export function sabadoDePuente(fecha: Fecha): boolean {
  return diaSemana(fecha) === 6 && esFestivo(sumarDias(fecha, 2));
}

/**
 * Tipo y precio de una noche. Con más de `personasPrecioBase` huéspedes se usa el precio
 * de grupo (las «2 parejas»).
 */
export function tipoNoche(
  fecha: Fecha,
  cfg: ConfigPrecios,
  huespedes = 1,
): { tipo: TipoNoche; precio: number; nombre?: string } {
  const grupo = huespedes > cfg.personasPrecioBase;
  const especial = cfg.fechasEspeciales.find((e) => fecha >= e.desde && fecha <= e.hasta);
  if (especial) {
    return { tipo: "especial", precio: grupo ? (especial.precioGrupo ?? especial.precio) : especial.precio, nombre: especial.nombre };
  }
  const tabla = grupo ? cfg.preciosGrupo : cfg.precios;
  const dia = diaSemana(fecha);
  // Sábado, domingo, día festivo o víspera de festivo.
  if (dia === 6 || dia === 0 || esFestivo(fecha) || esFestivo(sumarDias(fecha, 1))) {
    return { tipo: "finDeSemana", precio: tabla.finDeSemana };
  }
  if (dia === 5) return { tipo: "viernes", precio: tabla.viernes };
  return { tipo: "semana", precio: tabla.semana };
}

const aMil = (v: number) => Math.round(v / 1000) * 1000;

/** Código de colaborador ya validado por el servidor (ver lib/codigos.ts). */
export type CodigoAplicable = { codigo: string; porcentaje: number };

export type Cotizacion = {
  noches: { fecha: Fecha; precio: number; tipo: TipoNoche; nombre?: string }[];
  subtotal: number;
  /** `codigo` está puesto cuando el descuento que se aplicó es el de un código de colaborador. */
  descuento: { nombre: string; porcentaje: number; valor: number; codigo?: string } | null;
  /** El código es válido pero no rebajó nada, y por qué (se muestra al cliente). */
  codigoSinEfecto?: string;
  /** Hay noches a las que el código no se aplica (puente, fecha especial, festivo). */
  codigoParcial?: boolean;
  total: number;
  anticipo: number;
  saldo: number;
  minNoches: number;
};

function aplica(d: Descuento, entrada: Fecha, lista: { tipo: TipoNoche }[]): boolean {
  if (!d.activo || d.porcentaje <= 0) return false;
  if (d.tipo === "noches") return lista.length >= d.minNoches;
  // Entre semana: TODAS las noches tienen precio de semana (martes a jueves; no viernes, fin de
  // semana, festivo, víspera de festivo ni fecha especial). Una que no lo sea, y no aplica.
  if (d.tipo === "entreSemana") return lista.length >= d.minNoches && lista.every((n) => n.tipo === "semana");
  // Por meses: cuenta el mes del día de llegada, y entonces vale para toda la estadía (también las
  // noches que caigan en el mes siguiente, festivos y fines de semana incluidos). Sin meses: siempre.
  if (d.tipo === "meses") {
    const mes = Number(entrada.slice(5, 7));
    return lista.length >= d.minNoches && (d.meses.length === 0 || d.meses.includes(mes));
  }
  return entrada >= d.desde && entrada <= d.hasta;
}

/**
 * ¿Se le aplica un código de colaborador a esta noche? No en puentes, fechas especiales ni
 * festivos: esas fechas se llenan solas.
 */
export function nocheConCodigo(n: { fecha: Fecha; tipo: TipoNoche }): boolean {
  return n.tipo !== "puente" && n.tipo !== "especial" && !esFestivo(n.fecha);
}

export function cotizar(
  entrada: Fecha,
  salida: Fecha,
  cfg: ConfigPrecios,
  huespedes: number,
  codigo?: CodigoAplicable | null,
): Cotizacion {
  const lista = noches(entrada, salida).map((fecha) => ({ fecha, ...tipoNoche(fecha, cfg, huespedes) }));

  // Puente: si la estadía incluye el sábado y el domingo de un fin de semana con lunes festivo,
  // esas dos noches cuestan juntas el precio de puente, repartido entre las dos. Una sola de
  // ellas, sin la otra, se cobra a su precio normal.
  const precioPuente = huespedes > cfg.personasPrecioBase ? cfg.preciosGrupo.puente : cfg.precios.puente;
  for (let i = 0; i + 1 < lista.length; i++) {
    const [sab, dom] = [lista[i], lista[i + 1]];
    if (!sabadoDePuente(sab.fecha) || sab.tipo === "especial" || dom.tipo === "especial") continue;
    const mitad = Math.round(precioPuente / 2 / 1000) * 1000;
    lista[i] = { ...sab, tipo: "puente", precio: mitad, nombre: "Puente festivo" };
    lista[i + 1] = { ...dom, tipo: "puente", precio: precioPuente - mitad, nombre: "Puente festivo" };
    i++;
  }
  const subtotal = lista.reduce((s, n) => s + n.precio, 0);

  // Se aplica el mejor descuento disponible; no se acumulan.
  const mejor = cfg.descuentos
    .filter((d) => aplica(d, entrada, lista))
    .sort((a, b) => b.porcentaje - a.porcentaje)[0];
  let descuento: Cotizacion["descuento"] = mejor
    ? { nombre: mejor.nombre, porcentaje: mejor.porcentaje, valor: aMil((subtotal * mejor.porcentaje) / 100) }
    : null;

  // Código de colaborador: solo sobre las noches que lo admiten, y compite con los descuentos
  // automáticos (gana el que rebaje más; no se suman).
  let codigoSinEfecto: string | undefined;
  let codigoParcial: boolean | undefined;
  if (codigo) {
    const conCodigo = lista.filter(nocheConCodigo);
    const valor = aMil((conCodigo.reduce((s, n) => s + n.precio, 0) * codigo.porcentaje) / 100);
    if (valor <= 0) {
      codigoSinEfecto = "El código no aplica en puentes, fechas especiales ni festivos.";
    } else if (descuento && descuento.valor >= valor) {
      codigoSinEfecto = `Ya tienes un descuento mayor (${descuento.nombre}); no se suman.`;
    } else {
      descuento = { nombre: `Código ${codigo.codigo}`, porcentaje: codigo.porcentaje, valor, codigo: codigo.codigo };
      if (conCodigo.length < lista.length) codigoParcial = true;
    }
  }

  const total = subtotal - (descuento?.valor ?? 0);
  const anticipo = aMil((total * cfg.porcentajeAnticipo) / 100);
  return {
    noches: lista,
    subtotal,
    descuento,
    ...(codigoSinEfecto ? { codigoSinEfecto } : {}),
    ...(codigoParcial ? { codigoParcial } : {}),
    total,
    anticipo,
    saldo: total - anticipo,
    minNoches: cfg.minNoches,
  };
}

export function pesos(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
