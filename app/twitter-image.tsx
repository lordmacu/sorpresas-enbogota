import { renderBrandOg, OG_ALT } from "@/lib/og";

export const alt = OG_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderBrandOg();
}
