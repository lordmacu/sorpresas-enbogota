import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import config from "@/data/config.json";

const ROOT = process.cwd();

// Foto de fondo generada con MiniMax (scripts/generate-og-image.mjs).
const bgBuf = fs.readFileSync(path.join(ROOT, "public/images/og/og-bg.jpg"));
const bgUri = `data:image/jpeg;base64,${bgBuf.toString("base64")}`;

// Fuentes reales de marca.
const playfair = fs.readFileSync(path.join(ROOT, "scripts/assets/fonts/PlayfairDisplay-700.ttf"));
const inter = fs.readFileSync(path.join(ROOT, "scripts/assets/fonts/Inter-600.ttf"));

// Destello dorado de la marca.
const SPARKLE = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='9' y1='7' x2='31' y2='33' gradientUnits='userSpaceOnUse'><stop stop-color='#E9C98E'/><stop offset='1' stop-color='#C8903F'/></linearGradient></defs><path d='M19.4 7C20.6 17 23.9 20.3 34 21.6C23.9 22.9 20.6 26.2 19.4 36.2C18.2 26.2 14.9 22.9 4.8 21.6C14.9 20.3 18.2 17 19.4 7Z' fill='url(#g)'/><path d='M29 7.5C29.4 10.1 29.9 10.6 32.5 11C29.9 11.4 29.4 11.9 29 14.5C28.6 11.9 28.1 11.4 25.5 11C28.1 10.6 28.6 10.1 29 7.5Z' fill='#F5E6D3'/></svg>`;
const sparkleUri = `data:image/svg+xml,${encodeURIComponent(SPARKLE)}`;

const NAME = config.nombre || "Sorpresas";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = `${NAME} — Flores, desayunos y regalos a domicilio en Bogotá`;

export function renderBrandOg() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        <img
          src={bgUri}
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        {/* Scrim para legibilidad del texto a la izquierda */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(90deg, rgba(45,42,38,0.94) 0%, rgba(107,29,42,0.78) 40%, rgba(45,42,38,0.20) 72%, rgba(45,42,38,0) 100%)",
          }}
        />
        {/* Contenido */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "74%",
            height: "100%",
            padding: "62px 70px",
          }}
        >
          {/* Lockup de marca */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={sparkleUri} width={56} height={56} />
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 36, fontWeight: 600, color: "#FDFBF7", letterSpacing: 2 }}>
              {NAME}
            </div>
          </div>

          {/* Titular */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 64, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.04 }}>
              Sorpresas que cuentan
            </div>
            <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 64, fontWeight: 700, color: "#E9C98E", lineHeight: 1.04 }}>
              una historia
            </div>
          </div>

          {/* Pie */}
          <div style={{ display: "flex", fontFamily: "Inter", fontSize: 27, color: "rgba(253,251,247,0.88)" }}>
            Flores · Desayunos · Regalos a domicilio en Bogotá
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Playfair", data: playfair, weight: 700, style: "normal" },
        { name: "Inter", data: inter, weight: 600, style: "normal" },
      ],
    }
  );
}
