#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-content.py — Sorpresas (regalos a domicilio en Bogotá)

Genera contenido editorial humanizado y lo agrega a data/blog.json (posts: listas
de ideas de regalo, CON imagen generada) o data/guias.json (guías evergreen).
Pensado para correr 2 veces por semana vía cron y, con --commit, hace git add +
commit + push (dispara el deploy en Vercel).

Por qué Python: en el celular (Termux/Android) `sharp` no compila (node-gyp pide el
NDK de Android). Pillow convierte a WebP sin compilar nada (y si no está, guarda el
JPG y Next lo re-optimiza). Solo depende de la stdlib + Pillow (opcional).

POSTS: listas "N regalos para…" sesgadas a la OCASIÓN activa (Día del Padre, San
Valentín, Navidad…) o a un tema evergreen. Referencian PRODUCTOS y CATEGORÍAS
reales del catálogo, y generan una imagen fotorrealista (MiniMax image-01) con
personas reales recibiendo/entregando el regalo -> public/images/blog/<slug>.

GUÍAS: artículos evergreen de prosa (usan imagen de categoría, sin generar imagen).

Uso:
  python scripts/generate-content.py                # auto (rota post/guía)
  python scripts/generate-content.py --type=post    # forzar lista de regalos
  python scripts/generate-content.py --type=guia    # forzar guía
  python scripts/generate-content.py --dry-run      # genera pero NO escribe (ni imagen)
  python scripts/generate-content.py --commit       # escribe + git push
  python scripts/generate-content.py --no-pull      # no hace git pull al inicio

Variables (.env.local o entorno): LLM_API_KEY, LLM_BASE_URL
  (default https://api.minimax.io/anthropic), LLM_MODEL (default MiniMax-M3),
  LLM_API_STYLE (auto), LLM_MAX_TOKENS.
"""

import io
import json
import os
import re
import sys
import time
import subprocess
import unicodedata
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG_FILE = os.path.join(ROOT, "data", "blog.json")
GUIAS_FILE = os.path.join(ROOT, "data", "guias.json")
CATEGORIAS_FILE = os.path.join(ROOT, "data", "categorias.json")
PRODUCTOS_FILE = os.path.join(ROOT, "data", "productos.json")
CONFIG_FILE = os.path.join(ROOT, "data", "config.json")
HUMANIZE_FILE = os.path.join(ROOT, "prompts", "humanize-text.md")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def _s(x):
    return "" if x is None else str(x)


# ───────────────────────────── entorno ─────────────────────────────
def load_env():
    for fn in (".env.local", ".env"):
        p = os.path.join(ROOT, fn)
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$", line)
                if m and m.group(1) not in os.environ:
                    v = m.group(2)
                    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                        v = v[1:-1]
                    os.environ[m.group(1)] = v


def parse_args(argv):
    args = {"type": "auto", "dry_run": False, "commit": False, "no_pull": False}
    for a in argv[1:]:
        if a == "--dry-run":
            args["dry_run"] = True
        elif a == "--commit":
            args["commit"] = True
        elif a == "--no-pull":
            args["no_pull"] = True
        elif a.startswith("--type="):
            args["type"] = a[7:]
    return args


# ──────────────────────────── utilidades ───────────────────────────
def slugify(text, max_len=65):
    base = unicodedata.normalize("NFD", _s(text).lower())
    base = "".join(c for c in base if unicodedata.category(c) != "Mn")
    base = re.sub(r"[^a-z0-9\s-]", "", base).strip()
    base = re.sub(r"\s+", "-", base)
    base = re.sub(r"-+", "-", base)
    words = [w for w in base.split("-") if w]
    slug = ""
    for w in words:
        if slug and len(slug) + 1 + len(w) > max_len:
            break
        slug = f"{slug}-{w}" if slug else w
    return slug or "articulo"


def hoy_bogota():
    return (datetime.now(timezone.utc) - timedelta(hours=5)).strftime("%Y-%m-%d")


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        if default is not None:
            return default
        raise


def read_text(path, default=""):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except Exception:
        return default


# Validación de idioma: acepta SOLO español. Rechaza chino/otros alfabetos, portugués
# e inglés dominante. Tolera nombres de producto en inglés sueltos. No mira imagePrompt.
_ES_WORDS = ("que", "de", "la", "el", "los", "las", "una", "para", "con", "por", "su", "tu",
             "del", "al", "como", "pero", "muy", "ya", "esto", "esta", "cada", "en", "lo", "te")
_EN_WORDS = ("the", "and", "of", "with", "your", "you", "this", "that", "for", "are", "our",
             "from", "will", "would", "their", "there", "about", "more", "what", "when")
_PT_WORDS = ("uma", "muito", "melhor", "melhores", "obrigado", "isso", "fazer", "voce",
             "voces", "tambem", "entao", "nao", "seu", "sua")
_ALLOWED = set("áéíóúüñÁÉÍÓÚÜÑºª")


def _foreign_letters(text):
    """True si hay letras fuera del alfabeto español (chino, cirílico, ç, ã, ê…)."""
    return any(ch.isalpha() and ord(ch) > 127 and ch not in _ALLOWED for ch in (text or ""))


def looks_spanish(text):
    if _foreign_letters(text):
        return False  # chino, japonés, cirílico, o portugués/otro con ç ã õ ê…
    low = " " + (text or "").lower() + " "
    if any(f" {w} " in low for w in _PT_WORDS):
        return False  # portugués
    es = sum(low.count(f" {w} ") for w in _ES_WORDS)
    en = sum(low.count(f" {w} ") for w in _EN_WORDS)
    return not (en >= 3 and en > es)  # inglés dominante


# ──────────────────── ocasiones de regalo (Colombia) ───────────────
def nth_weekday(year, month, weekday, n):
    """n-ésima ocurrencia de weekday (0=Lun..6=Dom) en el mes. Devuelve date."""
    from datetime import date
    d = date(year, month, 1)
    offset = (weekday - d.weekday()) % 7
    return date(year, month, 1) + timedelta(days=offset + (n - 1) * 7)


# (occ, días de rampa antes, fecha(año)->date). weekday: 0=Lun..6=Dom
def _ocasiones():
    from datetime import date
    return [
        ("san-valentin", 14, lambda y: date(y, 2, 14)),
        ("dia-madre", 18, lambda y: nth_weekday(y, 5, 6, 2)),    # 2º domingo de mayo
        ("dia-padre", 18, lambda y: nth_weekday(y, 6, 6, 3)),    # 3er domingo de junio
        ("amor-amistad", 18, lambda y: nth_weekday(y, 9, 5, 3)),  # 3er sábado de septiembre
        ("navidad", 24, lambda y: date(y, 12, 25)),
    ]


def ocasion_activa(fecha_iso):
    from datetime import date
    today = date.fromisoformat(fecha_iso)
    best = None
    for occ, ramp, fechaf in _ocasiones():
        for y in (today.year, today.year + 1):
            d = fechaf(y)
            start = d - timedelta(days=ramp)
            if start <= today <= d and (best is None or d < best[1]):
                best = (occ, d)
    return best[0] if best else None


# ──────────────────────── HTTP (stdlib) ────────────────────────────
def http_post_json(url, headers, body, timeout=180):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return getattr(r, "status", 200), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        try:
            txt = e.read().decode("utf-8", "replace")
        except Exception:
            txt = str(e)
        return e.code, txt


# ────────────────────────── LLM (MiniMax) ──────────────────────────
def resolve_api_style(style, base_url):
    s = (style or "auto").lower()
    if s in ("openai", "anthropic"):
        return s
    return "anthropic" if re.search(r"/anthropic(/|$)", base_url, re.I) else "openai"


def extract_json(text):
    t = text.strip()
    m = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```\s*$", t)
    if m:
        t = m.group(1).strip()
    try:
        return json.loads(t)
    except Exception:
        start = t.find("{")
        end = t.rfind("}")
        if start != -1 and end > start:
            return json.loads(t[start : end + 1])
        raise ValueError("No se encontró JSON válido en la respuesta del modelo")


def call_llm(system, user, base_url, api_key, model, api_style, max_tokens=16000, max_retries=4):
    base = base_url.rstrip("/")
    last_err = None
    tokens = max_tokens
    for attempt in range(1, max_retries + 1):
        try:
            if api_style == "anthropic":
                url = f"{base}/v1/messages"
                headers = {
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                }
                body = {
                    "model": model,
                    "max_tokens": tokens,
                    "temperature": 0.8,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                }
            else:
                url = f"{base}/chat/completions"
                headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
                body = {
                    "model": model,
                    "temperature": 0.8,
                    "max_tokens": tokens,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                }
            status, text = http_post_json(url, headers, body, timeout=300)
            if status < 200 or status >= 300:
                last_err = RuntimeError(f"HTTP {status}: {text[:300]}")
                if 400 <= status < 500 and status != 429:
                    raise last_err
            else:
                data = json.loads(text)
                choices = data.get("choices") or [{}]
                stop = data.get("stop_reason") or choices[0].get("finish_reason")
                if api_style == "anthropic":
                    content = "".join(
                        b.get("text", "")
                        for b in (data.get("content") or [])
                        if isinstance(b, dict) and b.get("type") == "text"
                    )
                else:
                    content = (choices[0].get("message") or {}).get("content")
                if stop in ("max_tokens", "length") and tokens < 32000:
                    tokens = min(tokens * 2, 32000)
                    continue
                if not content:
                    raise RuntimeError("Respuesta vacía del modelo")
                return content
        except Exception as e:  # noqa: BLE001
            last_err = e
        if attempt < max_retries:
            time.sleep(0.8 * 2 ** (attempt - 1))
    raise last_err


# ──────────────────── imagen (MiniMax image-01) ────────────────────
# Endpoint NATIVO (PAYG), no el de /anthropic. Estilo Pixar 3D (igual que el
# contenido de Instagram), encuadre horizontal para el hero del blog.
IMG_BASE = "https://api.minimax.io"
IMG_STYLE = (
    "3D Pixar-style animated render, rounded friendly characters, exaggerated joyful "
    "expressions, expressive big eyes, vibrant inviting colors, smooth 3D shading with soft "
    "light bloom, warm cinematic lighting, dynamic playful energy, cream burgundy and gold "
    "palette, a character happily receiving or giving a surprise gift (flowers, breakfast box, "
    "balloons, chocolate-covered strawberries) in a cozy Bogotá home, horizontal 16:10 "
    "composition, ultra detailed, no text, no letters, no words, no watermark, no logo"
)


def generate_imagen(slug, image_prompt, api_key, out_dir):
    if not image_prompt:
        return None
    try:
        status, text = http_post_json(
            f"{IMG_BASE}/v1/image_generation",
            {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            {
                "model": "image-01",
                "prompt": f"{image_prompt}. {IMG_STYLE}",
                "width": 1536,
                "height": 960,
                "response_format": "url",
                "n": 1,
                "prompt_optimizer": True,
            },
            timeout=180,
        )
        j = json.loads(text)
        base_resp = j.get("base_resp") or {}
        urls = ((j.get("data") or {}).get("image_urls")) or []
        if base_resp.get("status_code") != 0 or not urls:
            log("  ⚠ imagen:", json.dumps(base_resp or j, ensure_ascii=False)[:200])
            return None

        req = urllib.request.Request(urls[0], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as r:
            buf = r.read()

        os.makedirs(out_dir, exist_ok=True)
        # WebP si hay Pillow; si no, guarda el JPG original (Next lo re-optimiza al servir).
        ext = "jpg"
        out = buf
        try:
            from PIL import Image  # type: ignore

            im = Image.open(io.BytesIO(buf)).convert("RGB")
            bio = io.BytesIO()
            im.save(bio, format="WEBP", quality=84, method=6)
            out = bio.getvalue()
            ext = "webp"
        except Exception:
            pass  # sin Pillow: se guarda el original

        file = os.path.join(out_dir, f"{slug}.{ext}")
        with open(file, "wb") as f:
            f.write(out)
        log(f"  🎨 imagen: /images/blog/{slug}.{ext} ({len(out) // 1024} KB)")
        return {"rel": f"/images/blog/{slug}.{ext}", "file": file}
    except Exception as e:  # noqa: BLE001
        log("  ⚠ imagen falló (continúo sin imagen):", str(e).split("\n")[0])
        return None


# ─────────────────────────── catálogo / menú ───────────────────────
def product_menu(productos, categorias, max_n=18):
    cat_set = set(categorias)

    def ok(p):
        return p.get("visible") is not False and (p.get("stock") is None or p.get("stock", 0) > 0)

    pool = [p for p in productos if ok(p) and p.get("categoria") in cat_set]
    pool.sort(key=lambda p: 0 if p.get("popular") else 1)
    if len(pool) < 8:  # rellena con populares de cualquier categoría
        pool += [p for p in productos if p.get("popular") and ok(p) and p.get("categoria") not in cat_set]
    return [
        {"slug": p["slug"], "nombre": p["nombre"], "categoria": p.get("categoria"), "precio": p.get("precio")}
        for p in pool[:max_n]
    ]


# ───────────────────────────── prompts ─────────────────────────────
def reglas_humanas(humanize_text):
    es = "\n".join(
        [
            "## REGLAS DE ESCRITURA HUMANA (OBLIGATORIAS, máxima prioridad)",
            "⚠️ REGLA IRROMPIBLE: TODO el texto va en ESPAÑOL (Colombia). PROHIBIDO escribir oraciones en inglés, chino, portugués u otro idioma. Los nombres propios de producto en inglés SÍ pueden quedar como están (son intencionales). Si una oración sale en otro idioma, la respuesta es INVÁLIDA.",
            "El texto se publica para posicionar en Google y debe leerse 100% humano, nunca como IA.",
            "- Frases cortas (10-20 palabras), voz activa, vocabulario cotidiano y concreto.",
            "- Varía el largo de las frases. Ritmo natural, no mecánico.",
            "- PROHIBIDO el guion largo (—) y el punto y coma (;). Usa punto o coma.",
            "- PROHIBIDOS clichés de IA en español: 'En resumen', 'En conclusión', 'En definitiva',",
            "  'Es importante destacar/mencionar', 'cabe resaltar', 'cabe destacar', 'sin lugar a dudas',",
            "  'en la era digital', 'en el mundo de', 'sumérgete en', 'descubre el mundo de', 'eleva tu',",
            "  'lleva al siguiente nivel', 'no es solo... es', 'ya sea... o', 'cuando se trata de', 'a la hora de'.",
            "- No empieces oraciones ni ítems con conectores tipo 'Además', 'Asimismo', 'Sin embargo',",
            "  'Por lo tanto', 'Por ende', 'Igualmente', 'De igual manera'.",
            "- Nada de metáforas de viajes, música o paisajes. Nada de emojis. Sin mayúsculas para enfatizar.",
            "- No te refieras a ti mismo ni a que eres una IA. No te disculpes. Afirma con seguridad.",
            "- Español de Colombia (Bogotá), natural y cercano.",
        ]
    )
    ht = (humanize_text or "").strip()
    if ht:
        return f"{es}\n\n--- Guía completa (inglés, aplica por analogía) ---\n{ht}"
    return es


def system_base(store, humanize_text):
    return "\n".join(
        [
            f'Eres el editor del blog de "{store["nombre"]}", una tienda de regalos y sorpresas a domicilio en Bogotá, Colombia.',
            "Pedidos por WhatsApp, con entrega el mismo día. Vendes: desayunos sorpresa, anchetas, ramos de flores,",
            "fresas con chocolate, cajas mágicas con globos, peluches, chocolates y detalles personalizados.",
            "Escribes contenido editorial original, útil y optimizado para SEO, que ayuda a posicionar el sitio y a que el lector pida su regalo.",
            "",
            reglas_humanas(humanize_text),
            "",
            "## SEO (obligatorio)",
            "- metaTitle: 50-60 caracteres, con la keyword principal y mención a Bogotá cuando aplique.",
            "- metaDescription: 140-155 caracteres, con keyword y un llamado a la acción.",
            "- El h1 debe contener la keyword principal de forma natural.",
            "- Referencia SIEMPRE productos y categorías REALES del sitio (enlazado interno).",
            "- Las FAQ responden dudas reales de compra: entregas el mismo día, cobertura en Bogotá, cómo pedir por WhatsApp, personalización.",
            "",
            "Devuelves SOLO un objeto JSON válido, sin texto extra ni fences de markdown.",
        ]
    )


POST_JSON_SHAPE = """{
  "metaTitle": "string 50-60 chars con keyword + Bogotá",
  "h1": "titular atractivo tipo 'N regalos para…' con keyword",
  "metaDescription": "string 140-155 chars con keyword y CTA",
  "excerpt": "1 frase gancho de 120-160 chars",
  "etiqueta": "etiqueta corta (ej: Para papá, Aniversario, Cumpleaños, Desayunos)",
  "heroProductSlug": "un slug EXACTO de la lista de productos (el regalo principal del post)",
  "lead": "2 a 3 frases que abren el post con calidez y contexto",
  "intro": ["párrafo 1", "párrafo 2", "párrafo 3"],
  "items": [
    { "titulo": "subtítulo con gancho", "texto": "4 a 6 frases con detalle real: qué incluye el regalo, a quién le sirve, para qué momento u ocasión, y por qué emociona", "productoSlug": "slug EXACTO de la lista", "ctaCategoria": "slug de categoría real", "ctaTexto": "Ver desayunos" }
  ],
  "secciones": [
    { "titulo": "subtítulo de consejo o contexto (ej: 'Cómo elegir el detalle correcto', 'Entrega el mismo día en Bogotá')", "parrafos": ["párrafo de fondo útil con keywords naturales", "segundo párrafo"] }
  ],
  "cierre": ["párrafo de cierre 1", "párrafo de cierre 2 invitando a pedir por WhatsApp / a domicilio el mismo día en Bogotá"],
  "faq": [ { "pregunta": "...", "respuesta": "respuesta de 2-3 frases, concreta y útil" } ],
  "categoriasRelacionadas": ["slug", "slug", "slug"],
  "imagePrompt": "descripción EN INGLÉS de una escena estilo PIXAR 3D animado (personajes caricaturescos, NO fotorrealista) recibiendo o entregando el regalo del tema (ej: una mujer feliz recibe un desayuno sorpresa en la puerta; una pareja con un ramo de rosas; un papá abriendo una ancheta con su familia); expresiones alegres, hogar cálido de Bogotá, sin texto en la imagen"
}"""

GUIA_JSON_SHAPE = """{
  "title": "string SEO 50-60 chars con keyword",
  "h1": "título con keyword",
  "metaDescription": "string 140-155 chars con keyword y CTA",
  "excerpt": "1 frase gancho de 120-160 chars",
  "imagenCategoria": "un slug de la lista",
  "categoriasRelacionadas": ["slug", "slug", "slug"],
  "lead": "1 a 2 frases que abren la guía",
  "secciones": [ { "titulo": "subtítulo claro", "parrafos": ["párrafo 1", "párrafo 2"] } ],
  "faq": [ { "pregunta": "...", "respuesta": "..." } ]
}"""


def prompt_post(store, cats, theme, menu, fecha, humanize_text):
    cat_list = ", ".join(f'{c["slug"]} ({c["nombre"]})' for c in cats)
    prod_list = "\n".join(f'- {p["slug"]} | {p["nombre"]} | {p["categoria"]} | ${p["precio"]}' for p in menu)
    system = system_base(store, humanize_text)
    user = "\n".join(
        [
            f"Hoy es {fecha}. Escribe un POST tipo lista de ideas de regalo sobre: {theme['tema']}.",
            "",
            "PRODUCTOS REALES del catálogo (usa SOLO estos slugs en 'productoSlug' y 'heroProductSlug', cópialos exactos):",
            prod_list,
            "",
            f"Categorías reales del sitio (usa SOLO estos slugs en 'ctaCategoria' y 'categoriasRelacionadas'): {cat_list}",
            "",
            "Devuelve un JSON con EXACTAMENTE esta forma:",
            POST_JSON_SHAPE,
            "",
            "Requisitos: intro de 3 párrafos; 5 items (texto de 4 a 6 frases cada uno, con productoSlug DISTINTO y real de la lista y un ctaCategoria real);",
            "2 a 3 secciones de consejo/contexto (prosa de fondo, 2 párrafos cada una); cierre de 2 párrafos; 4 a 5 faq;",
            "3 categoriasRelacionadas reales, e imagePrompt en inglés estilo Pixar. Escribe con calidez y detalle real, sin relleno ni repetir ideas. Solo JSON.",
        ]
    )
    return system, user


def prompt_guia(store, cats, brief, fecha, humanize_text):
    cat_list = ", ".join(f'{c["slug"]} ({c["nombre"]})' for c in cats)
    system = system_base(store, humanize_text)
    user = "\n".join(
        [
            f"Hoy es {fecha}. Escribe una GUÍA práctica (evergreen) sobre el siguiente tema:",
            f"TEMA: {brief['tema']}",
            f"Categoría principal sugerida: {brief['categoria']}",
            "",
            f"Categorías reales del sitio (usa SOLO estos slugs): {cat_list}",
            "",
            "Devuelve un JSON con EXACTAMENTE esta forma:",
            GUIA_JSON_SHAPE,
            "",
            "Requisitos: 4 a 5 secciones, 3 a 4 faq, 3 categoriasRelacionadas reales (la primera = imagenCategoria).",
            "Menciona tipos de regalo que vendemos y orienta a pedir por WhatsApp / a domicilio en Bogotá. Solo JSON.",
        ]
    )
    return system, user


# ─────────────────────── validación / saneo ───────────────────────
def fix_cat(slug, valid_set, fallback):
    return slug if slug in valid_set else fallback


def trim_meta(s, max_len):
    if not isinstance(s, str):
        return ""
    if len(s) <= max_len:
        return s
    cut = s[:max_len]
    sp = cut.rfind(" ")
    return (cut[:sp] if sp > max_len - 20 else cut).strip()


def dedupe_cats(arr, valid_set, first, fallback):
    out = []
    for c in [first] + (list(arr) if isinstance(arr, list) else []):
        v = fix_cat(c, valid_set, fallback)
        if v not in out:
            out.append(v)
    while len(out) < 3:
        out.append(fallback)
    return out[:4]


def unique_slug(base, existing):
    base = base or "articulo"
    slug = base
    i = 2
    while slug in existing:
        slug = f"{base}-{i}"
        i += 1
    existing.add(slug)
    return slug


def sanitize_post(obj, valid_set, prod_set, fecha, existing_slugs, fallback_cat):
    req = ["metaTitle", "h1", "metaDescription", "excerpt", "etiqueta", "lead", "intro", "items", "cierre", "faq"]
    for k in req:
        if k not in obj:
            raise ValueError(f'post: falta campo "{k}"')
    if not isinstance(obj.get("items"), list) or len(obj["items"]) < 3:
        raise ValueError("post: items < 3")
    if not isinstance(obj.get("faq"), list) or len(obj["faq"]) < 3:
        raise ValueError("post: faq < 3")

    items = []
    for it in obj["items"][:6]:
        o = {
            "titulo": _s(it.get("titulo")).strip(),
            "texto": _s(it.get("texto")).strip(),
            "ctaCategoria": fix_cat(it.get("ctaCategoria"), valid_set, fallback_cat),
            "ctaTexto": (_s(it.get("ctaTexto")) or "Ver regalos").strip()[:32],
        }
        ps = it.get("productoSlug")
        if ps and ps in prod_set:  # solo si es real; si no, la página cae a la categoría
            o["productoSlug"] = ps
        items.append(o)

    hero = obj.get("heroProductSlug") if obj.get("heroProductSlug") in prod_set else None
    if not hero:
        hero = next((i["productoSlug"] for i in items if i.get("productoSlug")), "")

    secciones = []
    for s in (obj.get("secciones") or [])[:4]:
        if s and s.get("titulo") and isinstance(s.get("parrafos"), list) and s.get("parrafos"):
            secciones.append({"titulo": _s(s.get("titulo")).strip(), "parrafos": [_s(p) for p in s["parrafos"]]})

    return {
        "slug": unique_slug(slugify(obj["h1"]), existing_slugs),
        "metaTitle": trim_meta(obj.get("metaTitle"), 60),
        "h1": _s(obj.get("h1")).strip(),
        "metaDescription": trim_meta(obj.get("metaDescription"), 158),
        "excerpt": _s(obj.get("excerpt")).strip(),
        "fecha": fecha,
        "etiqueta": _s(obj.get("etiqueta")).strip()[:24],
        "heroProductSlug": hero,
        "lead": _s(obj.get("lead")).strip(),
        "intro": [_s(x) for x in (obj.get("intro") or [])],
        "items": items,
        "secciones": secciones,
        "cierre": [_s(x) for x in (obj.get("cierre") or [])],
        "faq": [
            {"pregunta": _s(f.get("pregunta")).strip(), "respuesta": _s(f.get("respuesta")).strip()}
            for f in obj["faq"][:5]
        ],
        "categoriasRelacionadas": dedupe_cats(
            obj.get("categoriasRelacionadas"), valid_set, items[0]["ctaCategoria"] if items else fallback_cat, fallback_cat
        ),
    }


def sanitize_guia(obj, valid_set, fecha, existing_slugs, fallback_cat):
    req = ["title", "h1", "metaDescription", "excerpt", "lead", "secciones", "faq"]
    for k in req:
        if k not in obj:
            raise ValueError(f'guia: falta campo "{k}"')
    if not isinstance(obj.get("secciones"), list) or len(obj["secciones"]) < 3:
        raise ValueError("guia: secciones < 3")
    if not isinstance(obj.get("faq"), list) or len(obj["faq"]) < 3:
        raise ValueError("guia: faq < 3")

    imagen_categoria = fix_cat(obj.get("imagenCategoria"), valid_set, fallback_cat)
    return {
        "slug": unique_slug(slugify(obj.get("h1") or obj.get("title")), existing_slugs),
        "title": trim_meta(obj.get("title"), 60),
        "h1": _s(obj.get("h1")).strip(),
        "metaDescription": trim_meta(obj.get("metaDescription"), 158),
        "excerpt": _s(obj.get("excerpt")).strip(),
        "fecha": fecha,
        "imagenCategoria": imagen_categoria,
        "categoriasRelacionadas": dedupe_cats(obj.get("categoriasRelacionadas"), valid_set, imagen_categoria, fallback_cat),
        "lead": _s(obj.get("lead")).strip(),
        "secciones": [
            {"titulo": _s(s.get("titulo")).strip(), "parrafos": [_s(p) for p in (s.get("parrafos") or [])]}
            for s in obj["secciones"][:6]
        ],
        "faq": [
            {"pregunta": _s(f.get("pregunta")).strip(), "respuesta": _s(f.get("respuesta")).strip()}
            for f in obj["faq"][:5]
        ],
    }


# ─────────────────────── temas / rotación ─────────────────────────
THEMES = [
    {"occ": "san-valentin", "etiqueta": "San Valentín", "tema": "regalos para San Valentín que enamoran",
     "categorias": ["san-valentin", "amor", "flores-rosas", "fresas-con-chocolate", "desayunos-sorpresas"]},
    {"occ": "dia-madre", "etiqueta": "Para mamá", "tema": "regalos para sorprender a mamá",
     "categorias": ["para-mama", "flores-rosas", "desayunos-sorpresas", "anchetas-de-cumpleanos"]},
    {"occ": "dia-padre", "etiqueta": "Para papá", "tema": "regalos para sorprender a papá",
     "categorias": ["para-papa", "pasion-futbolera", "desayunos-sorpresas", "anchetas-de-cumpleanos"]},
    {"occ": "amor-amistad", "etiqueta": "Amor y Amistad", "tema": "detalles para Amor y Amistad",
     "categorias": ["amor-amistad", "amor", "fresas-con-chocolate", "cajas-magicas"]},
    {"occ": "navidad", "etiqueta": "Navidad", "tema": "regalos de Navidad a domicilio en Bogotá",
     "categorias": ["navidad", "anchetas-de-cumpleanos", "desayunos-sorpresas"]},
    {"etiqueta": "Aniversario", "tema": "ideas de regalo para un aniversario",
     "categorias": ["amor", "flores-rosas", "fresas-con-chocolate", "desayunos-sorpresas"]},
    {"etiqueta": "Cumpleaños", "tema": "regalos de cumpleaños que sorprenden",
     "categorias": ["cumpleanos", "anchetas-de-cumpleanos", "balloon-surprise", "cajas-magicas"]},
    {"etiqueta": "Desayunos", "tema": "desayunos sorpresa para regalar en Bogotá",
     "categorias": ["desayunos-sorpresas", "fresas-con-chocolate"]},
    {"etiqueta": "Mejórate", "tema": "detalles para desear pronta recuperación",
     "categorias": ["mejorate-pronto", "flores-rosas", "desayunos-sorpresas"]},
    {"etiqueta": "Perdón", "tema": "regalos para pedir perdón y reconciliarte",
     "categorias": ["perdoname", "flores-rosas", "fresas-con-chocolate"]},
    {"etiqueta": "Grados", "tema": "regalos de grado y graduación",
     "categorias": ["grados", "desayunos-sorpresas", "anchetas-de-cumpleanos"]},
    {"etiqueta": "Corporativo", "tema": "regalos corporativos para clientes y equipo",
     "categorias": ["regalos-corporativos", "anchetas-de-cumpleanos", "desayunos-sorpresas"]},
]
GUIA_BRIEFS = [
    {"tema": "Qué regalar en un aniversario sin gastar de más", "categoria": "amor"},
    {"tema": "Cómo elegir un desayuno sorpresa perfecto", "categoria": "desayunos-sorpresas"},
    {"tema": "Regalos de último minuto con entrega el mismo día en Bogotá", "categoria": "entregas-hoy-mismo"},
    {"tema": "Regalos para pedir perdón y reconciliarte", "categoria": "perdoname"},
    {"tema": "Qué regalar a una mujer en su cumpleaños", "categoria": "para-ella"},
    {"tema": "Detalles económicos que se ven mucho más caros", "categoria": "fresas-con-chocolate"},
    {"tema": "Cómo sorprender a tu pareja en un día normal", "categoria": "amor"},
    {"tema": "Regalos para mamá más allá de las flores", "categoria": "para-mama"},
]


def pick_index(lst, n):
    return lst[((n % len(lst)) + len(lst)) % len(lst)]


def pick_theme(count, fecha):
    occ = ocasion_activa(fecha)
    if occ:
        for t in THEMES:
            if t.get("occ") == occ:
                return t
    return pick_index(THEMES, count)


# ───────────────────────────── git ─────────────────────────────────
def git(args):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout or f"git {' '.join(args)} falló").strip())
    return r.stdout.strip()


def current_branch():
    try:
        return git(["rev-parse", "--abbrev-ref", "HEAD"])
    except Exception:
        return "main"


def commit_push(files, message):
    try:
        git(["config", "user.name", "lordmacu"])
    except Exception:
        pass
    try:
        git(["config", "user.email", "10134930+lordmacu@users.noreply.github.com"])
    except Exception:
        pass
    for f in files if isinstance(files, list) else [files]:
        git(["add", os.path.relpath(f, ROOT)])
    if not git(["diff", "--cached", "--name-only"]):
        log("· nada que commitear")
        return
    git(["commit", "-m", message])
    branch = current_branch()
    try:
        git(["pull", "--rebase", "origin", branch])
    except Exception as e:  # noqa: BLE001
        log("⚠ pull --rebase:", str(e).split("\n")[0])
    git(["push", "origin", branch])
    log("✓ commit + push hechos")


def git_pull():
    try:
        branch = current_branch()
        out = git(["pull", "--rebase", "--autostash", "origin", branch])
        last = (out.split("\n")[-1].strip() if out else "") or "ok"
        log(f"↻ git pull --rebase origin {branch}: {last}")
    except Exception as e:  # noqa: BLE001
        log("⚠ git pull falló (continúo con lo local):", str(e).split("\n")[0])


# ───────────────────────────── main ────────────────────────────────
def main():
    load_env()
    args = parse_args(sys.argv)

    base_url = os.environ.get("LLM_BASE_URL") or "https://api.minimax.io/anthropic"
    model = os.environ.get("LLM_MODEL") or "MiniMax-M3"
    api_key = os.environ.get("LLM_API_KEY") or os.environ.get("MINIMAX_API_KEY") or ""
    api_style = resolve_api_style(os.environ.get("LLM_API_STYLE"), base_url)
    try:
        max_tokens = int(os.environ.get("LLM_MAX_TOKENS") or "") or 16000
    except Exception:
        max_tokens = 16000
    if not api_key:
        log("Error: falta LLM_API_KEY (definir en .env.local)")
        sys.exit(1)

    if not args["no_pull"]:
        git_pull()

    categorias_data = read_json(CATEGORIAS_FILE)
    productos_data = read_json(PRODUCTOS_FILE, default={"productos": []})
    config = read_json(CONFIG_FILE)
    humanize_text = read_text(HUMANIZE_FILE, default="")
    cats_raw = categorias_data.get("categorias", categorias_data)
    cats = [{"slug": c["slug"], "nombre": c["nombre"]} for c in cats_raw]
    valid_set = set(c["slug"] for c in cats)
    productos = productos_data.get("productos", productos_data) if isinstance(productos_data, dict) else productos_data
    prod_set = set(p["slug"] for p in productos)
    fallback_cat = "amor" if "amor" in valid_set else cats[0]["slug"]
    store = {"nombre": config.get("nombre"), "dominio": config.get("dominio"), "whatsapp": config.get("whatsapp")}
    fecha = hoy_bogota()

    blog = read_json(BLOG_FILE)
    guias = read_json(GUIAS_FILE)

    # Tipo: auto rota 2 posts : 1 guía según el total ya publicado.
    type_ = args["type"]
    if type_ == "auto":
        total = len(blog["posts"]) + len(guias["guias"])
        type_ = "guia" if total % 3 == 2 else "post"
    if type_ not in ("post", "guia"):
        log(f"--type inválido: {type_}")
        sys.exit(1)

    log(f"[generate-content] type={type_} model={model} fecha={fecha} {'DRY-RUN' if args['dry_run'] else ''}")

    if type_ == "post":
        theme = pick_theme(len(blog["posts"]), fecha)
        menu = product_menu(productos, [c for c in theme["categorias"] if c in valid_set])
        if not menu:
            log("✗ sin productos para el tema, abortando")
            sys.exit(1)
        log(f'  tema: "{theme["tema"]}" · productos en menú: {len(menu)}')
        system, user = prompt_post(store, cats, theme, menu, fecha, humanize_text)
        target_file, data_obj, arr_key = BLOG_FILE, blog, "posts"
    else:
        brief = pick_index(GUIA_BRIEFS, len(guias["guias"]))
        log(f'  tema guía: "{brief["tema"]}"')
        system, user = prompt_guia(store, cats, brief, fecha, humanize_text)
        target_file, data_obj, arr_key = GUIAS_FILE, guias, "guias"

    existing_slugs = set(x["slug"] for x in data_obj[arr_key])
    nuevo, raw = None, {}
    for intento in range(3):
        content = call_llm(system, user, base_url, api_key, model, api_style, max_tokens)
        raw = extract_json(content)
        cand = (
            sanitize_post(raw, valid_set, prod_set, fecha, set(existing_slugs), fallback_cat)
            if type_ == "post"
            else sanitize_guia(raw, valid_set, fecha, set(existing_slugs), fallback_cat)
        )
        # Valida SOLO el texto visible (sin imagePrompt, que va en inglés a propósito).
        visible = " ".join([
            cand.get("h1", ""), cand.get("lead", ""),
            " ".join(cand.get("intro", [])),
            " ".join(i.get("texto", "") for i in cand.get("items", [])),
            " ".join(" ".join(s.get("parrafos", [])) for s in cand.get("secciones", [])),
            " ".join(cand.get("cierre", [])),
            " ".join(f.get("respuesta", "") for f in cand.get("faq", [])),
        ])
        if looks_spanish(visible):
            nuevo = cand
            break
        log(f"⚠ intento {intento + 1}: el texto no quedó en español, regenerando…")
    if nuevo is None:
        log("✗ No se pudo generar en español tras 3 intentos. Abortando (no se publica).")
        sys.exit(1)

    titulo_seo = nuevo.get("metaTitle") or nuevo.get("title") or ""
    log(f"\n→ {type_}: {nuevo['h1']}")
    log(f"  slug: {nuevo['slug']}")
    log(f"  título SEO ({len(titulo_seo)}): {titulo_seo}")
    log(f"  metaDescription ({len(nuevo['metaDescription'])})")
    if type_ == "post":
        log(f"  hero: {nuevo['heroProductSlug']}")
        log("  productos: " + ", ".join(i.get("productoSlug") or f"(cat:{i['ctaCategoria']})" for i in nuevo["items"]))
    else:
        log("  categorías: " + ", ".join(nuevo["categoriasRelacionadas"]))

    if args["dry_run"]:
        if type_ == "post":
            log(f"  imagePrompt: {(raw.get('imagePrompt') or '(ninguno)')[:140]}")
        log("\nDRY-RUN: no se escribió nada (ni imagen).\n" + json.dumps(nuevo, ensure_ascii=False, indent=2)[:900] + " …")
        return

    # Imagen del post (best-effort): MiniMax image-01, personas reales recibiendo el regalo.
    img = None
    if type_ == "post":
        img_dir = os.path.join(ROOT, "public", "images", "blog")
        img = generate_imagen(nuevo["slug"], raw.get("imagePrompt"), api_key, img_dir)
        if img:
            nuevo["heroImagen"] = img["rel"]

    data_obj[arr_key].insert(0, nuevo)
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(json.dumps(data_obj, ensure_ascii=False, indent=2) + "\n")
    log(f"✓ agregado a {os.path.relpath(target_file, ROOT)} ({len(data_obj[arr_key])} en total)")

    if args["commit"]:
        ruta = f"/blog/{nuevo['slug']}" if type_ == "post" else f"/blog/guias/{nuevo['slug']}"
        files = [target_file]
        if img:
            files.append(img["file"])
        commit_push(files, f'Contenido auto: {type_} "{nuevo["h1"]}" ({ruta})')


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        log("ERROR:", str(e).split("\n")[0])
        sys.exit(1)
