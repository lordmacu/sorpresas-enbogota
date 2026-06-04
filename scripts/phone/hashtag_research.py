#!/usr/bin/env python3
"""
Descubre hashtags POPULARES reales del nicho con la Hashtag Search API de Instagram
(variante Facebook Login + feature "Instagram Public Content Access").

Cómo: por cada hashtag SEMILLA nuestro, busca su id, lee sus TOP posts y cuenta qué
hashtags aparecen más en ellos → así afloran los tags vivos que de verdad usan los
posts que funcionan en el nicho. Escribe discovered_hashtags.json, que
refresh_hashtags.py mezcla en el banco semanal.

Requiere en el .env:
  FB_GRAPH_TOKEN   token de Facebook Login (instagram_basic + pages_read_engagement
                   + feature Public Content Access). Genera/extiende con fb_token_setup.py.

Límite oficial: 30 hashtags únicos por 7 días → usamos pocas semillas y corremos semanal.
Si no hay FB_GRAPH_TOKEN, sale limpio (exit 0) sin hacer nada — así no ensucia el cron
hasta que actives la búsqueda.

  python3 hashtag_research.py
"""
import os
import re
import sys
import json
import collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

FB = "https://graph.facebook.com/v21.0"
# Semillas = nuestros tags núcleo (locales + nicho). Pocas, por el límite de 30/7días.
SEEDS = ["regalosbogota", "anchetasbogota", "desayunosorpresa",
         "regalosadomiciliobogota", "sorpresasbogota"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "discovered_hashtags.json")
TAG_RE = re.compile(r"#([0-9a-zA-Z_áéíóúñüÁÉÍÓÚÑÜ]+)")


def main():
    igkit.load_env()
    tok = os.environ.get("FB_GRAPH_TOKEN")
    if not tok:
        print("ℹ️ Sin FB_GRAPH_TOKEN — búsqueda de hashtags desactivada. "
              "Configúralo (ver fb_token_setup.py) para activarla. Salto.")
        return  # exit 0: no es un fallo, es que aún no está activada

    ig = igkit.ig_user_id(igkit.ig_token())  # mismo IG id de la cuenta
    counter = collections.Counter()
    ok = 0
    for seed in SEEDS:
        r = igkit.get(f"{FB}/ig_hashtag_search",
                      {"user_id": ig, "q": seed, "access_token": tok})
        try:
            hid = r["data"][0]["id"]
        except Exception:
            print(f"  · #{seed}: sin resultado ({json.dumps(r)[:140]})")
            continue
        ok += 1
        top = igkit.get(f"{FB}/{hid}/top_media",
                        {"user_id": ig, "fields": "caption,like_count,comments_count",
                         "limit": 25, "access_token": tok})
        for m in top.get("data", []):
            cap = m.get("caption") or ""
            eng = (m.get("like_count") or 0) + (m.get("comments_count") or 0)
            w = 2 if eng > 200 else 1  # los posts muy engageados pesan un poco más
            for tag in {t.lower() for t in TAG_RE.findall(cap)}:
                counter[tag] += w

    for s in SEEDS:           # no nos recomendamos las propias semillas
        counter.pop(s, None)
    ranked = [t for t, _ in counter.most_common(40) if len(t) > 3]

    data = {
        "semillas": SEEDS,
        "semillas_ok": ok,
        "descubiertos": ranked,
        "scores": dict(counter.most_common(40)),
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(ranked)} hashtags descubiertos de {ok}/{len(SEEDS)} semillas "
          f"→ discovered_hashtags.json")
    if ranked:
        print("   top:", " ".join("#" + t for t in ranked[:15]))


if __name__ == "__main__":
    main()
