"""R8a cross-validation against the 3D branch's September 1980 core-basin cover (read-only).

Usage: python -I pipeline/m3c_audit_3d.py [--core path/to/core-basin-gis.json] [--water path/to/municipal-water.bin]
Scores the shipped layer (data/starts/slice_landcover.json) and the candidate (build/r8a-landcover/candidate.json)
over the playable cells inside the core box. Writes build/r8a-landcover/audit-3d.json and prints the tables.

The 3D cover is a dated comparator (1980-09-11, hand-traced on the same KH-9 frame the classifier reads), not 1979
truth. Each 100 m cell takes the trace's dominant kind (>= DOMINANT_SHARE of the cell); mixed and unknown cells are
not scored. The ontology bridge collapses both sides to four groups, since the trace does not separate town from
village (the town mask is the only thing that does), or hill from upland:
  built   settlement                  <- village, town
  farm    field                       <- lowland_farm
  terrain upland_cover                <- upland, hill
  wet     water, pond_complex         <- water, tidal_flat, pond   (the trace's `water` polygons are enclosed ponds)
Not scored, reported: worksite (1979-80 clearing: its January 1979 state is farm or terrain, unless it displaced
earlier fabric), river_margin (illustrative channel bands), transport_land and open_ground (urban-fringe edges).
Cells are split by 1 km checkerboard blocks: `tune` blocks (even) may be used to pick thresholds; `held` blocks (odd)
may not. Report held-out numbers as the result.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from shapely.geometry import box, shape
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slice_areas import ROOT, load_grid  # noqa: E402

CLASSES = ["water", "tidal_flat", "pond", "hill", "village", "town", "upland", "lowland_farm"]
CORE = ROOT / "build/3d-snapshots/Shenzhen-step3/apps/snapshot-3d/core-basin-gis.json"
WATER = ROOT / "build/3d-snapshots/Shenzhen-step3/apps/snapshot-3d/public/grid/municipal-water.bin"
OUT = ROOT / "build/r8a-landcover"
DOMINANT_SHARE = .60
GROUPS = ["built", "farm", "terrain", "wet"]
REFERENCE = {"settlement": "built", "field": "farm", "upland_cover": "terrain", "water": "wet", "pond_complex": "wet"}
PREDICTED = {"village": "built", "town": "built", "lowland_farm": "farm", "upland": "terrain", "hill": "terrain",
             "water": "wet", "tidal_flat": "wet", "pond": "wet"}
REPORTED = ["worksite", "river_margin", "transport_land", "open_ground"]
WATER_LEGEND = {0: "land", 1: "sea_lowland", 2: "possible_intertidal", 3: "reservoir", 4: "isolated_lowland_water",
                255: "unknown"}


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def class_grid(doc, dims):
    cls = np.full(dims, 255, dtype=np.uint8)
    for a in doc["areas"]:
        for kind, runs in a["runs"].items():
            for y, x0, x1 in runs:
                cls[y, x0:x1 + 1] = CLASSES.index(kind)
    return cls


def core_labels(path, g, playable):
    """{(x, y): dominant trace kind, or 'mixed'} for playable cells in the core box."""
    core = read(path)
    if core["crs"] != "EPSG:32650" or core["date"] != "1980-09-11":
        raise ValueError("Expected the dated September 1980 core cover in UTM 50N")
    e, n = g["meta"]["origin_top_left"]
    step = g["meta"]["cell_m"]
    l, t, r, b = core["grid_cell_edges"]
    if list(core["bounds"]) != [e + l * step, n - b * step, e + r * step, n - t * step]:
        raise ValueError("Core extent disagrees with the R8a grid")
    cover = core["layers"]["cover"]
    geoms = [shape(f["geometry"]) for f in cover]
    index = STRtree(geoms)
    out = {}
    for dy, dx in np.argwhere(playable[t:b, l:r]):
        x, y = int(l + dx), int(t + dy)
        cell = box(e + x * step, n - (y + 1) * step, e + (x + 1) * step, n - y * step)
        area = Counter()
        for i in index.query(cell, predicate="intersects"):
            area[cover[i]["kind"]] += geoms[i].intersection(cell).area / cell.area
        kind, share = max(area.items(), key=lambda p: (p[1], p[0]), default=("unknown", 0))
        out[(x, y)] = kind if share >= DOMINANT_SHARE else "mixed"
    return out


def split_of(x, y):
    return "tune" if (x // 10 + y // 10) % 2 == 0 else "held"


def score(labels, cls):
    """Per split: the 4 x 4 confusion (reference rows, predicted columns), agreement, precision, recall; and what
    the reported kinds were called."""
    res = {}
    for part in ("tune", "held", "all"):
        mat = np.zeros((4, 4), dtype=int)
        reported = {k: Counter() for k in REPORTED}
        for (x, y), kind in labels.items():
            if part != "all" and split_of(x, y) != part:
                continue
            pred = CLASSES[cls[y, x]]
            if kind in REFERENCE:
                mat[GROUPS.index(REFERENCE[kind]), GROUPS.index(PREDICTED[pred])] += 1
            elif kind in reported:
                reported[kind][pred] += 1
        div = lambda a, b: round(float(a / b), 3) if b else None
        res[part] = {
            "n": int(mat.sum()), "confusion_reference_by_predicted": mat.tolist(),
            "agreement": div(np.trace(mat), mat.sum()),
            "recall": {c: div(mat[i, i], mat[i, :].sum()) for i, c in enumerate(GROUPS)},
            "precision": {c: div(mat[i, i], mat[:, i].sum()) for i, c in enumerate(GROUPS)},
            "reported": {k: dict(v) for k, v in reported.items()},
        }
    return res


def water_crosstab(path, g, cls, playable):
    w = np.fromfile(path, dtype=np.uint8, count=g["H"] * g["W"]).reshape(g["H"], g["W"])
    tab = {}
    for code, name in WATER_LEGEND.items():
        sel = playable & (w == code)
        if sel.any():
            tab[name] = {CLASSES[k]: int((sel & (cls == k)).sum()) for k in range(len(CLASSES)) if (sel & (cls == k)).any()}
    return tab


def table(name, s):
    lines = [f"## {name}"]
    for part in ("tune", "held"):
        r = s[part]
        lines.append(f"{part}: n={r['n']} agreement={r['agreement']}")
        lines.append("  ref\\pred " + " ".join(f"{c:>8}" for c in GROUPS) + "   recall")
        for i, c in enumerate(GROUPS):
            lines.append(f"  {c:<8} " + " ".join(f"{v:>8}" for v in r["confusion_reference_by_predicted"][i])
                         + f"   {r['recall'][c]}")
        lines.append("  precision " + " ".join(f"{str(r['precision'][c]):>8}" for c in GROUPS))
        for k, v in r["reported"].items():
            if v:
                lines.append(f"  {k}: " + ", ".join(f"{c} {n}" for c, n in sorted(v.items(), key=lambda p: -p[1])))
    return "\n".join(lines)


def run(maps, core=CORE, water=WATER, quiet=False):
    g = load_grid()
    dims = (g["H"], g["W"])
    grids = {k: (class_grid(read(p), dims) if isinstance(p, (str, Path)) else p) for k, p in maps.items()}
    playable = next(iter(grids.values())) != 255
    labels = core_labels(core, g, playable)
    out = {"core": str(Path(core).relative_to(ROOT)) if Path(core).is_relative_to(ROOT) else str(core),
           "dominant_share": DOMINANT_SHARE, "labels": dict(Counter(labels.values())),
           "note": "Dated September 1980 comparator; shares imagery with the classifier. Not 1979 accuracy.",
           "maps": {k: score(labels, c) for k, c in grids.items()}}
    if Path(water).is_file():
        out["municipal_water"] = {k: water_crosstab(water, g, c, playable) for k, c in grids.items()}
    if not quiet:
        for k, s in out["maps"].items():
            print(table(k, s))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--core", type=Path, default=CORE)
    ap.add_argument("--water", type=Path, default=WATER)
    a = ap.parse_args()
    maps = {"shipped": ROOT / "data/starts/slice_landcover.json"}
    if (OUT / "candidate.json").is_file():
        maps["candidate"] = OUT / "candidate.json"
    out = run(maps, a.core, a.water)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "audit-3d.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
