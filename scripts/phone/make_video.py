#!/usr/bin/env python3
"""
Arma un Reel vertical (1080×1920, listo para Instagram) en el CELULAR, hecho con
todo el pipeline de MiniMax + ffmpeg:

  /api/reel        →  3 tarjetas de producto (JPEG)
  MiniMax texto    →  GUIÓN de voz en off a partir de los 3 productos
  MiniMax t2a_v2   →  VOZ en off (la duración del video sigue a la voz)
  MiniMax music    →  MÚSICA original instrumental (ducked bajo la voz)
  MiniMax image-01 →  fondos de INTRO y OUTRO temáticos (9:16)
  ffmpeg (Debian)  →  por imagen: fondo desenfocado + tarjeta centrada + Ken Burns
                      + transiciones crossfade + texto de marca (Playfair/Inter)
                      + mezcla voz(alta)+música(baja) → reel.mp4

ffmpeg corre en Debian (proot) porque el ffmpeg de Termux quedó roto por
desincronización del mirror. Todo lo demás es python puro en Termux.

Uso (en el celular, desde ~/sorpresas-worker):
  python3 make_video.py                 # categoría aleatoria, pipeline completo
  python3 make_video.py para-papa       # fuerza categoría
  python3 make_video.py --fresh-music    # música nueva con MiniMax (más lento)
  python3 make_video.py --no-voice      # sin guión/voz
  python3 make_video.py --no-ai         # sin intro/outro MiniMax
  python3 make_video.py --skip-gen      # reusa lo del workdir, solo re-renderiza ffmpeg
  python3 make_video.py --dry-run       # arma archivos, no corre ffmpeg

Salida: <workdir>/reel.mp4 + <workdir>/caption.txt
"""
import os
import sys
import json
import shutil
import subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import igkit  # noqa: E402
import occasions  # noqa: E402

# ---------------------------------------------------------------- config -----
W, H = 1080, 1920
FPS = 30
XFADE = 0.7
TRANSITION = "fade"
WEIGHT = {"intro": 2.6, "card": 3.6, "outro": 3.2}
TAIL = 0.8
VOICE_ID = "Spanish_Kind-heartedGirl"  # voz de los reels de producto
CARDS_N = 5  # nº de productos del catálogo en el Reel (3–6)

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_SRC = os.path.join(HERE, "assets", "fonts")
MUSIC_SRC = os.path.join(HERE, "assets", "music.mp3")

# Estilo 3D Pixar: personajes alegres, expresivos, colores vibrantes de marca.
STYLE = (
    "3D Pixar-style animated render, rounded friendly characters, exaggerated joyful expressions, "
    "expressive big eyes, vibrant inviting colors, smooth 3D shading with soft light bloom, "
    "warm cinematic lighting, dynamic playful energy, cream burgundy and gold palette, "
    "shallow depth of field, vertical 9:16 composition, ultra detailed, no text, no watermark, no logo"
)
# Escena con persona + acción + emoción (recibir/regalar), por categoría.
THEME = {
    "para-papa": "a cheerful cartoon father joyfully receiving a big gift box with a golden bow from his happy kids, confetti and balloons, cozy stylized living room",
    "para-mama": "a happy cartoon mother delighted while receiving a bouquet of flowers and a gift from her children, warm cozy home, soft pink and gold tones",
    "para-ella": "a joyful cartoon woman surprised and smiling while receiving red roses and a gift box from her partner, floating hearts, romantic cozy setting",
    "para-el": "a happy cartoon man delighted receiving a gift box from his partner, warm stylized cozy room",
    "amor": "a cute cartoon couple hugging joyfully holding a gift box and red roses, floating hearts, warm romantic stylized scene",
    "san-valentin": "a cute cartoon couple exchanging a heart-shaped gift, red roses and floating hearts, warm Valentine's stylized scene",
    "cumpleanos": "a joyful cartoon character celebrating a birthday with a cake, balloons, confetti and a gift box, festive stylized party",
    "desayunos-sorpresas": "a delighted cartoon character receiving a surprise breakfast tray in bed with croissants, strawberries and flowers, cozy sunny morning",
    "flores-rosas": "a happy cartoon character beaming while receiving a big bouquet of roses, warm stylized scene",
    "fresas-con-chocolate": "a cute cartoon character joyfully enjoying chocolate-covered strawberries, playful stylized scene",
}


# ------------------------------------------------------------- helpers -------
def workdirs():
    prefix = os.environ.get("PREFIX", "/data/data/com.termux/files/usr")
    rootfs = os.path.join(prefix, "var/lib/proot-distro/installed-rootfs/debian")
    return os.path.join(rootfs, "root", "sorpresas-video"), "/root/sorpresas-video"


def write_text(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def debian(cmd, timeout=420):
    """Corre `cmd` dentro de Debian (proot) usando os.system.

    Por qué os.system y no subprocess: tras muchas conexiones SSL de urllib
    (MiniMax), el fork de subprocess de Python se deadlockea en el celular (el
    hijo queda atascado entre fork y exec porque hereda un lock de Python).
    os.system hace el fork a nivel C (libc → /bin/sh) sin los handlers de fork de
    Python, así que no se cuelga. El comando se escribe a un script (evita
    problemas de comillas) y la salida se captura en un archivo.
    """
    prefix = os.environ.get("PREFIX", "/data/data/com.termux/files/usr")
    rootfs = os.path.join(prefix, "var/lib/proot-distro/installed-rootfs/debian")
    script = os.path.join(rootfs, "root", "_debian_cmd.sh")
    log = os.path.join(prefix, "tmp", "_debian_out.log")
    os.makedirs(os.path.dirname(log), exist_ok=True)
    with open(script, "w", encoding="utf-8") as f:
        f.write("#!/bin/bash\n" + cmd + "\n")
    full = f"timeout {timeout} proot-distro login debian -- bash /root/_debian_cmd.sh > '{log}' 2>&1"
    code = os.system(full)
    out = ""
    try:
        with open(log, encoding="utf-8", errors="replace") as f:
            out = f.read()
    except Exception:
        pass
    rc = os.waitstatus_to_exitcode(code) if hasattr(os, "waitstatus_to_exitcode") else (0 if code == 0 else 1)

    class _R:
        returncode = rc
        stdout = out
        stderr = out
    return _R()


def ffprobe_dur(debian_path):
    r = debian(f"ffprobe -v error -show_entries format=duration "
               f"-of default=noprint_wrappers=1:nokey=1 '{debian_path}'")
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def build_guion(cat_nombre, items):
    n = len(items)
    max_words = 30 + 12 * n          # 3→66, 5→90 palabras
    secs = round(max_words / 3.2)    # aprox. segundos al leerse
    system = (
        "Eres redactor de Sorpresas, una marca de regalos a domicilio en Bogotá con "
        "entrega el mismo día. Escribes guiones de voz en off para Reels de Instagram. "
        "RESPONDE SIEMPRE EN ESPAÑOL neutro-colombiano, NUNCA en inglés; cálido, cercano y "
        "con ritmo. Devuelve SOLO el texto que se va a leer en voz alta: sin emojis, sin "
        f"hashtags, sin comillas, sin acotaciones ni viñetas. Máximo {max_words} palabras (~{secs} s)."
    )
    lista = "\n".join(
        f"{i+1}) {it['nombre']} ({it.get('precioFormateado', '')})"
        for i, it in enumerate(items))
    user = (
        f"Tema del Reel: {cat_nombre}.\n"
        f"{n} regalos para mostrar, en este orden:\n{lista}\n\n"
        f"Escribe un gancho corto al inicio, menciona los {n} de forma natural y deseable "
        "(no como lista), y cierra invitando a pedir hoy con entrega el mismo día en Bogotá. "
        "Que fluya como una sola narración."
    )
    return igkit.minimax_text(system, user, max_tokens=2600)


# ----------------------------------------------------- subtítulos (ASS) ------
def _ass_time(s):
    if s < 0:
        s = 0
    cs = int(round(s * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    sec, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{sec:02d}.{cs:02d}"


def build_ass(segs, total, max_words=3):
    """Genera subtítulos sincronizados (caja negra, texto blanco, abajo).

    Parte cada frase de MiniMax en grupos de ~max_words palabras y reparte el
    tiempo de la frase proporcional a la longitud de cada grupo.
    """
    head = (
        "[Script Info]\n"
        "ScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n"
        # WrapStyle 0 = auto-ajuste de líneas largas dentro de los márgenes
        "WrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
        "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
        "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # blanco sobre caja negra (BorderStyle=3), negrita, centrado abajo, márgenes amplios
        "Style: Sub,Inter,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,"
        "100,100,0,0,3,16,0,2,120,120,300,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    rows = []
    for seg in segs or []:
        t0 = (seg.get("time_begin") or 0) / 1000.0
        t1 = (seg.get("time_end") or 0) / 1000.0
        text = (seg.get("text") or "").strip()
        if not text or t1 <= t0:
            continue
        words = text.split()
        chunks = [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]
        nchars = sum(len(c) for c in chunks) or 1
        cur = t0
        for c in chunks:
            dur = (t1 - t0) * (len(c) / nchars)
            start, end = cur, min(cur + dur, total)
            cur = end
            txt = c.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")
            rows.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Sub,,0,0,0,,{txt}")
    return head + "\n".join(rows) + "\n"


# ------------------------------------------------- filtergraph builders -------
# Cada función devuelve una lista de "filterchains" SIN ';' final; el ensamblado
# los une con ';\n' para garantizar un separador entre todas las cadenas.
def f_card(idx, dur):
    F = round(dur * FPS)
    p = f"c{idx}"
    return [
        f"[{idx}]split=2[{p}bg][{p}fg]",
        f"[{p}bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"boxblur=20:2,eq=brightness=-0.10:saturation=1.15[{p}bgb]",
        f"[{p}fg]scale=900:-2:force_original_aspect_ratio=decrease[{p}fgs]",
        f"[{p}bgb][{p}fgs]overlay=(W-w)/2:(H-h)/2[{p}cmp]",
        f"[{p}cmp]scale=1620:2880,zoompan=z='min(zoom+0.0007,1.14)':d={F}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
        f"setsar=1,format=yuv420p[v{idx}]",
    ]


def f_textcard(idx, dur, playfair, inter, t1, t2, t3=None):
    F = round(dur * FPS)
    p = f"t{idx}"
    y1 = int(H * 0.33)
    draws = [
        f"drawtext=fontfile={playfair}:textfile={t1}:fontcolor=white:fontsize=78:"
        f"x=(w-text_w)/2:y={y1}:shadowcolor=black@0.55:shadowx=0:shadowy=3",
        f"drawtext=fontfile={inter}:textfile={t2}:fontcolor=white:fontsize=50:"
        f"x=(w-text_w)/2:y={y1 + 150}:shadowcolor=black@0.55:shadowx=0:shadowy=2",
    ]
    if t3:
        draws.append(
            f"drawtext=fontfile={inter}:textfile={t3}:fontcolor=white@0.92:fontsize=36:"
            f"x=(w-text_w)/2:y={y1 + 232}:shadowcolor=black@0.5:shadowx=0:shadowy=2")
    draw = ",".join(draws)
    return [
        f"[{idx}]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"eq=brightness=-0.20:saturation=1.05[{p}b]",
        f"[{p}b]scale=1620:2880,zoompan=z='min(zoom+0.0006,1.10)':d={F}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1[{p}z]",
        f"[{p}z]{draw},format=yuv420p[v{idx}]",
    ]


# --------------------------------------------------------------- main --------
def main():
    igkit.load_env()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    no_ai = "--no-ai" in sys.argv
    no_voice = "--no-voice" in sys.argv
    no_music = "--no-music" in sys.argv
    fresh_music = "--fresh-music" in sys.argv
    skip_gen = "--skip-gen" in sys.argv
    categoria = args[0] if args else (occasions.occasion_category() or occasions.preferred_category())
    if categoria and not args:
        print(f"  📅 categoría auto (ocasión/datos): {categoria}")

    tdir, ddir = workdirs()
    os.makedirs(tdir, exist_ok=True)
    fonts_dir = os.path.join(tdir, "fonts")
    os.makedirs(fonts_dir, exist_ok=True)
    for fn in ("PlayfairDisplay-700.ttf", "Inter-600.ttf"):
        src = os.path.join(FONT_SRC, fn)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(fonts_dir, fn))
    playfair, inter = f"{ddir}/fonts/PlayfairDisplay-700.ttf", f"{ddir}/fonts/Inter-600.ttf"
    P = lambda n: os.path.join(tdir, n)  # noqa: E731

    if skip_gen:
        # Reusa lo que ya esté en el workdir; solo re-renderiza con ffmpeg.
        cards = [P(f"card{i}.jpg") for i in range(1, 7) if os.path.exists(P(f"card{i}.jpg"))]
        intro_img, outro_img = P("intro.jpg"), P("outro.jpg")
        use_ai = os.path.exists(intro_img) and os.path.exists(outro_img)
        use_voice = os.path.exists(P("voice.mp3"))
        voice_dur = ffprobe_dur(f"{ddir}/voice.mp3") if use_voice else 15.0
        has_music = os.path.exists(P("music.mp3"))
        segs = []
        if os.path.exists(P("subs.json")):
            try:
                segs = json.load(open(P("subs.json"), encoding="utf-8"))
            except Exception:
                segs = []
        print(f"  [skip-gen] cards={len(cards)} voz={use_voice}({voice_dur:.1f}s) "
              f"intro/outro={use_ai} música={has_music} subs={len(segs)}")
    else:
        # 1) Reel: N tarjetas + items
        reel = igkit.fetch_reel(categoria, count=CARDS_N)
        cat = reel["categoria"]
        items = reel.get("items", [])
        urls = reel["imageUrls"]
        cards = []
        print(f"  categoría: {cat['nombre']}  ·  {len(urls)} tarjetas")
        for i, u in enumerate(urls, 1):
            print(f"    ↓ card{i}")
            igkit.download(u, P(f"card{i}.jpg"))
            cards.append(P(f"card{i}.jpg"))
        write_text(P("caption.txt"), reel["caption"])

        # 2) GUIÓN + VOZ (+ subtítulos sincronizados)
        use_voice, voice_dur, segs = not no_voice, 0.0, []
        if use_voice:
            try:
                print("  ✍️  MiniMax: guión…")
                guion = build_guion(cat["nombre"], items)
                print(f"      “{guion}”")
                write_text(P("guion.txt"), guion)
                print("  🎙️  MiniMax: voz en off + subtítulos…")
                audio, segs = igkit.minimax_tts(guion, voice=VOICE_ID, subtitles=True)
                with open(P("voice.mp3"), "wb") as f:
                    f.write(audio)
                write_text(P("subs.json"), json.dumps(segs, ensure_ascii=False))
                voice_dur = ffprobe_dur(f"{ddir}/voice.mp3")
                print(f"      voz: {voice_dur:.1f}s · subtítulos: {len(segs)} frase(s)")
            except Exception as e:
                print(f"  ⚠ voz no disponible ({e}); sigo sin voz.")
                use_voice, segs = False, []
        if not use_voice or voice_dur <= 0:
            use_voice, voice_dur = False, 15.0

        # 3) INTRO/OUTRO MiniMax
        use_ai = not no_ai
        intro_img = outro_img = None
        if use_ai:
            theme = THEME.get(cat["slug"], f"an elegant premium gift scene themed around {cat['nombre']}")
            try:
                print("  🎨 MiniMax: fondo intro…")
                intro_img = P("intro.jpg")
                igkit.download(igkit.minimax_image(f"{theme}. {STYLE}", W, H)[0], intro_img)
                print("  🎨 MiniMax: fondo outro…")
                outro_img = P("outro.jpg")
                igkit.download(igkit.minimax_image(
                    "a cute cartoon delivery person happily handing a big gift box with roses to a "
                    f"delighted person at their door, confetti, bright sunny stylized street. {STYLE}",
                    W, H)[0], outro_img)
            except Exception as e:
                print(f"  ⚠ intro/outro MiniMax no disponible ({e}); sigo sin ellos.")
                use_ai, intro_img, outro_img = False, None, None

        if use_ai:
            write_text(P("t_intro1.txt"), "3 ideas para")
            write_text(P("t_intro2.txt"), cat["nombre"])
            write_text(P("t_outro1.txt"), "Síguenos")
            write_text(P("t_outro2.txt"), "@sorpresas_en_bogota")
            write_text(P("t_outro3.txt"), "Pídelo hoy · entrega el mismo día en Bogotá")

        # 4) MÚSICA: por defecto el track MiniMax incluido; --fresh-music genera nuevo
        has_music = False
        if not no_music and fresh_music:
            try:
                print("  🎵 MiniMax: música nueva…")
                with open(P("music.mp3"), "wb") as f:
                    f.write(igkit.minimax_music(
                        "Warm acoustic guitar and soft piano, romantic, cozy and uplifting, "
                        "gentle instrumental background for a Bogotá gift-delivery brand"))
                has_music = True
            except Exception as e:
                print(f"  ⚠ música MiniMax falló ({e}); uso la música incluida.")
        if not no_music and not has_music and os.path.exists(MUSIC_SRC):
            shutil.copy(MUSIC_SRC, P("music.mp3"))
            has_music = True

    total = round(voice_dur + TAIL, 2)

    # 5) Segmentos + duraciones (escaladas a la voz)
    plan = []
    if use_ai:
        plan.append(("intro", intro_img))
    for c in cards:
        plan.append(("card", c))
    if use_ai:
        plan.append(("outro", outro_img))
    n = len(plan)
    wsum = sum(WEIGHT[t] for t, _ in plan)
    target_sum = total + (n - 1) * XFADE
    durs = [round(WEIGHT[t] / wsum * target_sum, 3) for t, _ in plan]
    total = round(sum(durs) - (n - 1) * XFADE, 2)

    # 6) Filtergraph (lista de cadenas, se unen con ';\n')
    inputs = [img for _, img in plan]
    chains = []
    for idx, ((typ, _), d) in enumerate(zip(plan, durs)):
        if typ == "card":
            chains += f_card(idx, d)
        elif typ == "intro":
            chains += f_textcard(idx, d, playfair, inter, f"{ddir}/t_intro1.txt", f"{ddir}/t_intro2.txt")
        else:
            chains += f_textcard(idx, d, playfair, inter,
                                 f"{ddir}/t_outro1.txt", f"{ddir}/t_outro2.txt", f"{ddir}/t_outro3.txt")
    # subtítulos sincronizados (caja negra, texto blanco, abajo) quemados al final
    use_subs = use_voice and bool(segs)
    if use_subs:
        write_text(P("subs.ass"), build_ass(segs, total))
    last_v = "[vmix]" if use_subs else "[vout]"
    prev, cum = "[v0]", durs[0]
    for i in range(1, n):
        out = last_v if i == n - 1 else f"[x{i}]"
        chains.append(f"{prev}[v{i}]xfade=transition={TRANSITION}:duration={XFADE}:offset={round(cum - XFADE, 3)}{out}")
        cum = round(cum + durs[i] - XFADE, 3)
        prev = out
    if use_subs:
        chains.append("[vmix]ass=subs.ass:fontsdir=fonts[vout]")

    vi = mi = None
    if use_voice:
        vi = len(inputs); inputs.append(P("voice.mp3"))
    if has_music:
        mi = len(inputs); inputs.append(P("music.mp3"))

    if use_voice and has_music:
        chains.append(f"[{vi}:a]volume=1.7[vo]")
        chains.append(f"[{mi}:a]aloop=loop=-1:size=2000000000,atrim=duration={total},"
                      f"afade=t=in:st=0:d=0.6,afade=t=out:st={round(total-1.4,2)}:d=1.4,volume=0.18[mus]")
        chains.append(f"[vo][mus]amix=inputs=2:duration=longest:normalize=0,atrim=duration={total}[a]")
        amap, aenc = '-map "[a]"', "-c:a aac -b:a 160k -ar 44100"
    elif use_voice:
        chains.append(f"[{vi}:a]volume=1.7,apad,atrim=duration={total}[a]")
        amap, aenc = '-map "[a]"', "-c:a aac -b:a 160k -ar 44100"
    elif has_music:
        chains.append(f"[{mi}:a]aloop=loop=-1:size=2000000000,atrim=duration={total},"
                      f"afade=t=in:st=0:d=0.6,afade=t=out:st={round(total-1.4,2)}:d=1.4,volume=0.85[a]")
        amap, aenc = '-map "[a]"', "-c:a aac -b:a 160k -ar 44100"
    else:
        amap, aenc = "", "-an"

    # une todas las cadenas con ';' (sin ';' final)
    filter_text = ";\n".join(c.rstrip().rstrip(";").rstrip() for c in chains)
    write_text(P("filter.txt"), filter_text)

    in_args = " ".join(f'-i "{os.path.basename(p)}"' for p in inputs)
    run_sh = f"""#!/usr/bin/env bash
set -e
cd {ddir}
ffmpeg -y -hide_banner -loglevel error \\
 {in_args} \\
 -filter_complex_script filter.txt \\
 -map "[vout]" {amap} \\
 -t {total} -r {FPS} \\
 -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 \\
 {aenc} \\
 -movflags +faststart \\
 reel.mp4
echo OK
"""
    write_text(P("run.sh"), run_sh)

    print(f"\n  segmentos: {n}  ·  durs: {durs}  ·  total: {total}s")
    print(f"  voz: {use_voice}  ·  música: {has_music}  ·  intro/outro: {use_ai}")
    if dry:
        print("\n--- DRY RUN ---\n" + filter_text)
        return

    print("\n🎬 ffmpeg (Debian)…")
    r = debian(f"bash {ddir}/run.sh")
    if r.returncode != 0 or not os.path.exists(P("reel.mp4")):
        sys.stderr.write((r.stdout or "") + "\n" + (r.stderr or "") + "\n")
        raise SystemExit(f"✗ ffmpeg falló (code {r.returncode})")
    size = os.path.getsize(P("reel.mp4")) / 1024 / 1024
    print(f"\n✅ reel.mp4 · {size:.2f} MB · {total}s · {W}x{H}\n   {P('reel.mp4')}")


if __name__ == "__main__":
    main()
