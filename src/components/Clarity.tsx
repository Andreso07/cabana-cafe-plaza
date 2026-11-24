"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";


/**
 * Mide cómo se usa la web pública. No corre en el panel (lo que ve el dueño no es tráfico de
 * clientes y tiene datos de las reservas) ni en desarrollo (no ensucia los mapas con pruebas).
 * Lo que se escribe en formularios lo tapa Clarity con el enmascaramiento «Estricto».
 */
export function Clarity({ id }: { id: string }) {
  const ruta = usePathname();
  // El número del proyecto de Clarity se pone en el panel (no es secreto: viaja en cada visita).
  // Solo letras y números, para que nada raro termine dentro del script.
  if (process.env.NODE_ENV !== "production" || ruta.startsWith("/admin") || !/^[a-z0-9]{6,20}$/i.test(id)) return null;
  return (
    <Script id="clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`}
    </Script>
  );
}
