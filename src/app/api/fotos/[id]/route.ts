// Entrega una foto de huésped. Las aprobadas las ve cualquiera; las pendientes u ocultas, solo el
// dueño con su sesión del panel. ?t=mini da la miniatura y ?descargar=1 la baja como archivo.
import { esAdmin } from "@/lib/admin";
import { leerImagen } from "@/lib/fotos";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const mini = url.searchParams.get("t") === "mini";
  const foto = await leerImagen(id, mini);
  const publica = foto?.estado === "aprobada";
  // Mismo 404 para «no existe» y «no la puedes ver»: no se revela qué fotos hay sin aprobar.
  if (!foto || (!publica && !(await esAdmin()))) return new Response("No encontrada", { status: 404 });

  const cabeceras: Record<string, string> = {
    "Content-Type": "image/jpeg",
    // Una foto que se oculta deja de verse pronto: caché de una hora, no de un año.
    "Cache-Control": publica ? "public, max-age=3600" : "private, no-store",
  };
  if (url.searchParams.get("descargar") === "1") {
    cabeceras["Content-Disposition"] = `attachment; filename="foto-huesped-${id}.jpg"`;
  }
  return new Response(new Uint8Array(foto.bytes), { headers: cabeceras });
}
