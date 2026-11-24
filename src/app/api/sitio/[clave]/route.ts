// Imágenes de la marca: GET las sirve a todos; POST (subir) y DELETE (volver a la original) solo el dueño.
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin";
import { borrarImagenSitio, esClave, guardarImagenSitio, leerImagenSitio, LIMITES, medidasImagen, POR_DEFECTO } from "@/lib/imagenesSitio";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ clave: string }> }) {
  const { clave } = await ctx.params;
  if (!esClave(clave)) return new NextResponse(null, { status: 404 });
  const f = await leerImagenSitio(clave).catch(() => null);
  if (!f) return NextResponse.redirect(new URL(POR_DEFECTO[clave], req.url), 307);
  // Con ?v= la dirección cambia en cada subida, así que puede guardarse un año.
  const conVersion = new URL(req.url).searchParams.has("v");
  return new NextResponse(new Uint8Array(f.imagen), {
    headers: {
      "content-type": f.tipo,
      "cache-control": conVersion ? "public, max-age=31536000, immutable" : "public, max-age=300",
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ clave: string }> }) {
  if (!(await esAdmin())) return NextResponse.json({ error: "Tu sesión se cerró. Vuelve a entrar al panel." }, { status: 401 });
  const { clave } = await ctx.params;
  if (!esClave(clave)) return NextResponse.json({ error: "Imagen desconocida." }, { status: 404 });
  const limite = LIMITES[clave];
  if (Number(req.headers.get("content-length") ?? 0) > limite.bytes + 20_000) {
    return NextResponse.json({ error: "La imagen es demasiado pesada." }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  const archivo = form?.get("imagen");
  if (!(archivo instanceof Blob) || archivo.size === 0 || archivo.size > limite.bytes) {
    return NextResponse.json({ error: "No llegó la imagen o pesa demasiado." }, { status: 400 });
  }
  const bytes = Buffer.from(await archivo.arrayBuffer());
  const m = medidasImagen(bytes);
  if (!m || !limite.tipos.includes(m.tipo) || Math.max(m.ancho, m.alto) > limite.lado || m.ancho < 16 || m.alto < 16) {
    return NextResponse.json({ error: "No pudimos leer la imagen. Prueba con otra." }, { status: 400 });
  }
  await guardarImagenSitio(clave, m.tipo, bytes, m.ancho, m.alto);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ clave: string }> }) {
  if (!(await esAdmin())) return NextResponse.json({ error: "Tu sesión se cerró." }, { status: 401 });
  const { clave } = await ctx.params;
  if (!esClave(clave)) return NextResponse.json({ error: "Imagen desconocida." }, { status: 404 });
  await borrarImagenSitio(clave);
  return NextResponse.json({ ok: true });
}
