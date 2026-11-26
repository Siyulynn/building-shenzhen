"""Build the standalone Stage B atlas inputs from the existing calibration register and public map readings."""
import json
import sys
from pathlib import Path

import numpy as np
import yaml
from pyproj import Transformer

HERE = Path(__file__).resolve().parent
ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE.parents[2]
source = json.loads((HERE / "stage-b-input.json").read_text(encoding="utf-8"))
rows = yaml.safe_load((ROOT / "data/calibration/buildings_1984.yaml").read_text(encoding="utf-8"))
known = json.loads((ROOT / "build/evidence/claims.json").read_text(encoding="utf-8"))["claims"]

controls = source["controls"]
image = np.array([[x, y, 1] for _, x, y, _, _ in controls])
utm = np.array([row[3:] for row in controls])
affine = np.linalg.lstsq(image, utm, rcond=None)[0]
holdouts = []
for i, xy in enumerate(image):
    selection = np.arange(len(image)) != i
    fit = np.linalg.lstsq(image[selection], utm[selection], rcond=None)[0]
    holdouts.append(np.linalg.norm(xy @ fit - utm[i]))

def rounded(point):
    return [round(float(v), 1) for v in point]

def project(p):
    return np.array([*p, 1]) @ affine

def from_detail(detail, p):
    anchor, utm_anchor = detail["anchor"]
    delta = np.subtract(p, anchor) * detail["scale"]
    return rounded(np.array(utm_anchor) + delta @ affine[:2])

to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32650", always_xy=True)
def names(zh, en):
    return {"zh": zh, "en": en}

authored = {
    "guomao": "guomao",
    "guoshang": "guoshang",
    "electronics": "electronics-building",
    "municipal_government": "municipal-government",
    "bagualing": "bagualing-earthworks",
}
detail_anchors = {
    "m82_tcm_hospital": ("caiwuwei", 510, 224, "phase1.map.1984.caiwuwei_other_labels"),
    "m82_weather_station": ("caiwuwei", 103, 68, "phase1.map.1984.caiwuwei_other_labels"),
}
# Cutoff decisions for entries normally recorded only at year resolution.
hold = {
    "szu": ("Date after cutoff: permanent campus ground break in February.", "永久校区二月奠基，晚于截点。"),
    "museum_old": ("The 1984 build-year entry does not give a January stage.", "1984年始建记录未给出一月工程阶段。"),
    "grand_theatre": ("The 1983 design and year-only site levelling do not give a January stage.", "1983年设计及1984年平地记录未给出一月阶段。"),
    "luohu_terminal": ("The 1985 opening does not establish the January 1984 worksite.", "1985年启用未能确定1984年一月的工地状态。"),
    "shenzhen_station": ("The station and yard are retained. The later building centroid and historical station dot do not locate the January station house away from the tracks.", "保留车站及站场。后期站房中心点及旧图站点不足以确定一月站房在轨道旁的位置。"),
    "sea_world": ("Register proxy is offshore; show no generic building or invented fill.", "登记点位在水上，不添加普通建筑或推造填海。"),
    "shekou_office": ("Year-only 1984 photograph; retain as a later comparison point.", "仅有1984年照片，保留为后续对照点。"),
    "shenzhen_bay_hotel": ("July photo cannot establish the January structure; later-site proxy only.", "七月照片不能确定一月建筑；仅为后期地点示意。"),
    "xiangmihu": ("Later film and a resort-area proxy do not fix January structures.", "后期影片与度假区示意点不能确定一月建筑。"),
}
sites = []
for row in rows:
    key = row["id"].removeprefix("b1984.")
    at = rounded(to_utm.transform(*row["lonlat"])) if row["lonlat"] else None
    date = str(row["by_1984"]["date"])
    status = row["status_1984"]
    claims = list(row["claims"])
    if key in detail_anchors:
        section, x, y, claim = detail_anchors[key]
        at = from_detail(source["details"][section], [x, y])
        claims.append(claim)
    if key in authored:
        mode, note = "existing", names("沿用已制作地标或工地", "Covered by the existing landmark or works study")
    elif at is None:
        mode, note = "reference", names("尚无可用位置", "No usable location yet")
    elif key in hold:
        mode, note = "reference", names(hold[key][1], hold[key][0])
    elif status == "planned":
        mode, note = "reference", names("计划或状态未明，不建成楼体", "Planned or unresolved; no finished building")
    elif status == "under_construction":
        mode, note = "works", names("有早期工程依据；工棚及场坪为示意", "Early works supported; yard and temporary structures illustrative")
    elif key == "shanghai_hotel":
        mode, note = "inferred", names("名录载1983年始建；一月工程阶段及开业时间待核",
                                      "The register gives a 1983 build year; January stage and opening are unconfirmed")
    elif key.startswith("m82_") or key == "boya":
        mode, note = "inferred", names("地图地名示意；一月建筑形态和使用状态待核", "Map-label proxy; January fabric and use not established")
    else:
        if date[:4] > source["cutoff"][:4]:
            raise ValueError(f"Beyond cutoff without an explicit decision: {row['id']}")
        mode, note = "dated", names("有早期记载；轮廓、层数、位置均为示意", "Early existence supported; footprint, floors and placement illustrative")
    if key.startswith("m82_") and (row["kind"] in {"agriculture", "military"} or key in {
        "m82_chuanbu_wharf", "m82_taxi_stand", "m82_peoples_stadium", "m82_coal_yard"
    }):
        mode, note = "reference", names("地图标场区，不作楼体", "Map labels an area; no individual building assumed")
    if key in ("m82_shenzhen_middle_school", "m82_peoples_hospital_inpatient"):
        mode, note = "dated", names("开局前地点已见记载，楼体未辨", "Pre-opening locality supported; individual building unresolved")
    if key == "m82_tourism_supply_co":
        mode, note = "reference", names("地图位置与水体冲突，暂不移动或填塘", "Schematic point conflicts with water; do not relocate or fill the pond")
    if key == "m82_sungang_station":
        mode, note = "reference", names("既有笋岗货场地点；股道与站房未确定", "Known freight-yard locality; track and shed layout unresolved")
    if key == "boya":
        # The register shares one frontage point. Offset the two illustrative shop masses within that frontage.
        at[0] -= 24
    sites.append(dict(id=row["id"], name=row["name"], kind=row["kind"], at=at,
                      mode=mode, note=note, claims=claims, existing=authored.get(key)))

for section, key, zh, en, kind, x, y, *override in source["previewBuildings"]:
    detail = source["details"][section]
    sites.append(dict(id=f"m84.{section}.{key}", name=names(zh, en), kind=kind,
                      at=from_detail(detail, [x, y]), mode="inferred",
                      note=names("春季版面标签；一月状态待核，楼体为片区示意",
                                 "Spring-edition label; provisional infill in the January view"),
                      claims=[override[0] if override else detail["claim"]]))

overview = "phase1.map.1984.overview_comparison"
roads = [dict(id=f"m84.road.{key}", name=[en, zh], claims=[overview, earlier],
              pixels=points, geometry=[rounded(project(p)) for p in points])
         for key, zh, en, points, earlier in source["roads"]]
roads.extend(dict(id=f"m84.road.{key}", name=[en, zh], claims=[overview, claim],
                  pixels=points, detail=section,
                  geometry=[from_detail(source["details"][section], p) for p in points])
             for section, key, zh, en, points, claim in source["detailRoads"])
extent = [dict(id=f"m84.extent.{key}", name=[en, zh], kind=kind, claims=[overview, earlier],
               pixels=ring, geometry=[rounded(project(p)) for p in [*ring, ring[0]]])
          for key, zh, en, kind, ring, earlier in source["extent"]]
context = ["phase1.map.1984.preview_edition", "phase1.map.1984.caiwuwei_grade_separation_unbuilt"]
ids = {c for item in [*sites, *roads, *extent] for c in item["claims"]} | set(context)
if missing := ids - known.keys():
    raise ValueError(f"Missing claims: {sorted(missing)}")
output = dict(cutoff=source["cutoff"], context=context, sites=sites, roads=roads, extent=extent,
              overviewFit=dict(points=len(controls), residualRmsM=round(float(np.sqrt(np.mean(np.sum((image @ affine-utm)**2, axis=1)))), 1),
                               leaveOneOutRmsM=round(float(np.sqrt(np.mean(np.square(holdouts)))), 1)))
(HERE / "stage-b.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(sites)} site records, {len(roads)} road traces, {len(extent)} urban extents; {output['overviewFit']}")
