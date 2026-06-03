// Reemplaza las imágenes de producto del sitio por la "tarjeta web" (marco +
// marca + eyebrow + título + precio, SIN "Entrega hoy" ni web), optimizada en
// WebP. Conserva la foto original en `imagenOriginal` y apunta `imagen` a la
// tarjeta. Idempotente (relee siempre la original).
//
//   node scripts/generate-web-cards.mjs              # todos
//   node scripts/generate-web-cards.mjs --limit=20   # prueba
//   node scripts/generate-web-cards.mjs --revert     # vuelve a la foto original
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderPost } from "./lib/render-ig-post.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; })
);
const prodPath = path.join(ROOT, "data/productos.json");
const db = JSON.parse(fs.readFileSync(prodPath, "utf8"));
const productos = db.productos;

// --- revertir ---
if (args.revert) {
  let n = 0;
  for (const p of productos) if (p.imagenOriginal) { p.imagen = p.imagenOriginal; delete p.imagenOriginal; n++; }
  fs.writeFileSync(prodPath, JSON.stringify(db, null, 2) + "\n");
  console.log(`↩️  Revertidos ${n} productos a su foto original.`);
  process.exit(0);
}

const outDir = path.join(ROOT, "public/images/cards");
fs.mkdirSync(outDir, { recursive: true });

const orig = (p) => p.imagenOriginal || p.imagen; // foto real (antes/después del swap)
const targets = productos.filter((p) => {
  const o = orig(p);
  return o && o.startsWith("/images/") && fs.existsSync(path.join(ROOT, "public", o));
});
const limit = args.limit ? parseInt(args.limit, 10) : targets.length;
const list = targets.slice(0, limit);

console.log(`🖼  Tarjetas web (4:5, WebP) para ${list.length} productos…\n`);

let done = 0;
async function one(p) {
  const o = orig(p);
  try {
    const png = await renderPost({ ...p, imagen: o }, { showBadge: false, showWeb: false });
    const webp = await sharp(png).webp({ quality: 80 }).toBuffer();
    fs.writeFileSync(path.join(outDir, `${p.slug}.webp`), webp);
    p.imagenOriginal = o;
    p.imagen = `/images/cards/${p.slug}.webp`;
  } catch (e) {
    console.log(`  ✗ ${p.slug}: ${e.message}`);
  }
  if (++done % 25 === 0 || done === list.length) console.log(`  ${done}/${list.length}`);
}

// Pool de concurrencia
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]); }
  }));
}

await pool(list, 4, one);

fs.writeFileSync(prodPath, JSON.stringify(db, null, 2) + "\n");
const kb = list.length ? (fs.statSync(path.join(outDir, `${list[0].slug}.webp`)).size / 1024).toFixed(0) : 0;
console.log(`\n✅ ${list.length} tarjetas en public/images/cards/ (~${kb} KB c/u). productos.json actualizado (imagen → tarjeta, imagenOriginal conservada).`);
