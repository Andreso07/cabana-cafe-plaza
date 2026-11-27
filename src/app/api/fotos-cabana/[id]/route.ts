// Entrega una foto de la cabaña. Son públicas: salen en la portada. ?t=mini da la miniatura.
import { leerImagenCabana } from "@/lib/fotosCabana";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bytes = await leerImagenCabana(id, new URL(req.url).searchParams.get("t") === "mini");
  if (!bytes) return new Response("No encontrada", { status: 404 });
  // Una foto nunca cambia (reemplazarla es subir otra, con otro número), así que el celular la
  // guarda 30 días. Al borrarla deja de salir en la página enseguida; solo quien ya la tenía
  // guardada podría seguir viéndola con la dirección directa. El optimizador de imágenes copia
  // este tiempo a las versiones AVIF/WebP de la galería.
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=2592000" },
  });
}
