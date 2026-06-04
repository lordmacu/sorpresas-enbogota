import { SITE_URL, formatCOP } from "@/lib/site";
import categorias from "@/data/categorias.json";

// Categorías temáticas aptas para un reel (se excluyen las genéricas tipo
// "más vendidos" / "promociones" que no son un tema coherente).
const REEL_CATEGORIES = [
  "para-papa", "para-mama", "para-ella", "para-el", "amor", "san-valentin",
  "cumpleanos", "anchetas-de-cumpleanos", "grados", "amor-amistad",
  "desayunos-sorpresas", "flores-rosas", "fresas-con-chocolate", "ninos-1",
  "navidad", "quinceanera", "pasion-futbolera", "baby-shower",
  "mejorate-pronto", "halloween", "ramos-de-flores-aniversario", "cajas-magicas",
];

// Etiqueta natural para el caption.
const TEMA: Record<string, string> = {
  "para-papa": "papá", "para-mama": "mamá", "para-ella": "ella", "para-el": "él",
  "amor": "tu amor", "san-valentin": "San Valentín", "cumpleanos": "un cumpleaños",
  "anchetas-de-cumpleanos": "un cumpleaños", "grados": "un grado",
  "amor-amistad": "amor y amistad", "desayunos-sorpresas": "la mañana",
  "flores-rosas": "regalar flores", "fresas-con-chocolate": "los golosos",
  "ninos-1": "los niños", "navidad": "Navidad", "quinceanera": "unos quince",
  "pasion-futbolera": "el hincha de la casa", "baby-shower": "un baby shower",
  "mejorate-pronto": "desear pronta mejoría", "halloween": "Halloween",
  "ramos-de-flores-aniversario": "un aniversario", "cajas-magicas": "sorprender en grande",
};

interface ScrapedProducto {
  slug: string;
  nombre: string;
  precio: number;
  imagen: string;
  visible?: boolean;
}

const catName = (slug: string) =>
  categorias.categorias.find((c) => c.slug === slug)?.nombre || slug;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadProducts(slug: string): Promise<ScrapedProducto[]> {
  try {
    const data = await import(`@/data/scraped/${slug}.json`);
    return (data.productos as ScrapedProducto[]).filter(
      (p) => p.imagen && p.imagen.startsWith("/images/cards/") && p.visible !== false
    );
  } catch {
    return [];
  }
}

/** Elige una categoría (random o dada) y `count` productos distintos de ella. */
export async function pickReel(opts: { categoria?: string; count?: number } = {}) {
  const count = Math.min(Math.max(opts.count ?? 3, 3), 6);
  if (opts.categoria) {
    const prods = await loadProducts(opts.categoria);
    if (prods.length < 3) return null;
    return { slug: opts.categoria, nombre: catName(opts.categoria), items: shuffle(prods).slice(0, count) };
  }
  // 1ª pasada: categorías con al menos `count` productos (para honrar el pedido)
  for (const slug of shuffle(REEL_CATEGORIES)) {
    const prods = await loadProducts(slug);
    if (prods.length >= count) {
      return { slug, nombre: catName(slug), items: shuffle(prods).slice(0, count) };
    }
  }
  // 2ª pasada: si ninguna llega a `count`, baja a 3 y devuelve lo que haya
  for (const slug of shuffle(REEL_CATEGORIES)) {
    const prods = await loadProducts(slug);
    if (prods.length >= 3) {
      return { slug, nombre: catName(slug), items: shuffle(prods).slice(0, count) };
    }
  }
  return null;
}

// 2026: pocos hashtags y locales; el alcance lo da el SEO del caption.
const BASE_TAGS = ["#regalosbogota", "#sorpresasbogota", "#regalosadomiciliobogota"];

export function buildReelJson(reel: { slug: string; nombre: string; items: ScrapedProducto[] }) {
  const web = SITE_URL.replace(/^https?:\/\//, "");
  const items = reel.items.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    precio: p.precio,
    precioFormateado: formatCOP(p.precio),
    imageUrl: `${SITE_URL}/api/card/${p.slug}`, // JPEG (compatible con Instagram)
    productUrl: `${SITE_URL}/producto/${p.slug}`,
  }));
  const tema = TEMA[reel.slug] || reel.nombre.toLowerCase();
  const caption =
    `${items.length} ideas para sorprender en ${reel.nombre} 🎁\n` +
    `Regalos a domicilio en Bogotá · entrega el mismo día.\n\n` +
    items.map((it, i) => `${["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"][i]} ${it.nombre} — ${it.precioFormateado}`).join("\n") +
    `\n\n💌 ¿Cuál le regalarías a ${tema}? Envíaselo o etiquétalo en los comentarios 👇\n` +
    `🛒 Pídelo hoy en ${web}\n` +
    `📲 Síguenos @sorpresas_en_bogota para más ideas 💝\n\n` +
    [...BASE_TAGS, `#regalospara${tema.replace(/[^a-záéíóúñ]/gi, "")}`].join(" ");

  return {
    generatedAt: new Date().toISOString(),
    categoria: { slug: reel.slug, nombre: reel.nombre },
    caption,
    imageUrls: items.map((it) => it.imageUrl),
    items,
  };
}
