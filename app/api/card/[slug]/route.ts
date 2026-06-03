import sharp from "sharp";

// Sirve cualquier tarjeta de producto como JPEG (Instagram solo acepta JPEG).
// Convierte la WebP del sitio al vuelo y la cachea en la CDN.
//   GET /api/card/<slug>  ->  image/jpeg
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

  const webp = Buffer.from(await src.arrayBuffer());
  const jpg = await sharp(webp).jpeg({ quality: 90 }).toBuffer();

  return new Response(new Uint8Array(jpg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
