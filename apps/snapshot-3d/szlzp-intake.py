"""List and cache the public Shenzhen old-photo catalogue for the 1979-85 viewpoint review.

The catalogue thumbnails are reference-only. This script copies the served files
into a local intake folder and writes a manifest; nothing here is a rights grant.
"""
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path

BASE = "http://www.szlzp.com/"
HERE = Path(__file__).resolve().parent
OUT = HERE / "public/photo-review"
MANIFEST = HERE / "photo-review.json"

PAGES = [
    ("all", 1, "products.html"),
    *[(f"district-{d}", p, f"products-{d}-292-{p}.html") for d in range(11) for p in range(1, 5)],
    *[(f"general-{d}", p, f"products-0-{d}-{p}.html") for d in (230, 290, 229, 231, 244, 296) for p in range(1, 5)],
    ("overview", 1, "products.html"),
]
CARD = re.compile(r'href="showProducts(\d+)\.html".*?src="(uploads/image/[^"]+\.jpg)"[^>]*alt="([^"]*)"', re.S)


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Shenzhen atlas review)"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def years(caption: str):
    found = []
    for match in re.finditer(r"(19\d{2})(?:[.\-](\d{1,2})(?:[.\-](\d{1,2}))?)?", caption):
        value = int(match.group(1))
        if 1970 <= value <= 1990:
            found.append([value, int(match.group(2) or 0), int(match.group(3) or 0)])
    return found


def listing():
    seen, cards = {}, []
    for group, page, path in PAGES:
        try:
            html = get(BASE + path).decode("utf-8", "replace")
        except Exception as error:
            print("listing failed", path, error)
            continue
        for product, src, caption in CARD.findall(html):
            if product in seen:
                continue
            seen[product] = True
            cards.append({"product": int(product), "page": f"showProducts{product}.html",
                          "group": group, "src": src, "caption": caption.strip()})
        time.sleep(0.35)
    return cards


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cards = listing()
    kept = []
    for card in cards:
        card["years"] = years(card["caption"])
        target = OUT / Path(card["src"]).name
        if not target.exists():
            try:
                target.write_bytes(get(BASE + card["src"]))
            except Exception as error:
                print("image failed", card["src"], error)
                continue
            time.sleep(0.35)
        card["file"] = target.name
        card["bytes"] = target.stat().st_size
        card["sha256"] = hashlib.sha256(target.read_bytes()).hexdigest()
        kept.append(card)
    MANIFEST.write_text(json.dumps({"retrieved": time.strftime("%Y-%m-%d"), "items": kept},
                                   ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(kept), "catalogue entries", sum(1 for c in kept if any(1979 <= y[0] <= 1985 for y in c["years"])), "dated 1979-85")


if __name__ == "__main__":
    main()
