"""Unpack KH-9 Declass 3 scans one segment at a time and keep reduced working copies.

Usage: python -I pipeline/kh9_reduce.py <source_id> [factor]
  <source_id>  e.g. kh9_1980_09_11_a048 (the .tgz is in data/raw/sources/<source_id>/)
  factor       block-average reduction (default 8: ~1 m scan pixels -> ~8 m)

Writes data/raw/sources/<source_id>/reduced/<segment>_r<factor>.tif (uint8, pixel space, no georeference)
and a small JPEG preview, then deletes the full-resolution segment to save disk. Re-run to regenerate.
"""
import json
import sys
import tarfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling

ROOT = Path(__file__).resolve().parents[1]


def main():
    sid = sys.argv[1]
    factor = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    d = ROOT / "data/raw/sources" / sid
    tgz = next(d.glob("*.tgz"))
    out = d / "reduced"
    out.mkdir(exist_ok=True)
    info = {}
    with tarfile.open(tgz, "r:gz") as tf:
        for m in tf:
            if not m.isfile() or not m.name.lower().endswith(".tif"):
                continue
            name = Path(m.name).name  # never trust paths inside the archive
            tmp = out / ("_full_" + name)
            with tf.extractfile(m) as src, open(tmp, "wb") as dst:
                while chunk := src.read(1 << 24):
                    dst.write(chunk)
            with rasterio.open(tmp) as ds:
                H, W = ds.height // factor, ds.width // factor
                arr = ds.read(1, out_shape=(H, W), resampling=Resampling.average)
                info[name] = {"full": [ds.width, ds.height], "dtype": ds.dtypes[0], "count": ds.count,
                              "reduced": [W, H], "factor": factor}
            stem = name.rsplit(".", 1)[0]
            with rasterio.open(out / f"{stem}_r{factor}.tif", "w", driver="GTiff", width=W, height=H, count=1,
                               dtype=arr.dtype, compress="deflate") as dst:
                dst.write(arr, 1)
            prev = arr[::8, ::8]
            with rasterio.open(out / f"{stem}_preview.jpg", "w", driver="JPEG", width=prev.shape[1],
                               height=prev.shape[0], count=1, dtype="uint8") as dst:
                dst.write(prev.astype("uint8"), 1)
            tmp.unlink()
            print(name, info[name], flush=True)
    (out / "segments.json").write_text(json.dumps(info, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
