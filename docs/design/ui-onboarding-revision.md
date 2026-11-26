# R11.1 playtest revision: opening the map, the guide and the panels

**Status:** playtest branch `playtest/r11-ui-onboarding`. UI and content only; no sim state or save schema changes.
On merge, reconcile §11.2 of `phase1-slice.md` with this note: the default fit is now the playable box, and the flyout no longer offers "Zone the historical plan".

This revision responds to the R11 playtest. The sim's strategic shape was sound, but a new player could not see where to play, what to do first, or whether the prologue was on target. The changes are:

## The map opens on the playable city

- The default fit is `playableBox`, the seven playable areas padded by ten cells. "Whole city" keeps the old fit over all nine areas, including card-only Shekou and Nantou.
- Everything outside the playable areas is covered by a dark shadow (`shadowLayer`). The edge of the playable union is a gold/red planning edge, so the seven areas read as the game board.
- The present-day Shenzhen limit is drawn as a blue dashed reference line from `data/starts/slice_city_border.json`. This is **not a historical boundary**: it is generated from the OSM `深圳市` relation (3464353, ODbL) by `pipeline/slice_city_border.py`, is labelled "present-day" in the line's own caption and in the map key, and is never read by sim-core.
- Area names are drawn on the map at every useful zoom. The map key lists all nine areas (seven playable, Shekou and Nantou card-only) with a **Focus** button per area, plus the playable/card-only swatches, the city-boundary key and the temporary road/rail key.
- "Fit playable", "Whole city" and − / + controls sit in the overlay panel. The map key and area list are `<details>` so they can be folded away.

## Build mode

- Choosing a build tool zooms to the playable core if the view is below a readable cell size (`ensureBuildView`).
- A faint 100 m grid is drawn over playable land while a build tool is open.
- Right-drag pans while a build tool is open; left-drag builds. The flyout's gesture line says so.
- The tool flyout has a max height and its own scroll, so the Plan-only and historical-plan controls are reachable at 980×664.

## The historical plan is reference only

"Zone the historical plan" is removed. The Zones flyout keeps the "Show the historical plan" checkbox and names the two templates, but they now read "Reference only; showing it creates no orders". The pure `guidePlan` tool remains for tests and for a later revision that can price a whole template.

## Floating panels and wording

- The briefing and decisions modals have a scrolling body and a fixed footer; the briefing's "To the map" is always visible, and both have a top-right close control. Their scroll resets when they open.
- The stat strip's chips are narrower and wrap their long values, so the negative "after commitments" figure is visible at 980 px.
- The drawer stops above the stat strip; the inspector starts under the measured overlay.
- The decisions counter now always reads `cards · N to answer`, and a card shows the month it was raised. This distinguishes two identical recurring petitions without merging them.
- The first-project card's English now reads "Draw the first zone and the first road on the map"; the budget card points at the Budget drawer, not the briefing.
- The inspector reads "Frontage if zoned" for an unzoned cell near a road, instead of the old "No road access".
- A gesture entirely outside the playable areas is refused with "Outside the seven playable areas", not a raw cell index.
- The verdict has a short factual summary of growth, the fiscal test and the reviews.

## The guided opening and the readiness target

The readiness panel is visible from Turn 1 until the SEZ opens. It shows the bar, its three parts, the weakest part, the first-wave forecast, and the prologue target: **half the bar by 1980-Q2**, which the first-wave formula turns into three cards. The target is derived from `readiness.first_wave`, not authored as a number.

The guide (`src/tutorial.ts`) is UI-only and deterministic. It points at the real control in six steps:

1. welcome (map, pan/zoom, map key);
2. open Pending decisions and answer the survey;
3. open Zones (Industrial and Standard are already chosen);
4. draw the suggested two-cell block beside the temporary Guangshen road (with a "Use this block" fallback);
5. check the queue and End quarter;
6. read the readiness target and continue.

The suggested block is `[[386,376],[387,376]]` in the market town: buildable, inside Area 1, and fronting the temporary Guangshen road, so a one-cell zone already has frontage. The guide advances only when the state shows the action: the survey answered, Zones open, a zone queued, the quarter ended. It is session-only and can be skipped.

## Tests

`apps/slice-ui/test/r11_1.test.ts` covers the starter cells, the guide's state machine, the readiness target, the map key/no-zoneGuide flyout, the answered-card counter, the prospective frontage, the modal bodies and the city-border data contract. The existing language test renders every new string in both languages.
