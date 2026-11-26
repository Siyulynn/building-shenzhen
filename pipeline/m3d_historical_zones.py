"""M3d: turn the core-basin January 1984 design map into a game-grid reference layer.

Input:  docs/spikes/scene-review/zoning/core-basin-design-grid.json  (resolved 100 m cells and routes)
        docs/spikes/scene-review/zoning/core-basin-proposals.json    (label positions)
Output: data/starts/slice_historical_zones.json
        packages/sim-core/src/designPlan.ts                         (the same zones' cells, for the map plans)

The design grid already holds each zone's cells as [y, x0, x1] runs and each route as polylines, both in
game-grid cell coordinates on the same grid as the slice (EPSG:32650, 100 m, origin 164400/2533900). This script
copies them; it does not read the SVG, whose page margins and escaped titles made scraping fragile.

Only the 1984 ('visit') proposal and works zones are written. The inherited town and villages are already in
the 1979 start. The layer is a reference: the UI draws it and never sends it to sim-core's step. R12 (phase1-slice.md
§5.9): the map plans may draw these cells as zones, so the script also writes them as a TypeScript module that
policies.ts imports; no content file, hash or save changes.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRID = ROOT / "docs/spikes/scene-review/zoning/core-basin-design-grid.json"
PROPOSAL = ROOT / "docs/spikes/scene-review/zoning/core-basin-proposals.json"
OUT = ROOT / "data/starts/slice_historical_zones.json"
TS_OUT = ROOT / "packages/sim-core/src/designPlan.ts"
# sim-core source carries no calendar years (sim-core.test.ts), so the ground states are renamed
GROUND = {"built_1984": "built", "graded_works": "graded", "retained_farm": "farm"}

USES = {"industrial", "residential", "commercial", "reserve"}
INTENSITIES = {"low", "standard", "high"}
STAGES = {"proposal", "works"}
TIERS = {"avenue", "street", "track"}


def centroid(runs):
    xs = ys = n = 0
    for y, x0, x1 in runs:
        k = x1 - x0 + 1
        xs += (x0 + x1 + 1) / 2 * k
        ys += (y + .5) * k
        n += k
    return [round(xs / n, 2), round(ys / n, 2)]


def main():
    grid = json.loads(GRID.read_text(encoding="utf-8"))
    proposal = json.loads(PROPOSAL.read_text(encoding="utf-8"))
    if grid["grid"] != proposal["grid"]:
        raise SystemExit("design grid and proposal disagree on the grid")
    visit = grid["phases"]["visit"]
    labels = {z["id"]: z.get("label") for z in proposal["visit"]["zones"]}

    zones = []
    for z in visit["zones"]:
        if z["stage"] == "inherited":
            continue
        if z["use"] not in USES or z["intensity"] not in INTENSITIES or z["stage"] not in STAGES:
            raise SystemExit(f"{z['id']}: unknown use/intensity/stage")
        runs = [list(r) for r in z["runs"]]
        count = sum(x1 - x0 + 1 for _, x0, x1 in runs)
        if count != z["cellCount"]:
            raise SystemExit(f"{z['id']}: cellCount {z['cellCount']} but runs hold {count}")
        zones.append({
            "id": z["id"], "name": {"zh": z["name"]["zh"], "en": z["name"]["en"]},
            "use": z["use"], "intensity": z["intensity"], "stage": z["stage"], "ground_state": z["ground_state"],
            "cellCount": count, "runs": runs,
            "label": labels.get(z["id"]) or centroid(runs),
            "claims": z.get("claims", []),
        })
    if not zones:
        raise SystemExit("no proposal zones found")

    # R12: the context areas (civic ground, the park and the yards) are reference areas: drawn, never zoned
    context_labels = {c["id"]: c.get("label") for c in proposal["visit"].get("context_areas", [])}
    kinds = {"civic_park": None, "transport_yard": "yard"}
    context = []
    for c in visit.get("context_areas", []):
        kind = kinds.get(c["ground_state"], "other") or ("park" if "park" in c["id"] else "civic")
        runs = [list(r) for r in c["runs"]]
        context.append({
            "id": c["id"], "name": {"zh": c["name"]["zh"], "en": c["name"]["en"]}, "kind": kind,
            "ground_state": c["ground_state"], "cellCount": sum(x1 - x0 + 1 for _, x0, x1 in runs), "runs": runs,
            "label": context_labels.get(c["id"]) or centroid(runs), "claims": c.get("claims", []),
        })

    roads = []
    for r in visit["routes"]:
        if r["tier"] not in TIERS:
            raise SystemExit(f"{r['id']}: unknown tier {r['tier']}")
        for part in r["parts"]:
            if len(part) >= 2:
                roads.append({"id": r["id"], "class": r["tier"], "basis": r["basis"],
                              "points": [[round(x, 3), round(y, 3)] for x, y in part]})
    if not roads:
        raise SystemExit("no 1984 routes found")

    doc = {
        "format": 2,
        "generated_by": "pipeline/m3d_historical_zones.py",
        "source": "docs/spikes/scene-review/zoning/core-basin-design-grid.json",
        "proposal": "docs/spikes/scene-review/zoning/core-basin-proposals.json",
        "date": visit["date"],
        "evidence_status": "design_note",
        "grid": grid["grid"],
        "box": grid["grid"]["box"],
        "zones": zones,
        "context": context,
        "roads": roads,
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_ts(zones, visit["date"])
    print(f"wrote {OUT.relative_to(ROOT)}: {len(zones)} proposal/works zones, "
          f"{sum(z['cellCount'] for z in zones)} cells, {len(roads)} road paths")
    for c in context:
        print(f"{c['id']:20s} reference    {c['kind']:8s} {c['cellCount']:3d}")
    for z in zones:
        print(f"{z['id']:20s} {z['use']:12s} {z['intensity']:8s} {z['stage']:8s} {z['cellCount']:3d}")


def write_ts(zones, date):
    """The zones' cells as a sim-core module: id, use, intensity, ground_state and runs, nothing else."""
    lines = [
        "// Generated by pipeline/m3d_historical_zones.py from docs/spikes/scene-review/zoning/core-basin-design-grid.json.",
        "// Do not edit: change the design map and rerun the script. A design note, not evidence (phase1-slice.md §5.9, R12).",
        "import type { CellRuns } from './state.js';",
        "import type { Intensity, LandUse } from './enums.js';",
        "",
        "/** The design map's ground at the visit: built, graded for works, or still farmed. */",
        "export type DesignGround = 'built' | 'graded' | 'farm';",
        "export interface DesignZone {",
        "  readonly id: string; readonly use: LandUse; readonly intensity: Intensity; readonly ground: DesignGround;",
        "  readonly runs: CellRuns;",
        "}",
        "",
        "/** The visit's design map: its proposal and works zones, as [y, x0, x1] runs on the slice grid. */",
        "export const DESIGN_PLAN_ZONES: readonly DesignZone[] = Object.freeze([",
    ]
    for z in zones:
        runs = ", ".join(f"[{y}, {a}, {b}]" for y, a, b in z["runs"])
        lines.append(f"  {{ id: '{z['id']}', use: '{z['use']}', intensity: '{z['intensity']}', ground: '{GROUND[z['ground_state']]}',")
        lines.append(f"    runs: [{runs}] }},")
    lines.append("]);")
    TS_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
