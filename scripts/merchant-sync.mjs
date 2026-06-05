#!/usr/bin/env node
/**
 * merchant-sync.mjs — Sube/actualiza los productos en Google Merchant Center
 * vía la Content API for Shopping v2.1 (opción C: por API, no por feed).
 *
 * Auth: cuenta de servicio de Google. Firma el JWT con el `crypto` nativo de Node
 * (RS256), así que NO necesita librerías externas. Intercambia el JWT por un
 * access token y hace products.custombatch (insert) en lotes.
 *
 * Requisitos (tu parte, una vez):
 *   1. Google Cloud → habilita "Content API for Shopping".
 *   2. Crea una CUENTA DE SERVICIO y descarga su JSON.
 *   3. En Merchant Center → Configuración → Acceso a la cuenta / Usuarios:
 *      agrega el email de la cuenta de servicio (acceso estándar/admin).
 *   4. Guarda el JSON como  scripts/merchant-sa.json  (está gitignored) o
 *      exporta MERCHANT_SA_FILE=/ruta/al.json
 *
 * Uso:
 *   node scripts/merchant-sync.mjs --dry-run     # arma productos, NO llama a la API
 *   node scripts/merchant-sync.mjs               # sincroniza todo
 *   node scripts/merchant-sync.mjs --limit=5     # solo los primeros 5 (prueba)
 *
 * Variables:
 *   MERCHANT_ID       (default 10670637587)
 *   MERCHANT_SA_FILE  (default scripts/merchant-sa.json)
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const MERCHANT_ID = process.env.MERCHANT_ID || "10670637587";
const SA_FILE = process.env.MERCHANT_SA_FILE || path.join(__dirname, "merchant-sa.json");
const SCOPE = "https://www.googleapis.com/auth/content";
const API = "https://shoppingcontent.googleapis.com/content/v2.1";

const args = { dryRun: false, limit: 0 };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a.startsWith("--limit=")) args.limit = parseInt(a.slice(8), 10) || 0;
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

// ───────────────────────── auth (JWT → access token) ─────────────────────────
function makeJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const input = `${header}.${claims}`;
  const sig = crypto.createSign("RSA-SHA256").update(input).sign(sa.private_key);
  return `${input}.${b64url(sig)}`;
}

async function getToken(sa) {
  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: makeJwt(sa),
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("Auth falló: " + JSON.stringify(j).slice(0, 300));
  return j.access_token;
}

// ───────────────────────── producto → recurso de la API ─────────────────────────
function toProduct(p, siteUrl, brand) {
  const hasSale = p.precioAnterior && p.precioAnterior > p.precio;
  const prod = {
    offerId: p.slug,
    title: String(p.nombre).slice(0, 150),
    description: (p.descripcion || p.nombre || "").replace(/\s+/g, " ").trim().slice(0, 5000),
    link: `${siteUrl}/producto/${p.slug}`,
    imageLink: p.imagen ? `${siteUrl}${p.imagen}` : undefined,
    contentLanguage: "es",
    targetCountry: "CO",
    channel: "online",
    availability: "in stock",
    condition: "new",
    price: { value: String(hasSale ? p.precioAnterior : p.precio), currency: "COP" },
    brand,
    identifierExists: false,
  };
  if (hasSale) prod.salePrice = { value: String(p.precio), currency: "COP" };
  if (p.categoria) prod.productTypes = [p.categoria];
  return prod;
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

// ───────────────────────────── main ─────────────────────────────
async function main() {
  const config = JSON.parse(await readFile(path.join(ROOT, "data", "config.json"), "utf8"));
  const productosData = JSON.parse(await readFile(path.join(ROOT, "data", "productos.json"), "utf8"));
  const siteUrl = (config.dominio || "https://sorpresas.enbogota.app").replace(/\/+$/, "");
  const brand = config.nombre || "Sorpresas en Bogotá";

  let lista = (productosData.productos || productosData).filter(
    (p) => p.visible !== false && (p.stock ?? 0) > 0 && p.precio > 0,
  );
  if (args.limit) lista = lista.slice(0, args.limit);
  const productos = lista.map((p) => toProduct(p, siteUrl, brand));
  console.error(`Merchant ${MERCHANT_ID} · ${productos.length} productos${args.dryRun ? " · DRY-RUN" : ""}`);

  if (args.dryRun) {
    console.error("Ejemplo:\n" + JSON.stringify(productos[0], null, 2));
    return;
  }

  let sa;
  try {
    sa = JSON.parse(await readFile(SA_FILE, "utf8"));
  } catch {
    console.error(`✗ No encontré la cuenta de servicio en ${SA_FILE}\n  Descárgala de Google Cloud y guárdala ahí (o usa MERCHANT_SA_FILE).`);
    process.exit(1);
  }

  const token = await getToken(sa);
  console.error("✓ autenticado como " + sa.client_email);

  let ok = 0;
  const errores = [];
  for (const grupo of chunk(productos, 1000)) {
    const entries = grupo.map((product, i) => ({ batchId: i, merchantId: MERCHANT_ID, method: "insert", product }));
    const res = await fetch(`${API}/${MERCHANT_ID}/products/batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const j = await res.json();
    for (const r of j.entries || []) {
      if (r.errors) errores.push(`${grupo[r.batchId]?.offerId}: ${r.errors.errors?.[0]?.message || "error"}`);
      else ok++;
    }
    if (j.error) errores.push("BATCH: " + JSON.stringify(j.error).slice(0, 200));
  }

  console.error(`\n✓ ${ok} productos subidos/actualizados.`);
  if (errores.length) {
    console.error(`⚠ ${errores.length} con problema (primeros 10):`);
    console.error(errores.slice(0, 10).map((e) => "  · " + e).join("\n"));
  }
  console.error("\nNota: los productos pueden quedar 'pendientes' hasta configurar ENVÍO y DEVOLUCIONES en Merchant Center.");
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
