import { NextResponse } from "next/server";
import { LIMITES } from "@/config/cabana";
import { leerConfig } from "@/lib/config";
import { diasEntre, esFechaValida, hoyEnColombia } from "@/lib/fechas";
import { cotizar } from "@/lib/precios";
import { eventosExternos, nochesDe } from "@/lib/calendario";
import { sincronizarDespues } from "@/lib/googleCalendar";
import { crearReserva, FechasNoDisponibles } from "@/lib/store";
import { wompiConfigurado } from "@/lib/wompi";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const cfg = await leerConfig();

  const { entrada, salida } = body;
  const huespedes = Number(body.huespedes);
  const nombre = texto(body.nombre, 100);
  const documento = texto(body.documento, 20).replace(/[^0-9A-Za-z]/g, "");
  const email = texto(body.email, 120).toLowerCase();
  const telefono = texto(body.telefono, 20).replace(/[^0-9+]/g, "");

  const errores: string[] = [];
  if (!esFechaValida(entrada) || !esFechaValida(salida)) errores.push("Fechas inválidas");
  else {
    const hoy = hoyEnColombia();
    if (entrada < hoy) errores.push("La fecha de llegada ya pasó");
    if (salida <= entrada) errores.push("La salida debe ser después de la llegada");
    if (diasEntre(hoy, entrada) > LIMITES.diasMaximosAdelante) {
      errores.push("Todavía no se reciben reservas para esas fechas");
    }
  }
  if (!Number.isInteger(huespedes) || huespedes < 1 || huespedes > cfg.capacidad) {
    errores.push(`El número de huéspedes debe estar entre 1 y ${cfg.capacidad}`);
  }
  if (nombre.length < 3) errores.push("Escribe tu nombre completo");
  if (documento.length < 5) errores.push("Escribe tu número de documento");
  if (!EMAIL.test(email)) errores.push("Correo inválido");
  if (telefono.replace("+", "").length < 7) errores.push("Teléfono inválido");
  if (body.aceptaDatos !== true) errores.push("Debes autorizar el tratamiento de datos");
  if (body.aceptaTerminos !== true) errores.push("Debes aceptar las condiciones de reserva");
  if (errores.length) return NextResponse.json({ error: errores.join(". ") }, { status: 400 });

  // El precio lo calcula el servidor con la configuración vigente, nunca el navegador.
  const cot = cotizar(entrada as string, salida as string, cfg);
  if (cot.noches.length < cot.minNoches) {
    return NextResponse.json(
      { error: `La estadía mínima es de ${cot.minNoches} noches` },
      { status: 400 },
    );
  }

  // Lo que el agente de WhatsApp anotó en Google Calendar también ocupa la noche.
  const externas = nochesDe((await eventosExternos()).eventos);
  if (cot.noches.some((n) => externas.has(n.fecha))) {
    return NextResponse.json(
      { error: "Alguien acaba de reservar esas fechas. Elige otras, por favor." },
      { status: 409 },
    );
  }

  try {
    const reserva = await crearReserva(
      {
        entrada: entrada as string,
        salida: salida as string,
        huespedes,
        nombre,
        documento,
        email,
        telefono,
        total: cot.total,
        anticipo: cot.anticipo,
        descuento: cot.descuento?.valor ?? 0,
        descuentoNombre: cot.descuento?.nombre,
      },
      wompiConfigurado() ? LIMITES.minutosApartadoWompi : cfg.horasApartado * 60,
    );
    sincronizarDespues();
    return NextResponse.json({ codigo: reserva.codigo }, { status: 201 });
  } catch (e) {
    if (e instanceof FechasNoDisponibles) {
      return NextResponse.json(
        { error: "Alguien acaba de reservar esas fechas. Elige otras, por favor." },
        { status: 409 },
      );
    }
    throw e;
  }
}
