"""Extract representative historical keyframes and a contact sheet from the
1984 Shenzhen documentary remake video (Bilibili BV1Kh411R7CX).

Usage:
    python pipeline/extract_1984_video_frames.py

Reads:
    data/raw/sources/phase1_1984_shenzhen_bilibili_remake/video.mp4
Writes:
    data/raw/sources/phase1_1984_shenzhen_bilibili_remake/frames/*.jpg
    data/raw/sources/phase1_1984_shenzhen_bilibili_remake/frames/contact_sheet.jpg
    data/raw/sources/phase1_1984_shenzhen_bilibili_remake/frames/manifest.json
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np

SOURCE_ID = "phase1_1984_shenzhen_bilibili_remake"
RAW_DIR = Path("data/raw/sources") / SOURCE_ID
VIDEO_PATH = RAW_DIR / "video.mp4"
FRAMES_DIR = RAW_DIR / "frames"

# (slug, timestamp_sec, label_short)
KEYFRAMES: list[tuple[str, float, str]] = [
    ("01_title_card", 10.5, "00:10 Title card"),
    ("02_1980_dananshan_hk", 19.5, "00:19 1980 Dananshan->HK"),
    ("03_1984_sea_world", 29.0, "00:29 1984 Sea World"),
    ("04_1983_shekou_aerial", 34.0, "00:34 1983 Shekou"),
    ("05_1984_chiwan_port", 37.0, "00:37 1984 Chiwan Port"),
    ("06_1984_municipal_gov", 42.0, "00:42 1984 Municipal Gov"),
    ("07_1984_electronics_factory", 50.0, "00:50 Electronics plant"),
    ("08_1984_xiangmihu_resort", 58.0, "00:58 Xiangmihu Resort"),
    ("09_1984_sz_bay_hotel_park", 60.0, "01:00 SZ Bay Hotel park"),
    ("10_1984_sz_bay_ferris_wheel", 63.0, "01:03 SZ Bay Ferris wheel"),
    ("11_1984_housing_interior_living", 70.0, "01:10 Housing interior"),
    ("12_1984_housing_interior_bed", 77.0, "01:17 Electrified home"),
    ("13_1984_housing_street_villas", 81.5, "01:21 1960s->1980s housing"),
    ("14_1984_guomao_scaffold", 91.0, "01:31 1984 Guomao base"),
    ("15_1984_guomao_tower", 97.0, "01:37 1984 Guomao tower"),
    ("16_1984_guomao_slipform_interview", 104.0, "01:44 Slipform interview"),
    ("17_1984_shennan_avenue", 115.0, "01:55 1984 Shennan Ave"),
    ("18_1984_aerial_city_a", 119.5, "01:59 1984 Aerial city A"),
    ("19_1984_aerial_city_b", 124.0, "02:04 1984 Aerial city B"),
    ("20_1994_window_of_world_note", 131.0, "02:11 1994 Window of World"),
    ("21_1984_night_school", 145.0, "02:25 1984 Night school"),
    ("22_credits_pearl_river_studio", 330.0, "05:30 Credits (Pearl River)"),
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    if not VIDEO_PATH.exists():
        raise FileNotFoundError(f"Missing raw video at {VIDEO_PATH}")

    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(VIDEO_PATH))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    records = []
    thumbs = []
    tw, th = 480, 270

    for slug, ts, label in KEYFRAMES:
        frame_idx = min(int(round(ts * fps)), total_frames - 1)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, frame = cap.read()
        if not ok:
            raise RuntimeError(f"Failed to read frame {frame_idx} ({ts}s) for {slug}")

        out_path = FRAMES_DIR / f"{slug}.jpg"
        cv2.imwrite(str(out_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 92])

        records.append(
            {
                "slug": slug,
                "file": out_path.name,
                "timestamp_sec": ts,
                "frame_index": frame_idx,
                "label": label,
                "sha256": sha256_file(out_path),
            }
        )

        thumb = cv2.resize(frame, (tw, th))
        cv2.rectangle(thumb, (0, 0), (tw, 28), (0, 0, 0), -1)
        cv2.putText(
            thumb,
            f"{slug[:2]} {label}",
            (8, 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.58,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
        thumbs.append(thumb)

    cap.release()

    cols = 4
    rows = math.ceil(len(thumbs) / cols)
    canvas = np.zeros((rows * th, cols * tw, 3), dtype=np.uint8)
    for idx, thumb in enumerate(thumbs):
        r, c = divmod(idx, cols)
        canvas[r * th : (r + 1) * th, c * tw : (c + 1) * tw] = thumb

    sheet_path = FRAMES_DIR / "contact_sheet.jpg"
    cv2.imwrite(str(sheet_path), canvas, [cv2.IMWRITE_JPEG_QUALITY, 88])

    manifest = {
        "source_id": SOURCE_ID,
        "video": {
            "path": VIDEO_PATH.as_posix(),
            "sha256": sha256_file(VIDEO_PATH),
            "width": width,
            "height": height,
            "fps": fps,
            "frame_count": total_frames,
            "duration_sec": round(total_frames / fps, 2) if fps else 0,
        },
        "contact_sheet": sheet_path.name,
        "keyframes": records,
    }
    manifest_path = FRAMES_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Extracted {len(records)} keyframes + contact sheet to {FRAMES_DIR}")


if __name__ == "__main__":
    main()
