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


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    categoria = args[0] if args else None

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

    token = igkit.ig_token()
    ig_id = igkit.ig_user_id(token)

    print("· creando contenedores de imagen…")
    children = []
    for u in images:
        c = igkit.post(f"{igkit.GRAPH}/{ig_id}/media",
                       {"image_url": u, "is_carousel_item": "true", "access_token": token})
        if "id" not in c:
            raise SystemExit(f"✗ Error creando contenedor: {c}")
        children.append(c["id"])

    print("· creando contenedor del carrusel…")
    car = igkit.post(f"{igkit.GRAPH}/{ig_id}/media", {
        "media_type": "CAROUSEL",
        "children": ",".join(children),
        "caption": caption,
        "access_token": token,
    })
    if "id" not in car:
        raise SystemExit(f"✗ Error creando el carrusel: {car}")

    print("· esperando a que esté listo…")
    igkit.wait_ready(token, car["id"])
    print("· publicando…")
    mid = igkit.publish(token, ig_id, car["id"])
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
