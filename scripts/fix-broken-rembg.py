#!/usr/bin/env python3
"""
Fix PNGs under public/images/items/ where the isnet-general-use model
misidentified the subject. Workflow:

  1. Identify suspects by alpha-coverage threshold (default <35%).
  2. For each suspect, restore the original .jpg from git HEAD~1 to
     /tmp/rembg-originals/.
  3. Re-run rembg with the `u2net` model on the original.
  4. If the u2net result has higher coverage AND is at least as good
     as a minimum floor (default 40%), swap it in. Otherwise fall
     back to the original JPG (keep the white background — less bad
     than a broken subject).

Usage:
    python3 scripts/fix-broken-rembg.py                 # dry-run, just report
    python3 scripts/fix-broken-rembg.py --commit        # actually swap files
    python3 scripts/fix-broken-rembg.py --threshold 40  # be more aggressive
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "public" / "images" / "items"
ORIG_DIR = Path("/tmp/rembg-originals")
ORIG_DIR.mkdir(exist_ok=True)


def alpha_coverage(path: Path) -> float:
    from PIL import Image
    with Image.open(path) as img:
        img = img.convert("RGBA")
        alpha = img.split()[-1]
        total = alpha.size[0] * alpha.size[1]
        visible = sum(1 for a in alpha.getdata() if a > 10)
        return 100.0 * visible / total


def restore_jpg(name_png: str) -> Optional[Path]:
    """Extract the original .jpg from git HEAD~1 before the PNG swap commit."""
    name_jpg = name_png.removesuffix(".png") + ".jpg"
    dst = ORIG_DIR / name_jpg
    if dst.exists():
        return dst
    try:
        # 3cbf3ea is the PNG commit; HEAD~1 from it is the last state with jpg
        out = subprocess.check_output(
            ["git", "show", f"3cbf3ea^:public/images/items/{name_jpg}"],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return None
    dst.write_bytes(out)
    return dst


def rembg_with_model(src_jpg: Path, model: str, out_png: Path) -> bool:
    from rembg import remove, new_session  # type: ignore[import-not-found]
    from PIL import Image

    session = new_session(model)
    data = src_jpg.read_bytes()
    cut = remove(data, session=session)
    out_png.write_bytes(cut)
    # sanity check
    with Image.open(out_png) as img:
        if img.mode != "RGBA":
            img.convert("RGBA").save(out_png, format="PNG")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=float, default=35.0,
                        help="Flag PNGs below this coverage %%")
    parser.add_argument("--min-accept", type=float, default=40.0,
                        help="Minimum coverage required to accept the u2net output")
    parser.add_argument("--commit", action="store_true",
                        help="Actually swap in improved PNGs (else dry-run)")
    parser.add_argument("--fallback-jpg", action="store_true",
                        help="When u2net fails, drop the PNG and keep the original jpg "
                             "(means white bg for that item)")
    args = parser.parse_args()

    pngs = sorted(DIR.glob("*.png"))
    suspects: list[tuple[Path, float]] = []
    for p in pngs:
        cov = alpha_coverage(p)
        if cov < args.threshold:
            suspects.append((p, cov))

    suspects.sort(key=lambda t: t[1])
    print(f"Suspects (cov < {args.threshold}%): {len(suspects)}\n")

    improved = kept = fallback = failed = 0
    preview_u2net = Path("/tmp/rembg-u2net-preview")
    preview_birefnet = Path("/tmp/rembg-birefnet-preview")
    preview_u2net.mkdir(exist_ok=True)
    preview_birefnet.mkdir(exist_ok=True)

    for png, cov_isnet in suspects:
        jpg = restore_jpg(png.name)
        if jpg is None:
            print(f"  [skip] no original jpg for {png.name}")
            failed += 1
            continue

        u2net_out = preview_u2net / png.name
        try:
            rembg_with_model(jpg, "u2net", u2net_out)
        except Exception as e:
            print(f"  [err ] u2net failed on {png.name}: {e}")
            failed += 1
            continue
        cov_u2net = alpha_coverage(u2net_out)

        # Only try birefnet if both isnet and u2net failed (expensive model)
        cov_bire = None
        if cov_isnet < args.min_accept and cov_u2net < args.min_accept:
            bire_out = preview_birefnet / png.name
            try:
                rembg_with_model(jpg, "birefnet-general", bire_out)
                cov_bire = alpha_coverage(bire_out)
            except Exception as e:
                print(f"  [note] birefnet failed on {png.name}: {e}")

        # Pick the best candidate.
        best_model = "isnet"
        best_cov = cov_isnet
        best_path = png  # current file
        if cov_u2net > best_cov:
            best_model, best_cov, best_path = "u2net", cov_u2net, u2net_out
        if cov_bire is not None and cov_bire > best_cov:
            best_model, best_cov, best_path = "bire", cov_bire, preview_birefnet / png.name

        tag = "  "
        note = ""

        if best_model != "isnet" and best_cov >= args.min_accept:
            tag = "UP" if best_model == "u2net" else "BR"
            if args.commit:
                png.write_bytes(best_path.read_bytes())
            improved += 1
        elif args.fallback_jpg and args.commit and best_cov < args.min_accept:
            # Every model failed — restore the original jpg (white bg but at
            # least the product is visible).
            tag = "JP"
            dst_jpg = png.parent / (png.stem + ".jpg")
            dst_jpg.write_bytes(jpg.read_bytes())
            png.unlink()
            fallback += 1
        else:
            tag = "  "
            kept += 1

        bire_str = f"  bire={cov_bire:5.1f}%" if cov_bire is not None else ""
        print(
            f"  [{tag}] {png.name:60s} isnet={cov_isnet:5.1f}%  "
            f"u2net={cov_u2net:5.1f}%{bire_str}  best={best_model}({best_cov:.1f}%)"
        )

    print("\nSummary:")
    print(f"  improved (u2net swapped in): {improved}")
    print(f"  kept isnet (u2net wasn't better): {kept}")
    if args.fallback_jpg and args.commit:
        print(f"  reverted to jpg (both models failed): {fallback}")
    if failed:
        print(f"  failed: {failed}")
    if not args.commit:
        print("\nDry run — rerun with --commit to apply.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
