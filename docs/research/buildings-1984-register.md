# The 1984 reported-buildings register / 1984年建成与在建建筑登记

A calibration checklist, not a game content file and not a building serializer. It answers one question: **which places must not read as empty or ricefield on the 1984 map?** Each entry is a named building or complex that a 1979–84 report, photograph or film puts on the ground by 1984, with its placement proxy, its state in 1984 and what is known about its later life.

Register: [`data/calibration/buildings_1984.yaml`](../../data/calibration/buildings_1984.yaml). Outputs: [`buildings_1984.geojson`](../../data/calibration/buildings_1984.geojson), [`buildings_1984.csv`](../../data/calibration/buildings_1984.csv), [`buildings_1984_report.json`](../../data/calibration/buildings_1984_report.json). Script: [`pipeline/buildings_1984.py`](../../pipeline/buildings_1984.py).

## What the register holds

**124 named buildings or complexes; 120 have map proxies and 4 are unplaced.** The register codes 115 as built, 7 under construction, and 2 planned. Many built codes are provisional readings of the 1982 sheet; use individual dated evidence before putting those buildings into January 1984.

The first tranche (24 entries from 1979–84 reports, photographs, film, M4 project claims and historic-building lists) was extended in tranche 2 with **100 named buildings/facilities** transcribed and affine-georeferenced from the 1982 《深圳市区图》 (plus placements for `深圳戏院` and `八卦岭工业区`; full method and calibration report in [`map-1982-labels-and-calibration.md`](map-1982-labels-and-calibration.md)).

| First-tranche placed (20) | 1984 state | Grid cell | Later |
|---|---|---|---|
| 国贸大厦 | under construction (main structure topped 30 Apr 1984) | 388,380 | present |
| 国际商业大厦 | built (Apr 1983) | 386,382 | present |
| 电子大厦 | built (Aug 1982) | 355,379 | present |
| 上海宾馆 | built (1983) | 349,379 | present |
| 市委/市政府大楼 | built (end 1981) | 366,380 | present (市委 remains) |
| 深圳博物馆旧馆 | under construction (1984) | 369,378 | renamed/reused (古代艺术馆) |
| 深圳大剧院 | under construction (design 1983, site 1984) | 373,378 | present |
| 红荔路图书馆 | under construction (ground 1983, opened 1986) | 367,371 | renamed/reused (少儿图书馆) |
| 深圳大学 | under construction (campus ground 1984) | 199,385 | present |
| 罗湖口岸联检大楼 | under construction (opened 1985) | 386,394 | unknown |
| 深圳火车站 | built (pre-1979) | 385,390 | unknown (rebuilt later) |
| 海上世界 | built (1984) | 176,437 | present (surroundings reclaimed) |
| 蛇口工业区办公大厦 | built (1984) | 175,446 | present |
| 深圳湾大酒店 | built (1984) | 249,386 | replaced (lead) |
| 香蜜湖度假村 | built (1984) | 305,378 | unknown |
| 深纺大厦 | planned (site graded 1980; no 1984 completion) | 353,375 | present |
| 深圳戏院 | built (1960; `site.shenzhen_theatre.exists_1979`) | 385,375 | refurbished 1997 |
| 博雅画廊 | 1984 map and photo (`phase1.map.1984.dongmen_frontage`) | 385,375, shared frontage proxy | gallery moved; building fate open |
| 新安酒家 | reopened 1983 (`phase1.xinan.early_operation_and_rebuild`) | 385,375, shared frontage proxy | rebuilt 1994–96 |
| 八卦岭工业区 | under construction (1982 locality; 1983–84 works) | 364,357 | unknown |

**Tranche 2 (100 placed from 1982 深圳市区图):** 99 `built` + 1 `planned` (`科学馆`), affine-georeferenced at ±201 m in-sample RMS (`confidence: 0.4`, `later.state: unknown`). See `data/calibration/buildings_1984.csv` for the full list.

**Unplaced (4):** 蛇口购物中心, 南山宾馆, 碧涛中心, 上步工业区1#厂房. See [1984 public previews and 1979 anchors](map-1984-previews-and-1979-anchors.md) for the Dongmen frontage and the newer school, hospital and freight-yard checks.

## Corpus

The register is built from the reports the project already holds, not from a modern building list:

- the two 1984 photo sets (`phase1.photo.1984.*`), including the theatre/博雅/新安 caption and the Shekou set;
- the 1984 Pearl River Film Studio footage (`phase1.video.1984.*`);
- the M4 project claims (Guomao, Guoshang, the eight cultural facilities, Shenzhen University);
- the 1985 yearbook and 1985 silhouette (used for the Shekou office and bay-hotel cross-checks);
- the 1982 深圳市区图 for the government compound and the 上步岭 label;
- the municipal historic-building list for build years and addresses where no period date exists (`phase1.historic.*`).

A 1984 photograph proves the building existed by 1984; it does not date its completion. A project claim proves a stage (ground break, topping, opening), not a finished building. The register keeps those apart in `by_1984.date` and `by_1984.note`.

## The map layer

`pipeline/buildings_1984.py` projects each placed entry to the 100 m grid and writes `apps/map-spike/public/grid/buildings_1984.json` (git-ignored, like the other grid layers). The map spike reads it:

1. `npm run evidence:compile` (the script checks every cited claim exists);
2. `npm run calibration:1984`;
3. `npm run spike:map`.

The **1984 reported buildings** toggle draws squares: green = built, amber = under construction, grey = planned. Labels appear above 2.5× zoom; hover lists all entries in a cell, including the three Dongmen frontage names. The four unplaced entries are listed under the toggle.

## What the grid check does and does not say

The script samples the 1979 water mask and the 1979→84 change layer at each cell:

- **`on_1979_water`**: the 1979 mask flags 海上世界 (the mooring proxy) and 市旅游供应公司 (a schematic map placement next to ponds). Both are reasons to check the proxy, not evidence of a building footprint.
- **`sea_then_land_now`**: the point is on land that the 1979–84 change layer calls reclaimed. None of the placed points triggers it.
- **`1984_build_signal` / `no_1984_build_signal`**: only available in areas 4 (Huangbeiling) and 6 (Donghu–Liantang), where the 1984 Landsat has band data. The core (areas 1–3, 5, 7–9) has **no 1984 imagery**, so the register cannot confirm a 1984 build from the change layer there. That is why the register itself is the control: the map must show these cells as built, and the 1984 imagery cannot be used to argue them away.

This is the calibration contract: a playable map that shows 国贸, 电子大厦, 上海宾馆, the 市委大院 or the Shekou office as empty/ricefield in 1984 is wrong, regardless of what the 60 m change layer says. Under-construction entries count too: the cell should show a worksite or a rising frame, not a field.

Used by eye, the KH-9 1980 layer adds the other direction: a building dated 1981–84 should be absent or a worksite in September 1980, and one dated before 1980 should be visible. The register does not automate that check, because the 7.5 m mosaic cannot reliably separate a small structure from a field.

## Later modification

`later.state` is deliberately conservative:

- **`present`** means the named feature is still in OSM/Photon in 2026 at the same address. It does **not** mean unmodified. 国贸, 电子大厦 and 上海宾馆 are also in the 2018 historic-building batch; listing is a designation, not a fabric survey.
- **`renamed_or_reused`**: the old museum is now the 古代艺术馆; the Hongli Road library is now the children's library.
- **`replaced_lead`**: the Shenzhen Bay Hotel address now returns InterContinental Shenzhen. That is a lead, not a demolition record.
- **`unknown`**: no current-survey or demolition record has been opened. This is the honest state for the 1985 Luohu terminal, the old station building and Xiangmihu.

The register does not claim a modification without a source. The next pass should use the 2018/2020/2024 historic-building notices, the 2003 station/terminal rebuild record and a current survey for the rest.

## Gaps and the next tranche

1. **1982 map georeferencing.** The completed [label pass](map-1982-labels-and-calibration.md) supports neighbourhood placement. A flat scan or independent period controls are needed for parcel placement and for resolving uncertain stage labels.
2. **The four unplaced entries.** The Shekou three need period address or plot evidence; 上步1# needs an estate plan.
3. **The 1985 yearbook tables.** The industrial-buildings chapter and the commercial chapter may list further named works with floor area and completion year. Not yet extracted building by building.
4. **Later modification.** Only the historic-building list gives a current designation. A current survey (or the 2024/2026 OSM extract) should fill `later` for the rest.

## How to extend

Add a YAML entry with `id`, bilingual `name`, `kind`, `area`, `lonlat` (or `null`), `place` (address/basis/confidence), `status_1984`, `by_1984`, `claims`, `later`. Run the two commands above. The script fails on an unknown claim, a bad status or a point outside the grid, so the register cannot silently drift from the evidence base.
