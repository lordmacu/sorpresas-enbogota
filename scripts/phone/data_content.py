#!/usr/bin/env python3
"""
Contenido guiado por datos: analiza qué FORMATO y qué CATEGORÍA rinden más
(guardados+compartidos+alcance) y escribe preferred_categories.json para que el
sistema haga MÁS de lo que funciona. Necesita data; al inicio dará poco.

PREPARADO — requiere el scope:  instagram_business_manage_insights

  python3 data_content.py
"""
import os
import sys
import json
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

PREF_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preferred_categories.json")

# nombre visible en el caption -> slug de /api/reel
NAME2SLUG = {
    "para papá": "para-papa", "día del padre": "para-papa",
    "para mamá": "para-mama", "día de las madres": "para-mama", "día de la madre": "para-mama",
    "para ella": "para-ella", "para él": "para-el",
    "amor y amistad": "amor-amistad", "san valentín": "san-valentin", "amor": "amor",
    "cumpleaños": "cumpleanos", "navidad": "navidad", "halloween": "halloween",
    "flores": "flores-rosas", "desayuno": "desayunos-sorpresas", "baby shower": "baby-shower",
    "grados": "grados", "fresas": "fresas-con-chocolate", "mejórate": "mejorate-pronto",
}


def score(media_id):
    ins = (igkit.media_insights(media_id, "reach,saved,shares") or {}).get("data", [])
    d = {}
    for i in ins:
        try:
            d[i["name"]] = i["values"][0]["value"]
        except Exception:
            pass
    return (d.get("saved", 0) + d.get("shares", 0)) * 5 + d.get("reach", 0)


def detect_slug(caption):
    c = (caption or "").lower()
    for name, slug in NAME2SLUG.items():
        if name in c:
            return slug
    return None


def main():
    igkit.load_env()
    media = (igkit.my_media(limit=50) or {}).get("data", [])
    if not media:
        print("Sin publicaciones para analizar.")
        return
    byfmt = defaultdict(lambda: [0, 0])
    bycat = defaultdict(lambda: [0, 0])
    for m in media:
        s = score(m["id"])
        byfmt[m.get("media_type", "?")][0] += s
        byfmt[m.get("media_type", "?")][1] += 1
        slug = detect_slug(m.get("caption"))
        if slug:
            bycat[slug][0] += s
            bycat[slug][1] += 1

    print(f"🏆 Análisis de {len(media)} publicaciones\n— Por FORMATO (score) —")
    for f in sorted(byfmt, key=lambda f: -(byfmt[f][0] / max(byfmt[f][1], 1))):
        print(f"  {f}: {byfmt[f][0] / max(byfmt[f][1], 1):.0f}  (n={byfmt[f][1]})")

    print("\n— Por CATEGORÍA —")
    ranked = sorted(bycat, key=lambda c: -(bycat[c][0] / max(bycat[c][1], 1)))
    for c in ranked:
        print(f"  {c}: {bycat[c][0] / max(bycat[c][1], 1):.0f}  (n={bycat[c][1]})")

    top = ranked[:5]
    if top:
        json.dump(top, open(PREF_FILE, "w"))
        print(f"\n✅ Categorías preferidas guardadas: {top}")
        print("   El contenido de producto las usará más (cuando no haya una ocasión activa).")
    else:
        print("\n(Aún sin suficiente data por categoría — sigue publicando.)")


if __name__ == "__main__":
    main()
