#!/usr/bin/env bash
# Cloud-friendly ffmpeg-only renderer for BE TikTok bot.
# In: $WORK/clip0.mp4 $WORK/clip1.mp4 $WORK/voice.wav $WORK/script.txt $WORK/captions.srt
# Vars: CHIP (top topic), FONT_DIR
# Out: $WORK/reel.mp4
set -euo pipefail
WORK="${WORK:-/tmp/tt-work}"
FONT_DIR="${FONT_DIR:-/tmp/fonts}"
CHIP="${CHIP:-FUTURE OF WORK}"

cd "$WORK"

# 1. Concat the two clips into one continuous reel
ffmpeg -y -hide_banner -loglevel error \
  -i clip0.mp4 -i clip1.mp4 \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]; \
                   [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v1]; \
                   [v0][v1]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -an concat.mp4

# 2. Trim concat to match voice duration (no dead air)
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 voice.wav)
ffmpeg -y -hide_banner -loglevel error -i concat.mp4 -t "$DUR" -c copy bg_trimmed.mp4

# 3. Convert SRT to ASS with bold-cream Inter style
ffmpeg -y -hide_banner -loglevel error -i captions.srt captions.ass
python3 - <<'PY'
import re
ass = open('captions.ass').read()
new_style = "Style: Default,Inter Black,72,&H00E6EFF4,&H000000FF,&H00141A1A,&H80000000,1,0,0,0,100,100,0,0,1,5,3,5,80,80,300,1"
ass = re.sub(r'Style:\s*Default[^\n]+', new_style, ass)
open('captions.ass', 'w').write(ass)
PY

# 4. Final render: bg_trimmed + subtitles burn + brand bar + topic chip
ffmpeg -y -hide_banner -loglevel error \
  -i bg_trimmed.mp4 -i voice.wav \
  -vf "subtitles=captions.ass:fontsdir=${FONT_DIR},\
drawbox=x=0:y=1820:w=1080:h=100:color=black@0.45:t=fill,\
drawtext=fontfile=${FONT_DIR}/Inter-Bold.ttf:text='BEYOND ELEVATION':fontsize=28:fontcolor=#F4EFE6:x=(w-text_w)/2:y=1850,\
drawtext=fontfile=${FONT_DIR}/Inter-Medium.ttf:text='@itshayatamin':fontsize=22:fontcolor=#C5A572:x=(w-text_w)/2:y=1888,\
drawtext=fontfile=${FONT_DIR}/Inter-Bold.ttf:text='${CHIP}':fontsize=32:fontcolor=#C5A572:bordercolor=#1A1814:borderw=2:x=(w-text_w)/2:y=220:enable='lt(t,2.5)'" \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 \
  -shortest reel.mp4

ls -la reel.mp4 | awk '{print "OUT:", $5, $9}'
