#!/usr/bin/env python3
"""
Refresca el banco de hashtags (hashtags.json) una vez por semana, sesgado a la
OCASIÓN activa (Día del Padre, Navidad, San Valentín…). Así "publicamos sobre lo
que está pasando" sin depender de una API de tendencias (que Instagram no expone).

Cómo funciona — composición controlada desde un banco curado por niveles, para no
caer en mega-hashtags que entierran el post:
  • 2 grandes (alcance)  + 4-5 medianos (nicho regalos, donde sí aparecemos)
  • 2 locales Bogotá     + 1-2 de producto/nicho  + 2-3 de la ocasión activa
MiniMax solo aporta hashtags FRESCOS de la ocasión/temporada (no inventa el set
entero), y si falla hay respaldo determinista: el archivo siempre queda bien.

  python3 refresh_hashtags.py            # usa la ocasión activa
  python3 refresh_hashtags.py navidad    # fuerza una categoría de ocasión

Corre semanal por cron. Gasta muy poca cuota MiniMax (un texto corto).
"""
import os
import re
import sys
import json
import random
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit      # noqa: E402
import occasions  # noqa: E402

OUT = igkit.HASHTAGS_FILE
DISCOVERED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "discovered_hashtags.json")
N_SETS = 6

# Banco curado por niveles (mezclar tamaños es la clave en 2026).
BANK = {
    "grandes": ["#regalos", "#sorpresas", "#detalles", "#regalosoriginales",
                "#regalar", "#bogota"],
    "medianos": ["#regalosbogota", "#sorpresasbogota", "#anchetasbogota",
                 "#desayunosorpresa", "#desayunossorpresa", "#floresbogota",
                 "#regalosadomicilio", "#regalosadomiciliobogota", "#detallesconamor",
                 "#regalospersonalizados", "#ideasderegalo", "#regalosespeciales",
                 "#regalosconamor"],
    "locales": ["#bogotacolombia", "#domiciliosbogota", "#sorpresasenbogota",
                "#detallesbogota", "#floresadomicilio", "#sorpresasadomicilio"],
    "nicho": ["#fresasconchocolate", "#ramodeflores", "#anchetas", "#cajasorpresa",
              "#globos", "#chocolates", "#peluches", "#vino"],
}

# Hashtags propios de cada ocasión (respaldo; MiniMax puede sumar frescos encima).
OCASION_TAGS = {
    "san-valentin": ["#sanvalentin", "#regalosdeamor", "#regalosparaenamorados", "#14defebrero"],
    "para-ella":    ["#diadelamujer", "#regalosparaella", "#8demarzo", "#mujeres"],
    "para-mama":    ["#diadelamadre", "#regalosparamama", "#felizdiamama", "#amordemadre"],
    "para-papa":    ["#diadelpadre", "#regalosparapapa", "#regalospapa", "#felizdiapapa"],
    "amor-amistad": ["#amoryamistad", "#regalosamoryamistad", "#amigosecreto", "#detallesdeamistad"],
    "halloween":    ["#halloween", "#dulceotruco", "#disfraces"],
    "navidad":      ["#navidad", "#regalosnavidad", "#regalosnavideños", "#feliznavidad", "#aguinaldo"],
}


def sanitize(tag):
    """Normaliza un hashtag: minúsculas, sin espacios ni símbolos raros."""
    t = (tag or "").strip().lower().replace(" ", "")
    t = re.sub(r"[^#0-9a-záéíóúñü]", "", t)
    if t and not t.startswith("#"):
        t = "#" + t
    return t if len(t) > 2 else ""


def minimax_occasion_tags(nombre):
    """Pide a MiniMax hashtags frescos de la ocasión (solo enriquecen, no son el set)."""
    try:
        # max_tokens holgado: MiniMax-M3 es modelo "thinking" y con poco presupuesto
        # gasta todo en el bloque de razonamiento y devuelve texto vacío.
        raw = igkit.minimax_text(
            "Eres experto en marketing de Instagram en Bogotá, Colombia. Respondes solo hashtags.",
            f"Dame 6 hashtags en español (Colombia) para promocionar regalos a domicilio en "
            f"Bogotá durante '{nombre}'. Solo hashtags reales y usados, mezcla tamaños, sin "
            f"explicaciones. Formato: una línea separada por espacios.",
            max_tokens=2000,
        )
    except BaseException:  # incluye SystemExit (texto vacío) → respaldo determinista
        return []
    tags = [sanitize(x) for x in re.split(r"[\s,]+", raw or "") if x.strip().startswith("#")]
    return [t for t in dict.fromkeys(tags) if t]  # únicos, en orden


def load_discovered():
    """Hashtags populares reales que halló hashtag_research.py (Hashtag Search API).
    Si no existe el archivo (búsqueda no activada aún), devuelve []."""
    try:
        d = json.load(open(DISCOVERED, encoding="utf-8"))
        tags = [sanitize(t) for t in (d.get("descubiertos") or [])]
        return [t for t in tags if t]
    except Exception:
        return []


def pick(pool, k, used):
    """k elementos del pool que no estén ya en `used` (mezclados)."""
    opts = [x for x in pool if x not in used]
    random.shuffle(opts)
    out = opts[:k]
    used.update(out)
    return out


def build_set(occ_tags, discovered):
    used = set()
    tags = (pick(BANK["grandes"], 2, used)
            + pick(BANK["medianos"], 4, used)
            + pick(discovered, 2, used)  # tags reales descubiertos del nicho
            + pick(BANK["locales"], 2, used)
            + pick(BANK["nicho"], 2, used)
            + (random.sample(occ_tags, min(3, len(occ_tags))) if occ_tags else []))
    random.shuffle(tags)
    # Únicos preservando orden, tope 14 (Instagram penaliza muros de hashtags).
    return list(dict.fromkeys(tags))[:14]


def main():
    igkit.load_env()
    forced = sys.argv[1] if len(sys.argv) > 1 else None

    occ = occasions.current_occasion()
    if forced:
        cat, nombre = forced, forced
    elif occ:
        nombre, cat = occ[0], occ[1]
    else:
        nombre, cat = None, None

    occ_tags = list(OCASION_TAGS.get(cat, []))
    if nombre:  # MiniMax suma frescos de la temporada (best-effort)
        occ_tags = list(dict.fromkeys(occ_tags + minimax_occasion_tags(nombre)))

    discovered = load_discovered()
    sets = [" ".join(build_set(occ_tags, discovered)) for _ in range(N_SETS)]

    data = {
        "actualizado": datetime.date.today().isoformat(),
        "ocasion": nombre or "(sin ocasión)",
        "categoria": cat,
        "occasion_tags": occ_tags,
        "descubiertos_usados": len(discovered),
        "sets": sets,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ hashtags.json actualizado — ocasión: {data['ocasion']} ({len(sets)} sets, "
          f"{len(discovered)} descubiertos)")
    for s in sets:
        print("  ·", s)


if __name__ == "__main__":
    main()
