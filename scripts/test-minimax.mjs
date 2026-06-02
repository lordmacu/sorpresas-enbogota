// Diagnóstico: ¿la cuenta MiniMax puede usar el API nativo (audio/video)?
// Hace una llamada TTS barata a /v1/t2a_v2 y reporta el estado real.
// No imprime la API key. Uso: node scripts/test-minimax.mjs
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
const GROUP = env.MINIMAX_GROUP_ID || env.MINIMAX_GROUPID || "";
const BASE = "https://api.minimax.io";

if (!KEY) {
  console.error("✗ No hay API key (LLM_API_KEY / MINIMAX_API_KEY).");
  process.exit(1);
}
console.log("Key:", "presente (oculta)", "| GroupId:", GROUP ? "presente" : "(ausente)");

const url = `${BASE}/v1/t2a_v2${GROUP ? `?GroupId=${encodeURIComponent(GROUP)}` : ""}`;
const body = {
  model: "speech-02-turbo",
  text: "Hola, esto es una prueba de voz de Sorpresas, regalos a domicilio en Bogotá.",
  stream: false,
  language_boost: "Spanish",
  voice_setting: { voice_id: "Spanish_SereneWoman", speed: 1, vol: 1, pitch: 0 },
  audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3" },
};

console.log("→ POST", url.replace(/GroupId=[^&]+/, "GroupId=***"));
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try { json = JSON.parse(text); } catch { json = null; }

console.log("HTTP:", res.status);
if (json?.base_resp) console.log("base_resp:", JSON.stringify(json.base_resp));
if (!json) console.log("respuesta cruda:", text.slice(0, 300));

const hex = json?.data?.audio;
if (hex) {
  const buf = Buffer.from(hex, "hex");
  fs.mkdirSync("content/instagram/_audio", { recursive: true });
  fs.writeFileSync("content/instagram/_audio/prueba.mp3", buf);
  console.log(`✓ AUDIO OK → content/instagram/_audio/prueba.mp3 (${(buf.length / 1024).toFixed(0)} KB)`);
  if (json?.extra_info) console.log("extra_info:", JSON.stringify(json.extra_info));
} else {
  console.log("✗ Sin audio. (Arriba está el motivo en base_resp/HTTP.)");
}
