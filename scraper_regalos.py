#!/usr/bin/env python3
"""
Scraper para regalosconamorcolombia.com
Extrae productos de cada categoría y los guarda en JSON separados.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from pathlib import Path
from typing import Optional

BASE_URL = "https://regalosconamorcolombia.com"
OUTPUT_DIR = Path(__file__).parent / "data" / "scraped"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

CATEGORIAS = [
    # Desayunos
    {"nombre": "Desayunos para Mujer", "slug": "desayunos-mujer", "url": "/categoria-producto/desayunos/mujer/"},
    {"nombre": "Desayunos para Hombre", "slug": "desayunos-hombre", "url": "/categoria-producto/desayunos/hombre/"},
    {"nombre": "Desayunos para Parejas", "slug": "desayunos-parejas", "url": "/categoria-producto/desayunos/parejas/"},
    {"nombre": "Desayunos para Niños", "slug": "desayunos-ninos", "url": "/categoria-producto/desayunos/ninos/"},
    # Flores y frutas
    {"nombre": "Bouquets", "slug": "bouquets", "url": "/categoria-producto/flores-y-frutas/bouquet/"},
    {"nombre": "Cajas de Flores", "slug": "cajas-flores", "url": "/categoria-producto/flores-y-frutas/caja/"},
    {"nombre": "Ramos", "slug": "ramos", "url": "/categoria-producto/flores-y-frutas/ramo/"},
    {"nombre": "Frutas", "slug": "frutas", "url": "/categoria-producto/flores-y-frutas/frutas/"},
    {"nombre": "Rosas Preservadas", "slug": "rosas-preservadas", "url": "/categoria-producto/flores-y-frutas/rosa-preservada/"},
    # Detalles
    {"nombre": "Peluches", "slug": "peluches", "url": "/categoria-producto/detalles/peluches/"},
    {"nombre": "Grado", "slug": "grado", "url": "/categoria-producto/detalles/grado/"},
    {"nombre": "Niños", "slug": "ninos-detalles", "url": "/categoria-producto/ninos-2/"},
    # Adiciones
    {"nombre": "Globos", "slug": "globos", "url": "/categoria-producto/globos/"},
    {"nombre": "Chocolates", "slug": "chocolates", "url": "/categoria-producto/chocolates-2/"},
    {"nombre": "Peluches Adicional", "slug": "peluches-adicional", "url": "/categoria-producto/peluche/"},
    {"nombre": "Snacks y Bebidas", "slug": "snacks-bebidas", "url": "/categoria-producto/snacks-bebidas-y-mas-2/"},
    {"nombre": "Flores Adicional", "slug": "flores-adicional", "url": "/categoria-producto/flores-2/"},
    # Ofertas
    {"nombre": "Ofertas", "slug": "ofertas", "url": "/categoria-producto/ofertas/"},
]


def clean_price(price_str: str) -> int:
    """Convierte string de precio a integer COP."""
    digits = re.sub(r'[^\d]', '', price_str)
    return int(digits) if digits else 0


def extract_products_from_page(soup: BeautifulSoup, categoria_slug: str) -> list[dict]:
    """Extrae productos de una página de categoría WooCommerce."""
    productos = []

    # Buscar productos en formato WooCommerce
    items = soup.select('li.product')

    for i, item in enumerate(items):
        try:
            # Nombre
            name_elem = item.select_one('h2.woocommerce-loop-product__title') or \
                       item.select_one('.woo-wallet-preview-principal') or \
                       item.select_one('a[rel]')
            if not name_elem:
                continue

            nombre = name_elem.get_text(strip=True)

            # Precio
            price_elem = item.select_one('.price')
            price_text = price_elem.get_text(strip=True) if price_elem else "0"

            # Extraer precio actual y anterior
            price_current_match = re.search(r'\$([\d.]+)', price_text.replace(',', ''))
            price_current = price_current_match.group(1).replace('.', '') if price_current_match else "0"
            price_current = int(price_current)

            price_prev = None
            del_elem = item.select_one('del')
            if del_elem:
                prev_text = del_elem.get_text(strip=True)
                prev_match = re.search(r'\$([\d.]+)', prev_text.replace(',', ''))
                if prev_match:
                    price_prev = int(prev_match.group(1).replace('.', ''))

            # Imagen
            img_elem = item.select_one('img')
            imagen = img_elem.get('src') or img_elem.get('data-src', '') if img_elem else ''

            # slug/URL
            link_elem = item.select_one('a[href]')
            href = link_elem.get('href', '') if link_elem else ''
            slug = href.split('/producto/')[-1].rstrip('/') if '/producto/' in href else ''

            # Badge sale
            on_sale = item.select_one('.onsale') is not None

            productos.append({
                "id": f"{categoria_slug}-{i+1:03d}",
                "nombre": nombre,
                "slug": slug,
                "precio": price_current,
                "precioAnterior": price_prev,
                "descripcion": "",
                "imagen": imagen,
                "tags": [categoria_slug],
                "popular": on_sale,
                "visible": True,
                "stock": 10
            })
        except Exception as e:
            print(f"    ⚠ Error extrayendo producto: {e}")
            continue

    return productos


def scrape_categoria(cat: dict) -> dict:
    """Hace scraping de una categoría completa (todas sus páginas)."""
    print(f"\n🌐 Scraping: {cat['nombre']}")

    all_products = []
    page = 1
    max_pages = 10  # Safety limit

    while page <= max_pages:
        url = f"{BASE_URL}{cat['url']}"
        if page > 1:
            url = f"{BASE_URL}{cat['url']}page/{page}/"

        print(f"  → Página {page}: {url}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200 or len(resp.text) < 1000:
                print(f"  ⚠ Página {page} no disponible, terminado")
                break

            soup = BeautifulSoup(resp.text, 'lxml')

            # Extraer productos
            products = extract_products_from_page(soup, cat['slug'])
            if not products:
                print(f"  ✓ No más productos en página {page}")
                break

            all_products.extend(products)
            print(f"  ✓ {len(products)} productos encontrados (total: {len(all_products)})")

            page += 1
            time.sleep(0.5)  # Rate limit

        except Exception as e:
            print(f"  ❌ Error: {e}")
            break

    return {
        "categoria": cat['slug'],
        "nombre": cat['nombre'],
        "slug": cat['slug'],
        "fuente": "regalosconamorcolombia.com",
        "total_productos": len(all_products),
        "productos": all_products
    }


def main():
    print("=" * 60)
    print(" SCRAPER - regalosconamorcolombia.com")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for cat in CATEGORIAS:
        result = scrape_categoria(cat)

        if result['productos']:
            output_file = OUTPUT_DIR / f"{result['slug']}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"  💾 Guardado: {output_file} ({len(result['productos'])} productos)")

    print("\n✅ Scraping completado!")
    print(f"📁 Archivos en: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()