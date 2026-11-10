"use server";
// Acciones del panel. Todas exigen sesión de administrador antes de tocar nada.
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Descuento, Servicio } from "@/config/cabana";
import { cerrarSesion, claveCorrecta, esAdmin, iniciarSesion } from "@/lib/admin";
import { guardarConfig, leerConfig } from "@/lib/config";
import { esFechaValida } from "@/lib/fechas";
import {
  cancelarReserva,
  confirmarPago,
  crearBloqueo,
  obtenerReserva,
  quitarBloqueo,
} from "@/lib/store";

const CONFIG = "/admin/configuracion";

async function exigirAdmin() {
  if (!(await esAdmin())) redirect("/admin/entrar");
}

function texto(form: FormData, clave: string, max = 300): string {
  return String(form.get(clave) ?? "").trim().slice(0, max);
}

class Invalido extends Error {}

function numero(form: FormData, clave: string, etiqueta: string, min: number, max: number): number {
  const crudo = texto(form, clave, 20).replace(/[.\s$]/g, "").replace(",", ".");
  const n = Number(crudo);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Invalido(`${etiqueta}: debe ser un número entre ${min.toLocaleString("es-CO")} y ${max.toLocaleString("es-CO")}`);
  }
  return Math.round(n);
}

function lineas(form: FormData, clave: string): string[] {
  return texto(form, clave, 5000)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);
}

/** Guarda cambios de configuración y vuelve a la sección con un aviso. */
async function guardar(seccion: string, construir: () => Promise<Parameters<typeof guardarConfig>[0]>) {
  await exigirAdmin();
  try {
    await guardarConfig(await construir());
  } catch (e) {
    if (e instanceof Invalido) redirect(`${CONFIG}?error=${encodeURIComponent(e.message)}#${seccion}`);
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`${CONFIG}?ok=${seccion}#${seccion}`);
}

// ---------- Sesión ----------

export async function entrar(form: FormData) {
  if (!claveCorrecta(String(form.get("clave") ?? ""))) redirect("/admin/entrar?error=1");
  await iniciarSesion();
  redirect("/admin");
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/entrar");
}

// ---------- Reservas ----------

export async function marcarPagada(form: FormData) {
  await exigirAdmin();
  const codigo = texto(form, "codigo", 20);
  const r = await obtenerReserva(codigo);
  if (!r) return;
  await confirmarPago(codigo, r.anticipo, {
    proveedor: "manual",
    id: texto(form, "referencia", 60) || "sin referencia",
    fecha: new Date().toISOString(),
  });
  revalidatePath("/admin");
}

export async function cancelar(form: FormData) {
  await exigirAdmin();
  await cancelarReserva(texto(form, "codigo", 20));
  revalidatePath("/admin");
}

export async function bloquear(form: FormData) {
  await exigirAdmin();
  const desde = texto(form, "desde", 10);
  const hasta = texto(form, "hasta", 10) || desde;
  if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) return;
  await crearBloqueo(desde, hasta, texto(form, "motivo", 80) || "Bloqueado");
  revalidatePath("/admin");
}

export async function desbloquear(form: FormData) {
  await exigirAdmin();
  await quitarBloqueo(texto(form, "id", 20));
  revalidatePath("/admin");
}

// ---------- Configuración ----------

export async function guardarTextos(form: FormData) {
  await guardar("textos", async () => {
    const nombre = texto(form, "nombre", 80);
    if (!nombre) throw new Invalido("El nombre de la cabaña no puede quedar vacío");
    const mapsUrl = texto(form, "mapsUrl", 500);
    if (mapsUrl && !/^https:\/\//.test(mapsUrl)) throw new Invalido("El enlace de Maps debe empezar por https://");
    return {
      nombre,
      negocio: texto(form, "negocio", 80),
      vereda: texto(form, "vereda", 80),
      municipio: texto(form, "municipio", 80),
      departamento: texto(form, "departamento", 80),
      heroTitulo: texto(form, "heroTitulo", 60),
      heroDestacado: texto(form, "heroDestacado", 60),
      heroSubtitulo: texto(form, "heroSubtitulo", 200),
      comoLlegar: texto(form, "comoLlegar", 300),
      mapsUrl: mapsUrl || (await leerConfig()).mapsUrl,
      responsable: texto(form, "responsable", 150),
      correoContacto: texto(form, "correoContacto", 120),
      rnt: texto(form, "rnt", 30) || null,
    };
  });
}

export async function guardarPrecios(form: FormData) {
  await guardar("precios", async () => {
    let whatsapp = texto(form, "whatsapp", 20).replace(/\D/g, "");
    if (whatsapp.length === 10) whatsapp = `57${whatsapp}`;
    if (!/^57\d{10}$/.test(whatsapp)) throw new Invalido("WhatsApp: escribe el celular de 10 dígitos");
    return {
      precios: {
        semana: numero(form, "semana", "Domingo a jueves", 10_000, 10_000_000),
        viernes: numero(form, "viernes", "Viernes", 10_000, 10_000_000),
        finDeSemana: numero(form, "finDeSemana", "Sábado y festivos", 10_000, 10_000_000),
      },
      porcentajeAnticipo: numero(form, "porcentajeAnticipo", "Porcentaje para separar", 1, 100),
      minNoches: numero(form, "minNoches", "Noches mínimas", 1, 30),
      horasApartado: numero(form, "horasApartado", "Horas de apartado", 1, 72),
      capacidad: numero(form, "capacidad", "Capacidad", 1, 30),
      checkIn: texto(form, "checkIn", 30),
      checkOut: texto(form, "checkOut", 30),
      whatsapp,
      llaveBreB: texto(form, "llaveBreB", 60) || null,
      nequi: texto(form, "nequi", 30) || null,
      titular: texto(form, "titular", 80) || null,
      requisitos: texto(form, "requisitos", 200),
    };
  });
}

export async function guardarListas(form: FormData) {
  await guardar("listas", async () => {
    const servicios: Servicio[] = lineas(form, "servicios").map((l) => {
      const [icono = "✔️", titulo = "", detalle = ""] = l.split("|").map((p) => p.trim());
      return { icono: icono.slice(0, 8), titulo: titulo.slice(0, 40), detalle: detalle.slice(0, 60) };
    });
    if (servicios.some((s) => !s.titulo)) {
      throw new Invalido("Servicios: cada línea es «ícono | título | detalle», y el título no puede faltar");
    }
    return {
      servicios,
      noIncluye: lineas(form, "noIncluye"),
      reglas: lineas(form, "reglas"),
      cancelacion: lineas(form, "cancelacion"),
    };
  });
}

const nuevoId = () => randomBytes(4).toString("hex");

export async function agregarFechaEspecial(form: FormData) {
  await guardar("fechas", async () => {
    const desde = texto(form, "desde", 10);
    const hasta = texto(form, "hasta", 10) || desde;
    if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) {
      throw new Invalido("Fecha especial: revisa las fechas (la final no puede ser antes de la inicial)");
    }
    const nombre = texto(form, "nombre", 60);
    if (!nombre) throw new Invalido("Fecha especial: ponle un nombre, por ejemplo «Carnaval de Negros y Blancos»");
    const cfg = await leerConfig();
    const precio = numero(form, "precio", "Precio por noche", 10_000, 10_000_000);
    return {
      fechasEspeciales: [...cfg.fechasEspeciales, { id: nuevoId(), nombre, desde, hasta, precio }].sort((a, b) =>
        a.desde.localeCompare(b.desde),
      ),
    };
  });
}

export async function quitarFechaEspecial(form: FormData) {
  await guardar("fechas", async () => {
    const id = texto(form, "id", 20);
    const cfg = await leerConfig();
    return { fechasEspeciales: cfg.fechasEspeciales.filter((f) => f.id !== id) };
  });
}

export async function agregarDescuento(form: FormData) {
  await guardar("descuentos", async () => {
    const nombre = texto(form, "nombre", 60);
    if (!nombre) throw new Invalido("Descuento: ponle un nombre, por ejemplo «Semana completa»");
    const porcentaje = numero(form, "porcentaje", "Porcentaje de descuento", 1, 90);
    const tipo = texto(form, "tipo", 10);
    let d: Descuento;
    if (tipo === "noches") {
      d = { id: nuevoId(), nombre, porcentaje, activo: true, tipo, minNoches: numero(form, "minNoches", "Desde cuántas noches", 2, 60) };
    } else {
      const desde = texto(form, "desde", 10);
      const hasta = texto(form, "hasta", 10) || desde;
      if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) {
        throw new Invalido("Descuento por fechas: revisa las fechas");
      }
      d = { id: nuevoId(), nombre, porcentaje, activo: true, tipo: "fechas", desde, hasta };
    }
    const cfg = await leerConfig();
    return { descuentos: [...cfg.descuentos, d] };
  });
}

export async function alternarDescuento(form: FormData) {
  await guardar("descuentos", async () => {
    const id = texto(form, "id", 20);
    const cfg = await leerConfig();
    return { descuentos: cfg.descuentos.map((d) => (d.id === id ? { ...d, activo: !d.activo } : d)) };
  });
}

export async function quitarDescuento(form: FormData) {
  await guardar("descuentos", async () => {
    const id = texto(form, "id", 20);
    const cfg = await leerConfig();
    return { descuentos: cfg.descuentos.filter((d) => d.id !== id) };
  });
}
