import { pickReel, buildReelJson } from "@/lib/reel";

// Siempre dinámico: cada visita devuelve 3 productos random distintos.
export const dynamic = "force-dynamic";

/**
 * Devuelve 3 productos random de una misma categoría (para armar un reel).
 *   GET /api/reel              → categoría aleatoria
 *   GET /api/reel?categoria=para-papa  → fuerza una categoría
 * Cada llamada regenera 3 distintos.
 */
export async function GET(req: Request) {
  const categoria = new URL(req.url).searchParams.get("categoria") || undefined;
  const reel = await pickReel({ categoria });

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
