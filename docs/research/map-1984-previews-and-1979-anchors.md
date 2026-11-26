# 1984 map previews and the 1979 opening map / 1984年地图预览与1979年开局地图

## What the free previews show

The [public page](http://www.txlzp.com/ditu/12126.html) identifies 《深圳最新交通游览图》 as the May 1984 edition, first printed in June (`phase1.map.1984.preview_edition`). The sheet's survey cutoff is unknown. The [source record](../../data/evidence/sources/phase1_1984_shenzhen_traffic_map_previews.yaml) covers the five public JPEGs only. The [claims](../../data/evidence/claims/phase1_map_1984_previews.yaml) were read from the original preview pixels, checked with conventional enlargement and sharpening.

| Public image | Finding and use |
|---|---|
| [`5-2.jpg`](http://www.txlzp.com/wp-content/uploads/2024/03/5-2.jpg), Dongmen | `博雅画廊` and `新安酒家` are on the south side of 解放路 across from the theatre block (`phase1.map.1984.dongmen_frontage`). Both are now in cell **385,375** in the [1984 building register](../../data/calibration/buildings_1984.yaml). They share a frontage proxy because the crop gives no reliable parcel separation. The additional shop, lodging and civic labels are searchable in `phase1.map.1984.dongmen_other_labels`. Dongmen's `友谊商店` label is kept separate from the Shangbu label in `phase1.map.1982.shangbu_industrial`. |
| [`6.jpg`](http://www.txlzp.com/wp-content/uploads/2024/03/6.jpg), Caiwuwei | `县委` north of 解放路 supplements the 1977 `县革委` label. The south corridor is explicitly labelled `立体交叉（未建成）`. The source does not establish the age of the label, work start, or ramp geometry. Nearby names and the marked route 4 junction are filed under `phase1.map.1984.caiwuwei_*`. |
| [`4-2.jpg`](http://www.txlzp.com/wp-content/uploads/2024/03/4-2.jpg), regional inset | River, railway and named settlement relationships (`phase1.map.1984.regional_river_topology`). Keep `渔农村` separate from Luohu's `渔民村`. The hatched urban symbol is suitable for a broad comparison. |
| [`2-2.jpg`](http://www.txlzp.com/wp-content/uploads/2024/03/2-2.jpg) and [`3-2.jpg`](http://www.txlzp.com/wp-content/uploads/2024/03/3-2.jpg), overviews | Broad street structure and a reverse margin with route headings 1–11 (`phase1.map.1984.overview_comparison`). The coloured fills, park graphic and striped area are visual leads. The available legend and small labels do not support a built-versus-planned mask, a dated detention basin, or a bus-stop trace. |

## Stage A: opening-map placements

The 1984 crop contributes relative layout. Evidence for existence at the opening is recorded separately in the [anchor claims](../../data/evidence/claims/phase1_map_1979_anchor_review.yaml). The 1977 street sheet supplies names and topology, while the December 1977 and September 1980 KH‑9 images provide visual comparisons on the existing grid. The 1977 street-sheet warp did not pass the placement check, so the coordinates are manual locality picks. The school, hospital and old town were compared with both image dates; a roof pattern can corroborate built fabric without identifying its occupant.

| Anchor | Grid cell | Evidence and decision |
|---|---|---|
| 湖贝旧村 / Old Hubei | **393,374** (was 397,372) | Use the old core east of the elongated pond strip. The 1977 street sheet and URBANUS location description distinguish it from the former modern proxy; reuse the September 1980 draft basin pick. `site.hubei.old_core_location`, `phase1.observation.kh9_1980.core_anchor_review`. |
| 县属机关 / County offices | **378,376** | The 1977 red star and 1984 crop agree on a locality on the north side of the west approach. The draft point represents the county-seat neighbourhood in Caiwuwei, area 3. `site.county_offices.location`, `phase1.map.1984.caiwuwei_county_label`. |
| 深圳戏院 / Shenzhen Theatre | **385,375** | The archives date the theatre to 1960. The preview and the earlier sheet support the Dongmen locality, with an imagery-based proxy for the theatre block. `site.shenzhen_theatre.exists_1979`, `phase1.observation.kh9_1980.core_anchor_review`. |
| 水贝、上田贝、下田贝、泥岗 / Shuibei, Upper and Lower Tianbei, Nigang | **393,346; 396,355; 392,354; 369,349** | Four village anchors, based on settlement histories plus roughly corresponding pre-opening clusters. Shuibei uses land west of the schematic 1982 point flagged by the water mask. The water cell is retained. `site.shuibei.exists_1979`, `phase1.villages.tianbei_old_pair`, `site.nigang.exists_1979`, `phase1.observation.kh9_1977.northern_settlement_anchors`. |
| 深圳中学、人民医院留医部 / Shenzhen Middle School, People's Hospital inpatient unit | **391,367; 397,360** | The 1977 street sheet identifies both. Use campus-locality proxies; the 1984 preview's `市人民医院门诊部` is the separate Dongmen outpatient label. `phase1.map.1977.school_hospital`, `phase1.observation.kh9_1980.core_anchor_review`, `phase1.map.1984.dongmen_other_labels`. |
| 深圳北站（笋岗货场） / Sungang freight yard | **384,355** | The 1977 history and visible rail corridor support a yard proxy separate from Sungang village. Individual sheds, tracks and yard limits are open. `phase1.rail.sungang.renamed_1977`, `phase1.observation.kh9_1977.northern_settlement_anchors`. |

**Still open.** `教育新村` and `园岭仔` have 1982 map labels, but no reliable pre-opening match; `田心` needs a distinct old-village point separate from Sungang. `上步村组` is registered unplaced on the strength of `site.shangbu_villages.exists_1979`; the trial points for old Shangbu, 巴丁, 向东围, 福田, 田面, 下步庙 and the two 赤尾 labels are mostly outside the playable mask. Keep them available for the municipality review via the 1982 overlay. The 1977 imagery shows mixed buildings, works or fields in the 1982 search areas for the brickworks, cold store, cannery and phosphate plant; it cannot identify those compounds. The early industry summary (`phase1.industry.pre_sez_town_workshops`) warrants a search for dated factory addresses, rather than assigning the 1982 names to the 1977 roofs.

### Land-cover and golden-run comparison

Regenerating `data/starts/slice_site_cells.json` and `data/starts/slice_landcover.json` changed **192** 100 m classifications using the existing texture and terrain rules. No water or pond cell changed class. The old 1982 neighbourhood check now finds **1** settlement label with no nearby village/town cover (was 6), and **17** building labels (was 44). This is agreement between a schematic overlay and a modelled map, and does not date the affected cells to 1979.

The number of formable cells used for SEZ readiness falls **1,471 → 1,431**. The seed‑1 cautious and historical-prologue readiness scores rise **0.1774 → 0.1824** and **0.5617 → 0.5690**, with their wave-card counts unchanged. The aggressive and historical-prologue runs each pay **¥15,000** more in formation compensation because town cover carries a higher rate than farmland. Ending population and GDP are unchanged across the five policies.

## Snapshot handoff

- **1979 opening:** use these locality picks to check the village and civic masses at municipality and neighbourhood scale. Retain separate marks for the county offices, old Hubei and the Sungang freight yard. The new points support approximate locality, so retain inferred geometry.
- **24 January 1984:** use the Dongmen frontage for relative placement. The Xin'an retrospective dates reopening to 1983; the Boya profile dates the business earlier, while its exact mapped building remains a 1984 lead (`phase1.xinan.early_operation_and_rebuild`, `phase1.boya.dongmen_history`). `立体交叉（未建成）` is a check against a finished interchange. The later edition supplies no January construction stage for the other mapped blocks.
- Keep the existing snapshot dates. For a street-level revision, require an independently positioned site or a sharper dated view before drawing a footprint.
