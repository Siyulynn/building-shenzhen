"""M1c: resample georeferenced KH-9 segments onto the Spike A grid and report coverage per slice area.

Usage: python -I pipeline/m1c_kh9_mosaic.py <tag> <source_id>:<segment> [...]   (earlier segments win overlaps)
  e.g. kh9_1980 kh9_1980_09_11_a048:c kh9_1980_09_11_f048:b
Outputs (apps/map-spike/public/grid/, git-ignored):
  <tag>.png            whole grid at 25 m (4 px per cell), grayscale with alpha (transparent = no image)
  <tag>_slice.png      the playable areas' bounding box at 6.25 m (16 px per cell)
  <tag>.json           segments, accuracy, the crop's cell box, coverage per slice area
Models come from data/raw/sources/<source_id>/reduced/<segment>_georef.json (pipeline/m1c_kh9_georef.py).
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parent))
from m1c_kh9_georef import Poly, to8  # noqa: E402
from slice_areas import AREAS, GRID, ROOT, area_mask, load_grid  # noqa: E402

MARGIN = (40, 60)  # r8 pixels of film border and data block to ignore (x, y)


def load_segment(sid, seg):
    d = ROOT / "data/raw/sources" / sid / "reduced"
    meta = json.loads((d / f"{seg}_georef.json").read_text(encoding="utf-8"))
    with rasterio.open(d / meta["reduced_file"]) as s:
        img = s.read(1)
    return meta, img, Poly.from_json(meta["inverse"])


def render(segs, x0, y1, px_m, W, H):
    """Grayscale + alpha over a UTM box (top-left x0, y1), px_m metres per pixel."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    E = (x0 + (xx + 0.5) * px_m).ravel()
    N = (y1 - (yy + 0.5) * px_m).ravel()
    gray = np.zeros((H, W), np.uint8)
    alpha = np.zeros((H, W), np.uint8)
    for meta, img, inv in segs:
        p = inv(np.stack([E, N], 1)).astype(np.float32)
        mx, my = p[:, 0].reshape(H, W), p[:, 1].reshape(H, W)
        h, w = img.shape
        inside = (mx >= MARGIN[0]) & (mx < w - MARGIN[0]) & (my >= MARGIN[1]) & (my < h - MARGIN[1])
        src = img if px_m >= 15 else img
        if px_m >= 15:  # area-average the 7.5 m scan before sampling at coarser spacing
            k = int(round(px_m / 7.5))
            src = cv2.blur(img, (k, k))
        vals = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderValue=0)
        take = inside & (alpha == 0) & (vals > 3)
        gray[take] = vals[take]
        alpha[take] = 255
    if alpha.any():
        gray = to8(gray.astype(np.float32), alpha > 0)
        gray[alpha == 0] = 0
    return gray, alpha


def main():
    tag, specs = sys.argv[1], sys.argv[2:]
    g = load_grid()
    W, H, cell = g["W"], g["H"], g["meta"]["cell_m"]
    x0, y1 = g["meta"]["origin_top_left"]
    segs = [load_segment(*s.split(":")) for s in specs]

    gray, alpha = render(segs, x0, y1, 25.0, W * 4, H * 4)
    cv2.imwrite(str(GRID / f"{tag}.png"), np.dstack([gray, gray, gray, alpha]))

    areas = area_mask(g)
    ys, xs = np.nonzero((areas >= 1) & (areas <= 7))
    box = [int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 3, int(ys.max()) + 3]  # x0, y0, x1, y1 cells
    bx0, by1 = x0 + box[0] * cell, y1 - box[1] * cell
    sg, sa = render(segs, bx0, by1, 6.25, (box[2] - box[0]) * 16, (box[3] - box[1]) * 16)
    cv2.imwrite(str(GRID / f"{tag}_slice.png"), np.dstack([sg, sg, sg, sa]))

    covered = alpha.reshape(H, 4, W, 4).max(axis=(1, 3)) > 0     # per grid cell
    land = g["water"] == 0
    cov = [{"area": a, "key": k, "covered_share": round(float(covered[(areas == a) & land].mean()), 2)}
           for a, (k, _) in AREAS.items()]
    out = {
        "tag": tag,
        "segments": [{"source": m["source"], "segment": m["segment"], "heldout": m["heldout_by_order"]["3"]
                      if "3" in m["heldout_by_order"] else m["heldout_by_order"][3], "status": m["status"]}
                     for m, _, _ in segs],
        "overview": {"file": f"{tag}.png", "px_m": 25.0},
        "slice": {"file": f"{tag}_slice.png", "px_m": 6.25, "cell_box": box},
        "coverage": cov,
        "caveats": [
            "KH-9 Hexagon panoramic scans, registered to Landsat 1979 (60 m, ~27 m RMSE): absolute error is a few "
            "tens of metres. Good for 100 m cells and for spotting features; not for tracing footprints.",
            "Hills shift with relief displacement in a panoramic camera; control points are on low, flat land.",
            "Dated to the acquisition: evidence for that date, not for 1979.",
        ],
    }
    (GRID / f"{tag}.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(cov, ensure_ascii=False))


if __name__ == "__main__":
    main()
