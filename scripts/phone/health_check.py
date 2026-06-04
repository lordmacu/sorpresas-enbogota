#!/usr/bin/env python3
"""
Health check: te avisa por email si
  1) el token/cuenta de Instagram dejó de responder (posible baneo/bloqueo/token caído), o
  2) algún job del cron falló desde la última revisión.

Corre cada pocas horas (cron). Lee solo lo NUEVO del log para no repetir avisos.
Requiere scope instagram_business_basic.

  python3 health_check.py
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs", "cron.log")
STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".health_state.json")


def main():
    igkit.load_env()
    problems = []

    # 1) ¿La cuenta/token responde?
    token = igkit.ig_token()
    r = igkit.get(f"{igkit.GRAPH}/me", {"fields": "username", "access_token": token})
    if r.get("error") or not r.get("username"):
        msg = str(r.get("error") or r)[:300]
        igkit.notify(
            "Instagram no respondió bien a una verificación básica:\n\n" + msg +
            "\n\nPosibles causas: token caído/expirado, cuenta bloqueada o restringida. "
            "Abre la app de Instagram para revisar, y si hace falta regeneramos el token.",
            title="🚨 Instagram caído / posible bloqueo")
        print("⚠️ ALERTA: cuenta/token con problema")
        problems.append("token/cuenta")
    else:
        print(f"✅ cuenta OK: @{r.get('username')}")

    # 2) Fallos en el cron.log desde la última revisión
    try:
        state = json.load(open(STATE))
    except Exception:
        state = {}
    offset = state.get("offset", 0)
    fails, newoffset = [], offset
    try:
        size = os.path.getsize(LOG)
        with open(LOG, encoding="utf-8", errors="replace") as f:
            f.seek(offset if offset <= size else 0)
            for line in f:
                if "[done]" in line and "(exit " in line and "(exit 0)" not in line:
                    fails.append(line.strip())
            newoffset = f.tell()
    except FileNotFoundError:
        pass

    if fails:
        igkit.notify(
            f"{len(fails)} job(s) del worker fallaron:\n\n" +
            "\n".join("• " + x for x in fails[-15:]) +
            "\n\nRevisa logs/cron.log para el detalle.",
            title=f"⚠️ {len(fails)} job(s) fallaron")
        print(f"⚠️ {len(fails)} fallos notificados")
        problems.append(f"{len(fails)} jobs")
    else:
        print("✅ sin fallos nuevos en el cron")

    state["offset"] = newoffset
    try:
        json.dump(state, open(STATE, "w"))
    except Exception:
        pass

    print("health check OK" if not problems else f"health check con avisos: {problems}")


if __name__ == "__main__":
    main()
