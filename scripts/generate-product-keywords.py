#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera keywords meta tag para cada producto basado en nombre, categoría, ocasión.
USO: python3 scripts/generate-product-keywords.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD_FILE = os.path.join(ROOT, "data", "productos.json")
LANDINGS_FILE = os.path.join(ROOT, "data", "landings.json")

def extract_keywords(nombre: str, categoria: str, ocasiones: list = None) -> str:
    """Extrae keywords significativos del nombre y categoría.

    Retorna: string con keywords separados por coma (máx 160 chars, ~10 keywords)
    """
    keywords = set()

    # 1. Palabras del nombre (sin stopwords)
    stopwords = {
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del",
        "y", "o", "en", "con", "por", "para", "es", "son", "a", "al",
        "pack", "combo", "kit", "caja", "ramo", "canasta", "arreglo",
    }
    words = [w.lower() for w in nombre.split() if w.lower() not in stopwords and len(w) > 2]
    keywords.update(words[:3])  # Top 3 palabras del nombre

    # 2. Categoría
    if categoria:
        cat_words = categoria.replace("-", " ").split()
        keywords.update([w for w in cat_words if w.lower() not in stopwords and len(w) > 2][:2])

    # 3. Palabras clave por ocasión (si existen)
    ocasion_keywords = {
        "cumpleanos": ["regalo", "cumpleaños", "celebración"],
        "amor": ["amor", "romántico", "pareja"],
        "mama": ["mamá", "madre"],
        "papa": ["papá", "padre"],
        "aniversario": ["aniversario", "pareja"],
        "amistad": ["amistad", "amigo"],
        "flores": ["flores", "rosas"],
        "desayuno": ["desayuno", "sorpresa"],
        "chocolate": ["chocolate"],
        "urgencia": ["urgencia", "mismo día"],
    }

    for ocasion, kws in ocasion_keywords.items():
        if ocasion in nombre.lower() or ocasion in categoria.lower():
            keywords.update(kws)
            break

    # 4. Siempre agregar: Bogotá, a domicilio, regalo
    keywords.update(["Bogotá", "a domicilio", "regalo", "sorpresa"])

    # 5. Limpia y ordena
    keywords_list = sorted(list(keywords))
    # Trunca a ~160 chars (estándar de meta keywords)
    result = ", ".join(keywords_list)
    if len(result) > 160:
        result = result[:160].rsplit(", ", 1)[0]  # Quita la última palabra si excede

    return result

def main():
    print("Cargando productos...")
    with open(PROD_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    productos = data['productos']

    # Carga landings para mapear ocasiones
    with open(LANDINGS_FILE, 'r', encoding='utf-8') as f:
        landings_data = json.load(f)
    landings = landings_data['landings']

    # Genera keywords para cada producto
    updated_count = 0
    for prod in productos:
        # Busca ocasiones relacionadas (opcional, podría no estar disponible)
        ocasiones = []
        for landing in landings:
            if landing.get("tipo") in ["ocasion", "urgencia"]:
                # Verifica si el nombre o categoría del producto coincide con la ocasión
                if (prod.get("nombre", "").lower().find(landing.get("slug", "").replace("-", " ")) >= 0 or
                    prod.get("categoria", "").find(landing.get("slug", "")) >= 0):
                    ocasiones.append(landing.get("slug"))

        keywords = extract_keywords(
            prod.get("nombre", ""),
            prod.get("categoria", ""),
            ocasiones
        )

        # Actualiza el producto solo si no tiene keywords o está vacío
        if not prod.get("keywords") or not prod["keywords"].strip():
            prod["keywords"] = keywords
            updated_count += 1
            print(f"  ✓ {prod['slug']}: {keywords[:50]}...")

    # Guarda los productos actualizados
    print(f"\nGuardando {updated_count} productos con keywords...")
    with open(PROD_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Completado: {updated_count}/{len(productos)} productos actualizados")

if __name__ == '__main__':
    main()
