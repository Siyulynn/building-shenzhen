# Shenzhenxu old-map register / 深圳墟古旧地图登记

**Status:** intake of 2026-11-23. Eighteen new source records and seventeen `sourced` metadata claims, all `lead` for geometry use. Every copy is a secondary repost from one 2025 article; no original holding, negative or survey sheet has been inspected. Nothing here is verified, and no line is yet an observed footprint.

**Carrier:** 土生菌, 土生土长深圳人, 《分享丨一些老旧地图里的深圳墟（镇）》, 2025-01-20, <https://mp.weixin.qq.com/s/ZqEgR5u4JlU6NoVR8dWdow>. The article is tier D. The maps it reproduces range from a Qianlong coastal chart to a 1997 atlas plate.

**Local copies:** `data/Shenzhenxu/maps/`, indexed with checksums in [`shenzhenxu_manual_references.csv`](../../data/evidence/observations/shenzhenxu_manual_references.csv). Source records are in `data/evidence/sources/phase1_shenzhenxu_*.yaml`; metadata claims are in [`phase1_shenzhenxu_map_register.yaml`](../../data/evidence/claims/phase1_shenzhenxu_map_register.yaml).

---

## 1. Register

### A. Name and early topology

| Source | Sheet | Date | Issuer / scale | What is visible | M3 use |
|---|---|---|---|---|---|
| [`phase1_shenzhenxu_qianlong_coastal_defence_map`](../../data/evidence/sources/phase1_shenzhenxu_qianlong_coastal_defence_map.yaml) | 广东海防图（乾隆） | Qianlong, 1736–1795 | Unknown Qing coastal chart | Painted extract labelling 深圳墟 among hills, a river and the coast | Earliest name attestation only; no geometry |
| [`phase1_shenzhenxu_xinan_garrison_map`](../../data/evidence/sources/phase1_shenzhenxu_xinan_garrison_map.yaml) | 新安县水陆塘汛舆图之深圳墟汛 | before 1820 | Unknown Qing garrison chart | 深圳墟 and 深圳墟汛 with a garrison text block; photographed book page | Early place relation; no geometry |
| [`phase1_shenzhenxu_guangdong_route_map`](../../data/evidence/sources/phase1_shenzhenxu_guangdong_route_map.yaml) | 《广东通省水陆舆图》（局部） | before 1894 | Japanese survey; article warns of many errors | Roads and place names around 深圳墟 | Late-Qing road-topology lead only |

### B. Survey and street maps, 1900–1949

| Source | Sheet | Date | Issuer / scale | What is visible | M3 use |
|---|---|---|---|---|---|
| [`phase1_shenzhenxu_1917_zhina_gazetteer_map`](../../data/evidence/sources/phase1_shenzhenxu_1917_zhina_gazetteer_map.yaml) | 深圳图 | 1917 | 东亚同文会, 《支那省别全志·广东省卷》; schematic, no scale | Railway, 上大街, 下大街, 市場, 商務會, 警察署, 停車場 | Street names and relative topology before the 1920s |
| [`phase1_shenzhenxu_1914_army_survey_map`](../../data/evidence/sources/phase1_shenzhenxu_1914_army_survey_map.yaml) | 深圳墟图 | 1914 | 广东省陆军测量局, 1:25,000 | 深圳墟, 湖貝, 向西, 向南, 深圳站; copy is rotated | Footprint and approach roads in 1914; georeference candidate |
| [`phase1_shenzhenxu_republican_series_map_1`](../../data/evidence/sources/phase1_shenzhenxu_republican_series_map_1.yaml) | 民国系列地图中的深圳墟（其一） | undated | Republican military survey series; sheet 000202 | 深圳墟, 湖貝, 向西, 向南, 塘尾; red article ellipse | Extent and surrounding villages; georeference candidate |
| [`phase1_shenzhenxu_republican_series_map_2`](../../data/evidence/sources/phase1_shenzhenxu_republican_series_map_2.yaml) | 民国系列地图中的深圳墟（其二） | 1934-06 print | Republican military survey series | 深圳墟, 湖貝, 向東, 羅湖, 深圳車站, 新園; red article ellipse | Extent and railway/station relation in 1934 |
| [`phase1_shenzhenxu_1940_hongkong_nearby_map`](../../data/evidence/sources/phase1_shenzhenxu_1940_hongkong_nearby_map.yaml) | 香港近傍图之深圳墟 | 1940 | Japanese military, 1:20,000, one of 24 sheets | 深圳墟, 湖貝, 向南; red article circle | Street and block detail in 1940; georeference candidate |
| [`phase1_shenzhenxu_1945_hongkong_map`](../../data/evidence/sources/phase1_shenzhenxu_1945_hongkong_map.yaml) | 香港地图 | c. 1945 | British War Office, 1:20,000 sheet 6, derived from the 1940 sheet | 深圳墟, 湖貝, 向南, Shenzhen River; red article circle | Cross-check the 1940 sheet and British grid |
| [`phase1_shenzhenxu_1948_newsletter_map`](../../data/evidence/sources/phase1_shenzhenxu_1948_newsletter_map.yaml) | 宝安县深圳墟图 | 1948-07 | 《深圳通讯》第七期, last page; no visible scale | 中山公園, 南塘村, 向南村, 上大街, 下大街, 深圳車站 | Detailed late-1940s street names and block layout |
| [`phase1_shenzhenxu_1940s_british_coastal_map`](../../data/evidence/sources/phase1_shenzhenxu_1940s_british_coastal_map.yaml) | 广东沿海地图之深圳 | 1945 first edition | British G.S.G.S. 4691, P10 N.W., 1:50,000 | Shen-ch’üan/深圳, railway, Deep Bay, village names; red article circle | Border, coast and village context |

### C. Pre-SEZ baseline, 1949–1979

| Source | Sheet | Date | Issuer / scale | What is visible | M3 use |
|---|---|---|---|---|---|
| `phase1_shenzhenxu_1949_map_redraw` (existing) | 深圳镇1949年街道及附近地形简图 | subject 1949; 1992 sketch; redraw date unknown | 深圳博物馆 exhibit, after 袁锦铭; unscaled | Street and field sketch of the pre-Liberation town | Existing topology lead; the article supplies a second scan only |
| [`phase1_shenzhenxu_1977_shenzhen_street_map`](../../data/evidence/sources/phase1_shenzhenxu_1977_shenzhen_street_map.yaml) | 深圳镇街道图 | 1977 | 广东省测绘局、惠阳地区革委会、宝安县革委会; 1:5,000 | 渔民村, 罗湖, 文锦渡, 深圳站, 宝安县, 蔡屋围, 湖贝; red boundary overprint | **Best pre-1979 geometry base for the core basin** |
| [`phase1_shenzhenxu_1977_baoan_county_map`](../../data/evidence/sources/phase1_shenzhenxu_1977_baoan_county_map.yaml) | 宝安县地图 | 1977 | Same issuers; county sheet with 深圳镇街道图 inset | Roads, settlements and coast across the county | Regional settlement context |
| [`phase1_shenzhenxu_keyhole_1960s`](../../data/evidence/sources/phase1_shenzhenxu_keyhole_1960s.yaml) | 锁眼影像, 60年代末 | late 1960s | US reconnaissance satellite; frame ID unknown | Dense market town, railway, paddy fields and ponds | Built-up extent and field pattern; **hold until the frame is identified** |
| [`phase1_shenzhenxu_keyhole_1970s`](../../data/evidence/sources/phase1_shenzhenxu_keyhole_1970s.yaml) | 锁眼影像, 70年代初 | early 1970s | Same; frame ID unknown | Same town and field pattern | Built-up extent; hold until identified |
| [`phase1_shenzhenxu_keyhole_1980s`](../../data/evidence/sources/phase1_shenzhenxu_keyhole_1980s.yaml) | 锁眼影像, 80年代初 | early 1980s | Same; frame ID unknown | Early redevelopment around the town | Change comparator; may post-date January 1984 |

### D. Post-1979 comparators

| Source | Sheet | Date | Issuer / scale | What is visible | M3 use |
|---|---|---|---|---|---|
| [`phase1_shenzhenxu_1987_gazetteer_map`](../../data/evidence/sources/phase1_shenzhenxu_1987_gazetteer_map.yaml) | 深圳市成立前之宝安县城（深圳） | 1987 plate; subject 1953–1978 | 《深圳市地名志》; 1:25,000 | 宝安县, 深圳墟, 火车站, 罗湖山, 深圳河, 水稻田, 鱼塘 | **Key core-basin overview; the map attached in the M3 review** |
| [`phase1_shenzhenxu_1997_atlas_map`](../../data/evidence/sources/phase1_shenzhenxu_1997_atlas_map.yaml) | 1997深圳市地图集·城区详图（局部） | 1997 | 深圳市规划国土局 | Dongmen/Luohu street blocks and landmarks | Later comparator only; never back-project |

---

### E. Interpretive figures: the 2025 Dongmen-origin essay

The [东门-origin reading note](shenzhenxu-dongmen-origin.md) adds six author-edited figures under `data/Shenzhenxu/maps/dongmen-origin/`. They are overlays on the 1948 newsletter map and the 1949 redraw, not separate survey sheets. The article argues that the Qing east gate stood at 十字街 and the Republican east gate at 解放路 × 东门中路; treat that as an interpretation until it is georeferenced and checked on the ground.

## 2. What this changes for M3

- **The core basin now has a street-topology chain.** 1914 → 1934 → 1940 → 1948 → 1977 lets us compare the same crossroads, railway and river over sixty years. The 1977 1:5,000 sheet is the strongest pre-1979 base; the 1987 plate gives the 1:25,000 overview.
- **The 1977 sheet names the places M3 needs.** 渔民村, 罗湖, 文锦渡, 深圳站, 宝安县, 蔡屋围 and 湖贝 all appear on one sheet, with the Shenzhen River and the railway. That is the skeleton for the unified core-basin scene.
- **The 1987 plate confirms the features visible in the M3 review.** 罗湖山 is still a hill; the station and 罗湖桥 sit on the railway; 深圳墟 lies east of the tracks; 宝安县/蔡屋围 lies west; the river and paddy fields wrap the south. It is a 1953–1978 composite, so it cannot date a single building.
- **Shenzhenxu can be rebuilt from street names rather than a generic cross.** Between them, the 1917 schematic, the 1948 plan and the 1940/1934 sheets give 上大街, 下大街, 市場, 南塘村, 向南村, 中山公園 and the station relation. That is enough to replace the current four-row `+` layout with a documented block structure, while keeping footprints `inferred`.
- **The 1997 plate and the 1980s Keyhole frame are comparators, not opening geometry.** They show what came later; they must not be back-projected into 1979.
- **The east gate now has a working hypothesis.** The [2025 Dongmen-origin essay](shenzhenxu-dongmen-origin.md) argues that the Qing east gate stood at 十字街 and the Republican east gate at 解放路 × 东门中路. It is an interpretation, not a survey, but it gives the old market a testable centre and a direction of growth.

## 3. Limits and cautions

1. **Tier D, not B.** Every record describes a reposted scan. A period survey map would normally be tier B, but we cannot confirm the sheet's completeness, edition or that the labels are original. Promote a record only after inspecting a holding.
2. **Article annotations are not map content.** The red circles and ellipses on the 1940, 1945, Republican and 1940s British sheets were added by the article. They must not be traced.
3. **The Keyhole caption is inconsistent.** It says 南头 while the section heading says 深圳墟. The frames show the market town, railway and fields, so the heading is the better match, but the frame IDs and dates are unknown. Keep them out of the dated evidence layer.
4. **The 1987 plate is a period composite.** Its title covers 1953–1978. It is not a 1979 survey, and it cannot supply a building date.
5. **Scales are recorded only where printed or legible:** 1914 1:25,000; 1940 1:20,000; 1945 1:20,000; 1945 British 1:50,000; 1977 street 1:5,000; 1987 1:25,000. The others are schematic or unconfirmed.
6. **The 1914 copy is rotated.** Labels read sideways; rotate before georeferencing.
7. **The 1949 article scan is a duplicate.** The existing `phase1_shenzhenxu_1949_map_redraw` record uses a different scan; the article copy is inventoried but not registered as a second source.

## 4. Next steps for M3.0

1. **Georeference the 1977 street sheet and the 1987 plate** against the 1980-09-11 KH-9 mosaic. Use at least six well-spread GCPs on the railway, station, Luohu Bridge, river bends and the Shenzhenxu crossroads; record the transform and RMS in metres.
2. **Trace one feature class per layer** from the 1977 sheet: railway, roads, river/ponds, field banks, built-up blocks. Tag each feature `observed_kh9` / `lead_map` / `inferred` with a confidence value.
3. **Use the earlier sheets for topology, not footprints.** The 1914/1934/1940/1948 maps can confirm street names and relative block shapes; they cannot supply 1979 footprints.
4. **Identify the Keyhole frames** before using them for change detection. If the frames cannot be identified, keep them as visual comparators only.
5. **Keep every pixel out of the game.** All records are `reference_only`; no map scan becomes a texture or a display asset.

## 5. Rights

All records are `reference_only`. The article is copyrighted, and the underlying maps may carry separate rights. Store and study the scans; do not display, redistribute or derive textures from them. Short quotations in the claim records are for verification only.
