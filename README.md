# Building Shenzhen · 建造深圳

A historical city-builder set in Shenzhen, 1979–2009. The playable work is a deterministic,
headless simulation with a map-first interface; the 3D atlas is a separate study of the same
terrain and evidence.

**Status:** Phase 1, the playable slice. The full plan is in [`PLAN.md`](PLAN.md) and the
working rules are in [`AGENTS.md`](AGENTS.md).

## The 3D atlas

The January 1984 atlas renders the core basin from the September 1980 base map, the 1984
design map and registered claims:

- **Hosted page:** https://siyulynn.github.io/building-shenzhen/ (relief, streets, works and
  named anchors; the reference photographs stay local, so the public build sets
  `VITE_PHOTO_REVIEW=0` and hides the photo-viewpoint selector)
- **Source:** [`apps/snapshot-3d/`](apps/snapshot-3d)
- **Design maps:** [`docs/spikes/scene-review/zoning/`](docs/spikes/scene-review/zoning)
- **Plan and findings:** [`docs/spikes/january-1984-street-and-fabric-plan.md`](docs/spikes/january-1984-street-and-fabric-plan.md)

## Quick start

```powershell
npm ci
npm run check          # typecheck, tests and evidence validation
npm run slice          # run the headless slice
npm run slice:ui       # playable map UI on :5174
npm run design:maps    # regenerate the 1979 / 1984 zoning plates and grid
npm run test:atlas     # atlas tests (needs `npm run prepareData -w @sz/snapshot-3d` once)
npm run build:atlas    # build the atlas site
```

## Evidence

Every historical statement in content cites a claim in `data/evidence/claims/`. The rules
are in [`docs/research/evidence-protocol.md`](docs/research/evidence-protocol.md): AI output
is a lead, never a fact, and only a person marks a claim `verified`. Run
`npm run evidence:validate` after touching evidence, and `npm run evidence:status` for the
open leads and conflicts.

## Layout

| Path | Contents |
|---|---|
| `packages/sim-core/` | headless deterministic simulation |
| `packages/evidence/` | claim schema, cross-reference and compile |
| `apps/cli/` | headless runner and golden runs |
| `apps/slice-ui/` | playable map interface |
| `apps/snapshot-3d/` | 3D atlas study |
| `apps/map-spike/` | map import and registration spike |
| `pipeline/` | GIS, calibration, evidence and design-map generators |
| `content/` | slice content (bilingual) |
| `data/` | evidence, calibration, starts and golden runs |
| `docs/` | design specs, research notes and plans |

Photographs and scans used as research references are not shipped from this repository.
