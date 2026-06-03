// Configura Cloudflare Email Routing por API:
//   - asegura el destino (Gmail) -> dispara verificación
//   - crea la regla  contacto@enbogota.app -> Gmail
// Requiere CLOUDFLARE_API_TOKEN en el entorno con permisos:
//   Zone DNS:Edit, Zone Email Routing Rules:Edit, Account Email Routing Addresses:Edit
//
//   CLOUDFLARE_API_TOKEN=xxx node scripts/setup-email-routing.mjs
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE = process.env.ER_ZONE || "enbogota.app";
const ADDRESS = process.env.ER_ADDRESS || "contacto@enbogota.app";
const DEST = process.env.ER_DEST || "holacristiangarciaco@gmail.com";
const API = "https://api.cloudflare.com/client/v4";

if (!TOKEN) { console.error("Falta CLOUDFLARE_API_TOKEN"); process.exit(1); }

async function cf(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  return r.json();
}

// Zona + cuenta
const z = await cf(`/zones?name=${ZONE}`);
const zone = z.result?.[0];
if (!zone) { console.error("No encuentro la zona", ZONE, JSON.stringify(z.errors)); process.exit(1); }
const ZID = zone.id;
const ACC = zone.account.id;
console.log(`Zona ${ZONE} (${ZID.slice(0, 8)}…) · cuenta ${ACC.slice(0, 8)}…\n`);

// 1) Destino
const addrs = await cf(`/accounts/${ACC}/email/routing/addresses?per_page=100`);
let dest = (addrs.result || []).find((a) => a.email === DEST);
if (!dest) {
  const created = await cf(`/accounts/${ACC}/email/routing/addresses`, {
    method: "POST",
    body: JSON.stringify({ email: DEST }),
  });
  if (created.success) {
    dest = created.result;
    console.log(`✉️  Destino ${DEST} agregado → Cloudflare envió un correo de VERIFICACIÓN a ese Gmail.`);
  } else {
    console.log(`Destino: ${JSON.stringify(created.errors)}`);
  }
} else {
  console.log(`Destino ${DEST}: ya existía.`);
}
const verificado = dest?.verified ? "✅ verificado" : "⏳ PENDIENTE de verificar (abre el correo en Gmail)";
console.log(`   estado: ${verificado}\n`);

// 2) Regla
const rules = await cf(`/zones/${ZID}/email/routing/rules?per_page=100`);
const existe = (rules.result || []).find((r) =>
  (r.matchers || []).some((m) => m.field === "to" && m.value === ADDRESS)
);
if (existe) {
  console.log(`Regla para ${ADDRESS}: ya existía (${existe.enabled ? "activa" : "inactiva"}).`);
} else {
  const rule = await cf(`/zones/${ZID}/email/routing/rules`, {
    method: "POST",
    body: JSON.stringify({
      name: `Reenvío ${ADDRESS}`,
      enabled: true,
      matchers: [{ type: "literal", field: "to", value: ADDRESS }],
      actions: [{ type: "forward", value: [DEST] }],
    }),
  });
  if (rule.success) console.log(`📩 Regla creada: ${ADDRESS}  →  ${DEST}`);
  else console.log(`Regla: ❌ ${JSON.stringify(rule.errors)}`);
}

console.log(`\n${dest?.verified ? "Listo: el reenvío ya está activo." : "Falta solo 1 paso: verifica " + DEST + " desde el correo que te llegó (revisa Spam)."}`);
