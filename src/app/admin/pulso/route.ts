// Aviso de «sigo aquí» del panel. No hace nada por sí mismo: proxy.ts ya renovó la cookie al
// pasar la petición. Responde 401 si la sesión venció, para que el navegador vuelva a «Entrar».
import { esAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(null, { status: (await esAdmin()) ? 204 : 401, headers: { "cache-control": "no-store" } });
}
