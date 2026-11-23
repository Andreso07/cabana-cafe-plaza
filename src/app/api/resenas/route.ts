// Recibe una reseña. Queda «pendiente» hasta que el dueño la apruebe en el panel.
import { NextResponse } from "next/server";
import { excedeLimite, ipDe } from "@/lib/limite";
import { crearResena } from "@/lib/resenas";
import { leerConfig } from "@/lib/config";
import { AVISO_LENGUAJE, lenguajeProhibido } from "@/lib/palabras";

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Campo trampa: invisible para personas; los robots lo llenan. Se responde «ok» sin guardar.
  if (texto(body.web, 100)) return NextResponse.json({ ok: true }, { status: 201 });

  const nombre = texto(body.nombre, 60);
  const comentario = (typeof body.comentario === "string" ? body.comentario.trim() : "").slice(0, 600);
  const calificacion = Number(body.calificacion);
  const codigo = texto(body.codigo, 20).toUpperCase() || null;

  const errores: string[] = [];
  if (nombre.length < 2) errores.push("Escribe tu nombre");
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) errores.push("Elige de 1 a 5 estrellas");
  if (comentario.length < 5) errores.push("Cuéntanos un poco más en el comentario");
  if (body.acepta !== true) errores.push("Debes autorizar que publiquemos tu reseña");
  if (errores.length) return NextResponse.json({ error: errores.join(". ") }, { status: 400 });
  if (lenguajeProhibido([nombre, comentario], (await leerConfig()).palabrasProhibidas)) {
    return NextResponse.json({ error: AVISO_LENGUAJE }, { status: 400 });
  }

  // Solo cuentan las reseñas válidas: equivocarse al llenar no gasta el cupo. Diez por hora y
  // no tres, porque en la cabaña todos los huéspedes salen a internet por el mismo wifi (misma IP).
  if (excedeLimite(`resena:${ipDe(req)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Ya recibimos tus reseñas. Gracias. Intenta más tarde." }, { status: 429 });
  }

  await crearResena({ nombre, calificacion, comentario, codigo });
  return NextResponse.json({ ok: true }, { status: 201 });
}
