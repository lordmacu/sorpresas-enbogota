#!/usr/bin/env python3
"""
Publica UN post de una sola imagen desde /api/post/actual (la imagen rota según
la franja horaria de Bogotá). Pensado para correr en la mañana y en la tarde.

  python3 post_image.py            # imagen de la franja actual
  python3 post_image.py 0|1|2      # fuerza franja (0<11h, 1<15h, 2 resto)
  python3 post_image.py --dry-run  # muestra qué publicaría, sin tocar Instagram

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
    slot = int(args[0]) if args and args[0].isdigit() else None

    post = igkit.fetch_post(slot)
    image_url = post.get("imageUrl") or post["imagen"]
    caption = post["caption"]
    print(f"  {post.get('nombre', post.get('slug'))}  ·  franja {post.get('slot')}")
    print(f"    imagen: {image_url}")

    if dry:
        print("\n--- DRY RUN ---\n" + caption + "\n\n(no se publicó)")
        return

    if not igkit.guard_publish():
        print(f"\n  [preparado] 1 imagen lista para publicar:\n    {image_url}")
        return

    token = igkit.ig_token()
    ig_id = igkit.ig_user_id(token)
    print("· creando contenedor…")
    c = igkit.post(f"{igkit.GRAPH}/{ig_id}/media",
                   {"image_url": image_url, "caption": caption, "access_token": token})
    if "id" not in c:
        raise SystemExit(f"✗ Error creando contenedor: {c}")
    igkit.wait_ready(token, c["id"])
    print("· publicando…")
    mid = igkit.publish(token, ig_id, c["id"])
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
