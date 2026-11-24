// Visita diaria que hace Vercel (ver vercel.json). Tres motivos:
//  1. Supabase, en el plan gratis, pausa la base tras 7 días sin uso; una consulta al día lo evita.
//  2. Quita de Google Calendar las reservas que vencieron sin pago aunque nadie haya entrado a la web.
//  3. En la web de DEMOSTRACIÓN (MODO_DEMO=1), deja todo como nuevo para el día siguiente.
// Es pública a propósito (no pide clave): solo lee, y la sincronización con Google se hace como
// mucho una vez cada 10 minutos, así que llamarla de más no cuesta nada. El reinicio de la demo
// tampoco cuesta: vuelve a los mismos datos de ejemplo, y en una web real no hace nada.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { esDemo, restablecerDemo } from "@/lib/demo";
import { sincronizarDespues } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Basta con que la base conteste; no se devuelve cuántas reservas hay (es pública).
  await db()`select 1`;
  sincronizarDespues(10);
  if (esDemo()) await restablecerDemo(new URL(req.url).origin);
  return NextResponse.json({ ok: true, en: new Date().toISOString() });
}
