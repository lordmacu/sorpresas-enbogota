#!/usr/bin/env python3
"""
Scraper para flores y sorpresas - Bogotá
Extrae productos, categorías, precios e imágenes de competidores.
"""

import json
import re
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Instalando dependencias...")
    import subprocess
    subprocess.check_call(["pip", "install", "requests", "beautifulsoup4", "lxml"])
    import requests
    from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


@dataclass
class Producto:
    id: str
    nombre: str
    slug: str
    categoria: str
    precio: int
    precio_anterior: Optional[int]
    descripcion: str
    imagen: str
    imagenes: list[str]
    tags: list[str]
    popular: bool
    visible: bool
    stock: int


def slugify(text: str) -> str:
    """Convierte texto a slug URL-friendly."""
    text = text.lower()
    text = re.sub(r'[áàäâ]', 'a', text)
    text = re.sub(r'[éèëê]', 'e', text)
    text = re.sub(r'[íìïî]', 'i', text)
    text = re.sub(r'[óòöô]', 'o', text)
    text = re.sub(r'[úùüû]', 'u', text)
    text = re.sub(r'[ñ]', 'n', text)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text)
    return text.strip('-')


def clean_price(price_str: str) -> int:
    """Convierte string de precio a integer COP."""
    digits = re.sub(r'[^\d]', '', price_str)
    return int(digits) if digits else 0


def fetch(url: str, timeout: int = 30) -> Optional[BeautifulSoup]:
    """Hace GET y retorna BeautifulSoup o None si falla."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, 'lxml')
    except Exception as e:
        print(f"  ⚠ Error fetching {url}: {e}")
        return None


def scrape_cerezza() -> list[dict]:
    """Scraping básico de cerezza.co"""
    print("\n🌸 Scraping cerezza.co...")
    productos = []
    url = "https://www.cerezza.co"

    soup = fetch(url)
    if not soup:
        return productos

    # Los sitios vary mucho en estructura, esto es un template
    # Ajustar selectors según la estructura real del sitio

    # Ejemplo genérico - ajustar CSS selectors según inspección
    # cards = soup.select('.product-card, .item, .product-item')

    print(f"  ⚠ cerezza.co: estructura no detectada automáticamente")
    print("  → Inspecciona el sitio y ajusta los CSS selectors")
    return productos


def scrape_mercadolibre() -> list[dict]:
    """Scraping de MercadoLibre categoría flores."""
    print("\n🛒 Scraping MercadoLibre Flores...")
    productos = []

    # Categorías comunes de flores en ML
    categorias_ml = {
        "ramos": "https://listado.mercadolibre.com.co/regalos/flores/ramos-flores",
        "cajas": "https://listado.mercadolibre.com.co/regalos/flores/cajas-regalo",
    }

    for cat_nombre, cat_url in categorias_ml.items():
        print(f"  → Categoría: {cat_nombre}")
        soup = fetch(cat_url)
        if not soup:
            continue

        # Cards en MercadoLibre
        items = soup.select('.ui-search-result__wrapper')

        for item in items[:20]:  # Máximo 20 por categoría
            try:
                title_elem = item.select_one('.poly-component__title')
                price_elem = item.select_one('.poly-component__price')
                img_elem = item.select_one('img')
                link_elem = item.select_one('a')

                if not title_elem:
                    continue

                nombre = title_elem.get_text(strip=True)
                price_str = price_elem.get_text(strip=True) if price_elem else "0"
                precio = clean_price(price_str)
                img = img_elem.get('data-src') or img_elem.get('src', '')
                link = link_elem.get('href', '') if link_elem else ''

                productos.append({
                    "id": f"ml-{slugify(nombre)}",
                    "nombre": nombre,
                    "slug": slugify(nombre),
                    "categoria": cat_nombre,
                    "precio": precio,
                    "precioAnterior": None,
                    "descripcion": f"Producto de MercadoLibre: {nombre}",
                    "imagen": img,
                    "imagenes": [img] if img else [],
                    "tags": ["mercadolibre", cat_nombre],
                    "popular": False,
                    "visible": True,
                    "stock": 10,
                    "_source": link,
                })
            except Exception as e:
                print(f"  ⚠ Error parseando item: {e}")

        time.sleep(1)  # Rate limiting

    return productos


def scrape_floristeria_local(url: str, nombre_tienda: str) -> list[dict]:
    """Template para floristerías locales."""
    print(f"\n🌺 Scraping {nombre_tienda} ({url})...")
    productos = []
    soup = fetch(url)

    if not soup:
        return productos

    # Adaptar selectors
    # items = soup.select('.producto, .articulo, .item')

    print(f"  ⚠ {nombre_tienda}: estructura no detectada")
    print("  → Necesita inspección manual del sitio")
    return productos


def export_to_json(productos: list[dict], filename: str = "scraped_data.json"):
    """Exporta productos a JSON."""
    output = Path(__file__).parent / "data" / filename
    output.parent.mkdir(parents=True, exist_ok=True)

    with open(output, 'w', encoding='utf-8') as f:
        json.dump(productos, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Exportado: {output} ({len(productos)} productos)")


def merge_with_existing(new_products: list[dict], existing_file: str = "productos.json"):
    """Combina productos scrapeados con los existentes."""
    existing_path = Path(__file__).parent / "data" / existing_file

    if existing_path.exists():
        with open(existing_path, encoding='utf-8') as f:
            existing = json.load(f)
        existing_list = existing.get("productos", [])
    else:
        existing_list = []

    existing_ids = {p["id"] for p in existing_list}
    merged = existing_list.copy()

    for p in new_products:
        if p["id"] not in existing_ids:
            merged.append(p)

    with open(existing_path, 'w', encoding='utf-8') as f:
        json.dump({"productos": merged}, f, ensure_ascii=False, indent=2)

    print(f"✅ Merge: {len(merged)} productos totales")


# --- Sitios conocidos en Colombia ---
KNOWN_SITES = {
    "cerezza": "https://www.cerezza.co",
    "mundomaria": "https://www.mundomaria.com.co",
    "giftpack": "https://www.giftpack.com.co",
    "floristeriasmundofloral": "https://www.mundofloral.com.co",
    "mercadolibre_flores": "https://listado.mercadolibre.com.co/flores-regalos",
}


def list_urls():
    """Lista URLs de sitios conocidos."""
    print("\n🔗 Sitios disponibles para scraping:")
    for name, url in KNOWN_SITES.items():
        print(f"  • {name}: {url}")


if __name__ == "__main__":
    import sys

    print("=" * 50)
    print("🌹 Scraper - Flores y Sorpresas Bogotá")
    print("=" * 50)

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "cerezza":
            data = scrape_cerezza()
            export_to_json(data, "scraped_cerezza.json")

        elif cmd == "ml" or cmd == "mercadolibre":
            data = scrape_mercadolibre()
            export_to_json(data, "scraped_mercadolibre.json")
            merge_with_existing(data)

        elif cmd == "all":
            print("\n⚠ Ejecutando todos los scrapers...")
            all_products = []
            all_products.extend(scrape_mercadolibre())
            export_to_json(all_products, "scraped_all.json")
            merge_with_existing(all_products)

        elif cmd == "urls":
            list_urls()

        else:
            print(f"Comando desconocido: {cmd}")
            print("Uso: python scraper.py [cerezza|ml|all|urls]")

    else:
        list_urls()
        print("\n📖 Uso:")
        print("  python scraper.py urls        → Lista sitios")
        print("  python scraper.py ml          → Solo MercadoLibre")
        print("  python scraper.py cerezza     → Solo cerezza.co")
        print("  python scraper.py all        → Todos los sitios")