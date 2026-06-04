import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

// Renderiza una FRASE en una tarjeta de marca (1080×1350) para contenido
// emocional (frases de amor / para dedicar / poemas). El texto llega por query;
// lo genera el worker del celular con MiniMax y aquí solo se maqueta bonito.
//   GET /api/frase?text=...&autor=...&tema=Para%20dedicar&i=1&n=5
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const playfair = fs.readFileSync(path.join(ROOT, "scripts/assets/fonts/PlayfairDisplay-700.ttf"));
const inter = fs.readFileSync(path.join(ROOT, "scripts/assets/fonts/Inter-600.ttf"));

const SPARKLE = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='9' y1='7' x2='31' y2='33' gradientUnits='userSpaceOnUse'><stop stop-color='#E9C98E'/><stop offset='1' stop-color='#C8903F'/></linearGradient></defs><path d='M19.4 7C20.6 17 23.9 20.3 34 21.6C23.9 22.9 20.6 26.2 19.4 36.2C18.2 26.2 14.9 22.9 4.8 21.6C14.9 20.3 18.2 17 19.4 7Z' fill='url(#g)'/></svg>`;
const sparkleUri = `data:image/svg+xml,${encodeURIComponent(SPARKLE)}`;

const W = 1080;
const H = 1350;

// Variantes de fondo para dar variedad visual.
const BGS = [
  "linear-gradient(160deg,#2D2A26 0%,#6B1D2A 72%,#3a1018 100%)",
  "linear-gradient(160deg,#3a1018 0%,#8B2635 75%,#2D2A26 100%)",
  "linear-gradient(155deg,#2D2A26 0%,#4a2230 60%,#6B1D2A 100%)",
];

function sizeFor(len: number) {
  if (len <= 48) return 80;
  if (len <= 90) return 66;
  if (len <= 150) return 54;
  if (len <= 230) return 44;
  return 38;
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const text = (p.get("text") || "Cada detalle cuenta una historia de amor.").slice(0, 420);
  const autor = (p.get("autor") || "").slice(0, 60);
  const tema = (p.get("tema") || "Para dedicar").toUpperCase().slice(0, 28);
  const i = p.get("i");
  const n = p.get("n");
  const bg = BGS[Math.abs(parseInt(p.get("bg") || "0", 10)) % BGS.length];
  const fontSize = sizeFor(text.length);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: bg,
          padding: "92px 86px",
          justifyContent: "space-between",
        }}
      >
        {/* Top: tema + indicador de carrusel */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={sparkleUri} width={46} height={46} />
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 25, fontWeight: 600, color: "#E9C98E", letterSpacing: 5 }}>
              {tema}
            </div>
          </div>
          {i && n ? (
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 24, color: "rgba(253,251,247,0.55)" }}>
              {i} / {n}
            </div>
          ) : null}
        </div>

        {/* Frase */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: "Playfair", fontSize: fontSize, fontWeight: 700, color: "#FDFBF7", lineHeight: 1.22 }}>
            {text}
          </div>
          {autor ? (
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 30, color: "#E9C98E", marginTop: 32 }}>
              {autor}
            </div>
          ) : null}
        </div>

        {/* Marca */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 36, fontWeight: 700, color: "#FDFBF7", letterSpacing: 1 }}>
              Sorpresas
            </div>
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 23, color: "#E9C98E" }}>
              @sorpresas_en_bogota
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Inter", fontSize: 22, color: "rgba(253,251,247,0.72)" }}>
            Regalos a domicilio en Bogotá · entrega el mismo día
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Playfair", data: playfair, weight: 700, style: "normal" },
        { name: "Inter", data: inter, weight: 600, style: "normal" },
      ],
    }
  );
}
