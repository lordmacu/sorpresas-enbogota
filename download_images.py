#!/usr/bin/env python3
"""
Descarga todas las imágenes remotas (cdn.shopify.com) referenciadas en los
datos y reescribe los JSON para servirlas localmente desde /images/shop/.

Pipeline:  scraper_sorpresasatiempo.py  ->  download_images.py  ->  merge_scraped.py

- Idempotente: no vuelve a descargar lo ya guardado.
- Si una imagen falla tras varios intentos, conserva la URL remota (fallback).
"""

import glob
import hashlib
import json
import os
import re
import time
import warnings
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests

warnings.filterwarnings("ignore")

OUT_DIR = "public/images/shop"
PUBLIC_PREFIX = "/images/shop"
WORKERS = 8

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
})

_used = {}  # filename -> url (para detectar colisiones)


def local_name(url):
    """Nombre de archivo local estable y único para una URL."""
    base = os.path.basename(urlparse(url).path)
    base = re.sub(r"[^A-Za-z0-9._-]", "-", base)
    if not base or "." not in base:
        base = hashlib.md5(url.encode()).hexdigest()[:12] + ".jpg"
    if _used.get(base, url) != url:  # colisión de nombre con otra URL
        base = hashlib.md5(url.encode()).hexdigest()[:8] + "-" + base
    _used[base] = url
    return base


def collect_urls():
    """Todas las URLs remotas de imagen en categorias.json y scraped/*.json."""
    urls = set()

    def add(u):
        if u and u.startswith("http"):
            urls.add(u)

    cats = json.load(open("data/categorias.json", encoding="utf-8"))
    for c in cats["categorias"]:
        add(c.get("imagen"))

    for f in glob.glob("data/scraped/*.json"):
        j = json.load(open(f, encoding="utf-8"))
        add(j.get("imagen"))
        for p in j.get("productos", []):
            add(p.get("imagen"))
            for g in p.get("galeria", []):
                add(g)
    return urls


def download(url):
    name = local_name(url)
    dest = os.path.join(OUT_DIR, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return url, name, "skip"
    for _ in range(3):
        try:
            r = SESSION.get(url, timeout=40)
            if r.status_code == 200 and r.content:
                with open(dest, "wb") as fh:
                    fh.write(r.content)
                return url, name, "ok"
        except requests.RequestException:
            time.sleep(1)
    return url, name, "fail"


def remap(url, mapping):
    """Devuelve la ruta local si la imagen se descargó; si no, la URL original."""
    return mapping.get(url, url)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    urls = sorted(collect_urls())
    print(f"URLs únicas de imagen: {len(urls)}")

    results = {}
    counts = {"ok": 0, "skip": 0, "fail": 0}
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for i, (url, name, status) in enumerate(ex.map(download, urls), 1):
            counts[status] += 1
            if status in ("ok", "skip"):
                results[url] = f"{PUBLIC_PREFIX}/{name}"
            if i % 100 == 0 or i == len(urls):
                print(f"  {i}/{len(urls)}  ok={counts['ok']} skip={counts['skip']} fail={counts['fail']}")

    # Reescribir JSON -> rutas locales
    cf = "data/categorias.json"
    cats = json.load(open(cf, encoding="utf-8"))
    for c in cats["categorias"]:
        c["imagen"] = remap(c.get("imagen", ""), results)
    json.dump(cats, open(cf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    for f in glob.glob("data/scraped/*.json"):
        j = json.load(open(f, encoding="utf-8"))
        if j.get("imagen"):
            j["imagen"] = remap(j["imagen"], results)
        for p in j.get("productos", []):
            if p.get("imagen"):
                p["imagen"] = remap(p["imagen"], results)
            if "galeria" in p:
                p["galeria"] = [remap(g, results) for g in p["galeria"]]
        json.dump(j, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"\nDescargadas: {counts['ok']} | ya existían: {counts['skip']} | fallidas: {counts['fail']}")
    print(f"Imágenes en {OUT_DIR}/: {len([n for n in os.listdir(OUT_DIR)])}")
    print("JSON reescritos a rutas locales. Ejecuta merge_scraped.py para actualizar productos.json")


if __name__ == "__main__":
    main()
