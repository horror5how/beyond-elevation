#!/usr/bin/env bash
#
# Simple daily backup. Keeps the last 7 days of your project files (minus the
# big/rebuildable stuff) under ~/backups. Runs automatically at 3am via cron.
#
set -euo pipefail

PROJECT_DIR="$HOME/beyond-elevation"
BACKUP_DIR="$HOME/backups"
STAMP="$(date +%Y-%m-%d)"
OUT="${BACKUP_DIR}/beyond-elevation-${STAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

# Make the backup (skip node_modules / .git — those are rebuildable / in GitHub)
tar \
  --exclude='node_modules' \
  --exclude='.git' \
  -czf "${OUT}" \
  -C "$(dirname "${PROJECT_DIR}")" "$(basename "${PROJECT_DIR}")"

echo "$(date) backup written: ${OUT}"

# Keep only the 7 most recent backups
ls -1t "${BACKUP_DIR}"/beyond-elevation-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
