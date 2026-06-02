// Pipeline de contenido para Instagram.
// Selecciona productos → genera CAPTION + hashtags → renderiza el GRÁFICO con la
// foto real → escribe todo en content/instagram/<fecha>/<slug>/ y encola en
// content/instagram/queue.json (para el paso de publicación).
//
//   npm run ig:generate                      # 6 posts (populares)
//   npm run ig:generate -- --limit=10
//   npm run ig:generate -- --slugs=super-brunch,pink-brunch
//   npm run ig:generate -- --category=flores-rosas --limit=8
//   npm run ig:generate -- --dry-run         # no escribe imágenes, solo muestra captions
//
// Los gráficos no requieren API ni claves. La publicación automática y las
// imágenes IA desde cero se conectan después (ver README al final del archivo).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderPost } from "./lib/render-ig-post.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const productos = read("data/productos.json").productos;
const categorias = read("data/categorias.json").categorias;
const config = read("data/config.json");

const catName = (slug) =>
  categorias.find((c) => c.slug === slug)?.nombre ||
  (slug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const waPretty = (n) =>
  String(n).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
const WHATSAPP = waPretty(config.whatsapp);

// ---------- CLI ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY = !!args["dry-run"];
const LIMIT = parseInt(args.limit ?? "6", 10);

// ---------- Selección ----------
function seleccionar() {
  if (args.slugs) {
    const set = String(args.slugs).split(",").map((s) => s.trim());
    return set.map((s) => productos.find((p) => p.slug === s)).filter(Boolean);
  }
  let pool = productos.filter((p) => p.visible && p.imagen);
  if (args.category) pool = pool.filter((p) => p.categoria === args.category);
  // Populares primero; rellenar con el resto si faltan.
  const pop = pool.filter((p) => p.popular);
  const rest = pool.filter((p) => !p.popular);
  return [...pop, ...rest].slice(0, LIMIT);
}

// ---------- Caption ----------
const HOOKS = [
  "Hay sorpresas que se recuerdan toda la vida ✨",
  "¿Buscas el detalle perfecto? Aquí está 🎁",
  "Sorpréndela hoy mismo, sin moverte de casa 💝",
  "El plan: verla sonreír al abrir la puerta 🥹",
  "Un antojo que también es un abrazo 🤎",
  "Dile lo que sientes con un detalle inolvidable 💛",
];
const CIERRES = [
  "Hecho a mano y entregado con amor en toda Bogotá.",
  "Lo preparamos con cariño y lo llevamos hasta su puerta.",
  "Detalles que se sienten, no solo se regalan.",
];

// Hashtags extra según palabras de la categoría/nombre.
const TAG_MAP = [
  [/desayuno|brunch/i, ["#desayunosorpresa", "#desayunoadomicilio", "#desayunosbogota"]],
  [/flor|rosa|ramo/i, ["#floresbogota", "#ramodeflores", "#floresadomicilio"]],
  [/cumple/i, ["#regalosdecumpleaños", "#felizcumpleaños", "#cumpleañosbogota"]],
  [/amor|novi|aniversario|san valent/i, ["#regalosparaenamorados", "#amoryamistad", "#regalosdeamor"]],
  [/fresa|chocolate/i, ["#fresasconchocolate", "#chocolatebogota"]],
  [/ancheta|caja|combo/i, ["#anchetasbogota", "#cajasorpresa"]],
  [/peluche/i, ["#peluches", "#peluchesbogota"]],
];
const BASE_TAGS = [
  "#sorpresas", "#sorpresasbogota", "#regalosbogota", "#regalosadomicilio",
  "#regalosadomiciliobogota", "#detallesconamor", "#sorpresasadomicilio", "#bogota",
];

function hashtags(product) {
  const hay = `${product.nombre} ${product.categoria} ${(product.tags || []).join(" ")}`;
  const extra = TAG_MAP.filter(([re]) => re.test(hay)).flatMap(([, t]) => t);
  return [...new Set([...BASE_TAGS, ...extra])].slice(0, 18).join(" ");
}

function caption(product, i) {
  const hook = HOOKS[i % HOOKS.length];
  const cierre = CIERRES[i % CIERRES.length];
  const incluye =
    Array.isArray(product.contenido) && product.contenido.length
      ? `\n\n🎁 Incluye: ${product.contenido.slice(0, 4).join(", ")}${product.contenido.length > 4 ? " y más" : ""}.`
      : product.descripcion
      ? `\n\n${product.descripcion.replace(/\s+/g, " ").trim().slice(0, 140)}`
      : "";
  const precio =
    "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(product.precio);

  return (
    `${hook}\n\n` +
    `${product.nombre} — ${catName(product.categoria)}.${incluye}\n\n` +
    `${cierre}\n\n` +
    `💛 ${precio}\n` +
    `📲 Pídelo por WhatsApp: ${WHATSAPP}\n` +
    `📍 Entrega el mismo día en toda Bogotá\n` +
    `🔗 Más en el link de la bio\n\n` +
    hashtags(product)
  );
}

// ---------- Fecha de lote (sin depender de locale) ----------
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Main ----------
const items = seleccionar();
if (items.length === 0) {
  console.error("No se seleccionó ningún producto. Revisa --slugs/--category.");
  process.exit(1);
}

const batch = hoyISO();
const batchDir = path.join(ROOT, "content/instagram", batch);
const queuePath = path.join(ROOT, "content/instagram/queue.json");
const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf8")) : [];

console.log(`\n🗓  Lote ${batch} — ${items.length} posts${DRY ? "  (DRY-RUN)" : ""}\n`);

for (let i = 0; i < items.length; i++) {
  const p = items[i];
  const cap = caption(p, i);
  const slugDir = path.join(batchDir, `${String(i + 1).padStart(2, "0")}-${p.slug}`);

  if (DRY) {
    console.log(`— ${p.nombre} —\n${cap}\n${"─".repeat(48)}`);
    continue;
  }

  fs.mkdirSync(slugDir, { recursive: true });
  const png = await renderPost(p, { whatsapp: WHATSAPP });
  fs.writeFileSync(path.join(slugDir, "post.png"), png);
  fs.writeFileSync(path.join(slugDir, "caption.txt"), cap);

  const meta = {
    slug: p.slug,
    nombre: p.nombre,
    precio: p.precio,
    url: `${(config.dominio || "").replace(/\/$/, "")}/producto/${p.slug}`,
    image: path.relative(ROOT, path.join(slugDir, "post.png")),
    caption: path.relative(ROOT, path.join(slugDir, "caption.txt")),
    status: "pending",
    publishedAt: null,
  };
  fs.writeFileSync(path.join(slugDir, "meta.json"), JSON.stringify(meta, null, 2));

  if (!queue.some((q) => q.image === meta.image)) queue.push({ ...meta, batch });
  console.log(`  ✓ ${meta.image}`);
}

if (!DRY) {
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  console.log(`\n📋 Cola: ${queue.length} posts en content/instagram/queue.json\n`);
}
