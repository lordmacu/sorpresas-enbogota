// Genera un clip image-to-video (MiniMax Hailuo) a partir de la foto real de un
// producto. Crea la tarea → hace polling → descarga el MP4.
//   node scripts/generate-reel-video.mjs [slug] [--res=768P|1080P] [--dur=6|10]
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
const env = loadEnv();
const KEY = env.MINIMAX_API_KEY || env.LLM_API_KEY;
const AUTH = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--")) || "super-brunch";
const RES = (args.find((a) => a.startsWith("--res=")) || "--res=768P").split("=")[1];
const DUR = parseInt((args.find((a) => a.startsWith("--dur=")) || "--dur=6").split("=")[1], 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const productos = JSON.parse(fs.readFileSync(path.join(ROOT, "data/productos.json"), "utf8")).productos;
const prod = productos.find((p) => p.slug === slug) || productos[0];

// Prompt de movimiento cinematográfico (genérico, seguro para producto).
const prompt =
  "Cinematic slow push-in on the product, gentle natural morning light, soft shallow depth of field, subtle realistic motion (light steam, slight sway), elegant and warm, no text changes, no people added.";

async function main() {
  console.log(`🎬 ${prod.nombre} · ${RES} · ${DUR}s · modelo MiniMax-Hailuo-2.3`);

  // Foto → jpeg base64
  const abs = path.join(ROOT, "public", prod.imagen);
  const jpeg = await sharp(abs).resize(1280, 1280, { fit: "inside" }).jpeg({ quality: 90 }).toBuffer();
  const dataUri = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

  // 1) Crear tarea
  const createRes = await fetch(`${BASE}/v1/video_generation`, {
    method: "POST",
    headers: AUTH,
    body: JSON.stringify({
      model: "MiniMax-Hailuo-2.3",
      prompt,
      first_frame_image: dataUri,
      duration: DUR,
      resolution: RES,
    }),
  });
  const created = await createRes.json();
  console.log("crear:", JSON.stringify(created.base_resp), "task_id:", created.task_id || "—");
  if (!created.task_id) {
    console.error("✗ No se creó la tarea. Revisa base_resp arriba.");
    process.exit(1);
  }

  // 2) Polling
  let fileId = null;
  for (let i = 1; i <= 36; i++) {
    await sleep(10000);
    const q = await (
      await fetch(`${BASE}/v1/query/video_generation?task_id=${created.task_id}`, { headers: AUTH })
    ).json();
    const status = q.status;
    process.stdout.write(`  [${i}] ${status}\n`);
    if (status === "Success") { fileId = q.file_id; break; }
    if (status === "Fail") { console.error("✗ Falló:", q.base_resp?.status_msg || JSON.stringify(q)); process.exit(1); }
  }
  if (!fileId) { console.error("✗ Timeout esperando el video."); process.exit(1); }

  // 3) Recuperar archivo
  const r = await (await fetch(`${BASE}/v1/files/retrieve?file_id=${fileId}`, { headers: AUTH })).json();
  const dl = r.file?.download_url;
  if (!dl) { console.error("✗ Sin download_url:", JSON.stringify(r).slice(0, 300)); process.exit(1); }

  const mp4 = Buffer.from(await (await fetch(dl)).arrayBuffer());
  const outDir = path.join(ROOT, "content/instagram/_video");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${prod.slug}.mp4`);
  fs.writeFileSync(out, mp4);
  console.log(`✓ VIDEO OK → ${path.relative(ROOT, out)} (${(mp4.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => { console.error("error:", e.message); process.exit(1); });
