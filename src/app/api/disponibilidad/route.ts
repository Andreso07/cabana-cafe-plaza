import { NextResponse } from "next/server";
import { obtenerNochesOcupadas } from "@/lib/store";
import { hoyEnColombia } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export async function GET() {
  const ocupadas = await obtenerNochesOcupadas();
  return NextResponse.json({ hoy: hoyEnColombia(), ocupadas });
}
