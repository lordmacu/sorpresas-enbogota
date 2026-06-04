#!/usr/bin/env python3
"""
Reporte de analíticas: métricas de la cuenta + de las publicaciones recientes,
y cuál rindió mejor (para saber qué contenido repetir).

PREPARADO — requiere en el token el scope:  instagram_business_manage_insights

  python3 report.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402


def _val(insight_obj):
    """Extrae el valor de un objeto insight de la API."""
    try:
        return insight_obj["values"][0]["value"]
    except Exception:
        return insight_obj.get("total_value", {}).get("value", "—")


def main():
    igkit.load_env()
    print("📊 REPORTE SORPRESAS\n")

    acc = igkit.account_insights("reach,follower_count,profile_views", "day") or {}
    data = acc.get("data")
    if not data:
        print("(Sin insights — falta el scope instagram_business_manage_insights, "
              f"o respuesta: {str(acc)[:160]})")
    else:
        print("— Cuenta (hoy) —")
        for ins in data:
            print(f"  {ins.get('name')}: {_val(ins)}")

    print("\n— Publicaciones recientes —")
    media = (igkit.my_media(limit=10) or {}).get("data", [])
    ranked = []
    for m in media:
        ins = (igkit.media_insights(m["id"]) or {}).get("data", [])
        metrics = {i.get("name"): _val(i) for i in ins}
        reach = metrics.get("reach", 0) or 0
        saves = metrics.get("saved", 0) or 0
        shares = metrics.get("shares", 0) or 0
        cap = (m.get("caption") or "").splitlines()[0][:42] if m.get("caption") else m.get("media_type", "")
        ranked.append((reach, saves, shares, cap, m.get("permalink", "")))
        print(f"  {cap:<44} alcance {reach} · guardados {saves} · compartidos {shares}")

    if ranked:
        best = max(ranked, key=lambda r: (r[1] + r[2], r[0]))  # más saves+shares
        print(f"\n🏆 El que más enganchó: «{best[3]}» ({best[1]} guardados, {best[2]} compartidos)")
        print("   → conviene hacer más contenido de ese estilo/categoría.")

        # Resumen por email
        top = sorted(ranked, key=lambda r: -(r[1] + r[2] + r[0]))[:5]
        cuerpo = "Tus publicaciones de la semana (alcance · guardados · compartidos):\n\n"
        cuerpo += "\n".join(f"• {c} — {rc} · {sv} · {sh}" for rc, sv, sh, c, _ in top)
        cuerpo += (f"\n\n🏆 El que más enganchó: «{best[3]}» ({best[1]} guardados, {best[2]} compartidos).\n"
                   "→ Haz más contenido de ese estilo.")
        igkit.notify(cuerpo, title="📊 Reporte semanal")


if __name__ == "__main__":
    main()
