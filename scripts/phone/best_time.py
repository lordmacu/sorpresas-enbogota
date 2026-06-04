#!/usr/bin/env python3
"""
Mejor hora/día para publicar, según el ALCANCE REAL de tus posts (no el promedio
genérico de internet). Necesita varias semanas de data para ser confiable; al
inicio dará poco, pero va mejorando.

PREPARADO — requiere el scope:  instagram_business_manage_insights

  python3 best_time.py
"""
import os
import sys
import datetime
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


def _reach(media_id):
    ins = (igkit.media_insights(media_id, "reach") or {}).get("data", [])
    for i in ins:
        if i.get("name") == "reach":
            try:
                return i["values"][0]["value"]
            except Exception:
                return 0
    return 0


def main():
    igkit.load_env()
    media = (igkit.my_media(limit=50) or {}).get("data", [])
    if not media:
        print("Sin publicaciones para analizar todavía.")
        return
    byhour = defaultdict(lambda: [0, 0])
    byday = defaultdict(lambda: [0, 0])
    for m in media:
        ts = m.get("timestamp")
        if not ts:
            continue
        dt = datetime.datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S")  # UTC
        bog = dt - datetime.timedelta(hours=5)  # Bogotá
        r = _reach(m["id"])
        byhour[bog.hour][0] += r
        byhour[bog.hour][1] += 1
        byday[bog.weekday()][0] += r
        byday[bog.weekday()][1] += 1

    print(f"📈 Análisis de {len(media)} publicaciones (hora de Bogotá)\n")
    print("— Mejores HORAS (alcance promedio) —")
    for h in sorted(byhour, key=lambda h: -(byhour[h][0] / max(byhour[h][1], 1)))[:6]:
        avg = byhour[h][0] / max(byhour[h][1], 1)
        print(f"  {h:02d}:00  →  {avg:.0f}  (n={byhour[h][1]})")
    print("\n— Mejores DÍAS —")
    for d in sorted(byday, key=lambda d: -(byday[d][0] / max(byday[d][1], 1))):
        avg = byday[d][0] / max(byday[d][1], 1)
        print(f"  {DAYS[d]}  →  {avg:.0f}  (n={byday[d][1]})")
    print("\n💡 Cuando haya ~3-4 semanas de data, ajustamos las horas del cron a tus mejores franjas.")


if __name__ == "__main__":
    main()
