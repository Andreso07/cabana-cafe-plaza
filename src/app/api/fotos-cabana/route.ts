// Recibe UNA foto de la cabaña desde el panel. Solo el dueño, con su sesión.
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin";
import { MAX_BYTES_FOTO, MAX_BYTES_MINI, MAX_LADO, medidasJpeg } from "@/lib/fotos";
import { crearFotoCabana, DemasiadasFotos, MAX_FOTOS_CABANA } from "@/lib/fotosCabana";

async function bytesDe(v: FormDataEntryValue | null, max: number): Promise<Buffer | null> {
  if (!(v instanceof Blob) || v.size === 0 || v.size > max) return null;
  return Buffer.from(await v.arrayBuffer());
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "Tu sesión se cerró. Vuelve a entrar al panel." }, { status: 401 });
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES_FOTO + MAX_BYTES_MINI + 20_000) {
    return NextResponse.json({ error: "La foto es demasiado pesada." }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No llegó la foto." }, { status: 400 });

  const imagen = await bytesDe(form.get("imagen"), MAX_BYTES_FOTO);
  const miniatura = await bytesDe(form.get("miniatura"), MAX_BYTES_MINI);
  const medidas = imagen && medidasJpeg(imagen);
  const medidasMini = miniatura && medidasJpeg(miniatura);
  if (!imagen || !miniatura || !medidas || !medidasMini || Math.max(medidas.ancho, medidas.alto) > MAX_LADO || Math.max(medidasMini.ancho, medidasMini.alto) > 800) {
    return NextResponse.json({ error: "No pudimos leer la foto. Prueba con otra." }, { status: 400 });
  }
  const descripcion = String(form.get("descripcion") ?? "").trim().replace(/\s+/g, " ").slice(0, 80) || null;
  try {
    await crearFotoCabana({ descripcion, imagen, miniatura, ancho: medidas.ancho, alto: medidas.alto });
  } catch (e) {
    if (e instanceof DemasiadasFotos) {
      return NextResponse.json({ error: `Ya tienes ${MAX_FOTOS_CABANA} fotos. Borra alguna para subir más.` }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
