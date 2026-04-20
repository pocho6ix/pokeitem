#!/bin/bash
# Static export build for Capacitor.
#
# `output: 'export'` in next.config.ts is incompatible with the /api/* route
# handlers we keep around for the Vercel web deployment. This script moves
# `src/app/api` and `src/app/telecharger` aside for the duration of the
# build, then restores them — whether the build succeeds or fails.
#
# Set NEXT_PUBLIC_API_BASE_URL before running so the bundled client hits
# the public API (defaults to https://api.pokeitem.fr).

set -e
cd "$(dirname "$0")/.."

API_DIR="src/app/api"
API_DIR_BACKUP=".capacitor-build-api"
DL_DIR="src/app/telecharger"
DL_DIR_BACKUP=".capacitor-build-telecharger"
# Legacy redirect routes (e.g. /collection/[blocSlug]) — these were server
# redirects on the web build, we skip them on mobile since users only arrive
# via the canonical /collection/cartes/* path anyway.
LEGACY_DIR="src/app/(main)/collection/[blocSlug]"
LEGACY_DIR_BACKUP=".capacitor-build-legacy-collection"
# Server-only singletons (they hit Prisma or the network at request time).
MOVED_FILES=(
  "src/app/sitemap.ts"
  "src/app/robots.ts"
  "src/app/opengraph-image.tsx"
)

cleanup() {
  if [ -d "$API_DIR_BACKUP" ]; then
    rm -rf "$API_DIR"
    mv "$API_DIR_BACKUP" "$API_DIR"
  fi
  if [ -d "$DL_DIR_BACKUP" ]; then
    [ -d "$DL_DIR" ] && rm -rf "$DL_DIR"
    mv "$DL_DIR_BACKUP" "$DL_DIR"
  fi
  if [ -d "$LEGACY_DIR_BACKUP" ]; then
    [ -d "$LEGACY_DIR" ] && rm -rf "$LEGACY_DIR"
    mv "$LEGACY_DIR_BACKUP" "$LEGACY_DIR"
  fi
  for f in "${MOVED_FILES[@]}"; do
    [ -f "${f}.bak" ] && mv "${f}.bak" "$f"
  done
}
trap cleanup EXIT

# Move server-only trees out of the app tree so Next.js skips them.
[ -d "$API_DIR" ] && mv "$API_DIR" "$API_DIR_BACKUP"
[ -d "$DL_DIR" ] && mv "$DL_DIR" "$DL_DIR_BACKUP"
[ -d "$LEGACY_DIR" ] && mv "$LEGACY_DIR" "$LEGACY_DIR_BACKUP"
for f in "${MOVED_FILES[@]}"; do
  [ -f "$f" ] && mv "$f" "${f}.bak"
done

export CAPACITOR_BUILD=true
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://api.pokeitem.fr}"

echo "[capacitor] CAPACITOR_BUILD=$CAPACITOR_BUILD"
echo "[capacitor] NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL"

npx prisma generate
npx next build
