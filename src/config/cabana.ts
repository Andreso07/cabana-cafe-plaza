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

/** Fechas con precio propio por noche (temporadas, Carnaval, eventos). Ambos días incluidos. */
export type FechaEspecial = { id: string; nombre: string; desde: string; hasta: string; precio: number };

export type Descuento = {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
} & (
  | { tipo: "noches"; minNoches: number } // estadías largas
  | { tipo: "fechas"; desde: string; hasta: string } // llegadas dentro de un rango
);

/** Tarjeta de la sección «Planes». Es publicidad: lo que se cobra sale del precio de cada noche. */
export type Plan = {
  id: string;
  icono: string;
  nombre: string;
  precio: number;
  unidad: string; // «/ noche», «/ 2 noches»
  incluye: string[];
  destacado: boolean;
};

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

  heroTitulo: string;
  heroDestacado: string;
  heroSubtitulo: string;

  capacidad: number;
  checkIn: string;
  checkOut: string;

  precios: {
    semana: number; // domingo a jueves
    viernes: number;
    finDeSemana: number; // sábado, festivos y víspera de festivo
  };
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

  heroTitulo: "Despierta entre",
  heroDestacado: "cafetales y montañas",
  heroSubtitulo: "Una cabaña para descansar, ideal para pareja, entre Sandoná y Consacá.",

  capacidad: 6,
  checkIn: "4:00 p. m.",
  checkOut: "12:00 m.",

  precios: { semana: 150_000, viernes: 200_000, finDeSemana: 250_000 },
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
      icono: "🌿",
      nombre: "Escapada entre semana",
      precio: 150000,
      unidad: "/ noche",
      incluye: ["Domingo a jueves", "Cabaña completa, hasta 6 personas", "El precio más bajo de la semana"],
      destacado: false,
    },
    {
      id: "finde",
      icono: "☕",
      nombre: "Fin de semana",
      precio: 450000,
      unidad: "/ 2 noches",
      incluye: ["Llega el viernes, sal el domingo", "Viernes y sábado en la cabaña", "Ideal para pareja"],
      destacado: true,
    },
    {
      id: "puente",
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
};
