// Prepara la base de datos de un CLIENTE NUEVO: crea las tablas (db/schema.sql) y guarda una
// configuración neutral, sin los datos de Cabaña Café Plaza (WhatsApp, Clarity, textos, planes de
// la zona…). Así la web nueva nunca muestra datos de otra cabaña mientras el cliente llena su panel.
//
// Uso (PowerShell, desde la carpeta del proyecto):
//   $env:DATABASE_URL = "postgresql://...:5432/postgres"   # la del Supabase DEL CLIENTE
//   node scripts/cliente-nuevo.mjs --nombre "Cabaña El Roble" --municipio "Sibundoy" --departamento "Putumayo" --whatsapp 573001234567
//
// Si la base ya tiene una configuración guardada, se detiene: nunca pisa los datos de nadie.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const postgres = createRequire(import.meta.url)("postgres");

function opcion(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > 0 ? (process.argv[i + 1] ?? "").trim() : "";
}
const nombre = opcion("nombre");
const municipio = opcion("municipio");
const departamento = opcion("departamento");
const whatsapp = opcion("whatsapp").replace(/\D/g, "");
const url = process.env.DATABASE_URL ?? "";

const faltan = [
  !url && "la variable DATABASE_URL (la del Supabase del cliente)",
  !nombre && "--nombre",
  !municipio && "--municipio",
  !departamento && "--departamento",
  !/^57\d{10}$/.test(whatsapp) && "--whatsapp con indicativo, por ejemplo 573001234567",
].filter(Boolean);
if (faltan.length) {
  console.error(`Falta: ${faltan.join(", ")}.`);
  process.exit(1);
}

// La configuración neutral: lo que cambia de una cabaña a otra queda vacío o genérico. Lo demás
// (precios de ejemplo, reglas, cancelación) sale de los valores por defecto del código y el
// cliente lo ajusta en el panel.
const config = {
  negocio: nombre,
  nombre,
  vereda: "",
  municipio,
  departamento,
  comoLlegar: `Escríbenos por WhatsApp y te enviamos la ubicación.`,
  mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${municipio}, ${departamento}`)}`,
  whatsapp,
  rnt: null,
  responsable: "",
  correoContacto: "",
  redes: { facebook: "", instagram: "", tiktok: "" },
  heroTitulo: "Tu escapada en",
  heroDestacado: municipio,
  heroSubtitulo: `Una cabaña para descansar en ${municipio}, ${departamento}.`,
  llaveBreB: null,
  nequi: null,
  titular: null,
  servicios: [
    { icono: "📶", titulo: "Wifi", detalle: "Conectado cuando lo necesites" },
    { icono: "🚗", titulo: "Parqueadero", detalle: "Dentro de la propiedad" },
    { icono: "⛰️", titulo: "Naturaleza", detalle: "Aire puro y tranquilidad" },
  ],
  fechasEspeciales: [],
  descuentos: [],
  googleIcalUrl: "",
  calendarioToken: randomBytes(16).toString("hex"),
  temporada: "auto",
  mensajeNavidad: `🎄 ¡Feliz Navidad! Celebra el fin de año en ${nombre}`,
  mensajeHalloween: `🎃 ¡Feliz Halloween! Una noche de miedo (y de descanso) en ${nombre}`,
  palabrasProhibidas: [],
  paleta: "cafetal",
  clarityId: "",
  googleVerificacion: "",
  descripcionGoogle: `Cabaña privada en ${municipio}, ${departamento}. Hasta {capacidad} personas y reserva en línea.`,
  descripcionBanner: `vista de ${nombre}`,
  queHacer: [],
};

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 20, onnotice: () => {} });
try {
  const esquema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  await sql.unsafe(esquema);
  console.log("✓ Tablas creadas o ya existentes (db/schema.sql).");

  const [ya] = await sql`select 1 as hay from configuracion where id = 1`;
  if (ya) {
    console.error("✗ Esta base YA tiene una configuración guardada. No toco nada: ¿es de otro cliente?");
    process.exitCode = 1;
  } else {
    await sql`insert into configuracion (id, datos, actualizado_en) values (1, ${sql.json(config)}, now())`;
    const [r] = await sql`select (select count(*) from reservas)::int as reservas`;
    console.log(`✓ Configuración inicial de «${nombre}» guardada (reservas en la base: ${r.reservas}).`);
    console.log("\nSiguiente: entra a /admin y completa Marca (logo y banner), Textos, Precios y Planes.");
  }
} catch (e) {
  console.error("✗ Error:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
