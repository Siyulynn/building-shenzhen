"""The modern Shenzhen city limit, for the planning map's reference layer (R11.1 playtest revision).

Input:  data/raw/sources/osm_shenzhen_admin/admin.json  (Overpass export, ODbL)
        apps/map-spike/public/grid/meta.json            (the Spike A grid)
Output: data/starts/slice_city_border.json               (a small, committed ring list)

This is a *present-day* administrative boundary, not a historical one: the OSM source note says so,
and the UI labels the layer "reference". It is drawn under the game's own area outlines and never
read by sim-core. The border is clipped to the slice grid and simplified to roughly one cell.
The OSM export is a local, git-ignored intake source; run this only where it is present. The
committed ring list is the artifact the browser reads.

Run:  pipeline/.venv/Scripts/python -I pipeline/slice_city_border.py
"""
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Polygon, box
from shapely.ops import polygonize, transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/raw/sources/osm_shenzhen_admin/admin.json"
META = ROOT / "apps/map-spike/public/grid/meta.json"
OUT = ROOT / "data/starts/slice_city_border.json"
CITY_RELATION = 3464353                       # 深圳市, OSM relation 3464353
MIN_DEG2 = 1e-8                               # drop the sub-metre slivers in the OSM rings


def main() -> None:
    admin = json.loads(SOURCE.read_text(encoding="utf-8"))
    relation = next(e for e in admin["elements"] if e["type"] == "relation" and e["id"] == CITY_RELATION)
    lines = [
        LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
        for m in relation["members"]
        if m.get("role") == "outer" and m.get("geometry")
    ]
    if not lines:
        raise SystemExit("city relation has no outer ways")
    # Stitch the member ways into closed rings, then keep the city's polygons (the outer ring and its islands).
    polygons = [p for p in polygonize(unary_union(lines)) if p.area >= MIN_DEG2]
    if not polygons:
        raise SystemExit("city relation did not polygonize")

    meta = json.loads(META.read_text(encoding="utf-8"))
    W, H, cell = meta["width"], meta["height"], meta["cell_m"]
    x0, y1 = meta["origin_top_left"]
    to_utm = Transformer.from_crs("EPSG:4326", meta["crs"], always_xy=True)
    clip = box(x0, y1 - H * cell, x0 + W * cell, y1)

    rings: list[list[list[float]]] = []
    for poly in polygons:
        projected = transform(to_utm.transform, poly).intersection(clip)
        for part in getattr(projected, "geoms", [projected]):
            if part.is_empty or part.geom_type not in ("Polygon", "MultiPolygon"):
                continue
            for p in getattr(part, "geoms", [part]):
                if p.geom_type != "Polygon" or p.area <= 0:
                    continue
                p = p.simplify(2 * cell, preserve_topology=True)
                for ring in [p.exterior, *p.interiors]:
                    xy = [[round((x - x0) / cell, 2), round((y1 - y) / cell, 2)] for x, y in ring.coords]
                    if len(xy) >= 4:
                        rings.append(xy)

    rings.sort(key=lambda r: (-len(r), r[0][0], r[0][1]))
    out = {
        "format": 1,
        "source": "osm_shenzhen_admin",
        "source_url": "https://www.openstreetmap.org/relation/3464353",
        "license": "ODbL-1.0",
        "reference": "present-day administrative boundary; not a historical boundary",
        "grid": {k: meta[k] for k in ("width", "height", "cell_m", "origin_top_left", "crs")},
        "rings": rings,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    points = sum(len(r) for r in rings)
    print(f"wrote {OUT.relative_to(ROOT)}: {len(rings)} rings, {points} points")


if __name__ == "__main__":
    main()
