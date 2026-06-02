#!/usr/bin/env python3
"""
Scraper para sorpresasatiempo.com (tienda Shopify).

- Descubre TODAS las colecciones desde el sitemap de Shopify.
- Por cada colección trae SOLO sus productos vía el endpoint nativo
  /collections/<handle>/products.json?limit=250&page=N (datos completos:
  título, precio, compare_at_price, imágenes, body_html, tags).
- Extrae metadata SEO de cada colección (nombre, descripción, imagen) para
  alimentar data/categorias.json.
- No usa navegador. Es educado con el servidor (Session + headers de
  navegador + throttling + reintentos con backoff) para evitar el 403
  anti-bot de la tienda.

Salida:
  data/scraped/<handle>.json     un archivo por categoría
  data/categorias.json           índice de categorías (con backup .bak)
"""

import json
import os
import re
import time
import warnings
import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup

warnings.filterwarnings("ignore")  # silencia el aviso de LibreSSL de urllib3

BASE_URL = "https://www.sorpresasatiempo.com"
LIMIT = 250  # máximo de productos por página que permite Shopify

# CDN público de Shopify de esta tienda. Las imágenes servidas desde
# www.sorpresasatiempo.com/cdn/shop/... también existen aquí y este host SÍ es
# apto para el optimizador de next/image (sin anti-bot).
SHOPIFY_CDN = "https://cdn.shopify.com/s/files/1/0749/3071/6962/"


def norm_img(url):
    """Normaliza una URL de imagen al CDN público de Shopify y la limpia."""
    if not url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    url = re.sub(r"https?://www\.sorpresasatiempo\.com/cdn/shop/", SHOPIFY_CDN, url)
    url = re.sub(r"[?&]width=\d+", "", url)  # quita el límite de resolución
    return url

# Colecciones técnicas / duplicadas que NO son categorías reales de cara al cliente.
DENYLIST = {
    "all",                                    # catálogo completo (duplica todo)
    "frontpage",                              # home destacados
    "globofilter-best-selling-products-index",# índice interno del filtro
    "upsell",                                 # app de upsell
    "hd",                                     # colección sin nombre/uso
    "cursos",                                 # duplicada de "cursos-1"
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",  # sin brotli: requests no lo descomprime
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def get(url, params=None, expect_json=False, tries=4):
    """GET educado con reintentos y backoff exponencial ante 403/429."""
    delay = 4
    for attempt in range(1, tries + 1):
        try:
            resp = SESSION.get(url, params=params, timeout=30)
            if resp.status_code in (403, 429, 503):
                print(f"      {resp.status_code} en intento {attempt}; espero {delay}s")
                time.sleep(delay)
                delay *= 2
                continue
            resp.raise_for_status()
            return resp.json() if expect_json else resp.text
        except requests.RequestException as e:
            print(f"      error intento {attempt}: {str(e)[:80]}")
            time.sleep(delay)
            delay *= 2
    return None


# ---------------------------------------------------------------------------
# Descubrimiento de colecciones
# ---------------------------------------------------------------------------
def discover_collections():
    """Lee el sitemap y devuelve [{handle, nombre, imagen}] de cada colección."""
    index = get(f"{BASE_URL}/sitemap.xml")
    if not index:
        return []
    coll_sitemap = None
    for loc in re.findall(r"<loc>([^<]+)</loc>", index):
        if "sitemap_collections" in loc:
            coll_sitemap = loc.replace("&amp;", "&")
            break
    if not coll_sitemap:
        return []

    xml = get(coll_sitemap)
    if not xml:
        return []

    ns = {
        "s": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "image": "http://www.google.com/schemas/sitemap-image/1.1",
    }
    root = ET.fromstring(xml)
    collections = []
    seen = set()
    for url in root.findall("s:url", ns):
        loc = url.find("s:loc", ns)
        if loc is None:
            continue
        m = re.search(r"/collections/([^/?#]+)$", loc.text.strip())
        if not m:
            continue
        handle = m.group(1)
        if handle in seen:
            continue
        seen.add(handle)
        # Filtrado: artefactos técnicos, handles codificados (emoji) y
        # combos SEO autogenerados (handles larguísimos).
        if handle in DENYLIST or "%" in handle or len(handle) > 40:
            continue
        title_el = url.find("image:image/image:title", ns)
        img_el = url.find("image:image/image:loc", ns)
        nombre = (title_el.text.strip() if title_el is not None and title_el.text else "")
        imagen = (img_el.text.strip() if img_el is not None and img_el.text else "")
        collections.append({"handle": handle, "nombre": nombre, "imagen": imagen})
    return collections


# ---------------------------------------------------------------------------
# Metadata SEO de la colección (desde el HTML de la página de colección)
# ---------------------------------------------------------------------------
def clean_name(n):
    """Quita el sufijo de marca ('… - Sorpresas a tiempo'), el prefijo
    'Colección' y emojis/símbolos iniciales del nombre de la colección."""
    if not n:
        return n
    parts = re.split(r"\s+[-|–]\s+", n)
    parts = [p for p in parts if not re.search(r"a\s+tiempo", p, re.I)]
    name = " - ".join(parts).strip() if parts else n
    name = re.sub(r"^Colecci[oó]n\s+", "", name, flags=re.I).strip()
    name = re.sub(r"^[^\w¿¡(]+", "", name).strip()
    return name or n


def fetch_collection_seo(handle):
    """Devuelve (nombre, descripcion, imagen) leyendo og:/meta de la colección."""
    html = get(f"{BASE_URL}/collections/{handle}")
    if not html:
        return None, "", ""
    soup = BeautifulSoup(html, "html.parser")

    def meta(*names):
        for n in names:
            el = soup.find("meta", attrs={"property": n}) or soup.find("meta", attrs={"name": n})
            if el and el.get("content"):
                return el["content"].strip()
        return ""

    nombre = meta("og:title") or (soup.find("h1").get_text(strip=True) if soup.find("h1") else "")
    nombre = clean_name(nombre)
    descripcion = clean_cat_desc(meta("og:description", "description"))
    imagen = norm_img(meta("og:image", "og:image:secure_url"))
    return nombre, descripcion, imagen


# ---------------------------------------------------------------------------
# Productos de la colección
# ---------------------------------------------------------------------------
def to_int_price(value):
    """'319800.00' -> 319800 ; None/'' -> None."""
    if value in (None, "", "null"):
        return None
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _norm_ws(t):
    """Quita espacios no separables / de ancho cero y colapsa espacios."""
    return (t or "").replace(" ", " ").replace("​", "")


def clean_descripcion(body_html):
    if not body_html:
        return ""
    text = BeautifulSoup(body_html, "html.parser").get_text("\n", strip=True)
    text = _norm_ws(text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return re.sub(r"\n{2,}", "\n", text).strip()


def extract_contenido(body_html):
    if not body_html:
        return []
    soup = BeautifulSoup(body_html, "html.parser")
    items = (re.sub(r"[ \t]{2,}", " ", _norm_ws(li.get_text(" ", strip=True))).strip()
             for li in soup.select("li"))
    return [t for t in items if t]


def clean_cat_desc(t):
    """Limpia la descripción de una colección: espacios, marca de origen,
    colas de scraping y puntuación pegada."""
    t = _norm_ws(t)
    t = re.sub(r"Sorpresas a [Tt]iempo", "Sorpresas", t)
    t = re.sub(r"\s*Calificaci[oó]n:\s*\d+\s*Estrellas?[★☆\s.]*$", "", t, flags=re.I)
    t = re.sub(r"\s*Regresar a ocasiones\.?\s*$", "", t, flags=re.I)
    t = re.sub(r"^\s*Plan empresa\s+", "", t)
    t = re.sub(r"\s*WhatsApp\s*$", "", t)
    t = re.sub(r"[\s:]+$", "", t)
    t = re.sub(r"([.!?])([A-ZÁÉÍÓÚÑ¡¿])", r"\1 \2", t)
    t = re.sub(r"[ \t]{2,}", " ", t).strip()
    if t and t[-1].isalnum():
        t += "."
    return t


CAMPOS_EXTRA = {
    "motivo": {
        "label": "¿Cuál es el motivo del regalo?",
        "tipo": "select",
        "requerido": True,
        "options": ["Aniversario", "Cumpleaños", "Recupérate pronto", "Feliz día", "Otro"],
    },
    "foto": {
        "label": "¿Deseas agregar foto?",
        "tipo": "foto",
        "requerido": False,
        "precio": 5500,
        "maxFotos": 5,
    },
    "extras": {
        "label": "Extras / Adicionales",
        "tipo": "extras",
        "requerido": False,
        "items": [
            {"nombre": "Bombones Ferrero Rocher x8", "precio": 38561},
            {"nombre": "Whisky Deluxe BUCHANAN'S 375 ml", "precio": 143061},
            {"nombre": "Chocolatina HERSHEYS Cookies N Creme 43g", "precio": 7838},
            {"nombre": "Vino tinto Gato Negro", "precio": 64686},
        ],
    },
}


def fetch_products(handle):
    """Descarga TODOS los productos de la colección paginando el endpoint JSON."""
    products = []
    page = 1
    while True:
        data = get(
            f"{BASE_URL}/collections/{handle}/products.json",
            params={"limit": LIMIT, "page": page},
            expect_json=True,
        )
        batch = (data or {}).get("products", []) if data else []
        if not batch:
            break
        products.extend(batch)
        if len(batch) < LIMIT:
            break
        page += 1
        time.sleep(1.0)
    return products


def map_product(p, categoria_slug):
    """Mapea un producto de Shopify al esquema que consume la app."""
    variant = (p.get("variants") or [{}])[0]

    precio = to_int_price(variant.get("price")) or 0
    precio_anterior = to_int_price(variant.get("compare_at_price"))
    if precio_anterior is not None and precio_anterior <= precio:
        precio_anterior = None

    images = p.get("images") or []
    galeria = [norm_img(img.get("src", "")) for img in images if img.get("src")]
    imagen = galeria[0] if galeria else ""

    body = p.get("body_html") or ""
    tags = p.get("tags") or []
    popular = "mas-vendido" in categoria_slug or any(
        "mas-vendido" in t.lower() or "vendidos" in t.lower() for t in tags
    )
    available = bool(variant.get("available", True))

    return {
        "id": p.get("handle", ""),
        "nombre": (p.get("title") or "").strip(),
        "slug": p.get("handle", ""),
        "precio": precio,
        "precioAnterior": precio_anterior,
        "descripcion": clean_descripcion(body),
        "imagen": imagen,
        "galeria": galeria,
        "contenido": extract_contenido(body),
        "tags": tags,
        "popular": popular,
        "visible": True,
        "stock": 10 if available else 0,
        "categoria": categoria_slug,
        "camposExtra": CAMPOS_EXTRA,
    }


# ---------------------------------------------------------------------------
# Orquestación
# ---------------------------------------------------------------------------
def main():
    out_dir = "data/scraped"
    os.makedirs(out_dir, exist_ok=True)

    print("Descubriendo colecciones desde el sitemap…")
    collections = discover_collections()
    print(f"  {len(collections)} colecciones (tras filtrar técnicas)")

    # Limpiar JSONs anteriores de categorías scrapeadas
    for f in os.listdir(out_dir):
        if f.endswith(".json"):
            os.remove(os.path.join(out_dir, f))

    categorias_index = []
    resumen = {}

    for i, coll in enumerate(collections, 1):
        handle = coll["handle"]
        print(f"\n[{i}/{len(collections)}] === {handle} ===")

        nombre_seo, descripcion_seo, imagen_seo = fetch_collection_seo(handle)
        time.sleep(0.8)

        nombre = nombre_seo or coll["nombre"] or handle.replace("-", " ").title()
        imagen = imagen_seo or norm_img(coll["imagen"]) or ""
        descripcion = descripcion_seo or f"{nombre} a domicilio en Bogotá."

        raw = fetch_products(handle)

        productos = []
        vistos = set()
        for p in raw:
            slug = p.get("handle", "")
            if not slug or slug in vistos:
                continue
            prod = map_product(p, handle)
            if prod["nombre"]:
                vistos.add(slug)
                productos.append(prod)

        if not productos:
            print("  (sin productos, se omite)")
            continue

        data = {
            "categoria": handle,
            "nombre": nombre,
            "slug": handle,
            "descripcion": descripcion,
            "imagen": imagen,
            "fuente": BASE_URL,
            "productos": productos,
        }
        with open(os.path.join(out_dir, f"{handle}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        categorias_index.append({
            "id": handle,
            "nombre": nombre,
            "slug": handle,
            "descripcion": descripcion,
            "imagen": imagen,
            "popular": "mas-vendido" in handle or "vendidos" in handle,
            "subcategorias": [],
        })
        resumen[handle] = len(productos)
        print(f"  -> {handle}.json ({len(productos)} productos) | img: {'sí' if imagen else 'no'}")
        time.sleep(1.0)

    # Regenerar categorias.json (con backup de la versión anterior)
    cat_file = "data/categorias.json"
    if os.path.exists(cat_file) and not os.path.exists(cat_file + ".bak"):
        os.rename(cat_file, cat_file + ".bak")
        print(f"\nBackup de categorias.json -> {cat_file}.bak")
    with open(cat_file, "w", encoding="utf-8") as f:
        json.dump({"categorias": categorias_index}, f, ensure_ascii=False, indent=2)

    total = sum(resumen.values())
    print("\n=== RESUMEN ===")
    print(f"Categorías con productos: {len(resumen)}")
    print(f"Total productos (con duplicados entre categorías): {total}")
    for slug, count in sorted(resumen.items(), key=lambda x: -x[1]):
        print(f"  {count:>4}  {slug}")


if __name__ == "__main__":
    main()
