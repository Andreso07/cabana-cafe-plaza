// El navegador avisa una vez por sesión que alguien abrió la web (ver ContadorVisitas).
// Los robots que no ejecutan JavaScript no cuentan, y una misma IP cuenta como mucho una
// vez cada 10 minutos.
import { NextResponse } from "next/server";
import { excedeLimite, ipDe } from "@/lib/limite";
import { sumarVisita } from "@/lib/resenas";

export async function POST(req: Request) {
  const agente = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|preview|headless/i.test(agente)) return new NextResponse(null, { status: 204 });
  if (!excedeLimite(`visita:${ipDe(req)}`, 1, 10 * 60_000)) await sumarVisita();
  return new NextResponse(null, { status: 204 });
}
