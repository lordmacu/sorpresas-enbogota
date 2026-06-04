#!/usr/bin/env python3
"""
Imagen de UNA frase de amor/para dedicar (post individual, muy compartible).
MiniMax escribe la frase; /api/frase la renderiza en tarjeta de marca.

  python3 post_frase_image.py                 # tema aleatorio
  python3 post_frase_image.py "la gratitud"
  python3 post_frase_image.py --dry-run

No publica salvo IG_PUBLISH=1.
"""
import os
import sys
import random
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

TEMAS = [
    "el amor", "extrañar a alguien", "la amistad", "la gratitud", "decir te quiero",
    "el amor a distancia", "los pequeños detalles que enamoran", "el amor propio",
    "los buenos días con amor", "querer a alguien con detalles",
]
HASHTAGS = "#frasesdeamor #amor #frasesparadedicar #regalosbogota #sorpresasbogota"


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    tema = args[0] if args else random.choice(TEMAS)
    print(f"→ tema: {tema}")

    frases = igkit.minimax_frases(tema, n=1)
    if not frases:
        raise SystemExit("✗ MiniMax no devolvió frase")
    frase = frases[0]
    print(f"  frase: {frase}")

    url = f"{igkit.SITE}/api/frase?" + urllib.parse.urlencode({
        "text": frase, "tema": "Frase del día", "bg": random.randint(0, 2),
    })
    caption = (
        f"{frase}\n\n"
        "💛 Guárdala y compártela con quien amas 💌\n"
        "📲 Síguenos @sorpresas_en_bogota para más\n\n"
        + HASHTAGS
    )

    if dry:
        print("\n--- DRY RUN ---\n" + url + "\n\n" + caption)
        return

    if not igkit.guard_publish():
        print(f"\n  [preparado] imagen de frase lista:\n    {url}")
        return

    mid = igkit.publish_single(url, caption)
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
