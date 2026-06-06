#!/usr/bin/env node
/**
 * fix-language.mjs — Recorre el contenido (SEO de productos, blog, guías) y CORRIGE
 * al ESPAÑOL cualquier cadena que tenga caracteres de otro idioma (chino, japonés,
 * coreano, cirílico, portugués…). MiniMax es modelo chino y a veces los cuela.
 *
 * Reescribe SOLO las cadenas contaminadas (preserva el resto del archivo) y valida
 * que el resultado no tenga nada extranjero. Mantiene nombres propios/de marca.
 * Idempotente: si un archivo no tiene nada extranjero, ni lo abre para IA.
 *
 *   node scripts/fix-language.mjs --dry-run    # solo reporta qué corregiría
 *   node scripts/fix-language.mjs              # corrige y guarda
 *   node scripts/fix-language.mjs --limit=5    # corrige hasta 5 cadenas (prueba)
 *
 * Variables: LLM_API_KEY, LLM_BASE_URL (default minimax/anthropic), LLM_MODEL, LLM_API_STYLE.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEO_DIR = path.join(ROOT, "data", "seo");

const args = { dryRun: false, limit: 0 };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a.startsWith("--limit=")) args.limit = parseInt(a.slice(8), 10) || 0;
}

// ───────────────────────── entorno + LLM ─────────────────────────
async function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of (await readFile(path.join(ROOT, f), "utf8")).split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
        if (m && !process.env[m[1]]) {
          let v = m[2];
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          process.env[m[1]] = v;
        }
      }
    } catch { /* sin archivo */ }
  }
}

async function callLlm(system, user) {
  const base = (process.env.LLM_BASE_URL || "https://api.minimax.io/anthropic").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "MiniMax-M3";
  const apiKey = process.env.LLM_API_KEY || process.env.MINIMAX_API_KEY || "";
  const style = (process.env.LLM_API_STYLE || "auto") === "auto"
    ? (/\/anthropic(\/|$)/i.test(base) ? "anthropic" : "openai")
    : process.env.LLM_API_STYLE;
  let last = null;
  for (let a = 1; a <= 4; a++) {
    try {
      let url, headers, body;
      if (style === "anthropic") {
        url = `${base}/v1/messages`;
        headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
        body = { model, max_tokens: 8000, temperature: 0.3, system, messages: [{ role: "user", content: user }] };
      } else {
        url = `${base}/chat/completions`;
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
        body = { model, temperature: 0.3, max_tokens: 8000, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
      }
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        last = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
        if (res.status >= 400 && res.status < 500 && res.status !== 429) throw last;
      } else {
        const d = await res.json();
        const c = style === "anthropic"
          ? (d.content || []).filter((b) => b?.type === "text").map((b) => b.text).join("")
          : d.choices?.[0]?.message?.content;
        if (c && c.trim()) return c.trim();
        last = new Error("respuesta vacía");
      }
    } catch (e) { last = e; }
    if (a < 4) await new Promise((r) => setTimeout(r, 800 * 2 ** (a - 1)));
  }
  throw last;
}

// ───────────────────────── detección de idioma ─────────────────────────
const ALLOWED = "áéíóúüñÁÉÍÓÚÜÑºªª'";
// Letra fuera del alfabeto español (chino, cirílico, ç, ã, ê, ö, ò…).
function strictForeign(s) {
  for (const c of s) if (c.codePointAt(0) > 127 && /\p{L}/u.test(c) && !ALLOWED.includes(c)) return true;
  return false;
}
// Alfabeto NO latino (chino/japonés/coreano/cirílico/árabe/hebreo): nunca puede quedar.
const HARD_RE = /[㐀-鿿぀-ヿ가-힯Ѐ-ӿ֐-ۿ]/u;
const hardForeign = (s) => HARD_RE.test(s);

function anyForeign(o) {
  if (typeof o === "string") return strictForeign(o);
  if (Array.isArray(o)) return o.some(anyForeign);
  if (o && typeof o === "object") return Object.values(o).some(anyForeign);
  return false;
}

// ───────────────────────── corrección ─────────────────────────
const SYS =
  "Corriges textos al español de Colombia. Devuelves SOLO el texto corregido, " +
  "sin comillas ni explicaciones, conservando el mismo significado, tono y formato.";

async function fixString(s) {
  const user =
    "Reescribe el siguiente texto en español correcto y natural. Traduce al español " +
    "CUALQUIER palabra o carácter en chino, japonés, coreano, ruso, portugués u otro idioma. " +
    "Corrige los acentos a los del español (á é í ó ú ñ ü). Mantén los nombres propios y de " +
    "marca reales (equipos, productos). NO agregues ni quites información ni inventes datos.\n\n" +
    `Texto: «${s}»`;
  let best = null;
  for (let i = 0; i < 4; i++) {
    let f = (await callLlm(SYS, user)).replace(/^[«"']+|[»"']+$/g, "").trim();
    if (!strictForeign(f)) return f;            // 100% español
    if (!hardForeign(f) && !best) best = f;     // aceptable: queda un nombre propio con tilde rara
  }
  return best || (hardForeign(s) ? null : s);    // si todo intento dejó chino: null (no toca)
}

let fixedCount = 0;
async function fixObj(o, stats) {
  if (typeof o === "string") {
    if (strictForeign(o) && !(args.limit && fixedCount >= args.limit)) {
      stats.found++;
      const f = await fixString(o);
      if (f && f !== o) {
        fixedCount++;
        stats.fixed++;
        console.error(`    ✓ «${o.slice(0, 55)}»\n      → «${f.slice(0, 55)}»`);
        return f;
      }
      if (!f) console.error(`    ⚠ no pude limpiar (quedaba chino): «${o.slice(0, 60)}»`);
    }
    return o;
  }
  if (Array.isArray(o)) {
    const r = [];
    for (const v of o) r.push(await fixObj(v, stats));
    return r;
  }
  if (o && typeof o === "object") {
    const r = {};
    for (const [k, v] of Object.entries(o)) r[k] = await fixObj(v, stats);
    return r;
  }
  return o;
}

// ───────────────────────── main ─────────────────────────
async function main() {
  await loadEnv();
  if (!process.env.LLM_API_KEY && !process.env.MINIMAX_API_KEY) {
    console.error("Error: falta LLM_API_KEY (.env.local)");
    process.exit(1);
  }
  const seoFiles = (await readdir(SEO_DIR).catch(() => []))
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(SEO_DIR, f));
  const files = [path.join(ROOT, "data", "blog.json"), path.join(ROOT, "data", "guias.json"), ...seoFiles];

  let totalFound = 0, totalFixed = 0, filesTouched = 0;
  for (const file of files) {
    let data;
    try { data = JSON.parse(await readFile(file, "utf8")); } catch { continue; }
    if (!anyForeign(data)) continue; // limpio: ni lo procesamos
    if (args.limit && fixedCount >= args.limit) break;
    console.error(`\n${path.relative(ROOT, file)}:`);
    const stats = { found: 0, fixed: 0 };
    const fixed = await fixObj(data, stats);
    totalFound += stats.found; totalFixed += stats.fixed;
    if (!args.dryRun && stats.fixed > 0) {
      await writeFile(file, JSON.stringify(fixed, null, 2) + "\n", "utf8");
      filesTouched++;
    }
    console.error(`  → ${stats.found} cadenas extranjeras, ${stats.fixed} corregidas${args.dryRun ? " (DRY-RUN, no se guardó)" : ""}`);
  }
  console.error(`\n${"=".repeat(50)}`);
  console.error(`TOTAL: ${totalFound} cadenas extranjeras, ${totalFixed} corregidas, ${filesTouched} archivos${args.dryRun ? " (DRY-RUN)" : " guardados"}.`);
}

main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
