// Recibe UNA foto de un huésped (el navegador manda cada foto en su propia petición, así ninguna
// pasa del límite de 4,5 MB de Vercel). Queda «pendiente» hasta que el dueño la apruebe en el panel.
import { NextResponse } from "next/server";
import { crearFoto, DemasiadasPendientes, MAX_BYTES_FOTO, MAX_BYTES_MINI, MAX_LADO, medidasJpeg } from "@/lib/fotos";
import { excedeLimite, ipDe } from "@/lib/limite";
import { leerConfig } from "@/lib/config";
import { AVISO_LENGUAJE, lenguajeProhibido } from "@/lib/palabras";

const texto = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";

async function bytesDe(v: FormDataEntryValue | null, max: number): Promise<Buffer | null> {
  if (!(v instanceof Blob) || v.size === 0 || v.size > max) return null;
  return Buffer.from(await v.arrayBuffer());
}

export async function POST(req: Request) {
  // Antes de leer el cuerpo: un cuerpo enorme no llega ni a cargarse.
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES_FOTO + MAX_BYTES_MINI + 20_000) {
    return NextResponse.json({ error: "La foto es demasiado pesada." }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No llegó la foto. Intenta de nuevo." }, { status: 400 });

  // Campo trampa: invisible para personas; los robots lo llenan. Se responde «ok» sin guardar.
  if (texto(form.get("web"), 100)) return NextResponse.json({ ok: true }, { status: 201 });

  const nombre = texto(form.get("nombre"), 60);
  const comentario = texto(form.get("comentario"), 200) || null;
  const errores: string[] = [];
  if (nombre.length < 2) errores.push("Escribe tu nombre");
  // Va primero y solo: con el formulario de fotos, este aviso detiene el envío de todas las fotos.
  if (lenguajeProhibido([nombre, comentario], (await leerConfig()).palabrasProhibidas)) {
    return NextResponse.json({ error: AVISO_LENGUAJE }, { status: 400 });
  }
  if (form.get("acepta") !== "si") errores.push("Debes autorizar que publiquemos tus fotos");

  const imagen = await bytesDe(form.get("imagen"), MAX_BYTES_FOTO);
  const miniatura = await bytesDe(form.get("miniatura"), MAX_BYTES_MINI);
  const medidas = imagen && medidasJpeg(imagen);
  const medidasMini = miniatura && medidasJpeg(miniatura);
  if (!medidas || !medidasMini || Math.max(medidas.ancho, medidas.alto) > MAX_LADO || Math.max(medidasMini.ancho, medidasMini.alto) > 800) {
    errores.push("No pudimos leer la foto. Prueba con otra");
  }
  if (errores.length || !imagen || !miniatura || !medidas) {
    return NextResponse.json({ error: errores.join(". ") }, { status: 400 });
  }

  // Treinta por hora y no cinco: en la cabaña todos los huéspedes salen por el mismo wifi (misma IP).
  if (excedeLimite(`foto:${ipDe(req)}`, 30, 60 * 60_000)) {
    return NextResponse.json({ error: "Ya recibimos muchas fotos desde aquí. Gracias. Intenta más tarde." }, { status: 429 });
  }

  try {
    await crearFoto({ nombre, comentario, imagen, miniatura, ancho: medidas.ancho, alto: medidas.alto });
  } catch (e) {
    if (e instanceof DemasiadasPendientes) {
      return NextResponse.json({ error: "Ahora mismo no podemos recibir más fotos. Intenta en unos días." }, { status: 503 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
