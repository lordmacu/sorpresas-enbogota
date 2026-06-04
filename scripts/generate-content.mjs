#!/usr/bin/env node
/**
 * generate-content.mjs — Sorpresas (regalos a domicilio en Bogotá)
 *
 * Genera contenido editorial para el blog y lo agrega a data/blog.json (posts:
 * listas de ideas de regalo) o data/guias.json (guías evergreen). Pensado para
 * correr automático 2 veces por semana (cron en el celular) y, con --commit,
 * hace git add + commit + push (dispara el deploy en Vercel).
 *
 * POSTS: listas tipo "5 regalos para…" sesgadas a la OCASIÓN activa (Día del
 * Padre, San Valentín, Navidad…) o a un tema evergreen. Referencian PRODUCTOS y
 * CATEGORÍAS reales del catálogo (enlazado interno + el lector compra).
 *
 * GUÍAS: artículos evergreen de prosa sobre qué/cómo regalar.
 *
 * En ambos el texto se escribe humanizado (prompts/humanize-text.md) para que no
 * "suene a IA", y trae metaTitle/metaDescription/FAQ optimizados (las páginas ya
 * emiten JSON-LD BlogPosting/Article + Breadcrumb + FAQPage).
 *
 * Uso:
 *   node scripts/generate-content.mjs                # auto (rota post/guía)
 *   node scripts/generate-content.mjs --type=post    # forzar lista de regalos
 *   node scripts/generate-content.mjs --type=guia    # forzar guía
 *   node scripts/generate-content.mjs --dry-run      # genera pero NO escribe
 *   node scripts/generate-content.mjs --commit       # escribe + git push
 *
 * Variables (.env.local o entorno):
 *   LLM_API_KEY, LLM_BASE_URL (default https://api.minimax.io/anthropic),
 *   LLM_MODEL (default MiniMax-M3), LLM_API_STYLE (auto), LLM_MAX_TOKENS.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOG_FILE = path.join(ROOT, "data", "blog.json");
const GUIAS_FILE = path.join(ROOT, "data", "guias.json");
const CATEGORIAS_FILE = path.join(ROOT, "data", "categorias.json");
const PRODUCTOS_FILE = path.join(ROOT, "data", "productos.json");
const CONFIG_FILE = path.join(ROOT, "data", "config.json");
const HUMANIZE_FILE = path.join(ROOT, "prompts", "humanize-text.md");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────── entorno ─────────────────────────────
async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
        if (m && !process.env[m[1]]) {
          let v = m[2];
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          process.env[m[1]] = v;
        }
      }
    } catch {
      /* sin archivo: ok */
    }
  }
}

function parseArgs(argv) {
  const args = { type: "auto", dryRun: false, commit: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--commit") args.commit = true;
    else if (a.startsWith("--type=")) args.type = a.slice(7);
  }
  return args;
}

// ──────────────────────────── utilidades ───────────────────────────
function slugify(text, maxLen = 65) {
  const base = text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const words = base.split("-").filter(Boolean);
  let slug = "";
  for (const w of words) {
    if (slug && slug.length + 1 + w.length > maxLen) break;
    slug = slug ? `${slug}-${w}` : w;
  }
  return slug || "articulo";
}

function hoyBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

// ───────────────── ocasiones de regalo (Colombia) ──────────────────
function nthWeekday(year, month, weekday, n) {
  // month 1-12; weekday 0=Dom..6=Sáb; n-ésima ocurrencia. Devuelve Date (UTC).
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7));
}
// occ, días de rampa antes, fecha(año)->Date
const OCASIONES = [
  ["san-valentin", 14, (y) => new Date(Date.UTC(y, 1, 14))],
  ["dia-madre",    18, (y) => nthWeekday(y, 5, 0, 2)],   // 2º domingo de mayo
  ["dia-padre",    18, (y) => nthWeekday(y, 6, 0, 3)],   // 3er domingo de junio
  ["amor-amistad", 18, (y) => nthWeekday(y, 9, 6, 3)],   // 3er sábado de septiembre
  ["navidad",      24, (y) => new Date(Date.UTC(y, 11, 25))],
];
function ocasionActiva(fechaISO) {
  const today = new Date(`${fechaISO}T12:00:00Z`);
  let best = null;
  for (const [occ, ramp, fechaf] of OCASIONES) {
    for (const y of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
      const d = fechaf(y);
      const start = new Date(d.getTime() - ramp * 86400000);
      if (today >= start && today <= d && (!best || d < best.d)) best = { occ, d };
    }
  }
  return best ? best.occ : null;
}

// ────────────────────────── LLM (MiniMax) ──────────────────────────
function resolveApiStyle(style, baseUrl) {
  const s = (style || "auto").toLowerCase();
  if (s === "openai" || s === "anthropic") return s;
  return /\/anthropic(?:\/|$)/i.test(baseUrl) ? "anthropic" : "openai";
}

function extractJson(text) {
  let t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenced) t = fenced[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new SyntaxError("No se encontró JSON válido en la respuesta del modelo");
  }
}

async function callLlm({ system, user, baseUrl, apiKey, model, apiStyle, maxTokens = 16000, maxRetries = 4 }) {
  const base = baseUrl.replace(/\/+$/, "");
  let lastErr = null;
  let tokens = maxTokens;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let url, headers, body;
      if (apiStyle === "anthropic") {
        url = `${base}/v1/messages`;
        headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
        body = { model, max_tokens: tokens, temperature: 0.8, system, messages: [{ role: "user", content: user }] };
      } else {
        url = `${base}/chat/completions`;
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
        body = { model, temperature: 0.8, max_tokens: tokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
      }
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const errBody = await res.text();
        lastErr = new Error(`HTTP ${res.status}: ${errBody.slice(0, 300)}`);
        if (res.status >= 400 && res.status < 500 && res.status !== 429) throw lastErr;
      } else {
        const data = await res.json();
        const stop = data.stop_reason || data.choices?.[0]?.finish_reason;
        const content =
          apiStyle === "anthropic"
            ? (data.content || []).filter((b) => b?.type === "text").map((b) => b.text).join("")
            : data.choices?.[0]?.message?.content;
        if ((stop === "max_tokens" || stop === "length") && tokens < 32000) {
          tokens = Math.min(tokens * 2, 32000);
          continue;
        }
        if (!content) throw new Error("Respuesta vacía del modelo");
        return content;
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < maxRetries) await sleep(800 * 2 ** (attempt - 1));
  }
  throw lastErr;
}

// ───────────────────────── catálogo / menú ─────────────────────────
function productMenu(productos, categorias, max = 18) {
  // productos visibles con stock, en las categorías del tema, populares primero.
  const set = new Set(categorias);
  const pool = productos.filter(
    (p) => p.visible !== false && (p.stock === undefined || p.stock > 0) && set.has(p.categoria),
  );
  pool.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  // Si la categoría del tema tiene pocos, rellena con populares de cualquier lado.
  if (pool.length < 8) {
    const extra = productos.filter(
      (p) => p.popular && p.visible !== false && (p.stock === undefined || p.stock > 0) && !set.has(p.categoria),
    );
    pool.push(...extra);
  }
  return pool.slice(0, max).map((p) => ({
    slug: p.slug, nombre: p.nombre, categoria: p.categoria, precio: p.precio,
  }));
}

// ───────────────────────────── prompts ─────────────────────────────
function reglasHumanas(humanizeText) {
  const es = [
    "## REGLAS DE ESCRITURA HUMANA (OBLIGATORIAS, máxima prioridad)",
    "El texto se publica para posicionar en Google y debe leerse 100% humano, nunca como IA.",
    "- Frases cortas (10-20 palabras), voz activa, vocabulario cotidiano y concreto.",
    "- Varía el largo de las frases. Ritmo natural, no mecánico.",
    "- PROHIBIDO el guion largo (—) y el punto y coma (;). Usa punto o coma.",
    "- PROHIBIDOS clichés de IA en español: 'En resumen', 'En conclusión', 'En definitiva',",
    "  'Es importante destacar/mencionar', 'cabe resaltar', 'cabe destacar', 'sin lugar a dudas',",
    "  'en la era digital', 'en el mundo de', 'sumérgete en', 'descubre el mundo de', 'eleva tu',",
    "  'lleva al siguiente nivel', 'no es solo... es', 'ya sea... o', 'cuando se trata de', 'a la hora de'.",
    "- No empieces oraciones ni ítems con conectores tipo 'Además', 'Asimismo', 'Sin embargo',",
    "  'Por lo tanto', 'Por ende', 'Igualmente', 'De igual manera'.",
    "- Nada de metáforas de viajes, música o paisajes. Nada de emojis. Sin mayúsculas para enfatizar.",
    "- No te refieras a ti mismo ni a que eres una IA. No te disculpes. Afirma con seguridad.",
    "- Español de Colombia (Bogotá), natural y cercano.",
  ].join("\n");
  return humanizeText.trim() ? `${es}\n\n--- Guía completa (inglés, aplica por analogía) ---\n${humanizeText.trim()}` : es;
}

function systemBase(store, humanizeText) {
  return [
    `Eres el editor del blog de "${store.nombre}", una tienda de regalos y sorpresas a domicilio en Bogotá, Colombia.`,
    "Pedidos por WhatsApp, con entrega el mismo día. Vendes: desayunos sorpresa, anchetas, ramos de flores,",
    "fresas con chocolate, cajas mágicas con globos, peluches, chocolates y detalles personalizados.",
    "Escribes contenido editorial original, útil y optimizado para SEO, que ayuda a posicionar el sitio y a que el lector pida su regalo.",
    "",
    reglasHumanas(humanizeText),
    "",
    "## SEO (obligatorio)",
    "- metaTitle: 50-60 caracteres, con la keyword principal y mención a Bogotá cuando aplique.",
    "- metaDescription: 140-155 caracteres, con keyword y un llamado a la acción.",
    "- El h1 debe contener la keyword principal de forma natural.",
    "- Referencia SIEMPRE productos y categorías REALES del sitio (enlazado interno).",
    "- Las FAQ responden dudas reales de compra: entregas el mismo día, cobertura en Bogotá, cómo pedir por WhatsApp, personalización.",
    "",
    "Devuelves SOLO un objeto JSON válido, sin texto extra ni fences de markdown.",
  ].join("\n");
}

function promptPost({ store, cats, theme, menu, fecha, humanizeText }) {
  const catList = cats.map((c) => `${c.slug} (${c.nombre})`).join(", ");
  const prodList = menu.map((p) => `- ${p.slug} | ${p.nombre} | ${p.categoria} | $${p.precio}`).join("\n");
  const system = systemBase(store, humanizeText);
  const user = [
    `Hoy es ${fecha}. Escribe un POST tipo lista de ideas de regalo sobre: ${theme.tema}.`,
    "",
    "PRODUCTOS REALES del catálogo (usa SOLO estos slugs en 'productoSlug' y 'heroProductSlug', cópialos exactos):",
    prodList,
    "",
    `Categorías reales del sitio (usa SOLO estos slugs en 'ctaCategoria' y 'categoriasRelacionadas'): ${catList}`,
    "",
    "Devuelve un JSON con EXACTAMENTE esta forma:",
    `{
  "metaTitle": "string 50-60 chars con keyword + Bogotá",
  "h1": "titular atractivo tipo 'N regalos para…' con keyword",
  "metaDescription": "string 140-155 chars con keyword y CTA",
  "excerpt": "1 frase gancho de 120-160 chars",
  "etiqueta": "etiqueta corta (ej: Para papá, Aniversario, Cumpleaños, Desayunos)",
  "heroProductSlug": "un slug EXACTO de la lista de productos (el regalo principal del post)",
  "lead": "1 a 2 frases que abren el post con calidez",
  "intro": ["párrafo 1", "párrafo 2"],
  "items": [
    { "titulo": "subtítulo con gancho", "texto": "2-3 frases que describen el detalle y a quién le sirve", "productoSlug": "slug EXACTO de la lista", "ctaCategoria": "slug de categoría real", "ctaTexto": "Ver desayunos" }
  ],
  "cierre": ["párrafo de cierre invitando a pedir por WhatsApp / a domicilio el mismo día en Bogotá"],
  "faq": [ { "pregunta": "...", "respuesta": "..." } ],
  "categoriasRelacionadas": ["slug", "slug", "slug"]
}`,
    "",
    "Requisitos: 5 items (cada uno con un productoSlug DISTINTO y real de la lista, y un ctaCategoria real),",
    "3 a 4 faq, 3 categoriasRelacionadas reales. El post debe ser original, cálido y útil. Solo JSON.",
  ].join("\n");
  return { system, user };
}

function promptGuia({ store, cats, brief, fecha, humanizeText }) {
  const catList = cats.map((c) => `${c.slug} (${c.nombre})`).join(", ");
  const system = systemBase(store, humanizeText);
  const user = [
    `Hoy es ${fecha}. Escribe una GUÍA práctica (evergreen) sobre el siguiente tema:`,
    `TEMA: ${brief.tema}`,
    `Categoría principal sugerida: ${brief.categoria}`,
    "",
    `Categorías reales del sitio (usa SOLO estos slugs): ${catList}`,
    "",
    "Devuelve un JSON con EXACTAMENTE esta forma:",
    `{
  "title": "string SEO 50-60 chars con keyword",
  "h1": "título con keyword",
  "metaDescription": "string 140-155 chars con keyword y CTA",
  "excerpt": "1 frase gancho de 120-160 chars",
  "imagenCategoria": "un slug de la lista",
  "categoriasRelacionadas": ["slug", "slug", "slug"],
  "lead": "1 a 2 frases que abren la guía",
  "secciones": [ { "titulo": "subtítulo claro", "parrafos": ["párrafo 1", "párrafo 2"] } ],
  "faq": [ { "pregunta": "...", "respuesta": "..." } ]
}`,
    "",
    "Requisitos: 4 a 5 secciones, 3 a 4 faq, 3 categoriasRelacionadas reales (la primera = imagenCategoria).",
    "Menciona tipos de regalo que vendemos y orienta a pedir por WhatsApp / a domicilio en Bogotá. Solo JSON.",
  ].join("\n");
  return { system, user };
}

// ─────────────────────── validación / saneo ───────────────────────
function fixCat(slug, validSet, fallback) {
  return validSet.has(slug) ? slug : fallback;
}
function trimMeta(s, max) {
  if (typeof s !== "string") return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max - 20 ? cut.slice(0, sp) : cut).trim();
}
function dedupeCats(arr, validSet, first, fallback) {
  const out = [];
  for (const c of [first, ...(Array.isArray(arr) ? arr : [])]) {
    const v = fixCat(c, validSet, fallback);
    if (!out.includes(v)) out.push(v);
  }
  while (out.length < 3) out.push(fallback);
  return out.slice(0, 4);
}
function uniqueSlug(base, existing) {
  let slug = base || "articulo";
  let i = 2;
  while (existing.has(slug)) slug = `${base}-${i++}`;
  existing.add(slug);
  return slug;
}

function sanitizePost(obj, validSet, prodSet, fecha, existingSlugs, fallbackCat) {
  const req = ["metaTitle", "h1", "metaDescription", "excerpt", "etiqueta", "lead", "intro", "items", "cierre", "faq"];
  for (const k of req) if (!(k in obj)) throw new Error(`post: falta campo "${k}"`);
  if (!Array.isArray(obj.items) || obj.items.length < 3) throw new Error("post: items < 3");
  if (!Array.isArray(obj.faq) || obj.faq.length < 3) throw new Error("post: faq < 3");

  const items = obj.items.slice(0, 6).map((it) => {
    const out = {
      titulo: String(it.titulo).trim(),
      texto: String(it.texto).trim(),
      ctaCategoria: fixCat(it.ctaCategoria, validSet, fallbackCat),
      ctaTexto: String(it.ctaTexto || "Ver regalos").trim().slice(0, 32),
    };
    // productoSlug solo si es real; si no, la página cae elegante a la categoría.
    if (it.productoSlug && prodSet.has(it.productoSlug)) out.productoSlug = it.productoSlug;
    return out;
  });
  // heroProductSlug: real, o el primer item con producto, o nada.
  let hero = prodSet.has(obj.heroProductSlug) ? obj.heroProductSlug : null;
  if (!hero) hero = items.find((i) => i.productoSlug)?.productoSlug || "";

  return {
    slug: uniqueSlug(slugify(obj.h1), existingSlugs),
    metaTitle: trimMeta(obj.metaTitle, 60),
    h1: String(obj.h1).trim(),
    metaDescription: trimMeta(obj.metaDescription, 158),
    excerpt: String(obj.excerpt).trim(),
    fecha,
    etiqueta: String(obj.etiqueta).trim().slice(0, 24),
    heroProductSlug: hero,
    lead: String(obj.lead).trim(),
    intro: (obj.intro || []).map(String),
    items,
    cierre: (obj.cierre || []).map(String),
    faq: obj.faq.slice(0, 5).map((f) => ({ pregunta: String(f.pregunta).trim(), respuesta: String(f.respuesta).trim() })),
    categoriasRelacionadas: dedupeCats(obj.categoriasRelacionadas, validSet, items[0]?.ctaCategoria, fallbackCat),
  };
}

function sanitizeGuia(obj, validSet, fecha, existingSlugs, fallbackCat) {
  const req = ["title", "h1", "metaDescription", "excerpt", "lead", "secciones", "faq"];
  for (const k of req) if (!(k in obj)) throw new Error(`guia: falta campo "${k}"`);
  if (!Array.isArray(obj.secciones) || obj.secciones.length < 3) throw new Error("guia: secciones < 3");
  if (!Array.isArray(obj.faq) || obj.faq.length < 3) throw new Error("guia: faq < 3");

  const imagenCategoria = fixCat(obj.imagenCategoria, validSet, fallbackCat);
  return {
    slug: uniqueSlug(slugify(obj.h1 || obj.title), existingSlugs),
    title: trimMeta(obj.title, 60),
    h1: String(obj.h1).trim(),
    metaDescription: trimMeta(obj.metaDescription, 158),
    excerpt: String(obj.excerpt).trim(),
    fecha,
    imagenCategoria,
    categoriasRelacionadas: dedupeCats(obj.categoriasRelacionadas, validSet, imagenCategoria, fallbackCat),
    lead: String(obj.lead).trim(),
    secciones: obj.secciones.slice(0, 6).map((s) => ({
      titulo: String(s.titulo).trim(),
      parrafos: (s.parrafos || []).map(String),
    })),
    faq: obj.faq.slice(0, 5).map((f) => ({ pregunta: String(f.pregunta).trim(), respuesta: String(f.respuesta).trim() })),
  };
}

// ─────────────────────── temas / rotación ─────────────────────────
// occ = clave de ocasión (para priorizar por fecha); resto evergreen.
const THEMES = [
  { occ: "san-valentin", etiqueta: "San Valentín",  tema: "regalos para San Valentín que enamoran",         categorias: ["san-valentin", "amor", "flores-rosas", "fresas-con-chocolate", "desayunos-sorpresas"] },
  { occ: "dia-madre",    etiqueta: "Para mamá",      tema: "regalos para sorprender a mamá",                  categorias: ["para-mama", "flores-rosas", "desayunos-sorpresas", "anchetas-de-cumpleanos"] },
  { occ: "dia-padre",    etiqueta: "Para papá",      tema: "regalos para sorprender a papá",                  categorias: ["para-papa", "pasion-futbolera", "desayunos-sorpresas", "anchetas-de-cumpleanos"] },
  { occ: "amor-amistad", etiqueta: "Amor y Amistad", tema: "detalles para Amor y Amistad",                    categorias: ["amor-amistad", "amor", "fresas-con-chocolate", "cajas-magicas"] },
  { occ: "navidad",      etiqueta: "Navidad",        tema: "regalos de Navidad a domicilio en Bogotá",        categorias: ["navidad", "anchetas-de-cumpleanos", "desayunos-sorpresas"] },
  { etiqueta: "Aniversario", tema: "ideas de regalo para un aniversario",            categorias: ["amor", "flores-rosas", "fresas-con-chocolate", "desayunos-sorpresas"] },
  { etiqueta: "Cumpleaños",  tema: "regalos de cumpleaños que sorprenden",           categorias: ["cumpleanos", "anchetas-de-cumpleanos", "balloon-surprise", "cajas-magicas"] },
  { etiqueta: "Desayunos",   tema: "desayunos sorpresa para regalar en Bogotá",      categorias: ["desayunos-sorpresas", "fresas-con-chocolate"] },
  { etiqueta: "Mejórate",    tema: "detalles para desear pronta recuperación",       categorias: ["mejorate-pronto", "flores-rosas", "desayunos-sorpresas"] },
  { etiqueta: "Perdón",      tema: "regalos para pedir perdón y reconciliarte",      categorias: ["perdoname", "flores-rosas", "fresas-con-chocolate"] },
  { etiqueta: "Grados",      tema: "regalos de grado y graduación",                  categorias: ["grados", "desayunos-sorpresas", "anchetas-de-cumpleanos"] },
  { etiqueta: "Corporativo", tema: "regalos corporativos para clientes y equipo",    categorias: ["regalos-corporativos", "anchetas-de-cumpleanos", "desayunos-sorpresas"] },
];
const GUIA_BRIEFS = [
  { tema: "Qué regalar en un aniversario sin gastar de más", categoria: "amor" },
  { tema: "Cómo elegir un desayuno sorpresa perfecto", categoria: "desayunos-sorpresas" },
  { tema: "Regalos de último minuto con entrega el mismo día en Bogotá", categoria: "entregas-hoy-mismo" },
  { tema: "Regalos para pedir perdón y reconciliarte", categoria: "perdoname" },
  { tema: "Qué regalar a una mujer en su cumpleaños", categoria: "para-ella" },
  { tema: "Detalles económicos que se ven mucho más caros", categoria: "fresas-con-chocolate" },
  { tema: "Cómo sorprender a tu pareja en un día normal", categoria: "amor" },
  { tema: "Regalos para mamá más allá de las flores", categoria: "para-mama" },
];

function pickIndex(list, n) {
  return list[((n % list.length) + list.length) % list.length];
}
function pickTheme(count, fecha) {
  const occ = ocasionActiva(fecha);
  if (occ) {
    const t = THEMES.find((x) => x.occ === occ);
    if (t) return t;
  }
  return pickIndex(THEMES, count);
}

// ───────────────────────────── git ─────────────────────────────────
function git(args) {
  return execFileSync("git", args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}
function currentBranch() {
  try { return git(["rev-parse", "--abbrev-ref", "HEAD"]); } catch { return "main"; }
}
function commitPush(file, message) {
  try { git(["config", "user.name", "lordmacu"]); } catch { /* ok */ }
  try { git(["config", "user.email", "10134930+lordmacu@users.noreply.github.com"]); } catch { /* ok */ }
  const rel = path.relative(ROOT, file);
  git(["add", rel]);
  if (!git(["diff", "--cached", "--name-only"])) { console.error("· nada que commitear"); return; }
  git(["commit", "-m", message]);
  const branch = currentBranch();
  try { git(["pull", "--rebase", "origin", branch]); } catch (e) { console.error("⚠ pull --rebase:", e.message); }
  git(["push", "origin", branch]);
  console.error("✓ commit + push hechos");
}

// ───────────────────────────── main ────────────────────────────────
async function main() {
  await loadEnv();
  const args = parseArgs(process.argv);

  const baseUrl = process.env.LLM_BASE_URL || "https://api.minimax.io/anthropic";
  const model = process.env.LLM_MODEL || "MiniMax-M3";
  const apiKey = process.env.LLM_API_KEY || process.env.MINIMAX_API_KEY || "";
  const apiStyle = resolveApiStyle(process.env.LLM_API_STYLE, baseUrl);
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || "", 10) || 16000;
  if (!apiKey) { console.error("Error: falta LLM_API_KEY (definir en .env.local)"); process.exit(1); }

  const [categoriasData, productosData, config, humanizeText] = await Promise.all([
    readFile(CATEGORIAS_FILE, "utf8").then(JSON.parse),
    readFile(PRODUCTOS_FILE, "utf8").then(JSON.parse).catch(() => ({ productos: [] })),
    readFile(CONFIG_FILE, "utf8").then(JSON.parse),
    readFile(HUMANIZE_FILE, "utf8").catch(() => ""),
  ]);
  const cats = (categoriasData.categorias || categoriasData).map((c) => ({ slug: c.slug, nombre: c.nombre }));
  const validSet = new Set(cats.map((c) => c.slug));
  const productos = productosData.productos || productosData;
  const prodSet = new Set(productos.map((p) => p.slug));
  const fallbackCat = validSet.has("amor") ? "amor" : cats[0].slug;
  const store = { nombre: config.nombre, dominio: config.dominio, whatsapp: config.whatsapp };
  const fecha = hoyBogota();

  const blog = JSON.parse(await readFile(BLOG_FILE, "utf8"));
  const guias = JSON.parse(await readFile(GUIAS_FILE, "utf8"));

  // Tipo: auto rota 2 posts : 1 guía según el total ya publicado.
  let type = args.type;
  if (type === "auto") {
    const total = blog.posts.length + guias.guias.length;
    type = total % 3 === 2 ? "guia" : "post";
  }
  if (!["post", "guia"].includes(type)) { console.error(`--type inválido: ${type}`); process.exit(1); }

  console.error(`[generate-content] type=${type} model=${model} fecha=${fecha} ${args.dryRun ? "DRY-RUN" : ""}`);

  let system, user, targetFile, dataObj, arrKey;

  if (type === "post") {
    const theme = pickTheme(blog.posts.length, fecha);
    const menu = productMenu(productos, theme.categorias.filter((c) => validSet.has(c)));
    if (!menu.length) { console.error("✗ sin productos para el tema, abortando"); process.exit(1); }
    console.error(`  tema: "${theme.tema}" · productos en menú: ${menu.length}`);
    ({ system, user } = promptPost({ store, cats, theme, menu, fecha, humanizeText }));
    targetFile = BLOG_FILE; dataObj = blog; arrKey = "posts";
  } else {
    const brief = pickIndex(GUIA_BRIEFS, guias.guias.length);
    console.error(`  tema guía: "${brief.tema}"`);
    ({ system, user } = promptGuia({ store, cats, brief, fecha, humanizeText }));
    targetFile = GUIAS_FILE; dataObj = guias; arrKey = "guias";
  }

  const existingSlugs = new Set(dataObj[arrKey].map((x) => x.slug));
  const content = await callLlm({ system, user, baseUrl, apiKey, model, apiStyle, maxTokens });
  const raw = extractJson(content);
  const nuevo = type === "post"
    ? sanitizePost(raw, validSet, prodSet, fecha, existingSlugs, fallbackCat)
    : sanitizeGuia(raw, validSet, fecha, existingSlugs, fallbackCat);

  const tituloSeo = nuevo.metaTitle || nuevo.title; // posts usan metaTitle, guías usan title
  console.error(`\n→ ${type}: ${nuevo.h1}`);
  console.error(`  slug: ${nuevo.slug}`);
  console.error(`  metaTitle (${tituloSeo.length}): ${tituloSeo}`);
  console.error(`  metaDescription (${nuevo.metaDescription.length})`);
  if (type === "post") {
    console.error(`  hero: ${nuevo.heroProductSlug}`);
    console.error(`  productos: ${nuevo.items.map((i) => i.productoSlug || `(cat:${i.ctaCategoria})`).join(", ")}`);
  } else {
    console.error(`  categorías: ${nuevo.categoriasRelacionadas.join(", ")}`);
  }

  if (args.dryRun) { console.error("\nDRY-RUN: no se escribió nada.\n", JSON.stringify(nuevo, null, 2).slice(0, 900), "…"); return; }

  dataObj[arrKey].unshift(nuevo);
  await writeFile(targetFile, JSON.stringify(dataObj, null, 2) + "\n", "utf8");
  console.error(`✓ agregado a ${path.relative(ROOT, targetFile)} (${dataObj[arrKey].length} en total)`);

  if (args.commit) {
    const ruta = type === "post" ? `/blog/${nuevo.slug}` : `/blog/guias/${nuevo.slug}`;
    commitPush(targetFile, `Contenido auto: ${type} "${nuevo.h1}" (${ruta})`);
  }
}

main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
