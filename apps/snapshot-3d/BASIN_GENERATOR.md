# Procedural basin generator / 程序化盆地生成器

Work package 2 of the [core basin plan](CORE_BASIN_IMPLEMENTATION.md): an **illustrative** September 1980 aerial baseline generated from the [base-map handoff](basemap/README.md). Building types, footprints, counts, heights, crops, trees, road and river widths and bridge structures are art parameters. Only the cover envelopes, alignments, crossings and field-grain clues come from the KH‑9 base map, and those keep its `lead` status and ~25 m registration error.

See the [municipal 3D plan](MUNICIPAL_3D_PLAN.md) and [current handoff](basemap/MUNICIPAL_GIS.md) for the 30 m relief patch, estimated crossing treatments and draft outer routes.

The baseline belongs to the **core view**: open `?focus=core&layer=base`, add `&clear=1` to empty the detail areas, and add `&at=x,z&span=m` (atlas world metres) for a matched review frame. Inside the window it replaces the 1979/1984 study kits. Pressing a date, `&basin=0` or any single-area view (Shenzhenxu, Luohu, Yumin, Shangbu) brings those dated kits back, and the date buttons show unpressed while the baseline is on.

## Inputs / 输入

| File | Role |
|---|---|
| `core-basin-gis.json` | Checked-in copy of `georef/core-basin-1980-09-11.json` (outside this repo). `node apps/snapshot-3d/prepare-basin.mjs` regenerates it, checks format, CRS, bounds and containment, and records the source SHA-256. UTM metres; `x = E − 164450`, `z = 2533850 − N`. `reference_lines` are left out (they duplicate the river and east approach). |
| `basin-gen.json` | All art parameters: seed, lattice, settlement mixes per cover parent id, road/rail/river widths, bridge clearances, reservoir search box and the detail-area masks. Edit this, not the code. |

## What it builds / 生成内容

- **Ground:** one 20 m lattice over the window, snapped to DEM vertex lines. Heights are from the 30 m modern DSM patch when prepared, or the 100 m grid fallback. The surface is smoothed, blended back to the drawn DEM over 300 m and carved under rivers and ponds. Every generator samples this one surface. `unknown` cover (30%) has a subtle neutral tint with no objects generated.
- **Settlement kits** (`src/procgen/fabric.ts`, reusable: polygon + grain + seed + environment): `village_row` (梳式 single-storey rows), `lingnan_block` (two-to-three-storey pitched-roof terraces on block frontages), `danwei_slab` (walk-up slabs, flat roofs) and `worksite_shed`. Each footprint has a foundation skirt 1.5 m below its lowest corner, and the floor is set at the highest corner. The facade shader derives UVs from the instance scale, so 1 U is one bay and 1 V is one storey at any size (protocol §UV). Parcels are oriented to the nearest road within 160 m, else to the field grain.
- **Land:** grain-aligned paddy and vegetable plots, each level with its own bunds, a ditch every fifth strip, and vegetable ridges. `pond_complex` becomes a bank-and-cell mosaic. Visible ponds get one level each and an embankment ring. Trees are clustered by noise: pine and scrub on uplands, lychee, banyan and bamboo near villages and field edges. Worksites become graded pads, sheds and stockpiles.
- **Water:** river surfaces are non-increasing downstream, and a receiving reach is never higher than a tributary's mouth, with dykes on both banks. The reservoir lies outside the KH‑9 window: its outline is the connected 19 Oct 1979 MSS water blob at the site cell (378 cells), and its level comes from the modern DSM water surface. **No dam or spillway is modelled.**
- **Civil:** road ribbons by class with embankment skirts; the Shangbu corridor is a 30 m cleared works strip with a 9 m carriageway. The rail beds carry textured track. The Luohu yard is three illustrative parallel tracks per representative bundle, clipped to `yard-envelope`, with no turnouts. `luohu-rail-bridge` and `east-bridge-candidate` have generic spans (Wenjindu identity unresolved). Five unresolved crossings have reversible model-only treatments: four estimated level approaches and one estimated Buji bridge deck. The west-approach Buji crossing remains a gap.
- **Detail-area masks:** Shenzhenxu (the pilot extent), Luohu (yard, bridge and station), Yumin (land and the three ponds) and Caiwuwei (the county-offices pin, r = 170 m). Each is a convex hull of traced features plus a margin of at least 25 m. Each mask lists what it clears: buildings, trees, fields, pond cells and, at Shenzhenxu and Caiwuwei, minor streets. Ground, water, main roads, rail and bridges continue through every mask. The Luohu mask covers transport land, so today it clears only trees and pond cells. Nothing reserves the Guomao site, because the base map has no traced anchor for it. Items are generated first and filtered afterwards, so clearing a mask never moves anything outside it. Add a mask in `basin-gen.json` with `from` ids taken from any layer.

Neighbourhood camera: 14–18 draw calls with shadows (budget ≤ 120). There are about 11.9k buildings, 12k trees and 42k land pieces, all in instanced meshes. Planning takes ~0.7 s in Node. Frame time has not been measured on a recorded device, and the 3.2 km frustum chunks from the protocol are not implemented.

## Review of the handoff / 交接审查

1. **`core-basin-gis.json` did not exist.** The atlas-ready export sat outside the nested repo. It is now a checked-in, hash-stamped copy.
2. **The 1979/1984 study kits disagree with the traced base.** The market kit sits ~230 m from the `market-town` pin. The station kit's building straddles `rail-main`. The Shangbu kit is ~1 km from the `shangbu-sites-unresolved` marker. No `atlas.json` placement was moved. With the baseline on in the core view, kits inside the window are hidden. The masks are anchored on traced features rather than on the kits, and re-anchoring the kits is a separate decision.
3. **River widths remain indicative.** The core polish uses 82 / 62 / 48 m water plus a 4 m dyke and a 6 m setback. The draft GIS exclusion margins and bank-span checks retain their original values. A person should review banks, land exclusions and local levels again before river-edge photo detail.
4. **Naming limits.** Per the handoff, the eastern span is not named Wenjindu, the Shangbu corridor is not named Shennan and the yard is not a turnout plan. Each stays a candidate in `basin-gen.json` notes.
5. **The window edge shows.** Generated fabric ends at the 6.8 km modelling extent. A collar beyond it needs base-map cover first.
6. **No grade evidence.** Every height is a smoothed modern-DSM proxy. Rail and road profiles are smoothed and never buried; bridge decks are art clearances. None of this is a historic level.

## Tests / 测试

`test/procgen.test.ts` runs every check on a synthetic relief, and again on the prepared grid when it is present (`public/grid/` is git-ignored). It checks:

- the UTM transform against `utm()`, and that the lattice matches the DEM exactly at its edge;
- containment in the parent polygon and the window;
- exclusion from water, river margins, transport land, unknown cover and road, rail and water buffers (footprint perimeters are sampled every 3 m);
- skirts below and floors above every corner;
- seed determinism, and that clearing a mask removes exactly its tagged items while generating without masks leaves every key unchanged;
- monotone river levels, carved beds and pond floors;
- deck and soffit clearance;
- selected estimated crossings, the remaining gap and yard-track containment;
- the draw-call bound, and that the kits run on a bare polygon.
