#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  backup.sh — Safety backup for the Peter1947 project (peter1947.space)
#
#  Creates a timestamped .tar.gz snapshot of the whole project in ./backups/
#  Excludes regenerable junk (node_modules, venv, __pycache__, old backups)
#  but KEEPS source code, .git history, and the SQLite database.
#
#  Usage:
#     bash backup.sh                # normal backup
#     bash backup.sh --label pre-redesign   # add a label to the filename
#     KEEP=5 bash backup.sh         # keep only the newest 5 backups
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
KEEP="${KEEP:-10}"          # how many backups to retain (override with env KEEP=)
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

LABEL=""
if [ "${1:-}" = "--label" ] && [ -n "${2:-}" ]; then
    LABEL="_$(echo "$2" | tr ' /' '__')"
fi

ARCHIVE="$BACKUP_DIR/${PROJECT_NAME}_${TIMESTAMP}${LABEL}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Backing up $PROJECT_NAME"
echo "    Source : $PROJECT_DIR"
echo "    Target : $ARCHIVE"

# Consistent DB snapshot (avoids torn reads while the app is running).
# We drop it into the project tree as habit_tracker.db.snapshot so it lands
# inside the archive next to the live file, then clean it up afterwards.
DB_SRC="$PROJECT_DIR/habit-tracker/habit_tracker.db"
DB_SNAP="$PROJECT_DIR/habit-tracker/habit_tracker.db.snapshot"
rm -f "$DB_SNAP"
if [ -f "$DB_SRC" ]; then
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "$DB_SRC" ".backup '$DB_SNAP'" && echo "    DB     : consistent snapshot added as habit_tracker.db.snapshot"
    else
        cp "$DB_SRC" "$DB_SNAP" && echo "    DB     : sqlite3 not found, plain copy added as habit_tracker.db.snapshot"
    fi
fi
trap 'rm -f "$DB_SNAP"' EXIT

tar -czf "$ARCHIVE" \
    -C "$PROJECT_DIR" \
    --exclude="./backups" \
    --exclude="*/node_modules" \
    --exclude="node_modules" \
    --exclude="*/venv" \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude="*/dist" \
    --exclude="*.tar.gz" \
    .

rm -f "$DB_SNAP"

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "==> Done. Archive size: $SIZE"

# Record a manifest line
MANIFEST="$BACKUP_DIR/MANIFEST.txt"
{
    echo "$(date '+%Y-%m-%d %H:%M:%S')  $(basename "$ARCHIVE")  ${SIZE}  git:$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo n/a) branch:$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo n/a)"
} >> "$MANIFEST"

# Prune old backups, keep newest $KEEP
echo "==> Pruning old backups (keeping newest $KEEP)..."
ls -1t "$BACKUP_DIR"/${PROJECT_NAME}_*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    echo "    removing $(basename "$old")"
    rm -f "$old"
done

echo ""
echo "Backups on disk:"
ls -1sh "$BACKUP_DIR"/${PROJECT_NAME}_*.tar.gz 2>/dev/null || echo "  (none)"
echo ""
echo "Restore with:  mkdir restored && tar -xzf <archive> -C restored"
