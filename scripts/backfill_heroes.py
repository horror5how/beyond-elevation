#!/usr/bin/env python3
"""Backfill hero art for every post still on the default og-image placeholder.

Generates house-style Gemini art per post, compresses it, sets heroImage in
data/posts.json, regenerates the static pages, and commits/pushes in batches
so the run is resumable and each push deploys finished pages.

Usage: python3 scripts/backfill_heroes.py [limit]
Needs GEMINI_API_KEY in env. Safe to re-run: skips posts whose image exists.
"""

import base64
import json
import os
import subprocess
import sys
import time

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "data", "posts.json")
IMGDIR = os.path.join(ROOT, "assets", "img", "insights")
DEFAULT = "../assets/og-image.jpg"
BATCH = 25

HOUSE_STYLE = (
    "A gallery grade editorial artwork, not a photo. Painterly, textural oil painting "
    "meets modern collage. Deep, considered composition with one strong central metaphor "
    "that makes the subject instantly recognisable. Muted warm palette on cream and ink, "
    "restrained accents. No text, no letters, no logos, no watermarks, no user interface "
    "screenshots. Must not look like stock photography or generic AI rendering. "
    "Subject of the artwork: {topic}"
)


def gen_image(topic, out):
    key = os.environ["GEMINI_API_KEY"]
    last = None
    for attempt in range(3):
        try:
            r = requests.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
                params={"key": key},
                json={
                    "contents": [{"parts": [{"text": HOUSE_STYLE.format(topic=topic)}]}],
                    "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
                },
                timeout=110,
            )
            if r.status_code == 429:
                time.sleep(30 * (attempt + 1))
                last = "429"
                continue
            r.raise_for_status()
            for part in r.json()["candidates"][0]["content"]["parts"]:
                if "inlineData" in part:
                    with open(out, "wb") as f:
                        f.write(base64.b64decode(part["inlineData"]["data"]))
                    subprocess.run(
                        ["sips", "-Z", "1400", "-s", "format", "jpeg", "-s",
                         "formatOptions", "72", out, "--out", out + ".tmp"],
                        check=True, capture_output=True)
                    os.replace(out + ".tmp", out)
                    return True
            last = "no image part"
        except Exception as e:  # noqa: BLE001
            last = str(e)[:200]
        time.sleep(8 * (attempt + 1))
    print(f"  FAILED: {last}", flush=True)
    return False


def git(*args, ok_fail=False):
    r = subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
    if r.returncode != 0 and not ok_fail:
        print(f"git {' '.join(args)} failed: {r.stderr[-300:]}", flush=True)
    return r.returncode == 0


def flush_batch(n_done):
    subprocess.run(["node", os.path.join(ROOT, "scripts", "build-static-posts.js")],
                   capture_output=True, cwd=ROOT)
    git("add", "data/posts.json", "assets/img/insights", "insights")
    git("commit", "-m", f"Blog: backfill hero art (batch through {n_done})", ok_fail=True)
    for _ in range(3):
        git("pull", "--rebase", "origin", "main", ok_fail=True)
        if git("push", "origin", "HEAD:main", ok_fail=True):
            print(f"  pushed at {n_done}", flush=True)
            return
        time.sleep(10)
    print(f"  PUSH FAILED at {n_done} (will retry next batch)", flush=True)


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10**9
    os.makedirs(IMGDIR, exist_ok=True)
    posts = json.load(open(POSTS))
    done = 0
    for p in posts:
        if done >= limit:
            break
        if p.get("heroImage") != DEFAULT or not p.get("slug"):
            continue
        slug = p["slug"]
        out = os.path.join(IMGDIR, f"{slug}.jpg")
        if not os.path.exists(out):
            print(f"[{done + 1}] {slug}", flush=True)
            if not gen_image(p.get("title") or slug.replace("-", " "), out):
                continue
        p["heroImage"] = f"/assets/img/insights/{slug}.jpg"
        done += 1
        if done % BATCH == 0:
            json.dump(posts, open(POSTS, "w"), indent=2)
            with open(POSTS, "a") as f:
                f.write("\n")
            flush_batch(done)
    json.dump(posts, open(POSTS, "w"), indent=2)
    with open(POSTS, "a") as f:
        f.write("\n")
    flush_batch(done)
    print(f"DONE: {done} heroes backfilled", flush=True)


if __name__ == "__main__":
    main()
