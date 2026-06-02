#!/usr/bin/env python3
"""
Test script para la API de pagosweb QA (pagosweb.shd.gov.co)
Único propósito: verificar integración y guardar respuestas exitosas.
NO usar en producción.
"""

import requests
import random
import json
import time
from pathlib import Path

# =============================================================================
# CONFIGURACIÓN
# =============================================================================
BASE_URL = "https://pagosweb.shd.gov.co/api/holders/queryHolder"
OUTPUT_FILE = Path(__file__).parent / "qa_test_results.json"
NUM_REQUESTS = 100
DELAY_SECONDS = 0.5  # Rate limiting
START_CEDULA = 78000000  # Cédula inicial (8 dígitos, rango 78 millones)

# =============================================================================
# GENERACIÓN DE CÉDULAS COLOMBIANAS VÁLIDAS
# =============================================================================

def generate_cedula():
    """
    Genera un número de cédula colombiano pseudo-aleatorio válido.
    Formato: 10 dígitos (cedulación moderna en Colombia).
    """
    # Los primeros dígitos de cédula en Colombia varían por región
    # Generamos un número base de 9 dígitos starting with common prefixes
    prefixes = [
        "1",   # Bogotá
        "2",   # Antique/Chocó
        "3",   # Atlántico/Bolívar/Magdalena
        "4",   # Santanderes
        "5",   # Valle
        "6",   # Huila/Tolima/Caqueta
        "7",   # Caldas/Risaralda/Quindío
        "8",   # Boyacá/Cundinamarca
        "9",   # Córdoba/Sucre
    ]

    prefix = random.choice(prefixes)
    remaining = ''.join([str(random.randint(0, 9)) for _ in range(9)])
    cedula = prefix + remaining

    return cedula


def generate_cedula_with_checksum():
    """
    Genera cédula con algoritmo de verificación colombiano.
    Más realista para testing.
    """
    base = [random.randint(1, 9) for _ in range(9)]

    # Algoritmo de verificación colombiano (Luhn-like)
    weights = [41, 37, 29, 23, 19, 17, 13, 7, 3]
    sum_ = sum(d * w for d, w in zip(base, weights))
    check = (sum_ % 10)
    base_str = ''.join(map(str, base)) + str(check)

    # Asegurar 8-10 dígitos
    return base_str.zfill(10)


def generate_valid_cedula():
    """Genera cédula colombiana válida con dígito de verificación. Formato Bogotá: 10xxxxxxx"""
    # Bogotá: starts with 10
    digits = [1, 0] + [random.randint(0, 9) for _ in range(7)]
    weights = [41, 37, 29, 23, 19, 17, 13, 7, 3]

    total = sum(d * w for d, w in zip(digits, weights))
    check_digit = (total % 10)
    if check_digit == 10:
        check_digit = 0

    cedula = ''.join(map(str, digits)) + str(check_digit)
    return cedula


# =============================================================================
# CONSULTA A LA API
# =============================================================================

def query_holder(cedula: str, tipo_id: str = "CC") -> dict:
    """Hace POST a /queryHolder y retorna la respuesta."""
    payload = {
        "tipoId": tipo_id,
        "nroId": cedula,
        "option": 0
    }

    try:
        resp = requests.post(
            BASE_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "QA-Test-Script/1.0"
            },
            timeout=15
        )
        return {
            "status_code": resp.status_code,
            "ok": resp.ok,
            "data": resp.json() if resp.ok else None,
            "error": None if resp.ok else resp.text
        }
    except requests.Timeout:
        return {"status_code": 0, "ok": False, "data": None, "error": "Timeout"}
    except Exception as e:
        return {"status_code": 0, "ok": False, "data": None, "error": str(e)}


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 60)
    print(" TEST API QA - pagosweb.shd.gov.co")
    print("=" * 60)
    print(f"URL: {BASE_URL}")
    print(f"Cédulas a probar: {NUM_REQUESTS}")
    print(f"Delay entre requests: {DELAY_SECONDS}s")
    print("=" * 60)

    results = []
    errors = []
    success_count = 0
    error_count = 0

    for i in range(NUM_REQUESTS):
        # Cédula secuencial a partir de START_CEDULA
        cedula = str(START_CEDULA + i)

        print(f"\n[{i+1}/{NUM_REQUESTS}] Consultando cédula: {cedula}")

        result = query_holder(cedula)

        if result["ok"] and result["data"]:
            success_count += 1
            # Extraer solo los datos del holder (no metadata interna)
            data = result["data"]

            # Solo guardar si la respuesta contiene info válida del holder
            if "info" in data and data.get("message") == "OK":
                holder_info = {
                    "cedula": cedula,
                    "holderId": data["info"].get("holderId"),
                    "name": data["info"].get("name"),
                    "email": data["info"].get("email"),
                    "phone": data["info"].get("phone"),
                    "personType": data["info"].get("personType"),
                    "address": data["info"].get("address"),
                    "lastBank": data["info"].get("lastBank"),
                }
                results.append(holder_info)
                print(f"  ✅ {holder_info['name']} ({holder_info['email']})")
            else:
                # Guardar respuesta completa como "error" para debug
                errors.append({
                    "cedula": cedula,
                    "response": data,
                    "note": "Respuesta sin datos válidos de holder"
                })
                print(f"  ⚠ Sin datos holder: {data.get('message', 'unknown')}")
        else:
            error_count += 1
            print(f"  ❌ Error: {result['error']}")

        time.sleep(DELAY_SECONDS)

    # =============================================================================
    # GUARDAR RESULTADOS
    # =============================================================================
    print("\n" + "=" * 60)
    print(" RESUMEN")
    print("=" * 60)
    print(f"Total consultas:    {NUM_REQUESTS}")
    print(f"Exitosas:           {success_count}")
    print(f"Errores:            {error_count}")
    print(f"Datos guardados:    {len(results)}")

    if results:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Datos guardados en: {OUTPUT_FILE}")

    if errors:
        error_file = OUTPUT_FILE.with_suffix('.errors.json')
        with open(error_file, 'w', encoding='utf-8') as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print(f"⚠️  Errores guardados en: {error_file}")

    print("\n✅ Test completado!")


if __name__ == "__main__":
    main()