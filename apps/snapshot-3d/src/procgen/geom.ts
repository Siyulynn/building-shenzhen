// Plane geometry in atlas world metres (x east, z south). No three.js, so generators stay headless.
export type P = [number, number];
export type Ring = P[];
export interface Poly { rings: Ring[]; box: [number, number, number, number] }

export function bbox(points: P[]): [number, number, number, number] {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, z] of points) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
  return [a, b, c, d];
}
export const poly = (rings: Ring[]): Poly => ({rings, box: bbox(rings[0]!)});

function inRing(ring: Ring, x: number, z: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i]!, [xj, zj] = ring[j]!;
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// Outer ring minus holes.
export function contains(p: Poly, x: number, z: number) {
  const [a, b, c, d] = p.box;
  if (x < a || x > c || z < b || z > d) return false;
  if (!inRing(p.rings[0]!, x, z)) return false;
  for (let k = 1; k < p.rings.length; k++) if (inRing(p.rings[k]!, x, z)) return false;
  return true;
}
export function ringArea(ring: Ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  return s / 2;
}
export function area(p: Poly) {
  return Math.abs(ringArea(p.rings[0]!)) - p.rings.slice(1).reduce((s, r) => s + Math.abs(ringArea(r)), 0);
}

export function segDist(x: number, z: number, a: P, b: P) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

/** Intersection of two non-parallel segments, including shared endpoints. */
export function segmentMeeting(a:P,b:P,c:P,d:P):P|undefined {
  const ux=b[0]-a[0], uz=b[1]-a[1], vx=d[0]-c[0], vz=d[1]-c[1];
  const cross=ux*vz-uz*vx;
  if(Math.abs(cross)<1e-8)return;
  const dx=c[0]-a[0], dz=c[1]-a[1];
  const t=(dx*vz-dz*vx)/cross, s=(dx*uz-dz*ux)/cross;
  if(t>=-1e-8&&t<=1+1e-8&&s>=-1e-8&&s<=1+1e-8)return [a[0]+t*ux,a[1]+t*uz];
}
/** Distance to a polyline plus the chainage of the nearest point. */
export function nearest(line: P[], x: number, z: number) {
  let best = Infinity, at = 0, run = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (l * l))) : 0;
    const d = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
    if (d < best) { best = d; at = run + t * l; }
    run += l;
  }
  return {d: best, s: at};
}
export function length(line: P[]) {
  let s = 0;
  for (let i = 1; i < line.length; i++) s += Math.hypot(line[i]![0] - line[i - 1]![0], line[i]![1] - line[i - 1]![1]);
  return s;
}
/** Resample at roughly `step` metres, keeping every original vertex. */
export function densify(line: P[], step: number): P[] {
  const out: P[] = [line[0]!];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!, n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}
export function chainage(line: P[]) {
  const s = [0];
  for (let i = 1; i < line.length; i++) s.push(s[i - 1]! + Math.hypot(line[i]![0] - line[i - 1]![0], line[i]![1] - line[i - 1]![1]));
  return s;
}
/** Unit left-hand normal (x, z) at each vertex, averaged over the neighbouring segments. */
export function normals(line: P[]): P[] {
  return line.map((_, i) => {
    const a = line[Math.max(0, i - 1)]!, b = line[Math.min(line.length - 1, i + 1)]!;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  });
}
export function offset(line: P[], by: number): P[] {
  const n = normals(line);
  return line.map(([x, z], i) => [x + n[i]![0] * by, z + n[i]![1] * by]);
}
/** Split a polyline into the runs whose vertices pass `keep`. */
export function runs(line: P[], keep: (p: P) => boolean): P[][] {
  const out: P[][] = [];
  let cur: P[] = [];
  for (const p of line) {
    if (keep(p)) cur.push(p);
    else { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

export function hull(points: P[]): Ring {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P[] = [], upper: P[] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
/** Convex hull grown by `margin` metres (rounded corners, 12 samples per vertex). */
export function grownHull(points: P[], margin: number): Ring {
  const h = hull(points), out: P[] = [];
  for (const [x, z] of h) for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    out.push([x + Math.cos(a) * margin, z + Math.sin(a) * margin]);
  }
  return hull(out);
}

/** Principal direction (radians, from +x toward +z) of a ring's vertices. */
export function principalAngle(ring: Ring) {
  let mx = 0, mz = 0;
  for (const [x, z] of ring) { mx += x; mz += z; }
  mx /= ring.length; mz /= ring.length;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z] of ring) { sxx += (x - mx) ** 2; szz += (z - mz) ** 2; sxz += (x - mx) * (z - mz); }
  return 0.5 * Math.atan2(2 * sxz, sxx - szz);
}
