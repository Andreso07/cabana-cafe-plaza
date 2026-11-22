/**
 * Ícono (emoji) de una tarjeta que hace algo distinto según lo que es: la fiesta explota en confeti,
 * el corazón late, la hoja se mece… Los íconos los elige el dueño en el panel, así que se reconocen
 * por el emoji y lo que no está en la lista da una vuelta. El movimiento lo pone globals.css
 * (`.icono-vivo`): al pasar el mouse por la tarjeta, o al aparecer en pantalla en el celular.
 */
const ANIMACIONES: [string, string[]][] = [
  ["explota", ["🎉", "🎊", "🥳", "🎆", "🎇", "✨", "🎈"]],
  ["late", ["❤️", "❤", "💕", "💖", "💗", "💘", "💑", "💏", "😍", "🌹", "🥂", "🍷"]],
  ["mece", ["🌿", "🍃", "🌱", "🌳", "🌴", "🌾", "☘️", "🍀", "🌻", "🌸"]],
  ["humea", ["☕", "🍵", "🔥", "🍲", "🫖"]],
  ["rebota", ["🏡", "🏠", "🛖", "⛺", "👨‍👩‍👧‍👦", "👨‍👩‍👧", "👪", "🐶", "🐕", "🐾"]],
  ["sube", ["⛰️", "⛰", "🏔️", "🌄", "🌅", "☀️", "🌞"]],
  ["parpadea", ["📺", "📶", "💡", "📱"]],
  ["tiembla", ["🧊", "❄️", "🥶"]],
  ["avanza", ["🚗", "🚙", "🏍️", "🚲", "🚌"]],
];

export function animacionDe(emoji: string): string {
  const limpio = emoji.trim();
  return ANIMACIONES.find(([, lista]) => lista.includes(limpio))?.[0] ?? "gira";
}

export function IconoVivo({ emoji, className = "" }: { emoji: string; className?: string }) {
  const animacion = animacionDe(emoji);
  return (
    <span className={`icono-vivo relative ${className}`} data-anim={animacion} aria-hidden>
      <span className="emoji inline-block">{emoji}</span>
      {animacion === "explota" &&
        // Confeti: ocho papelitos que salen disparados en círculo.
        Array.from({ length: 8 }, (_, i) => <span key={i} className="papelito" style={{ "--i": i } as React.CSSProperties} />)}
    </span>
  );
}
