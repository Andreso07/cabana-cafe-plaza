"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useSyncExternalStore } from "react";
import { esDispositivoDelDueno } from "@/lib/sinMedicion";

// La cookie no avisa cuando cambia; basta leerla al pintar.
const sinSuscripcion = () => () => {};

/**
 * Mide cómo se usa la web pública. No corre en el panel (lo que ve el dueño no es tráfico de
 * clientes y tiene datos de las reservas), ni en desarrollo (no ensucia los mapas con pruebas),
 * ni en los navegadores donde el dueño entró al panel (sus visitas no son de clientes).
 * Lo que se escribe en formularios lo tapa Clarity con el enmascaramiento «Estricto».
 */
export function Clarity({ id }: { id: string }) {
  const ruta = usePathname();
  // La marca del dueño es una cookie del navegador. En el servidor se asume «del dueño» (sin
  // Clarity), y el navegador decide al hidratar: así lo que pintan los dos coincide.
  const delDueno = useSyncExternalStore(sinSuscripcion, esDispositivoDelDueno, () => true);
  // El número del proyecto de Clarity se pone en el panel (no es secreto: viaja en cada visita).
  // Solo letras y números, para que nada raro termine dentro del script.
  if (process.env.NODE_ENV !== "production" || ruta.startsWith("/admin") || !/^[a-z0-9]{6,20}$/i.test(id)) return null;
  if (delDueno) return null;
  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`}
    </Script>
  );
}
