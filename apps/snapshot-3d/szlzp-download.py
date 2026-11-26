"""Fetch the catalogue frames selected for the 1979-85 viewpoint review.

Selection is by catalogue product id and is recorded in `photo-selection.json`.
Images are reference-only local copies; nothing is republished.
"""
import hashlib
import json
import time
import urllib.request
from pathlib import Path

BASE = "http://www.szlzp.com/"
HERE = Path(__file__).resolve().parent
OUT = HERE / "public/photo-review"
CATALOGUE = json.loads((HERE / "photo-catalogue.json").read_text(encoding="utf-8"))["items"]

# Wide city views and Guomao-construction frames, 1979-85 plus undated views that
# show the tower during the 1981-84 works. Individual portraits are excluded.
SELECTED = [
    954, 957, 958, 966, 968, 969, 971, 974, 975, 978, 976, 1019,
    1385, 1386, 1387, 1390, 1393, 1397, 1399, 1406, 1407, 1408,
    1453, 1454, 1460, 1462, 1469, 1470, 1480, 1482, 1491, 1499,
    1500, 1502, 1503, 1506, 1507, 1510, 1511, 1513, 1516, 1517, 1518, 1519, 1520, 1521,
    1522, 1523, 1524, 1526, 1527, 1528, 1529, 1530, 1531, 1532, 1533, 1534, 1535, 1536,
    1541, 1551, 1556, 1563, 1564, 1565,
    1552, 1553, 1554, 1555, 1557, 1558, 1559, 1560, 1561, 1562, 1566, 1567,
]


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Shenzhen atlas review)"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    by_product = {row["product"]: row for row in CATALOGUE}
    selection = []
    for product in SELECTED:
        row = by_product.get(product)
        if not row:
            print("not in catalogue", product)
            continue
        target = OUT / Path(row["src"]).name
        if not target.exists() or target.stat().st_size < 4000:
            try:
                target.write_bytes(fetch(BASE + row["src"]))
                time.sleep(0.25)
            except Exception as error:
                print("failed", product, error)
                continue
        data = target.read_bytes()
        selection.append({**row, "file": target.name, "bytes": len(data),
                          "sha256": hashlib.sha256(data).hexdigest()})
    (HERE / "photo-selection.json").write_text(
        json.dumps({"retrieved": time.strftime("%Y-%m-%d"), "items": selection},
                   ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(selection), "selected frames cached")


if __name__ == "__main__":
    main()
