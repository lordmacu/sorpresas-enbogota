#!/usr/bin/env python3
"""
Auto-responde con IA los comentarios de las publicaciones recientes (MiniMax),
de forma cálida y on-brand. Responder rápido sube el alcance (señal del algoritmo).

PREPARADO — requiere agregar al token el scope:  instagram_business_manage_comments
Guarda los comentarios ya respondidos para no duplicar. Gateado por IG_PUBLISH.

  python3 auto_comments.py --dry-run     # muestra qué respondería, sin responder
  python3 auto_comments.py               # responde (si IG_PUBLISH=1)
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

US = "sorpresas_en_bogota"
WEB = "sorpresas.enbogota.app"
STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".replied_comments.json")
# Palabras que indican intención de compra → abrimos el DM con el link a la web.
BUY_WORDS = ("precio", "cuanto", "cuánto", "vale", "valor", "quiero", "pedir", "pedido",
             "comprar", "info", "informacion", "información", "domicilio", "cuesta", "cotiz")
DM_OPENER = ("¡Hola! 💝 Vi tu comentario. Cuéntame para quién es la sorpresa y te ayudo a elegir "
             "el regalo perfecto 🎁 Entregamos el mismo día en Bogotá. Mira el catálogo y pide en "
             f"{WEB}")


def _load():
    try:
        return set(json.load(open(STATE)))
    except Exception:
        return set()


def _save(s):
    json.dump(sorted(s), open(STATE, "w"))


def ai_reply(comment, caption):
    system = (
        "Eres el community manager de Sorpresas, regalos a domicilio en Bogotá. "
        "Respondes comentarios cálidos, breves y cercanos, EN ESPAÑOL, con 1 emoji. "
        "NUNCA des precios exactos ni el WhatsApp en el comentario público. Si preguntan "
        "precio, info o quieren un producto, invítalos a escribir por DM (ej. "
        "'escríbenos al DM 💌 y te ayudamos'). Máximo 2 frases. Devuelve SOLO la respuesta."
    )
    return igkit.minimax_text(system, f"Comentario: «{comment}»\nContexto del post: {caption[:80]}\nResponde:")


def main():
    igkit.load_env()
    dry = "--dry-run" in sys.argv
    replied = _load()
    media = (igkit.my_media(limit=8) or {}).get("data", [])
    if not media:
        print("Sin publicaciones (o falta el scope de comentarios).")
        return
    for m in media:
        comments = (igkit.get_comments(m["id"]) or {}).get("data", [])
        for c in comments:
            cid = c.get("id")
            if not cid or cid in replied or c.get("username") == US:
                continue
            text = c.get("text", "")
            reply = ai_reply(text, m.get("caption", ""))
            buy = any(w in text.lower() for w in BUY_WORDS)
            print(f"💬 «{text}»\n   → {reply}" + ("   [intención de compra → DM]" if buy else ""))
            if buy:
                igkit.log_lead("comentario", c.get("username"), text)  # a TU lista
            if not dry and igkit.guard_publish():
                igkit.reply_comment(cid, reply)
                if buy and igkit.can_dm(c.get("username")):  # máx 1 DM/usuario/24h
                    try:
                        igkit.send_private_reply(cid, DM_OPENER)
                        print("   📩 DM privado enviado")
                    except Exception as e:
                        print(f"   (no se pudo abrir DM: {e})")
            replied.add(cid)
    _save(replied)
    print("listo.")


if __name__ == "__main__":
    main()
