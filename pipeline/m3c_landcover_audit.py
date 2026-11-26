"""Summarize candidate transitions, compare dated 3D traces, and prepare a blind packet.

Usage: python -I pipeline/m3c_landcover_audit.py [--core path/to/core-basin-gis.json] [--packet | --labels labels.csv]
Inputs are read-only. Outputs are local under build/r8a-landcover/.
"""
import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

import cv2
import numpy as np
import rasterio
from shapely.geometry import box, shape
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from m1c_kh9_1977 import digest  # noqa: E402
from m3c_landcover_candidate import A010, CLASSES, FORMABLE, OUT  # noqa: E402
from slice_areas import GRID, ROOT, load_grid  # noqa: E402

DOMINANT_SHARE = .60
PACKET_SEED = 19791203


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def grid(doc, dims):
    cls = np.full(dims, 255, dtype=np.uint8)
    for a in doc["areas"]:
        for kind, runs in a["runs"].items():
            for y, x0, x1 in runs:
                cls[y, x0:x1+1] = CLASSES.index(kind)
    return cls


def compare_core(path, g, baseline, candidate, evidence77):
    core = read(path)
    if core["crs"] != "EPSG:32650" or core["date"] != "1980-09-11":
        raise ValueError("Expected the dated September 1980 core cover in UTM 50N")
    e, n = g["meta"]["origin_top_left"]
    step = g["meta"]["cell_m"]
    l, t, r, b = core["grid_cell_edges"]
    if list(core["bounds"]) != [e+l*step, n-b*step, e+r*step, n-t*step]:
        raise ValueError("Core extent disagrees with the R8a grid")
    cover = core["layers"]["cover"]
    geoms = [shape(f["geometry"]) for f in cover]
    index = STRtree(geoms)
    result = {}
    strata = Counter()
    for dy, dx in np.argwhere(baseline[t:b, l:r] != 255):
        x, y = int(l+dx), int(t+dy)
        cell = box(e+x*step, n-(y+1)*step, e+(x+1)*step, n-y*step)
        area = Counter()
        for i in index.query(cell, predicate="intersects"):
            area[cover[i]["kind"]] += geoms[i].intersection(cell).area / cell.area
        kind, share = max(area.items(), key=lambda pair: (pair[1], pair[0]), default=("unknown", 0))
        if share < DOMINANT_SHARE:
            kind = "mixed"
        strata[(kind, bool(evidence77[y, x]))] += 1
        row = result.setdefault(kind, {"before": Counter(), "candidate": Counter()})
        row["before"][CLASSES[baseline[y, x]]] += 1
        row["candidate"][CLASSES[candidate[y, x]]] += 1
    return {"sha256": digest(path), "date": core["date"], "dominant_share": DOMINANT_SHARE,
            "note": "Dated comparison, not a confusion matrix. Mixed, model-only, and unknown are not truth labels.",
            "counts": result, "with_usable_1977": {k: strata[k, True] for k in result}}


def packet_candidates(area, before, after, exclude=frozenset()):
    """Balanced diagnostic strata, not a probability estimate of slice-wide accuracy."""
    pool = [tuple((int(y), int(x))) for y, x in np.argwhere(area > 0) if (int(x), int(y)) not in exclude]
    rng = np.random.default_rng(PACKET_SEED)
    rng.shuffle(pool)
    picked = []
    chosen = set()
    blocks = Counter()

    def take(matches, limit, max_per_block):
        for y, x in pool:
            if not limit:
                break
            block = (y//10, x//10)
            if (y, x) not in chosen and blocks[block] < max_per_block and matches(y, x):
                chosen.add((y, x))
                picked.append((y, x))
                blocks[block] += 1
                limit -= 1

    for a in sorted(int(a) for a in np.unique(area) if a):
        take(lambda y, x: area[y, x] == a, 4, 2)
    for k in range(len(CLASSES)):
        take(lambda y, x: before[y, x] != after[y, x] and k in (before[y, x], after[y, x]), 6, 4)
    take(lambda y, x: before[y, x] == after[y, x], max(0, 80-len(picked)), 4)
    rng.shuffle(picked)
    return picked


def write_packet(area, before, after, exclude):
    info = read(GRID / "kh9_1980.json")["slice"]
    x0, y0, _, _ = info["cell_box"]
    px = round(100 / info["px_m"])
    img = cv2.imread(str(GRID / info["file"]), cv2.IMREAD_UNCHANGED)
    with rasterio.open(A010 / "D3C1213-400953A010_c.tif") as ds:
        photos = [(ds.read(1), ds.read(2)), (img[:, :, 0], img[:, :, 3])]
    dest = OUT / "review"
    dest.mkdir(exist_ok=True)
    labels, key = [], []
    for i, (y, x) in enumerate(packet_candidates(area, before, after, exclude), 1):
        name = f"cell-{i:03}"
        panels = []
        for date, (gray, mask) in zip(("1977-12-03", "1980-09-11"), photos):
            edge = np.array([(y-y0-2)*px, (x-x0-2)*px])
            yy, xx = np.indices((5*px, 5*px)) + edge[:, None, None]
            inside = (yy >= 0) & (yy < gray.shape[0]) & (xx >= 0) & (xx < gray.shape[1])
            np.clip(yy, 0, gray.shape[0]-1, out=yy)
            np.clip(xx, 0, gray.shape[1]-1, out=xx)
            valid = inside & (mask[yy, xx] > 0)
            hatch = np.where((np.indices(valid.shape).sum(axis=0) % 6) == 0, 58, 28)
            raw = np.where(valid, gray[yy, xx], hatch).astype(np.uint8)
            panel = cv2.copyMakeBorder(cv2.resize(raw, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST),
                                       24, 0, 0, 0, cv2.BORDER_CONSTANT, value=28)
            covered = valid[2*px:3*px, 2*px:3*px].mean()
            cv2.putText(panel, f"{date} | {covered:.0%} cell coverage", (9, 17),
                        cv2.FONT_HERSHEY_SIMPLEX, .47, 240, 1)
            panel = cv2.cvtColor(panel, cv2.COLOR_GRAY2BGR)
            cv2.rectangle(panel, (6*px, 24+6*px), (9*px-1, 24+9*px-1), (0, 215, 255), 1)
            panels.append(panel)
        if not cv2.imwrite(str(dest / f"{name}.png"), np.hstack(panels)):
            raise OSError(f"Could not write crop {name}")
        labels.append((name, "", "", "", ""))
        key.append((name, x, y, int(area[y, x]), f"{x//10}:{y//10}", CLASSES[before[y, x]], CLASSES[after[y, x]]))
    # Keep map coordinates and predictions away from the reviewer until labels are frozen.
    for path, header, rows in (
        (dest / "labels-template.csv", ["id", "cover_1977", "cover_1980", "opening_class", "evidence_or_uncertainty"], labels),
        (OUT / "review-key.csv", ["id", "x", "y", "area", "block", "baseline", "candidate"], key),
    ):
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(rows)
    return len(labels)


def score_packet(path, before, after):
    def rows(file):
        with file.open(encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))

    key = {r["id"]: r for r in rows(OUT / "review-key.csv")}
    labels = {}
    for r in rows(path):
        name = r["id"]
        cls = r["opening_class"].strip()
        if name not in key or name in labels or cls not in {*CLASSES, "?"}:
            raise ValueError(f"Unknown/duplicate cell or missing/invalid class for {name}; use ? for unresolved")
        labels[name] = cls
    if set(labels) != set(key):
        raise ValueError("Provide a class or ? for every cell in the saved packet")
    result = {"n": len(key), "unresolved": Counter(), "note": "Balanced diagnostic sample; not slice-wide accuracy"}
    matrices = {k: np.zeros((len(CLASSES), len(CLASSES)), dtype=int) for k in ("baseline", "candidate")}
    for name, r in key.items():
        x, y = int(r["x"]), int(r["y"])
        for k, pred in (("baseline", before[y, x]), ("candidate", after[y, x])):
            if pred == 255 or r[k] != CLASSES[pred]:
                raise ValueError("The saved review key is for a different map; compare frozen maps only")
            if labels[name] == "?":
                result["unresolved"][k] += 1
            else:
                matrices[k][pred, CLASSES.index(labels[name])] += 1
    formable = np.isin(np.arange(len(CLASSES)), FORMABLE)
    for k, mat in matrices.items():
        div = lambda a, b: float(a / b) if b else None
        result[k] = {"classes": CLASSES, "confusion_predicted_by_reading": mat.tolist(),
                     "agreement": div(mat.trace(), mat.sum()),
                     "precision": {c: div(mat[i, i], mat[i, :].sum()) for i, c in enumerate(CLASSES)},
                     "recall": {c: div(mat[i, i], mat[:, i].sum()) for i, c in enumerate(CLASSES)},
                     "false_formable": int(mat[np.ix_(formable, ~formable)].sum()),
                     "false_blocked": int(mat[np.ix_(~formable, formable)].sum())}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core", type=Path)
    review = parser.add_mutually_exclusive_group()
    review.add_argument("--packet", action="store_true")
    review.add_argument("--labels", type=Path, help="completed review labels from a frozen packet")
    parser.add_argument("--exclude", type=Path, help="CSV containing x,y of previously reviewed or tuned cells")
    args = parser.parse_args()
    g = load_grid()
    old, new = (ROOT / "data/starts/slice_landcover.json", OUT / "candidate.json")
    before, after = (grid(read(p), (g["H"], g["W"])) for p in (old, new))
    if not np.array_equal(before == 255, after == 255):
        raise ValueError("Candidate does not partition exactly the baseline playable extent")
    with np.load(OUT / "features.npz") as data:
        area = data["area"]
        playable = before != 255
        if not np.array_equal(playable, area > 0) or not np.array_equal(after[playable], data["cls"][playable]):
            raise ValueError("Candidate and features are out of sync")
        result = {"baseline_sha256": digest(old), "candidate_sha256": digest(new), "areas": []}
        for i in np.unique(area[playable]):
            use = area == i
            result["areas"].append({
                "area": int(i), "cells": int(use.sum()), "changes": int((use & (before != after)).sum()),
                "formable_before": int((use & np.isin(before, FORMABLE)).sum()),
                "formable_candidate": int((use & np.isin(after, FORMABLE)).sum()),
                "kh9_1977_usable": int((use & data["kh9_1977_usable"]).sum()),
                "kh9_1980_only_built": int((use & data["built_1980_only"] & np.isin(after, (4, 5))).sum()),
                "transitions": {c: dict(Counter(CLASSES[int(k)] for k in after[use & (before == j)]))
                                for j, c in enumerate(CLASSES)},
            })
        if args.core:
            result["core_comparison"] = compare_core(args.core, g, before, after, data["kh9_1977_usable"])
    if args.packet:
        exclude = set()
        if args.exclude:
            with args.exclude.open(encoding="utf-8-sig", newline="") as f:
                exclude = {(int(r["x"]), int(r["y"])) for r in csv.DictReader(f)}
        result["blind_packet"] = {"n": write_packet(area, before, after, exclude), "seed": PACKET_SEED,
                                  "excluded_cells": len(exclude), "previous_sample_exclusions_supplied": bool(args.exclude)}
    if args.labels:
        result["blind_score"] = score_packet(args.labels, before, after)
    path = OUT / "audit.json"
    path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
