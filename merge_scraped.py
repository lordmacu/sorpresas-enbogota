#!/usr/bin/env python3
"""
Une todos los JSON scrapeados (data/scraped/*.json) en data/productos.json.

Cada archivo scrapeado es una categoría con SOLO sus productos. Un mismo
producto puede aparecer en varias categorías; en productos.json se deduplica
por slug (la primera categoría en la que aparece gana) para que las rutas
estáticas /producto/<slug> sean únicas.
"""

import json
from pathlib import Path

SCRAPED_DIR = Path(__file__).parent / "data" / "scraped"
OUTPUT_FILE = Path(__file__).parent / "data" / "productos.json"


def main():
    all_products = []
    by_slug = {}

    for json_file in sorted(SCRAPED_DIR.glob("*.json")):
        with open(json_file, encoding="utf-8") as f:
            data = json.load(f)

        categoria = data.get("slug", json_file.stem)

        for producto in data.get("productos", []):
            slug = producto.get("slug")
            if not slug or slug in by_slug:
                continue
            producto = dict(producto)
            producto.pop("fuente", None)
            producto.setdefault("id", slug)
            producto["categoria"] = categoria
            by_slug[slug] = producto
            all_products.append(producto)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"productos": all_products}, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(all_products)} productos únicos guardados en {OUTPUT_FILE}")
    by_cat = {}
    for p in all_products:
        by_cat[p["categoria"]] = by_cat.get(p["categoria"], 0) + 1
    for cat, count in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}")


if __name__ == "__main__":
    main()
