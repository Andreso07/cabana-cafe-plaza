// Modo demostración: una copia de la web para mostrarle el sistema a otras cabañas. Cualquiera puede
// reservar y entrar al panel (usuario y clave a la vista), y cada noche todo vuelve a los datos de
// ejemplo. Doble candado para que JAMÁS toque una web real:
//   1. Solo funciona con la variable MODO_DEMO=1 (se pone a mano en Vercel, en el proyecto de la demo).
//   2. Solo reinicia una base vacía o marcada como demostración (`demo: true` en su configuración).
import { CONFIG_INICIAL, type Config, type Descuento } from "@/config/cabana";
import { db } from "./db";
import { hoyEnColombia, sumarDias, diaSemana, type Fecha } from "./fechas";
import { cotizar } from "./precios";

export const esDemo = () => process.env.MODO_DEMO === "1";

export class NoEsDemo extends Error {}

/** Lo que se cambia respecto a Cabaña Café Plaza (las fotos son las mismas; el nombre, no). */
function configDemo(hoy: Fecha): Config & { demo: true } {
  const promo: Descuento = {
    id: "demo-promo",
    nombre: "Promo relámpago",
    porcentaje: 20,
    activo: true,
    tipo: "compra",
    compraDesde: hoy,
    compraHasta: sumarDias(hoy, 2),
    desde: sumarDias(hoy, 3),
    hasta: sumarDias(hoy, 120),
    sinDesde: null,
    sinHasta: null,
    regalos: 3,
    regaloTexto: "una noche entre semana gratis",
  };
  return {
    ...CONFIG_INICIAL,
    demo: true,
    negocio: "Demostración",
    nombre: "Cabaña Demo",
    vereda: "Vereda El Ejemplo",
    redes: { facebook: "", instagram: "", tiktok: "" },
    heroTitulo: "Así se verá",
    heroDestacado: "la web de tu cabaña",
    heroSubtitulo: "Esta es una demostración: reserva, explora y entra al panel. Nada se cobra y todo vuelve a como estaba cada noche.",
    llaveBreB: "@demo-no-transferir",
    titular: "Demostración (no transfieras dinero)",
    descuentos: [
      { id: "demo-semana", nombre: "Entre semana", porcentaje: 10, activo: true, tipo: "entreSemana", minNoches: 2 },
      promo,
    ],
    fechasEspeciales: [],
    googleIcalUrl: "",
    calendarioToken: "",
    temporada: "auto",
    palabrasProhibidas: [],
    paleta: "cafetal",
    clarityId: "",
    googleVerificacion: "",
    descripcionGoogle: "Demostración de la web de reservas para cabañas: calendario, pagos, panel y promociones.",
    descripcionBanner: "cabaña con techo de teja roja y frente de vidrio entre cafetales, con montañas al fondo",
  };
}

const FOTOS = [
  "Frente de la cabaña de día",
  "La cabaña de noche",
  "Habitación principal",
  "Sala",
  "Cocina equipada",
  "Baño con agua caliente",
  "Vista desde el segundo piso",
  "Escalera de caracol",
];

const RESENAS = [
  { nombre: "Laura Martínez", calificacion: 5, comentario: "Un lugar para desconectarse de verdad. La vista en la mañana es increíble y la cabaña estaba impecable." },
  { nombre: "Andrés Pérez", calificacion: 5, comentario: "Reservar fue facilísimo desde el celular. Volveremos en vacaciones." },
  { nombre: "Familia Rosero", calificacion: 4, comentario: "Muy bonita y cómoda para cuatro. Lleven abrigo para la noche." },
];

function medidasJpeg(b: Buffer): { ancho: number; alto: number } {
  let i = 2;
  while (i + 9 < b.length) {
    const marca = b[i + 1];
    if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
      return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return { ancho: 1600, alto: 1200 };
}

/** Próximo día de la semana (0 = domingo) a partir de `desde` + `minimo` días. */
function proximo(desde: Fecha, dia: number, minimo: number): Fecha {
  let f = sumarDias(desde, minimo);
  while (diaSemana(f) !== dia) f = sumarDias(f, 1);
  return f;
}

/**
 * Deja la demostración como nueva: borra lo que hicieron los visitantes y vuelve a poner la
 * configuración, las fotos, el logo, reseñas, reservas, un bloqueo y un código de ejemplo.
 * `origen` es la dirección de la propia web, para leer las fotos de public/demo.
 */
export async function restablecerDemo(origen: string): Promise<void> {
  if (!esDemo()) throw new NoEsDemo("MODO_DEMO no está activado");
  const hoy = hoyEnColombia();
  const cfg = configDemo(hoy);

  // Las imágenes se descargan antes de abrir la transacción (no se tiene la base esperando la red).
  const bajar = async (ruta: string) => {
    const r = await fetch(new URL(ruta, origen));
    if (!r.ok) throw new Error(`No se pudo leer ${ruta}`);
    return Buffer.from(await r.arrayBuffer());
  };
  const fotos = await Promise.all(FOTOS.map(async (d, i) => ({ d, g: await bajar(`/demo/${i + 1}.jpg`), m: await bajar(`/demo/${i + 1}-mini.jpg`) })));
  const logo = await bajar("/demo/logo.png");

  // Reservas de ejemplo: un fin de semana pagado, una escapada entre semana y una por pagar.
  const viernes = proximo(hoy, 5, 2);
  const martes = proximo(hoy, 2, 9);
  const sabado = proximo(hoy, 6, 16);
  const reservas = [
    { codigo: "CP-DEMO01", entrada: viernes, salida: sumarDias(viernes, 2), nombre: "Camila Ortiz", estado: "confirmada" },
    { codigo: "CP-DEMO02", entrada: martes, salida: sumarDias(martes, 2), nombre: "Jorge Benavides", estado: "confirmada" },
    { codigo: "CP-DEMO03", entrada: sabado, salida: sumarDias(sabado, 1), nombre: "Valentina Ruiz", estado: "pendiente" },
  ].map((r) => {
    const q = cotizar(r.entrada, r.salida, { ...cfg, descuentos: [] }, 2);
    return { ...r, total: q.total, anticipo: q.anticipo };
  });
  const bloqueo = proximo(hoy, 1, 30);

  await db().begin(async (tx) => {
    // Candado 2: la base tiene que estar vacía o marcada como demostración.
    const [fila] = await tx<{ demo: string | null }[]>`select datos->>'demo' as demo from configuracion where id = 1 for update`;
    if (fila && fila.demo !== "true") throw new NoEsDemo("Esta base no es de demostración: no se toca nada");

    await tx`delete from reservas`;
    await tx`delete from bloqueos`;
    await tx`delete from resenas`;
    await tx`delete from fotos_huespedes`;
    await tx`delete from fotos_cabana`;
    await tx`delete from codigos_descuento`;
    await tx`delete from imagenes_sitio`;

    await tx`
      insert into configuracion (id, datos, actualizado_en) values (1, ${tx.json(cfg as never)}, now())
      on conflict (id) do update set datos = excluded.datos, actualizado_en = now()`;
    for (const [i, f] of fotos.entries()) {
      const { ancho, alto } = medidasJpeg(f.g);
      await tx`insert into fotos_cabana (descripcion, orden, imagen, miniatura, ancho, alto) values (${f.d}, ${i + 1}, ${f.g}, ${f.m}, ${ancho}, ${alto})`;
    }
    await tx`insert into imagenes_sitio (clave, tipo, imagen, ancho, alto) values ('logo', 'image/png', ${logo}, 256, 256)`;
    for (const r of RESENAS) {
      await tx`insert into resenas (nombre, calificacion, comentario, estado) values (${r.nombre}, ${r.calificacion}, ${r.comentario}, 'aprobada')`;
    }
    for (const r of reservas) {
      await tx`
        insert into reservas (codigo, entrada, salida, huespedes, nombre, documento, email, telefono, total, anticipo, estado, expira_en,
                              pago_proveedor, pago_id, pago_fecha)
        values (${r.codigo}, ${r.entrada}, ${r.salida}, 2, ${r.nombre}, '1000000', 'ejemplo@demo.test', '3000000000', ${r.total}, ${r.anticipo},
                ${r.estado}, now() + interval '2 days',
                ${r.estado === "confirmada" ? "simulado" : null}, ${r.estado === "confirmada" ? "DEMO" : null}, ${r.estado === "confirmada" ? new Date() : null})`;
    }
    await tx`insert into bloqueos (desde, hasta, motivo) values (${bloqueo}, ${sumarDias(bloqueo, 1)}, 'Mantenimiento (ejemplo)')`;
    await tx`insert into codigos_descuento (codigo, colaborador, porcentaje, vence) values ('DEMO10', 'Agencia de ejemplo', 10, ${sumarDias(hoy, 60)})`;
  });
}
