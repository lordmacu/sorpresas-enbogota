import { pickReel, buildReelJson } from "@/lib/reel";

// Siempre dinámico: cada visita devuelve 3 productos random distintos.
export const dynamic = "force-dynamic";

/**
 * Devuelve N productos random de una misma categoría (para armar un reel).
 *   GET /api/reel                      → 3 productos, categoría aleatoria
 *   GET /api/reel?categoria=para-papa  → fuerza una categoría
 *   GET /api/reel?count=5              → 5 productos (3–6; lo usa el video)
 * Cada llamada regenera productos distintos.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const categoria = params.get("categoria") || undefined;
  const count = parseInt(params.get("count") || "3", 10);
  const reel = await pickReel({ categoria, count });

  if (!reel) {
    return Response.json(
      { error: "No hay suficientes productos para esa categoría" },
      { status: 404 }
    );
  }

  return Response.json(buildReelJson(reel), {
    headers: { "Cache-Control": "no-store" },
  });
}
