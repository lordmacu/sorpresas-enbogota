"""
Toolkit compartido para el worker de Instagram en el celular (Termux).
Solo librería estándar (urllib) — corre con el python de Termux sin compilar nada.

Lee del entorno o de .env (en este orden: .env.local, .env):
  TOKEN_INSTAGRAM   token de la API de Instagram (instagram_business_content_publish)
                    (también acepta META_ACCESS_TOKEN)
  IG_USER_ID        (opcional) id de la cuenta IG; si falta, se descubre desde /me
  LLM_API_KEY       (o MINIMAX_API_KEY) credencial de MiniMax para generar imágenes
  SITE_URL          (opcional) por defecto https://sorpresas.enbogota.app
"""
import os
import re
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error

GRAPH = "https://graph.instagram.com"
MINIMAX_BASE = "https://api.minimax.io"
SITE = os.environ.get("SITE_URL", "https://sorpresas.enbogota.app")


# ---------------------------------------------------------------- entorno ----
def load_env():
    """Carga .env.local/.env al entorno sin pisar variables ya definidas."""
    for fname in (".env.local", ".env"):
        if not os.path.exists(fname):
            continue
        with open(fname, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def ig_token():
    t = os.environ.get("TOKEN_INSTAGRAM") or os.environ.get("META_ACCESS_TOKEN")
    if not t:
        raise SystemExit("✗ Falta TOKEN_INSTAGRAM en el entorno/.env")
    return t


def minimax_key():
    k = os.environ.get("LLM_API_KEY") or os.environ.get("MINIMAX_API_KEY")
    if not k:
        raise SystemExit("✗ Falta LLM_API_KEY (MiniMax) en el entorno/.env")
    return k


def publish_enabled():
    """Interruptor maestro: nada se publica en Instagram salvo IG_PUBLISH=1.

    Apagado por defecto (variable ausente/vacía = OFF). Así podemos generar y
    revisar el contenido (sobre todo el video) sin publicar nada hasta activarlo.
    """
    return (os.environ.get("IG_PUBLISH") or "").strip().lower() in ("1", "true", "yes", "on")


def guard_publish():
    """Devuelve True si se puede publicar; si no, avisa y devuelve False."""
    if publish_enabled():
        return True
    print("⏸  IG_PUBLISH está APAGADO → no publico en Instagram.")
    print("    (Todo quedó preparado. Para activar: pon IG_PUBLISH=1 en el .env.)")
    return False


# -------------------------------------------------------------------- http ----
def _req(url, data=None, headers=None, method=None, timeout=120):
    if data is not None and not isinstance(data, (bytes, bytearray)):
        data = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data else "GET"))
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
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
    return _req(url, data=data)


def post_json(url, obj, headers=None):
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    return _req(url, data=json.dumps(obj).encode(), headers=h, method="POST")


def download(url, dest, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": "sorpresas-worker"})
    with urllib.request.urlopen(req, timeout=timeout) as r, open(dest, "wb") as f:
        f.write(r.read())
    return dest


# ------------------------------------------------------------- endpoints web ----
def fetch_reel(categoria=None, count=None):
    q = []
    if categoria:
        q.append(f"categoria={categoria}")
    if count:
        q.append(f"count={count}")
    url = f"{SITE}/api/reel" + ("?" + "&".join(q) if q else "")
    print(f"→ {url}")
    r = get(url)
    if "error" in r or not r.get("imageUrls"):
        raise SystemExit(f"✗ /api/reel no devolvió imágenes: {r}")
    return r


def fetch_post(slot=None):
    url = f"{SITE}/api/post/actual" + (f"?slot={slot}" if slot is not None else "")
    print(f"→ {url}")
    r = get(url)
    if "error" in r or not (r.get("imageUrl") or r.get("imagen")):
        raise SystemExit(f"✗ /api/post/actual no devolvió imagen: {r}")
    return r


# ----------------------------------------------------------------- MiniMax ----
def minimax_image(prompt, width=1080, height=1920, n=1, optimizer=True):
    """Genera imagen(es) con MiniMax image-01. Devuelve lista de URLs."""
    key = minimax_key()
    r = post_json(
        f"{MINIMAX_BASE}/v1/image_generation",
        {
            "model": "image-01",
            "prompt": prompt,
            "width": width,
            "height": height,
            "response_format": "url",
            "n": n,
            "prompt_optimizer": optimizer,
        },
        headers={"Authorization": f"Bearer {key}"},
    )
    if (r.get("base_resp") or {}).get("status_code") != 0:
        raise SystemExit(f"✗ MiniMax falló: {r.get('base_resp')}")
    return (r.get("data") or {}).get("image_urls") or []


def minimax_tts(text, voice="Spanish_SereneWoman", model="speech-02-hd", subtitles=False):
    """Voz en off con MiniMax t2a_v2.

    Devuelve bytes MP3; o `(bytes, segmentos)` si subtitles=True, donde cada
    segmento es {text, time_begin(ms), time_end(ms)} para sincronizar subtítulos.
    """
    key = minimax_key()
    r = post_json(
        f"{MINIMAX_BASE}/v1/t2a_v2",
        {
            "model": model,
            "text": text,
            "stream": False,
            "language_boost": "Spanish",
            "subtitle_enable": bool(subtitles),
            "voice_setting": {"voice_id": voice, "speed": 1, "vol": 1, "pitch": 0},
            "audio_setting": {"sample_rate": 44100, "bitrate": 128000, "format": "mp3"},
        },
        headers={"Authorization": f"Bearer {key}"},
    )
    data = r.get("data") or {}
    audio = data.get("audio")
    if (r.get("base_resp") or {}).get("status_code") != 0 or not audio:
        raise SystemExit(f"✗ TTS falló: {r.get('base_resp')}")
    audio_bytes = bytes.fromhex(audio)
    if not subtitles:
        return audio_bytes
    segs = []
    url = data.get("subtitle_file")
    if url:
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                segs = json.loads(resp.read().decode())
        except Exception:
            segs = []
    return audio_bytes, segs


def minimax_music(prompt, instrumental=True, model="music-2.6"):
    """Música original con MiniMax music_generation. Devuelve bytes MP3."""
    key = minimax_key()
    r = post_json(
        f"{MINIMAX_BASE}/v1/music_generation",
        {
            "model": model,
            "prompt": prompt,
            "is_instrumental": instrumental,
            "audio_setting": {"sample_rate": 44100, "bitrate": 128000, "format": "mp3"},
        },
        headers={"Authorization": f"Bearer {key}"},
    )
    audio = (r.get("data") or {}).get("audio")
    if not audio:
        raise SystemExit(f"✗ Música falló: {r.get('base_resp')}")
    return bytes.fromhex(audio)


def minimax_text(system, user, max_tokens=2000):
    """Genera texto (guión) con el LLM del proyecto (MiniMax, estilo anthropic u openai).

    Nota: MiniMax-M3 es un modelo de *thinking* (la respuesta trae un bloque
    'thinking' además del 'text'); por eso el presupuesto de tokens debe ser
    holgado o el texto final sale vacío.
    """
    key = minimax_key()
    base = os.environ.get("LLM_BASE_URL", "https://api.minimax.io/anthropic").rstrip("/")
    model = os.environ.get("LLM_MODEL", "MiniMax-M2.5")
    style = os.environ.get("LLM_API_STYLE", "auto")
    if style == "auto":
        style = "anthropic" if re.search(r"/anthropic(?:/|$)", base) else "openai"

    if style == "anthropic":
        r = post_json(
            f"{base}/v1/messages",
            {"model": model, "max_tokens": max_tokens, "system": system,
             "messages": [{"role": "user", "content": user}]},
            headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
        )
        parts = r.get("content") or []
        txt = "".join(p.get("text", "") for p in parts if p.get("type") == "text").strip()
    else:
        url = base if base.endswith("/chat/completions") else f"{base}/chat/completions"
        r = post_json(
            url,
            {"model": model, "max_tokens": max_tokens,
             "messages": [{"role": "system", "content": system},
                          {"role": "user", "content": user}]},
            headers={"Authorization": f"Bearer {key}"},
        )
        txt = (((r.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()

    if not txt:
        raise SystemExit(f"✗ Guión vacío del LLM: {json.dumps(r)[:300]}")
    return txt


# --------------------------------------------------- Instagram Graph (publicar) ----
def discover_ig_user_id(token):
    r = get(f"{GRAPH}/me?fields=user_id,username&access_token={token}")
    if r.get("user_id"):
        print(f"  cuenta IG: @{r.get('username')}  (id {r['user_id']})")
        return r["user_id"]
    raise SystemExit(f"✗ No pude leer la cuenta de IG desde el token: {r}")


def ig_user_id(token):
    return os.environ.get("IG_USER_ID") or discover_ig_user_id(token)


def wait_ready(token, container_id, tries=40, delay=3):
    """Espera a que un contenedor de media quede FINISHED (videos tardan más)."""
    for _ in range(tries):
        r = get(f"{GRAPH}/{container_id}?fields=status_code,status&access_token={token}")
        sc = r.get("status_code")
        if sc == "FINISHED":
            return True
        if sc == "ERROR":
            raise SystemExit(f"✗ Contenedor en ERROR: {r}")
        time.sleep(delay)
    return False


def publish(token, ig_id, creation_id):
    r = post(f"{GRAPH}/{ig_id}/media_publish", {"creation_id": creation_id, "access_token": token})
    if "id" not in r:
        raise SystemExit(f"✗ Error al publicar: {r}")
    return r["id"]
