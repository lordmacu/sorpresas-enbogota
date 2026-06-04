#!/usr/bin/env python3
"""
Convierte un token CORTO de Facebook (el del Graph API Explorer, dura ~1-2h) en uno
de LARGA VIDA (60 días), listo para usar como FB_GRAPH_TOKEN en la búsqueda de hashtags.
Si hay Página conectada, además imprime el token de Página (ese no expira).

Pon en el .env (local; NO lo pegues en el chat):
  FB_APP_ID        ID de tu app de Meta   (App → Configuración → Básica)
  FB_APP_SECRET    Secreto de la app      (misma pantalla)
  FB_SHORT_TOKEN   token corto del Graph API Explorer (con instagram_basic,
                   pages_show_list, pages_read_engagement)

  python3 fb_token_setup.py
Luego copia el token largo que imprime y guárdalo como FB_GRAPH_TOKEN en el .env.
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

FB = "https://graph.facebook.com/v21.0"


def main():
    igkit.load_env()
    app_id = os.environ.get("FB_APP_ID")
    secret = os.environ.get("FB_APP_SECRET")
    short = os.environ.get("FB_SHORT_TOKEN") or os.environ.get("FB_GRAPH_TOKEN")
    if not (app_id and secret and short):
        raise SystemExit("✗ Faltan FB_APP_ID / FB_APP_SECRET / FB_SHORT_TOKEN en el .env")

    # 1) Token corto → largo (60 días)
    r = igkit.get(f"{FB}/oauth/access_token", {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": secret,
        "fb_exchange_token": short,
    })
    long = r.get("access_token")
    if not long:
        raise SystemExit(f"✗ No se pudo extender el token: {json.dumps(r)[:300]}")

    print("✅ Token de LARGA VIDA (60 días). Guárdalo en el .env como:\n")
    print(f"FB_GRAPH_TOKEN={long}\n")

    # 2) (Opcional) Token de Página — no expira mientras no cambies la contraseña
    pages = igkit.get(f"{FB}/me/accounts", {"access_token": long}).get("data", [])
    for p in pages:
        print(f"📄 Página '{p.get('name')}' (id {p.get('id')}) — token de Página (no expira):")
        print(f"FB_GRAPH_TOKEN={p.get('access_token')}\n")
    if not pages:
        print("(No vi Páginas conectadas; con el token de 60 días basta para hashtags. "
              "Recuerda renovarlo cada ~2 meses, o usa uno de Página.)")


if __name__ == "__main__":
    main()
