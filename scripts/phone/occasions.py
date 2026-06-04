#!/usr/bin/env python3
"""
Calendario de ocasiones de regalo (Colombia). Cuando estamos dentro de la ventana
previa a una fecha, el contenido de producto se sesga a esa categoría (ej. en
junio → "para-papa"). No requiere permisos de Instagram: es pura lógica de fecha.

  current_occasion(date) -> (nombre, categoria, fecha) o None
  occasion_category(date) -> slug de categoría o None
"""
import os
import json
import random
import datetime

PREF_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preferred_categories.json")


def preferred_category():
    """Categoría que rinde mejor (de data_content.py), sesgada a las top. None si no hay."""
    try:
        prefs = json.load(open(PREF_FILE, encoding="utf-8"))
    except Exception:
        return None
    if not prefs:
        return None
    weights = list(range(len(prefs), 0, -1))  # las primeras pesan más
    return random.choices(prefs, weights=weights, k=1)[0]


def nth_weekday(year, month, weekday, n):
    """n-ésimo `weekday` (lunes=0 … domingo=6) del mes."""
    d = datetime.date(year, month, 1)
    offset = (weekday - d.weekday()) % 7
    return d + datetime.timedelta(days=offset + (n - 1) * 7)


# (nombre, categoría /api/reel, días de rampa antes, función fecha(año)->date)
OCCASIONS = [
    ("San Valentín",     "san-valentin", 14, lambda y: datetime.date(y, 2, 14)),
    ("Día de la Mujer",  "para-ella",    10, lambda y: datetime.date(y, 3, 8)),
    ("Día de la Madre",  "para-mama",    18, lambda y: nth_weekday(y, 5, 6, 2)),   # 2º domingo de mayo
    ("Día del Padre",    "para-papa",    18, lambda y: nth_weekday(y, 6, 6, 3)),   # 3er domingo de junio
    ("Amor y Amistad",   "amor-amistad", 18, lambda y: nth_weekday(y, 9, 5, 3)),   # 3er sábado de septiembre
    ("Halloween",        "halloween",    12, lambda y: datetime.date(y, 10, 31)),
    ("Velitas",          "navidad",      6,  lambda y: datetime.date(y, 12, 7)),
    ("Navidad",          "navidad",      24, lambda y: datetime.date(y, 12, 25)),
]


def current_occasion(today=None):
    """Devuelve la ocasión activa más próxima (dentro de su ventana de rampa)."""
    today = today or datetime.date.today()
    best = None
    for name, cat, ramp, datef in OCCASIONS:
        for y in (today.year, today.year + 1):  # por si la fecha ya pasó este año
            d = datef(y)
            start = d - datetime.timedelta(days=ramp)
            if start <= today <= d:
                if best is None or d < best[2]:
                    best = (name, cat, d)
    return best


def occasion_category(today=None):
    occ = current_occasion(today)
    return occ[1] if occ else None


if __name__ == "__main__":
    occ = current_occasion()
    if occ:
        print(f"Ocasión activa: {occ[0]} → categoría '{occ[1]}' (fecha {occ[2]})")
    else:
        print("Sin ocasión activa hoy (contenido aleatorio).")
