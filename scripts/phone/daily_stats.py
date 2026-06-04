#!/usr/bin/env python3
"""
Resumen DIARIO por email con lo útil: seguidores (y cambio vs ayer), alcance del
día, qué se publicó hoy y cómo va, e interesados nuevos (leads) con lo que piden.

Requiere scopes instagram_business_basic + manage_insights. Corre 1x/día (cron, noche).

  python3 daily_stats.py
"""
import os
import sys
import json
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
HIST = os.path.join(HERE, "shadowban_history.json")
STATS_FILE = os.path.join(HERE, "daily_stats.jsonl")  # histórico local para analizar luego


def bog_date(ts):
    """Fecha en Bogotá (UTC-5) de un timestamp de IG (que viene en UTC)."""
    try:
        dt = datetime.datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S")
        return (dt - datetime.timedelta(hours=5)).date().isoformat()
    except Exception:
        return ""


def reach(media_id):
    ins = (igkit.media_insights(media_id, "reach,saved") or {}).get("data", [])
    out = {"reach": 0, "saved": 0}
    for i in ins:
        try:
            out[i.get("name")] = i["values"][0]["value"]
        except Exception:
            pass
    return out


def main():
    igkit.load_env()
    today = datetime.date.today().isoformat()
    token = igkit.ig_token()
    ig = igkit.ig_user_id(token)

    # Seguidores + cambio vs el último registro
    acc = igkit.get(f"{igkit.GRAPH}/{ig}", {"fields": "followers_count,media_count", "access_token": token})
    fc = acc.get("followers_count")
    prev = None
    try:
        hist = json.load(open(HIST))
        if hist:
            prev = hist[-1].get("followers")
    except Exception:
        pass
    delta = f" ({fc - prev:+d} vs ayer)" if (isinstance(fc, int) and isinstance(prev, int)) else ""

    # Posts de hoy + su alcance
    media = (igkit.my_media(limit=20) or {}).get("data", [])
    hoy = [m for m in media if bog_date(m.get("timestamp", "")) == today]
    reach_hoy, plines, posts_rec = 0, [], []
    for m in hoy:
        d = reach(m["id"])
        reach_hoy += d["reach"]
        cap = (m.get("caption") or "").splitlines()[0][:38] if m.get("caption") else m.get("media_type", "")
        plines.append(f"   • {cap} — alcance {d['reach']} · {d['saved']} guardados")
        posts_rec.append({"caption": cap, "type": m.get("media_type"),
                          "reach": d["reach"], "saved": d["saved"]})

    # Leads de hoy
    leads = []
    try:
        for x in open(igkit.LEADS_FILE, encoding="utf-8"):
            if x.strip():
                lz = json.loads(x)
                if lz.get("fecha", "").startswith(today):
                    leads.append(lz)
    except Exception:
        pass

    body = f"📊 Sorpresas — resumen del día ({today})\n\n"
    body += f"👥 Seguidores: {fc}{delta}\n"
    body += f"📈 Alcance de hoy: {reach_hoy}\n"
    body += f"📸 Publicado hoy: {len(hoy)}\n"
    if plines:
        body += "\n".join(plines) + "\n"
    body += f"\n📝 Interesados nuevos (leads): {len(leads)}\n"
    if leads:
        body += "\n".join(f"   - {lz.get('quien')}: {lz.get('texto', '')[:45]}" for lz in leads[:8]) + "\n"
    body += "\n(Detalle y tendencias: el reporte semanal de los lunes.)"

    # Guardar histórico local (para analizar tendencias después)
    record = {
        "fecha": today,
        "seguidores": fc,
        "alcance_hoy": reach_hoy,
        "posts_hoy": len(hoy),
        "leads_hoy": len(leads),
        "posts": posts_rec,
    }
    try:
        with open(STATS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        pass

    igkit.notify(body, title=f"📊 Sorpresas — día {today}")
    print(body)


if __name__ == "__main__":
    main()
