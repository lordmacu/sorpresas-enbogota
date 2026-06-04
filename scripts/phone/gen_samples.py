#!/usr/bin/env python3
"""
Genera imágenes de MUESTRA de intro/outro con personas/escenas dinámicas, en dos
estilos (fotorrealista y 3D Pixar), para elegir la dirección visual del Reel.
Las guarda en el workdir del video para servirlas por el túnel y compararlas.

  python3 gen_samples.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402

igkit.load_env()
W, H = 1080, 1920

PHOTO = (
    "cinematic lifestyle photograph, vibrant and emotional, warm golden hour light, "
    "soft glowing bokeh, premium gift brand aesthetic, cream burgundy and gold tones, "
    "dynamic candid joyful moment, shallow depth of field, 85mm, vertical 9:16 composition, "
    "ultra detailed, photorealistic, no text, no watermark, no logo"
)
PIXAR = (
    "3D Pixar-style animated render, rounded friendly shapes, exaggerated joyful expressions, "
    "expressive big eyes, vibrant inviting colors, smooth 3D shading with soft light bloom, "
    "warm cinematic lighting, dynamic energy, cream burgundy and gold palette, "
    "shallow depth of field, vertical 9:16 composition, ultra detailed, no text, no watermark, no logo"
)

SCENES = {
    "papa-foto": "A happy father in his 50s smiling with pure joy as he receives a beautifully "
                 "wrapped gift box with a golden ribbon from his children, heartfelt candid family "
                 "moment, cozy warm living room. " + PHOTO,
    "papa-3d": "A cheerful cartoon father character joyfully receiving a big gift box with a golden "
               "bow from his kids, confetti and balloons around, cozy stylized living room. " + PIXAR,
    "entrega-foto": "A smiling delivery person handing a beautiful gift box with red roses to a "
                    "delighted young woman at her front door, joyful surprise moment, warm sunny day. " + PHOTO,
    "entrega-3d": "A cute cartoon delivery character happily handing a big gift box with roses to a "
                  "delighted woman at her door, confetti, bright sunny stylized street. " + PIXAR,
}

outdir = os.path.join(
    os.environ.get("PREFIX", "/data/data/com.termux/files/usr"),
    "var/lib/proot-distro/installed-rootfs/debian/root/sorpresas-video")
os.makedirs(outdir, exist_ok=True)

for name, prompt in SCENES.items():
    print(f"🎨 {name}…", flush=True)
    try:
        url = igkit.minimax_image(prompt, W, H)[0]
        igkit.download(url, os.path.join(outdir, f"sample-{name}.jpg"))
        print(f"   ✓ sample-{name}.jpg", flush=True)
    except Exception as e:
        print(f"   ✗ {e}", flush=True)

print("\nListo. Sírvelas con serve_preview.py y abre /sample-<nombre>.jpg")
