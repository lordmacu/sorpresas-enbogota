// Voz en off (voiceover) para Reels con MiniMax TTS (t2a_v2).
// Convierte un guion en MP3 con voz en español.
//
//   node scripts/generate-voiceover.mjs --slug=super-brunch
//   node scripts/generate-voiceover.mjs --text="Tu guion aquí" --out=mi.mp3
//   node scripts/generate-voiceover.mjs            # genera VO para toda la cola
//   Opciones: --voice=Spanish_SereneWoman --model=speech-02-hd
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const env = loadEnv();
const KEY = env.MINIMAX_API_KEY || env.LLM_API_KEY;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const VOICE = args.voice || "Spanish_SereneWoman";
const MODEL = args.model || "speech-02-hd";

const config = JSON.parse(fs.readFileSync(path.join(ROOT, "data/config.json"), "utf8"));
const waPretty = (n) => String(n).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

// Guion de ~12-16s a partir del producto (gancho + incluye + cierre + CTA).
export function reelScript(product) {
  const incluye =
    Array.isArray(product.contenido) && product.contenido.length
      ? `Incluye ${product.contenido.slice(0, 3).join(", ")}.`
      : "";
  const precio = "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(product.precio);
  return [
    `¿Buscas el detalle perfecto? Te presentamos ${product.nombre}.`,
    incluye,
    `Hecho a mano y entregado el mismo día en toda Bogotá, por ${precio}.`,
    `Pídelo por WhatsApp. En Sorpresas, cada momento merece ser celebrado.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function tts(text, { voice = VOICE, model = MODEL } = {}) {
  const res = await fetch(`${BASE}/v1/t2a_v2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      text,
      stream: false,
      language_boost: "Spanish",
      voice_setting: { voice_id: voice, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3" },
    }),
  });
  const json = await res.json();
  if (json?.base_resp?.status_code !== 0 || !json?.data?.audio) {
    throw new Error(`TTS falló: ${JSON.stringify(json?.base_resp)}`);
  }
  return Buffer.from(json.data.audio, "hex");
}

async function main() {
  if (!KEY) { console.error("✗ Falta API key en .env"); process.exit(1); }

  // 1) Texto explícito
  if (args.text) {
    const buf = await tts(String(args.text));
    const out = path.join(ROOT, args.out || "content/instagram/_audio/voiceover.mp3");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log(`✓ ${path.relative(ROOT, out)} (${(buf.length / 1024).toFixed(0)} KB)`);
    return;
  }

  const productos = JSON.parse(fs.readFileSync(path.join(ROOT, "data/productos.json"), "utf8")).productos;

  // 2) Un producto
  if (args.slug) {
    const p = productos.find((x) => x.slug === args.slug);
    if (!p) { console.error("✗ slug no encontrado"); process.exit(1); }
    const guion = reelScript(p);
    console.log("guion:", guion);
    const buf = await tts(guion);
    const out = path.join(ROOT, "content/instagram/_audio", `${p.slug}.mp3`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log(`✓ ${path.relative(ROOT, out)} (${(buf.length / 1024).toFixed(0)} KB)`);
    return;
  }

  // 3) Toda la cola: genera voiceover junto a cada post
  const queuePath = path.join(ROOT, "content/instagram/queue.json");
  if (!fs.existsSync(queuePath)) { console.error("✗ No hay cola. Corre primero npm run ig:generate"); process.exit(1); }
  const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  for (const item of queue) {
    const p = productos.find((x) => x.slug === item.slug);
    if (!p) continue;
    const dir = path.dirname(path.join(ROOT, item.image));
    const out = path.join(dir, "voiceover.mp3");
    if (fs.existsSync(out)) { console.log(`· ya existe ${item.slug}`); continue; }
    const buf = await tts(reelScript(p));
    fs.writeFileSync(out, buf);
    console.log(`✓ ${path.relative(ROOT, out)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
}

// Ejecuta main() solo si se invoca directamente (permite importar tts/reelScript).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e.message); process.exit(1); });
