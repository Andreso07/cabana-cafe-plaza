/**
 * Enlaces del mapa a partir del enlace de Google Maps que el dueño pega en el panel. Si el enlace trae
 * las coordenadas del sitio (`!3d…!4d…` del lugar, o `@lat,lng` del encuadre) se usan, que es lo más
 * exacto; si no, se busca por nombre.
 */
export function coordenadasDe(mapsUrl: string): { lat: number; lng: number } | null {
  const lugar = mapsUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const encuadre = mapsUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = lugar ?? encuadre;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function enlacesDelMapa(mapsUrl: string, busqueda: string) {
  const c = coordenadasDe(mapsUrl);
  const destino = c ? `${c.lat},${c.lng}` : busqueda;
  return {
    // Mapa pequeño para la página (no necesita clave de Google).
    incrustado: `https://maps.google.com/maps?q=${encodeURIComponent(destino)}&z=14&output=embed`,
    // Abre Google Maps (la app en el celular) con la ruta desde donde esté la persona.
    ruta: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`,
    waze: c ? `https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(busqueda)}&navigate=yes`,
  };
}
