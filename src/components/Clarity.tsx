"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

// ID del proyecto de Microsoft Clarity (mapas de calor y grabaciones anónimas). No es secreto: el
// navegador lo envía a Clarity en cada visita.
const ID_CLARITY = "zgpoalct90";

/**
 * Mide cómo se usa la web pública. No corre en el panel (lo que ve el dueño no es tráfico de
 * clientes y tiene datos de las reservas) ni en desarrollo (no ensucia los mapas con pruebas).
 * Lo que se escribe en formularios lo tapa Clarity con el enmascaramiento «Estricto».
 */
export function Clarity() {
  const ruta = usePathname();
  if (process.env.NODE_ENV !== "production" || ruta.startsWith("/admin")) return null;
  return (
    <Script id="clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${ID_CLARITY}");`}
    </Script>
  );
}
