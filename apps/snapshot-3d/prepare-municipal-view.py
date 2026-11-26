"""Package the municipal GIS handoff; do not package source imagery or review plates."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

APP = Path(__file__).resolve().parent


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--georef", type=Path, default=APP.parents[2]/"georef/municipal-step4c")
    args = p.parse_args()
    out = APP/"public/grid"
    grid = json.loads((out/"meta.json").read_text(encoding="utf8"))
    west, north = grid["origin_top_left"]
    w, h, step = (grid[k] for k in ("width", "height", "cell_m"))
    path = args.georef/"municipal-gis.json"
    raw = path.read_bytes()
    doc = json.loads(raw)
    if (doc["format"], doc["crs"], doc["units"], doc["date"], doc["bounds"]) != (
            "sz-municipal-map-v1", grid["crs"], "m", "1980-09-11", [west,north-h*step,west+w*step,north]):
        raise ValueError("Municipal handoff does not match the prepared atlas grid")
    expected = hashlib.sha256((out/"water1979.bin").read_bytes()).hexdigest()
    if doc["inputs"].get("water1979.bin") != expected:
        raise ValueError("Municipal handoff was generated from a different October 1979 mask")
    with rasterio.open(args.georef/"municipal-water-context-oct1979.tif") as ds:
        tags = ds.tags()
        if (ds.count, ds.width, ds.height, ds.crs.to_epsg(), ds.transform, ds.nodata) != (
                1,w,h,32650,from_origin(west,north,step,step),255) or tags.get("date") != "1979-10-19":
            raise ValueError("Water comparator does not match the atlas grid or date")
        water = ds.read(1)
    expected_counts = {int(k): v for k,v in doc["checks"]["water_cells"].items()}
    if water.dtype != np.uint8 or dict(zip(*np.unique(water,return_counts=True))) != expected_counts:
        raise ValueError("Water classes do not match the municipal handoff")
    packed = water.tobytes()
    doc["package"] = {"gis_sha256":hashlib.sha256(raw).hexdigest(),
                      "water_sha256":hashlib.sha256(packed).hexdigest(),"water_bytes":len(packed)}
    (out/"municipal-water.bin").write_bytes(packed)
    (out/"municipal-gis.json").write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n",
                                         encoding="utf8")
    print(f"Prepared {len(doc['features'])} municipal features and {len(packed)} water cells.")


if __name__ == "__main__":
    main()
