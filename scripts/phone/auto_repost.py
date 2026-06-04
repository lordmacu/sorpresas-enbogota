#!/usr/bin/env python3
"""
Repost automático de UGC a Stories: cuando un cliente te etiqueta en una IMAGEN,
la republica en tu Story (prueba social → más confianza → más seguidores).

PREPARADO — requiere el scope:  instagram_business_basic (ya lo tienes).
Gateado por IG_PUBLISH. Trackea lo ya reposteado para no duplicar.

  python3 auto_repost.py --dry-run
  python3 auto_repost.py

Nota: la API NO permite agregar el sticker de crédito @usuario en la Story; el
repost va sin la etiqueta visible. Para dar crédito, mejor compartir desde la app.
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".reposted.json")
TMP = "/data/data/com.termux/files/usr/tmp/ugc.jpg"


def _load():
    try:
        return set(json.load(open(STATE)))
    except Exception:
        return set()


def _save(s):
    json.dump(sorted(s), open(STATE, "w"))


def main():
    igkit.load_env()
    dry = "--dry-run" in sys.argv
    done = _load()
    tags = (igkit.get_tagged_media(25) or {}).get("data", [])
    if not tags:
        print("Sin UGC nuevo (nadie te ha etiquetado todavía).")
        return
    nuevos = 0
    for t in tags:
        tid = t.get("id")
        if not tid or tid in done:
            continue
        if t.get("media_type") != "IMAGE" or not t.get("media_url"):
            done.add(tid)
            continue
        nuevos += 1
        print(f"🔁 repost de @{t.get('username')}")
        if not dry and igkit.guard_publish():
            try:
                igkit.download(t["media_url"], TMP)
                public = igkit.upload_catbox(TMP)
                mid = igkit.publish_story(public)
                print(f"   ✅ Story publicada: {mid}")
            except Exception as e:
                print(f"   ✗ no se pudo repostear: {e}")
        done.add(tid)
    _save(done)
    print(f"listo ({nuevos} nuevos).")


if __name__ == "__main__":
    main()
