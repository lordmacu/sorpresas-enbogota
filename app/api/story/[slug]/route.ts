import sharp from "sharp";

// Sirve una tarjeta de producto como imagen 9:16 (1080×1920) lista para Story:
// fondo desenfocado a pantalla completa + la tarjeta centrada. JPEG (Instagram).
//   GET /api/story/<slug>  ->  image/jpeg 1080x1920
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return new Response("Bad request", { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const src = await fetch(`${origin}/images/cards/${slug}.webp`, {
    cache: "force-cache",
  });
  if (!src.ok) return new Response("Not found", { status: 404 });
  const card = Buffer.from(await src.arrayBuffer());

  const W = 1080;
  const H = 1920;
  const bg = await sharp(card)
    .resize(W, H, { fit: "cover" })
    .blur(36)
    .modulate({ brightness: 0.62 })
    .toBuffer();
  const fg = await sharp(card)
    .resize(960, 1450, { fit: "inside" }) // mantiene 4:5, deja aire arriba/abajo
    .toBuffer();
  const jpg = await sharp(bg)
    .composite([{ input: fg, gravity: "centre" }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return new Response(new Uint8Array(jpg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
