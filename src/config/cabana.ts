// Configuración de la cabaña: textos, precios, fechas especiales y descuentos.
// Se edita desde el panel (/admin/configuracion) y se guarda en la base de datos;
// estos son los valores con los que arranca y los que se usan si la base aún no tiene nada.
// Valores tomados de la cotización real que se envía por WhatsApp.

// Fijos del sistema (no se editan desde el panel).
export const LIMITES = {
  diasMaximosAdelante: 365, // hasta cuándo se puede reservar
  minutosApartadoWompi: 30, // con pago en línea el pago es inmediato
};

export type Servicio ={ icono: string; titulo: string; detalle: string };

/** Un plan de la página «Qué hacer cerca». */
export type PlanCercano = { icono: string; titulo: string; texto: string };

/** Fechas con precio propio por noche (temporadas, Carnaval, eventos). Ambos días incluidos. */
export type FechaEspecial = {
  id: string;
  nombre: string;
  desde: string;
  hasta: string;
  precio: number; // por noche, hasta `personasPrecioBase` personas
  precioGrupo?: number; // por noche, para más personas; si falta, el mismo `precio`
};

export type Descuento = {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
} & (
  | { tipo: "noches"; minNoches: number } // estadías largas
  | { tipo: "fechas"; desde: string; hasta: string } // llegadas dentro de un rango
  | { tipo: "entreSemana"; minNoches: number } // todas las noches son de martes a jueves
  // Llegadas en ciertos meses (1 = enero). Vacío = todo el año, o sea, cualquier plan y fecha.
  | { tipo: "meses"; meses: number[]; minNoches: number }
  // Promoción por fecha de COMPRA (Black Friday, Cyber Monday): vale si se reserva entre compraDesde
  // y compraHasta (hora Colombia), llegando entre desde y hasta, y sin ninguna noche entre sinDesde y
  // sinHasta (fechas que se llenan solas, como el 24 al 31 de diciembre).
  | {
      tipo: "compra";
      compraDesde: string;
      compraHasta: string;
      desde: string;
      hasta: string;
      sinDesde: string | null;
      sinHasta: string | null;
      // Regalo para las primeras N reservas PAGADAS con la promoción (0 o sin poner = sin regalo).
      regalos?: number;
      regaloTexto?: string;
    }
);

export const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «enero y febrero», «todo el año». */
export function describirMeses(meses: number[]): string {
  if (meses.length === 0 || meses.length === 12) return "todo el año";
  const n = meses.map((m) => NOMBRES_MES[m - 1]);
  return n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}`;
}

/** Tarjeta de la sección «Planes». Es publicidad: lo que se cobra sale del precio de cada noche. */
export type Plan = {
  id: string;
  icono: string;
  nombre: string;
  precio: number;
  unidad: string; // «/ noche», «/ 2 noches»
  incluye: string[];
  destacado: boolean;
  // Qué fechas deja marcadas su botón: la próxima estadía libre de ese tipo (ver lib/sugerencias).
  sugerir?: "ninguno" | "martes" | "viernes" | "sabado" | "domingo" | "puente" | "festivo";
};

/** «auto»: la web elige sola según las fechas de cada temporada (cada año). */
export type Temporada = "auto" | "ninguna" | "navidad" | "halloween";

/** Días del año en formato «MM-DD» (sin año: se repiten cada año). */
export type Periodo = { desde: string; hasta: string };

export type Config = {
  negocio: string;
  nombre: string;
  vereda: string;
  municipio: string;
  departamento: string;
  comoLlegar: string;
  mapsUrl: string;
  whatsapp: string; // con indicativo, sin "+"
  rnt: string | null;
  // Responsable de los datos personales (Ley 1581): nombre o razón social y cédula o NIT.
  responsable: string;
  correoContacto: string;
  // Enlaces a redes sociales; vacío = no se muestra.
  redes: { facebook: string; instagram: string; tiktok: string };

  heroTitulo: string;
  heroDestacado: string;
  heroSubtitulo: string;

  capacidad: number;
  checkIn: string;
  checkOut: string;

  precios: {
    semana: number; // entre semana (martes a jueves; el lunes no se alquila salvo festivo)
    viernes: number;
    finDeSemana: number; // sábado, domingo, festivo y víspera de festivo
    puente: number; // las DOS noches juntas (sábado y domingo) de un fin de semana con lunes festivo
  };
  // Precio por noche cuando van más de `personasPrecioBase` personas (las «2 parejas»).
  preciosGrupo: {
    semana: number;
    viernes: number;
    finDeSemana: number;
    puente: number;
  };
  personasPrecioBase: number; // hasta cuántas personas aplica el precio de `precios` (1 pareja = 2)
  // Días de la semana cuya noche no se alquila (0 = domingo, 1 = lunes…), salvo que sea festivo.
  nochesCerradas: number[];
  porcentajeAnticipo: number;
  minNoches: number;
  horasApartado: number; // pago por transferencia
  llaveBreB: string | null;
  nequi: string | null;
  titular: string | null;
  requisitos: string; // lo que se pide además del pago

  servicios: Servicio[];
  noIncluye: string[];
  reglas: string[];
  cancelacion: string[];
  fechasEspeciales: FechaEspecial[];
  descuentos: Descuento[];
  planes: Plan[];

  // Google Calendar. La dirección secreta iCal del calendario donde se anotan las reservas
  // de WhatsApp: sus eventos ocupan noches en la web. Y la clave del enlace que Google lee
  // para ver las reservas de la web. Ninguna de las dos se muestra fuera del panel.
  googleIcalUrl: string;
  calendarioToken: string;

  // Temporada: viste la web (franja con mensaje, luces bajo la barra y nieve o murciélagos). Se
  // elige en el panel. `modoNavidad` es el interruptor de la v0.11, que se lee si no hay temporada.
  temporada: Temporada;
  // Fechas del modo automático. Navidad cruza de año (1 dic → 7 ene).
  fechasNavidad: Periodo;
  fechasHalloween: Periodo;
  modoNavidad: boolean;
  mensajeNavidad: string;
  mensajeHalloween: string;

  // Palabras o frases que el dueño agrega al filtro de lenguaje (además de la lista base de
  // src/lib/palabras.ts). Se rechazan en reseñas, fotos y reservas.
  palabrasProhibidas: string[];

  // Marca (para vender el sistema a otra cabaña sin tocar código).
  paleta: string; // id de src/lib/paletas.ts
  clarityId: string; // Microsoft Clarity; vacío = sin medición
  googleVerificacion: string; // código de la etiqueta HTML de Google Search Console; vacío = no se pone
  descripcionGoogle: string; // descripción para buscadores; {capacidad} se reemplaza por el número
  descripcionBanner: string; // texto alternativo de la foto del banner (lectores de pantalla, Google Imágenes)
  queHacer: PlanCercano[]; // página «Qué hacer cerca»; vacía = la página no existe
};

export const CONFIG_INICIAL: Config = {
  negocio: "Finca Guerrero's",
  nombre: "Cabaña Café Plaza",
  vereda: "Vereda Caracol",
  municipio: "Consacá",
  departamento: "Nariño",
  comoLlegar:
    "Vía Sandoná – Consacá, zona Rumipamba. A 15 minutos de Sandoná y 10 minutos de Consacá.",
  mapsUrl: "https://maps.google.com/?q=Rumipamba,Consac%C3%A1,Nari%C3%B1o",
  whatsapp: "573176954648",
  rnt: null,
  responsable: "",
  correoContacto: "",
  redes: { facebook: "https://www.facebook.com/profile.php?id=61575125516262", instagram: "", tiktok: "" },

  heroTitulo: "Despierta entre",
  heroDestacado: "cafetales y montañas",
  heroSubtitulo: "Una cabaña para descansar, ideal para pareja, entre Sandoná y Consacá.",

  capacidad: 6,
  checkIn: "4:00 p. m.",
  checkOut: "12:00 m.",

  precios: { semana: 150_000, viernes: 200_000, finDeSemana: 250_000, puente: 300_000 },
  // Los de la sección de planes: 2 parejas 250 / 300 / 450 mil por noche.
  preciosGrupo: { semana: 250_000, viernes: 350_000, finDeSemana: 450_000, puente: 500_000 },
  personasPrecioBase: 2,
  nochesCerradas: [1], // lunes, salvo festivo
  porcentajeAnticipo: 70,
  minNoches: 1,
  horasApartado: 4,
  llaveBreB: "@3176954648",
  nequi: null,
  titular: null,
  requisitos: "Foto de la cédula del responsable de la reserva.",

  servicios: [
    { icono: "📺", titulo: "TV con Netflix", detalle: "Y YouTube para la noche" },
    { icono: "📶", titulo: "Wifi", detalle: "Conectado cuando lo necesites" },
    { icono: "🧊", titulo: "Nevera", detalle: "Trae tus provisiones" },
    { icono: "🐶", titulo: "Pet-friendly", detalle: "Tu mascota también viene" },
    { icono: "🚗", titulo: "Parqueadero", detalle: "Dentro de la propiedad" },
    { icono: "⛰️", titulo: "Vista a las montañas", detalle: "Entre cafetales de Nariño" },
  ],
  noIncluye: ["Alimentación"],
  reglas: [
    "Capacidad máxima: 6 personas",
    "No se permiten fiestas ni ruido después de las 10:00 p. m.",
    "No fumar dentro de la cabaña",
  ],
  // BORRADOR: ajústalo a lo que de verdad vas a cumplir.
  cancelacion: [
    "Con 15 días o más de anticipación a la llegada: se devuelve el 100% del anticipo.",
    "Entre 14 y 7 días antes: se devuelve el 50% del anticipo o se cambia la fecha sin costo.",
    "Con menos de 7 días: no hay devolución; se puede cambiar la fecha una vez, sujeto a disponibilidad.",
    "Si por causa nuestra no podemos recibirte, devolvemos el 100% de lo pagado.",
  ],
  fechasEspeciales: [],
  descuentos: [],
  planes: [
    {
      id: "semana",
      sugerir: "martes",
      icono: "🌿",
      nombre: "Escapada entre semana",
      precio: 150000,
      unidad: "/ noche",
      incluye: ["Martes a jueves", "Cabaña completa, hasta 4 personas", "El precio más bajo de la semana"],
      destacado: false,
    },
    {
      id: "finde",
      sugerir: "viernes",
      icono: "☕",
      nombre: "Fin de semana",
      precio: 450000,
      unidad: "/ 2 noches",
      incluye: ["Llega el viernes, sal el domingo", "Viernes y sábado en la cabaña", "Ideal para pareja"],
      destacado: true,
    },
    {
      id: "puente",
      sugerir: "puente",
      icono: "🎉",
      nombre: "Puente festivo",
      precio: 700000,
      unidad: "/ 3 noches",
      incluye: ["De viernes a lunes festivo", "Tres noches para desconectarte", "Reserva con tiempo: se llena rápido"],
      destacado: false,
    },
  ],
  googleIcalUrl: "",
  calendarioToken: "",
  temporada: "ninguna",
  fechasNavidad: { desde: "12-01", hasta: "01-07" },
  fechasHalloween: { desde: "10-20", hasta: "10-31" },
  modoNavidad: false,
  mensajeNavidad: "🎄 ¡Feliz Navidad! Celebra el fin de año entre cafetales y montañas",
  mensajeHalloween: "🎃 ¡Feliz Halloween! Una noche de miedo (y de descanso) entre cafetales",
  palabrasProhibidas: [],
  paleta: "cafetal",
  clarityId: "zgpoalct90",
  googleVerificacion: "",
  descripcionGoogle:
    "Cabaña privada entre cafetales en Consacá, Nariño, cerca de Sandoná y Pasto. Hasta {capacidad} personas, vista a las montañas y reserva en línea.",
  descripcionBanner: "cabaña con techo de teja roja y frente de vidrio entre cafetales, con montañas al fondo",
  queHacer: [
    { icono: "☕", titulo: "Cafetales de Nariño", texto: "La cabaña está entre cafetales. Nariño es reconocido por su café de altura: madruga con una taza, camina entre las matas y mira cómo cambia la montaña con la luz." },
    { icono: "⛪", titulo: "Sandoná y su Basílica", texto: "El pueblo vecino es famoso por la Basílica de Nuestra Señora del Rosario, levantada en piedra por su propia gente, y por los sombreros y artesanías tejidos en paja toquilla. Ideal para una tarde de paseo y compras." },
    { icono: "🏛️", titulo: "Bomboná, historia en Consacá", texto: "En Consacá se libró en 1822 la Batalla de Bomboná, de la campaña de independencia. El sitio histórico y su monumento quedan muy cerca." },
    { icono: "🌋", titulo: "Faldas del Galeras", texto: "Consacá está en las faldas del volcán Galeras. Los paisajes de montaña, los miradores y los atardeceres de la zona son el mejor plan sin salir de la cabaña." },
    { icono: "🍯", titulo: "Trapiches de panela", texto: "En la región de Sandoná y Consacá se cultiva caña y se hace panela en trapiches tradicionales. Pregunta en la zona y prueba la panela recién hecha." },
    { icono: "🍲", titulo: "Comida típica", texto: "No te vayas sin probar el cuy asado, las empanadas de añejo y el helado de paila, clásicos de la cocina nariñense." },
    { icono: "🎭", titulo: "Carnaval de Negros y Blancos", texto: "En los primeros días de enero, Pasto celebra su carnaval, Patrimonio de la Humanidad. Una escapada a la cabaña es un buen descanso antes o después de la fiesta." },
  ],
};
