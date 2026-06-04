// Obtiene el token de Instagram en LOCAL (nada se publica en el sitio).
// Levanta un mini-servidor en localhost, abre Facebook, captura el code,
// lo canjea por un token de LARGA DURACIÓN (60 días) usando tu App ID + Secret
// (que nunca salen de tu máquina), descubre tu IG_USER_ID y lo guarda en .env.
//
//   node scripts/get-instagram-token.mjs
//
// REQUISITO (una vez, en developers.facebook.com → app "Sorpresas"):
//   - Producto "Facebook Login" agregado.
//   - En Facebook Login → Settings → "Valid OAuth Redirect URIs":
//         http://localhost:8765/callback
//     (guardar). Facebook permite http://localhost para desarrollo.
import http from "node:http";
import fs from "node:fs";
import { exec } from "node:child_process";

const PORT = 8765;
const GRAPH = "https://graph.facebook.com/v21.0";
const REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPES = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management";

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
const APP = env.FACEBOOK_IDENTIFIER;
const SECRET = env.FACEBOOK_SECRET_KEY;
if (!APP || !SECRET) {
  console.error("✗ Falta FACEBOOK_IDENTIFIER o FACEBOOK_SECRET_KEY en .env");
  process.exit(1);
}

function upsertEnv(key, value) {
  const file = ".env";
  let s = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=.*$`, "m").test(s)) s = s.replace(new RegExp(`^${key}=.*$`, "m"), line);
  else s += (s && !s.endsWith("\n") ? "\n" : "") + line + "\n";
  fs.writeFileSync(file, s);
}

const authUrl =
  `https://www.facebook.com/v21.0/dialog/oauth?client_id=${APP}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

const page = (title, body) =>
  `<!doctype html><meta charset=utf-8><title>${title}</title>` +
  `<body style="font-family:system-ui;background:#FDFBF7;color:#2D2A26;max-width:620px;margin:48px auto;padding:0 20px;line-height:1.6">` +
  `<h2 style="color:#8B2635">${title}</h2>${body}</body>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    res.writeHead(302, { Location: authUrl });
    return res.end();
  }

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error_description");
    if (err || !code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(page("No se autorizó", `<p>${err || "Sin code."}</p>`));
    }
    try {
      const j = async (u) => (await fetch(u)).json();
      // code → token corto
      const short = await j(`${GRAPH}/oauth/access_token?client_id=${APP}&client_secret=${SECRET}&redirect_uri=${encodeURIComponent(REDIRECT)}&code=${code}`);
      if (!short.access_token) throw new Error(JSON.stringify(short.error || short));
      // corto → largo (≈60 días)
      const long = await j(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP}&client_secret=${SECRET}&fb_exchange_token=${short.access_token}`);
      const token = long.access_token || short.access_token;
      // descubrir IG_USER_ID
      const acc = await j(`${GRAPH}/me/accounts?fields=name,instagram_business_account&access_token=${token}`);
      let igid = "";
      for (const p of acc.data || []) if (p.instagram_business_account) igid = p.instagram_business_account.id;

      upsertEnv("META_ACCESS_TOKEN", token);
      if (igid) upsertEnv("IG_USER_ID", igid);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(page("✅ Listo, token guardado en .env", `
        <p><b>${long.access_token ? "Token de larga duración (~60 días)" : "Token (corto)"}</b> guardado en <code>META_ACCESS_TOKEN</code>.</p>
        <p><b>IG_USER_ID:</b> <code>${igid || "(no encontrado — revisa que tu IG sea Business y esté enlazado a una Página)"}</code></p>
        <p>Ya puedes cerrar esta pestaña y publicar:<br><code>python3 scripts/publish_instagram.py para-papa</code></p>`));

      console.log(`\n✅ Guardado en .env:`);
      console.log(`   META_ACCESS_TOKEN = ${token.slice(0, 8)}… (len ${token.length}, ${long.access_token ? "60 días" : "corto"})`);
      console.log(`   IG_USER_ID = ${igid || "(no encontrado)"}`);
      setTimeout(() => process.exit(0), 800);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(page("Error al canjear el token", `<pre>${e.message}</pre>`));
      console.error("✗", e.message);
    }
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  const u = `http://localhost:${PORT}/`;
  console.log(`\n🔗 Abriendo ${u}`);
  console.log("   (si no abre solo, pégalo en el navegador)\n");
  exec(`open "${u}" || xdg-open "${u}"`);
});
