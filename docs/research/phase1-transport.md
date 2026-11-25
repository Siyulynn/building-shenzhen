# Roads and public transport in the core basin, 1975–1985 / 道路与公共交通

Research note for `docs/design/systems/phase1-slice.md` §1.1 and §3. It answers one question and records one
later-phase system:

1. **Should Area 2 (Luohu crossing, the station and Yumin) start joined to Area 1 (the market town) by road, or stay
   disconnected as a turn-1 task?** The evidence says it was joined, and that the east side was joined too.
2. **What did public transport look like before 1985?** A small bus company with one route in 1975, two routes in 1979
   and five by 1982. Phase 1 does not model it. The record is here for later phases.

Every statement below cites a claim in `data/evidence/claims/phase1_transport_network.yaml`. The claims are `sourced`,
not `verified`: a person still has to check them. The road **placements** on our grid are `lead` throughout — the 1977
sheet has not been georeferenced, so only its topology is used.

---

## 1. The town–Luohu corridor existed before 1979

The 1977 1:5,000 street sheet (`phase1_shenzhenxu_1977_shenzhen_street_map`) draws the Kowloon–Canton railway with **a
road on each bank**:

- **建设路 / Jianshe Road** on the east bank, labelled vertically from 解放路 south past the station
  (`site.jianshe_road.exists_1979`).
- **和平路 / Heping Road** on the west bank, named in the same memoir (`site.heping_road.exists_1979`).

A memoir of the town before 1980 describes both as asphalt roads with 木麻黄 trees, and the eastern one as the link
between the town and the border: *"建设路南连罗湖火车站，北通解放路"* (`site.jianshe_road.town_to_station`).

This fits the station's own history. The 1911 深圳墟站 stood at 解放路 × 和平路, by the old town; in 1950 the station
moved to the Luohu crossing. The corridor between the town and the border is therefore the oldest road link in the
slice, not a later addition.

A local chronology also lists a **深罗公路 (Shenzhen–Luohu road)** opened in 1929
(`site.shenzhen_luohu_road.1929`). That claim is a `lead` from a user-compiled web chronology and is not needed
for the decision; it only suggests the corridor is older than the 1950 station move.

**Caution.** The transport wiki dates the present 建设路 to 1982. That is consistent with the memoir: a pre-1979 road
can predate the 1982 rebuilding of the modern road. Do not read the 1982 date as the road's first appearance.

## 2. The east side: the only export road

From the Dongmen crossroads a sand road ran south-east to the 文锦渡 bridge
(`site.dongmen_wenjindu_road.exists_1979`): *"沙土路往南一直延伸至文锦渡桥头"*, described as the only route for
export goods to Hong Kong at the time. The 1977 sheet shows the same road leaving 解放路 east through 湖贝 and on to
文锦渡.

So the pre-1979 network is a **T**: the town at the top, 建设路/和平路 running south to the station and the crossing,
and the 解放路–文锦渡 road running east. Shangbu, Sungang and the west are reached by the county roads and the railway,
not by a built urban street grid.

## 3. Public transport, 1975–1985

| When | What | Claim |
|---|---|---|
| 1975-12 | 宝安县深圳镇公共汽车公司 founded: **2 buses, 12 staff, 1 route** 侨社–东门, 2.3 km, 0.2 yuan full fare, mainly for Hong Kong visitors | `phase1.transport.bus_company_1975` |
| 1975 | Route 1's first stops: 深圳汽车站 (晒布路) – 十字街 – 深圳戏院 – 邮电局 – 友谊商场 – 火车站 | `phase1.transport.bus_route_1_stops` |
| 1979 | Renamed 深圳市公共汽车公司; **2 routes, 12 vehicles**; only the station squares had fixed termini | `phase1.transport.bus_fleet_1979` |
| 1980 | **31 vehicles, 3 routes**; from 23 February a Hong Kong joint operation added 15 vehicles | `phase1.transport.bus_fleet_1980` |
| 1981-01-13 | The Planning Commission's fare notice sets five routes: 深圳汽车站–沙头村, 侨社–沙头村, 罗湖火车站–沙头村, 罗湖火车站–深圳水库, 侨社–深圳水库; fares 0.05–0.55 yuan | `phase1.transport.fares_1981` |
| 1982 | **5 routes, 24 vehicles**: 火车站/侨社–水库, 火车站/侨社–东门汽车站, 东门汽车站–福田路口, 北方大厦–南头, 东门–沙头角 | `phase1.transport.routes_1982` |
| 1983 | Fixed stops and timetables; new termini at 福田路口, 黄贝岭 and 水库; 60 shelters | `phase1.transport.fixed_stops_1983` |
| 1985 | **20 routes** inside the SEZ, numbered, 2–5 minutes at peak | `phase1.transport.routes_1985` |
| c.1980–85 | Hail-anywhere minibuses fill the gaps the big buses miss; over 1,000 by 1985 | `phase1.transport.minibuses_1980s` |

Two things matter for the game:

- **Route 1 ran on the corridor in §1.** 侨社 sat by the station; the stops run north through 友谊商场, 邮电局,
  深圳戏院 and 十字街 to the 东门 bus station. A bus service from 1975 is independent evidence that the road link
  existed and carried traffic.
- **The 1981 fare notice names the destinations the city actually served**: the station, 侨社, 深圳水库, 沙头村,
  沙头角. Later routes add 东门汽车站, 福田路口 and 南头. These are useful content anchors for bus routes in Phase 2+.

The numbers are small: 2 buses and one 2.3 km route in 1975, 12 vehicles in 1979. In 1979–84 the bus is **not** a
capacity constraint on the city's growth. It is a service, a map layer and a story.

## 4. What this means for the start network

**Decision: join Area 1 to Area 2 at the start, and join Area 1 to Area 4.** Leaving Luohu disconnected is not a
plausible 1979 state and it breaks the R4 reach model in a way players will notice (Yumin's rental beds and the
station cannot draw workers from the town).

The current `content/slice/start_network.yaml` has two temporary routes: the KCR railway, and a road labelled
`site.guangshen_road` whose waypoints run west from the town through 蔡屋围/上步. The railway is right. The road needs
review: its alignment looks like **深南路**, which was a 1979–80 construction project, not a pre-existing road. The
old Guangzhou–Shenzhen road did not run on that line through Shangbu.

Proposed start network (temporary, orthogonal, on playable cells):

```yaml
max_frontage_depth: 6
routes:
  - site: site.kcr_line               # unchanged: the railway is a transport layer, not a road component
    placement: temporary
    waypoints: [[385, 395], [385, 390], [385, 382], [382, 382], [382, 368], [383, 368], [383, 347]]
  - site: site.jianshe_road           # new: 建设路, the town's road to the station
    placement: temporary
    waypoints: [[387, 377], [386, 377], [386, 390]]
  - site: site.dongmen_wenjindu_road  # new: 解放路 east, then the sand road south to 文锦渡
    placement: temporary
    waypoints: [[399, 372], [400, 372], [400, 381]]
```

- The 建设路 path is **15 cells = 1.5 km**, the length the modern road still has. It starts on the register's
  market-town point `(387,377)` and ends at `(386,390)`, next to the station cell `(385,390)`. It runs along the east
  side of the railway and never overlaps a rail cell.
- The 文锦渡 path is **11 cells = 1.1 km**, from the town's east edge at 湖贝 to the crossing cell `(400,381)`.
- The crossing cell `(385,395)` is also the railway's first cell, so no road can be built onto it. The town–station
  road ends beside the station; the last few hundred metres to the bridge are the railway corridor.

### The western temporary route is a planning fixture, not the old Guangzhou road

`content/slice/start_network.yaml` also carries `site.guangshen_road` as a westbound route from `(387,377)` through
`(384,363)` to `(347,346)`. Its alignment runs across 蔡屋围, 笋岗 and 上步 — the line of the later **深南路**, which
the Lufeng crews were building in 1979–80, not a road that existed at the start. The 1977 county sheet
(`phase1_shenzhenxu_1977_baoan_county_map`) shows the county's radials instead: north along the railway, west to Nantou,
east to Shatoujiao. Which one the old 广深公路 followed, and where it entered the town, is unresolved;
`site.guangshen_road.exists_1979` says only that a Guangzhou–Shenzhen road already existed.

For R3–R5, keep the route: organic growth and the headless policies depend on it. Display it as a temporary alignment
(the UI already labels these), and do not treat its name as a historical statement. Trace the county sheet and the
KH-9 mosaic before renaming or moving it. If the prologue's first road project is meant to be Shennan, the route
should eventually leave the start network.
- Two new register records are needed, both **unplaced** road sites with an encyclopedia claim:
  `site.jianshe_road` and `site.dongmen_wenjindu_road`. The register hash in
  `data/starts/slice_site_cells.json` must be regenerated (or recomputed) with `pipeline/m1b_sites.py`.
- **和平路 is not proposed.** With the temporary railway at x = 382–385, a faithful west-bank road cannot be drawn;
  it would sit on the wrong side of the line. One link is enough for play; add it when the railway alignment is real.

### What the change moves

- **Reach classes.** Areas 1, 2, 3, 4, 5 and 7 become one road-reach class at the start; Area 6 (the reservoir hills)
  stays isolated. R4's labour matching and migration allocation therefore change.
- **Tests.** `packages/sim-core/test/jobs.test.ts` uses "area 2 has no road at the start". That test must move to
  area 6.
- **Golden runs.** All five goldens move. Regenerate with `npm run golden:update`, and explain the move in the commit:
  the start now has the historical town–station and town–文锦渡 links.
- **Readiness.** Today only `area.roadKm` from M4 projects counts, so the inherited roads still read zero. If we want
  the readiness bar to recognise them, count the start network's and built roads' reach instead of `roadKm`. That is
  the R4.5 bridge patch, not part of this content change.

### What not to add yet

- **A bus overlay.** Phase 1 has no transit capacity model. A route drawn on the map would be decoration. Record the
  claims now and build it with the transit phase.
- **Area 6.** The 1981 fare notice lists 罗湖火车站–深圳水库, so a road to the reservoir existed by 1981. That is a
  candidate player work or content, not a 1979 start road.
- **The old station site** at 解放路 × 和平路. The station moved in 1950; the 1979 site is the Luohu one already in the
  register.

## 5. Sources and status

- **1977 street sheet** — `phase1_shenzhenxu_1977_shenzhen_street_map`, tier D as reproduced (a 1977 survey sheet shown
  in a blog post). The road labels are legible; the sheet is not georeferenced.
- **Memoir** — `phase1_old_shenzhen_roads_memoir`, tier D. A resident's recollection with dated photographs. Good for
  topology and for the feel of the roads; not a survey.
- **Shenzhen Archives** — `phase1_sz_archive_bus_history`, tier D. An official archive feature that quotes archival
  documents; the underlying 《深圳市交通运输志》 (2001) is not in the store.
- **晶报** — `phase1_jingbao_bus_40_years`, tier D.
- **Wikipedia** — `phase1_sz_bus_wikipedia`, tier D, itself citing 《深圳市交通运输志》 (2001).
- **360百科** — `phase1_360_sz_bus_route_1`, tier D, user-edited; the stop list is the only detail of this kind found.
- **Local chronology** — `phase1_sz_old_road_chronology_blog`, tier E. Leads only (the 1929 深罗公路).

**Research targets before `verified`:**
1. Open 《深圳市交通运输志》 (2001) and check the 1975 route, the 1979–82 fleet and route counts, and the 1981 fare
   notice against it.
2. Georeference the 1977 sheet against the 1980-09-11 KH-9 mosaic (at least six GCPs on the railway, station, Luohu
   bridge, river bends and 十字街), then trace 建设路, 和平路 and the 文锦渡 road.
3. Find a 1970s photograph or plan that shows 建设路 carrying vehicles, to replace the memoir as the load-bearing
   source for the road's use.
