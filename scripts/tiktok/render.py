#!/usr/bin/env python3
"""TikTok bot renderer: Veo clips + Kokoro voice + Inter captions + warm grade. No dead air."""
import os, sys, re, json, argparse, urllib.request
import numpy as np
from moviepy import (
    VideoFileClip, AudioFileClip, TextClip, CompositeVideoClip,
    ColorClip, concatenate_videoclips, ImageClip, vfx,
)
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
COLOR_CREAM = '#F4EFE6'
COLOR_INK = '#1A1814'
COLOR_GOLD = '#C5A572'

def warm_grade(get_frame, t):
    f = get_frame(t).astype(np.float32)
    f = np.where(f < 60, f * 1.15 + 8, f)
    f[..., 0] = np.clip(f[..., 0] * 1.05 + 5, 0, 255)
    f[..., 1] = np.clip(f[..., 1] * 1.02 + 2, 0, 255)
    f[..., 2] = np.clip(f[..., 2] * 0.92, 0, 255)
    f += np.random.normal(0, 2.5, f.shape)
    return np.clip(f, 0, 255).astype(np.uint8)

def make_vignette():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    overlay = Image.new('L', (W, H), 0)
    draw = ImageDraw.Draw(overlay)
    for i in range(120):
        a = int(60 * (i / 120))
        draw.rectangle([i, i, W - i, H - i], outline=a)
    overlay = overlay.filter(ImageFilter.GaussianBlur(60))
    img.putalpha(overlay)
    return np.array(img)

def parse_srt(path):
    cues = []
    for block in open(path).read().strip().split('\n\n'):
        lines = block.strip().split('\n')
        if len(lines) < 3: continue
        m = re.match(r'(\d+):(\d+):([\d,\.]+)\s+-->\s+(\d+):(\d+):([\d,\.]+)', lines[1])
        if not m: continue
        def ts(h, mn, s): return int(h)*3600 + int(mn)*60 + float(s.replace(',', '.'))
        cues.append((ts(*m.group(1,2,3)), ts(*m.group(4,5,6)), ' '.join(lines[2:]).strip()))
    return cues

def build(args):
    voice = AudioFileClip(args.voice)
    DUR = voice.duration

    n = len(args.clips)
    per = DUR / n

    video_clips = []
    for path in args.clips:
        c = VideoFileClip(path).subclipped(0, min(per + 0.1, VideoFileClip(path).duration))
        scale = max(W / c.w, H / c.h)
        c = c.resized(scale)
        c = c.cropped(x_center=c.w/2, y_center=c.h/2, width=W, height=H)
        c = c.transform(warm_grade)
        c = c.resized(lambda t: 1.0 + 0.018 * t)
        c = c.cropped(x_center=W/2, y_center=H/2, width=W, height=H)
        video_clips.append(c)

    bg = concatenate_videoclips(video_clips, method='compose').with_fps(FPS)
    bg = bg.subclipped(0, min(bg.duration, DUR))
    DUR = bg.duration

    cues = parse_srt(args.srt)
    caption_clips = []
    for start, end, text in cues:
        if start >= DUR: continue
        end = min(end, DUR)
        d = max(end - start, 0.2)
        try:
            tc = TextClip(
                text=text, font=args.inter_black, font_size=72,
                color=COLOR_CREAM, stroke_color=COLOR_INK, stroke_width=4,
                method='caption', size=(int(W*0.78), int(H*0.32)),
                text_align='center', interline=-6,
                vertical_align='center', horizontal_align='center',
            ).with_start(start).with_duration(d).with_position(('center', 720))
            caption_clips.append(tc)
        except Exception as e:
            print(f'skip "{text}": {e}', file=sys.stderr)

    chip = TextClip(
        text=args.chip, font=args.inter_bold, font_size=32,
        color=COLOR_GOLD, stroke_color=COLOR_INK, stroke_width=2,
    ).with_start(0).with_duration(min(2.5, DUR)).with_position(('center', 220)).with_effects([vfx.FadeOut(0.4)])

    cta_start = max(0, DUR - 2.0)
    cta = TextClip(
        text='FOLLOW  →  @itshayatamin', font=args.inter_black, font_size=44,
        color=COLOR_GOLD, stroke_color=COLOR_INK, stroke_width=3,
    ).with_start(cta_start).with_duration(DUR - cta_start).with_position(('center', 1500)).with_effects([vfx.FadeIn(0.3)])

    brand = TextClip(
        text='BEYOND ELEVATION', font=args.inter_bold, font_size=28,
        color=COLOR_CREAM, stroke_color=COLOR_INK, stroke_width=1,
    ).with_duration(DUR).with_position(('center', H-110))
    accent = ColorClip(size=(80, 2), color=(197, 165, 114)).with_duration(DUR).with_position(('center', H-125))

    vignette = ImageClip(make_vignette(), transparent=True).with_duration(DUR)

    audio_final = voice.subclipped(0, max(0, DUR - 0.05))
    final = CompositeVideoClip(
        [bg, vignette, *caption_clips, chip, cta, accent, brand],
        size=(W, H)
    ).with_audio(audio_final).with_duration(max(0, DUR - 0.05))

    final.write_videofile(
        args.out, fps=FPS, codec='libx264', audio_codec='aac',
        preset='medium', bitrate='8000k', threads=4, logger=None,
    )
    print(f'OK: {args.out} ({DUR:.1f}s)')

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--voice', required=True)
    p.add_argument('--srt', required=True)
    p.add_argument('--clips', nargs='+', required=True)
    p.add_argument('--chip', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--inter-black', required=True)
    p.add_argument('--inter-bold', required=True)
    build(p.parse_args())
