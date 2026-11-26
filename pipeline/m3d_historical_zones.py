"""M3d: turn the scene-review 1984 zoning proposal into a game-grid reference layer.

Input:  docs/spikes/scene-review/zoning/core-basin-1984.svg
        docs/spikes/scene-review/zoning/core-basin-proposals.json
Output: data/starts/slice_historical_zones.json

The SVG draws one 12 px square per game cell. The proposal box is
[344, 343, 419, 398] on the 100 m game grid, so:

    gameX = 344 + floor(svgX / 12)
    gameY = 343 + floor(svgY / 12)

Only proposal and works zones are written. The inherited town and villages
are already in the 1979 start. The layer is a reference: the UI draws it and
never sends it to sim-core.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "docs/spikes/scene-review/zoning/core-basin-1984.svg"
PROPOSAL = ROOT / "docs/spikes/scene-review/zoning/core-basin-proposals.json"
OUT = ROOT / "data/starts/slice_historical_zones.json"

SEP = " \u00b7 "
USES = {"industrial", "residential", "commercial", "reserve"}
INTENSITIES = {"low", "standard", "high"}
STAGES = {"proposal", "works"}


def runs_of(cells):
    """Sorted y, x0, x1 runs for a set of (x, y) cells."""
    by_y = {}
    for x, y in sorted(set(cells), key=lambda c: (c[1], c[0])):
        by_y.setdefault(y, []).append(x)
    out = []
    for y in sorted(by_y):
        xs = sorted(by_y[y])
        x0 = prev = xs[0]
        for x in xs[1:]:
            if x == prev + 1:
                prev = x
                continue
            out.append([y, x0, prev])
            x0 = prev = x
        out.append([y, x0, prev])
    return out


def main():
    svg = SVG.read_text(encoding="utf-8")
    proposal = json.loads(PROPOSAL.read_text(encoding="utf-8"))
    box = proposal["grid"]["box"]
    x0, y0 = box[0], box[1]
    by_name = {z["name"]["en"]: z for z in proposal["visit"]["zones"]}

    zones = []
    seen = set()
    for m in re.finditer(r"<g><title>(.*?)</title><path[^>]*d=\"([^\"]*)\"", svg):
        title, path = m.group(1), m.group(2)
        parts = title.split(SEP)
        if len(parts) != 3:
            raise SystemExit(f"unexpected title: {title!r}")
        name_part, meta, count_part = parts
        if " / " not in name_part:
            raise SystemExit(f"title has no bilingual name: {title!r}")
        en, zh = (s.strip() for s in name_part.split(" / ", 1))
        fields = [s.strip() for s in meta.split(",")]
        if len(fields) != 3:
            raise SystemExit(f"unexpected meta: {meta!r}")
        use, intensity, stage = fields
        if use not in USES or intensity not in INTENSITIES or stage not in {"inherited"} | STAGES:
            raise SystemExit(f"unknown use/intensity/stage: {title!r}")
        if stage == "inherited":
            continue
        cells = [(x0 + int(x) // 12, y0 + int(y) // 12) for x, y in re.findall(r"M(\d+),(\d+)h12v12", path)]
        expected = int(re.match(r"(\d+) cells", count_part).group(1))
        if len(cells) != expected:
            raise SystemExit(f"{en}: title says {expected} cells, path has {len(cells)}")
        src = by_name.get(en)
        if src is None:
            raise SystemExit(f"{en}: no proposal record")
        zone_id = src["id"]
        if zone_id in seen:
            raise SystemExit(f"duplicate zone {zone_id}")
        seen.add(zone_id)
        label = src.get("label")
        if label is None:
            label = [round(sum(c[0] for c in cells) / len(cells), 2), round(sum(c[1] for c in cells) / len(cells), 2)]
        zones.append({
            "id": zone_id,
            "name": {"zh": zh, "en": en},
            "use": use, "intensity": intensity, "stage": stage,
            "cellCount": len(cells), "runs": runs_of(cells),
            "label": label,
            "claims": src.get("claims", []),
        })

    if not zones:
        raise SystemExit("no proposal zones found")
    doc = {
        "format": 1,
        "generated_by": "pipeline/m3d_historical_zones.py",
        "source": "docs/spikes/scene-review/zoning/core-basin-1984.svg",
        "proposal": "docs/spikes/scene-review/zoning/core-basin-proposals.json",
        "date": "1984-01-24",
        "evidence_status": "design_note",
        "grid": proposal["grid"],
        "box": box,
        "zones": zones,
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(zones)} proposal/works zones, {sum(z['cellCount'] for z in zones)} cells")
    for z in zones:
        print(f"{z['id']:20s} {z['use']:12s} {z['intensity']:8s} {z['stage']:8s} {z['cellCount']:3d}")


if __name__ == "__main__":
    main()
