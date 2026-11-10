// Solo para probar en local sin llaves de Wompi. En producción no existe.
import { NextResponse } from "next/server";
import { confirmarPago, obtenerReserva } from "@/lib/store";
import { wompiConfigurado } from "@/lib/wompi";

export async function POST(_req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  if (wompiConfigurado() || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  const { codigo } = await ctx.params;
  const reserva = await obtenerReserva(codigo);
  if (!reserva) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const r = await confirmarPago(codigo, reserva.anticipo, {
    proveedor: "simulado",
    id: `SIM-${Date.now()}`,
    fecha: new Date().toISOString(),
  });
  return NextResponse.json(r.ok ? { ok: true } : r, { status: r.ok ? 200 : 409 });
}
