"""Register December 1977 KH-9 scans to the September 1980 slice mosaic.

Usage: python -I pipeline/m1c_kh9_1977.py [A010|F010] [--intake]
--intake checks and reduces the original archive or the local numbered ZIP parts.
Without it, reuse the reduced TIFFs in data/raw/sources/<source>/reduced/.
Writes relative-registration diagnostics and any passing GeoTIFF to that source's
registered/ directory. The GeoTIFF is local research material, not a viewer asset.
"""
import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import cv2
import numpy as np
import rasterio
from rasterio.enums import ColorInterp
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kh9_reduce import reduce_archive  # noqa: E402
from m1c_kh9_georef import Poly  # noqa: E402
from slice_areas import GRID, ROOT  # noqa: E402

SOURCE_PREFIX = "kh9_1977_12_03_"
FRAME_PREFIX = "D3C1213-400953"
ARCHIVES = {
    "A010": (5, 2101540928, "62ddaedfec672ff1f6081f65e16ca9bfc77c25113bfb4c740dfc40f85aa6ace0"),
    "F010": (6, 2475824675, "db8b15953f4bbe32d5f146abc1d22b526b70c7f4efa54c5fbb73fa2b0c6120c1"),
}
SCALE = 6.25
MAX_RMS = 30
CORE_BOX = (344, 365, 412, 398)


def digest(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def intake(frame, source):
    count, size, expected = ARCHIVES[frame]
    stem = FRAME_PREFIX + frame
    archive = source / f"{stem}.tar.gz"
    with TemporaryDirectory(dir=source) as tmp:
        if not archive.is_file():
            archive = Path(tmp) / archive.name
            parts = ROOT / "data/raw/download"
            with archive.open("wb") as dst:
                for n in range(1, count + 1):
                    with ZipFile(parts / f"{stem}-part{n:02}-of-{count:02}.zip") as z:
                        with z.open(f"{stem}.tar.gz.part{n:02}") as src:
                            while chunk := src.read(8 << 20):
                                dst.write(chunk)
        if archive.stat().st_size != size or digest(archive) != expected:
            raise ValueError(f"{stem}: archive size or SHA-256 does not match the source register")
        reduce_archive(archive, source / "reduced")
    (source / "reduced/archive.sha256").write_text(expected + "\n", encoding="ascii")


def fit(src, dst, kind):
    if kind == "quadratic":
        model = Poly(src, dst, 2)
        return model, model.to_json()
    h, _ = cv2.findHomography(src, dst, 0)
    if h is None:
        raise ValueError("Degenerate projective fit")
    return lambda p: cv2.perspectiveTransform(np.asarray(p, dtype=np.float64)[None], h)[0], h.tolist()


def audit(src, dst, groups, kind):
    errors = np.full(len(src), np.nan)
    for group in np.unique(groups):
        held = groups == group
        if (~held).sum() < 20:
            return None, errors
        try:
            predict, _ = fit(src[~held], dst[~held], kind)
            errors[held] = np.linalg.norm(predict(src[held]) - dst[held], axis=1) * SCALE
        except (ValueError, cv2.error, np.linalg.LinAlgError):
            return None, errors
    if not np.isfinite(errors).all():
        return None, errors
    return dict(rms_m=float(np.sqrt(np.mean(errors**2))), p90_m=float(np.quantile(errors, .9)),
                max_m=float(errors.max())), errors


def warp(scan, mask, src, dst, kind, limit_hull=True):
    h, w = mask.shape
    inverse, model = fit(dst, src, kind)
    cover = np.full((h, w), 0 if limit_hull else 255, np.uint8)
    if limit_hull:
        hull = cv2.convexHull(dst.astype(np.float32))
        cv2.fillConvexPoly(cover, np.rint(hull[:, 0]).astype(np.int32), 255)
    pixels = np.zeros_like(cover)
    for y in range(0, h, 128):
        stop = min(y + 128, h)
        yy, xx = np.mgrid[y:stop, 0:w]
        mapped = inverse(np.c_[xx.ravel(), yy.ravel()]).reshape(stop-y, w, 2).astype(np.float32)
        sx, sy = mapped.transpose(2, 0, 1)
        pixels[y:stop] = cv2.remap(scan, sx, sy, cv2.INTER_CUBIC)
        cover[y:stop][(sx < 35) | (sy < 35) | (sx >= scan.shape[1]-35) | (sy >= scan.shape[0]-35)] = 0
    cover[~mask] = 0
    pixels[cover == 0] = 0
    return pixels, cover, model


def refine(scan, ref, mask, src, dst, kind):
    rough, valid, _ = warp(scan, mask, src, dst, kind, limit_hull=False)
    def bandpass(a):
        a = a.astype(np.float32)
        return cv2.GaussianBlur(a, (0, 0), 1) - cv2.GaussianBlur(a, (0, 0), 6)
    image, reference = bandpass(rough), bandpass(ref)
    inverse, _ = fit(dst, src, kind)
    half, search = 21, 12
    pad = half + search + 1
    pairs = []
    for y in range(pad, ref.shape[0] - pad, 42):
        for x in range(pad, ref.shape[1] - pad, 42):
            if np.min(np.sum((dst - [x, y])**2, axis=1)) > (2300 / SCALE)**2:
                continue
            im = np.s_[y-half:y+half+1, x-half:x+half+1]
            window = np.s_[y-half-search:y+half+search+1, x-half-search:x+half+search+1]
            if not valid[im].all() or not mask[window].all() or image[im].std() < 3:
                continue
            response = cv2.matchTemplate(reference[window], image[im], cv2.TM_CCOEFF_NORMED)
            _, score, _, (u, v) = cv2.minMaxLoc(response)
            if score < .71 or not (0 < u < 2*search and 0 < v < 2*search):
                continue
            response[max(0, v-4):v+5, max(0, u-4):u+5] = -1
            if score - float(response.max()) >= .13 and np.hypot(u-search, v-search) <= 10:
                pairs.append([x, y, x+u-search, y+v-search])
    if not pairs:
        return src, dst, 0
    a = np.asarray(pairs, dtype=np.float64)
    return np.vstack([src, inverse(a[:, :2])]), np.vstack([dst, a[:, 2:]]), len(a)


def trials(src, dst):
    xy = np.floor(dst * SCALE / 2000).astype(int)
    groups = xy[:, 0] + 10000 * xy[:, 1]
    options = {k: audit(src, dst, groups, k) for k in ("projective", "quadratic")}
    return len(np.unique(groups)), options


def register(scan_path, ref, mask, features, reference_features, equalize, out, e, n, core):
    name = scan_path.stem.removesuffix("_r8")
    row = {"segment": name, "status": "insufficient matches", "reduced_sha256": digest(scan_path)}
    scan = cv2.imread(str(scan_path), cv2.IMREAD_GRAYSCALE)
    smask = np.zeros_like(scan)
    smask[35:-35, 35:-35] = 255
    skey, sdesc = features.detectAndCompute(equalize.apply(scan), smask)
    refkey, refdesc = reference_features
    if sdesc is None or len(sdesc) < 2:
        return row
    matcher = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=70))
    good = [a for pair in matcher.knnMatch(refdesc, sdesc, k=2) if len(pair) == 2
            for a, b in [pair] if a.distance < .80 * b.distance]
    row["descriptor_matches"] = len(good)
    if len(good) < 12:
        return row
    src = np.float64([skey[m.trainIdx].pt for m in good])
    dst = np.float64([refkey[m.queryIdx].pt for m in good])
    h, inlier = cv2.findHomography(src, dst, cv2.USAC_MAGSAC, 7., maxIters=15000)
    if h is None:
        return row
    src, dst = src[inlier.ravel() > 0], dst[inlier.ravel() > 0]
    _, take = np.unique(np.floor(dst * SCALE / 150).astype(int), axis=0, return_index=True)
    src, dst = src[take], dst[take]
    row["ties"] = len(src)
    if len(src) < 28:
        return row
    blocks, options = trials(src, dst)
    row.update(blocks=blocks, sparse_heldout_2km={k: v[0] for k, v in options.items()})
    viable = [(v[0]["rms_m"], k) for k, v in options.items() if v[0]]
    if blocks < 4 or not viable or min(viable)[0] > MAX_RMS:
        row["status"] = "relative registration gate failed"
        return row
    sparse_rms, best = min(viable)
    more_src, more_dst, added = refine(scan, ref, mask, src, dst, best)
    if added >= 12:
        new_blocks, dense = trials(more_src, more_dst)
        eligible = [(v[0]["rms_m"], k) for k, v in dense.items() if v[0]]
        if eligible and min(eligible)[0] <= min(MAX_RMS, sparse_rms + 5):
            _, best = min(eligible)
            options, src, dst = dense, more_src, more_dst
            row.update(ties=len(src), blocks=new_blocks, refinement_ties=added)
    pixels, cover, model = warp(scan, mask, src, dst, best)
    l, t, r, b = core
    tif = out / f"{name}.tif"
    with rasterio.open(tif, "w", driver="GTiff", width=ref.shape[1], height=ref.shape[0],
                       count=2, dtype="uint8", crs="EPSG:32650", transform=from_origin(e, n, SCALE, SCALE),
                       compress="deflate", tiled=True) as ds:
        ds.write(pixels, 1)
        ds.write(cover, 2)
        ds.colorinterp = (ColorInterp.gray, ColorInterp.alpha)
        ds.update_tags(date="1977-12-03", frame=name, registration="relative to KH-9 1980; not a survey", reuse="local only")
    with (out / f"{name}.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["scan_r8_x", "scan_r8_y", "target_e_m", "target_n_m", "heldout_residual_m"])
        for (x, y), (u, v), err in zip(src, dst, options[best][1]):
            writer.writerow([x, y, e + (u+.5)*SCALE, n - (v+.5)*SCALE, err])
    row.update(status="relative registration passes; visually review", model=best,
               core_valid_share=float(np.mean(cover[t:b, l:r] > 0)),
               heldout_2km={k: v[0] for k, v in options.items()}, tif_sha256=digest(tif),
               source_pixels_model_from_target_pixels=model)
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("frame", nargs="?", choices=ARCHIVES, default="A010")
    parser.add_argument("--intake", action="store_true")
    args = parser.parse_args()
    source = ROOT / "data/raw/sources" / (SOURCE_PREFIX + args.frame.lower())
    source.mkdir(parents=True, exist_ok=True)
    if args.intake:
        intake(args.frame, source)
    scans = sorted((source / "reduced").glob(f"{FRAME_PREFIX}{args.frame}_?_r8.tif"))
    if len(scans) != 4:
        parser.error(f"Expected four reduced segments in {source / 'reduced'}; run with --intake")
    slice_meta = json.loads((GRID / "kh9_1980.json").read_text(encoding="utf-8"))["slice"]
    x, y, r, b = slice_meta["cell_box"]
    px_per_cell = int(100 / SCALE)
    ref_path = GRID / slice_meta["file"]
    patch = cv2.imread(str(ref_path), cv2.IMREAD_UNCHANGED)
    if slice_meta["px_m"] != SCALE or patch is None or patch.shape != ((b-y)*px_per_cell, (r-x)*px_per_cell, 4):
        parser.error("Expected the 6.25 m RGBA September 1980 slice mosaic")
    ref, mask = patch[:, :, 0], patch[:, :, 3] == 255
    west, north = json.loads((GRID / "meta.json").read_text(encoding="utf-8"))["origin_top_left"]
    core = tuple((v - off)*px_per_cell for v, off in zip(CORE_BOX, (x, y, x, y)))
    cv2.setRNGSeed(77)
    cv2.setNumThreads(4)
    features = cv2.SIFT_create(26000, contrastThreshold=.018)
    equalize = cv2.createCLAHE(clipLimit=2, tileGridSize=(16, 16))
    reference_features = features.detectAndCompute(equalize.apply(ref), mask.astype(np.uint8)*255)
    out = source / "registered"
    out.mkdir(exist_ok=True)
    report = {"acquisition": "1977-12-03", "reference": "1980-09-11 KH-9; not independent survey",
              "reference_sha256": digest(ref_path), "gate_rms_m": MAX_RMS, "target_pixel_size_m": SCALE,
              "cell_box": slice_meta["cell_box"], "segments": []}
    archive_hash = source / "reduced/archive.sha256"
    if archive_hash.is_file():
        report["archive_sha256"] = archive_hash.read_text(encoding="ascii").strip()
    for path in scans:
        row = register(path, ref, mask, features, reference_features, equalize, out,
                       west + x*100, north - y*100, core)
        report["segments"].append(row)
        print(row["segment"], row["status"], row.get("heldout_2km", {}), flush=True)
    (out / "registration.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
