#!/usr/bin/env python3
"""
Scan rembg-processed PNGs under public/images/items and flag the ones
where the model likely misidentified the subject — i.e. output kept a
very small non-transparent region relative to the image.

Usage:
    python3 scripts/audit-rembg-output.py
    python3 scripts/audit-rembg-output.py --threshold 15   # alpha % cut
    python3 scripts/audit-rembg-output.py --json           # machine-readable
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "public" / "images" / "items"


def alpha_coverage(path: Path) -> float:
    """Return % of pixels whose alpha > 0 (i.e. non-transparent)."""
    from PIL import Image

    with Image.open(path) as img:
        img = img.convert("RGBA")
        alpha = img.split()[-1]
        total = alpha.size[0] * alpha.size[1]
        # count pixels with any opacity. Treat alpha > 10 as "visible"
        visible = sum(1 for a in alpha.getdata() if a > 10)
        return 100.0 * visible / total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=float, default=15.0,
                        help="Flag files with coverage below this %% (default 15)")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    parser.add_argument("--all", action="store_true", help="List every file, not just suspects")
    args = parser.parse_args()

    files = sorted(DIR.glob("*.png"))
    rows = []
    for f in files:
        try:
            cov = alpha_coverage(f)
        except Exception as e:
            rows.append({"file": f.name, "error": str(e), "coverage": None})
            continue
        rows.append({"file": f.name, "coverage": round(cov, 2)})

    suspects = [r for r in rows if r.get("coverage") is not None and r["coverage"] < args.threshold]

    if args.json:
        print(json.dumps({
            "total": len(rows),
            "threshold": args.threshold,
            "suspects": suspects,
        }, indent=2, ensure_ascii=False))
        return 0

    print(f"Scanned: {len(rows)} PNGs")
    print(f"Threshold: < {args.threshold}% non-transparent")
    print(f"Suspects:  {len(suspects)}")
    print()

    if args.all:
        rows.sort(key=lambda r: r.get("coverage") or -1)
        for r in rows[:50]:
            print(f"  {r.get('coverage'):6.2f}%  {r['file']}")
        if len(rows) > 50:
            print(f"  ... and {len(rows) - 50} more")
    else:
        suspects.sort(key=lambda r: r["coverage"])
        for r in suspects:
            print(f"  {r['coverage']:6.2f}%  {r['file']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
