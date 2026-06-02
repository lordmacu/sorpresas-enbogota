#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Renombra slugs de productos (product_<uuid> e inglés) a español optimizado para SEO.
USO: python3 scripts/rename-product-slugs.py
"""
import json, os, glob, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD_FILE = os.path.join(ROOT, "data", "productos.json")
SEO_DIR = os.path.join(ROOT, "data", "seo")
SCRAPED_DIR = os.path.join(ROOT, "data", "scraped")

def slugify(text):
    """Convierte a slug: sin acentos, lowercase, hyphen-separated."""
    nfd = unicodedata.normalize("NFD", text or "")
    sin_acentos = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    slug = re.sub(r'[^a-z0-9]+', '-', sin_acentos.lower()).strip('-')
    return slug[:60]  # máx 60 chars

def generate_slug(nombre, categoria):
    """Genera slug en español a partir del nombre y categoría."""
    # Keywords principales por categoría
    CAT_KEYS = {
        "desayunos-sorpresas": "desayuno",
        "flores-rosas": "ramo-flores",
        "cumpleanos": "regalo-cumpleanos",
        "anchetas-de-cumpleanos": "ancheta-cumpleanos",
        "fresas-con-chocolate": "fresas-chocolate",
        "amor": "regalo-amor",
        "para-ella": "regalo-mujer",
        "para-el": "regalo-hombre",
        "cajas-magicas": "caja-magica",
        "para-mama": "regalo-mama",
        "para-papa": "regalo-papa",
    }
    cat_prefix = CAT_KEYS.get(categoria, categoria)
    # Limpia el nombre: quita marca, código, sufijos genéricos
    clean = re.sub(r"\(.*?\)|n0?\d{2,}|^(producto|item|pack)\s*", "", nombre, flags=re.I).strip()
    # Toma las 2-3 primeras palabras significativas
    words = [w for w in clean.split() if len(w) > 2][:3]
    desc = "-".join(w.lower() for w in words)
    slug = f"{cat_prefix}-{desc}" if desc else cat_prefix
    return slugify(slug)

def main():
    print("Leyendo productos...")
    with open(PROD_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    productos = data['productos']

    # Identifica los que necesitan rename
    uuid_re = re.compile(r'^product_[0-9a-f\-]+$|^[0-9a-f]{8}-[0-9a-f]{4}')
    en_re = re.compile(r'\b(breakfast|brunch|drink|box|love|sweet|happy|kiss|amazing|special|premium|magic|cup|kit|combo|pink|blue|black|white|gold|roses|flowers|berry|heart|gift|surprise|bouquet|deluxe|luxury|elegant|beauty)\b', re.I)

    malos = [p for p in productos if uuid_re.match(p['slug']) or (en_re.search(p['slug']) and not uuid_re.match(p['slug']))]
    print(f"Productos con slug malo: {len(malos)} de {len(productos)}")

    # Renombra
    rename_map = {}  # viejo_slug -> nuevo_slug
    for prod in malos:
        viejo = prod['slug']
        nuevo = generate_slug(prod['nombre'], prod['categoria'])
        # Evita colisiones: si ya existe, agrega -2, -3, etc
        contador = 1
        base_nuevo = nuevo
        while any(p['slug'] == nuevo for p in productos if p['slug'] != viejo):
            nuevo = f"{base_nuevo}-{contador}"
            contador += 1
        prod['slug'] = nuevo
        rename_map[viejo] = nuevo
        print(f"  {viejo[:40]:40s} → {nuevo}")

    # Guarda productos.json
    print("\nGuardando productos.json...")
    with open(PROD_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Renombra archivos en data/seo/
    print("Renombrando archivos SEO...")
    for viejo, nuevo in rename_map.items():
        viejo_path = os.path.join(SEO_DIR, f"{viejo}.json")
        nuevo_path = os.path.join(SEO_DIR, f"{nuevo}.json")
        if os.path.exists(viejo_path):
            os.rename(viejo_path, nuevo_path)
            # Actualiza el 'slug' dentro del JSON
            with open(nuevo_path, 'r', encoding='utf-8') as f:
                seo = json.load(f)
            seo['slug'] = nuevo
            with open(nuevo_path, 'w', encoding='utf-8') as f:
                json.dump(seo, f, ensure_ascii=False, indent=2)

    # Actualiza slugs en data/scraped/*.json
    print("Actualizando data/scraped/*.json...")
    for scraped_file in glob.glob(os.path.join(SCRAPED_DIR, "*.json")):
        with open(scraped_file, 'r', encoding='utf-8') as f:
            scraped = json.load(f)
        for prod in scraped.get('productos', []):
            if prod['slug'] in rename_map:
                prod['slug'] = rename_map[prod['slug']]
        with open(scraped_file, 'w', encoding='utf-8') as f:
            json.dump(scraped, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Renombre completo: {len(rename_map)} productos actualizados")
    print("Archivos modificados: productos.json, data/seo/*.json, data/scraped/*.json")

if __name__ == '__main__':
    main()
