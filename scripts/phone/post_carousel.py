#!/usr/bin/env python3
"""
Publica un CARRUSEL de 3 imágenes desde /api/reel (3 productos distintos de una
misma categoría, distintos en cada visita). Pensado para ~3 PM.

  python3 post_carousel.py            # categoría aleatoria
  python3 post_carousel.py para-mama  # fuerza categoría
  python3 post_carousel.py --dry-run  # muestra qué publicaría, sin tocar Instagram

No publica nada salvo que IG_PUBLISH=1 (interruptor maestro en igkit).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402
import occasions  # noqa: E402


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    categoria = args[0] if args else (occasions.occasion_category() or occasions.preferred_category())
    if categoria and not args:
        print(f"  📅 categoría auto (ocasión/datos): {categoria}")

    reel = igkit.fetch_reel(categoria)
    images = reel["imageUrls"][:3]
    caption = reel["caption"]
    print(f"  categoría: {reel['categoria']['nombre']}  ·  {len(images)} imágenes")
    for u in images:
        print(f"    - {u}")

    if dry:
        print("\n--- DRY RUN ---\n" + caption + "\n\n(no se publicó)")
        return

    if not igkit.guard_publish():
        print("\n  [preparado] carrusel de 3 listo para publicar.")
        return

    print("· publicando carrusel…")
    mid = igkit.publish_carousel(images, caption)  # incluye 1er comentario + geotag
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
