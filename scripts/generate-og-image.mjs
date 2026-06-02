// Genera la FOTO de fondo de la imagen Open Graph (redes sociales) con MiniMax
// image-01. Se guarda en public/images/og/og-bg.jpg (la usa app/opengraph-image
// y app/twitter-image para componer el OG final con logo + texto).
//   node scripts/generate-og-image.mjs
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
const e = loadEnv();
const KEY = e.MINIMAX_API_KEY || e.LLM_API_KEY;

const prompt =
  "A beautifully styled celebration gift table seen from a slight angle: a surprise breakfast box with chocolate-covered strawberries and pastries, a bouquet of red and pink roses, a wrapped gift box with a gold ribbon and soft golden balloons, warm morning light, cozy romantic mood, plenty of empty space on the left side for text. " +
  "editorial lifestyle photography, warm soft light, creamy shallow depth of field bokeh, romantic premium boutique gift aesthetic, cream burgundy and gold color palette, high-end magazine quality, photorealistic, ultra detailed, no text, no letters, no words, no watermark, no logo";

const res = await fetch(`${BASE}/v1/image_generation`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "image-01",
    prompt,
    width: 1208, // ~1.91:1 (ratio Open Graph), múltiplo de 8
    height: 632,
    response_format: "url",
    n: 1,
    prompt_optimizer: true,
  }),
});
const json = await res.json();
if (json?.base_resp?.status_code !== 0 || !json?.data?.image_urls?.length) {
  console.error("✗", JSON.stringify(json?.base_resp));
  process.exit(1);
}
const buf = Buffer.from(await (await fetch(json.data.image_urls[0])).arrayBuffer());
const outDir = path.join(ROOT, "public/images/og");
fs.mkdirSync(outDir, { recursive: true });
// jpg para embeber en satori (data URI), webp por si se quiere usar directo
fs.writeFileSync(path.join(outDir, "og-bg.jpg"), await sharp(buf).jpeg({ quality: 88 }).toBuffer());
fs.writeFileSync(path.join(outDir, "og-bg.webp"), await sharp(buf).webp({ quality: 86 }).toBuffer());
console.log("✓ public/images/og/og-bg.jpg + .webp");
