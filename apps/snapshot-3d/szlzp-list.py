"""List the public Shenzhen old-photo catalogue without downloading images.

Builds `photo-catalogue.json`: one row per catalogue entry with its caption,
publisher year(s) and the image path that the listing page serves. Run the
download step separately for the frames selected for the viewpoint review.
"""
import json
import re
import time
import urllib.request
from pathlib import Path

BASE = "http://www.szlzp.com/"
HERE = Path(__file__).resolve().parent
CARD = re.compile(r'href="showProducts(\d+)\.html".*?src="(uploads/image/[^"]+\.jpg)"[^>]*alt="([^"]*)"', re.S)
SECTIONS = {230: "边防", 290: "渔业", 229: "人文", 231: "纪实", 244: "教育", 292: "城貌", 296: "农业"}


def get(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Shenzhen atlas review)"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8", "replace")


def years(caption: str):
    out = []
    for match in re.finditer(r"(19\d{2})(?:[.\-](\d{1,2})(?:[.\-](\d{1,2}))?)?", caption):
        value = int(match.group(1))
        if 1960 <= value <= 1995:
            out.append([value, int(match.group(2) or 0), int(match.group(3) or 0)])
    return out


def collect(area: int, section: int):
    rows, page = [], 1
    while page < 8:
        path = f"products-{area}-{section}-{page}.html"
        try:
            html = get(BASE + path)
        except Exception as error:
            print("listing failed", path, error)
            break
        found = CARD.findall(html)
        if not found:
            break
        for product, src, caption in found:
            rows.append({"product": int(product), "area": area, "section": section,
                         "section_zh": SECTIONS.get(section, ""), "page": path,
                         "show": f"showProducts{product}.html", "src": src, "caption": caption.strip(),
                         "years": years(caption)})
        if f"products-{area}-{section}-{page + 1}.html" not in html:
            break
        page += 1
        time.sleep(0.2)
    return rows


def main():
    rows, seen = [], set()
    sections = [(1, 292), (2, 292), (3, 292), (4, 292), (5, 292), (0, 292),
                (0, 230), (0, 231), (0, 229), (0, 296), (1, 231), (1, 229)]
    for area, section in sections:
        for row in collect(area, section):
            if row["product"] in seen:
                continue
            seen.add(row["product"])
            rows.append(row)
    rows.sort(key=lambda r: r["product"])
    (HERE / "photo-catalogue.json").write_text(
        json.dumps({"source": BASE, "retrieved": time.strftime("%Y-%m-%d"), "items": rows},
                   ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    dated = [r for r in rows if any(1979 <= y[0] <= 1985 for y in r["years"])]
    print(len(rows), "entries;", len(dated), "carry a 1979-85 year")


if __name__ == "__main__":
    main()
