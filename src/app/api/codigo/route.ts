// Comprueba el código de colaborador que escribe el cliente y devuelve su porcentaje, para que el
// formulario muestre el precio con descuento. El precio que se cobra lo vuelve a calcular
// /api/reservas: lo que diga el navegador no cuenta.
import { NextResponse } from "next/server";
import { validarCodigo } from "@/lib/codigos";
import { bloqueado, ipDe, registrarIntento } from "@/lib/limite";

// Sin límite, alguien podría probar códigos hasta adivinar uno. Diez errores en 15 minutos desde
// una misma conexión alcanzan para quien se equivoca escribiendo.
const ERRORES = 10;
const VENTANA = 15 * 60_000;

export async function POST(req: Request) {
  const clave = `codigo:${ipDe(req)}`;
  if (bloqueado(clave, ERRORES, VENTANA)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { codigo?: unknown };
  const r = await validarCodigo(body.codigo);
  if (!r.ok) {
    registrarIntento(clave, VENTANA);
    return NextResponse.json({ error: r.error }, { status: 404 });
  }
  return NextResponse.json(r.codigo);
}
