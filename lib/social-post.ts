import { SITE_URL, formatCOP, waLink } from "@/lib/site";
import config from "@/data/config.json";
import postCards from "@/data/post-cards.json";

export interface PostCard {
  slug: string;
  nombre: string;
  precio: number;
  precioAnterior: number | null;
  descripcion: string;
  categoria: string;
  contenido: string[];
  imagen: string;
}

const CARDS = postCards.cards as PostCard[];

/** Limpia colas del scraping ("Contenido:", "** sujeto a disponibilidad", etc.). */
function cleanDesc(s: string): string {
  return (s || "")
    .replace(/^\s*Contenido:\s*/i, "")
    .replace(/\*\*[\s\S]*$/, "")
    .replace(/Calificaci[oó]n:[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Bogotá = UTC-5 (sin horario de verano).
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

function bogota(now: Date) {
  const ms = now.getTime() + BOGOTA_OFFSET_MS;
  const d = new Date(ms);
  return { dayNumber: Math.floor(ms / 86_400_000), hour: d.getUTCHours(), iso: d.toISOString().slice(0, 10) };
}

/** Franja del día: 0 = mañana (~9), 1 = mediodía (~12), 2 = tarde (~16). */
export function currentSlot(now: Date): number {
  const { hour } = bogota(now);
  if (hour < 11) return 0;
  if (hour < 15) return 1;
  return 2;
}

/** Elige el post del momento (rotación determinista por día+franja, sin estado). */
export function pickPost(
  now: Date,
  opts: { slot?: number; slug?: string } = {}
): { card: PostCard | null; slot: number } {
  if (!CARDS.length) return { card: null, slot: 0 };
  if (opts.slug) {
    return { card: CARDS.find((c) => c.slug === opts.slug) ?? null, slot: currentSlot(now) };
  }
  const { dayNumber } = bogota(now);
  const slot = opts.slot != null && [0, 1, 2].includes(opts.slot) ? opts.slot : currentSlot(now);
  const idx = ((dayNumber * 3 + slot) % CARDS.length + CARDS.length) % CARDS.length;
  return { card: CARDS[idx], slot };
}

const HOOKS = [
  "Hay sorpresas que se recuerdan toda la vida ✨",
  "¿Buscas el detalle perfecto? Aquí está 🎁",
  "Sorpréndela hoy mismo, sin moverte de casa 💝",
  "Dile lo que sientes con un detalle inolvidable 💛",
];
const BASE_TAGS = [
  "#sorpresas", "#sorpresasbogota", "#regalosbogota", "#regalosadomicilio",
  "#regalosadomiciliobogota", "#detallesconamor", "#sorpresasadomicilio", "#bogota",
];
const TAG_MAP: [RegExp, string[]][] = [
  [/desayuno|brunch|breakfast/i, ["#desayunosorpresa", "#desayunoadomicilio"]],
  [/flor|rosa|ramo/i, ["#floresbogota", "#ramodeflores"]],
  [/cumple/i, ["#regalosdecumpleaños", "#felizcumpleaños"]],
  [/amor|novi|aniversario|san valent/i, ["#regalosparaenamorados", "#regalosdeamor"]],
  [/fresa|chocolate|choco/i, ["#fresasconchocolate"]],
  [/ancheta|caja|combo/i, ["#anchetasbogota"]],
];

export function buildHashtags(card: PostCard): string[] {
  const hay = `${card.nombre} ${card.categoria}`;
  const extra = TAG_MAP.filter(([re]) => re.test(hay)).flatMap(([, t]) => t);
  return [...new Set([...BASE_TAGS, ...extra])].slice(0, 16);
}

export function buildCaption(card: PostCard, now: Date): string {
  const hook = HOOKS[(bogota(now).dayNumber + currentSlot(now)) % HOOKS.length];
  const incluye =
    card.contenido.length > 0
      ? `\n\n🎁 Incluye: ${card.contenido.slice(0, 3).join(", ")}.`
      : card.descripcion
      ? `\n\n${cleanDesc(card.descripcion).slice(0, 140)}`
      : "";
  const wa = String(config.whatsapp).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  return (
    `${hook}\n\n${card.nombre}.${incluye}\n\n` +
    `💛 ${formatCOP(card.precio)}\n` +
    `📲 Pídelo por WhatsApp: ${wa}\n` +
    `📍 Entrega el mismo día en toda Bogotá\n\n` +
    buildHashtags(card).join(" ")
  );
}

/** Objeto JSON que consume tu automatización. */
export function postToJson(card: PostCard, now: Date, slot: number) {
  const hashtags = buildHashtags(card);
  return {
    slot,
    fecha: bogota(now).iso,
    generatedAt: now.toISOString(),
    slug: card.slug,
    nombre: card.nombre,
    precio: card.precio,
    precioFormateado: formatCOP(card.precio),
    precioAnterior: card.precioAnterior,
    descripcion: cleanDesc(card.descripcion),
    caption: buildCaption(card, now),
    hashtags,
    imageUrl: `${SITE_URL}${card.imagen}`,
    productUrl: `${SITE_URL}/producto/${card.slug}`,
    whatsappUrl: waLink(`Hola! Quiero pedir ${card.nombre}`),
  };
}
