#!/usr/bin/env python3
"""
Sirve el reel.mp4 ya generado por un túnel dinámico de Cloudflare (trycloudflare)
para PREVISUALIZARLO en el navegador. No publica nada en Instagram.

  python3 serve_preview.py                 # sirve el reel.mp4 actual
  PREVIEW_MIN=60 python3 serve_preview.py   # mantiene el túnel 60 min

Imprime la línea  VIDEO_URL: https://xxxx.trycloudflare.com/reel.mp4
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402
from post_video import start_server, start_tunnel, workdir  # noqa: E402


def main():
    igkit.load_env()
    wd = workdir()
    mp4 = os.path.join(wd, "reel.mp4")
    if not os.path.exists(mp4):
        raise SystemExit("✗ No hay reel.mp4. Corre primero make_video.py")
    size = os.path.getsize(mp4) / 1024 / 1024

    httpd = start_server(wd)
    proc, public = start_tunnel()
    if not public:
        httpd.shutdown()
        proc.terminate()
        raise SystemExit("✗ No obtuve URL del túnel")

    print(f"VIDEO_URL: {public}/reel.mp4")
    print(f"  ({size:.2f} MB · túnel activo · se cae solo en unos minutos)")
    minutes = int(os.environ.get("PREVIEW_MIN", "30"))
    try:
        time.sleep(minutes * 60)
    except KeyboardInterrupt:
        pass
    finally:
        proc.terminate()
        httpd.shutdown()


if __name__ == "__main__":
    main()
