#!/bin/bash
# Generate 4s idle-motion loops for the 10 hero portraits via inference.sh
# Google Veo 3.1 Fast (720p, no audio, ~$0.32 each, ~$3.20 total), then
# compress to tiny silent mp4 loops in assets/video/. Re-runnable: skips
# stems whose output already exists. Run from anywhere.
set -uo pipefail
cd "$(dirname "$0")/.."
SCRATCH=$(mktemp -d)
PROMPT="Subtle natural idle motion: gentle breathing, tiny head and shoulder movement, a soft blink, relaxed micro-expression. Camera completely locked, framing and background unchanged. Calm studio portrait, no gestures, no zoom."
STEMS="founder1b founder2 founder3 founder4 founder5 founder6 founder7 founder8b founder9 founder10"
for stem in $STEMS; do
  out="assets/video/${stem}.mp4"
  [ -f "$out" ] && { echo "skip $stem (exists)"; continue; }
  echo "== $stem =="
  /opt/homebrew/bin/ffmpeg -y -loglevel error -i "assets/img/${stem}.webp" "$SCRATCH/${stem}.jpg" || { echo "convert failed: $stem"; continue; }
  uri=$(infsh file upload "$SCRATCH/${stem}.jpg" 2>&1 | grep -oE 'https://[^ ]+\.jpg' | tail -1)
  [ -z "$uri" ] && { echo "upload failed: $stem"; continue; }
  printf '%s' "{\"prompt\":\"$PROMPT\",\"image\":\"$uri\",\"duration\":4,\"generate_audio\":false,\"resolution\":\"720p\",\"aspect_ratio\":\"9:16\",\"num_videos\":1}" > "$SCRATCH/${stem}.json"
  raw=$(infsh app run google/veo-3-1-fast --input "$SCRATCH/${stem}.json" 2>&1)
  url=$(echo "$raw" | grep -oE 'https://[^ "]+\.mp4[^ "]*' | tail -1)
  [ -z "$url" ] && { echo "no result url for $stem"; echo "$raw" | tail -5; continue; }
  curl -sSfL "$url" -o "$SCRATCH/${stem}-raw.mp4" || { echo "download failed: $stem"; continue; }
  # lightest web loop: 480px wide, crop 9:16 -> 3:4 to match the stills, no audio
  /opt/homebrew/bin/ffmpeg -y -loglevel error -i "$SCRATCH/${stem}-raw.mp4" -t 4 -an \
    -vf "scale=480:-2,crop=480:640:(iw-480)/2:(ih-640)/3,fps=24" \
    -c:v libx264 -preset veryslow -crf 28 -pix_fmt yuv420p -movflags +faststart "$out" \
    || { echo "compress failed: $stem"; continue; }
  echo "done: $out ($(du -h "$out" | cut -f1))"
done
echo; echo "Files in assets/video/:"; ls -lh assets/video/ 2>/dev/null
