// Diagnóstico: ¿el plan cubre generación de música (music-2.6)?
import fs from "node:fs";
function loadEnv() {
  const env = {};
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}
const env = loadEnv();
const KEY = env.MINIMAX_API_KEY || env.LLM_API_KEY;
const MODEL = process.argv[2] || "music-2.6";

const res = await fetch("https://api.minimax.io/v1/music_generation", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL,
    prompt: "Warm acoustic guitar and soft piano, romantic, cozy and uplifting, instrumental background for a Bogotá gift-delivery brand",
    is_instrumental: true,
    audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3" },
  }),
});
const json = await res.json();
console.log("modelo:", MODEL, "| HTTP:", res.status, "| base_resp:", JSON.stringify(json?.base_resp));
const hex = json?.data?.audio;
if (hex) {
  const buf = Buffer.from(hex, "hex");
  fs.mkdirSync("content/instagram/_audio", { recursive: true });
  fs.writeFileSync("content/instagram/_audio/musica-prueba.mp3", buf);
  console.log(`✓ MÚSICA OK → content/instagram/_audio/musica-prueba.mp3 (${(buf.length / 1024).toFixed(0)} KB)`, JSON.stringify(json.extra_info || {}));
} else {
  console.log("✗ Sin audio (motivo en base_resp).");
}
