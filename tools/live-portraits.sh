#!/bin/bash
# Generate 4s looping "live portrait" videos for the hero grid via Higgsfield
# (seedance1_5, 480p, 2.4 credits each — ~24 credits for all 10), then compress
# to tiny silent mp4 loops in assets/video/. Safe to re-run: skips videos that
# already exist. Run from repo root.
set -uo pipefail
cd "$(dirname "$0")/.."
SCRATCH=$(mktemp -d)
PROMPT="Subtle natural idle motion: gentle breathing, tiny head and shoulder movement, soft blink, relaxed micro-expressions. Camera locked, framing unchanged, background unchanged. Calm studio portrait, no gestures, no zoom."
STEMS="founder1b founder2 founder3 founder4 founder5 founder6 founder7 founder8b founder9 founder10"
for stem in $STEMS; do
  out="assets/video/${stem}.mp4"
  [ -f "$out" ] && { echo "skip $stem (exists)"; continue; }
  echo "== $stem =="
  /opt/homebrew/bin/ffmpeg -y -loglevel error -i "assets/img/${stem}.webp" "$SCRATCH/${stem}.jpg" || { echo "convert failed: $stem"; continue; }
  uid=$(higgsfield upload create "$SCRATCH/${stem}.jpg" | tail -1 | tr -d '[:space:]')
  [ -z "$uid" ] && { echo "upload failed: $stem"; continue; }
  raw=$(higgsfield generate create seedance1_5 \
    --prompt "$PROMPT" \
    --start-image "$uid" --duration 4 --resolution 480p --wait --wait-timeout 15m 2>&1) || { echo "generate failed: $stem: $raw"; continue; }
  url=$(echo "$raw" | grep -oE 'https://[^ ]+\.mp4[^ ]*' | tail -1)
  [ -z "$url" ] && { echo "no result url for $stem: $raw"; continue; }
  f="$SCRATCH/${stem}-raw.mp4"
  curl -sSfL "$url" -o "$f" || { echo "download failed: $stem"; continue; }
  # lightest usable web format: 480px wide h264, no audio, faststart
  /opt/homebrew/bin/ffmpeg -y -loglevel error -i "$f" -t 4 -an \
    -vf "scale=480:-2,fps=24" -c:v libx264 -preset veryslow -crf 28 \
    -pix_fmt yuv420p -movflags +faststart "$out" && rm -f "$f"
  echo "done: $out ($(du -h "$out" | cut -f1))"
done
echo "All done. Files in assets/video/:"; ls -lh assets/video/
