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
import random
import datetime
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


def post_json(url, obj, headers=None, timeout=120):
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    return _req(url, data=json.dumps(obj).encode(), headers=h, method="POST", timeout=timeout)


def download(url, dest, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": "sorpresas-worker"})
    with urllib.request.urlopen(req, timeout=timeout) as r, open(dest, "wb") as f:
        f.write(r.read())
    return dest


def upload_catbox(filepath, timeout=180):
    """Sube un archivo a catbox.moe (host público estable) y devuelve la URL pública.

    Usa os.system (no subprocess) para evitar el deadlock de fork de Python que
    ocurre al forkar tras muchas conexiones SSL de urllib (mismo motivo que debian()).
    """
    prefix = os.environ.get("PREFIX", "/data/data/com.termux/files/usr")
    out = os.path.join(prefix, "tmp", "_catbox.out")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = (f"curl -s --max-time {timeout} -F reqtype=fileupload "
           f"-F 'fileToUpload=@{filepath}' https://catbox.moe/user/api.php > '{out}' 2>/dev/null")
    os.system(cmd)
    url = ""
    try:
        url = open(out, encoding="utf-8", errors="replace").read().strip()
    except Exception:
        pass
    if url.startswith("https://"):
        return url
    raise SystemExit(f"✗ catbox falló: {url[:120]}")


# ------------------------------------------------------------- endpoints web ----
def fetch_reel(categoria=None, count=None, fallback=True):
    q = []
    if categoria:
        q.append(f"categoria={categoria}")
    if count:
        q.append(f"count={count}")
    url = f"{SITE}/api/reel" + ("?" + "&".join(q) if q else "")
    print(f"→ {url}")
    r = get(url)
    if "error" in r or not r.get("imageUrls"):
        if categoria and fallback:  # la categoría (de ocasión) no tiene productos → aleatoria
            print(f"  ⚠ '{categoria}' sin productos; uso categoría aleatoria")
            return fetch_reel(None, count, fallback=False)
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
def minimax_image(prompt, width=1080, height=1920, n=1, optimizer=True, tries=3):
    """Genera imagen(es) con MiniMax image-01. Devuelve lista de URLs.

    Reintenta: MiniMax a veces responde status_code=0 pero sin imágenes (error
    transitorio o moderación de un prompt puntual).
    """
    key = minimax_key()
    last = None
    for _ in range(max(1, tries)):
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
            timeout=70,
        )
        last = r
        urls = (r.get("data") or {}).get("image_urls") or []
        if urls:
            return urls
    raise SystemExit(f"✗ MiniMax imagen sin resultado: {(last or {}).get('base_resp')}")


def minimax_tts(text, voice="Spanish_SereneWoman", model="speech-02-hd", subtitles=False, speed=0.9):
    """Voz en off con MiniMax t2a_v2. `speed` < 1 = más pausada (1 = normal).

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
            "voice_setting": {"voice_id": voice, "speed": speed, "vol": 1, "pitch": 0},
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


# Regla de idioma IRROMPIBLE para todo el texto público (no aplica a prompts de imagen).
SPANISH_RULE = (
    "\n\nREGLA IRROMPIBLE: TODO el texto debe ir en ESPAÑOL (Colombia). Está PROHIBIDO "
    "escribir oraciones en inglés u otro idioma. Los nombres propios de producto pueden "
    "quedar como están, pero ninguna frase puede estar en otro idioma."
)
_ES_WORDS = ("que", "de", "la", "el", "los", "las", "una", "para", "con", "por", "su", "tu",
             "del", "al", "como", "pero", "muy", "ya", "esto", "esta", "cada", "en", "lo", "te")
_EN_WORDS = ("the", "and", "of", "with", "your", "you", "this", "that", "for", "are", "our",
             "from", "will", "would", "their", "there", "about", "more", "what", "when")


def looks_spanish(text):
    """Rechaza solo si el INGLÉS claramente domina (tolera nombres de producto en inglés)."""
    t = " " + (text or "").lower() + " "
    es = sum(t.count(f" {w} ") for w in _ES_WORDS)
    en = sum(t.count(f" {w} ") for w in _EN_WORDS)
    return not (en >= 3 and en > es)


def minimax_text(system, user, max_tokens=2000, spanish_only=True):
    """Genera texto con el LLM del proyecto (MiniMax, estilo anthropic u openai).

    Con spanish_only=True (default) impone español: agrega la regla al system y, si
    el texto sale en otro idioma, lo RECHAZA y regenera (hasta 4 intentos). Los
    prompts de imagen (en inglés) deben pasar spanish_only=False.

    Nota: MiniMax-M3 es *thinking*; el presupuesto de tokens debe ser holgado o el
    texto final sale vacío.
    """
    key = minimax_key()
    base = os.environ.get("LLM_BASE_URL", "https://api.minimax.io/anthropic").rstrip("/")
    model = os.environ.get("LLM_MODEL", "MiniMax-M2.5")
    style = os.environ.get("LLM_API_STYLE", "auto")
    if style == "auto":
        style = "anthropic" if re.search(r"/anthropic(?:/|$)", base) else "openai"
    sys_prompt = system + SPANISH_RULE if spanish_only else system

    for _intento in range(4):
        if style == "anthropic":
            r = post_json(
                f"{base}/v1/messages",
                {"model": model, "max_tokens": max_tokens, "system": sys_prompt,
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
                 "messages": [{"role": "system", "content": sys_prompt},
                              {"role": "user", "content": user}]},
                headers={"Authorization": f"Bearer {key}"},
            )
            txt = (((r.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()

        if not txt:
            raise SystemExit(f"✗ Guión vacío del LLM: {json.dumps(r)[:300]}")
        if not spanish_only or looks_spanish(txt):
            return txt
        # salió en otro idioma: se rechaza y se reintenta

    raise SystemExit("✗ El texto no quedó en español tras varios intentos (rechazado).")


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


def _container(token, ig_id, data):
    data = {**data, "access_token": token}
    r = post(f"{GRAPH}/{ig_id}/media", data)
    if "id" not in r:
        raise SystemExit(f"✗ Error creando contenedor: {r}")
    return r["id"]


# Primer comentario automático (hashtags extra para descubrimiento, caption limpio).
# Se activa con IG_FIRST_COMMENT=1 y requiere el scope de comentarios.
# Varios sets que ROTAMOS para no repetir siempre los mismos hashtags (anti-shadowban).
HASHTAG_SETS = [
    "#regalosbogota #sorpresasbogota #domiciliosbogota #detallesconamor #anchetasbogota",
    "#regalosadomiciliobogota #desayunossorpresa #floresbogota #regalosoriginales #bogota",
    "#sorpresasadomicilio #detallesbogota #regalospersonalizados #ideasderegalo #bogotacolombia",
    "#regalosconamor #sorpresasenbogota #regalosespeciales #domiciliosbogota #regalar",
    "#regalosbogota #anchetasbogota #floresadomicilio #detallesespeciales #sorpresas",
]


# Banco vivo de hashtags: refresh_hashtags.py lo reescribe semanalmente sesgado a la
# ocasión activa (Día del Padre, Navidad…). Si no existe, caemos a HASHTAG_SETS.
HASHTAGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hashtags.json")


def hashtag_set():
    """Un set de hashtags para el primer comentario. Rota entre los sets de
    hashtags.json (frescos, por ocasión). Si el archivo falta o está vacío,
    usa los sets estáticos HASHTAG_SETS."""
    try:
        sets = (json.load(open(HASHTAGS_FILE, encoding="utf-8")) or {}).get("sets") or []
        sets = [s for s in sets if isinstance(s, str) and "#" in s]
        if sets:
            return random.choice(sets)
    except Exception:
        pass
    return random.choice(HASHTAG_SETS)


def _after_publish(media_id):
    if (os.environ.get("IG_FIRST_COMMENT") or "").strip().lower() in ("1", "true", "yes", "on"):
        try:
            add_comment(media_id, hashtag_set())
        except Exception:
            pass
    return media_id


def loc_params():
    """{'location_id': ...} si IG_LOCATION_ID está seteado (geo-tag), si no {}."""
    lid = (os.environ.get("IG_LOCATION_ID") or "").strip()
    return {"location_id": lid} if lid else {}


# Helpers de alto nivel (el caller revisa guard_publish() antes de llamarlos).
def publish_single(image_url, caption=""):
    token = ig_token(); ig_id = ig_user_id(token)
    cid = _container(token, ig_id, {"image_url": image_url, "caption": caption, **loc_params()})
    wait_ready(token, cid)
    return _after_publish(publish(token, ig_id, cid))


def publish_carousel(image_urls, caption=""):
    token = ig_token(); ig_id = ig_user_id(token)
    children = [_container(token, ig_id, {"image_url": u, "is_carousel_item": "true"}) for u in image_urls]
    car = _container(token, ig_id, {"media_type": "CAROUSEL", "children": ",".join(children),
                                    "caption": caption, **loc_params()})
    wait_ready(token, car)
    return _after_publish(publish(token, ig_id, car))


def publish_story(image_url):
    token = ig_token(); ig_id = ig_user_id(token)
    cid = _container(token, ig_id, {"image_url": image_url, "media_type": "STORIES"})
    wait_ready(token, cid)
    return _after_publish(publish(token, ig_id, cid))


# ----------------------------------------------- contenido emocional (texto) ----
def minimax_frases(tema, n=5, max_words=18):
    """Genera `n` frases cortas y compartibles sobre `tema`. Devuelve lista."""
    system = (
        "Eres redactor de Sorpresas, regalos a domicilio en Bogotá. Escribes frases cortas, "
        "bonitas, originales y muy compartibles sobre el amor y los detalles. RESPONDE SIEMPRE "
        "EN ESPAÑOL neutro-colombiano, NUNCA en inglés. Devuelve SOLO las frases, una por línea, "
        f"sin numerarlas, sin comillas, sin emojis, sin hashtags. Cada frase máximo {max_words} palabras."
    )
    txt = minimax_text(system, f"Dame {n} frases distintas sobre: {tema}.")
    out = []
    for line in txt.splitlines():
        s = line.strip().lstrip("-•").strip()
        while s and (s[0].isdigit() or s[0] in ".)"):
            s = s[1:].strip()
        if s:
            out.append(s)
    return out[:n]


def minimax_poema(tema, lineas=6):
    """Genera un poema breve sobre `tema`."""
    system = (
        "Eres poeta de Sorpresas (regalos a domicilio en Bogotá). Escribes poemas breves, "
        "tiernos y compartibles. RESPONDE SIEMPRE EN ESPAÑOL neutro-colombiano, NUNCA en inglés. "
        "Devuelve SOLO el poema: sin título, sin comillas, sin emojis, sin hashtags."
    )
    return minimax_text(system, f"Escribe un poema breve de unas {lineas} líneas sobre {tema}, cálido y para dedicar.")


def minimax_guia(tema, n=5):
    """Genera una guía de valor: devuelve (titulo, [tips]). Cada tip es 'Mini-título: detalle'."""
    system = (
        "Eres experto en regalos de Sorpresas (Bogotá). RESPONDE EN ESPAÑOL, conciso. "
        "Primera línea: un título corto y atractivo (sin numerar, sin emojis). Luego consejos "
        "breves, uno por línea, con el formato 'Mini-título: detalle'. Sin numerar, sin comillas."
    )
    # max_tokens acotado: con 2000 el modelo de thinking se eterniza en este prompt.
    txt = minimax_text(system, f"Tema: {tema}. Dame el título y {n} consejos.", max_tokens=1200)
    cleaned = []
    for line in txt.splitlines():
        s = line.strip().lstrip("-•").strip()
        while s and (s[0].isdigit() or s[0] in ".)"):
            s = s[1:].strip()
        if s:
            cleaned.append(s)
    titulo = cleaned[0] if cleaned else tema.capitalize()
    return titulo, cleaned[1:n + 1]


def minimax_scene_prompts(context, n=4):
    """Genera `n` descripciones de escena (inglés) para image-01 a partir de un contexto.

    Así los fondos de los reels se generan dinámicamente y acordes al contenido,
    en vez de salir de una lista fija.
    """
    system = (
        "You are an art director. You write SHORT English image prompts for a 3D Pixar-style "
        "romantic image generator (warm, cream burgundy and gold palette, floating hearts and "
        "rose petals). Each prompt describes ONE concrete, wholesome scene with characters or a "
        "cozy setting. STRICTLY avoid lit candles, fire, flames, text, logos and brands. "
        "Return ONLY the prompts, one per line, no numbering, no quotes."
    )
    txt = minimax_text(system, f"Write {n} distinct visual scenes that fit this:\n{context}", spanish_only=False)
    out = []
    for line in txt.splitlines():
        s = line.strip().lstrip("-•").strip()
        while s and (s[0].isdigit() or s[0] in ".)"):
            s = s[1:].strip()
        if len(s) > 8:
            out.append(s)
    return out[:n]


# ============================================================================
# API AVANZADA — requiere agregar scopes al token de Instagram (aún no activa):
#   comentarios → instagram_business_manage_comments
#   mensajes/DM → instagram_business_manage_messages
#   analíticas  → instagram_business_manage_insights
# ============================================================================

# --- Comentarios ---
def add_comment(media_id, text):
    """Comenta en una media propia (ej. primer comentario con hashtags extra)."""
    token = ig_token()
    return post(f"{GRAPH}/{media_id}/comments", {"message": text, "access_token": token})


def get_comments(media_id, limit=50):
    token = ig_token()
    return get(f"{GRAPH}/{media_id}/comments",
               {"fields": "id,text,username,timestamp", "limit": limit, "access_token": token})


def reply_comment(comment_id, text):
    token = ig_token()
    return post(f"{GRAPH}/{comment_id}/replies", {"message": text, "access_token": token})


def hide_comment(comment_id, hide=True):
    token = ig_token()
    return post(f"{GRAPH}/{comment_id}", {"hide": "true" if hide else "false", "access_token": token})


# --- Menciones / etiquetas (UGC) ---
def get_tagged_media(limit=25):
    """Media donde etiquetaron a la cuenta (para repostear UGC)."""
    token = ig_token()
    ig = ig_user_id(token)
    return get(f"{GRAPH}/{ig}/tags",
               {"fields": "id,caption,media_type,media_url,permalink,username,timestamp",
                "limit": limit, "access_token": token})


# --- Mensajes / DMs (incluye respuestas a Stories) ---
def get_conversations(limit=20):
    token = ig_token()
    ig = ig_user_id(token)
    return get(f"{GRAPH}/{ig}/conversations",
               {"platform": "instagram", "fields": "id,updated_time", "limit": limit, "access_token": token})


def get_messages(conversation_id, limit=20):
    token = ig_token()
    return get(f"{GRAPH}/{conversation_id}",
               {"fields": f"messages.limit({limit}){{id,from,message,created_time}}", "access_token": token})


def send_dm(recipient_id, text):
    """Envía un DM (también sirve para responder reacciones/respuestas de Stories)."""
    token = ig_token()
    ig = ig_user_id(token)
    return post_json(f"{GRAPH}/{ig}/messages",
                     {"recipient": {"id": recipient_id}, "message": {"text": text}},
                     headers={"Authorization": f"Bearer {token}"})


def send_private_reply(comment_id, text):
    """Abre un DM directo con quien comentó (private reply a un comentario)."""
    token = ig_token()
    ig = ig_user_id(token)
    return post_json(f"{GRAPH}/{ig}/messages",
                     {"recipient": {"comment_id": comment_id}, "message": {"text": text}},
                     headers={"Authorization": f"Bearer {token}"})


# --- Analíticas / insights ---
def account_insights(metrics="reach,follower_count,profile_views", period="day"):
    token = ig_token()
    ig = ig_user_id(token)
    return get(f"{GRAPH}/{ig}/insights",
               {"metric": metrics, "period": period, "access_token": token})


def media_insights(media_id, metrics="reach,likes,comments,saved,shares"):
    token = ig_token()
    return get(f"{GRAPH}/{media_id}/insights", {"metric": metrics, "access_token": token})


def my_media(limit=25):
    """Lista las publicaciones propias recientes (para insights/auto-comentarios)."""
    token = ig_token()
    ig = ig_user_id(token)
    return get(f"{GRAPH}/{ig}/media",
               {"fields": "id,caption,media_type,timestamp,permalink", "limit": limit, "access_token": token})


# --- Lista de contactos / leads (data de demanda propia) ---
LEADS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "leads.jsonl")


def log_lead(fuente, quien, texto):
    """Registra un interesado en TU lista (para re-contactar al activar ventas)."""
    rec = {
        "fecha": datetime.datetime.now().isoformat(timespec="minutes"),
        "fuente": fuente,           # "comentario" | "dm"
        "quien": quien or "?",      # username o id
        "texto": (texto or "")[:200],
    }
    try:
        with open(LEADS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        pass


def notify(message, title="Sorpresas"):
    """Manda una alerta por email (SMTP de Gmail). Si no hay credenciales, loguea.

    Necesita en el .env:  EMAIL_SMTP (gmail) · PASSWORD_SMTP (contraseña de aplicación)
    Opcional ALERT_EMAIL (destino; por defecto el mismo EMAIL_SMTP).
    Usa sockets (smtplib), sin fork ni dependencias nativas.
    """
    user = os.environ.get("EMAIL_SMTP") or os.environ.get("SMTP_USER")
    pwd = (os.environ.get("PASSWORD_SMTP") or os.environ.get("SMTP_PASS") or "").replace(" ", "")
    to = os.environ.get("ALERT_EMAIL") or user
    if not (user and pwd and to):
        print(f"[notify] {title}: {message}")
        return False
    try:
        import smtplib
        from email.mime.text import MIMEText
        msg = MIMEText(message, "plain", "utf-8")
        msg["Subject"] = f"[Sorpresas] {title}"
        msg["From"] = user
        msg["To"] = to
        s = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
        s.starttls()
        s.login(user, pwd)
        s.sendmail(user, [to], msg.as_string())
        s.quit()
        return True
    except Exception as e:
        print(f"[notify] email falló: {e}")
        return False


DM_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".dm_log.json")


def can_dm(user_key, hours=24):
    """True si NO le mandamos un DM automático a `user_key` en las últimas `hours`,
    y registra el envío. Respeta el tope anti-spam de IG (1 DM/usuario/24h)."""
    if not user_key:
        return False
    user_key = str(user_key)
    try:
        log = json.load(open(DM_LOG_FILE))
    except Exception:
        log = {}
    now = datetime.datetime.now()
    last = log.get(user_key)
    if last:
        try:
            if (now - datetime.datetime.fromisoformat(last)).total_seconds() < hours * 3600:
                return False
        except Exception:
            pass
    log[user_key] = now.isoformat(timespec="minutes")
    try:
        json.dump(log, open(DM_LOG_FILE, "w"))
    except Exception:
        pass
    return True
