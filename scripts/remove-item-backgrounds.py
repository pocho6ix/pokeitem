#!/usr/bin/env python3
"""
Remove the white background from every sealed-product image in
`public/images/items/` and save a transparent PNG in place.

Usage:
    # one-off install (first run only)
    pip install "rembg[cpu]" pillow

    # dry run — list what would be processed, touch nothing
    python scripts/remove-item-backgrounds.py --dry-run

    # real run (writes .png next to each .jpg, then deletes the .jpg)
    python scripts/remove-item-backgrounds.py

    # preview on 5 random files into a side folder (for QA)
    python scripts/remove-item-backgrounds.py --sample 5 --out out-preview

    # process a specific pattern (e.g. just mega-evolution)
    python scripts/remove-item-backgrounds.py --pattern "mega-evolution-*"

Notes:
  - Replaces `.jpg` with `.png` side-by-side. Components that reference
    `/images/items/<slug>.jpg` should be updated OR we keep both for a
    grace period. Default: keep `.jpg` until `--commit` is passed.
  - rembg is slow on first run (model download, ~170 MB). Subsequent
    runs are fast: ~0.2 s/image on Apple Silicon CPU, ~0.05 s on MPS/GPU.
  - Existing `.png` files with the same stem are skipped unless
    `--force` is passed.
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = REPO_ROOT / "public" / "images" / "items"


def iter_sources(src_dir: Path, pattern: str) -> list[Path]:
    return sorted(src_dir.glob(f"{pattern}.jpg"))


def process_one(
    src: Path,
    out_dir: Path,
    session,
    force: bool,
    commit: bool,
) -> tuple[str, Path]:
    from PIL import Image  # lazy import so --help works without pillow

    dst = out_dir / f"{src.stem}.png"
    if dst.exists() and not force:
        return ("skip-exists", dst)

    with open(src, "rb") as f:
        data = f.read()

    # Lazy import inside the worker
    from rembg import remove  # type: ignore[import-not-found]

    cut = remove(data, session=session)

    out_dir.mkdir(parents=True, exist_ok=True)
    with open(dst, "wb") as f:
        f.write(cut)

    # Sanity check: make sure we wrote a valid RGBA PNG
    with Image.open(dst) as img:
        if img.mode != "RGBA":
            img.convert("RGBA").save(dst, format="PNG")

    if commit and out_dir == src.parent:
        try:
            src.unlink()
            return ("ok-replaced", dst)
        except OSError as e:
            print(f"  warn: failed to unlink {src.name}: {e}", file=sys.stderr)
            return ("ok-kept-jpg", dst)

    return ("ok", dst)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", default=str(DEFAULT_DIR), help="Source dir (default: public/images/items)")
    parser.add_argument("--out", default=None, help="Output dir (default: same as --src, in place)")
    parser.add_argument("--pattern", default="*", help="Glob pattern for filenames (without extension)")
    parser.add_argument("--dry-run", action="store_true", help="Print the list and exit")
    parser.add_argument("--sample", type=int, default=0, help="Process only N random files (for QA)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing .png outputs")
    parser.add_argument("--commit", action="store_true", help="Delete the source .jpg after success (only if out==src)")
    parser.add_argument("--model", default="isnet-general-use", help="rembg model name (try u2net, isnet-general-use)")

    args = parser.parse_args()

    src_dir = Path(args.src).resolve()
    out_dir = Path(args.out).resolve() if args.out else src_dir

    if not src_dir.exists():
        print(f"Error: source directory does not exist: {src_dir}", file=sys.stderr)
        return 1

    files = iter_sources(src_dir, args.pattern)
    if args.sample > 0 and args.sample < len(files):
        files = random.sample(files, args.sample)
        files.sort()

    print(f"Source:       {src_dir}")
    print(f"Output:       {out_dir}")
    print(f"Pattern:      {args.pattern}")
    print(f"Candidates:   {len(files)}")
    if args.dry_run:
        for f in files[:20]:
            print(f"  {f.name}")
        if len(files) > 20:
            print(f"  ... and {len(files) - 20} more")
        return 0

    if not files:
        print("Nothing to do.")
        return 0

    try:
        from rembg import new_session  # type: ignore[import-not-found]
    except ImportError:
        print("Error: rembg not installed. Run: pip install 'rembg[cpu]' pillow", file=sys.stderr)
        return 1

    session = new_session(args.model)

    # Process sequentially — rembg isn't particularly thread-safe, and
    # the overhead of spawning a pool for ~600 files isn't worth it.
    counts = {"ok": 0, "ok-replaced": 0, "ok-kept-jpg": 0, "skip-exists": 0, "error": 0}
    for i, f in enumerate(files, 1):
        try:
            status, dst = process_one(f, out_dir, session, args.force, args.commit)
            counts[status] = counts.get(status, 0) + 1
            if i % 20 == 0 or i == len(files):
                print(f"  [{i}/{len(files)}] {status} — {f.name} -> {dst.name}")
        except Exception as e:
            counts["error"] += 1
            print(f"  [{i}/{len(files)}] ERROR — {f.name}: {e}", file=sys.stderr)

    print("\nDone.")
    for k, v in counts.items():
        if v > 0:
            print(f"  {k}: {v}")
    return 0 if counts["error"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
