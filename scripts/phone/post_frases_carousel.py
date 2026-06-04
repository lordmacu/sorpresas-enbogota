#!/usr/bin/env python3
"""
Carrusel de 5 frases de amor/para dedicar (+ una última slide de "Síguenos").
MiniMax escribe las frases; la web (/api/frase) las renderiza en tarjetas de marca.
Es de los formatos que más SAVES y SENDS genera (señales #1 del algoritmo).

  python3 post_frases_carousel.py                 # tema aleatorio
  python3 post_frases_carousel.py "el amor a distancia"
  python3 post_frases_carousel.py --dry-run

No publica salvo IG_PUBLISH=1.
"""
import os
import sys
import random
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

TEMAS = [
    "el amor", "extrañar a alguien", "la amistad", "el amor de mamá", "el amor de papá",
    "la gratitud", "decir te quiero", "el amor a distancia", "los aniversarios",
    "los pequeños detalles que enamoran", "el primer amor", "querer a alguien con detalles",
]
HASHTAGS = "#frasesdeamor #amor #frasesparadedicar #regalosbogota #sorpresasbogota"


def card_url(text, tema, i, n, autor="", bg=0):
    q = urllib.parse.urlencode({"text": text, "tema": tema, "i": i, "n": n, "autor": autor, "bg": bg})
    return f"{igkit.SITE}/api/frase?{q}"


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    tema = args[0] if args else random.choice(TEMAS)
    print(f"→ tema: {tema}")

    frases = igkit.minimax_frases(tema, n=5)
    if len(frases) < 3:
        raise SystemExit(f"✗ MiniMax devolvió pocas frases: {frases}")
    for f in frases:
        print("  ·", f)

    n = len(frases) + 1
    urls = [card_url(f, "Para dedicar", i, n, bg=i) for i, f in enumerate(frases, 1)]
    urls.append(card_url(
        "Síguenos para más frases e ideas de regalos", "Síguenos", n, n,
        autor="@sorpresas_en_bogota", bg=0))

    caption = (
        "Frases para dedicarle a quien amas 💝\n\n"
        "Guárdalas 📌 y envíaselas a esa persona especial 💌\n"
        "¿Cuál es tu favorita? 👇\n"
        "📲 Síguenos @sorpresas_en_bogota para más\n\n"
        + HASHTAGS
    )

    if dry:
        print("\n--- DRY RUN ---")
        for u in urls:
            print("  ", u)
        print("\n" + caption)
        return

    if not igkit.guard_publish():
        print(f"\n  [preparado] carrusel de {n} frases listo.")
        return

    mid = igkit.publish_carousel(urls, caption)
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
