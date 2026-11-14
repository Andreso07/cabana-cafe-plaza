// Enlace .ics que Google Calendar agrega con «Desde URL». La clave va en la ruta porque
// Google no sabe mandar cabeceras; quien tenga el enlace ve nombres y teléfonos, así que
// solo se muestra en el panel, y desde allí se puede cambiar si se filtra.
import { timingSafeEqual } from "node:crypto";
import { generarIcs } from "@/lib/calendario";
import { leerConfig } from "@/lib/config";
import { listarBloqueos, reservasParaCalendario } from "@/lib/store";

export const dynamic = "force-dynamic";

function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(_req: Request, { params }: RouteContext<"/api/calendario/[token]">) {
  const { token } = await params;
  const cfg = await leerConfig();
  const pedido = token.replace(/\.ics$/, "");
  if (!cfg.calendarioToken || !iguales(pedido, cfg.calendarioToken)) {
    return new Response("No encontrado", { status: 404 });
  }
  const [reservas, bloqueos] = await Promise.all([reservasParaCalendario(), listarBloqueos()]);
  return new Response(generarIcs(cfg.nombre, reservas, bloqueos), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
