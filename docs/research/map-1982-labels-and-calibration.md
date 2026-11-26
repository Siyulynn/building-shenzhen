# 1982 City Map Labels & Existing-Map Calibration / 1982年《深圳市区图》地名整理与地图校准

The numerical comparisons below describe the initial 1982-sheet pass. See the [1984 preview and 1979 anchor review](map-1984-previews-and-1979-anchors.md) for current placements and the rerun. The schematic fit does not confirm a modern proxy error or establish cut-and-fill, and a printed label alone does not establish a completed building.

This note documents the transcription, affine georeferencing, register integration and existing-map calibration of the 1982 《深圳市区图》 (`phase1_1982_shenzhen_city_map`, local copy `data/raw/sources/phase1_1982_shenzhen_city_map/map_1982.jpg`, 2000×1500 px).

- **Label register:** [`data/calibration/map_1982_labels.yaml`](../../data/calibration/map_1982_labels.yaml)
- **Georeferencing & calibration script:** [`pipeline/map_1982_georef.py`](../../pipeline/map_1982_georef.py) (`npm run calibration:1982`)
- **Outputs:** [`map_1982_labels.geojson`](../../data/calibration/map_1982_labels.geojson), [`map_1982_labels.csv`](../../data/calibration/map_1982_labels.csv), [`map_1982_calibration_report.json`](../../data/calibration/map_1982_calibration_report.json), and git-ignored map-spike overlay `apps/map-spike/public/grid/map_1982_labels.json`.
- **Evidence claims:** [`data/evidence/claims/phase1_1982_city_map_labels.yaml`](../../data/evidence/claims/phase1_1982_city_map_labels.yaml) (7 regional claims, all `sourced`, `extracted_by: ai:gemini-4-neon`).

## 1. What was transcribed

**205 named features** across the 2000×1500 sheet, read from nine overlapping 100-pixel-gridded crops:

- **106 buildings, factories, institutions and facilities** (industrial plants, schools, hospitals, municipal bureaus, transport depots, commercial towers, utilities)
- **87 villages, residential quarters and named localities**
- **9 hills and ridges** (笔架山, 大头岭, 上步岭, 马古岭, 白沙岭, 园头岭, 大坟山, 望牛墩, 西边岭)
- **3 hydro features** (田贝塘, 王光湖, and the dashed `计划中水道` planned Shenzhen River channel)

**Caveat:** The sheet is a folded paper city map photographed at a slight angle, with no visible imprint, scale or legend. Because it labels planned works (`科学馆`, `计划中水道`) alongside existing buildings and villages, it must be read as a period attestation of named features and relative layout, not as a metric survey of completed construction.

## 2. Georeferencing accuracy

A 6-parameter affine transform fitted on **10 ground control points** spanning the sheet (罗湖桥, 深圳车站, 国际商业大厦, 文锦渡, 渔民村, 深圳市人民政府, 笔架山, 向西, 笋岗, 大头岭):

- **Scale:** 3.66 m/px (X), 3.65 m/px (Y) — nearly isotropic across the frame
- **In-sample RMS:** **200.6 m** (~2 cells on the 100 m grid)
- **Leave-one-out (LOO) RMS:** **331.9 m** (median 300.3 m)

The ~200 m residual is inherent to the schematic cartography: the old-town 建设路–人民南路 corridor is widened for label legibility, and Shangbu's grid is drawn orthogonally (`深圳电子工业大楼` is drawn south of 深南路 on the sheet, whereas the built 电子大厦 stands on the north side, ~395 m away). All coordinates derived solely from this warp carry `confidence: 0.4`.

## 3. Additions to the 1984 calibration register

`data/calibration/buildings_1984.yaml` expanded from **24 entries (16 placed, 8 unplaced)** to **124 entries (118 placed, 6 unplaced)**:

- **2 previously unplaced entries now placed:**
  - `b1984.shenzhen_theatre` (深圳戏院) — placed at `[114.11191, 22.54944]` (area 1, cell `385,373`), immediately south of 工人文化宫 and west of 解放路.
  - `b1984.bagualing` (八卦岭工业区) — placed at `[114.09107, 22.56419]` (area 7, cell `364,357`), south of 泥岗路.
- **100 new named buildings/facilities added** from the 1982 sheet (`28` in area 1, `16` in area 2, `17` in area 3, `1` in area 4, `9` in area 5, `13` in area 7, `16` outside the slice west of Shangbu). `科学馆` is marked `status_1984: planned`; the rest are `built` with the schematic-map caveat.
- **Only 2 `on_1979_water` flags** across all 118 placed entries: `b1984.sea_world` (Minghua moored offshore — expected) and `b1984.m82_tourism_supply_co` (市旅游供应公司, cell `376,384`, drawn directly beside fishponds south of Caiwuwei and within the 201 m affine RMS).

## 4. Calibration findings against our existing map

### A. 1979 site register (`content/slice/sites_1979.yaml`) proxy offsets

| 1979 site | 1982 map offset | Direction | Diagnosis |
|---|---:|---|---|
| `site.luohu_crossing` | 63.4 m | W | Within map RMS |
| `site.xiangxi` | 91.8 m | W | Within map RMS |
| `site.yumin` | 143.2 m | NW | Within map RMS |
| `site.wenjindu_crossing` | 174–232 m | SW | Within map RMS |
| `site.shenzhen_station` | 210.7 m | SE | Within map RMS |
| `site.sungang` | 281.8 m | SE | Within map RMS (modern street centroid vs village) |
| **`site.caiwuwei`** | **367.8 m** | N | Schematic old-town expansion + modern neighbourhood proxy |
| **`site.hubei`** | **405.3 m** | **W** | **Confirmed proxy error:** modern OSM proxy sits on 湖贝新村, ~400 m east of old 湖贝村 (already flagged in `sites_1979.yaml` research notes) |
| **`site.shangbu_land`** | **1,861.0 m** | **SE** | **Scope mismatch:** `site.shangbu_land` sits at the modern Shangbu/Huaqiang district centroid (`114.079, 22.550`), whereas old 上步村 on the 1982 map lies south of 深南路 near 巴丁 & 向东围 (`114.095, 22.542`) |

### B. 1979 landcover (`data/starts/slice_landcover.json`) coverage gaps

Checking every playable-area 1982 village and building against `slice_landcover.json` (using a 200 m / ±2-cell window to match the affine RMS):

1. **6 named villages/residential settlements inside playable areas have zero `village`/`town` cells within 200 m:**
   - **Area 1 (market_town):** `水贝` (reads as `pond`), `下田贝` (`lowland_farm`), `上田贝` (`lowland_farm`), `教育新村` (`lowland_farm`)
   - **Area 5 (Sungang–Bagualing):** `泥岗` (`lowland_farm`)
   - **Area 7 (Shangbu):** `园岭仔` (`lowland_farm`)
   - Cause: `m3c_landcover.py` only classifies a cell as `village` or `town` inside a fixed radius (500–600 m) of a `sites_1979.yaml` point. Traditional villages not listed in `sites_1979.yaml` therefore fall through to `lowland_farm` or `pond`.
2. **44 playable-area 1982 buildings read as unbuilt in 1979 landcover** (`19` in area 1, `1` in area 2, `4` in area 3, `6` in area 5, `14` in area 7):
   - In **Area 7 (Shangbu)**, `14/14` unbuilt in 1979 is largely genuine 1979→1982 construction (电子装配厂, 京华电子, 汽车装配厂, 人民医院, 市委宿舍, 友谊商店, etc.).
   - In **Area 1 (north Dongmen–Tianbei–Cuizhu)** and **Area 5 (Sungang)**, `19` and `6` buildings (including 深圳中学, 深圳市砖厂, 市人民医院留医部, 市罐头厂, 冷冻厂, 肥皂厂, 笋岗车站, 磷肥厂) fall outside `site.shenzhen_market_town`'s 600 m radius, showing that the pre-1982 northern industrial/service belt is under-represented in the current 1979 landcover mask.
3. **Cut-and-fill hills confirmed against present-day DEM:**
   - High peaks match our DEM (`笔架山` 162 m, `大头岭` 135 m / `hill`).
   - Low inner-city ridges (`上步岭` 27 m, `白沙岭` 31 m, `园头岭` 25 m, `马古岭` 35 m, `大坟山` 18 m) all read as `lowland_farm` on the present-day Copernicus DEM, directly confirming `slice_landcover.json`'s caveat that post-1979 earthmoving and hill-levelling are not yet undone.

## 5. Inspecting on the map spike

```text
npm run evidence:compile
npm run calibration:1982
npm run calibration:1984
npm run spike:map
```

Toggle **1982 深圳市区图 labels** (`m82`) to see all 205 labels as coloured diamonds (cyan = building, gold = village, brown = hill, blue = hydro) alongside the 1979 site register, 1980 KH-9 mosaic, and 1984 reported buildings.
