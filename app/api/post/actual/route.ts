import { pickPost, postToJson } from "@/lib/social-post";

// Siempre dinámico: refleja la franja horaria del momento.
export const dynamic = "force-dynamic";

/**
 * Devuelve el post del momento (rota según día + franja: ~9, ~12, ~16 Bogotá).
 * Para tu automatización: GET /api/post/actual
 *   ?slot=0|1|2  → fuerza una franja
 *   ?slug=<slug> → fuerza un producto específico
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slotParam = url.searchParams.get("slot");
  const slugParam = url.searchParams.get("slug");
  const now = new Date();

  const { card, slot } = pickPost(now, {
    slot: slotParam != null ? Number(slotParam) : undefined,
    slug: slugParam || undefined,
  });

  if (!card) {
    return Response.json({ error: "Sin tarjetas disponibles" }, { status: 404 });
  }

  return Response.json(postToJson(card, now, slot), {
    headers: { "Cache-Control": "no-store" },
  });
}
