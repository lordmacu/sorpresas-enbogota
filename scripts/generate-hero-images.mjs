// Genera imágenes de HERO on-brand con MiniMax (image-01) y las guarda como webp
// optimizado en public/images/hero/. Imágenes de ambiente/editorial — no
// reemplazan las fotos reales de producto del catálogo.
//
//   node scripts/generate-hero-images.mjs                 # todas las escenas, 1 c/u
//   node scripts/generate-hero-images.mjs --only=desayuno --n=2
//   node scripts/generate-hero-images.mjs --raw           # guarda también el jpg original
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
const KEY = (loadEnv().MINIMAX_API_KEY || loadEnv().LLM_API_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const N = parseInt(args.n ?? "1", 10);

// Estilo común de marca (editorial / boutique romántica cálida, paleta burdeos/oro).
const STYLE =
  "editorial lifestyle photography, warm soft natural morning light, creamy shallow depth of field bokeh, romantic premium boutique gift aesthetic, cream burgundy and gold color palette, elegant, high-end magazine quality, ultra detailed, photorealistic, no text, no watermark, no logo";

// width/height: rango [512,2048], divisibles por 8.
const SCENES = [
  {
    name: "desayuno",
    width: 1024,
    height: 1280, // 4:5, slot principal del hero
    prompt:
      "A luxurious surprise breakfast (desayuno sorpresa) beautifully arranged in an elegant gift box on a bed: fresh strawberries dipped in chocolate, golden croissants, pancakes, fresh orange juice in a glass bottle, a small bouquet of pink and red roses beside it, soft golden balloons in the background",
  },
  {
    name: "flores",
    width: 1152,
    height: 1152, // 1:1, slot secundario superpuesto
    prompt:
      "An elegant bouquet of fresh red and pink roses wrapped in cream premium paper with a gold ribbon, held delicately in hands, warm romantic florist mood",
  },
  {
    name: "wide",
    width: 1536,
    height: 864, // 16:9, opción full-bleed
    prompt:
      "A beautifully styled table with a surprise gift box, fresh roses, chocolate-covered strawberries, balloons and a handwritten card, cozy romantic celebration scene at home",
  },
];

async function generateScene(scene) {
  const res = await fetch(`${BASE}/v1/image_generation`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "image-01",
      prompt: `${scene.prompt}. ${STYLE}`,
      width: scene.width,
      height: scene.height,
      response_format: "url",
      n: N,
      prompt_optimizer: true,
    }),
  });
  const json = await res.json();
  if (json?.base_resp?.status_code !== 0) {
    console.error(`  ✗ ${scene.name}:`, JSON.stringify(json?.base_resp));
    return [];
  }
  const urls = json?.data?.image_urls || [];
  const outDir = path.join(ROOT, "public/images/hero");
  fs.mkdirSync(outDir, { recursive: true });

  const saved = [];
  for (let i = 0; i < urls.length; i++) {
    const buf = Buffer.from(await (await fetch(urls[i])).arrayBuffer());
    const stem = N > 1 ? `${scene.name}-${i + 1}` : scene.name;
    if (args.raw) fs.writeFileSync(path.join(outDir, `${stem}.jpg`), buf);
    const webp = await sharp(buf).webp({ quality: 86 }).toBuffer();
    const file = path.join(outDir, `${stem}.webp`);
    fs.writeFileSync(file, webp);
    saved.push(path.relative(ROOT, file));
    console.log(`  ✓ ${path.relative(ROOT, file)} (${(webp.length / 1024).toFixed(0)} KB)`);
  }
  return saved;
}

const scenes = args.only ? SCENES.filter((s) => s.name === args.only) : SCENES;
if (!scenes.length) { console.error("Escena no encontrada. Opciones:", SCENES.map((s) => s.name).join(", ")); process.exit(1); }

console.log(`🎨 Generando hero: ${scenes.map((s) => s.name).join(", ")} (n=${N})\n`);
for (const s of scenes) await generateScene(s);
