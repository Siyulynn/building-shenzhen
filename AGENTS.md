# AGENTS.md

A historical city-builder: Shenzhen, 1979–2009. Master plan: `PLAN.md`. Pillars: `docs/design/pillars.md`. System specs: `docs/design/systems/*.md`. Research rules: `docs/research/evidence-protocol.md`.

**Current phase: 1 (the playable slice).** Spec: `docs/design/systems/phase1-slice.md`; build order and status in its §12 (M1, M2, M3a, M3b, M4, M5, M6a and M6c done; M3c held; M6b, the balance pass, next once the slice's scale is decided, §5.10). Phase 1 builds **no 3D, no archival tooling and no building serializer**. If a task drifts toward infrastructure that the playable slice doesn't need yet, stop and say so.

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
- **Write English and Simplified Chinese strings side by side.**
- **Sensitive themes** follow PLAN §11. Leaders and their scandals are fictional composites.

## Working habits
- One system per session, in small commits. Golden-run numbers that move must be explained.
- Keep this file short. Explanations belong in `docs/`.
