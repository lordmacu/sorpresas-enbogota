#!/usr/bin/env python3
"""
Reel de POEMA con voz. MiniMax escribe un poema → voz TTS (con subtítulos) →
fondos románticos estilo Pixar (Ken Burns + crossfade) + música + subtítulos
quemados + intro/outro de marca con CTA de seguir. Reusa el motor de make_video.

  python3 make_poema.py                 # tema romántico aleatorio
  python3 make_poema.py "extrañar"      # fuerza tema
  python3 make_poema.py --dry-run

Salida: <workdir>/reel.mp4 + caption.txt
Publícalo con:  python3 post_video.py --builder make_poema.py
"""
import os
import sys
import json
import shutil
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402
import make_video as mv  # noqa: E402

W, H, FPS, XFADE, TAIL = mv.W, mv.H, mv.FPS, mv.XFADE, mv.TAIL

ROMANTIC = (
    "3D Pixar-style animated render, dreamy romantic atmosphere, soft glowing warm light, "
    "floating hearts and rose petals, gentle bokeh, cream burgundy and gold palette, tender "
    "cozy mood, vertical 9:16 composition, ultra detailed, no text, no watermark, no logo"
)
BG_SCENES = [
    "a cozy romantic scene by a warm sunny window with roses and soft golden light",
    "a dreamy golden-hour sky full of floating hearts and rose petals",
    "a tender cartoon couple silhouette watching the sunset together",
    "a cozy bed with rose petals, soft morning light and a small gift box",
    "a romantic dinner table for two with roses and warm golden lights",
    "a starry night sky with glowing hearts over a cozy stylized city",
    "a happy cartoon couple walking together holding a big bouquet of roses",
    "a warm cozy living room with roses, soft lights and floating hearts",
]
TEMAS = ["el amor", "extrañar a alguien", "el amor a distancia", "querer con detalles",
         "el primer amor", "la persona que amo", "los aniversarios", "decir te quiero"]
WEIGHT = {"intro": 2.4, "bg": 4.0, "outro": 3.0}


def f_bg(idx, dur):
    """Segmento de fondo a pantalla completa con Ken Burns (sin texto)."""
    F = round(dur * FPS)
    p = f"b{idx}"
    return [
        f"[{idx}]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"eq=brightness=-0.05:saturation=1.12[{p}s]",
        f"[{p}s]scale=1620:2880,zoompan=z='min(zoom+0.0006,1.12)':d={F}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[v{idx}]",
    ]


def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    skip_gen = "--skip-gen" in sys.argv
    n_bg = 2  # imágenes totales = intro + n_bg + outro
    tema = args[0] if args else random.choice(TEMAS)

    tdir, ddir = mv.workdirs()
    os.makedirs(tdir, exist_ok=True)
    fonts_dir = os.path.join(tdir, "fonts")
    os.makedirs(fonts_dir, exist_ok=True)
    for fn in ("PlayfairDisplay-700.ttf", "Inter-600.ttf"):
        src = os.path.join(mv.FONT_SRC, fn)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(fonts_dir, fn))
    playfair, inter = f"{ddir}/fonts/PlayfairDisplay-700.ttf", f"{ddir}/fonts/Inter-600.ttf"
    P = lambda n: os.path.join(tdir, n)  # noqa: E731

    if skip_gen:
        import glob
        poema = open(P("guion.txt"), encoding="utf-8").read() if os.path.exists(P("guion.txt")) else ""
        segs = json.load(open(P("subs.json"), encoding="utf-8")) if os.path.exists(P("subs.json")) else []
        voice_dur = mv.ffprobe_dur(f"{ddir}/voice.mp3")
        total = round(voice_dur + TAIL, 2)
        imgs = sorted(glob.glob(P("pbg*.jpg")))
        n_bg = max(1, len(imgs) - 2)
        has_music = os.path.exists(P("music.mp3"))
        print(f"  [skip-gen] imgs={len(imgs)} voz={voice_dur:.1f}s subs={len(segs)} música={has_music}")
        if len(imgs) < 3:
            raise SystemExit("✗ skip-gen sin assets; corre make_poema sin --skip-gen primero")
    else:
        print(f"→ tema: {tema}")
        poema = igkit.minimax_poema(tema, lineas=4)
        print("📜 poema:\n" + poema + "\n")
        mv.write_text(P("guion.txt"), poema)

        print("🎙️  voz + subtítulos…")
        # CaptivatingStoryteller, un punto más pausada que normal (poemas de 4
        # versos → reel de ~10-12s).
        audio, segs = igkit.minimax_tts(poema, voice="Spanish_CaptivatingStoryteller", subtitles=True, speed=0.95)
        with open(P("voice.mp3"), "wb") as f:
            f.write(audio)
        mv.write_text(P("subs.json"), json.dumps(segs, ensure_ascii=False))
        voice_dur = mv.ffprobe_dur(f"{ddir}/voice.mp3")
        print(f"   voz: {voice_dur:.1f}s · subs: {len(segs)}")
        total = round(voice_dur + TAIL, 2)

        # Escenas Pixar curadas por defecto (rápidas, seguras). Las dinámicas por
        # IA son opcionales (--ai-scenes): generan más llamadas y pueden saturar
        # la RAM del celular (causaba un deadlock de fork antes de ffmpeg).
        print("🎨 fondos Pixar…")
        needed = n_bg + 2
        pool = []
        if "--ai-scenes" in sys.argv:
            try:
                pool = igkit.minimax_scene_prompts(f"A tender Spanish poem about {tema}: {poema}", n=needed + 2)
                print(f"   escenas IA: {len(pool)}")
            except Exception as e:
                print(f"   ⚠ escenas IA fallaron ({e})")
        fallback = list(BG_SCENES)
        random.shuffle(fallback)
        pool = pool + fallback  # IA primero (si aplica); lista curada como respaldo
        imgs = []
        for sc in pool:
            if len(imgs) >= needed:
                break
            try:
                url = igkit.minimax_image(f"{sc}. {ROMANTIC}", W, H, tries=2)[0]
                dest = P(f"pbg{len(imgs)}.jpg")
                igkit.download(url, dest)
                imgs.append(dest)
            except Exception as e:
                print(f"   ⚠ escena saltada ({e})")
        # rellena si faltan reusando las que sí salieron
        i = 0
        while len(imgs) < needed and imgs:
            shutil.copy(imgs[i % len(imgs)], P(f"pbg{len(imgs)}.jpg"))
            imgs.append(P(f"pbg{len(imgs)}.jpg"))
            i += 1
        if not imgs:
            raise SystemExit("✗ No se pudo generar ningún fondo")

        if os.path.exists(mv.MUSIC_SRC):
            shutil.copy(mv.MUSIC_SRC, P("music.mp3"))
        has_music = os.path.exists(P("music.mp3"))

        mv.write_text(P("t_intro1.txt"), "Un poema")
        mv.write_text(P("t_intro2.txt"), "para dedicar")
        mv.write_text(P("t_outro1.txt"), "Síguenos")
        mv.write_text(P("t_outro2.txt"), "@sorpresas_en_bogota")
        mv.write_text(P("t_outro3.txt"), "Regalos a domicilio en Bogotá")

    # plan: intro + n_bg fondos + outro (cada uno con su imagen)
    plan = ([("intro", imgs[0])] +
            [("bg", imgs[1 + k]) for k in range(n_bg)] +
            [("outro", imgs[-1])])
    n = len(plan)
    wsum = sum(WEIGHT[t] for t, _ in plan)
    target = total + (n - 1) * XFADE
    durs = [round(WEIGHT[t] / wsum * target, 3) for t, _ in plan]
    total = round(sum(durs) - (n - 1) * XFADE, 2)

    inputs = [img for _, img in plan]
    chains = []
    for idx, (typ, _) in enumerate(plan):
        d = durs[idx]
        if typ == "intro":
            chains += mv.f_textcard(idx, d, playfair, inter, f"{ddir}/t_intro1.txt", f"{ddir}/t_intro2.txt")
        elif typ == "outro":
            chains += mv.f_textcard(idx, d, playfair, inter,
                                    f"{ddir}/t_outro1.txt", f"{ddir}/t_outro2.txt", f"{ddir}/t_outro3.txt")
        else:
            chains += f_bg(idx, d)

    use_subs = bool(segs)
    if use_subs:
        mv.write_text(P("subs.ass"), mv.build_ass(segs, total))
    last_v = "[vmix]" if use_subs else "[vout]"
    prev, cum = "[v0]", durs[0]
    for i in range(1, n):
        out = last_v if i == n - 1 else f"[x{i}]"
        chains.append(f"{prev}[v{i}]xfade=transition={mv.TRANSITION}:duration={XFADE}:offset={round(cum - XFADE, 3)}{out}")
        cum = round(cum + durs[i] - XFADE, 3)
        prev = out
    if use_subs:
        chains.append("[vmix]ass=subs.ass:fontsdir=fonts[vout]")

    vi = len(inputs); inputs.append(P("voice.mp3"))
    if has_music:
        mi = len(inputs); inputs.append(P("music.mp3"))
        chains.append(f"[{vi}:a]volume=1.7[vo]")
        chains.append(f"[{mi}:a]aloop=loop=-1:size=2000000000,atrim=duration={total},"
                      f"afade=t=in:st=0:d=0.6,afade=t=out:st={round(total-1.4,2)}:d=1.4,volume=0.18[mus]")
        chains.append(f"[vo][mus]amix=inputs=2:duration=longest:normalize=0,atrim=duration={total}[a]")
    else:
        chains.append(f"[{vi}:a]volume=1.7,apad,atrim=duration={total}[a]")

    filter_text = ";\n".join(c.rstrip().rstrip(";").rstrip() for c in chains)
    mv.write_text(P("filter.txt"), filter_text)

    in_args = " ".join(f'-i "{os.path.basename(p)}"' for p in inputs)
    run_sh = f"""#!/usr/bin/env bash
set -e
cd {ddir}
ffmpeg -y -hide_banner -loglevel error \\
 {in_args} \\
 -filter_complex_script filter.txt \\
 -map "[vout]" -map "[a]" \\
 -t {total} -r {FPS} \\
 -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 \\
 -c:a aac -b:a 160k -ar 44100 \\
 -movflags +faststart \\
 reel.mp4
echo OK
"""
    mv.write_text(P("run.sh"), run_sh)

    caption = (
        f"{poema}\n\n"
        "💛 Guárdalo y dedícaselo a quien amas 💌\n"
        "📲 Síguenos @sorpresas_en_bogota para más\n\n"
        "#poemas #frasesdeamor #amor #regalosbogota #sorpresasbogota"
    )
    mv.write_text(P("caption.txt"), caption)

    print(f"\n  segmentos: {n} · durs: {durs} · total: {total}s · subs: {use_subs}")
    if dry:
        print("\n--- DRY RUN ---\n" + filter_text)
        return

    print("\n🎬 ffmpeg (Debian)…")
    r = mv.debian(f"bash {ddir}/run.sh")
    if r.returncode != 0 or not os.path.exists(P("reel.mp4")):
        sys.stderr.write((r.stdout or "") + "\n" + (r.stderr or "") + "\n")
        raise SystemExit(f"✗ ffmpeg falló (code {r.returncode})")
    size = os.path.getsize(P("reel.mp4")) / 1024 / 1024
    print(f"\n✅ reel.mp4 (poema) · {size:.2f} MB · {total}s · {W}x{H}\n   {P('reel.mp4')}")


if __name__ == "__main__":
    main()
