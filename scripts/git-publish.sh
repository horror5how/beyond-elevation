#!/usr/bin/env bash
# Deterministic blog publish + push. Survives the "remote ahead" race without
# any human/LLM reasoning, so the publisher never loads posts.json into context.
#
# Usage:  bash scripts/git-publish.sh <draft.json> "commit message"
#   draft.json = the single new post object (same JSON publish.js accepts on stdin)
#
# publish.js dedups by slug, so re-running after a reset is safe (no double-post).
set -euo pipefail

DRAFT="${1:?need draft.json path}"
MSG="${2:-"blog: publish post"}"
cd "$(dirname "$0")/.."

# Validate the draft BEFORE touching git (a bad draft must never trigger a reset).
[ -s "$DRAFT" ] || { echo "ERROR: draft '$DRAFT' missing or empty." >&2; exit 1; }
node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$DRAFT" \
  || { echo "ERROR: draft '$DRAFT' is not valid JSON." >&2; exit 1; }

git config user.name  "Hayat Amin"
git config user.email "hayat@beyondelevation.com"

for attempt in 1 2 3 4 5; do
  git fetch origin main --quiet
  git reset --hard origin/main --quiet          # take freshest remote, drop local
  node scripts/publish.js < "$DRAFT"            # idempotent append (slug dedup)
  git add data/posts.json
  # nothing to commit => slug already live on remote; we're done
  git diff --cached --quiet && { echo "Already live (slug exists). Done."; exit 0; }
  git commit -m "$MSG" --quiet
  if git push origin main --quiet 2>/dev/null; then
    echo "Pushed live on attempt $attempt."
    exit 0
  fi
  echo "Push raced (attempt $attempt) — retrying onto new remote..."
  sleep $((attempt * 2))
done

echo "ERROR: push failed after 5 attempts." >&2
exit 1
