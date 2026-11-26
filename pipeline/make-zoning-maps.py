"""Draw two 100 m design-map plates (1979 opening and Jan 1984) and export the resolved design grid."""
import json
from collections import defaultdict
from html import escape
from pathlib import Path

import yaml
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union
from shapely.prepared import prep
from shapely.affinity import translate

# Run from anywhere: ROOT is the repository. The atlas app is the tracked copy of the
# Stage B viewer; the ignored build snapshot is the working fallback.
ROOT = Path(__file__).resolve().parents[1]
ATLAS = next((p for p in (ROOT / "apps/snapshot-3d", ROOT / "build/3d-snapshots/jan84-stage-b") if p.exists()),
             ROOT / "apps/snapshot-3d")
OUTPUT = ROOT / "docs/spikes/scene-review/zoning"
# public/grid is prepared, not committed: fall back to the working snapshot's copy.
GRID = ATLAS / "public/grid/municipal-gis.json"
if not GRID.exists():
    GRID = ROOT / "build/3d-snapshots/jan84-stage-b/public/grid/municipal-gis.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


plan = load(OUTPUT / "core-basin-proposals.json")
grid = plan["grid"]
x0, y0, x1, y1 = grid["box"]
window = box(x0, y0, x1, y1)
origin_x, origin_y = grid["origin_top_left"]
cell = grid["cell_m"]


def to_grid(point):
    easting, northing = point
    return (easting - origin_x) / cell, (origin_y - northing) / cell


def to_utm(point):
    gx, gy = point
    return round(origin_x + gx * cell, 1), round(origin_y - gy * cell, 1)


core = load(ATLAS / "core-basin-gis.json")
assert core["crs"] == grid["crs"]
core_bounds = core["grid_cell_edges"]
alignments = {r["id"]: LineString(map(to_grid, r["geometry"]["coordinates"])) for r in core["layers"]["alignments"]}
places = {r["id"]: to_grid(r["geometry"]["coordinates"]) for r in core["layers"]["places"]}
epochs = {r["id"]: r["states"] for r in load(ATLAS / "municipal-epochs.json")["features"]}
regional = {
    r["id"]: LineString(map(to_grid, r["geometry"]["coordinates"]))
    for r in load(GRID)["features"]
    if r["geometry"]["type"] == "LineString" and r.get("render_status") != "review_required"
}
site_cells = load(ROOT / "data/starts/slice_site_cells.json")["placements"]
game_routes = yaml.safe_load((ROOT / "content/slice/start_network.yaml").read_text(encoding="utf-8"))["routes"]
fixtures = [
    LineString([(x + .5, y + .5) for x, y in row["waypoints"]])
    for row in game_routes if row["site"] != "site.kcr_line"
]
stage_b = load(ATLAS / "stage-b.json")
street_previews = {r["id"].removeprefix("m84.road."): r for r in stage_b["roads"]}
photo_routes = {r["id"]: r for r in load(ATLAS / "shennan-review.json")["roads"]}
extents = {r["id"]: Polygon(map(to_grid, r["geometry"])) for r in stage_b["extent"]}
land_cover = load(ROOT / "data/starts/slice_landcover.json")
land = {}
for area in land_cover["areas"]:
    for kind, runs in area["runs"].items():
        for y, first, last in runs:
            for x in range(first, last + 1):
                if x0 <= x < x1 and y0 <= y < y1:
                    land[x, y] = kind
WET = {"water", "tidal_flat", "pond"}
PROTECTED = WET | {"village", "town", "hill"}

ponds = []
for feature in core["layers"]["cover"]:
    if feature["kind"] in ("water", "pond_complex"):
        exterior, *holes = [list(map(to_grid, ring)) for ring in feature["geometry"]["coordinates"]]
        ponds.append(Polygon(exterior, holes).buffer(0))
water_edges = unary_union(ponds)
channels = unary_union([alignments[k].buffer(w) for k, w in (
    ("river-main-west", .50), ("river-main-east", .39), ("buji-lower", .18)
)])
rail = unary_union([alignments["rail-main"], regional["kcr-sungang-buji"]])
road_barriers = unary_union([water_edges, channels, rail.buffer(.17)])
dry_plan = prep(road_barriers)

SCALE, LEFT, TOP = 12, 40, 111
WIDTH, HEIGHT = (x1 - x0) * SCALE, (y1 - y0) * SCALE


def xy(point):
    x, y = point
    return LEFT + (x - x0) * SCALE, TOP + (y - y0) * SCALE


def parts(geometry, kind):
    if geometry.is_empty:
        return
    if geometry.geom_type == kind:
        yield geometry
    elif hasattr(geometry, "geoms"):
        for member in geometry.geoms:
            yield from parts(member, kind)


def lines(geometry):
    return " ".join("M" + " ".join(f"{x:.2f},{y:.2f}" for x, y in map(xy, line.coords))
                    for line in parts(geometry, "LineString"))


def polygon_path(geometry):
    return " ".join(lines(LineString(ring.coords)) + "Z"
                    for polygon in parts(geometry, "Polygon")
                    for ring in (polygon.exterior, *polygon.interiors))


def cells_path(cells):
    return "".join(f"M{sx:g},{sy:g}h{SCALE}v{SCALE}h-{SCALE}z"
                   for sx, sy in (xy(p) for p in sorted(cells)))


def runs_of(cells):
    by_y = defaultdict(list)
    for x, y in sorted(set(cells), key=lambda c: (c[1], c[0])):
        by_y[y].append(x)
    out = []
    for y in sorted(by_y):
        xs = sorted(by_y[y])
        start = prev = xs[0]
        for x in xs[1:]:
            if x == prev + 1:
                prev = x
                continue
            out.append([y, start, prev])
            start = prev = x
        out.append([y, start, prev])
    return out


def geometry_for(area):
    envelopes = [box(*bounds) for bounds in area.get("boxes", [])]
    for name, indices in area.get("atlas_zones", {}).items():
        for index in indices:
            west, south, east, north = epochs[name]["visit"]["zones"][index]["rect"]
            left, top = to_grid((west, north))
            right, bottom = to_grid((east, south))
            envelopes.append(box(left, top, right, bottom))
    extent = unary_union(envelopes)
    if "atlas_extent" in area:
        extent = extent.intersection(extents[area["atlas_extent"]])
    return prep(extent)


def routes_for(phase):
    inh = plan["routes"]["inherited"]
    for key in inh.get("street", []):
        yield key, "street", "dated", alignments[key]
    for key in inh.get("stage_b_street", []):
        yield key, "street", "proxy", LineString(map(to_grid, street_previews[key]["geometry"]))
    for key in inh.get("track", []):
        yield key, "track", "proxy", alignments[key]
    if phase == "opening":
        return
    jan = plan["routes"]["january"]
    align = epochs["shangbu-east-west-corridor"]["visit"]["roadAlignments"]
    for key in jan.get("avenue_dated", []):
        shape = LineString(map(to_grid, align[key])) if key in align else alignments[key]
        yield key, "avenue", "dated", shape
    for key in jan.get("avenue_photo", []):
        geom = LineString(map(to_grid, photo_routes[key]["geometry"]))
        # R12: the game's Jianshe Road takes column 386, so Renmin Road lies one cell east of its photo trace and
        # the Luohu commercial strip sits between the two roads (column 387), as the design intends.
        if key == "renmin-south":
            geom = translate(geom, xoff=1)
        yield key, "avenue", "proxy", geom
    for key in jan.get("street_core", []):
        yield key, "street", "proxy", alignments[key]
    for key in jan.get("street_stage_b", []):
        geom = LineString(map(to_grid, street_previews[key]["geometry"]))
        # Keep the May-map Shangbu north trace north of Lizhi Park (junction with shangbu-grid-north),
        # since Hongling Road already frames the park's eastern edge.
        if key == "shangbu-north":
            geom = geom.intersection(box(x0, y0, x1, 370.65))
        yield key, "street", "proxy", geom
    for key in jan.get("street_photo", []):
        yield key, "street", "proxy", LineString(map(to_grid, photo_routes[key]["geometry"]))
    for key in jan.get("track_core", []):
        yield key, "track", "proxy", alignments[key]
    for key in jan.get("track_photo", []):
        yield key, "track", "proxy", LineString(map(to_grid, photo_routes[key]["geometry"]))


def cells_for_routes(routes, min_length=0.45):
    """Return 100 m cells whose core is crossed by a route (>= min_length cell-widths)."""
    result = set()
    for route in routes:
        for line in parts(route, "LineString"):
            l, t, r, b = line.bounds
            for (x, y), kind in land.items():
                if l <= x + 1 and x <= r and t <= y + 1 and y <= b and kind not in WET:
                    if line.intersection(box(x, y, x + 1, y + 1)).length >= min_length:
                        result.add((x, y))
    return result


def resolve_context(phase, avenue_cells):
    """Resolve explicit non-zone civic/park and transport yard cells."""
    taken = set()
    resolved = []
    for area in plan[phase].get("context_areas", []):
        envelope = geometry_for(area)
        is_yard = area["ground_state"] == "transport_yard"
        cells = set()
        for (x, y), kind in land.items():
            centre = Point(x + .5, y + .5)
            if (x, y) in taken or not envelope.covers(centre):
                continue
            if kind in WET or water_edges.covers(centre) or channels.covers(centre):
                continue
            if not is_yard and (dry_plan.covers(centre) or (x, y) in avenue_cells or kind in PROTECTED):
                continue
            cells.add((x, y))
        assert cells, f"No eligible cells for context {phase}/{area['id']}"
        taken.update(cells)
        resolved.append((area, cells))
    return resolved, taken


def proposed_cells(phase, routes, blocked_context):
    """Resolve 100 m zoned cells. Only Tier 1 Avenues carve out right-of-way cells;
    Tier 2 Streets and Tier 3 Tracks circulate inside or along block edges without erasing cells.
    High-intensity zones match sim-core's rule: at least one cell 4-adjacent to an avenue cell.
    """
    avenues = cells_for_routes([line for _, grade, _, line in routes if grade == "avenue"], min_length=0.45)
    zones = [z for z in plan["opening"]["zones"] if z["id"] in plan[phase].get("inherit", [])]
    taken = set(blocked_context)
    for zone in [*zones, *plan[phase]["zones"]]:
        envelope = geometry_for(zone)
        existing = zone["stage"] == "inherited"
        use, intensity = zone["use"], zone["intensity"]
        if phase == "opening" and not existing:
            assert use in ("reserve", "industrial") and intensity != "high", zone["id"]
        cells = set()
        for (x, y), kind in land.items():
            centre = Point(x + .5, y + .5)
            if (x, y) in taken or not envelope.covers(centre) or dry_plan.covers(centre):
                continue
            if existing:
                # an inherited zone takes only built stock; `land_classes` narrows it (R12: split town from village)
                allowed = zone.get("land_classes") or (["town"] if use == "commercial" else ["village", "town"])
                if kind not in allowed:
                    continue
            else:
                if (x, y) in avenues or kind in PROTECTED:
                    continue
            cells.add((x, y))
        assert cells, f"No eligible cells for {phase}/{zone['id']}"
        if intensity == "high":
            touches_avenue = any(
                nb in avenues
                for x, y in cells
                for nb in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
            )
            assert touches_avenue, f"High-intensity zone {phase}/{zone['id']} must touch an avenue"
        taken.update(cells)
        yield zone, cells


def text(x, y, value, css, **attrs):
    other = "".join(f' {k}="{escape(v)}"' for k, v in attrs.items())
    return f'<text x="{x:g}" y="{y:g}" class="{css}"{other}>{escape(value)}</text>'


def pair(x, y, name, en, zh, dy=15):
    return text(x, y, name["en"], en) + text(x, y + dy, name["zh"], zh, lang="zh-Hans")


def path(d, css):
    return f'<path class="{css}" d="{d}"/>' if d else ""


def site(id):
    x, y = site_cells["site." + id]["cell"]
    return x + .5, y + .5


def named(mark, pos, name, style, anchor="start"):
    x, y = xy(mark)
    a, b = xy(pos)
    shape = f'<circle cx="{x:g}" cy="{y:g}" r="3.2"/>' if style == "place" else (
        f'<rect x="{x-3.5:g}" y="{y-3.5:g}" width="7" height="7" rx="1"/>'
    )
    dx = -4 if anchor == "end" else 4
    attrs = {"text-anchor": anchor} if anchor != "start" else {}
    return (f'<g class="{style}"><path d="M{x:g},{y:g}L{a:g},{b-3:g}"/>{shape}' +
            text(a + dx, b, name["en"], "map-en", **attrs) +
            text(a + dx, b + 11.5, name["zh"], "map-zh", lang="zh-Hans", **attrs) + '</g>')


def map_labels(phase):
    labels = [
        (site("nigang"), (362.5, 347.5), "Nigang", "泥岗", "place", "start"),
        (site("shuibei"), (393.5, 345.0), "Shuibei", "水贝", "place", "start"),
        (site("tianbei_upper"), (399.5, 355.5), "Tianbei", "田贝", "place", "start"),
        (site("sungang_freight"), (373.0, 351.2), "Sungang yard", "笋岗货场", "facility", "end"),
        (site("peoples_hospital_inpatient"), (402.0, 360.5), "People’s Hospital", "人民医院（留医部）", "facility", "start"),
        (site("shenzhen_middle_school"), (391.5, 364.2), "Shenzhen Middle School", "深圳中学", "facility", "start"),
        (site("caiwuwei"), (373.2, 386.6), "Caiwuwei", "蔡屋围", "place", "end"),
        (places["market-town"], (382.5, 371.6), "Dongmen", "东门", "place", "end"),
        (places["hubei"], (396.5, 370.4), "Old Hubei", "湖贝旧村", "place", "start"),
        (site("huangbeiling"), (408.5, 368.8), "Huangbeiling", "黄贝岭", "place", "start"),
        (places["yumin"], (375.5, 391.4), "Yumin", "渔民村", "place", "end"),
        (places["station"], (388.5, 393.8), "Luohu station", "罗湖车站", "facility", "start"),
        (places["wenjindu"], (401.8, 386.0), "Wenjindu", "文锦渡", "facility", "start"),
    ]
    if phase == "opening":
        labels.append((site("county_offices"), (370.5, 375.8), "County offices", "县属机关", "facility", "end"))
    else:
        for id, pos, name, zh, anchor in (
            ("electronics-building", (355.0, 386.2), "Electronics Building", "电子大厦", "start"),
            ("municipal-government", (366.8, 383.6), "Municipal offices", "市政府", "start"),
            ("guomao", (382.5, 383.6), "Guomao works", "国贸工地", "end"),
            ("guoshang", (383.2, 386.6), "Guoshang", "国商大厦", "end"),
        ):
            labels.append((to_grid(epochs[id]["visit"]["model"]["at"]), pos, name, zh, "facility", anchor))
    return "".join(named(mark, pos, {"en": en, "zh": zh}, style, anchor) for mark, pos, en, zh, style, anchor in labels)


STYLE = """
text{font-family:"Segoe UI","Microsoft YaHei","Noto Sans CJK SC",sans-serif;fill:#283636}
.title{font-size:32px;font-weight:700}.subtitle{font-size:19px;font-weight:600}
.deck{font-size:14px}.minor{font-size:11.5px;fill:#3d5350}.panel-title{font-size:16px;font-weight:700}
.panel-en{font-size:12.5px;font-weight:600}.panel-zh{font-size:11.5px;fill:#3d5350}
.map-en,.map-zh,.zone-en,.zone-zh{font-size:9.8px;paint-order:stroke;stroke:#f8f6ed;stroke-width:3px;stroke-linejoin:round}
.map-en{font-weight:600}.map-zh{font-size:9.2px}.zone-en,.zone-zh{font-size:10px;font-weight:700}
.area{fill:#eeebdf}.farm{fill:#e4ead4}.upland{fill:#e6e7df}.hill{fill:#cfd9c7}.stock{fill:#d7cebe}
.wet,.pond{fill:#a8d0d7;fill-rule:evenodd}.tidal{fill:#c7dfd6}.channel{fill:#84b6c1;fill-rule:evenodd}
.civic_park{fill:#b5d1a5;stroke:#6e8d5d;stroke-width:.7}
.transport_yard{fill:#cbc4ba;stroke:#7c756c;stroke-width:.7}
.grid{fill:none;stroke:#867b62;stroke-opacity:.18;stroke-width:.55}
.core{fill:none;stroke:#6d786b;stroke-opacity:.48;stroke-width:1.1;stroke-dasharray:8 6}
.rail,.track,.street,.avenue,.fixture,.gap{fill:none;stroke-linecap:round;stroke-linejoin:round}
.rail{stroke:#4e4a62;stroke-width:2.6}.fixture{stroke:#647b87;stroke-width:1.5;stroke-dasharray:2 4;opacity:.75}
.track{stroke:#8e735a;stroke-width:1.3}.track.proxy{stroke-dasharray:2.5 2.5}
.street{stroke:#5a4134;stroke-width:2.3}.street.proxy{stroke-dasharray:5.5 3}
.avenue{stroke:#88362b;stroke-width:4.8}.avenue.proxy{stroke:#994336;stroke-width:4.0;stroke-dasharray:9 4}
.gap{stroke:#88362b;stroke-width:1.3;stroke-dasharray:2 2}
.industrial{fill:#ebad50}.residential{fill:#6bbf9f}.commercial{fill:#85a9de}.reserve{fill:#c7b4d6}
.low{fill-opacity:.58}.standard{fill-opacity:.84}.high{fill:#3b6eb9;fill-opacity:.92;stroke:#1f4b86;stroke-width:1.1}
.inherited{fill:url(#stock-hatch)}.works{fill:url(#works-hatch)}.works-high{fill:url(#works-high-hatch)}
.place path,.facility path,.zone-mark path{fill:none;stroke:#5d6862;stroke-width:.75}
.place circle{fill:#354f4c;stroke:#f8f6ed;stroke-width:1.3}.facility rect{fill:#f8f6ed;stroke:#2d4057;stroke-width:1.4}
.scale{stroke:#283636;stroke-width:1.4;fill:none}
"""


def plate(phase):
    page = plan[phase]
    routes = [(key, grade, state, shape.intersection(window).difference(road_barriers))
              for key, grade, state, shape in routes_for(phase)]
    avenue_cells = cells_for_routes([line for _, grade, _, line in routes if grade == "avenue"], min_length=0.45)
    context_areas, context_cells = resolve_context(phase, avenue_cells)
    zones = list(proposed_cells(phase, routes, context_cells))
    print(page["date"],
          "zones:", [(zone["id"], len(cells)) for zone, cells in zones],
          "context:", [(area["id"], len(cells)) for area, cells in context_areas])

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1250" height="845" viewBox="0 0 1250 845" role="img" aria-labelledby="title desc">',
           f'<title id="title">{escape(page["title"]["en"])} / {escape(page["title"]["zh"])}</title>',
           '<desc id="desc">100 m design map for Shenzhen core basin zoning, ground states and road tiers. Dated, proxy and inherited features are distinguished.</desc>',
           f'<style>{STYLE}</style>',
           '<defs><pattern id="stock-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
           '<path d="M0,0v5" stroke="#324c57" stroke-opacity=".55" stroke-width="1.3"/></pattern>'
           '<pattern id="works-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">'
           '<path d="M0,0v5" stroke="#87481c" stroke-opacity=".82" stroke-width="1.45"/></pattern>'
           '<pattern id="works-high-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">'
           '<path d="M0,0v5" stroke="#f0be67" stroke-opacity=".92" stroke-width="1.55"/></pattern>'
           f'<clipPath id="map"><rect x="{LEFT}" y="{TOP}" width="{WIDTH}" height="{HEIGHT}"/></clipPath></defs>',
           '<rect width="1250" height="845" fill="#f8f6ed"/>']
    out.append(pair(LEFT, 44, page["title"], "title", "subtitle", 29))
    out.append(text(LEFT + 575, 45, page["note"]["en"], "deck"))
    out.append(text(LEFT + 575, 67, page["note"]["zh"], "deck", lang="zh-Hans"))
    out.append(text(LEFT, 98, f'{page["date"]}  /  CORE BASIN + ADJACENT DISTRICTS  /  核心区及相邻片区', "minor"))
    out.append(f'<rect x="{LEFT}" y="{TOP}" width="{WIDTH}" height="{HEIGHT}" fill="#f0eee6" stroke="#959b89"/>')
    out.append('<g clip-path="url(#map)">')

    ground = defaultdict(list)
    shades = {"lowland_farm": "farm", "upland": "upland", "village": "stock", "town": "stock",
              "water": "wet", "tidal_flat": "tidal", "pond": "pond", "hill": "hill",
              "transport_yard": "transport_yard"}
    for point, kind in land.items():
        ground[shades[kind]].append(point)
    for shade, cells in ground.items():
        out.append(path(cells_path(cells), shade))

    for area, cells in context_areas:
        plate_cells = cells_path(cells)
        name = area["name"]
        out.append(f'<g class="context"><title>{escape(name["en"])} / {escape(name["zh"])} · '
                   f'{area["ground_state"]} · {len(cells)} cells</title>' +
                   path(plate_cells, area["ground_state"]) + '</g>')

    for zone, cells in zones:
        classes = zone["use"] + " " + zone["intensity"]
        plate_cells = cells_path(cells)
        name = zone["name"]
        out.append(f'<g><title>{escape(name["en"])} / {escape(name["zh"])} · {zone["use"]}, '
                   f'{zone["intensity"]}, {zone["stage"]} · {len(cells)} cells</title>' + path(plate_cells, classes))
        if zone["stage"] != "proposal":
            hatch = "works-high" if zone["stage"] == "works" and zone["intensity"] == "high" else zone["stage"]
            out.append(path(plate_cells, hatch))
        out.append('</g>')

    out.append(path(polygon_path(water_edges), "wet"))
    out.append(path(polygon_path(channels), "channel"))
    for x in range(x0, x1, 5):
        sx, sy = xy((x, y0))
        out.append(path(f'M{sx},{sy}v{HEIGHT}', "grid"))
    for y in range(y0, y1, 5):
        sx, sy = xy((x0, y))
        out.append(path(f'M{sx},{sy}h{WIDTH}', "grid"))
    out.append(path(polygon_path(box(*core_bounds)), "core"))
    if phase == "opening":
        for line in fixtures:
            out.append(path(lines(line), "fixture"))
    for _, grade, state, line in sorted(routes, key=lambda r: ("track", "street", "avenue").index(r[1])):
        out.append(path(lines(line), f"{grade}" + (" proxy" if state == "proxy" else "")))
    out.append(path(lines(rail), "rail"))
    if phase == "visit":
        x, y = xy((384.9, 378.3))
        out.append(path(f'M{x-4},{y-4}l8,8m0,-8l-8,8', "gap"))
        out.append(text(x - 8, y + 18, "rail gap / 铁路间断", "map-en", **{"text-anchor": "end"}))

    for area, cells in context_areas:
        if "label" not in area:
            continue
        a, b = area["label"]
        x, y = xy((a, b))
        cx, cy = min(cells, key=lambda c: ((c[0] + .5 - a) ** 2 + (c[1] + .5 - b) ** 2, c))
        ex, ey = xy((cx + .5, cy + .5))
        out.append(f'<g class="zone-mark"><path d="M{ex},{ey}L{x},{y-2}"/>' +
                   pair(x + 3, y, area["name"], "zone-en", "zone-zh", 11.5) + '</g>')

    for zone, cells in zones:
        if "label" not in zone:
            continue
        a, b = zone["label"]
        x, y = xy((a, b))
        cx, cy = min(cells, key=lambda c: ((c[0] + .5 - a) ** 2 + (c[1] + .5 - b) ** 2, c))
        ex, ey = xy((cx + .5, cy + .5))
        out.append(f'<g class="zone-mark"><path d="M{ex},{ey}L{x},{y-2}"/>' +
                   pair(x + 3, y, zone["name"], "zone-en", "zone-zh", 11.5) + '</g>')

    out.append(map_labels(phase))
    sx, sy = LEFT + WIDTH - 35, TOP + 50
    out.append(path(f'M{sx},{sy}v-26l-5,8m5,-8l5,8', "scale"))
    out.append(text(sx - 4, sy - 30, "N", "panel-en"))
    out.append('</g>')
    out.append(path(f'M{LEFT},{TOP+HEIGHT+15}h120m-120,-3v6m120,-6v6', "scale"))
    out.append(text(LEFT + 132, TOP + HEIGHT + 19, "1 km  ·  100 m cells / 百米网格", "minor"))
    out.append(text(LEFT + WIDTH - 5, TOP + HEIGHT + 19, "EPSG:32650   •   UTM 50N", "minor", **{"text-anchor": "end"}))
    out.append(legend(phase))
    out.append('</svg>')
    (OUTPUT / f"core-basin-{page['date'][:4]}.svg").write_text("\n".join(out) + "\n", encoding="utf-8")

    # Build resolved machine-readable design grid payload for 3D atlas + game consumption.
    return {
        "date": page["date"],
        "zones": [
            {
                "id": zone["id"],
                "name": zone["name"],
                "use": zone["use"],
                "intensity": zone["intensity"],
                "stage": zone["stage"],
                "ground_state": zone["ground_state"],
                "cellCount": len(cells),
                "runs": runs_of(cells),
                "claims": zone.get("claims", []),
            }
            for zone, cells in zones
        ],
        "context_areas": [
            {
                "id": area["id"],
                "name": area["name"],
                "ground_state": area["ground_state"],
                "cellCount": len(cells),
                "runs": runs_of(cells),
                "claims": area.get("claims", []),
            }
            for area, cells in context_areas
        ],
        "avenue_cells": runs_of(avenue_cells),
        "routes": [
            {
                "id": key,
                "tier": grade,
                "basis": state,
                "parts": [
                    [[round(gx, 3), round(gy, 3)] for gx, gy in line.coords]
                    for line in parts(geom, "LineString")
                ],
                "utm_parts": [
                    [list(to_utm(pt)) for pt in line.coords]
                    for line in parts(geom, "LineString")
                ],
            }
            for key, grade, state, geom in routes if not geom.is_empty
        ],
    }


def legend(phase):
    x, y = LEFT + WIDTH + 22, TOP + 6
    out = [pair(x, y + 12, {"en": "Zones / Ground state", "zh": "用地分区 / 地表状态"}, "panel-title", "panel-zh", 17)]
    if phase == "opening":
        items = [
            ("commercial standard", "Commercial · standard", "标准商业（墟市）"),
            ("residential low", "Residential · low (villages)", "低强度住宅（村落）"),
            ("reserve low", "Reserve · low (future land)", "预留用地（低强度）"),
            ("transport_yard", "Rail station / freight / port", "铁路站场与口岸"),
            ("inherited", "Inherited stock (pre-1979)", "既有建成地（斜线）"),
            ("farm", "Retained farmland (base)", "农田底图（浅绿底色）"),
        ]
        r_items = [
            ("street", "Street · inherited town", "街道 · 既有城镇道路"),
            ("street proxy", "Street · estimated (Jianshe)", "街道 · 示意（含建设路）"),
            ("track proxy", "Track · local / crossing", "便道 · 地方及口岸支路"),
            ("rail", "Railway (KCR)", "广九铁路"),
            ("fixture", "Game start route fixture", "游戏开局参考线路"),
            ("core", "Core atlas trace window", "核心区描绘范围"),
        ]
    else:
        items = [
            ("commercial high", "Commercial · high (avenue)", "高强度商业（沿干道）"),
            ("commercial standard", "Commercial · standard", "标准商业"),
            ("residential standard", "Residential · standard", "标准住宅"),
            ("industrial standard", "Industrial · standard", "标准工业"),
            ("reserve low", "Reserve / low intensity", "预留 / 低强度（浅色）"),
            ("civic_park", "Civic compound & park", "机关院落与公园"),
            ("transport_yard", "Rail station / freight / port", "铁路站场与口岸"),
            ("inherited", "Inherited stock (pre-1979)", "既有建成地（斜线）"),
            ("works", "Graded works (five-and-one)", "在建土方工地（反斜线）"),
            ("farm", "Retained farmland (base)", "保留农田（浅绿底色）"),
        ]
        r_items = [
            ("avenue", "Avenue · dated reach", "干道 · 有时段依据"),
            ("avenue proxy", "Avenue · photo/proxy spine", "干道 · 照片/示意主干"),
            ("street", "Street · inherited / collector", "街道 · 既有或片区次干"),
            ("street proxy", "Street · estimated", "街道 · 示意次干"),
            ("track proxy", "Track · local or works", "便道 · 支路或施工"),
            ("rail", "Railway (KCR)", "广九铁路"),
            ("core", "Core atlas trace window", "核心区描绘范围"),
        ]
    for i, (css, en, zh) in enumerate(items):
        yy = y + 48 + i * 31
        out.append(f'<rect x="{x}" y="{yy-10}" width="22" height="17" class="{css}" stroke="#838a7b" stroke-width=".55"/>')
        out.append(pair(x + 31, yy, {"en": en, "zh": zh}, "panel-en", "panel-zh", 13))

    yy = y + 48 + len(items) * 31 + 14
    out.append(pair(x, yy, {"en": "Roads / Context", "zh": "道路等级 / 底图"}, "panel-title", "panel-zh", 17))
    for i, (css, en, zh) in enumerate(r_items):
        row = yy + 38 + i * 28
        out.append(path(f'M{x},{row-4}h22', css))
        out.append(pair(x + 31, row, {"en": en, "zh": zh}, "panel-en", "panel-zh", 12.5))

    note_y = yy + 38 + len(r_items) * 28 + 16
    note = ({"en": "1979 baseline; hatching marks stock.", "zh": "1979 基准；斜线标示既有建成地。"} if phase == "opening" else
            {"en": "Built/works/civic override 1980 fields.", "zh": "建成/工地/机关区替代 1980 年农田。"})
    out.append(pair(x, note_y, note, "minor", "minor", 15))
    return "".join(out)


if __name__ == "__main__":
    resolved = {
        "format": 2,
        "generated_by": "build/3d-snapshots/jan84-stage-b/make-zoning-maps.py",
        "grid": plan["grid"],
        "ground_states": plan["ground_states"],
        "atlas_profiles": plan["atlas_profiles"],
        "phases": {},
    }
    for phase in ("opening", "visit"):
        resolved["phases"][phase] = plate(phase)
    (OUTPUT / "core-basin-design-grid.json").write_text(
        json.dumps(resolved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("wrote", (OUTPUT / "core-basin-design-grid.json").relative_to(ROOT))
