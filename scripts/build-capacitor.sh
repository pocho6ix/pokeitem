#!/bin/bash
# Static export build for Capacitor.
#
# `output: 'export'` in next.config.ts is incompatible with the Server
# Components (Prisma / getServerSession) we keep around for the Vercel web
# deployment. This script is the only moment those server pages are
# temporarily swapped out for their client-side equivalents in
# `capacitor-overrides/`, and the originals are restored on exit (success
# or failure).
#
# It also moves aside route handlers and singleton metadata files that
# can't be statically exported:
#   - src/app/api/
#   - src/app/telecharger/ (kept as a web-only download proxy)
#   - src/app/sitemap.ts / robots.ts / opengraph-image.tsx
#   - src/app/(main)/collection/[blocSlug] (legacy redirect route)
#
# Set NEXT_PUBLIC_API_BASE_URL before running so the bundled client hits
# the public API (defaults to https://api.pokeitem.fr).

set -e
cd "$(dirname "$0")/.."

OVERRIDES_DIR="capacitor-overrides"
# Backups live OUTSIDE src/ so Next never sees them during the build.
BACKUP_DIR=".capacitor-build-backup"
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# ── Tracking for restore on exit ─────────────────────────────
# One line per file: "<target>|<backup>" (no path contains `|`).
RESTORE_LOG="$BACKUP_DIR/.restore.log"
: > "$RESTORE_LOG"

cleanup() {
  set +e
  if [ -f "$RESTORE_LOG" ]; then
    # tail -r reverses (macOS equivalent of GNU tac).
    tail -r "$RESTORE_LOG" | while IFS='|' read -r target backup; do
      [ -z "$backup" ] && continue
      if [ -e "$backup" ]; then
        [ -e "$target" ] && rm -rf "$target"
        mkdir -p "$(dirname "$target")"
        mv "$backup" "$target"
      fi
    done
  fi
  [ -d "$BACKUP_DIR" ] && rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

record_restore() {
  printf '%s|%s\n' "$1" "$2" >> "$RESTORE_LOG"
}

backup_into_store() {
  # Args: source path in the repo
  local src="$1"
  local backup="$BACKUP_DIR/$(echo "$src" | sed 's|/|__|g' | sed 's|\[|_L_|g' | sed 's|\]|_R_|g' | sed 's|(|_P_|g' | sed 's|)|_Q_|g')"
  mv "$src" "$backup"
  record_restore "$src" "$backup"
}

# ── 1. Swap server page.tsx / route.ts files for the Capacitor ones ──
if [ -d "$OVERRIDES_DIR" ]; then
  while IFS= read -r override; do
    rel="${override#"$OVERRIDES_DIR"/}"
    target="$rel"
    if [ -e "$target" ]; then
      backup_into_store "$target"
    fi
    mkdir -p "$(dirname "$target")"
    cp "$override" "$target"
  done < <(find "$OVERRIDES_DIR" -type f \( -name 'page.tsx' -o -name 'page.ts' -o -name 'route.ts' -o -name 'layout.tsx' \))
fi

# ── 2. Move server-only trees out of the app tree so Next skips them ─
move_aside() {
  local src="$1"
  [ -e "$src" ] && backup_into_store "$src"
}

move_aside "src/app/api"
move_aside "src/app/telecharger"
move_aside "src/app/(main)/collection/[blocSlug]"
move_aside "src/app/sitemap.ts"
move_aside "src/app/robots.ts"
move_aside "src/app/opengraph-image.tsx"

# ── 3. Build ──────────────────────────────────────────────────
export CAPACITOR_BUILD=true
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://api.pokeitem.fr}"

echo "[capacitor] CAPACITOR_BUILD=$CAPACITOR_BUILD"
echo "[capacitor] NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL"

# Regenerate the static `public/images/items/` → ItemType map the mobile
# SerieProduitsClient reads. Cheap and deterministic — runs every build
# so adding a new product artwork automatically surfaces it on iOS.
npx tsx scripts/generate-item-images-map.ts

npx prisma generate
npx next build
