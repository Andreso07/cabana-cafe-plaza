/**
 * Filtro de lenguaje ofensivo y amenazas para lo que escriben los visitantes (reseñas, fotos,
 * reservas). Rechaza el envío con un aviso; no reemplaza la moderación del panel, la complementa.
 *
 * Cómo compara, para no dejarse engañar ni bloquear palabras sanas:
 *  - Sin mayúsculas, sin tildes y con los trucos comunes deshechos: «P#t@», «put4», «puuuuta»,
 *    «p u t a» y «p.u.t.a» se leen como «puta».
 *  - Por palabra completa, no por pedazos: «computadora» o «disputa» no chocan con «puta».
 *  - Las raíces (terminadas en *) cubren a toda la familia: «malparid*» → malparido, malparida…
 *  - Las frases de amenaza se buscan como frase («te voy a matar»).
 *
 * El dueño agrega más en el panel (Configuración → Palabras no permitidas).
 */

/**
 * Diccionario base, por categorías. Cada palabra se probó contra frases normales de reseñas para no
 * bloquear lo que no es ofensivo. Por eso NO están, a propósito:
 *  - «chimba» («qué chimba» es un elogio), «mamar» («mamar gallo»), «coger», «paja» (sombreros de
 *    paja), «pajero» (la camioneta), «polla», «cuca» (también es un nombre), «mariquita» (el insecto),
 *    «arepera» (quien vende arepas), «puñal», «sapo», «rata(s)» y «basura» (pueden ser quejas reales),
 *    «retrasado» (vuelo retrasado), «dick» (también es un nombre), «negro», «indio», «gordo», «loco», «burro», «animal»;
 *  - raíces que tocan palabras sanas: «puto*» tocaría «Putumayo», «foll*» tocaría «folleto».
 * Lo que falte para este negocio se agrega en el panel.
 */
export const PALABRAS_BASE = [
  // Insultos fuertes (Colombia y Latinoamérica)
  "hijueput*", "hijoeput*", "hijodeput*", "hijuepuerca", "jueputa*", "hpta", "hp", "hdp", "hdpta", "ptm",
  "gonorre*", "malparid*", "malnacid*", "pirob*", "careverga*", "carenalga*", "careculo*", "carechimba*",
  "caremonda*", "caremierda*", "mamaguev*", "mamahuev*", "huevon*", "guevon*", "webon*", "weon*",
  "pendej*", "cabron*", "cretin*", "imbecil*", "idiota*", "estupid*", "tarad*", "subnormal*", "mongolic*",
  "gilipoll*", "sinverguenza*", "lameculo*", "chupamedia*", "cachon", "cachones", "cornud*",
  // Groserías y lenguaje sexual
  "puta", "putas", "puto", "putos", "putica*", "putita*", "puteria*", "putear", "puteo", "puteado*",
  "mierda*", "mierdero*", "verga", "vergas", "vergazo*", "monda", "mondas", "culo", "culos", "culon*",
  "culiad*", "culear*", "culeando", "culiar*", "culicagad*", "cagad*", "cagon*", "cagar", "cago", "ojete*",
  "orto", "panocha*", "tetas", "tetona*", "follar", "follando", "follame", "follada*", "chupame*",
  "chupamelo", "chupamela", "chupala", "chupalo", "mamamela", "mamamelo", "mamala", "mamalo", "coño",
  "joder", "jodete", "jodanse", "porno*", "xxx", "zorra", "zorras", "perra", "perras", "zunga*", "guaricha*",
  // Discriminación (homofobia, racismo, xenofobia)
  "marica", "maricas", "marika", "marikas", "maricon*", "maric*n", "cacorro*", "bujarron*", "joto", "jotos",
  "travelo*", "sodomita*", "sudaca*", "veneco*", "negrata*",
  // Inglés
  "fuck*", "motherfuck*", "shit", "shitty", "bitch*", "asshole*", "bastard*", "cunt*",
  "pussy", "whore*", "slut*", "nigg*", "fag", "fags", "faggot*", "retard*",
];

/**
 * Amenazas y violencia: se buscan como frase. Solo frases que no tienen otro sentido: «la vista es una
 * bomba», «voy a quemar calorías», «prenderle fuego a la fogata» o «te vas a morir de amor con la
 * vista» o «que se mueran de envidia» son elogios y no deben bloquearse.
 */
export const FRASES_BASE = [
  // Matar o hacer daño
  "te voy a matar", "los voy a matar", "las voy a matar", "lo voy a matar", "la voy a matar", "voy a matarte",
  "voy a matarlos", "te vamos a matar", "los vamos a matar", "las vamos a matar", "los matamos", "te mato",
  "los mato", "las mato", "te pego un tiro", "te meto un tiro", "un tiro en la cabeza", "les voy a meter plomo",
  "te voy a meter plomo", "les vamos a meter plomo", "te voy a hacer daño", "les voy a hacer daño",
  "les vamos a hacer daño", "te voy a desaparecer", "los vamos a desaparecer", "te voy a violar",
  "las voy a violar", "te voy a romper la cara", "les voy a romper la cara", "te voy a partir la cara",
  // Fuego y explosivos
  "te voy a quemar", "le voy a quemar", "les voy a quemar", "voy a quemar la cabaña", "vamos a quemar la cabaña",
  "le voy a prender fuego", "les voy a prender fuego", "le vamos a prender fuego", "les vamos a prender fuego",
  "poner una bomba", "ponerles una bomba", "les pongo una bomba", "les ponemos una bomba", "volar la cabaña",
  "volarles la casa", "dinamita", "explosivo", "explosivos", "atentado",
  // Intimidación y extorsión
  "les va a pasar algo", "te va a pasar algo", "sabemos donde viven", "se donde vives", "sabemos donde vives",
  "se van a arrepentir", "te vas a arrepentir", "secuestro", "secuestrar", "secuestrarlos", "extorsion",
  "extorsionar", "pagar la vacuna", "boleteo", "sicario", "sicarios",
  // Deseos de muerte
  "deberian morir", "deberian matarlos", "muerte a los",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i", "|": "l", "€": "e" };

/** Texto a minúsculas sin tildes, con los números y signos-letra traducidos y las letras repetidas juntadas. */
export function normalizar(texto: string): string {
  // La ñ se conserva (si no, «coño» quedaría igual a «cono», el de helado).
  const sinTildes = texto
    .toLowerCase()
    .replace(/ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/[01345789@$!|€]/g, (c) => LEET[c] ?? c);
  // «puuuuuta» → «puta». Dos letras iguales se conservan («perro», «llamar»).
  return sinTildes.replace(/([a-zñ])\1{2,}/g, "$1$1");
}

/**
 * Un signo que tapa una letra dentro de una palabra («p#ta», «m*erda», «p%to») se prueba con cada
 * vocal. Como mucho dos signos por palabra (25 variantes).
 */
function variantesConSignos(p: string): string[] {
  const signos = (p.match(/[#%*]/g) ?? []).length;
  if (signos === 0) return [p];
  if (signos > 2 || !/[a-zñ]/.test(p)) return [p.replace(/[#%*]/g, "")];
  let salida = [p];
  for (let i = 0; i < signos; i++) {
    salida = salida.flatMap((v) => [..."aeiou"].map((vocal) => v.replace(/[#%*]/, vocal)));
  }
  return salida;
}

/** Palabras sueltas del texto; une las letras separadas («p u t a», «p.u.t.a» → «puta»). */
function palabras(texto: string): string[] {
  const crudas = normalizar(texto)
    .split(/[^a-zñ#%*]+/)
    .filter(Boolean)
    .flatMap(variantesConSignos)
    .filter((p) => /[a-zñ]/.test(p));
  const salida: string[] = [];
  let letras = "";
  for (const p of crudas) {
    if (p.length === 1) {
      letras += p;
      continue;
    }
    if (letras) salida.push(letras);
    letras = "";
    salida.push(p);
  }
  if (letras) salida.push(letras);
  return salida;
}

/** Para comparar «puuta» con «puta» también tras juntar las dobles. */
const sinDobles = (p: string) => p.replace(/([a-zñ])\1+/g, "$1");

function coincide(palabra: string, patron: string): boolean {
  const variantes = [palabra, sinDobles(palabra)];
  if (patron.includes("*")) {
    const re = new RegExp(`^${patron.split("*").map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[a-zñ]*")}$`);
    return variantes.some((v) => re.test(v));
  }
  return variantes.includes(patron);
}

/**
 * ¿El texto tiene algo prohibido? Devuelve lo que encontró (para el registro), o null si está limpio.
 * `extra` son las palabras o frases que el dueño agregó en el panel.
 */
export function lenguajeProhibido(textos: (string | null | undefined)[], extra: string[] = []): string | null {
  const patronesPalabra: string[] = [];
  const patronesFrase: string[] = [];
  for (const crudo of [...PALABRAS_BASE, ...FRASES_BASE, ...extra]) {
    const n = normalizar(crudo).replace(/[^a-zñ* ]+/g, " ").replace(/\s+/g, " ").trim();
    if (!n) continue;
    (n.includes(" ") ? patronesFrase : patronesPalabra).push(n);
  }
  for (const texto of textos) {
    if (!texto) continue;
    const lista = palabras(texto);
    const encontrada = lista.find((p) => patronesPalabra.some((pat) => coincide(p, pat)));
    if (encontrada) return encontrada;
    const unido = ` ${lista.join(" ")} `;
    const frase = patronesFrase.find((f) => unido.includes(` ${f} `));
    if (frase) return frase;
  }
  return null;
}

export const AVISO_LENGUAJE =
  "Tu mensaje tiene palabras que no están permitidas en la página. Por favor cámbialas y vuelve a enviarlo.";
