"""Spike A (throwaway): build the 100 m grid for the municipality from the Copernicus DEM and OSM admin boundaries.

Inputs (data/raw/sources/, git-ignored, hashes recorded in data/evidence/sources/):
  copernicus_dem_glo30/*.tif   Copernicus DEM GLO-30 tiles N22 E113, N22 E114
  osm_shenzhen_admin/admin.json   Overpass export: Shenzhen districts (admin_level 6) and subdistricts (8)

Output (apps/map-spike/public/grid/, git-ignored):
  grid.bin    little-endian: int16 elevation[m] | uint8 water | uint8 district | uint16 subdistrict, each H*W, row 0 = north
  meta.json   dims, CRS, origin, names, label positions, sources

The boundaries are present-day. The water mask is the present-day coastline (DEM <= 0.5 m), so it already
includes post-1979 reclamation. A 1979 coastline needs tracing from the 1970s imagery (V15, V16).
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.merge import merge
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from pyproj import Transformer
from shapely.geometry import LineString, mapping
from shapely.ops import linemerge, polygonize, transform, unary_union  # noqa: F401  (ops.transform: deprecated but fine for a spike)

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/sources"
OUT = ROOT / "apps/map-spike/public/grid"
CELL = 100.0
CRS = "EPSG:32650"  # UTM zone 50N
CORE_DISTRICTS = {  # OSM relation ids; the Shenshan cooperation zone is a distant exclave and is left out
    5664194: "Luohu", 5664191: "Futian", 5664195: "Nanshan", 5664101: "Bao'an", 5664102: "Longgang",
    5663273: "Yantian", 5664193: "Longhua", 4590423: "Pingshan", 5664192: "Guangming",
}


def relation_polygon(el):
    lines = [LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
             for m in el.get("members", []) if m["type"] == "way" and "geometry" in m]
    polys = list(polygonize(linemerge(lines)))
    if not polys:
        return None
    # polygonize also yields the holes as faces; keep faces that are not inner rings
    inner = [LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
             for m in el.get("members", []) if m.get("role") == "inner" and "geometry" in m]
    inner_polys = list(polygonize(linemerge(inner))) if inner else []
    shape = unary_union(polys)
    if inner_polys:
        shape = shape.difference(unary_union(inner_polys))
    return shape


def main():
    to_utm = Transformer.from_crs("EPSG:4326", CRS, always_xy=True).transform
    admin = json.loads((RAW / "osm_shenzhen_admin/admin.json").read_text(encoding="utf-8"))
    rels = {e["id"]: e for e in admin["elements"]}

    districts = []
    for rid, en in CORE_DISTRICTS.items():
        geom = relation_polygon(rels[rid])
        districts.append({"id": len(districts) + 1, "osm": rid, "name": rels[rid]["tags"]["name"], "en": en,
                          "geom": transform(to_utm, geom)})
    city = unary_union([d["geom"] for d in districts])

    subs = []
    for e in admin["elements"]:
        if e["tags"].get("admin_level") != "8":
            continue
        geom = relation_polygon(e)
        if geom is None:
            continue
        g = transform(to_utm, geom)
        rp = g.representative_point()
        if not city.contains(rp):
            continue  # outside the nine core districts (e.g. Zhongshan, Shenshan)
        subs.append({"id": len(subs) + 1, "osm": e["id"], "name": e["tags"]["name"],
                     "en": e["tags"].get("name:en", ""), "geom": g})

    minx, miny, maxx, maxy = city.bounds
    pad = 2000
    x0 = np.floor((minx - pad) / CELL) * CELL
    y1 = np.ceil((maxy + pad) / CELL) * CELL
    W = int(np.ceil((maxx + pad - x0) / CELL))
    H = int(np.ceil((y1 - (miny - pad)) / CELL))
    tr = from_origin(x0, y1, CELL, CELL)

    tiles = [rasterio.open(p) for p in sorted((RAW / "copernicus_dem_glo30").glob("*.tif"))]
    mosaic, mtr = merge(tiles)
    elev = np.full((H, W), np.nan, dtype=np.float32)
    reproject(mosaic[0].astype(np.float32), elev, src_transform=mtr, src_crs=tiles[0].crs,
              dst_transform=tr, dst_crs=CRS, resampling=Resampling.average, src_nodata=tiles[0].nodata,
              dst_nodata=np.nan)
    water = (np.nan_to_num(elev, nan=0.0) <= 0.5).astype(np.uint8)

    dist = rasterize(((mapping(d["geom"]), d["id"]) for d in districts), out_shape=(H, W), transform=tr,
                     fill=0, dtype="uint8")
    sub = rasterize(((mapping(s["geom"]), s["id"]) for s in subs), out_shape=(H, W), transform=tr,
                    fill=0, dtype="uint16")

    # OSM district polygons extend far out to sea, so crop to the land inside the city plus a margin
    land_in = (dist > 0) & (water == 0)
    rows, cols = np.where(land_in)
    m = int(pad / CELL)
    r0, r1 = max(rows.min() - m, 0), min(rows.max() + m + 1, H)
    c0, c1 = max(cols.min() - m, 0), min(cols.max() + m + 1, W)
    elev, water, dist, sub = (a[r0:r1, c0:c1] for a in (elev, water, dist, sub))
    x0, y1 = float(x0 + c0 * CELL), float(y1 - r0 * CELL)
    H, W = int(r1 - r0), int(c1 - c0)

    OUT.mkdir(parents=True, exist_ok=True)
    e16 = np.clip(np.nan_to_num(elev, nan=0.0), -100, 2000).round().astype("<i2")
    with open(OUT / "grid.bin", "wb") as f:
        for arr in (e16, water.astype("u1"), dist.astype("u1"), sub.astype("<u2")):
            f.write(arr.tobytes())

    def label(layer, ident):
        # the land cell of this unit nearest to the centroid of its land cells
        ys, xs = np.where((layer == ident) & (water == 0))
        if len(xs) == 0:
            return None
        k = np.argmin((xs - xs.mean()) ** 2 + (ys - ys.mean()) ** 2)
        return [int(xs[k]), int(ys[k])]

    inside = dist > 0
    meta = {
        "cell_m": CELL, "crs": CRS, "origin_top_left": [x0, y1], "width": W, "height": H,
        "layout": "int16 elevation_m | uint8 water | uint8 district | uint16 subdistrict; row-major, row 0 = north",
        "districts": [{"id": d["id"], "name": d["name"], "en": d["en"], "label": label(dist, d["id"]),
                       "land_km2": round(float(((dist == d["id"]) & (water == 0)).sum()) * CELL * CELL / 1e6, 1)}
                      for d in districts],
        "subdistricts": [{"id": s["id"], "name": s["name"], "en": s["en"], "label": label(sub, s["id"])}
                         for s in subs if label(sub, s["id"]) is not None],
        "stats": {"cells_inside": int(inside.sum()), "land_cells_inside": int((inside & (water == 0)).sum()),
                  "city_km2_polygon": round(city.area / 1e6, 1)},
        "sources": ["copernicus_dem_glo30", "osm_shenzhen_admin"],
        "caveats": [
            "Boundaries are present-day (OSM), not 1979.",
            "Water = DEM <= 0.5 m: the present-day coastline, including reclamation after 1979.",
            "OSM district polygons include sea areas; land area comes from cells that are inside and not water.",
        ],
    }
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"grid {W}x{H} = {W*H} cells; inside {meta['stats']['cells_inside']}; "
          f"districts {len(districts)}; subdistricts {len(subs)}; city polygon {meta['stats']['city_km2_polygon']} km2")


if __name__ == "__main__":
    sys.exit(main())
