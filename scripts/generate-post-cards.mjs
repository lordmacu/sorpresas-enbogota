// Genera las tarjetas de post (foto real + precio + texto) para productos
// elegibles (populares u ofertas) → public/images/ig-cards/<slug>.jpg
// y un manifiesto data/post-cards.json que consume el endpoint /api/post/actual.
//
//   node scripts/generate-post-cards.mjs                # 30 (populares primero)
//   node scripts/generate-post-cards.mjs --limit=60
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderPost } from "./lib/render-ig-post.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; })
);
const LIMIT = parseInt(args.limit ?? "30", 10);

const productos = JSON.parse(fs.readFileSync(path.join(ROOT, "data/productos.json"), "utf8")).productos;
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "data/config.json"), "utf8"));

const esOferta = (p) => p.precioAnterior && p.precioAnterior > p.precio;
const visibles = productos.filter((p) => p.visible && p.imagen);
// Populares primero, luego ofertas; dedup por slug; recorta a LIMIT.
const pool = [...visibles.filter((p) => p.popular), ...visibles.filter((p) => !p.popular && esOferta(p))];
const seen = new Set();
const elegibles = pool.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true))).slice(0, LIMIT);

const outDir = path.join(ROOT, "public/images/ig-cards");
fs.mkdirSync(outDir, { recursive: true });

console.log(`🖼  Generando ${elegibles.length} tarjetas de post…\n`);
const cards = [];
for (const p of elegibles) {
  try {
    const png = await renderPost(p, { whatsapp: String(config.whatsapp).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3") });
    const jpg = await sharp(png).jpeg({ quality: 88 }).toBuffer(); // IG/automatización: JPEG
    fs.writeFileSync(path.join(outDir, `${p.slug}.jpg`), jpg);
    cards.push({
      slug: p.slug,
      nombre: p.nombre,
      precio: p.precio,
      precioAnterior: p.precioAnterior ?? null,
      descripcion: (p.descripcion || "").replace(/\s+/g, " ").trim(),
      categoria: p.categoria,
      contenido: Array.isArray(p.contenido) ? p.contenido.filter((x) => typeof x === "string").slice(0, 4) : [],
      imagen: `/images/ig-cards/${p.slug}.jpg`,
    });
    console.log(`  ✓ ${p.slug}.jpg (${(jpg.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`  ✗ ${p.slug}: ${e.message}`);
  }
}

fs.writeFileSync(path.join(ROOT, "data/post-cards.json"), JSON.stringify({ cards }, null, 2) + "\n");
console.log(`\n📋 ${cards.length} tarjetas en data/post-cards.json`);
