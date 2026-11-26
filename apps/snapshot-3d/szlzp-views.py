"""Build the 1979-85 SZLZP viewpoint register, its claims and the atlas view list."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
selection = {row["product"]: row for row in json.loads(
    (HERE / "photo-selection.json").read_text(encoding="utf-8"))["items"]}
review = json.loads((HERE / "shennan-review.json").read_text(encoding="utf-8"))

# product, id, en, zh, mode, eye(e,n,h), look(e,n,h), span, fov, confidence, reading
# mode: camera = framed oblique; district = locality frame with the standard camera.
# Coordinates are the atlas view, not a surveyed camera station.
VIEWS = [
    (1554, "guomao", "Guomao / Renmin Road", "国贸／人民路", "camera",
     (202730, 2495900, 262), (203560, 2496030, 6), 1550, 45, "medium",
     "Long axis along Shennan East with the old town left and Guomao right."),
    (1557, "hongling", "Hongling / Shennan", "红岭路／深南路", "camera",
     (201985, 2495670, 260), (202086, 2496420, 10), 1460, 53, "medium",
     "North over the Hongling junction with Lizhi Park on the west side."),
    (1559, "yannan", "Yannan / Tongjianlou", "燕南路／统建楼地段", "camera",
     (200700, 2495945, 182), (199887, 2495858, 7), 1380, 51, "medium",
     "West along Shennan Middle past the Yannan frontage."),
    (1561, "huaqiang", "Huaqiang / Shennan Middle", "华强路／深南中路", "camera",
     (199934, 2495528, 245), (199930, 2496375, 8), 1420, 54, "high",
     "North over the Huaqiang junction; the caption puts Huaqiang Building west and SEG/Electronics east."),
    (1552, "huangbeiling", "Huangbeiling / Yanhe Road", "黄贝岭／沿河路", "camera",
     (204955, 2496312, 236), (205821, 2496529, 8), 1710, 52, "medium",
     "East along Shennan East toward the Huangbeiling hills."),
    (1566, "dachong", "Dachong / Dasha River", "大冲／大沙河", "camera",
     (187028, 2495570, 238), (187380, 2496800, 5), 2170, 51, "low",
     "Up-valley toward the Dasha River crossing; the river and bridge are not modelled."),
    (1553, "hubei", "Hubei / Wenjing Road", "湖贝段／文静路", "camera",
     (204180, 2496030, 110), (204520, 2496200, 5), 900, 52, "low",
     "East along the paving works with the old Hubei lane on the left."),
    (1567, "nantou", "Nantou / Zhongshanyuan Road", "南头段／中山园路", "camera",
     (184980, 2496120, 45), (186300, 2495960, 8), 1500, 50, "medium",
     "East along the Guangzhou-Shenzhen road; the sign gives 19 km to Shenzhen and 8 km to Shekou."),
    (1558, "shifu", "Shifu Road / Shangbu Road", "市府路／上步路", "camera",
     (200480, 2495480, 360), (200520, 2496120, 0), 1650, 51, "high",
     "North over the Shangbu junction and the compound frontages east of Shennan."),
    (1555, "caiwuwei", "Caiwuwei / Heping Road", "蔡屋围／和平路", "camera",
     (202590, 2495390, 420), (203230, 2495960, 0), 1750, 50, "low",
     "Locality comparison. The foreground rail and receding road axis in the photo do not match this bearing."),
    (1541, "luohu-rise", "Luohu from the south", "罗湖崛起", "camera",
     (203520, 2494180, 210), (203380, 2495560, 10), 2300, 38, "low",
     "Skyline across the river; many towers shown, so the frame is probably later than 1985."),
    (1506, "luohu-town-1981", "Luohu town from the south", "建设中的罗湖", "camera",
     (202960, 2495990, 55), (203160, 2496420, 8), 1000, 50, "medium",
     "North over the old Dongmen roofs with new blocks and works in front."),
    (1520, "luohu-fill-1980", "Luohu site after filling", "罗湖小区五通一平", "camera",
     (202790, 2495120, 70), (203360, 2495560, 5), 1100, 50, "medium",
     "North-east over the levelled site; pond and low village in the foreground."),
    (1518, "luohu-hill-cut-1980", "Luohu hill south slope", "开挖罗湖山南坡", "camera",
     (202880, 2494890, 85), (203180, 2495330, 15), 950, 50, "medium",
     "North over the cut slope with the village foot and haul tracks."),
    (1521, "luohu-works-1981", "Luohu works 1981", "罗湖摆战场", "camera",
     (203120, 2495120, 60), (203230, 2495680, 10), 950, 50, "medium",
     "North-west over the pile drivers with Luohu hill behind."),
    (1523, "haifengyuan-1984", "Haifengyuan and the works", "海丰苑与工地", "camera",
     (203460, 2495330, 85), (203200, 2495760, 15), 1050, 50, "low",
     "North-west over three finished towers, works and old roofs."),
    (1511, "heping-1985", "Heping Road / Luohu", "和平路／罗湖", "camera",
     (203010, 2495200, 95), (203260, 2495770, 10), 1150, 50, "low",
     "Locality comparison. The rail, street, river bend and left-hand ridge are not registered to this bearing."),
    (1526, "huxin-1982", "Luohu towers 1982", "湖心酒店一带", "camera",
     (203460, 2495520, 95), (203230, 2495900, 25), 1100, 48, "low",
     "West over completed and rising towers; the circular-top shaft needs identity confirmation."),
    (1529, "guoshang-works-1981", "Guoshang works 1981", "国商大厦工地", "district",
     None, (203280, 2495682), 700, 50, "medium",
     "Pile frames and foundation pits on the Guoshang parcel."),
    (1530, "guoshang-1982", "Guoshang under construction", "国商承建", "camera",
     (203000, 2495560, 45), (203250, 2495810, 45), 620, 50, "medium",
     "Two scaffolded slabs seen from the south-west, with haul roads in front."),
    (1522, "haifengyuan-1982", "Haifengyuan foundations", "海丰苑大厦动工", "camera",
     (203520, 2495360, 120), (203250, 2495620, 5), 800, 50, "low",
     "Down over foundation mats and haul roads beside a new carriageway."),
    (1524, "luohu-building-1982", "Luohu Building frontage", "罗湖大厦", "camera",
     (203120, 2495480, 25), (203320, 2495620, 30), 700, 50, "low",
     "Street-level cluster of rising blocks with cranes."),
    (1462, "bagualing-1982", "Bagualing ground breaking", "八卦岭破土动工", "camera",
     (201420, 2497260, 35), (201760, 2497600, 5), 900, 50, "medium",
     "Cleared ground in the fields with the northern hills behind."),
    (1460, "shangbu-1981", "Shangbu site works", "上步区大规模兴建", "district",
     None, (200300, 2496000), 1200, 50, "medium",
     "Earthmoving across the Shangbu fields; no fixed camera station."),
    (1470, "liantang-1985", "Liantang works at dusk", "莲塘工业区动工", "camera",
     (206700, 2497000, 330), (202700, 2496080, 0), 5200, 42, "medium",
     "West over the border works toward the city and the bay."),
    (1385, "shekou-1980", "Shekou peninsula 1980", "蛇口开发初期", "camera",
     (182980, 2490060, 520), (182500, 2490920, 0), 2600, 46, "medium",
     "North-west over the cut hills, harbour and Deep Bay."),
    (1386, "shekou-harbour-1985", "Shekou harbour 1985", "蛇口填海码头", "camera",
     (183100, 2490200, 260), (182350, 2490800, 0), 1800, 48, "medium",
     "Over the filled quay, sheds, silos and berthed ships."),
    (1407, "chiwan-1981", "Chiwan harbour 1981", "赤湾港初建", "camera",
     (180300, 2491700, 150), (182300, 2491220, 0), 2400, 48, "low",
     "Across the bay toward the new quay and the hill."),
    (1393, "shekou-quay-1981", "Shekou cargo quay", "蛇口货运码头", "camera",
     (182700, 2490600, 40), (182400, 2490350, 5), 800, 50, "low",
     "Cranes and trucks at the quay."),
    (1502, "sea-world", "Sea World waterfront", "海上世界", "camera",
     (182300, 2490400, 90), (182010, 2490120, 0), 1200, 48, "medium",
     "Along the Shekou waterfront with the Minghua berthed offshore."),
    (1469, "mawan-1985", "Mawan port works", "妈湾港动工", "camera",
     (177400, 2494100, 220), (178100, 2493760, 0), 1500, 48, "medium",
     "Over the new peninsula works and barges."),
    (1503, "szbay-hotel", "Shenzhen Bay Hotel park", "深圳湾大酒店游乐场", "camera",
     (189700, 2494900, 90), (189280, 2495230, 0), 1300, 48, "medium",
     "Amusement park on the bay shore; undated but the park opened in 1984."),
    (966, "luohu-bridge-1984", "Luohu bridge 1984", "罗湖桥", "camera",
     (203000, 2494180, 110), (203120, 2494330, 0), 700, 50, "high",
     "Down on the rail bridge and river; the bridge axis is fixed by the rail."),
    (971, "wenjindu-1984", "Wenjindu port 1984", "文锦渡口岸", "camera",
     (203760, 2494120, 240), (203860, 2494560, 0), 1400, 50, "medium",
     "Aerial over the checkpoint, the river and the border hills."),
    (974, "wenjindu-1981", "Wenjindu crossing 1981", "文锦渡客货口岸", "camera",
     (203700, 2494270, 28), (203880, 2494440, 5), 700, 50, "medium",
     "Across the checkpoint buildings with the far hills."),
    (978, "shatoujiao-1982", "Sha Tau Kok 1982", "沙头角远眺", "camera",
     (208900, 2496300, 150), (209600, 2495600, 0), 2200, 48, "low",
     "Across the fields and bay toward the far shore."),
    (1507, "dongmen-1979", "Dongmen street 1979", "东门街景", "camera",
     (202930, 2496330, 9), (203020, 2496400, 6), 320, 52, "medium",
     "Street level in the old town; the arcade rhythm is the useful comparison."),
    (1510, "renmin-1980", "Renmin Road 1980", "人民路", "camera",
     (203030, 2496100, 8), (203030, 2496280, 5), 400, 52, "medium",
     "Street level on the north-south spine of the old town."),
]

# Caption/image warnings found during inspection.
WARN = {
    954: "The served file is a bulldozer scene, not the village view implied by 渔民村1979; treat the pairing as unresolved.",
    1453: "The served file is a modern photograph of the estate gate, not a 1981 view.",
    1526: "The tall circular-top shaft resembles Guomao; the caption names 湖心酒店. Identity needs confirmation.",
    1541: "Undated and shows many finished towers; probably later than 1985.",
    1500: "Undated; shows Guomao completed, so after the 1984 topping.",
    1536: "Undated; shows Guomao completed, so after the 1984 topping.",
    1534: "Undated; the open frame and crane place it within the Guomao works, but not a month.",
    1535: "Undated; scaffolded shaft above a finished base, within the Guomao works.",
    1551: "Undated rural road; not used as a location because the reach is unresolved.",
    957: "Duplicate of the 1984 Nantou frame under a different product id.",
    958: "Duplicate of the 1985 Guomao frame under a different product id.",
}

# Undated frames that still belong to the Guomao works because the tower is rising.
CONSTRUCTION = {1534, 1535}


def claim_id(product):
    return f"atlas.photo.szlzp.{product}"


def main():
    claims, views = [], []
    for product, vid, en, zh, mode, eye, look, span, fov, conf, reading in VIEWS:
        row = selection.get(product)
        if not row:
            raise SystemExit(f"missing selection {product}")
        yrs = row["years"]
        year = yrs[0][0] if yrs else None
        precision = "year" if year else "undated"
        if yrs and (yrs[0][1] or yrs[0][2]):
            precision = "day" if yrs[0][2] else "month"
        note = WARN.get(product, "")
        claims.append({
            "id": claim_id(product),
            "source": "atlas_szlzp_catalogue",
            "locator": f"showProducts{product}.html, image {row['file']}; local intake photo-selection.json",
            "quote": row["caption"],
            "summary": f"The publisher captions this frame {row['caption'][:60]!r} and credits 何煌友."
                       + (" No year is printed; the visible construction state, not a caption date, places it in the works."
                          if product in CONSTRUCTION else ""),
            **({"date": {"value": f"{year:04d}" if precision == 'year' else
                        f"{year:04d}-{yrs[0][1]:02d}" if precision == 'month' else
                        f"{year:04d}-{yrs[0][1]:02d}-{yrs[0][2]:02d}", "precision": precision}} if year else {}),
            "notes": (" ".join(x for x in [
                "Publisher's caption and year, machine-read from the catalogue page; not a negative date.",
                note] if x)),
            "status": "sourced",
            "extracted_by": "ai:opencode-shennan-catalogue",
        })
        entry = {"id": vid, "name": [en, zh], "product": product, "image": row["file"],
                 "page": f"showProducts{product}.html", "year": year or "undated",
                 "captionZh": row["caption"], "claim": claim_id(product), "mode": mode,
                 "span": span, "fov": fov, "confidence": conf, "reading": reading,
                 "target": [look[0], look[1]]}
        if eye:
            entry["eye"] = list(eye)
            entry["look"] = list(look)
        else:
            # A locality frame: reuse the atlas core-view angle, aimed at the district centre.
            span_ = span
            entry["eye"] = [look[0] + span_ * 0.12, look[1] - span_ * 0.74, span_ * 0.92]
            entry["look"] = [look[0], look[1], 6]
        views.append(entry)

    review["views"] = views
    (HERE / "shennan-review.json").write_text(
        json.dumps(review, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    header = """# Catalogue frames and camera viewpoints, 1979-85 / 1979–85 年目录照片与视角

Publisher: [深圳老照片](http://www.szlzp.com/products.html), credited to 何煌友 on the individual pages.
Local copies are reference-only. `photo-catalogue.json` lists all **527** entries read from the public
listings; `photo-selection.json` records the **78** frames cached for this review with byte counts and
SHA-256; `public/photo-review/` holds the files. Claims are in
`data/evidence/claims/atlas_shennan_catalogue_views.yaml`.

**What is registered.** Every 1979–85 frame in the catalogue that shows a district, road or skyline rather
than a single interior or portrait, plus the undated Guomao frames whose rising tower places them inside the
1981–84 works. Portraits, ceremonies, factory interiors and post-1985 views are excluded; four 1988 Shennan
views and the 1976 Luohu views remain in the manifest but are not on this list.

**Cameras.** Each row gives a comparison camera in the atlas: an eye and look point in UTM 50N with eye
height, or — for `district` rows — a locality centre framed with the standard core-view angle. These are
reconstructions from the caption, the visible landmarks and the model's own street geometry. They are not
surveyed camera stations and must not be cited as such.

**Caption cautions found while reading.** The catalogue pairs images and captions inconsistently in a few
entries. `954` 渔民村1979 serves a bulldozer scene; `1453` 东湖丽苑（1981） serves a present-day photograph;
`957` and `958` duplicate the 1984 Nantou and 1985 Guomao frames. `1526` names 湖心酒店 but shows a
circular-top shaft that needs identity confirmation. Four Guomao frames (`1534`, `1535`, `1500`, `1536`)
carry no year: the first two show a rising shaft and belong to the works; the last two show a completed
tower and post-date the topping. `1541` 罗湖崛起 is undated and shows a full skyline, so it is probably later
than 1985. None of these is used to date a building.

**Rebuild.** From `build/3d-snapshots/jan84-stage-b/`: `..\\..\\..\\pipeline\\.venv\\Scripts\\python.exe szlzp-list.py`,
then `szlzp-download.py` (cached frames are skipped) and `szlzp-views.py`, which rewrites this table and the
atlas view list. `szlzp-intake.py` is the earlier all-entries downloader and is not needed for this list.
"""
    hm = HERE / "photo-selection.json"
    rows = ["| Product | Year | Locality / view | Mode | Comparison camera (UTM 50N, height) | Confidence | Reading |",
            "|---|---|---|---|---|---|---|"]
    for view in views:
        eye = view.get("eye")
        camera = (f"eye {eye[0]}, {eye[1]}, {eye[2]} m → look {view['look'][0]}, {view['look'][1]}"
                  if eye else f"locality {view['target'][0]}, {view['target'][1]}")
        rows.append(f"| [{view['product']}](http://www.szlzp.com/{view['page']}) | {view['year']} | "
                    f"{view['name'][0]} · {view['name'][1]} | {view['mode']} | {camera} | {view['confidence']} | {view['reading']} |")
    doc = (ROOT / "docs/research/shennan-photo-viewpoints.md")
    doc.write_text(header + "\n" + "\n".join(rows) + "\n", encoding="utf-8")
    (HERE / "atlas_shennan_catalogue_views.yaml.part").write_text(
        json.dumps(claims, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(views), "views,", len(claims), "claims;", hm.exists())


if __name__ == "__main__":
    main()
