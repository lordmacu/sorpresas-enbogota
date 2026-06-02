import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Mismo mark de marca (destello en oro) que el favicon, para la pantalla de
// inicio de iOS. iOS aplica su propia máscara redondeada, así que el fondo va
// completo en burdeos.
const SPARKLE = `<svg xmlns='http://www.w3.org/2000/svg' width='112' height='112' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='9' y1='7' x2='31' y2='33' gradientUnits='userSpaceOnUse'><stop stop-color='#E9C98E'/><stop offset='1' stop-color='#C8903F'/></linearGradient></defs><path d='M19.4 7C20.6 17 23.9 20.3 34 21.6C23.9 22.9 20.6 26.2 19.4 36.2C18.2 26.2 14.9 22.9 4.8 21.6C14.9 20.3 18.2 17 19.4 7Z' fill='url(#g)'/><path d='M29 7.5C29.4 10.1 29.9 10.6 32.5 11C29.9 11.4 29.4 11.9 29 14.5C28.6 11.9 28.1 11.4 25.5 11C28.1 10.6 28.6 10.1 29 7.5Z' fill='#F5E6D3'/></svg>`;
const sparkleUri = `data:image/svg+xml,${encodeURIComponent(SPARKLE)}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8B2635 0%, #6B1D2A 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sparkleUri} width={112} height={112} alt="" />
      </div>
    ),
    { ...size }
  );
}
