#!/usr/bin/env node
/**
 * generate-seo.mjs
 *
 * Genera el contenido SEO/editorial de los productos en data/seo/<slug>.json
 * usando un LLM compatible con la API de OpenAI (OpenAI, OpenRouter, Groq, etc.)
 * y el prompt definido en prompts/producto-seo.md.
 *
 * Características:
 *   - Idempotente: salta los JSONs que ya existen (usa --force para regenerar).
 *   - Resumible: si se interrumpe, se puede volver a correr y continúa donde quedó.
 *   - Reintentos: 3 intentos por producto con backoff exponencial en 429/5xx.
 *   - Concurrencia: pool de workers en paralelo (default 4).
 *   - Validación: verifica forma, longitudes y campos obligatorios antes de escribir.
 *   - Errores: se loguean en data/seo/errors.log y el proceso sale con código 2.
 *
 * Variables de entorno (definir en .env.local o exportar antes de correr):
 *   LLM_API_KEY     Requerido. API key del proveedor.
 *   LLM_BASE_URL    Opcional. Default: https://api.openai.com/v1
 *   LLM_MODEL       Opcional. Default: gpt-4o-mini
 *   LLM_API_STYLE   Opcional. auto | openai | anthropic (default auto). Detecta
 *                   por la URL: el endpoint .../anthropic usa el protocolo
 *                   Anthropic (/v1/messages, header x-api-key); el resto usa el
 *                   protocolo OpenAI (/chat/completions, Bearer).
 *   LLM_JSON_MODE   Opcional. auto | on | off (default auto). Controla si se
 *                   envía response_format: json_object (solo estilo openai).
 *
 * Funciona con APIs compatibles con OpenAI o con Anthropic. Ejemplos:
 *   OpenAI:           LLM_BASE_URL=https://api.openai.com/v1   LLM_MODEL=gpt-4o-mini
 *   MiniMax Token Plan (recomendado para usar la cuota del plan, no PAYG):
 *                     LLM_BASE_URL=https://api.minimax.io/anthropic  LLM_MODEL=MiniMax-M2.5
 *   MiniMax PAYG:     LLM_BASE_URL=https://api.minimax.io/v1   LLM_MODEL=MiniMax-M2.5
 *   OpenRouter:       LLM_BASE_URL=https://openrouter.ai/api/v1
 *
 * NOTA Token Plan: usa la API key de tu cuenta MiniMax (la misma sirve para plan
 * y PAYG). Apuntando al endpoint .../anthropic consumes la cuota del Token Plan.
 * El modelo lo define tu plan; verifica el nombre en tu página de Token Plan.
 *
 * Uso:
 *   node scripts/generate-seo.mjs                          # genera los faltantes
 *   node scripts/generate-seo.mjs --force                  # regenera todo
 *   node scripts/generate-seo.mjs --slug=eternal-roses     # solo un producto
 *   node scripts/generate-seo.mjs --limit=10               # solo los primeros 10
 *   node scripts/generate-seo.mjs --concurrency=8          # más paralelismo
 *   node scripts/generate-seo.mjs --dry-run                # no llama a la API
 *   node scripts/generate-seo.mjs --model=MiniMax-M2.1     # usar otro modelo
 */

import { readFile, writeFile, access, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PRODUCTOS = path.join(ROOT, "data", "productos.json");
const CATEGORIAS = path.join(ROOT, "data", "categorias.json");
const SEO_DIR = path.join(ROOT, "data", "seo");
const PROMPT_FILE = path.join(ROOT, "prompts", "producto-seo.md");
const ERRORS_LOG = path.join(SEO_DIR, "errors.log");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadEnv() {
  // Lee .env.local y .env (.env.local tiene prioridad porque se lee primero y
  // el primero en definir gana). Las variables ya presentes en el entorno real
  // no se sobrescriben.
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
        if (m && !process.env[m[1]]) {
          let v = m[2];
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          process.env[m[1]] = v;
        }
      }
    } catch {
      /* el archivo no existe, no es error */
    }
  }
}

function parseArgs(argv) {
  const args = {
    force: false,
    slug: null,
    limit: null,
    concurrency: 4,
    dryRun: false,
    model: null,
    maxTokens: null,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--force") args.force = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--slug=")) args.slug = arg.slice(7);
    else if (arg.startsWith("--limit=")) args.limit = parseInt(arg.slice(8), 10);
    else if (arg.startsWith("--concurrency=")) args.concurrency = parseInt(arg.slice(14), 10);
    else if (arg.startsWith("--model=")) args.model = arg.slice(8);
    else if (arg.startsWith("--max-tokens=")) args.maxTokens = parseInt(arg.slice(13), 10);
  }
  return args;
}

function printHelp() {
  console.log(`Genera contenido SEO/editorial de productos usando un LLM.

Uso: node scripts/generate-seo.mjs [opciones]

Opciones:
  --force                Regenerar JSONs existentes (por defecto se saltan)
  --slug=<slug>          Generar solo un producto por slug
  --limit=<n>            Limitar a N productos (útil para pruebas)
  --concurrency=<n>      Número de llamadas paralelas (default 4)
  --model=<modelo>       Sobrescribir LLM_MODEL
  --dry-run              No llama a la API; imprime el primer prompt y sale
  -h, --help             Mostrar esta ayuda

Variables de entorno:
  LLM_API_KEY            (requerido salvo --dry-run) API key del proveedor
  LLM_BASE_URL           (opcional) default https://api.openai.com/v1
  LLM_MODEL              (opcional) default gpt-4o-mini
  LLM_API_STYLE          (opcional) auto|openai|anthropic, default auto
  LLM_JSON_MODE          (opcional) auto|on|off, default auto

Proveedores:
  OpenAI              LLM_BASE_URL=https://api.openai.com/v1        LLM_MODEL=gpt-4o-mini
  MiniMax Token Plan  LLM_BASE_URL=https://api.minimax.io/anthropic LLM_MODEL=MiniMax-M2.5
  MiniMax PAYG        LLM_BASE_URL=https://api.minimax.io/v1        LLM_MODEL=MiniMax-M2.5
  OpenRouter          LLM_BASE_URL=https://openrouter.ai/api/v1
`);
}

function validateSeo(obj, slug) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return "no es un objeto JSON";
  }
  if (obj.slug !== slug) {
    return `slug esperado "${slug}", recibido "${obj.slug}"`;
  }
  const required = [
    "slug",
    "metaTitle",
    "metaDescription",
    "intro",
    "highlights",
    "paraQuien",
    "ocasiones",
    "incluyeDetallado",
    "cuidados",
    "mensajesTarjeta",
    "faqs",
    "keywordsObjetivo",
  ];
  for (const k of required) {
    if (!(k in obj)) return `falta campo "${k}"`;
  }
  if (typeof obj.metaTitle !== "string") return "metaTitle no es string";
  if (obj.metaTitle.length < 25 || obj.metaTitle.length > 75) {
    return `metaTitle longitud ${obj.metaTitle.length} fuera de [25,75]`;
  }
  if (typeof obj.metaDescription !== "string") return "metaDescription no es string";
  if (obj.metaDescription.length < 110 || obj.metaDescription.length > 180) {
    return `metaDescription longitud ${obj.metaDescription.length} fuera de [110,180]`;
  }
  // Arrays: si el modelo se pasa del máximo, RECORTAMOS (no rechazamos un buen
  // resultado por un elemento de más). Solo fallamos si faltan elementos.
  const trim = (arr, max) => (Array.isArray(arr) ? arr.slice(0, max) : arr);
  obj.highlights = trim(obj.highlights, 5);
  obj.ocasiones = trim(obj.ocasiones, 6);
  obj.mensajesTarjeta = trim(obj.mensajesTarjeta, 3);
  obj.faqs = trim(obj.faqs, 6);
  obj.keywordsObjetivo = trim(obj.keywordsObjetivo, 8);

  if (!Array.isArray(obj.highlights) || obj.highlights.length < 3) {
    return `highlights longitud ${obj.highlights?.length} < 3`;
  }
  if (!Array.isArray(obj.ocasiones) || obj.ocasiones.length < 3) {
    return `ocasiones longitud ${obj.ocasiones?.length} < 3`;
  }
  if (!Array.isArray(obj.incluyeDetallado)) return "incluyeDetallado no es array";
  for (const it of obj.incluyeDetallado) {
    if (!it || typeof it.item !== "string" || typeof it.detalle !== "string") {
      return "incluyeDetallado item/detalle no son string";
    }
  }
  if (!Array.isArray(obj.cuidados)) return "cuidados no es array";
  if (!Array.isArray(obj.mensajesTarjeta) || obj.mensajesTarjeta.length < 3) {
    return `mensajesTarjeta longitud ${obj.mensajesTarjeta?.length} < 3`;
  }
  if (!Array.isArray(obj.faqs) || obj.faqs.length < 4) {
    return `faqs longitud ${obj.faqs?.length} < 4`;
  }
  for (const f of obj.faqs) {
    if (!f || typeof f.pregunta !== "string" || typeof f.respuesta !== "string") {
      return "faqs pregunta/respuesta no son string";
    }
  }
  if (!Array.isArray(obj.keywordsObjetivo) || obj.keywordsObjetivo.length < 4) {
    return `keywordsObjetivo longitud ${obj.keywordsObjetivo?.length} < 4`;
  }
  return null;
}

function extractJson(text) {
  let t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenced) t = fenced[1].trim();
  // Algunos modelos (p. ej. de razonamiento) anteponen texto: tomamos el primer
  // objeto JSON balanceado que aparezca.
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(t.slice(start, end + 1));
    }
    throw new SyntaxError("No se encontró JSON válido en la respuesta");
  }
}

// Protocolo de la API: "openai" (/chat/completions, Bearer) o "anthropic"
// (/v1/messages, x-api-key). En "auto" se detecta por la URL: el endpoint del
// Token Plan / Coding Plan de MiniMax es https://api.minimax.io/anthropic.
function resolveApiStyle(style, baseUrl) {
  const s = (style || "auto").toLowerCase();
  if (s === "openai" || s === "anthropic") return s;
  return /\/anthropic(?:\/|$)/i.test(baseUrl) ? "anthropic" : "openai";
}

// Decide si enviar response_format: json_object (solo aplica a estilo openai).
// En "auto" solo se activa para proveedores que lo soportan; MiniMax y otros lo
// desactivan (el prompt ya pide "solo JSON" y extractJson limpia la respuesta).
function resolveJsonMode(mode, baseUrl) {
  const m = (mode || "auto").toLowerCase();
  if (m === "on") return true;
  if (m === "off") return false;
  return /(?:openai\.com|openrouter\.ai|groq\.com|together\.(?:ai|xyz)|api\.deepseek\.com)/i.test(
    baseUrl
  );
}

async function callLlm({ system, user, baseUrl, apiKey, model, apiStyle, jsonMode, maxTokens, maxRetries = 5 }) {
  let lastErr = null;
  let useJsonMode = jsonMode && apiStyle === "openai";
  const base = baseUrl.replace(/\/+$/, "");
  const TOKENS_CAP = 32000;
  let tokens = maxTokens || 16384;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let url, headers, body;
      if (apiStyle === "anthropic") {
        // Endpoint Anthropic-compatible (Token Plan / Coding Plan de MiniMax).
        url = `${base}/v1/messages`;
        headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };
        body = {
          model,
          max_tokens: tokens,
          temperature: 0.6,
          system, // el system prompt va como parámetro, no como mensaje
          messages: [{ role: "user", content: user }],
        };
      } else {
        url = `${base}/chat/completions`;
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        body = {
          model,
          temperature: 0.6,
          max_tokens: tokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        };
        if (useJsonMode) body.response_format = { type: "json_object" };
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        lastErr = new Error(`HTTP ${res.status}: ${errBody.slice(0, 300)}`);
        // Si el proveedor rechaza response_format, reintentar sin él.
        if (res.status === 400 && useJsonMode && /response_format|json/i.test(errBody)) {
          console.error("  ⓘ el proveedor no acepta response_format; reintentando sin json_object");
          useJsonMode = false;
          continue;
        }
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw lastErr;
        }
      } else {
        const data = await res.json();
        const stop = data.stop_reason || data.choices?.[0]?.finish_reason;
        const content =
          apiStyle === "anthropic"
            ? (data.content || [])
                .filter((b) => b && b.type === "text" && typeof b.text === "string")
                .map((b) => b.text)
                .join("")
            : data.choices?.[0]?.message?.content;
        // Respuesta cortada por límite de tokens: el JSON viene incompleto.
        // Subimos el budget (x2) y reintentamos; si ya tocamos el tope, fallamos.
        if (stop === "max_tokens" || stop === "length") {
          if (tokens < TOKENS_CAP) {
            const next = Math.min(tokens * 2, TOKENS_CAP);
            console.error(`  ⓘ truncado a ${tokens} tokens; reintentando con ${next}`);
            tokens = next;
            continue;
          }
          const err = new Error(`respuesta truncada incluso con max_tokens=${tokens}`);
          err.fatal = true;
          throw err;
        }
        if (!content) throw new Error("Respuesta vacía del LLM (¿todo el presupuesto se fue en 'thinking'? sube LLM_MAX_TOKENS)");
        return content;
      }
    } catch (e) {
      lastErr = e;
      if (e.fatal) throw e; // truncamiento u otro error determinista: no reintentar
    }
    if (attempt < maxRetries) {
      const delay = 800 * Math.pow(2, attempt - 1);
      console.error(`  ⟳ reintento ${attempt + 1}/${maxRetries} en ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

function buildSystemPrompt(rawPrompt) {
  // Quitamos el bloque de EJEMPLO (entre "## EJEMPLO" y "## INSTRUCCIÓN FINAL")
  // y la sección "INSTRUCCIÓN FINAL" porque la instrucción se la damos en el user
  // message. Así el LLM no se sesga hacia copiar el ejemplo y queda solo el
  // contexto editorial + esquema + reglas.
  return rawPrompt
    .replace(/## EJEMPLO[\s\S]*?(?=## INSTRUCCIÓN FINAL)/m, "")
    .replace(/## INSTRUCCIÓN FINAL[\s\S]*$/m, "")
    .trim();
}

async function buildUserMessage(producto, categoriaNombre) {
  const payload = {
    slug: producto.slug,
    nombre: producto.nombre,
    categoria: producto.categoria,
    categoriaNombre,
    contenido: Array.isArray(producto.contenido) ? producto.contenido : [],
    tags: Array.isArray(producto.tags) ? producto.tags : [],
    camposExtra: producto.camposExtra || {},
  };
  return (
    JSON.stringify(payload, null, 2) +
    "\n\n---\n\n" +
    "Genera el JSON para este producto siguiendo el esquema y las reglas. " +
    "Devuelve únicamente el JSON, sin explicaciones ni fences de markdown."
  );
}

// Regla de idioma irrompible + detector de alfabetos extranjeros (chino, japonés,
// coreano, cirílico, árabe). MiniMax es modelo chino y a veces cuela caracteres.
const SPANISH_RULE =
  "\n\nREGLA IRROMPIBLE: TODO el texto va en ESPAÑOL (Colombia). PROHIBIDO incluir " +
  "cualquier palabra o carácter en chino, japonés, coreano, ruso u otro alfabeto. " +
  "Si aparece un solo carácter de otro idioma, la respuesta es INVÁLIDA.";

const _FOREIGN_RE = /[㐀-鿿぀-ヿ가-힯Ѐ-ӿ֐-ۿ]/;
function hasForeignText(obj) {
  if (typeof obj === "string") return _FOREIGN_RE.test(obj);
  if (Array.isArray(obj)) return obj.some(hasForeignText);
  if (obj && typeof obj === "object") return Object.values(obj).some(hasForeignText);
  return false;
}

async function processOne(item, opts) {
  const { producto, categoriaNombre } = item;
  const target = path.join(SEO_DIR, `${producto.slug}.json`);

  const exists = await access(target).then(() => true).catch(() => false);
  if (exists && !opts.force) {
    return { slug: producto.slug, status: "skip" };
  }

  const system = buildSystemPrompt(opts.promptText) + SPANISH_RULE;
  const user = await buildUserMessage(producto, categoriaNombre);

  if (opts.dryRun) {
    console.error(`\n=== ${producto.slug} ===`);
    console.error("SYSTEM (primeros 500 chars):\n", system.slice(0, 500), "…");
    console.error("\nUSER:\n", user);
    return { slug: producto.slug, status: "dry" };
  }

  let obj = null;
  for (let intento = 0; intento < 3; intento++) {
    const content = await callLlm({
      system,
      user,
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      model: opts.model,
      apiStyle: opts.apiStyle,
      jsonMode: opts.jsonMode,
      maxTokens: opts.maxTokens,
    });
    const cand = extractJson(content);
    const err = validateSeo(cand, producto.slug);
    if (err) {
      if (intento < 2) continue;
      throw new Error(`Validación: ${err}`);
    }
    if (hasForeignText(cand)) {
      continue; // chino/otro alfabeto: se rechaza y se regenera
    }
    obj = cand;
    break;
  }
  if (!obj) {
    throw new Error("idioma: el texto no quedó en español (chino u otro alfabeto) tras 3 intentos");
  }
  await writeFile(target, JSON.stringify(obj, null, 2) + "\n", "utf8");
  return { slug: producto.slug, status: "ok" };
}

async function worker(queue, opts, results, errors, progress) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    let line;
    try {
      const r = await processOne(item, opts);
      results.push(r);
      if (r.status === "ok") line = `✓ ${r.slug}`;
      else if (r.status === "skip") line = `· ${r.slug} (ya existía)`;
      else if (r.status === "dry") line = `~ ${r.slug} (dry-run)`;
      else line = `${r.slug}`;
    } catch (e) {
      const errLine = `${new Date().toISOString()} ${item.producto.slug}: ${e.message}`;
      results.push({ slug: item.producto.slug, status: "error", error: e.message });
      errors.push(errLine);
      line = `✗ ${item.producto.slug}: ${e.message}`;
    }
    // Contador al completar -> siempre creciente, aunque haya concurrencia.
    const n = ++progress.done;
    const tag = `[${String(n).padStart(String(progress.total).length)}/${progress.total}]`;
    console.error(`${tag} ${line}`);
  }
}

async function main() {
  await loadEnv();
  const args = parseArgs(process.argv);

  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = args.model || process.env.LLM_MODEL || "gpt-4o-mini";
  const apiKey = process.env.LLM_API_KEY || "";
  const apiStyle = resolveApiStyle(process.env.LLM_API_STYLE, baseUrl);
  const jsonMode = resolveJsonMode(process.env.LLM_JSON_MODE, baseUrl);
  const maxTokens =
    args.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || "", 10) || 16384;

  if (!args.dryRun && !apiKey) {
    console.error("Error: LLM_API_KEY no está definida. Configúrala en .env.local o como variable de entorno.");
    process.exit(1);
  }

  await mkdir(SEO_DIR, { recursive: true });

  const productosData = JSON.parse(await readFile(PRODUCTOS, "utf8"));
  const categoriasData = JSON.parse(await readFile(CATEGORIAS, "utf8"));
  const categoriasById = new Map(categoriasData.categorias.map((c) => [c.id, c]));

  let productos = productosData.productos.filter((p) => p.visible && (p.stock || 0) > 0);
  if (args.slug) {
    productos = productos.filter((p) => p.slug === args.slug);
    if (productos.length === 0) {
      console.error(`No se encontró el producto con slug "${args.slug}" (o no es visible/con stock).`);
      process.exit(1);
    }
  }
  if (args.limit) {
    productos = productos.slice(0, args.limit);
  }

  const promptText = await readFile(PROMPT_FILE, "utf8");

  const queue = productos.map((p) => ({
    producto: p,
    categoriaNombre: categoriasById.get(p.categoria)?.nombre || p.categoria,
  }));

  console.error(
    `[generate-seo] productos=${queue.length} model=${model} base=${baseUrl} ` +
      `style=${apiStyle} jsonMode=${jsonMode && apiStyle === "openai" ? "on" : "off"} ` +
      `maxTokens=${maxTokens} concurrency=${args.concurrency} force=${args.force}` +
      (args.slug ? ` slug=${args.slug}` : "") +
      (args.dryRun ? " DRY-RUN" : "")
  );

  const opts = { ...args, promptText, baseUrl, apiKey, model, apiStyle, jsonMode, maxTokens };
  const results = [];
  const errors = [];
  const progress = { done: 0, total: queue.length };

  // Acumulamos errores en memoria y escribimos errors.log al final.
  const numWorkers = Math.min(args.concurrency, Math.max(queue.length, 1));
  const workers = Array.from({ length: numWorkers }, () =>
    worker(queue, opts, results, errors, progress)
  );
  await Promise.all(workers);

  if (errors.length > 0) {
    await writeFile(ERRORS_LOG, errors.join("\n") + "\n", "utf8");
  } else {
    // Corrida limpia: borramos cualquier errors.log viejo para no confundir.
    await rm(ERRORS_LOG, { force: true });
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  console.error("\n[generate-seo] Resumen:", counts);

  if (errors.length > 0) {
    console.error(
      `[generate-seo] ${errors.length} errores. Detalles en ${path.relative(process.cwd(), ERRORS_LOG)}`
    );
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
