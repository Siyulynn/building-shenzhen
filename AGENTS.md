# AGENTS.md

A historical city-builder: Shenzhen, 1979–2009. Master plan: `PLAN.md`. Pillars: `docs/design/pillars.md`. System specs: `docs/design/systems/*.md`. Research rules: `docs/research/evidence-protocol.md`.

**Current phase: 1 (the playable slice).** Spec: `docs/design/systems/phase1-slice.md`; map-first loop in §1.1 and build order in §12 (R1–R8 done: spatial foundations, municipal works, organic growth, jobs and migration, the R4.5 bridge, the R5 map UI, R6 calibration, the R7 clarity pass and R8's land cover, power, freight, intensity and save version 6; M6b is recorded in §5.10 and `docs/design/m6-tuning-log.md`). R9 (guided prologue: news, tool gates, the reframed cards, timed modifiers, crew waves, works pace) is done; its calibration is in §5.10 and the tuning log's R9 section. R9.1 matched the yearly path and R9.2 added the electricity series and the tempo fit (save version 8); both are in §5.10 and the R9.1/R9.2 log sections. R10 (composition and the revenue base: construction and population reporting, save version 9, local collectives, workshop-sized firms, trading companies, customs and forex, the import quota) is done; it is in §5.13 and the tuning log's R10 section. R11 (the buildup the verdict judges: the regime construction credit line, the wage path, worksite sheds, and the verdict's bank share and debt ÷ revenue) is done; it is in §5.14 and the tuning log's R11 section. R11.1 (the playtest revision: playable-first camera, map key and shadow, the guided opening and readiness target, reference-only historical plans, panel and wording fixes) is on branch `playtest/r11-ui-onboarding`; see `docs/design/ui-onboarding-revision.md`. R11.2 A–G (decision-queue hygiene, offer-card readability, works/road feedback, readiness deltas and the SEZ prologue result, map legibility, per-order crews, the 1984 reference plan and strategic-card clarity) is on the same branch; the plan and status are in `docs/design/r11.2-playtest-improvements.md`. R12 (the core-basin design maps: the 1979 opening, the 1984 reference plan, the main menu and saves, and the historical run on the 1984 design map) is on branch `r12/core-basin-states`; see `docs/design/r12-core-basin.md`. Phase 1 builds **no 3D, no archival tooling and no building serializer**. If a task drifts toward infrastructure that the playable slice doesn't need yet, stop and say so.

## Commands
- `npm run check`: typecheck, tests and evidence validation. Run it before you finish any change.
- `npm test`: Vitest.
- `npm run evidence:validate`: checks the schemas and cross-references in `data/evidence/`.
- `npm run evidence:status`: counts claims by status, and lists the open leads and conflicts.
- `npm run evidence:compile`: the **draft** compile (the default in Phases 0–2). It writes `build/evidence/`, tagging every claim below its use's minimum status `[UNVERIFIED]`.
- `npm run evidence:compile:strict`: fails whenever a use is below its minimum status. This is required from Phase 3, for Historical mode, calibration and release.

## Hard rules (PLAN §6.2)
1. **The sim is headless and deterministic.** `step(state, actions, rng)`. All randomness goes through the seeded RNG, there is no wall-clock time, and the same seed and inputs give the same output.
2. **The renderer only reads sim state.**
3. **Content is data.** No code may branch on a calendar year for balance reasons. Dates live only in content that cites claims.
4. **Package boundaries:** `sim-core` never imports from `render` or `apps`.
5. **Invariants are tests:** population and money are conserved, and no stock goes negative.
6. **Each spec owns its schemas.** Interfaces come from `docs/design/systems/*.md`. Don't invent fields that contradict a spec; update the spec first.

## History and content rules
- **AI output is a lead, never a fact.** Don't invent dates, figures or quotations.
- **Every historical statement in content cites claim IDs** from `data/evidence/claims/`.
- **AI may set a claim to `lead` or `sourced`** (with a locator, a quote and `extracted_by: ai:...`). **Only a person sets `verified`, `rejected` or `superseded`.**
- **Never average conflicting figures.** Open a conflict record instead (protocol §6).
- **Content and data keep both English and Simplified Chinese** (`{zh, en}`). The UI shows one chosen language; place labels (areas, sites, routes, historical zones) stay bilingual in both. Rules: `phase1-slice.md` §11.1.
- **Sensitive themes** follow PLAN §11. Leaders and their scandals are fictional composites.

## Working habits
- One system per session, in small commits. Golden-run numbers that move must be explained.
- Keep this file short. Explanations belong in `docs/`.
