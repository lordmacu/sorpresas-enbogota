// Arma un Reel (1080×1920) a partir de la FOTO REAL del producto:
//   foto → fondo desenfocado + foto centrada → Ken Burns (zoom/paneo) con ffmpeg
//   + voz en off (MiniMax TTS) + música de fondo (ducked) → reel.mp4
//
//   node scripts/generate-reel.mjs --slug=super-brunch
//   node scripts/generate-reel.mjs --slug=super-brunch --music=scripts/assets/music/bed.mp3
//
// Cuando habilites el video Hailuo, este paso (Ken Burns) se reemplaza por el
// clip de generate-reel-video.mjs; el resto (voz+música+merge) es idéntico.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { tts, reelScript } from "./generate-voiceover.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const FPS = 30;

const productos = JSON.parse(fs.readFileSync(path.join(ROOT, "data/productos.json"), "utf8")).productos;
const prod = productos.find((p) => p.slug === (args.slug || "super-brunch")) || productos[0];

const audioDir = path.join(ROOT, "content/instagram/_audio");
fs.mkdirSync(audioDir, { recursive: true });

const ffprobeDur = (file) =>
  parseFloat(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", file,
    ]).toString().trim()
  );

async function ensureVoiceover() {
  const out = path.join(audioDir, `${prod.slug}.mp3`);
  if (fs.existsSync(out)) return out;
  console.log("· generando voz en off…");
  const buf = await tts(reelScript(prod));
  fs.writeFileSync(out, buf);
  return out;
}

async function buildBase() {
  const photo = path.join(ROOT, "public", prod.imagen);
  const bg = await sharp(photo).resize(1080, 1920, { fit: "cover" }).blur(38).modulate({ brightness: 0.6 }).toBuffer();
  const fg = await sharp(photo).resize(1000, 1480, { fit: "inside" }).toBuffer();
  const base = await sharp(bg)
    .composite([{ input: fg, gravity: "centre" }])
    .png()
    .toBuffer();
  const file = path.join(os.tmpdir(), `reel-base-${prod.slug}.png`);
  fs.writeFileSync(file, base);
  return file;
}

async function main() {
  console.log(`🎬 Reel · ${prod.nombre}`);
  const voice = await ensureVoiceover();
  const music = path.join(ROOT, args.music || "content/instagram/_audio/musica-prueba.mp3");
  if (!fs.existsSync(music)) {
    console.error(`✗ Falta música: ${path.relative(ROOT, music)} (genera una con music-2.6 o pasa --music=)`);
    process.exit(1);
  }

  const voDur = ffprobeDur(voice);
  const DUR = +(voDur + 1.0).toFixed(2); // colita tras la voz
  const frames = Math.round(DUR * FPS);
  const base = await buildBase();

  const outDir = path.join(ROOT, "content/instagram/_video");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${prod.slug}-reel.mp4`);

  // Ken Burns (zoom lento) + mezcla voz (alta) + música (ducked, fade-out).
  const filter = [
    `[0:v]scale=1620:2880,zoompan=z='min(zoom+0.0006,1.18)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},format=yuv420p[v]`,
    `[1:a]volume=1.6[vo]`,
    `[2:a]volume=0.16,afade=t=out:st=${(DUR - 1.4).toFixed(2)}:d=1.4[mus]`,
    `[vo][mus]amix=inputs=2:duration=first:normalize=0[a]`,
  ].join(";");

  console.log(`· render ${DUR}s @ ${FPS}fps…`);
  execFileSync("ffmpeg", [
    "-y",
    "-loop", "1", "-i", base,
    "-i", voice,
    "-i", music,
    "-filter_complex", filter,
    "-map", "[v]", "-map", "[a]",
    "-t", String(DUR),
    "-r", String(FPS),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    out,
  ], { stdio: ["ignore", "ignore", "inherit"] });

  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(2);
  const dur = ffprobeDur(out).toFixed(1);
  console.log(`✓ REEL → ${path.relative(ROOT, out)} · ${dur}s · ${size} MB · 1080x1920`);
}

main().catch((e) => { console.error("error:", e.message); process.exit(1); });
