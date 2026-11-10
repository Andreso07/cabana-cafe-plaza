// Datos de la cabaña. Todo lo que el dueño puede querer cambiar está aquí.
// Los precios son de EJEMPLO: ajústalos antes de publicar.

export const CABANA = {
  nombre: "Cabaña Café Plaza",
  municipio: "Consacá",
  departamento: "Nariño",
  vereda: "Vereda Caracol",
  capacidad: 6,
  checkIn: "3:00 p. m.",
  checkOut: "12:00 m.",
  // Número de WhatsApp con indicativo, sin "+" ni espacios. EJEMPLO.
  whatsapp: "573176954648",
  // Número del Registro Nacional de Turismo. Mientras sea null no se muestra.
  rnt: null as string | null,
  // Enlace de Google Maps a la cabaña. EJEMPLO.
  mapsUrl: "https://maps.google.com/?q=Consac%C3%A1,Nari%C3%B1o",
} as const;

// Pago por transferencia mientras Wompi no esté activo. Se muestra al cliente
// en la página de su reserva. Lo que esté en null no se muestra.
export const PAGO_MANUAL = {
  // Llave Bre-B: se paga desde Nequi o desde cualquier banco, sin costo.
  llaveBreB: "@3176954648" as string | null,
  nequi: null as string | null,
  titular: null as string | null,
} as const;

export const PRECIOS = {
  // Precio por noche, en pesos colombianos.
  nocheEntreSemana: 250_000,
  // Noches de viernes y sábado, y la noche anterior a un festivo.
  nocheFinDeSemana: 320_000,
  // Temporada alta: se aplica a la noche que empieza en estas fechas (MM-DD, ambos incluidos).
  nocheTemporadaAlta: 380_000,
  temporadasAltas: [
    { desde: "12-15", hasta: "01-15" },
    { desde: "06-15", hasta: "07-15" },
  ],
  // Mínimo de noches. En puentes festivos se exige más.
  minNoches: 1,
  minNochesPuente: 2,
  // Porcentaje que se paga al reservar (el resto, al llegar).
  porcentajeAnticipo: 50,
  // Minutos que una reserva sin pagar aparta las fechas: con Wompi el pago es
  // inmediato; por transferencia hay que dar tiempo a pagar y a revisar el comprobante.
  minutosApartado: 30,
  minutosApartadoManual: 240,
  // Días hacia adelante que se pueden reservar.
  diasMaximosAdelante: 365,
} as const;

export const SERVICIOS = [
  "Capacidad para 6 personas",
  "Vista a las montañas de Nariño",
  "Rodeada de cafetales",
  "Terraza",
  "Cocina equipada",
  "Parqueadero",
];

export const REGLAS = [
  `Entrada desde las ${CABANA.checkIn} y salida hasta las ${CABANA.checkOut}`,
  "Máximo 6 huéspedes",
  "No se permiten fiestas ni ruido después de las 10:00 p. m.",
  "No fumar dentro de la cabaña",
];
