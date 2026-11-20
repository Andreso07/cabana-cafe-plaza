// Entrega una foto de la cabaña. Son públicas: salen en la portada. ?t=mini da la miniatura.
import { leerImagenCabana } from "@/lib/fotosCabana";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bytes = await leerImagenCabana(id, new URL(req.url).searchParams.get("t") === "mini");
  if (!bytes) return new Response("No encontrada", { status: 404 });
  // Una foto borrada deja de verse pronto: caché de una hora, no de un año.
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
