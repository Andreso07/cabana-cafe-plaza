// Solo para el navegador: reduce una foto antes de subirla.

/**
 * La foto de un celular pesa 3–8 MB y aquí queda en unos 300 KB. Al redibujarla en un lienzo
 * también se pierden los datos ocultos del archivo (EXIF), entre ellos la ubicación GPS.
 */
export async function reducirImagen(archivo: File, lado: number, calidad: number): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d")!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  return new Promise((ok, mal) =>
    lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("sin imagen"))), "image/jpeg", calidad),
  );
}

/** ¿Parece una imagen? Algunos celulares no ponen el tipo a las fotos HEIC. */
export const esImagen = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
