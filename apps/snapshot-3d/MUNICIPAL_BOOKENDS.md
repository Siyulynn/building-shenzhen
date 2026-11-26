# Municipal bookends / 市域前后时点

The isolated atlas derives **1979-01-01** (an opening-state cutoff, not the date of city approval) and **1984-01-24** (start of the first inspection) from the **1980-09-11** scene. [`municipal-epochs.json`](municipal-epochs.json) is the bilingual register of render changes by stable ID. It distinguishes existence and stage, estimated placement, continuity, and unplaced additions. The September source map and dated observations are unchanged. The six original kits are not used in the continuous atlas.

独立图集以 **1980-09-11** 为基准，推导 **1979-01-01**（开场截点，非设市日期）及 **1984-01-24**（首次视察开始）。双语变更表区分存在、阶段、估计位置、延续与未落图。九月源底图与定年观测不变；连续场景不叠加原有六处独立示意组景。

## December 1977 calibration / 1977 年 12 月校准

Use A010 segment **c** only, from the local `georef/kh9-1977` registration ([handoff](../../../georef/KH9_1977_COMPARISON.md)). Relative to the September mosaic: 12.4 m held-out RMS / 20.5 m p90 across 349 ties after refinement, not absolute survey accuracy. On the registered 3,400 × 1,650 local chip, the fit-support mask covers 82.6% of the basin. It is valid at the candidate Shenzhenxu crossroads and covers essentially all of the mapped Shenzhenxu and town-north fabric envelopes and all three selected Shangbu clearings, and ~90% of the Yumin candidate area. These are **overlap** checks using the alpha mask and September polygons, not percentages of unchanged fabric. Two metre sample spacing does not make the product accurate to two metres.

| Area / 区域 | What transfers / 采用范围 |
| --- | --- |
| Shenzhenxu and Luohu / 深圳墟与罗湖 | Readable old-town blocks and main approach corroborate broad continuity. The county-town sheet helps with names and connections, not dimensions. No individual roofs or sidings transferred; the bridge point itself falls outside the comparison support. |
| Shangbu–Caiwuwei / 上步—蔡屋围 | Readable fields and paths contrast with the much broader 1980 graded strip. Withhold the later route proxy at opening and use field-like texture in three interpreted envelopes. Keep less certain worksite areas neutral. Existing paths are not evidence of a completed Shennan road. |
| Yumin and lower Buji / 渔民村与布吉河下游 | Broad river/pond/village context only. The masked southern part and tonal changes don't date a bank or house. |
| Wider municipality / 市域外围 | The fit does not qualify the Nantou approaches, northern rail or a 1979 shoreline. Keep Guangshen Road as estimated and the northern rail as two dashed review bands. Do not treat unregistered A010/F010 segments, October 1979 water, or November 1984 MSS as observations at the chosen cutoffs. |

The opening now uses field-like cover for the former Shangbu row-compound envelope, neutral ground for the south apron and oval, and a local fabric-only trim on western Caiwuwei. All four review areas fall inside the A010/c alpha support (100% of rasterized sample centres); that is **not** evidence of when the change occurred. The existing field, water, railway and bridge qualifications still apply. No pre-opening geometry is inferred for Shekou from the unregistered western segments.

开场将上步排屋范围改为田地示意，南侧场地与椭圆场地改为中性地表，并仅抑制蔡屋围西侧选定范围的建成模型。四处审查区均位于 A010/c 有效掩膜内（栅格像元中心覆盖率 100%），这并不确定变化时间。保留原有田地、水体、铁路及桥梁的证据限制，不使用未配准的西段影像推定蛇口开场几何。

## January changes and withheld placements / 一月变化及暂不落图项

- **Luohu / 罗湖:** mid-rise courts and an open worksite near the commercial junction, not a mapped build-out of the 0.8 km² planning package (`phase1.fiscal.luohu.site_servicing_estimate.1980`). The local catalogue's 1982 site images support works character, not coordinates (`atlas.photo.luohu_worksite.caption_1982`). Distinguish the **Guoshang junction proxy / 国商路口示意** (completed separately: `phase1.guoshang.commercial_building_completed`, locality `core_basin.guoshang.site`) from unfinished **Guomao / 国贸** (`phase1.guomao.construction_visible_january_visit`, `phase1.guomao.standard_floors_started`). The completed tower in the purported February Guomao image is still excluded. The positions, podium and floor counts are illustrative.
- **Shangbu / 上步:** several factory courts show completed industrial fabric (`phase1.zoning.shangbu.factory_1_completed`). The **Electronics Building junction proxy / 电子大厦路口示意** uses the horizontal window bands and near-solid end wall seen in the 1983-captioned view `1759220777.jpg` (`atlas.photo.electronics_section.caption_1983`); neither that reference nor the completion record (`phase1.zoning.electronics_building.completed`) surveys the geometry. No named Huafa factory parcel or completed boulevard.
- **Bagualing / 八卦岭:** open graded benches and spoil in a district proxy, without a factory build-out. The gazetteer identifies the district and the October start (`phase1.zoning.bagualing.road_envelope_gazetteer`, `phase1.zoning.bagualing.first_works`), not how much of it was grade-ready by January.
- **Shekou / 蛇口:** factory courts and inland worker housing have separate dry-land envelopes (`phase1.shekou.completed_operating_industrial_projects.1983`, `phase1.shekou.worker_housing_floor.1983`). Neither statistic fixes footprint or count. No altered shoreline, fill or port infrastructure.
- **Yumin / 渔民村:** one compact demonstration compound replaces overlapping generic huts on the northern dry bulge. Parallel pale two-storey rows, small yard strips, lanes and drains draw on `phase1.housing.yumin.houses.1983_02`, `core_basin.photo.yumin.1981` and the near-date `phase1.housing.yumin.site_layout.1984_02`. The ancillary low shed is not a located workshop. The aerial dates, independence and heading are unresolved; the model count resolves neither of the 33/35 reports. Ponds and weather are unchanged.
- **Still withheld / 仍暂不落图:** Friendship Department Store, the Luohu pedestrian span and campus parcels. Restricted flights, year-only 1984 views and later MSS are not January geometry. The Shenzhen photo catalogue is reference-only; no new source images ship.

## Shared ground and review / 共用地面与审查

Both levels use the same derived map, district envelopes, deterministic parcel layouts and water context. Overview uses simplified roof masses; detailed tiles additionally apply local relief and corridor setbacks, so small differences at edges are possible. Terrain at LOD1 and authored models share the basin lattice including river/pond carve. The solid authored patches reserve their land at LOD0 and LOD1; the worker omits whole overlapping instances rather than leaving cut roofs. Their coarse silhouettes yield as the owning detail tile fades in. Shenzhenxu only replaces nearby fabric after its detailed tile is ready. The same streamed street ribbons run through and beyond the patch; there is no second paving mesh at their boundary. R01 remains a September prototype, not a dated match, and the two bookends intentionally share a simpler unnamed frontage rather than inventing a visible parcel change.

Review in the offline HTML: choose **January 1984** and use the bilingual district and junction buttons in the inspector. For an exact matched view, change only `epoch` (`opening`, `baseline`, `visit`) in the served camera URLs:

| View | Query (append to `/?epoch=visit&`) |
| --- | --- |
| Luohu | `focus=core&at=38770,38190&span=1120` |
| Shangbu / Electronics | `focus=core&at=35850,37815&span=770` |
| Shekou | `focus=shekou&at=18748,43271&span=1112` |
| Shekou inland edge | `focus=shekou&at=18300,42900&span=1250` |
| Yumin | `focus=yumin&at=38191,38727&span=460` |
| Hubei–Huangbeiling | `focus=core&at=40150,37670&span=1450` |
| Nantou roadside | `focus=nantou&at=18750,37400&span=760` |
| Bagualing | `focus=core&at=37236,36137&span=940` |

The layer selector hides the built scene without changing its date; the original September trace and place controls are only for September photography. `kits.html` shows the reusable factory, high-rise (including the `tower_works` stage), dormitory and village-house families outside the map at matched scale. Run `node apps/snapshot-3d/portable-kits.mjs` for its self-contained export.

## Camera-locked comparison and Luohu street view / 同视角时点对照及罗湖街景

- **Flip / 切换** (`F`) swaps the last two built dates without changing the current pan, orbit, zoom or street pose. Initially it pairs a bookend with September (September with January 1984). `1` selects the 1979 opening, `2` September 1980, and `3` January 1984. `Esc` leaves a detail study. Date controls don't change the active acquisition-dated imagery, its traces or place pins. / 切换按钮及 `F` 在最近两个建成时点间切换，保留平移、旋转、缩放及街景视点；默认以九月基准对照。`1` 选 1979 年初，`2` 选 1980 年 9 月，`3` 选 1984 年 1 月，`Esc` 退出精模。切换时点不改变影像、描绘或地名定位。
- **Map key / 图例** follows the active layer and toggles. The built key separates mapped routes, estimated routes, and unresolved rail search bands (not track); the KH-9 key describes the September trace colours and line styles only when those traces are on. / 图例随图层和开关更新，区分底图线路、估计线路及并非轨道的铁路待核带；开启九月描绘后，KH-9 图例显示其颜色与线型。
- **Luohu street / 罗湖街景** opens from the January built map, or use `?lod2=luohu&epoch=visit` in a served build. This fixed 16:9 street composition follows the unchanged `south-transverse-road` ribbon and shows the existing Guomao and Guoshang batches together. The January-only furnishings add a work enclosure, scaffold, verge and podium entry; they do not modify the road geometry, atlas building footprints, or September GIS. Flip to review the earlier scene from the same eye with those furnishings absent. / 一月建成图可进入固定 16:9 罗湖街景；沿用南侧横向道路描线、原国贸施工模型及国商路口示意。一月专用围挡、脚手架、路缘及裙房入口不改变道路几何、图集建筑轮廓或九月 GIS，切换至较早时点可在同一视点对照。

The street composition is **not** the historical Guoshang rooftop viewpoint or a photo match. The Guomao stage and Guoshang completion/locality refer to the claims above; the two landmarks have separate on-screen labels linked to their respective citations. The street edge, staging positions, quantities and view are illustrative. No additional photos are packaged. / 街景并非历史上的国商楼顶视点或照片复拍。国贸施工阶段与国商竣工及区位依据见上文，各自的地图标注连接对应引文；路缘、工地布置、数量与视角均为示意，不附新照片。

### Additional street studies / 新增街景

Open **Shangbu roadworks / 上步路工** or **Yumin lane / 渔民村街巷** from the January built view. In either study `F` and `1`–`3` compare the same eye across built dates; `Esc` returns to the local map. On Yumin's inspector, switch between the lane and pond edge. Switching the camera intentionally changes the view; changing the date does not. / 从一月建成图打开上步路工或渔民村街巷。`F` 与 `1`–`3` 固定视点对照，`Esc` 回到局部地图。渔民村说明栏可切换巷内及塘边视点；仅切换视点时改变画面构图。

| Fixed frame / 固定视点 | Served URL / 在线预览参数 | Basis and limits / 依据与边界 |
| --- | --- | --- |
| Shangbu roadworks / 上步道路工程 | `?lod2=shangbu&epoch=visit` | `atlas.photo.electronics_section.caption_1983`, `core_basin.photo.electronics.shennan`, `phase1.zoning.electronics_building.completed`. Reuse the January junction proxy, anonymous open-frame shell and shared September road ribbons. A shallow display cut between low banks and a few supplies suggest the works without cutting the DEM, re-paving a road or copying the depth and bearing of the photographed trench. / 沿用一月路口示意、无名未完成楼体及九月道路。仅用低土坡间的浅槽与少量物料提示施工，不挖改地形、不铺设新道路，也不复制照片沟槽深度及方位。 |
| Yumin lane / 渔民新村街巷 | `?lod2=yumin&epoch=visit` | `phase1.housing.yumin.houses.1983_02`, `phase1.housing.yumin.site_layout.1984_02`, `core_basin.photo.yumin.1981` and `core_basin.photo.yumin.1984`. View the shared demonstration compound along a concrete lane. New low walls, gateposts and planted accents are illustrative. No historic lane plan, house count or precise frontage is established. / 沿水泥巷查看同一示意组团。新增矮墙、门柱及绿化仅为示意；不确定历史巷道平面、栋数或立面尺寸。 |
| Yumin pond edge / 渔民村塘边 | `?lod2=yumin-pond&epoch=visit` | Another angle on the same compound and pond margin, not a georeferenced photo. Distant blocks retain their atlas placement; no forced landmark sightline. / 从另一视点看同一组团与塘缘，非配准照片。远景沿用图集位置，不强行安排地标视线。 |

On earlier dates the model shows only the applicable atlas fabric from the fixed camera. The January dressings do not imply the course of an earlier Yumin lane, the time of an individual house replacement, or a measured sequence of road work at Shangbu. No imagery or weather is attached to these view switches. / 较早时点仅从同一视角显示对应图集内容。一月细部不用于推断渔民村早期巷道、逐户更替时间或上步工程序列。切换视点不改变影像及天气。

## January coherence pass / 一月场景衔接调整

The January changes are **bounded render overlays**, not revised land-use observations. Both September GIS files, source cover IDs, relief and routes are unchanged. Replace overlapping field or shed instances where the built scene would otherwise carry them through a site. Protect pond mosaics and use a separate muted, varied graded-ground tint with low relief-following pads. / 一月改动仅为限定范围内的渲染叠加，非新的土地利用观测。两份九月 GIS、地类编号、地形及线位不变。受影响位置替换重叠的田块或工棚，保留塘区，采用低饱和度的粗整地面及随地形布置的低平台。

| Area / 地区 | January interpretation / 一月示意 |
| --- | --- |
| Luohu / 罗湖 | Disturbed soil, open work yards and intermittent mid-rise courts immediately around Guomao and Guoshang. Preserve outlying fields and the Shenzhenxu/Xiangxi contrast. The loan and plan figures do not equate to ground graded, and year-only later skyline views don't fix a January tower count. / 国贸、国商周边表现扰动土、施工场及间断的多层院落；保留外围田地、深圳墟及向西村对照。贷款及计划面积不代表实地平整范围，后续年代照片不确定一月楼数。 |
| Shangbu / 上步 | Worked shoulders, factory and dormitory courts, and one anonymous early-rise shell behind the Electronics Building proxy. The 1983 section photo supports contrast, not the shell's identity or January status. Keep the outer field belt, the September centreline and road gaps. / 表现粗整路肩、厂舍院落及电子大厦示意后方的无名未完工体量；1983 年图片只支持场景反差。保留外侧田地、九月中心线及断续道路。 |
| Hubei–Huangbeiling / 湖贝—黄贝岭 | Bounded roadside slabs and broken bare plots coexist with low roofs and ponds; the 1983 catalogue views are not a road-width or parcel survey. / 局部路侧楼块、裸地和旧屋、水塘并存；1983 年图不用于测量路宽或地块。 |
| Shekou / 蛇口 | Small dry inland works pockets join the housing and factory context to the hills. The 1983-labelled Shekou/Chiwan insert (`phase1.video.1983.shekou_earthworks`) informs character only. No shoreline, fill, berth or DEM change. / 内陆少量裸地施工斑块衔接厂舍与山丘。1983 年标注影片仅作特征参考，岸线、填海、泊位及地形仍不改动。 |
| Nantou and west / 南头及西部 | Modest roadside margin; no backdating the year-only Nantou skyline, route or signs and no Dachong bridge placement. Retain existing rural lowland coverage rather than claiming a continuous mapped 1984 field belt. / 仅示意局部路侧粗整地；不回推南头照片中的楼群、路线或路牌，也不复建大冲桥。保留现有乡村低地背景，不宣称已绘出连续的一九八四年田地带。 |

From this isolated checkout, prepare citations and grid assets using `node apps/snapshot-3d/prepare.mjs <research-checkout>` (the existing main research checkout supplies Task 3 and R8a claim records). The existing municipal and core-relief packages are separate inputs. Run `npm run check`, `npm run build -w @sz/snapshot-3d`, then `node apps/snapshot-3d/portable.mjs`. The portable allowlist excludes the native 2 m chip, 1977 scans, R01, the user-supplied county-town scan, and all other reference photos.

For the next-study decision, evidence tables and build approaches, see [`docs/research/atlas-next-studies.md`](../../docs/research/atlas-next-studies.md): the 1981 municipal government block is recommended first, the Luohu station approach second, and the Caiwuwei/Shennan bend deferred until its photographs are acquired and registered. / 下一批研究的选择、证据表及建模方式见该说明：建议先做 1981 年市政府大楼，其次罗湖车站进路，蔡屋围深南转弯待照片入藏并配准后再做。

### Government block / 市政府大楼

Open **Government block / 市政府大楼** from January (`?lod2=civic&epoch=visit`). Compare with `F` or `1`–`3` from the same camera. The January-only clear box is a render mask on dry land north of the existing Shennan corridor, not a parcel or a claim that the earlier site was vacant. The 1982 schematic map constrains relative location; the later gate-photo geotags are camera positions; the relief and water are shared atlas comparators. There is no road extension, sculpture or dormitory reconstruction. / 从一月时点打开市政府大楼；用 `F` 或 `1`–`3` 固定视点对照。仅一月使用深南路既有走廊以北的陆地渲染遮罩，不代表地块边界，也不认定此前为空地。1982 年示意地图仅约束相对位置，后期大门照片坐标为拍摄位置，地形和水体沿用图集对照。未增建道路、雕塑或宿舍。

The card contrasts the former county seat at Caiwuwei with the shared Party/government office on the Shangbu rise. See `site.county_offices.exists_1979`, `phase1.map.1982.municipal_government_compound`, `phase1.site.municipal_government.1981_form` and `phase1.photo.1984.municipal_government_form`. The film identification and gate relationship are not proven. The precinct is documented, but the model dimensions and viewpoint are illustrative. `conflict.phase1.municipal_government.occupation_date` remains open: the early-1981 wording concerns cadre housing and does not fix the office block’s occupation. / 说明卡对照蔡屋围旧县城与上步岭的党政合署办公楼。影片楼体辨认及门廊关系尚无定论；院落位置有据，模型尺寸与视点为示意。启用日期冲突保持待核：1981 年初的说法涉及干部住房，不能确定办公楼启用时间。
