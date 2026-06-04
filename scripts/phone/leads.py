#!/usr/bin/env python3
"""
Tu lista de contactos/interesados (capturada de comentarios y DMs con intención).
Muestra los últimos + qué piden más (tu data de demanda para cuando vendas).

  python3 leads.py
"""
import os
import sys
import json
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

STOP = set((
    "el la los las un una unos unas de del al para por con que como mas más muy "
    "mi me te se su sus es y o a en lo le les esto esta este eso quiero hola buenas "
    "dias días tardes noches porfa gracias si sí no"
).split())


def main():
    if not os.path.exists(igkit.LEADS_FILE):
        print("📋 Aún no hay contactos (se llenan solos cuando comenten/escriban).")
        return
    leads = [json.loads(x) for x in open(igkit.LEADS_FILE, encoding="utf-8") if x.strip()]
    print(f"📋 {len(leads)} interesados en tu lista\n")

    print("— Últimos —")
    for x in leads[-15:]:
        print(f"  {x['fecha']} · {x['fuente']:<10} · {x['quien']}: {x['texto'][:55]}")

    words = Counter()
    for x in leads:
        for w in x["texto"].lower().replace(",", " ").replace(".", " ").split():
            w = w.strip("¿?¡!()\"'")
            if len(w) > 3 and w not in STOP:
                words[w] += 1
    if words:
        print("\n🔎 Lo que más piden/mencionan:")
        for w, c in words.most_common(12):
            print(f"  {w}: {c}")
    print("\n💡 Cuando actives ventas, este es tu primer público para escribirle.")


if __name__ == "__main__":
    main()
