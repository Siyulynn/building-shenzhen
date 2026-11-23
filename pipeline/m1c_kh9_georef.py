"""M1c: georeference KH-9 Declass 3 segments onto the Spike A grid (UTM 50N), against the 1979 Landsat scene.

Spike-grade. The reference is Landsat 3 MSS (60 m pixels, about 27 m RMSE), so the best achievable registration
is a few tens of metres: fine for 100 m cells, not for tracing building footprints.

Usage: python -I pipeline/m1c_kh9_georef.py <source_id> <segment> [<source_id> <segment> ...]
  e.g. kh9_1980_09_11_a048 c

Per segment (reduced copy from pipeline/kh9_reduce.py, about 7.5 m pixels, "r8 pixels" below):
  1. Coarse fit: SIFT matches between the segment (at ~30 m) and Landsat B5 reflectance (30 m, UTM 50N),
     RANSAC similarity. A mirrored scan is tried too (it would need a flip).
  2. Refinement, two passes. The segment is warped into the reference frame with the current model and blurred
     to Landsat sharpness. On a lattice of land points, normalised cross-correlation finds the local offset.
       pass 1: +/- 1.5 km search, 1.5 km template, land in 1979 and now, slope <= 10 deg -> order-2 polynomial
       pass 2: +/- 300 m search, 1 km template, low (<= 60 m) flat (<= 5 deg) land       -> order-3 polynomial
     Matching is on band-passed (difference-of-Gaussian) images against Landsat green + red; peaks below NCC 0.6,
     or on the search edge, are dropped. Fits use iterative 3-sigma rejection.
  3. Accuracy on held-out points (5-fold), never in-sample.
Outputs:
  data/evidence/observations/kh9/<source_id>_<segment>_gcps.csv   control points (lead observations, protocol §5.5)
  data/raw/sources/<source_id>/reduced/<segment>_georef.json        model (r8 pixels <-> UTM 50N) and accuracy
"""
import csv
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slice_areas import GRID, ROOT, load_grid  # noqa: E402

REF_CELL = 30.0
L79 = ROOT / "data/raw/sources/landsat_1979_10_19/extracted"
OBS = ROOT / "data/evidence/observations/kh9"


def reference(g):
    """Landsat 1979 at 30 m over the grid extent, UTM 50N: red (B5) for SIFT, green + red (B4 + B5, closest to the
    KH-9 panchromatic film behind its yellow filter) for correlation; plus point-selection masks."""
    x0, y1 = g["meta"]["origin_top_left"]
    W, H = int(g["W"] * 100 / REF_CELL), int(g["H"] * 100 / REF_CELL)
    tr = from_origin(x0, y1, REF_CELL, REF_CELL)
    bands = {}
    for b in (4, 5):
        bands[b] = np.zeros((H, W), np.float32)
        with rasterio.open(next(L79.glob(f"*_B{b}.TIF"))) as s:
            reproject(rasterio.band(s, 1), bands[b], src_transform=s.transform, src_crs=s.crs, dst_transform=tr,
                      dst_crs="EPSG:32650", resampling=Resampling.bilinear, src_nodata=0, dst_nodata=0)
    red = bands[5]
    global GREEN_RED8
    GREEN_RED8 = to8(bands[4] + bands[5])
    ys = (np.arange(H) * REF_CELL / 100).astype(int).clip(0, g["H"] - 1)
    xs = (np.arange(W) * REF_CELL / 100).astype(int).clip(0, g["W"] - 1)
    elev = g["elev"].astype(float)
    gy, gx = np.gradient(elev, 100)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))[np.ix_(ys, xs)]
    water79 = np.fromfile(GRID / "water1979.bin", np.uint8).reshape(g["H"], g["W"])[np.ix_(ys, xs)]
    land = (water79 == 0) & (g["water"][np.ix_(ys, xs)] == 0)
    masks = {1: land & (slope <= 10), 2: land & (slope <= 5) & (elev[np.ix_(ys, xs)] <= 60)}
    return to8(red), tr, masks


def to8(a, valid=None):
    v = a[valid] if valid is not None else a[a > 0]
    lo, hi = np.percentile(v, [1, 99])
    b = np.clip((a - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(b)


def coarse(seg8, ref8):
    """Similarity fit seg (~30 m px) -> ref (30 m px). The scans are not mirrored and are turned about 0 or 180
    degrees at about unit scale, so each SIFT match votes for a translation under each candidate rotation and
    scale; the peak's matches give the fit. Robust with a few dozen good matches among many bad ones."""
    sift = cv2.SIFT_create(nfeatures=20000, contrastThreshold=0.01)
    k2, d2 = sift.detectAndCompute(ref8, None)
    k1, d1 = sift.detectAndCompute(seg8, None)
    m = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [a for a, b in m if a.distance < 0.9 * b.distance]
    p1 = np.float32([k1[a.queryIdx].pt for a in good])
    p2 = np.float32([k2[a.trainIdx].pt for a in good])
    best = None
    for ang in np.arange(-12, 12.1, 1.5).tolist() + np.arange(168, 192.1, 1.5).tolist():
        for sc in (0.92, 0.97, 1.02, 1.07):
            c, s_ = np.cos(np.radians(ang)) * sc, np.sin(np.radians(ang)) * sc
            q = np.stack([c * p1[:, 0] - s_ * p1[:, 1], s_ * p1[:, 0] + c * p1[:, 1]], 1)
            t = p2 - q
            h, xe, ye = np.histogram2d(t[:, 0], t[:, 1], bins=[np.arange(-6000, 6000, 15)] * 2)
            i, j = np.unravel_index(np.argmax(h), h.shape)
            if best is None or h[i, j] > best[0]:
                best = (h[i, j], ang, sc, (xe[i] + 7.5, ye[j] + 7.5), t)
    votes, ang, sc, (tx, ty), t = best
    sel = np.hypot(t[:, 0] - tx, t[:, 1] - ty) < 40
    if sel.sum() < 6:
        return None
    A, inl = cv2.estimateAffinePartial2D(p1[sel], p2[sel], method=cv2.RANSAC, ransacReprojThreshold=5)
    if A is None:
        return None
    return A, int(inl.sum()), False, int(sel.sum())


def tile_matches(seg8, ref8, A0, cols=5, rows=3):
    """Panoramic scans stretch along the scan, so fit each tile of the segment on its own: SIFT matches vote for
    a translation under rotations and scales near the global fit A0. Returns pooled inlier pairs (seg px, ref px)."""
    sift = cv2.SIFT_create(nfeatures=40000, contrastThreshold=0.01)
    k2, d2 = sift.detectAndCompute(ref8, None)
    k1, d1 = sift.detectAndCompute(seg8, None)
    m = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [a for a, b in m if a.distance < 0.92 * b.distance]
    p1 = np.float32([k1[a.queryIdx].pt for a in good])
    p2 = np.float32([k2[a.trainIdx].pt for a in good])
    ang0 = np.degrees(np.arctan2(A0[1, 0], A0[0, 0]))
    H, W = seg8.shape
    pairs = []
    for r in range(rows):
        for c in range(cols):
            inside = (p1[:, 0] >= c * W / cols) & (p1[:, 0] < (c + 1) * W / cols) & \
                     (p1[:, 1] >= r * H / rows) & (p1[:, 1] < (r + 1) * H / rows)
            if inside.sum() < 10:
                continue
            q1, q2 = p1[inside], p2[inside]
            best = None
            for ang in np.arange(ang0 - 6, ang0 + 6.1, 1.0):
                for sc in np.arange(0.8, 1.5, 0.04):
                    co, si = np.cos(np.radians(ang)) * sc, np.sin(np.radians(ang)) * sc
                    t = q2 - np.stack([co * q1[:, 0] - si * q1[:, 1], si * q1[:, 0] + co * q1[:, 1]], 1)
                    h, xe, ye = np.histogram2d(t[:, 0], t[:, 1], bins=[np.arange(-6000, 6000, 12)] * 2)
                    i, j = np.unravel_index(np.argmax(h), h.shape)
                    if best is None or h[i, j] > best[0]:
                        best = (h[i, j], t, xe[i] + 6, ye[j] + 6)
            votes, t, tx, ty = best
            sel = np.hypot(t[:, 0] - tx, t[:, 1] - ty) < 15
            if sel.sum() < 6:
                continue
            A, inl = cv2.estimateAffine2D(q1[sel], q2[sel], method=cv2.RANSAC, ransacReprojThreshold=3)
            if A is None or inl.sum() < 6:
                continue
            ok = inl.ravel().astype(bool)
            pairs.append(np.c_[q1[sel][ok], q2[sel][ok]])
    return np.vstack(pairs) if pairs else np.zeros((0, 4))


def poly_terms(x, y, order):
    return np.stack([x ** i * y ** j for i in range(order + 1) for j in range(order + 1 - i)], axis=1)


class Poly:
    """Least-squares polynomial map with normalised inputs."""

    def __init__(self, src, dst, order=3):
        self.mu, self.sd, self.order = src.mean(0), src.std(0), order
        self.c, *_ = np.linalg.lstsq(poly_terms(*((src - self.mu) / self.sd).T, order), dst, rcond=None)

    def __call__(self, p):
        return poly_terms(*((p - self.mu) / self.sd).T, self.order) @ self.c

    def to_json(self):
        return {"order": self.order, "mu": self.mu.tolist(), "sd": self.sd.tolist(), "coef": self.c.tolist()}

    @staticmethod
    def from_json(d):
        p = Poly.__new__(Poly)
        p.mu, p.sd, p.order, p.c = np.array(d["mu"]), np.array(d["sd"]), d["order"], np.array(d["coef"])
        return p


def robust_fit(src, dst, order, k=3.0, floor=15.0):
    keep = np.ones(len(src), bool)
    for _ in range(8):
        f = Poly(src[keep], dst[keep], order)
        r = np.hypot(*(f(src) - dst).T)
        new = r <= max(k * np.median(r[keep]) * 1.4826, floor)
        if (new == keep).all():
            break
        keep = new
    return Poly(src[keep], dst[keep], order), keep


def heldout(src, dst, order, folds=5, seed=0):
    idx = np.random.default_rng(seed).permutation(len(src))
    res = []
    for f in range(folds):
        test = idx[f::folds]
        model, _ = robust_fit(src[np.setdiff1d(idx, test)], dst[np.setdiff1d(idx, test)], order)
        res.append(np.hypot(*(model(src[test]) - dst[test]).T))
    r = np.concatenate(res)
    return {"rmse_m": round(float(np.sqrt(np.mean(r ** 2))), 1), "median_m": round(float(np.median(r)), 1),
            "p90_m": round(float(np.percentile(r, 90)), 1), "points": int(len(r)), "folds": folds}


def warp_to_ref(img8, ref_to_seg, shape):
    """Resample the segment (r8 pixels) into the reference grid, given a map ref px -> r8 px."""
    H, W = shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    pts = ref_to_seg(np.stack([xx.ravel(), yy.ravel()], 1)).astype(np.float32)
    mx, my = pts[:, 0].reshape(H, W), pts[:, 1].reshape(H, W)
    # area-average to 30 m first (r8 pixels are ~7.5 m)
    return cv2.remap(img8, mx, my, cv2.INTER_LINEAR, borderValue=0), \
        cv2.remap(np.full_like(img8, 255), mx, my, cv2.INTER_NEAREST, borderValue=0)


def dog(a):
    """Band-pass (difference of Gaussians): keeps edges and texture, drops illumination and film-density trends."""
    a = a.astype(np.float32)
    return cv2.normalize(cv2.GaussianBlur(a, (0, 0), 1.0) - cv2.GaussianBlur(a, (0, 0), 6), None, 0, 255,
                         cv2.NORM_MINMAX).astype(np.uint8)


NCC_MIN = 0.6


def match_pass(seg8, ref8, tr, ref_to_seg, mask, half, search, step):
    small = cv2.resize(seg8, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)  # ~30 m

    def r2s_small(p):
        return ref_to_seg(p) / 4.0

    raw = GREEN_RED8
    warped, cover = warp_to_ref(small, r2s_small, raw.shape)
    warped = cv2.GaussianBlur(warped, (0, 0), 1.2)  # Landsat MSS sharpness
    wdog, rdog = dog(warped), dog(raw)
    out = []
    H, W = raw.shape
    for ry in range(half + search, H - half - search, step):
        for rx in range(half + search, W - half - search, step):
            if not mask[ry, rx]:
                continue
            sl = np.s_[ry - half: ry + half + 1, rx - half: rx + half + 1]
            if (cover[sl] == 0).any() or warped[sl].std() < 6:
                continue
            ws = np.s_[ry - half - search: ry + half + search + 1, rx - half - search: rx + half + search + 1]
            if (raw[ws] == 0).mean() > 0.02:
                continue
            res = cv2.matchTemplate(rdog[ws], wdog[sl], cv2.TM_CCOEFF_NORMED)
            _, mx, _, loc = cv2.minMaxLoc(res)
            if mx < NCC_MIN or loc[0] in (0, 2 * search) or loc[1] in (0, 2 * search):
                continue
            seg_px = ref_to_seg(np.array([[rx, ry]], float))[0]          # r8 pixels
            E = tr.c + (rx + loc[0] - search + 0.5) * REF_CELL
            N = tr.f - (ry + loc[1] - search + 0.5) * REF_CELL
            out.append((seg_px[0], seg_px[1], E, N, mx))
    return np.array(out)


def run(sid, seg, g, ref8, tr, masks):
    src_path = next((ROOT / "data/raw/sources" / sid / "reduced").glob(f"*_{seg}_r8.tif"))
    with rasterio.open(src_path) as s:
        full = s.read(1)
    seg8 = to8(full.astype(np.float32), full > 8)
    seg8[:, :40] = 0; seg8[:, -40:] = 0; seg8[:60, :] = 0; seg8[-60:, :] = 0   # film border and data block

    small = cv2.resize(seg8, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    best = coarse(small, ref8)
    if best is None or best[1] < 8:
        print(sid, seg, "coarse fit failed", best and best[1:])
        return None
    A, n_in, flip, n_match = best
    print(sid, seg, f"coarse: {n_in}/{n_match} inliers, mirrored={flip}, "
                    f"scale={np.sqrt(abs(np.linalg.det(A[:, :2]))):.3f}, angle={np.degrees(np.arctan2(A[1, 0], A[0, 0])):.1f}")
    Ws = small.shape[1]
    T = np.vstack([A, [0, 0, 1]]) @ (np.array([[-1, 0, Ws - 1], [0, 1, 0], [0, 0, 1]]) if flip else np.eye(3)) \
        @ np.diag([0.25, 0.25, 1])                       # r8 px -> ref px
    Ti = np.linalg.inv(T)

    def utm_to_ref(p):
        return np.stack([(p[:, 0] - tr.c) / REF_CELL - 0.5, (tr.f - p[:, 1]) / REF_CELL - 0.5], 1)

    # tile-wise SIFT: pooled pairs -> order-2 polynomial (ref px -> r8 px) as the starting model
    tp = tile_matches(small, ref8, A)
    if len(tp) < 20:
        print(sid, seg, f"tile matching: only {len(tp)} pairs")
        return None
    seg_r8 = tp[:, :2] * 4.0
    m0, k0 = robust_fit(tp[:, 2:4], seg_r8, 2, floor=4 * 4)
    print(sid, seg, f"tile matching: {len(tp)} pairs, kept {k0.sum()}")
    ref_to_seg = m0
    passes = [(1, dict(half=20, search=20, step=12), 2), (2, dict(half=16, search=8, step=8), 3)]
    for mk, kw, order in passes:
        pts = match_pass(seg8, ref8, tr, ref_to_seg, masks[mk], **kw)
        if len(pts) < 25:
            print(sid, seg, f"pass {mk}: only {len(pts)} points")
            return None
        src, dst = pts[:, :2], pts[:, 2:4]
        fwd, keep = robust_fit(src, dst, order, floor=20)
        inv, _ = robust_fit(dst[keep], src[keep], order)
        print(sid, seg, f"pass {mk}: {len(pts)} points, kept {keep.sum()}")
        ref_to_seg = (lambda inv_: (lambda p: inv_(np.stack([tr.c + (p[:, 0] + 0.5) * REF_CELL,
                                                             tr.f - (p[:, 1] + 0.5) * REF_CELL], 1))))(inv)

    acc = {o: heldout(src[keep], dst[keep], o) for o in (1, 2, 3)}
    print(sid, seg, "held-out:", {o: a["rmse_m"] for o, a in acc.items()}, "chosen order 3:", acc[3])
    OBS.mkdir(parents=True, exist_ok=True)
    with open(OBS / f"{sid}_{seg}_gcps.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["scan_x_full_px", "scan_y_full_px", "utm50_e", "utm50_n", "ncc", "kept"])
        for row, k in zip(pts, keep):
            w.writerow([f"{row[0] * 8:.0f}", f"{row[1] * 8:.0f}", f"{row[2]:.1f}", f"{row[3]:.1f}", f"{row[4]:.3f}", int(k)])
    # footprint of the segment's image area on the grid, for coverage checks
    Hs, Wsr = seg8.shape
    corners = fwd(np.array([[40, 60], [Wsr - 40, 60], [Wsr - 40, Hs - 60], [40, Hs - 60]], float))
    meta = {
        "source": sid, "segment": seg, "reduced_file": src_path.name, "reduced_factor": 8,
        "reference": "landsat_1979_10_19 band 5 at 30 m, UTM 50N (EPSG:32650)",
        "coarse": {"inliers": n_in, "matches": n_match, "mirrored": flip},
        "control_points": int(len(pts)), "kept": int(keep.sum()), "heldout_by_order": acc,
        "forward": fwd.to_json(), "inverse": inv.to_json(), "footprint_utm": corners.round(0).tolist(),
        "status": "lead", "method": "SIFT coarse fit, two NCC passes on land, order-3 polynomial",
    }
    (src_path.parent / f"{seg}_georef.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return meta


def main():
    args = sys.argv[1:]
    g = load_grid()
    ref8, tr, masks = reference(g)
    for sid, seg in zip(args[::2], args[1::2]):
        run(sid, seg, g, ref8, tr, masks)


if __name__ == "__main__":
    main()
