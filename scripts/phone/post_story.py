#!/usr/bin/env python3
"""
Publica una STORY simple del producto del día (imagen 9:16 vía /api/story/<slug>).
Pensado para la mañana, como capa extra de presencia (las Stories con encuestas
las haces tú a mano: rinden más).

  python3 post_story.py            # producto del día
  python3 post_story.py <slug>     # fuerza un producto
  python3 post_story.py --dry-run  # muestra qué publicaría, sin tocar Instagram

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
    slug = args[0] if args else None

    if not slug:
        post = igkit.fetch_post()
        slug = post["slug"]
        nombre = post.get("nombre", slug)
    else:
        nombre = slug
    story_url = f"{igkit.SITE}/api/story/{slug}"
    print(f"  Story: {nombre}\n    {story_url}")

    if dry:
        print("\n--- DRY RUN --- (no se publicó)")
        return

    if not igkit.guard_publish():
        print(f"\n  [preparado] Story lista: {story_url}")
        return

    token = igkit.ig_token()
    ig_id = igkit.ig_user_id(token)
    print("· creando contenedor STORY…")
    c = igkit.post(f"{igkit.GRAPH}/{ig_id}/media",
                   {"image_url": story_url, "media_type": "STORIES", "access_token": token})
    if "id" not in c:
        raise SystemExit(f"✗ Error creando Story: {c}")
    igkit.wait_ready(token, c["id"])
    print("· publicando…")
    mid = igkit.publish(token, ig_id, c["id"])
    print(f"\n✅ Story publicada. Media ID: {mid}")


if __name__ == "__main__":
    main()
