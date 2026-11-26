"""Pack the handoff GeoTIFF as a portable, metre-registered, 16-bit surface patch."""
import base64
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import rasterio

app = Path(__file__).resolve().parent
src = Path(sys.argv[1]) if len(sys.argv) > 1 else app.parents[2]/"georef/basin_modern_dsm_30m.tif"
with rasterio.open(src) as ds:
    t = ds.transform
    assert ds.count == 1 and ds.crs.to_epsg() == 32650 and (t.a,t.b,t.d,t.e) == (30,0,0,-30)
    heights = ds.read(1)
    assert np.isfinite(heights).all() and np.abs(heights).max() < 327
    data = dict(format="sz-core-relief-v1", crs="EPSG:32650", origin_center=list(ds.xy(0,0)),
                spacing_m=30, width=ds.width, height=ds.height, scale_m=.01,
                source="copernicus_dem_glo30", sha256=hashlib.sha256(src.read_bytes()).hexdigest(),
                samples_i16le_b64=base64.b64encode(np.rint(heights*100).astype("<i2").tobytes()).decode("ascii"))
(app/"public/grid").mkdir(parents=True,exist_ok=True)
(app/"public/grid/core-relief.json").write_text(json.dumps(data, separators=(",",":"))+"\n",encoding="utf-8")
