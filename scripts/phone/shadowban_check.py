#!/usr/bin/env python3
"""
Chequeo de shadowban: vigila tu ALCANCE y tus SEGUIDORES y avisa si caen feo
(señal de que Instagram te está ocultando). Corre a diario (cron) y guarda un
histórico. Las alertas quedan en logs/cron.log.

Requiere los scopes: instagram_business_basic + instagram_business_manage_insights.

  python3 shadowban_check.py
"""
import os
import sys
import json
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

HIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shadowban_history.json")
DROP = 0.5       # alerta si el alcance reciente < 50% del baseline
MIN_BASE = 20    # piso de alcance para que la comparación tenga sentido


def reach(media_id):
    ins = (igkit.media_insights(media_id, "reach") or {}).get("data", [])
    for i in ins:
        if i.get("name") == "reach":
            try:
                return i["values"][0]["value"]
            except Exception:
                return 0
    return 0


def followers():
    token = igkit.ig_token()
    ig = igkit.ig_user_id(token)
    r = igkit.get(f"{igkit.GRAPH}/{ig}", {"fields": "followers_count", "access_token": token})
    return r.get("followers_count")


def main():
    igkit.load_env()
    media = (igkit.my_media(limit=20) or {}).get("data", [])
    reaches = [reach(m["id"]) for m in media]            # más nuevos primero
    fc = followers()
    today = datetime.date.today().isoformat()

    try:
        hist = json.load(open(HIST))
    except Exception:
        hist = []

    alerts = []
    print("🛡️  CHEQUEO DE SHADOWBAN\n")

    # 1) Alcance: últimos 3 posts vs el resto
    if len(reaches) >= 6:
        recent = sum(reaches[:3]) / 3
        baseline = sum(reaches[3:]) / len(reaches[3:])
        print(f"alcance reciente (3): {recent:.0f}  ·  baseline: {baseline:.0f}")
        if baseline >= MIN_BASE and recent < baseline * DROP:
            alerts.append(
                f"Alcance reciente {recent:.0f} es <{int(DROP*100)}% del baseline {baseline:.0f} "
                "→ POSIBLE SHADOWBAN")
    else:
        print(f"(pocos posts: {len(reaches)} — el baseline se forma publicando más)")

    # 2) Seguidores vs último registro
    if fc is not None and hist:
        last_fc = hist[-1].get("followers")
        if last_fc is not None and fc < last_fc:
            alerts.append(f"Seguidores bajaron: {last_fc} → {fc}")

    # 3) Tendencia del alcance promedio vs media de los últimos días
    avg = round(sum(reaches) / len(reaches), 1) if reaches else 0
    if len(hist) >= 5:
        prev_avg = sum(h.get("avg_reach", 0) for h in hist[-5:]) / 5
        if prev_avg >= MIN_BASE and avg < prev_avg * DROP:
            alerts.append(f"Alcance promedio {avg} cayó vs media reciente {prev_avg:.0f}")

    hist.append({"fecha": today, "followers": fc, "avg_reach": avg})
    hist = hist[-90:]
    json.dump(hist, open(HIST, "w"))

    print(f"seguidores: {fc}  ·  alcance promedio: {avg}")
    if alerts:
        print("\n🚨 ALERTAS:")
        for a in alerts:
            print("  ⚠️ " + a)
        igkit.notify(
            "\n".join("• " + a for a in alerts)
            + "\n\nRevisa hashtags/automatización. Si persiste, pausa con IG_PUBLISH=0 unos días.",
            title="⚠️ Posible shadowban")
        print("\n   → (alerta enviada por email si está configurado)")
    else:
        print("\n✅ Sin señales de shadowban.")


if __name__ == "__main__":
    main()
