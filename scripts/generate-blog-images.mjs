// Genera una imagen de hero (IA, MiniMax image-01) para cada entrada del blog,
// acorde a su tema. Guarda en public/images/blog/<slug>.webp y escribe el campo
// "heroImagen" en data/blog.json.
//
//   node scripts/generate-blog-images.mjs                 # todas
//   node scripts/generate-blog-images.mjs --only=<slug>
//   node scripts/generate-blog-images.mjs --raw           # guarda también el jpg
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://api.minimax.io";

function loadEnv() {
  const env = {};
  for (const f of [".env.local", ".env"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}
const KEY = (() => { const e = loadEnv(); return e.MINIMAX_API_KEY || e.LLM_API_KEY; })();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const STYLE =
  "editorial lifestyle photography, warm soft natural light, creamy shallow depth of field bokeh, romantic premium boutique gift aesthetic, cream burgundy and gold color palette, elegant, high-end magazine quality, photorealistic, ultra detailed, no text, no letters, no words, no watermark, no logo";

// Prompt de escena por slug de entrada.
const PROMPTS = {
  "5-regalos-para-sorprender-a-tu-papa":
    "A thoughtful gift set for dad on a warm wooden table: a wooden box with craft beers, gourmet snacks, a small football-themed detail and a greeting card",
  "5-ideas-de-desayuno-sorpresa-para-enamorar":
    "A romantic surprise breakfast in bed: an elegant gift box with pancakes, fresh fruit, chocolate-covered strawberries, orange juice and a small bouquet of roses, soft morning light",
  "5-regalos-de-cumpleanos-que-no-fallan":
    "A festive birthday surprise: a gift box full of sweets and treats surrounded by colorful balloons and a small birthday cake, cheerful celebration",
  "5-detalles-para-reconquistar-a-tu-pareja":
    "A romantic gift arrangement: a bouquet of red roses, chocolate-covered strawberries in an elegant box and a candle, intimate warm light",
  "5-regalos-para-mama-que-la-van-a-emocionar":
    "A loving gift for mom: a fresh bouquet of flowers, a gourmet basket and a greeting card on a bright table, soft daylight",
  "5-regalos-de-aniversario-para-sorprender":
    "An anniversary gift scene: a box of red roses and chocolate-covered strawberries with two glasses and soft candle light, romantic and elegant",
  "5-regalos-para-tu-esposa-que-la-van-a-enamorar":
    "An elegant gift for a wife: a two-tone rose bouquet with a small teddy bear and a deluxe gourmet basket, warm romantic boutique setting",
  "5-regalos-para-tu-esposo-o-pareja":
    "A gift set for a partner: a selection of craft beers, gourmet snacks and a cheese board arranged on a cozy warm table",
  "5-regalos-de-graduacion-para-celebrar":
    "A graduation celebration gift: an elegant golden gift basket with a graduation cap, sweets and balloons, proud festive mood",
  "5-regalos-para-tu-mejor-amiga":
    "A cheerful gift for a best friend: a pink surprise breakfast box with fruit, sweets and a small bouquet, bright joyful mood",
};

const W = 1536;
const H = 960; // 16:10, encaja con el hero y las tarjetas del blog

async function generate(slug) {
  const prompt = PROMPTS[slug];
  if (!prompt) { console.error(`  ✗ ${slug}: sin prompt definido`); return null; }

  const rel0 = `/images/blog/${slug}.webp`;
  if (!args.force && fs.existsSync(path.join(ROOT, "public", rel0))) {
    console.log(`  · ${slug}: ya existe (usa --force para regenerar)`);
    return rel0;
  }

  const res = await fetch(`${BASE}/v1/image_generation`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "image-01",
      prompt: `${prompt}. ${STYLE}`,
      width: W,
      height: H,
      response_format: "url",
      n: 1,
      prompt_optimizer: true,
    }),
  });
  const json = await res.json();
  if (json?.base_resp?.status_code !== 0 || !json?.data?.image_urls?.length) {
    console.error(`  ✗ ${slug}:`, JSON.stringify(json?.base_resp));
    return null;
  }
  const buf = Buffer.from(await (await fetch(json.data.image_urls[0])).arrayBuffer());
  const outDir = path.join(ROOT, "public/images/blog");
  fs.mkdirSync(outDir, { recursive: true });
  if (args.raw) fs.writeFileSync(path.join(outDir, `${slug}.jpg`), buf);
  const webp = await sharp(buf).webp({ quality: 86 }).toBuffer();
  fs.writeFileSync(path.join(outDir, `${slug}.webp`), webp);
  const rel = `/images/blog/${slug}.webp`;
  console.log(`  ✓ ${rel} (${(webp.length / 1024).toFixed(0)} KB)`);
  return rel;
}

const blogPath = path.join(ROOT, "data/blog.json");
const blog = JSON.parse(fs.readFileSync(blogPath, "utf8"));
const targets = args.only
  ? blog.posts.filter((p) => p.slug === args.only)
  : blog.posts;

console.log(`🎨 Imágenes de blog: ${targets.length} entradas\n`);
let changed = false;
for (const post of targets) {
  const rel = await generate(post.slug);
  if (rel) {
    post.heroImagen = rel;
    changed = true;
  }
}
if (changed) {
  fs.writeFileSync(blogPath, JSON.stringify(blog, null, 2) + "\n");
  console.log("\n📝 data/blog.json actualizado con heroImagen.");
}
