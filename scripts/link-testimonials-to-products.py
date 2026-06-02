#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vincula testimonios a productos por nombre y enriquece con slug.
USO: python3 scripts/link-testimonials-to-products.py
"""
import json
import os
import difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD_FILE = os.path.join(ROOT, "data", "productos.json")
TEST_FILE = os.path.join(ROOT, "data", "testimonios.json")

def find_product_by_name(product_name: str, productos: list) -> dict | None:
    """Busca un producto por nombre (fuzzy match)."""
    # Busca coincidencia exacta primero
    for p in productos:
        if p['nombre'].lower() == product_name.lower():
            return p

    # Si no hay match exacto, usa fuzzy matching
    matches = difflib.get_close_matches(
        product_name.lower(),
        [p['nombre'].lower() for p in productos],
        n=1,
        cutoff=0.6
    )

    if matches:
        for p in productos:
            if p['nombre'].lower() == matches[0]:
                return p

    return None

def main():
    print("Cargando datos...")
    with open(PROD_FILE, 'r', encoding='utf-8') as f:
        prod_data = json.load(f)
    productos = prod_data['productos']

    with open(TEST_FILE, 'r', encoding='utf-8') as f:
        test_data = json.load(f)
    testimonios = test_data['testimonios']

    # Vincula testimonios a productos
    linked = 0
    for t in testimonios:
        producto_nombre = t.get('producto', '')
        producto = find_product_by_name(producto_nombre, productos)

        if producto:
            t['producto_slug'] = producto['slug']
            linked += 1
            print(f"  ✓ '{producto_nombre}' → {producto['slug']}")
        else:
            print(f"  ⊘ '{producto_nombre}' — no encontrado")

    # Guarda testimonios actualizados
    print(f"\nGuardando {linked} testimonios vinculados...")
    with open(TEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Completado: {linked}/{len(testimonios)} testimonios vinculados")

if __name__ == '__main__':
    main()
