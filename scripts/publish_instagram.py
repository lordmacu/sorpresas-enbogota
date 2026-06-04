#!/usr/bin/env python3
"""
Publica un CARRUSEL en Instagram con las 3 imágenes del endpoint /api/reel,
usando la API de Instagram (Instagram Login). Solo librería estándar.

Requiere en el entorno o en .env:
  TOKEN_INSTAGRAM     token de la API de Instagram (con instagram_business_content_publish)
                      (también acepta META_ACCESS_TOKEN)
  IG_USER_ID          (opcional) id de la cuenta; si falta, se descubre desde /me.

Uso:
  python3 scripts/publish_instagram.py                # categoría aleatoria
  python3 scripts/publish_instagram.py para-mama      # fuerza categoría
  python3 scripts/publish_instagram.py --dry-run      # arma todo, NO publica
"""
import os
import sys
import time
import json
import urllib.request
import urllib.parse
import urllib.error

GRAPH = "https://graph.instagram.com"
SITE = os.environ.get("SITE_URL", "https://sorpresas.enbogota.app")


def load_env():
    for fname in (".env.local", ".env"):
        if not os.path.exists(fname):
            continue
        for line in open(fname, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _req(url, data=None):
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        req = urllib.request.Request(url, data=body, method="POST")
    else:
        req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {"error": {"message": f"HTTP {e.code}"}}


def get(url, params=None):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return _req(url)


def post(url, data):
    return _req(url, data)


def discover_ig_user_id(token):
    r = get(f"{GRAPH}/me", {"fields": "user_id,username", "access_token": token})
    if r.get("user_id"):
        print(f"  cuenta IG: @{r.get('username')}  (id {r['user_id']})")
        return r["user_id"]
    raise SystemExit(f"✗ No pude leer la cuenta de IG desde el token: {r}")


def get_reel(categoria=None):
    url = f"{SITE}/api/reel" + (f"?categoria={categoria}" if categoria else "")
    print(f"→ {url}")
    return get(url)


def create_item(token, ig_id, image_url):
    r = post(f"{GRAPH}/{ig_id}/media", {"image_url": image_url, "is_carousel_item": "true", "access_token": token})
    if "id" not in r:
        raise SystemExit(f"✗ Error creando contenedor de imagen: {r}")
    return r["id"]


def wait_ready(token, container_id, tries=20):
    for _ in range(tries):
        r = get(f"{GRAPH}/{container_id}", {"fields": "status_code", "access_token": token})
        if r.get("status_code") == "FINISHED":
            return True
        if r.get("status_code") == "ERROR":
            raise SystemExit(f"✗ Contenedor en ERROR: {r}")
        time.sleep(3)
    return False


def main():
    load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    categoria = args[0] if args else None

    reel = get_reel(categoria)
    if "error" in reel or not reel.get("imageUrls"):
        raise SystemExit(f"✗ /api/reel no devolvió imágenes: {reel}")
    images = reel["imageUrls"]
    caption = reel["caption"]
    print(f"  categoría: {reel['categoria']['nombre']}  ·  {len(images)} imágenes")
    for u in images:
        print(f"    - {u}")

    if dry:
        print("\n--- DRY RUN ---\nCaption:\n" + caption + "\n\n(no se publicó nada)")
        return

    token = os.environ.get("TOKEN_INSTAGRAM") or os.environ.get("META_ACCESS_TOKEN")
    if not token:
        raise SystemExit("✗ Falta TOKEN_INSTAGRAM en el entorno/.env")
    ig_id = os.environ.get("IG_USER_ID") or discover_ig_user_id(token)

    print("· creando contenedores de imagen…")
    children = [create_item(token, ig_id, u) for u in images]

    print("· creando contenedor del carrusel…")
    car = post(f"{GRAPH}/{ig_id}/media", {
        "media_type": "CAROUSEL",
        "children": ",".join(children),
        "caption": caption,
        "access_token": token,
    })
    if "id" not in car:
        raise SystemExit(f"✗ Error creando el carrusel: {car}")

    print("· esperando a que el carrusel esté listo…")
    wait_ready(token, car["id"])

    print("· publicando…")
    pub = post(f"{GRAPH}/{ig_id}/media_publish", {"creation_id": car["id"], "access_token": token})
    if "id" in pub:
        print(f"\n✅ Publicado. Media ID: {pub['id']}")
        print("   Abre tu feed de Instagram para verlo.")
    else:
        raise SystemExit(f"✗ Error al publicar: {pub}")


if __name__ == "__main__":
    main()
