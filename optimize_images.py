#!/usr/bin/env python3
"""
Optimiza las imágenes self-host: redimensiona a máx 1280px y reconvierte todo
a WebP (q80), preservando transparencia. Reescribe los JSON con los nuevos
nombres. Pensado para correr DESPUÉS de download_images.py.

Pipeline:  scraper → download_images.py → optimize_images.py → merge_scraped.py
"""

import glob
import hashlib
import json
import os

from PIL import Image, ImageOps

SRC = "public/images/shop"
MAX_SIDE = 1280
QUALITY = 80
EXTS = (".jpg", ".jpeg", ".png", ".webp")


def main():
    files = sorted(glob.glob(f"{SRC}/*"))
    rename = {}          # nombre_viejo -> nombre_nuevo (solo si cambió)
    seen_new = set()
    before = sum(os.path.getsize(f) for f in files)
    converted = failed = 0

    for path in files:
        fn = os.path.basename(path)
        stem, ext = os.path.splitext(fn)
        if ext.lower() not in EXTS:
            continue
        try:
            im = Image.open(path)
            im = ImageOps.exif_transpose(im)
        except Exception:
            failed += 1
            continue

        # Redimensionar sin agrandar
        w, h = im.size
        if max(w, h) > MAX_SIDE:
            s = MAX_SIDE / max(w, h)
            im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)

        # Modo apto para WebP
        if im.mode in ("P", "LA"):
            im = im.convert("RGBA")
        elif im.mode == "CMYK":
            im = im.convert("RGB")

        # Nombre destino único: evita reusar un nombre ya asignado Y evita
        # sobrescribir un archivo distinto aún no procesado (colisión de stem).
        new = stem + ".webp"
        if new in seen_new or (new != fn and os.path.exists(os.path.join(SRC, new))):
            new = f"{stem}-{hashlib.md5(fn.encode()).hexdigest()[:6]}.webp"
        seen_new.add(new)

        new_path = os.path.join(SRC, new)
        im.save(new_path, "WEBP", quality=QUALITY, method=6)
        converted += 1

        if new != fn:
            if os.path.exists(path):
                os.remove(path)
            rename[fn] = new

    # Reescribir referencias en los JSON
    def remap(p):
        if not p or not p.startswith("/images/shop/"):
            return p
        name = p.split("/")[-1]
        return f"/images/shop/{rename[name]}" if name in rename else p

    cf = "data/categorias.json"
    cats = json.load(open(cf, encoding="utf-8"))
    for c in cats["categorias"]:
        c["imagen"] = remap(c.get("imagen", ""))
    json.dump(cats, open(cf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    for f in glob.glob("data/scraped/*.json"):
        j = json.load(open(f, encoding="utf-8"))
        if j.get("imagen"):
            j["imagen"] = remap(j["imagen"])
        for p in j.get("productos", []):
            if p.get("imagen"):
                p["imagen"] = remap(p["imagen"])
            if "galeria" in p:
                p["galeria"] = [remap(g) for g in p["galeria"]]
        json.dump(j, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    after = sum(os.path.getsize(f) for f in glob.glob(f"{SRC}/*"))
    print(f"convertidas: {converted} | fallidas: {failed} | renombradas: {len(rename)}")
    print(f"antes: {before/1e6:.1f} MB  ->  después: {after/1e6:.1f} MB "
          f"({100*(1-after/before):.0f}% menos)")
    print("Ejecuta merge_scraped.py para actualizar productos.json")


if __name__ == "__main__":
    main()
