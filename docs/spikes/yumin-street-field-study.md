# Yumin street and field-edge study / 渔民村街巷与田野试作

**Status:** disposable 3D art blockout for the post–Phase 1 route spike. This is **not** placed in the playable map, a surveyed street, or a verified historical reconstruction. Views deliberately show a small part of a settlement rather than a house count, a cadastral layout, or a crop inventory.

## What informs the model

| Reference | Use | Boundary |
|---|---|---|
| [Shenzhen Water Bureau, 渔民村](https://swj.sz.gov.cn/ztzl/swhjs/swhgs/content/post_11772784.html), especially the [image captioned “1981 Yumin”](https://swj.sz.gov.cn/img/4/4236/4236989/11772784.png) | The article and `phase1.map.yumin_river_location` establish the river-confluence context. The captioned aerial is visual reference for rows of low, mostly flat-roof housing beside large separated ponds and embankments. | Retrospective caption, no confirmed original negative, camera position or georeferencing. The water shapes in the blockout are composed, not traced. |
| Contemporary Yumin housing report, `phase1.housing.yumin.houses.1983_02` and [count conflict](../../data/evidence/conflicts/phase1.yumin.early_villa_count.yaml) | Supports exploring compact two-storey housing in the early scene. | Do not resolve the conflicting house counts by counting the blockout or backdate the report to 1979. The images are an early-state sketch, not a 1979 or 1981 start. |
| Same Water Bureau article, [narrow-lane photo associated with the 2001 redevelopment entry](https://swj.sz.gov.cn/img/4/4236/4236996/11772784.png) | Informs the taller dense-state lane: façade rhythm, balcony projections and narrow sky gap. | Caption relates to redevelopment; does not independently date the exposure or locate the individual buildings. |
| Shenzhenxu manual references, `data/Shenzhenxu/Image_20261123114809_15_2.jpg` and `Image_20261123114811_17_2.jpg`, indexed in the [manual reference inventory](../../data/evidence/observations/shenzhenxu_manual_references.csv) | First photo: composition across foreground field plots and raised banks. Second: lane scale, shallow eaves and doorstep rhythm. | Other place and/or unidentified dates. Use as regional visual analogues only. No pixels reproduced or used as textures. |

## What to review

- **Early overview:** can the viewer distinguish planted plots, wet plots and earthen bunds from the larger fishponds and river channels? Is the settlement clearly secondary to the surrounding lowland?
- **Field edge:** the planted rows, fallow or harvested-looking ground, and small raised crossings should read at low camera height without requiring every plant to be a persistent object. Crop varieties, plot tenure, extent, water levels, ridge silhouette and local terrain are not claimed.
- **Matched lane views:** camera and plotted centreline stay in place. Taller buildings and longer frontages in the dense sketch are a composition test, not continuity claims about any household. The distant fields in the dense `.blend` are stage dressing, not a claim they survived to 2001.

Editable scenes and previews are local under `build/yumin-street-test/`. No assets or test dependencies enter the Phase 1 game.

## Art-direction review (Workbench study vs. Hybrid “Illustrated Maquette”)

Reviewing the initial Blender Workbench renders (`build/yumin-street-test/`) against `render-lab`'s Hybrid baseline (`materials.ts`, `sceneBuilder.ts`) and the [3D Modelling Protocol](../design/3d-modelling-protocol.md) surfaced four concrete visual gaps:

1. **Value key & atmosphere too dark:** Workbench's olive-brown ground (`(.32, .235, .143)`) and dim grey world (`(.38, .36, .31)`) made the village and lane read like overcast concrete at dusk. Hybrid relies on bright subtropical parchment ground (`#dad2bf`), airy sky gradient (`#d2dfe3` → `#f0eadc`), warm sunlit plaster/beige walls, atmospheric fog (`#e7e2d5`), and subtle ink edges (`#2f2d29`, 16%).
2. **Fields looked like raised planter trays:** Wide dark-brown corridors around thick grey rims (`rim`) made the agricultural plots look like concrete garden beds rather than tightly packed Pearl River Delta paddies and vegetable beds separated by narrow grassy earthen bunds (田埂) and irrigation ditches.
3. **Trees and hills drifted from Hybrid forms:** Stacked diamond-cone trees and smooth undulating ridge meshes clashed with Hybrid's faceted subtropical banyan canopies (`DodecahedronGeometry` clusters) and stepped architectural contour hills.
4. **Timeline jump skipped the 1979–1984 arc:** Putting two-storey flat-roof boxes in the single "early" scene and jumping straight to 5–6 storey handshake canyons bypassed Yumin's actual Phase 1 transformation (1979 fishing/field village → 1980 SEZ material-hauling transition → 1982–83 beige collective villas & processing workshops → Jan 1984 slice end with Luohu high-rises rising across the fields).

## Tentative 1979–1984 timed splits (Hybrid rebuild)

A follow-up Three.js Hybrid viewer (`build/yumin-timed-splits/`) applies all four fixes—real `render-lab` Hybrid materials/lighting/fog, narrow grassy bunds with procedural paddy/vegetable textures, stepped hills, fuller faceted trees, and the Phase B Blender GLB kits (`lingnan-roof`, `scaffold-bay`, `upright-bicycle`, distant `guomao-slipform`)—across four tentative Phase 1 timed splits plus a post-slice continuity contrast:

| Split (tentative) | Phase 1 anchor / beat | Village, fields & skyline state (illustrative) | Claim IDs & open boundaries |
|---|---|---|---|
| **`1979-Q1`** | County start (Bao'an County) | Tightly packed wet paddies, vegetable rows and fishponds with moored boats; low 1-storey thatched/clay-tile cottages; empty northern hills. | `site.yumin.exists_1979`, `phase1.map.yumin_river_location` (sourced). Exact 1979 dwelling mix and plot bounds are **inferred**. |
| **`1980-Q3`** | SEZ established (`1980-08-26`) | Fields and ponds remain dominant; dyke road widens with red-earth fill and sand/brick staging (villagers hauling construction materials); first bamboo scaffolds and collective villa shells appear beside tiled houses; first small workshop shed. | `phase1.event.sez_regulations` (sourced); oral history on material transport (`phase1-m4-construction-capacity.md`). Exact start quarter of villa construction is **open / tentative**. |
| **`1982-Q2`** | Boom & construction peak | Neat rows of two-storey beige collective villas rising under bamboo scaffolding beside the two large fishponds; outer tiled cottages still stand; early staging trims innermost eastern field edge; rising mid-rise towers on the distant Luohu horizon. | `phase1.housing.yumin.houses.1983_02`, `phase1.housing.yumin.villas.1984_02`, `phase1.housing.yumin.houses.gazetteer` (sourced); `conflict.phase1.yumin.early_villa_count` (33 vs 35 open, and a 2018 feature pairs 35 households with 33 buildings); Water Bureau aerial captioned "1981" (retrospective caption). |
| **`1984-Q1`** | Deng visit / slice end (Jan 1984) | Completed rows of beige two-storey villas (`130 m²` floor / `180 m²` plot ref), ground-floor shopfronts and awnings, active plastics (`80` jobs) and gemstone (`20` jobs) processing sheds, remaining ponds and western agricultural fields, and the rising Guomao slipform crane framed down the village lane. | `phase1.event.deng_first_visit`, `phase1.pop.yumin.households.1983_02`, `phase1.labour.yumin.workforce.1983_02`, `phase1.industry.yumin.plastics_jobs.1983_02`, `phase1.industry.yumin.gems_jobs.1983_02` (all sourced). Spatial layout remains **illustrative**. |
| *(`1995–2001` ref)* | Post-slice continuity contrast | Exact same lane centreline, ground-floor shopfronts and doorways preserved (`pillars.md` #6) while upper rental floors rise into 5–6 storey handshake blocks (握手楼) and adjacent fields/ponds infill. | `yumin.company_1992` (lead), `yumin.redevelopment_2001` (lead); Water Bureau 2001 lane photo. Outside Phase 1. |

Local Hybrid previews in Git-ignored `build/yumin-timed-splits/`: `yumin-1979q1-overview.png`, `yumin-1979q1-fields.png`, `yumin-1980q3-overview.png`, `yumin-1982q2-overview.png`, `yumin-1984q1-overview.png`, `yumin-1984q1-fields.png`, `yumin-1984q1-lane.png`, and `yumin-2001ref-lane.png`.

## Lighting and weather study

The disposable Hybrid viewer can switch **humid sun / 湿润晴间**, **bright overcast / 明亮阴天**, **heavy shower / 强阵雨**, and **late-afternoon sun / 午后斜阳** independently of the timed split and camera. These are art presets, not observations for a particular date or a seasonal weather model. No snow was added. Changing the preset reuses the scene and varies sky color, haze, direct and ambient light, exposure, and selected surface wetness. Showers add one batch of animated streaks at field and lane height; overhead they read through atmospheric and surface changes only.

At the fixed `1984-Q1` lane camera, the four presets rendered four distinct images with the same scene ID and triangle count; returning to sun restored the original image in the browser test. Humid sun preserves the baseline palette, overcast lifts the shadow side without a directional shadow, and late sun makes the opposing façades distinct. The field-edge shower is readable even with the ridge lost in haze, but uniformly bright streaks still look graphic; lighter streaks and a few road puddles would improve it before a production pass. Local comparison images are under `build/yumin-timed-splits/weather-previews/`. No scene rebuild, historical weather assignment, or simulation changes are involved.

## Before a route can be reconstructed

1. Ask the village history hall or archive for the aerial's original caption and a dated map, plus a second angle with identifiable lanes and waterfront landmarks. Locate any fields separately using dated land-use or imagery evidence. If the sources only resolve the lowland pattern, keep it as broad illustrative context.
2. Register the aerial and compare dated imagery against the river and road anchors; keep unknowns explicit. Use the registered first-pass KH-9 for neighbourhood context, not to claim individual façades.
3. Time a human authoring pass for a photographed stretch, then walk across its tile boundary and back to the municipality view. Record observed versus inferred geometry, sightline checks, frame-time spikes, and hours per usable stretch. The present scripted stills do not close the walk or authoring-cost gate.
