#!/usr/bin/env python3
"""Genera muestras de voz con varias voces de MiniMax para comparar y elegir.
Solo genera los MP3 (la subida a catbox se hace luego en bash, para no forkar
desde python tras las llamadas SSL)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

igkit.load_env()
TEXT = ("Aunque la distancia sea larga, mi corazón te espera entero, "
        "en cada latido que te nombra y en cada suspiro que te acerca.")
VOICES = [
    "Spanish_SereneWoman",
    "Spanish_CaptivatingStoryteller",
    "Spanish_WiseScholar",
    "Spanish_Kind-heartedGirl",
    "Spanish_ReservedYoungMan",
    "Spanish_ThoughtfulMan",
]
out = "/data/data/com.termux/files/usr/tmp/voices"
os.makedirs(out, exist_ok=True)
for v in VOICES:
    try:
        audio = igkit.minimax_tts(TEXT, voice=v, speed=0.9)
        with open(os.path.join(out, f"{v}.mp3"), "wb") as f:
            f.write(audio)
        print(f"OK {v}")
    except Exception as e:
        print(f"ERR {v}: {e}")
