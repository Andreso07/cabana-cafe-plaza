// Se ejecuta antes de cada petición al panel (/admin/...). Si la sesión sigue viva, renueva la
// hora de «última actividad» en la cookie; si venció por inactividad, la borra. Así cada clic,
// F5 o cambio de sección cuenta como actividad, y 30 minutos sin nada cierran la sesión.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, inicioDeSesion, opcionesCookie, valorSesion } from "@/lib/sesion";

export function proxy(req: NextRequest) {
  const valor = req.cookies.get(COOKIE)?.value;
  if (!valor) return NextResponse.next();

  const inicio = inicioDeSesion(valor);
  if (inicio === null) {
    // Venció: se quita también de la petición, para que la página ya la vea cerrada.
    req.cookies.delete(COOKIE);
    const res = NextResponse.next({ request: { headers: req.headers } });
    res.cookies.delete(COOKIE);
    return res;
  }
  const res = NextResponse.next();
  res.cookies.set(COOKIE, valorSesion(inicio), opcionesCookie);
  return res;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
