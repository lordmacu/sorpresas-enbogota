import { promises as fs } from "node:fs";
import path from "node:path";

export interface SeoIncluyeItem {
  item: string;
  detalle: string;
}

export interface SeoFaq {
  pregunta: string;
  respuesta: string;
}

export interface SeoContent {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  highlights: string[];
  paraQuien: string;
  ocasiones: string[];
  incluyeDetallado: SeoIncluyeItem[];
  cuidados: string[];
  mensajesTarjeta: string[];
  faqs: SeoFaq[];
  keywordsObjetivo: string[];
}

const SEO_DIR = path.join(process.cwd(), "data", "seo");

function seoPath(slug: string): string {
  return path.join(SEO_DIR, `${slug}.json`);
}

export async function loadSeo(slug: string): Promise<SeoContent | null> {
  try {
    const raw = await fs.readFile(seoPath(slug), "utf8");
    const parsed = JSON.parse(raw) as SeoContent;
    if (!parsed || typeof parsed !== "object" || parsed.slug !== slug) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
