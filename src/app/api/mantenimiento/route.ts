// Visita diaria que hace Vercel (ver vercel.json). Dos motivos:
//  1. Supabase, en el plan gratis, pausa la base tras 7 días sin uso; una consulta al día lo evita.
//  2. Quita de Google Calendar las reservas que vencieron sin pago aunque nadie haya entrado a la web.
// Es pública a propósito (no pide clave): solo lee, y la sincronización con Google se hace como
// mucho una vez cada 10 minutos, así que llamarla de más no cuesta nada.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sincronizarDespues } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const [{ reservas }] = await db()<{ reservas: number }[]>`select count(*)::int as reservas from reservas`;
  sincronizarDespues(10);
  return NextResponse.json({ ok: true, reservas, en: new Date().toISOString() });
}
