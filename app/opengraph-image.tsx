import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";
import config from "@/data/config.json";

export const alt = `${SITE_NAME} — Flores, desayunos y regalos a domicilio en Bogotá`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mark de la marca (destello en oro) como SVG, embebido vía data URI para que
// Satori lo renderice de forma fiable dentro de la imagen OG.
const SPARKLE = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='340' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='9' y1='7' x2='31' y2='33' gradientUnits='userSpaceOnUse'><stop stop-color='#E9C98E'/><stop offset='1' stop-color='#C8903F'/></linearGradient></defs><path d='M19.4 7C20.6 17 23.9 20.3 34 21.6C23.9 22.9 20.6 26.2 19.4 36.2C18.2 26.2 14.9 22.9 4.8 21.6C14.9 20.3 18.2 17 19.4 7Z' fill='url(#g)'/><path d='M29 7.5C29.4 10.1 29.9 10.6 32.5 11C29.9 11.4 29.4 11.9 29 14.5C28.6 11.9 28.1 11.4 25.5 11C28.1 10.6 28.6 10.1 29 7.5Z' fill='#F5E6D3'/></svg>`;
const sparkleUri = `data:image/svg+xml,${encodeURIComponent(SPARKLE)}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #8B2635 0%, #6B1D2A 100%)",
          color: "#FDFBF7",
        }}
      >
        {/* Glow decorativo */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(212,165,116,0.25)",
            display: "flex",
          }}
        />

        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sparkleUri} width={104} height={104} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: 2 }}>
            {SITE_NAME}
          </div>
        </div>

        {/* Titular */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
            Sorpresas que cuentan
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05, color: "#E9C98E" }}>
            una historia
          </div>
        </div>

        {/* Pie */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "rgba(253,251,247,0.82)" }}>
          <div style={{ display: "flex" }}>Flores · Desayunos · Regalos a domicilio en Bogotá</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
