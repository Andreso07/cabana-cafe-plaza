import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas:
//  - Nadie puede meter la web dentro de otra página (frame) para engañar con clics falsos sobre el panel.
//  - El navegador no «adivina» el tipo de un archivo (evita que un texto se ejecute como código).
//  - Al salir hacia otra web (WhatsApp, Facebook) no se envía la dirección completa: las páginas
//    /reserva/CP-XXXX llevan el código de la reserva en la dirección.
//  - La web no pide cámara, micrófono ni ubicación.
const cabeceras = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

// Sin cacheComponents: las páginas de reserva y el panel leen datos que cambian
// a cada momento y se marcan con `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {
  poweredByHeader: false, // no anunciar con qué está hecha la web
  images: {
    // AVIF pesa cerca de la mitad que WebP: la foto del banner llega antes en celulares lentos.
    formats: ["image/avif", "image/webp"],
    // Las fotos de public/ solo cambian al publicar una versión nueva; el celular las guarda 31 días.
    minimumCacheTTL: 2_678_400,
  },
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
