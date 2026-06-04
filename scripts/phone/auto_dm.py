#!/usr/bin/env python3
"""
Asistente de ventas por DM con IA (MiniMax). Cuando alguien escribe (o responde
una Story), MiniMax responde cálido y orientado a la venta: pregunta para quién
es la sorpresa, da rangos de precio, ofrece entrega el mismo día en Bogotá y el
link. Convierte la atención en pedidos, 24/7.

PREPARADO — requiere en el token el scope:  instagram_business_manage_messages
Guarda los mensajes ya respondidos para no duplicar. Gateado por IG_PUBLISH.

  python3 auto_dm.py --dry-run
  python3 auto_dm.py
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

US = "sorpresas_en_bogota"
WEB = "sorpresas.enbogota.app"  # el catálogo y los pedidos van por la web
STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".replied_dms.json")


def _load():
    try:
        return set(json.load(open(STATE)))
    except Exception:
        return set()


def _save(s):
    json.dump(sorted(s), open(STATE, "w"))


def ai_reply(message):
    system = (
        "Eres asesor de ventas de Sorpresas, regalos a domicilio en Bogotá con entrega "
        "el mismo día. Respondes por DM, cálido, cercano y vendedor pero sin presionar, "
        "EN ESPAÑOL, con 1-2 emojis. Si es un saludo o reacción, pregunta para quién es la "
        "sorpresa y la ocasión. Si preguntan precio o muestran interés, da rangos y SIEMPRE "
        f"invítalos a ver el catálogo y hacer el pedido en {WEB} (todo se gestiona por la web). "
        "Recuerda la entrega el mismo día en Bogotá. Máximo 3 frases. Devuelve SOLO el mensaje."
    )
    return igkit.minimax_text(system, f"Mensaje del cliente: «{message}»\nResponde:")


def main():
    igkit.load_env()
    dry = "--dry-run" in sys.argv
    done = _load()
    convos = (igkit.get_conversations(limit=20) or {}).get("data", [])
    if not convos:
        print("Sin conversaciones (o falta el scope de mensajes).")
        return
    ig_self = igkit.ig_user_id(igkit.ig_token())
    for conv in convos:
        msgs = (igkit.get_messages(conv["id"], limit=5) or {}).get("messages", {}).get("data", [])
        if not msgs:
            continue
        last = msgs[0]  # el más reciente
        mid = last.get("id")
        sender = (last.get("from") or {}).get("id")
        if not mid or mid in done or sender == ig_self:
            continue  # ya respondido o es nuestro propio mensaje
        text = last.get("message", "")
        igkit.log_lead("dm", sender, text)  # a TU lista de contactos
        reply = ai_reply(text)
        print(f"📩 «{text}»\n   → {reply}")
        if not dry and igkit.guard_publish() and sender:
            igkit.send_dm(sender, reply)
        done.add(mid)
    _save(done)
    print("listo.")


if __name__ == "__main__":
    main()
