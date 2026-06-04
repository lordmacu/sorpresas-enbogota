#!/usr/bin/env python3
"""
Carrusel "para dedicar CON producto": una frase de dedicatoria (slide 1) +
1-2 productos para acompañar el detalle + slide de seguir. Conecta la emoción
con la venta (el funnel: frase que enamora → regalo que se entrega hoy).

  python3 post_dedicatoria.py
  python3 post_dedicatoria.py para-mama
  python3 post_dedicatoria.py --dry-run

No publica salvo IG_PUBLISH=1.
"""
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

HASHTAGS = "#frasesparadedicar #regalosbogota #sorpresasbogota #detallesconamor #regalosadomiciliobogota"


def frase_url(text, tema, i, n, autor="", bg=0):
    q = urllib.parse.urlencode({"text": text, "tema": tema, "i": i, "n": n, "autor": autor, "bg": bg})
    return f"{igkit.SITE}/api/frase?{q}"


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    categoria = args[0] if args else None

    frase = igkit.minimax_frases("una dedicatoria corta y tierna para acompañar un regalo", n=1)[0]
    print(f"  dedicatoria: {frase}")

    reel = igkit.fetch_reel(categoria, count=2)
    productos = reel["imageUrls"][:2]
    items = reel.get("items", [])[:2]
    cat = reel["categoria"]["nombre"]

    n = 1 + len(productos) + 1
    urls = [frase_url(frase, "Para dedicar", 1, n, bg=1)]
    urls += productos
    urls.append(frase_url("Síguenos para más ideas para sorprender", "Síguenos", n, n,
                          autor="@sorpresas_en_bogota", bg=0))

    nombres = " · ".join(it["nombre"] for it in items)
    caption = (
        f"{frase}\n\n"
        f"¿Con qué lo acompañas? 🎁 Ideas de {cat}: {nombres}.\n"
        "Te lo llevamos el mismo día en Bogotá.\n"
        "💌 Etiqueta a quien se lo dedicarías 👇\n"
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
        print(f"\n  [preparado] dedicatoria + {len(productos)} productos lista.")
        return

    mid = igkit.publish_carousel(urls, caption)
    print(f"\n✅ Publicado. Media ID: {mid}")


if __name__ == "__main__":
    main()
