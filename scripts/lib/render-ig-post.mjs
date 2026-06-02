// Renderizador de posts de Instagram (1080×1350, formato retrato 4:5).
// Compone la FOTO REAL del producto (sharp convierte webp→jpeg) con la capa de
// marca (next/og = satori + resvg, con las fuentes Playfair/Inter reales).
//
// Exporta renderPost(product, opts) -> Buffer PNG.
// Uso directo de prueba:  node scripts/lib/render-ig-post.mjs <slug>

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createElement as h } from "react";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FONTS = path.join(ROOT, "scripts/assets/fonts");

// Instancias estáticas (satori no soporta fuentes variables).
const playfair700 = fs.readFileSync(path.join(FONTS, "PlayfairDisplay-700.ttf"));
const inter400 = fs.readFileSync(path.join(FONTS, "Inter-400.ttf"));
const inter600 = fs.readFileSync(path.join(FONTS, "Inter-600.ttf"));

const W = 1080;
const H = 1350;

// Mark de marca (destello dorado) — mismo del sitio.
const SPARKLE = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='9' y1='7' x2='31' y2='33' gradientUnits='userSpaceOnUse'><stop stop-color='#E9C98E'/><stop offset='1' stop-color='#C8903F'/></linearGradient></defs><path d='M19.4 7C20.6 17 23.9 20.3 34 21.6C23.9 22.9 20.6 26.2 19.4 36.2C18.2 26.2 14.9 22.9 4.8 21.6C14.9 20.3 18.2 17 19.4 7Z' fill='url(#g)'/><path d='M29 7.5C29.4 10.1 29.9 10.6 32.5 11C29.9 11.4 29.4 11.9 29 14.5C28.6 11.9 28.1 11.4 25.5 11C28.1 10.6 28.6 10.1 29 7.5Z' fill='#F5E6D3'/></svg>`;
const sparkleUri = `data:image/svg+xml,${encodeURIComponent(SPARKLE)}`;

const formatCOP = (n) =>
  "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);

const prettyCat = (slug = "") =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function photoDataUri(localImagePath) {
  const abs = path.join(ROOT, "public", localImagePath);
  const buf = await sharp(abs)
    .resize(W, H, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function template({ photo, eyebrow, titulo, precio, whatsapp }) {
  const pill = (children, style) =>
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          borderRadius: 999,
          ...style,
        },
      },
      ...children
    );

  return h(
    "div",
    {
      style: {
        width: W,
        height: H,
        display: "flex",
        position: "relative",
        fontFamily: "Inter",
      },
    },
    // Foto de fondo
    h("img", {
      src: photo,
      width: W,
      height: H,
      style: { position: "absolute", top: 0, left: 0, objectFit: "cover" },
    }),
    // Scrim para legibilidad
    h("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: W,
        height: H,
        display: "flex",
        backgroundImage:
          "linear-gradient(180deg, rgba(45,42,38,0.45) 0%, rgba(45,42,38,0) 28%, rgba(45,42,38,0.10) 55%, rgba(45,42,38,0.88) 100%)",
      },
    }),
    // Marco dorado fino
    h("div", {
      style: {
        position: "absolute",
        top: 28,
        left: 28,
        width: W - 56,
        height: H - 56,
        display: "flex",
        borderRadius: 28,
        border: "2px solid rgba(233,201,142,0.55)",
      },
    }),
    // Barra superior: lockup de marca + badge de entrega
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: 56,
          left: 56,
          width: W - 112,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
      },
      pill(
        [
          h("img", { src: sparkleUri, width: 30, height: 30 }),
          h(
            "div",
            {
              style: {
                display: "flex",
                color: "#FFFFFF",
                fontFamily: "Playfair",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 1,
              },
            },
            "Sorpresas"
          ),
        ],
        {
          gap: 12,
          padding: "12px 22px 12px 18px",
          backgroundColor: "rgba(107,29,42,0.92)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        }
      ),
      pill(
        [
          h(
            "div",
            { style: { display: "flex", color: "#6B1D2A", fontSize: 22, fontWeight: 600 } },
            "Entrega hoy · Bogotá"
          ),
        ],
        { padding: "11px 20px", backgroundColor: "rgba(245,230,211,0.95)" }
      )
    ),
    // Bloque inferior
    h(
      "div",
      {
        style: {
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 70,
          display: "flex",
          flexDirection: "column",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            color: "#E9C98E",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 14,
          },
        },
        eyebrow
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            color: "#FFFFFF",
            fontFamily: "Playfair",
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.04,
            marginBottom: 26,
          },
        },
        titulo
      ),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 20 } },
        pill(
          [
            h(
              "div",
              { style: { display: "flex", color: "#6B1D2A", fontSize: 38, fontWeight: 700 } },
              precio
            ),
          ],
          { padding: "10px 26px", backgroundColor: "#E9C98E" }
        ),
        h(
          "div",
          { style: { display: "flex", color: "rgba(255,255,255,0.92)", fontSize: 27, fontWeight: 500 } },
          `WhatsApp ${whatsapp}`
        )
      )
    )
  );
}

export async function renderPost(product, { whatsapp = "315 464 5370" } = {}) {
  const photo = await photoDataUri(product.imagen);
  const titulo = (product.nombre || "").length > 42
    ? product.nombre.slice(0, 40).trim() + "…"
    : product.nombre;

  const element = template({
    photo,
    eyebrow: prettyCat(product.categoria),
    titulo,
    precio: formatCOP(product.precio),
    whatsapp,
  });

  const svg = await satori(element, {
    width: W,
    height: H,
    fonts: [
      { name: "Playfair", data: playfair700, weight: 700, style: "normal" },
      { name: "Inter", data: inter400, weight: 400, style: "normal" },
      { name: "Inter", data: inter600, weight: 600, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  return png;
}

// --- prueba directa ---
if (process.argv[1] && process.argv[1].endsWith("render-ig-post.mjs")) {
  const slug = process.argv[2] || "super-brunch";
  const { productos } = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/productos.json"), "utf8")
  );
  const prod = productos.find((p) => p.slug === slug) || productos[0];
  const out = path.join(ROOT, "content/instagram");
  fs.mkdirSync(out, { recursive: true });
  const png = await renderPost(prod);
  const file = path.join(out, `${prod.slug}.png`);
  fs.writeFileSync(file, png);
  console.log("OK →", path.relative(ROOT, file), `(${(png.length / 1024).toFixed(0)} KB)`);
}
