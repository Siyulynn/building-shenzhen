# M6 hand-over (the headless runner, golden runs, the report; the balance findings; the 2D UI)

## Commits on main
- 05fd45d: M6a spec (§5.9: the loader, measures, band kinds, policies, CLI, golden runs, report, exit-criteria table; §12 split into M6a, M6b and M6c).
- eb5abf9: sim-core M6a.
  - Code: `src/content.ts` (`compileSlice`), `calibration.ts` (measures, `checkBands`, the trade-off and loan checks), `play.ts` (`playQuarters`), `summary.ts` (`runSummary`, `exitChecks`, `crossRunChecks`), and `policies.ts` (`cautious`, `aggressive(params)`, `randomPolicy`).
  - `apps/cli`: `npm run slice -- run --policy <p> --seed <n>` writes `build/slice/<p>-seed<n>/{run.json,report.html}`; `npm run golden:update` refreshes the golden files.
  - The golden runs are in `data/golden/slice/`.
  - Tests: `test/m6a.test.ts` and `apps/cli/test/cli.test.ts`.
- 9ba77df: M6b findings (§5.10), and `aggressive` builds utilities first and tries pool teams. Only aggressive's golden run moved (the numbers are in the commit message).
- 9585102: bookkeeping. §12 marks M6a done and M6b held; the `AGENTS.md` status line.
- 3505ea1: M6c spec (§11.1: the browser app, the turn protocol, strings, screens, tests).
- 5ec1ca8: `apps/slice-ui`, the playable slice in the browser (`npm run slice:ui`, port 5174; `.claude/launch.json` entry `slice-ui`).
  - The lockfile gains the `apps/cli` and `apps/slice-ui` workspace entries. `apps/cli` had been missing since M6a.
- c17cd84: §12 marks M6c done; the `AGENTS.md` status line now reads "M6b next once the slice's scale is decided".
- 8351c4f: review fixes. Every UI string is bilingual (readiness parts, loan kinds, falls by name, the controller's messages); the leaders panel shows the mandate and placeholder portraits; §11.1 matches the code.
- **Checks:**
  - `npm run check` in the shared tree: 324 tests.
  - At a clean HEAD (`git archive` into the scratchpad, `npm ci`, `npm run check`): green on its own, 322 tests. The tree's extra suite is the other session's untracked `location-choice` test.

## M6c: the browser app
- **Loading:** the same `compileSlice` as the CLI, from Vite raw imports, the `yaml` parser and a pure-JS sha256. A test checks it equals the node loader.
- **Turns:** `src/controller.ts` is a pure session shaped like `playQuarters`.
  - Answers and queued turn actions go to `runQuarter` on End turn or Continue.
  - Turn actions are accepted only at a turn's start.
  - A throwing action leaves the session and its Rng untouched, and the error shows.
- **Views:** `src/views.ts` calls `fiscalViews`, `previewOffer`, `scoreReview`, `verdict` and `zoneLabel` rather than re-deriving them.
- **Strings:** content names come from content. The UI's own strings in `src/strings.ts` name mechanics only, zh and en side by side.
- **The map:** Spike A's technique, not its code; `apps/map-spike` is untouched.
  - It draws from the committed areas and buildable data, plus terrain when the git-ignored Spike A grid is served.
  - `serviceGap` is never set in Phase 1, so that overlay reads 0.
- **Checked:**
  - the controller, driven by each golden policy, reproduces all five golden files;
  - in the browser, answering every card with its first option plays all 21 quarters to the verdict and matches the default golden verdict exactly;
  - zone drawing, site preparation on a zone drawn the same turn, and the mid-quarter pause all worked in the browser.
- **Out of M6c:** save and load, replay, renaming or editing zones (remove one and draw it again), and phone layouts.

## Golden runs
- M2–M5 numbers: none moved.
  - M6a changed no balance.
  - The fixtures now come from `compileSlice`, and the M2–M5 tests are unchanged.
- The five new golden files are each seed 1, over 21 quarters: `default`, `cautious`, `aggressive`, `decline_all` and `historical_prologue`.

## M6b: held, because the slice does not grow (§5.10)
- **Residents end 1983 at 30,340–31,084 under every policy,** against 30,340 at the start. GDP grows ×0.93 to ×1.01, and spending ÷ revenue ends 1983 near 1.40.
- **What fails:** the end-1983 growth bands, the spending-to-revenue band and `residents_multiply`.
- **What passes:**
  - the response to choices (GDP differs by policy);
  - `readiness_moves_wave` (cautious 0.12 → 1 card; aggressive 0.55 → 3; historical 0.74 → 3);
  - trade-off years, 4 of 4 for every policy;
  - the loan squeeze, for aggressive, default and historical.
- **Four constraints hold the town flat:**
  1. **Money:** revenue is about ¥2.9M a year against ¥3–4M of obligations, and arrears spiral from 1982.
  2. **Crews:** the pool is 120 crew units, and 13 of aggressive's 22 accepted firms never finish building.
  3. **Spare power:** 40–300 kW per area against 0.5–1 kW a job, so firms post about 8% of their jobs.
  4. **Labour:** matching from scratch means locals refill new posts before any migrant comes. This one is structural.
- **The scale gap:** one card is one firm (60–500 jobs) at about one card a quarter. The bands need 5,000 to 75,000 more people.
- **The decision for a person:**
  - A. Scale a card into a batch of contracts.
  - B. Let growth pay for itself through firm taxes and fees, an arrears cap or a provincial transfer.
  - C. Incumbency in labour matching (a §5.2 change).

## Notes
- **Line endings:** `compileSlice` hashes LF text, the fixtures' `sha256` normalises, and the golden comparisons normalise CRLF. A CRLF checkout changes nothing.
- **Staging:** the other session's hunks in `phase1-slice.md` sit near §4 (512–541), §6 (~1318) and §9–§12. I staged my own hunks by rebuilding the index blob from HEAD plus my ranges.
The slice in the browser: summary report
The GUI (apps/slice-ui)
Running it: npm run slice:ui serves it at http://localhost:5174. ?seed=N picks the random seed.
Built with: plain TypeScript, the DOM and one canvas, deliberately plain. It runs the same sim, content and turn loop as the CLI and the tests, so the browser and the headless runs can't drift apart.
The map: the slice's areas on terrain, with pan and zoom. Overlays:
the areas;
land use;
the share of floor space built illegally;
crowding in rental housing;
the service gap (always 0 for now);
buildable and serviced land.

The terrain draws only where the Spike A grid has been built locally.

Left panel, the turn screen:
The briefing: the date and turn, then residents, non-locals present, firm jobs, the quarter's GDP, money for projects and scrutiny, each with its change since the previous turn.
The card stack: cards that must be answered come first. Investor cards show a preview: when the firm opens, power, beds and tax.
The orders: this turn's queued orders, each removable.
One button: End turn, or Continue when the quarter is paused.
Right panel, seven tabs:
Ledger: recurring revenue and spending, money for projects, obligations by kind, loans, the forex quota.
Area: people, beds, jobs, utilities, facilities and the share of illegal floor space. Click an area on the map to open it.
Leaders: the mandate, and placeholder portraits, rapport, standing and a low, medium or high hint of discipline risk.
Review: this year's targets scored as if the review were held now, plus past reviews.
Build: project commits with a cost preview, cancelling projects, contracting teams.
Zones: drawing zones by dragging, applying the historical plan, removing zones.
Policy: enforcement against illegal floors, and the temporary-permit regime.
The end: a verdict screen when the run ends: growth, the ledger, scrutiny, the fiscal test and the reviews.
Language: every string is shown in Simplified Chinese and English side by side. The one exception is errors thrown by the sim itself, which stay in English.
How a game is played
Each turn is one quarter, 21 turns from 1979-Q1 to the January 1984 visit.
At the start of a turn, you answer cards and queue orders: zones, projects, teams, enforcement and permits. A zone you draw is clipped to the cells you're allowed to zone. You can prepare a site on a zone in the same turn you draw it.
End turn runs three months. If a card that must be answered comes up mid-quarter, the game pauses; you answer it and press Continue. Orders can only be given at the start of a turn.
An illegal order shows an error and changes nothing. Remove it and press End turn again.
The run ends at the visit, or earlier if scrutiny stays too high and you are removed from office. The verdict screen follows.
Test results
npm run check: all green.
324 tests in the shared working tree.
322 at a clean checkout of HEAD after npm ci. The other 2 are the other session's untracked suite.
The UI's own suite (apps/slice-ui/test/slice-ui.test.ts, 46 tests):
The browser's sha256 matches node's, and the browser loads exactly the same slice as the CLI.
Played through the UI's turn controller, all five golden policies reproduce their golden files exactly.
Every card and option has a name in both languages, across 6 policies × 5 seeds. Every card shown in a golden run renders fully in both languages.
A drawn zone ends up exactly as previewed, and the site-preparation cost shown matches what the commit charges.
An illegal order leaves the game untouched.
The panels and overlays read the sim's own values.
In the browser:
Answering every card with its first option played all 21 quarters to the verdict, with debt, arrears, fiscal test and every review score identical to the default golden run.
Zone drawing, applying the historical plan, the policy buttons, project commits and the mid-quarter pause all worked.
Known gap: the slice doesn't grow under any policy. Residents end 1983 at about 30,300–31,100, against 30,340 at the start, so the end-1983 growth bands in the plausibility report fail. That is a balance problem (M6b), not a GUI bug, and it is waiting on your choice among options A–C in §5.10.