#!/usr/bin/env python3
"""
Apply the fix for broken rembg PNGs using already-computed u2net outputs
in /tmp/rembg-u2net-preview/. For each suspect:
  1. If the u2net output has higher coverage AND is above the accept
     threshold → swap it in.
  2. Otherwise, restore the original JPG from git HEAD~1 of the PNG-swap
     commit (3cbf3ea^) — white background but the product stays
     recognizable.

Usage:
    python3 scripts/apply-rembg-fix.py --dry-run
    python3 scripts/apply-rembg-fix.py --commit
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "public" / "images" / "items"
U2NET_DIR = Path("/tmp/rembg-u2net-preview")


def alpha_coverage(path: Path) -> float:
    from PIL import Image
    with Image.open(path) as img:
        img = img.convert("RGBA")
        alpha = img.split()[-1]
        total = alpha.size[0] * alpha.size[1]
        visible = sum(1 for a in alpha.getdata() if a > 10)
        return 100.0 * visible / total


def restore_jpg(name_png: str, commit: str = "3cbf3ea^") -> bytes | None:
    name_jpg = name_png.replace(".png", ".jpg")
    try:
        return subprocess.check_output(
            ["git", "show", f"{commit}:public/images/items/{name_jpg}"],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=float, default=35.0)
    parser.add_argument("--min-accept", type=float, default=45.0)
    parser.add_argument("--commit", action="store_true")
    args = parser.parse_args()

    pngs = sorted(DIR.glob("*.png"))
    improved = fallback = kept = missing = 0

    for png in pngs:
        cov_isnet = alpha_coverage(png)
        if cov_isnet >= args.threshold:
            continue  # already fine

        u2net_path = U2NET_DIR / png.name
        cov_u2net = alpha_coverage(u2net_path) if u2net_path.exists() else -1

        if cov_u2net >= args.min_accept and cov_u2net > cov_isnet:
            tag = "UP"
            if args.commit:
                png.write_bytes(u2net_path.read_bytes())
            improved += 1
        else:
            # Fall back to JPG.
            jpg_bytes = restore_jpg(png.name)
            if jpg_bytes is None:
                tag = "??"
                missing += 1
            else:
                tag = "JP"
                if args.commit:
                    (png.parent / (png.stem + ".jpg")).write_bytes(jpg_bytes)
                    png.unlink()
                fallback += 1

        print(
            f"  [{tag}] {png.name:60s} isnet={cov_isnet:5.1f}%  u2net={cov_u2net:5.1f}%"
        )

    print(f"\n  improved (u2net): {improved}")
    print(f"  fallback (jpg):   {fallback}")
    print(f"  kept as-is:       {kept}")
    if missing:
        print(f"  missing jpg:      {missing}")
    if not args.commit:
        print("\n(dry run — rerun with --commit to apply)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
