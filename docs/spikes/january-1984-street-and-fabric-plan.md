# January 1984 atlas: streets, blocks and landmarks

Use a small number of hand-placed landmarks to establish Shenzhen's skyline and junctions. Generate the rest as **street-facing blocks and compounds**, with different layouts for old-town lanes, factory districts, housing estates and active works. The [January atlas](scene-review/snapshots/Shenzhen_January_1984_Shennan.html) is the test scene; the playable slice's road and zoning rules are the design precedent.

## What to match in the photos

The [catalogue register](../research/shennan-photo-viewpoints.md) supplies the camera and source for each frame. Compare road axis, land/water/rail edges, foreground blocks and skyline in that order. A poor camera match can make the same street look disconnected or put a landmark on the wrong side. Use the street axis, rail line and ridgelines to recheck the Caiwuwei and Heping bearings before editing geometry for either view.

| Review views | What the atlas should learn from the photographs |
|---|---|
| Guomao / Renmin (`atlas.photo.szlzp.1554`) and Caiwuwei (`atlas.photo.szlzp.1555`) | A strong road axis, compact low-rise fabric beside the new development, and taller buildings grouped on a few compounds. Keep January's unfinished Guomao and railway break; the later junction and skyline are comparisons. |
| Hongling (`atlas.photo.szlzp.1557`), Shifu (`atlas.photo.szlzp.1558`), Huaqiang (`atlas.photo.szlzp.1561`) | Coherent road approaches and a clear contrast between groves, civic grounds, long factory slabs and low halls. Ranks of similar blocks belong to a compound with one or two entrances. The photos do not date individual gates, gardens or the wide junction profiles to January. |
| Yannan (`atlas.photo.szlzp.1559`) and Heping (`atlas.photo.szlzp.1511`) | Related walk-up slabs in rows, interrupted by yards and active construction. The Heping rail edge, sheds and planted frontage should read as separate bands rather than an empty buffer. |
| Huangbeiling (`atlas.photo.szlzp.1552`) and Hubei (`atlas.photo.szlzp.1553`) | Junctions, paving and construction shoulders matter as much as buildings. Keep the older lanes, fields, water and hills legible alongside the new route. Use the early photos to guide street treatments; don't infer exact widths or copy the later boulevard throughout the atlas. |
| Dongmen and Renmin street views (`atlas.photo.szlzp.1507`, `atlas.photo.szlzp.1510`); early Luohu works (`atlas.photo.szlzp.1518`, `atlas.photo.szlzp.1520`–`1524`) | Use continuous narrow shop bays and lanes at street level. Construction has its own sequence: grading, temporary access, foundations, an open frame and then occupied frontage. Check the same kits at eye level and from the air. |
| Outer district and waterfront views | Use these as rural, industrial or harbour references. Dachong needs a registered Dasha channel and crossing before it is a road-alignment target. Shekou, Nantou and other views beyond detailed coverage need locality evidence and a terrain/shoreline review of their own. |

The 1985 aerials justify changes to **how existing January blocks are filled**. Add a new January development envelope only if January-or-earlier evidence supports its extent or stage. Keep January 24, 1984, the September 11, 1980 baseline and the 1979 opening distinct. Retain the existing exports.

## Pass 1 — Roads and junctions

1. Start with the Stage B inferred centre-lines. Join short approaches to nearby roads where the approach direction and dry footprint support it. Use visible core road runs as targets, keeping the underlying traces and crossing decisions. Check the detailed and overview renderers against the same corrected preview lines.
2. Make the road network explicit enough to test **why each end stops**: intersection, plot gate, works access, mapped continuation, or an unresolved break. Remove small isolated fragments once audited. Keep legitimate dead ends and disconnected documented sections. Road/rail and water crossings need a reviewed crossing record; no automatic bridges or extension of Shennan across the rail gap.
3. Give each class a legible profile: **avenue** (Shennan's documented sections; shoulders, select median/kerbs where supported), **district street** (narrower paved surface and a clear junction), **estate/service lane** (one connected access into a usable yard), and **works track** (compacted surface ending at the work parcel). Give intersections a continuous surface and stop medians or kerbs at junctions. Avoid extending paving beyond evidence just to remove a dead end.
4. Review Huaqiang, Shifu, Guomao/Renmin, Hongling, Hubei and the Yanhe junction first. At each, check that the road meets its intended junction or destination, that the street perimeter stays off ponds and rail, and that turning off inferred routes still works. Reuse the reviewed routes as inputs to Pass 3.

### First increment

The January Stage B renderer now joins an inferred approach to another road within 22 m when the approach faces the junction and the extension clears water, rail and reserved landmark footprints. The distance is a modelling tolerance. The Shangbu factory court lane now meets Huaqiang Road, and the Heping approach meets the Caiwuwei street trace. These joins are shared by the detailed tiles and overview. The eastern Shennan–Yanhe junction and the break at the railway are retained. The detailed view also separates a district street's paved centre from its shoulders and uses the core avenue's edge treatment on the Huangbeiling continuation.

In the next increment, audit the remaining ends before changing their geometry. At Huangbeiling, Yanhe is still drawn as a short cross-road trace; give it a readable junction and show the continuation only where supported. The Hongling works approach and the map-traced Hongling link remain separate. Review the gap against the dated map and photographs before joining them. In Shangbu, distinguish the genuine compound entrances from the unconnected ends of the inferred grid. These cases need different treatments even when all three look like stubs at aerial scale.

The first increment was exported locally as `build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Roads.html`. Keep it alongside later previews for comparison.

### Pilot road and camera audit

- **Shangbu:** The factory service lane joins Huaqiang, but overlaps the May preview's South Shangbu cross-street corridor east of Huaqiang. Treat these as competing alignments for that part of the corridor; the eastern service-lane end is unconfirmed as an entrance. Keep those lines as estimates and don't use the overlap for access. The pilot uses the Yannan approach where it joins the local January Shennan ribbon.
- **Hongling and Yanhe:** Hongling's two input lines share a raw endpoint, but dry and clearance checks leave about 294 m between the nearest rendered ends. Keep the break. The eastern Shennan approach meets the short Yanhe trace; the paved edge opens at that junction, with both ends of Yanhe treated as unresolved continuations. Neither check establishes a January crossing or street length.
- **Caiwuwei and Heping:** In the `1555` photo the rail cuts across the foreground and the main road recedes near the centre; the current camera reads as an oblique Luohu view. `1511` shows the rail, Heping frontage, river bend and ridge as successive bands that the current north-looking view does not reproduce. Both cameras are low-confidence locality comparisons until those alignments can be registered together. Keep the existing geometry; the photos guide the arrangement for the later Luohu review.

## Pass 2 — Reusable building and site kits

| Kit | Change |
|---|---|
| Old-town arcade / village row | Revise `lingnan_block` for narrow, continuous shop bays facing streets, with small courts and back lanes. Keep village roof rows and lanes as a separate pattern. |
| Housing estate and dormitory | Add a walk-up estate variant alongside the dorm. Group matching slabs in bands; use stair-core breaks, balcony or gallery options, and shared planted courts. |
| Multi-storey factory and low industrial hall | Improve strip windows, parapets and stair cores on the existing factory; add a wide-span low corrugated hall with a loading yard. |
| Commercial tower and construction stages | Add optional podiums and stronger roof silhouettes to `early_highrise`; give `tower_works` open floors, scaffolding and cranes where the references support them. Use early foundation/piling and temporary shed variants at sites that haven't reached tower stage. |
| Compound infrastructure | Make gates, perimeter walls, courts, sheds, clustered canopy and street edges reusable pieces. Use paved yards at occupied compounds, disturbed earth inside works, and preserve wet and farm cover in between. |

Judge each kit in at least two districts. Use a few related variants per compound so the city has recognizable repetition without identical blocks everywhere.

### Pass 2 atlas preview

Shangbu now mixes low blue-grey factory halls with strip-window factory slabs. The same low hall is available at the Huangbeiling edge. Matching walk-up rows, with balcony bays and stair cores, appear in Shangbu and Luohu alongside the existing dormitories. Generated market terraces have recessed shopfronts behind columns facing their lanes. Completed generic towers have a stepped roof volume; towers under construction have exposed decks, a scaffold on all four sides and a crane silhouette.

Paved courts, gate gaps, wall sections and planted margins sit inside the existing interpreted blocks. Selected works envelopes in Shangbu, Luohu and Huangbeiling can hold haul strips, foundation pads, pile frames and temporary sheds; graded-only ground still has its own simpler treatment. Guomao, the other named landmark models, and the dated development envelopes are unchanged. The anonymous forms remain interpretations of the photo groups above.

Compare Huaqiang and Shifu for the two scales of industrial building, Yannan and Heping for the walk-up rows, and Guomao and Huangbeiling for the construction and settlement edges. The remaining gaps between compounds will need street-facing subdivision and real entrances in Pass 3.

The local preview is `build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Fabric.html`. From the atlas working directory, rebuild with `npm run build` and `node portable.mjs Shenzhen_January_1984_Fabric.html`.

## Map proposals before Pass 3

[Compare the two zoning maps](scene-review/zoning/index.html): [1979 opening](scene-review/zoning/core-basin-1979.svg) and [24 January 1984](scene-review/zoning/core-basin-1984.svg). Both use the same 100 m game grid, with the core atlas trace window outlined and adjacent northern districts included for context. Use the [proposal data](scene-review/zoning/core-basin-proposals.json) to identify the underlying atlas envelopes and the claims for each district. These are planning overlays; they leave the playable start, historical templates, atlas exports and geometry unchanged.

| Layer | 1979 opening | 24 January 1984 |
|---|---|---|
| Inherited stock | Dongmen's market-town fabric is shown as commercial/standard; old villages as residential/low. Hatching identifies stock already present at the opening. | Carry the same inherited stock layer. Leave the 1984 degree of replacement inside those footprints unresolved. |
| Planning zones | Two dry reserve pockets and an optional low-intensity works yard show the tools available at turn 0. No avenue or high-intensity zone is assigned. | Use industrial/standard for the Shangbu plant courts and residential/standard for nearby housing. Bagualing is industrial under works; Shuibei is a low-intensity candidate. Luohu gets standard commercial and housing blocks plus one selective high-intensity commercial frontage. |
| Road classes | Show the old-town axes and the slice's temporary start-road fixtures separately. Local access follows `track`; town approaches follow `street`. | Use `avenue` for the separate Shennan reaches and show the rail gap. Use `street` for district approaches and `track` for rural, service and works access. Dashed candidates do not supply frontage to high-intensity cells. |

Facilities and railway are separate map symbols; there is no `public` zone in the game. Floodplain, ponds, hills and land outside playable areas are base layers. New zoning excludes wet cover, steep terrain, inherited built-up land and the route cells drawn for each date. The January high-intensity example is cell `(393,378)` beside the eastern avenue cell `(393,377)`; it is a design example, independent of the named Guomao worksite. Dated evidence supports Shennan's staged development (`phase1.shennan.first_paved_segment_west`, `phase1.shennan.east_reach_1983`). The May 1984 preview supplies relative layout for dashed streets (`phase1.map.1984.preview_edition`, `phase1.map.1984.overview_comparison`); it does not establish a January opening date or a road crossing. Both plates use the same opening land-cover comparison. The cell counts and boundaries are planning choices.

Regenerate from the repository root with `pipeline\.venv\Scripts\python -I pipeline\make-zoning-maps.py` (or `npm run design:maps`). The script lives in `pipeline/` because the game's `pipeline/m3d_historical_zones.py` consumes the grid it writes.

## Pass 3 — Generate from road frontage and zone intensity

Reuse the game branch's vocabulary: `industrial`, `residential`, `commercial`, `reserve`; `low`, `standard`, `high`; and `track`, `street`, `avenue`. In the sim, high intensity requires an adjacent avenue and frontage propagates inward from completed roads (`packages/sim-core/src/zones.ts`, `network.ts`). The atlas can apply the same logic at finer scale without moving render decisions into the sim. Old town, village, civic, park and works are atlas context rules.

Generate in order:

1. Reserve water, rail, steep terrain, protected cover and anchor footprints. Keep the dated road and land-use evidence fixed.
2. Divide development envelopes by the higher-tier streets and barriers. For each block, choose a grain from its actual frontage or a retained older axis. Connect any internal lane to a district street or an existing compound gate.
3. Place frontage first: commercial blocks and occasional tower clusters at serviced avenue nodes, long factory or civic ranges facing district streets, walk-up groups behind a shared court and narrow shop bays on older lanes. Let interiors take workshops, dorms or service yards. No frontage means no new finished urban block; retain field, village or reserve unless work is independently supported.
4. Keep layout deterministic across tiles and cameras. Make changes to an inferred block local. Compare roof coverage, street continuity, compound orientation and open-ground distribution across views before increasing density globally.

Start with one Shangbu factory/housing block and one Luohu old-town/commercial edge. Promote the rule to other zones only when both pilots look convincing without bespoke building placements.

### Pilot 1 — Shangbu

The January pilot uses a bounded part of industrial/standard `shangbu-industry/3` west of the Yannan approach. It resolves lots in the local road frame. Its two compounds put a factory slab or low hall at the street, with a loading court and a gated drive, and matching walk-ups around a shared court behind. They occupy the existing interpreted development envelope; the layouts and access details are illustrative. The terrain-following drives connect to the actual preview ribbon. The overview and detailed tiles consume the same six building placements.

Open `build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Shangbu_Frontage.html`. In the Shifu view the factory fronts and four walk-ups read as two compounds, where the Fabric preview showed scattered rows with no readable access. The Yannan view shows the depth of the shared courts, and the Huaqiang view retains the Electronics Building on its own junction. The comparison frames still show a denser 1985 district and wider, more finished junctions (`atlas.photo.szlzp.1558`, `atlas.photo.szlzp.1559`, `atlas.photo.szlzp.1561`). Review the Luohu pilot separately before expanding the generator.

### Pilot 2 — Luohu and the Dongmen edge

The January pilot uses two frontages along the transition from the inherited market to Shennan. At Dongmen, 21 anonymous two- and three-storey arcaded shop bays turn with the south market lane, with narrow gaps between groups. On the north side of Shennan, one five-storey commercial slab with a lower podium and shallow forecourt faces the avenue from within the interpreted rail-market edge. The overview and close tiles use the same placements. The Dongmen and Renmin street frames guide the arcade rhythm (`atlas.photo.szlzp.1507`, `atlas.photo.szlzp.1510`); the Guomao/Renmin comparison guides the difference in grain between the two frontages (`atlas.photo.szlzp.1554`). Layouts and dimensions are illustrative.

Both frontages use standard commercial intensity. Most of the proposed high-intensity cell `(393,378)` overlaps the finer atlas field interpretation `hubei-field-south/1`; it stays a planning example. The pilot retains that open ground, the Shennan rail gap, Hubei pond and Guomao's unfinished worksite. It draws no new connecting road between the market lane and avenue.

Open `build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Luohu_Frontage.html`. Compare **Guomao / Renmin Road** for the avenue, **Dongmen street 1979** for pedestrian-scale shopfronts, and **Hubei / Wenjing Road** for the pond and field edge. Keep **Caiwuwei / Heping Road** as a locality check pending camera registration. This closes the two pilots; any wider rollout should select its frontages explicitly before the Pass 4 landmark review.

### Pass 3 closeout

| Frontage | Added beyond the pilots | What limits the build-out |
|---|---|---|
| West Shangbu (`shangbu-industry/0`) | Two factory and walk-up compounds, with short access aprons to the western Shennan shoulder. | The interpreted field strip rules out an approach from Huaqiang into these lots. Retain the existing Shennan and Huaqiang road alignments. |
| Dongmen (`luohu-development/8`) | A second line of low arcade bays facing the retained east–west market street. | Stay inside inherited market cover, avoid named yards and leave gaps between runs. The single high-intensity proposal remains open ground. |
| East Shennan (`hubei-huangbeiling-edge/2`) | Two pairs of walk-ups with pedestrian paths from the avenue shoulder to their shared courts. | Use the existing dry interpretation envelope. The remaining fields, pond edges and works around Yanhe retain their previous limits. |

The frontage planner now supplies 70 shared building placements across the two pilots and the rollout. Anonymous finished fabric and its ground tint respect the interpreted field layer in both renderers. Nineteen inferred inventory sites now show as location-only rather than turning interpreted fields into building yards: the index still offers 144 located entries and 91 site masses. Dated named patches and separately supported works retain their existing local exceptions. The field comparison is derived from the older atlas cover; it does not establish the exact January conversion boundary.

No new roads, crossings or development envelopes were needed for this rollout. Compared from Huaqiang, Guomao/Renmin and Huangbeiling, the retained fields make the January transition more legible but also leave gaps beside the major anchors. Those gaps need January-specific locality evidence before they can be reduced. All 38 selector entries opened the January comparison scene; that interaction check does not register their camera bearings.

## Pass 4 — Place and refine the few anchors that matter

- **Guomao and Guoshang:** refine existing proxies as distinct masses; prioritize Guomao's unfinished shaft and worksite silhouette. Compare the rising-tower and later frames separately before assigning details to January.
- **Electronics Building and Huaqiang Building:** check the identification, massing and January stage independently using dated views and the building register. Refine the existing Electronics proxy first. Keep the opposite frontage generic until the Huaqiang Building's January stage and siting are supported. The 1985 image alone does not establish a 20-storey Electronics Building.
- **Municipal government compound and Lizhi Park:** refine the existing civic gate-to-road relationship. Treat trees, paths, ponds and grounds as landscape anchors where January evidence supports them; avoid copying the 1985 grounds wholesale.
- **Luohu rail approach and crossing:** improve the station edge and low rail-side service fabric with the 1984 bridge view (`atlas.photo.szlzp.966`) and other dated sources. Keep platform, shed and bridge details illustrative where dimensions are unknown.
- **Additional named complexes:** consider Haifengyuan once its January state is clear, or another anchor only if it resolves scale, bearing or identity in multiple views. Use the reusable kits for the rest of the register.

### First anchor increment — Guomao and Guoshang

Guomao's fine and overview models now share an exposed core-and-deck silhouette and an offset crane. A temporary working deck takes the place of the previous solid upper band. The January visit account and the start of standard floors support an unfinished frame (`phase1.guomao.construction_visible_january_visit`, `phase1.guomao.standard_floors_started`); the later main-tower topping claim (`phase1.guomao.main_tower_topped`) and the completed exteriors (`atlas.photo.szlzp.1500`, `atlas.photo.szlzp.1536`) rule out the finished crown and cladding for this view. The undated works frames (`atlas.photo.szlzp.1534`, `atlas.photo.szlzp.1535`) are references for construction character. The second frame already shows a crown; neither frame measures the January shaft or dates the crane placement.

Guoshang reads as the separate, completed slab with a clearer podium entrance (`phase1.guoshang.commercial_building_completed`). Both anchor placements and reserve footprints are retained. In the **Luohu street** view the open decks and crane contrast with Guoshang's enclosed façade; the later **Guomao / Renmin Road** frame checks their relative siting only. The next anchor review is Electronics/Huaqiang, then the civic gate and park edge, followed by the rail-side service frontage. Caiwuwei/Heping camera registration and the exact January heights remain open.

Combined preview: `build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Frontage_and_Anchors.html`. The Road, Fabric, Shangbu and Luohu previews remain available.

Completion means the same streets and block relationships read correctly from several cameras, including approaches not used to tune the layout. Revisit the full selector after each pass; record whether each mismatch is a camera, date, coverage, road, fabric or landmark issue.

### Phase 2 — January design map in the atlas

[Open the Phase 2 preview](../../build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Design_Map.html). Try **Guomao / Renmin Road**, **Luohu street**, **Huaqiang / Shennan Middle**, and **Government block**. The prior exports remain separate captures.

The overview and streamed January tiles share the [resolved design grid](scene-review/zoning/core-basin-design-grid.json). On dry land, built blocks, graded works, civic grounds and transport yards override inherited field colour and crop plots. Avenue reservations between two converted blocks read as worked verges. Roads, ponds, rail and rivers retain their finer placement constraints. Unassigned areas keep the baseline interpretation; the Hubei pond and field cell `(393, 378)` remain open. The opening and September scenes still use their existing cover.

Guomao has graded working ground and a short gate apron, Guoshang has a separate finished forecourt, and Electronics Building stands in the Shangbu industrial fabric with access to the existing Shennan shoulder. Luohu gains a row of anonymous street-facing blocks, separate works compounds, and a low anonymous shed on the dry edge of the station yard. The road alignments and site pads are illustrative; `atlas.photo.szlzp.966` supplies service-edge form, not a January station plan. The government forecourt meets the existing road and the adjacent Lizhi grounds use clustered orchard cover (`phase1.site.municipal_government.site_choice`) with the lake and later paths unresolved.

The 100 m source leaves visible coarse edges and some unassigned pockets, including near the Luohu foreground. The 1985 frames still show later density and skyline that the January map cannot establish. Caiwuwei and Heping still need camera registration before their silhouettes or streets are adjusted; no additional crossing is inferred.

#### Step 1 + Step 2 update — design-grid-driven 3D fabric and Luohu closure

- **Design map (`core-basin-proposals.json` → regenerated SVGs and `core-basin-design-grid.json`):** Extended `luohu-works` (`[[388, 378, 391, 382]]`, 7 → 10 cells) and `luohu-high` (`[[391, 378, 393, 382]]`, 13 → 14 cells) north by one row to close the 3-cell unzoned crack (`(388..390, 378)`) directly between Shennan East and Guomao. Cell `(393, 378)` (`hubei-field-south/1`) remains open, and no `village`/`town` cells were added to proposal or works zones.
- **Ground cover (`src/procgen/january-ground.ts`, `src/procgen/mesh.ts`):** Mapped `inherited_urban` to `'settlement'` (preventing isolated `slice_landcover.json` village pixels at `(389, 380..381)` inside Luohu from reverting to 1980 KH-9 paddyfields), expanded `avenue_verge` to any avenue cell bordering a converted 1984 block, and added a 4-tap spatial blend across 100 m ground-state edges.
- **Design-grid-driven districts (`src/procgen/january-ground.ts`, `src/procgen/districts.ts`, `src/stage-b.ts`):** Synthesized 3D districts directly from `core-basin-design-grid.json` for `luohu-housing` (southeast of Railway Primary School), `luohu-high`, `luohu-support`, `luohu-works`, `shangbu-factories`, `shangbu-housing`, `shangbu-works`, `bagualing`, `hubei-housing`, `huangbeiling-works`, `municipal-civic`, and the three rail/port yards, while yielding to the hand-tuned street frontage pilots and never overwriting inherited 1980 settlement fabric. Updated preview: `build/3d-snapshots/jan84-stage-b/dist/Shenzhen_January_1984_Design_Map.html`.

#### Step 3 update — Lizhi Park, Sungang/rail yards, and varied worksites

- **Lizhi Park (`lizhi-orchard/0`, `src/procgen/fabric.ts:parkGrounds`, `src/stage-b.ts`):** Upgraded from plain trees to a park landscape with a shallow hollow lake (`荔枝湖`, backed by `phase1.site.municipal_government.site_choice`), grassy banks, stone lakeside promenade and feeder walks, two small pavilions, dense lychee/banyan/bamboo canopy, and a `Lizhi Park · 荔枝公园（示意）` map callout. Trimmed the May-map `m84.road.shangbu-north` trace north of Lizhi Park (`northing >= 2496800`) to match the design map so it no longer cuts through the park.
- **Sungang & rail/port yards (`src/procgen/fabric.ts:railYard`, `src/procgen/tile-source.ts`, `src/procgen/municipal-lod0.ts`):** Replaced walled orange construction boxes on `sungang-yard`, `luohu-station-yard`, and `wenjindu-port` with compacted grey gravel aprons and rail-aligned freight sheds. Broke up the coarse 750×900 m `south-sungang-envelope` polygon west of Sungang Railway Station into looser rural village clusters framed by orchard trees in both overview and detailed tiles.
- **Worksite variation (`src/procgen/fabric.ts:worksite`):** Varied `works-compound` yards across open cut-and-fill earthwork pads, long low workshop/shed rows, and active walled foundation compounds so Huangbeiling, Shangbu, and Luohu works avoid a stamped-grid look.
