#!/usr/bin/env python3
"""
Lista las publicaciones donde etiquetaron a @sorpresas_en_bogota (UGC: clientes
mostrando su regalo). Sirve para repostear a Stories como prueba social.

PREPARADO — requiere en el token el scope:  instagram_business_basic

  python3 mentions.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402


def main():
    igkit.load_env()
    tags = (igkit.get_tagged_media(25) or {}).get("data", [])
    if not tags:
        print("Sin menciones nuevas (o falta el scope instagram_business_basic).")
        return
    print(f"🏷️  {len(tags)} publicaciones que te etiquetaron:\n")
    for t in tags:
        print(f"  @{t.get('username')} · {t.get('timestamp', '')[:10]}")
        if t.get("caption"):
            print(f"     “{t['caption'][:70]}”")
        print(f"     {t.get('permalink', '')}")
    print("\n💡 Para repostear a Story: descarga la imagen y usa post_story.py, "
          "o compártela desde la app etiquetando de vuelta.")


if __name__ == "__main__":
    main()
