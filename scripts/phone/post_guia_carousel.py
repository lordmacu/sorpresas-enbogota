#!/usr/bin/env python3
"""
Carrusel de GUÍA de valor (portada + 5 consejos + slide de seguir). MiniMax escribe
la guía; /api/frase renderiza las tarjetas de marca. Genera muchos SAVES y autoridad.

  python3 post_guia_carousel.py                          # tema aleatorio
  python3 post_guia_carousel.py "cómo elegir el regalo perfecto"
  python3 post_guia_carousel.py --dry-run

No publica salvo IG_PUBLISH=1.
"""
import os
import sys
import random
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

TEMAS = [
    "los errores más comunes al regalar",
    "cómo elegir el regalo perfecto",
    "ideas de regalo según la personalidad",
    "qué regalar según la ocasión",
    "detalles que hacen inolvidable un regalo",
    "cómo sorprender sin gastar de más",
    "qué regalar a quien lo tiene todo",
    "cómo acompañar un regalo con un buen mensaje",
]
HASHTAGS = "#ideasderegalo #guiaderegalos #regalosbogota #sorpresasbogota #detallesconamor"


def card_url(text, tema, i, n, autor="", bg=0):
    q = urllib.parse.urlencode({"text": text, "tema": tema, "i": i, "n": n, "autor": autor, "bg": bg})
    return f"{igkit.SITE}/api/frase?{q}"


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    tema = args[0] if args else random.choice(TEMAS)
    print(f"→ tema: {tema}")

    titulo, tips = igkit.minimax_guia(tema, n=5)
    if len(tips) < 3:
        raise SystemExit(f"✗ MiniMax devolvió pocos consejos: {tips}")
    print(f"  título: {titulo}")
    for t in tips:
        print(f"  · {t}")

    n = len(tips) + 2  # portada + tips + slide seguir
    urls = [card_url(titulo, "Guía Sorpresas", 1, n, bg=0)]
    for i, t in enumerate(tips, start=2):
        urls.append(card_url(t, "Guía", i, n, bg=i))
    urls.append(card_url("Síguenos para más guías e ideas de regalos", "Síguenos", n, n,
                         autor="@sorpresas_en_bogota", bg=0))

    caption = (
        f"{titulo} 🎁\n\n"
        "Guárdala para tu próximo regalo 📌 y compártela con quien la necesite 💌\n"
        "📲 Síguenos @sorpresas_en_bogota para más guías\n\n"
        + HASHTAGS
    )

    if dry:
        print("\n--- DRY RUN ---")
        for u in urls:
            print("  ", u)
        print("\n" + caption)
        return

    if not igkit.guard_publish():
        print(f"\n  [preparado] guía de {n} slides lista.")
        return

    mid = igkit.publish_carousel(urls, caption)
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
