#!/usr/bin/env python3
"""
Construye el Reel (make_video.py), lo sirve por un túnel dinámico de Cloudflare
(quick tunnel, trycloudflare.com) y lo publica en Instagram como REEL.

La URL del túnel es efímera: solo tiene que vivir mientras Instagram descarga el
video una vez (al crear el contenedor). No necesitamos dominio fijo.

  python3 post_video.py                 # construye + (si IG_PUBLISH=1) publica
  python3 post_video.py para-papa       # fuerza categoría
  python3 post_video.py --skip-build    # usa el reel.mp4 ya generado
  python3 post_video.py --build-only    # solo construye (para revisar el mp4)

No publica nada salvo que IG_PUBLISH=1 (interruptor maestro en igkit).
"""
import os
import re
import sys
import time
import socket
import threading
import subprocess
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8787


def workdir():
    prefix = os.environ.get("PREFIX", "/data/data/com.termux/files/usr")
    return os.path.join(prefix, "var/lib/proot-distro/installed-rootfs/debian", "root", "sorpresas-video")


# --- servidor HTTP con soporte de Range (Instagram a veces pide rangos) -------
class RangeHandler(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path)
        # solo el mp4 usa la lógica de rangos; lo demás (imágenes, listados) normal
        if not (os.path.isfile(path) and path.endswith(".mp4")):
            return super().do_GET()
        rng = self.headers.get("Range")
        size = os.path.getsize(path)
        if not rng:
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(size))
            self.end_headers()
            with open(path, "rb") as f:
                self.copyfile(f, self.wfile)
            return
        m = re.match(r"bytes=(\d+)-(\d*)", rng)
        start = int(m.group(1))
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        length = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.end_headers()
        with open(path, "rb") as f:
            f.seek(start)
            self.wfile.write(f.read(length))


def start_server(directory):
    handler = partial(RangeHandler, directory=directory)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def start_tunnel():
    """Lanza cloudflared quick tunnel y devuelve (proc, public_url)."""
    proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{PORT}"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    url = None
    deadline = time.time() + 40
    while time.time() < deadline:
        line = proc.stdout.readline()
        if not line:
            if proc.poll() is not None:
                break
            continue
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if m:
            url = m.group(0)
            break
    return proc, url


def main():
    igkit.load_env()
    passthru = [a for a in sys.argv[1:] if a not in ("--skip-build", "--build-only")]
    skip_build = "--skip-build" in sys.argv
    build_only = "--build-only" in sys.argv

    wd = workdir()
    mp4 = os.path.join(wd, "reel.mp4")

    # 1) construir el reel
    if not skip_build or not os.path.exists(mp4):
        print("▶ construyendo el reel…")
        r = subprocess.run([sys.executable, os.path.join(HERE, "make_video.py"), *passthru])
        if r.returncode != 0 or not os.path.exists(mp4):
            raise SystemExit("✗ No se generó reel.mp4")
    caption = ""
    cap_file = os.path.join(wd, "caption.txt")
    if os.path.exists(cap_file):
        caption = open(cap_file, encoding="utf-8").read()

    if build_only:
        print(f"\n✅ reel.mp4 listo para revisar:\n   {mp4}")
        return

    if not igkit.guard_publish():
        print(f"\n  [preparado] reel.mp4 listo. Revísalo y, cuando esté lindo, activa IG_PUBLISH=1.")
        print(f"   {mp4}")
        return

    # 2) servir + túnel
    print("· levantando servidor local + túnel Cloudflare…")
    httpd = start_server(wd)
    proc, public = start_tunnel()
    if not public:
        httpd.shutdown()
        proc.terminate()
        raise SystemExit("✗ No obtuve URL del túnel de Cloudflare")
    video_url = f"{public}/reel.mp4"
    print(f"  túnel: {video_url}")

    try:
        token = igkit.ig_token()
        ig_id = igkit.ig_user_id(token)
        print("· creando contenedor REEL…")
        c = igkit.post(f"{igkit.GRAPH}/{ig_id}/media", {
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "access_token": token,
        })
        if "id" not in c:
            raise SystemExit(f"✗ Error creando contenedor de reel: {c}")
        print("· Instagram está descargando y procesando el video…")
        if not igkit.wait_ready(token, c["id"], tries=60, delay=5):
            raise SystemExit("✗ El video no quedó FINISHED a tiempo")
        print("· publicando…")
        mid = igkit.publish(token, ig_id, c["id"])
        print(f"\n✅ Reel publicado. Media ID: {mid}")
    finally:
        proc.terminate()
        httpd.shutdown()


if __name__ == "__main__":
    main()
