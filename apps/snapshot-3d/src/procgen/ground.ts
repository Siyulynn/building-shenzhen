// One basin ground surface that every generator samples. It is a regular lattice over the base-map
// window, snapped to DEM vertex lines so the atlas terrain can leave an exact hole for it. Heights are a
// smoothed modern-DSM proxy, blended back to the drawn DEM triangles at the edge (no seam) and carved
// under water. Nothing here is a historic level or grade.
import {ground, type Grid} from '../grid';
import {toWorld, type Basin} from './gis';

export interface ReliefPatch {
  format: string; crs: string; origin_center: number[]; spacing_m: number; width: number; height: number;
  scale_m: number; source: string; samples_i16le_b64: string;
}
export type HeightProxy = (x: number, z: number) => number | undefined;

/** Bilinear in the source raster, whose origin is a sample centre, not its edge. */
export function readRelief(p: ReliefPatch): HeightProxy {
  const {width: w, height: h, spacing_m: step, scale_m: scale} = p;
  if (p.format !== 'sz-core-relief-v1' || p.crs !== 'EPSG:32650' || step !== 30 || scale !== .01 ||
      w < 2 || h < 2 || !Number.isInteger(w) || !Number.isInteger(h) ||
      p.origin_center.length !== 2 || !p.origin_center.every(Number.isFinite)) throw Error('Invalid core relief patch');
  const raw = Uint8Array.from(atob(p.samples_i16le_b64), c => c.charCodeAt(0));
  if (raw.byteLength !== w * h * 2) throw Error('Invalid core relief sample count');
  const data = new DataView(raw.buffer), [x0,z0] = toWorld(p.origin_center);
  const at = (i: number, j: number) => data.getInt16(2 * (j*w+i), true) * scale;
  return (x,z) => {
    const c = (x-x0)/step, r = (z-z0)/step;
    if (c < 0 || r < 0 || c > w-1 || r > h-1) return undefined;
    const i = Math.min(w-2, Math.floor(c)), j = Math.min(h-2, Math.floor(r)), u = c-i, v = r-j;
    return (1-v)*((1-u)*at(i,j)+u*at(i+1,j)) + v*((1-u)*at(i,j+1)+u*at(i+1,j+1));
  };
}

export interface LatticeSamples {
  x0: number; z0: number; step: number; cols: number; rows: number; h: Float32Array;
  /** DEM cell edges of the hole the atlas terrain must leave: [c0, r0, c1, r1] vertex indices. */
  cells: [number, number, number, number];
}
export interface Lattice extends LatticeSamples {
  /** Height of the drawn lattice triangles (same diagonal as the terrain mesh); DEM outside. */
  at(x: number, z: number): number;
  inside(x: number, z: number): boolean;
}

export function lattice(g: Grid, b: Basin, step: number, smoothCells: number, blendM: number, relief?: HeightProxy): Lattice {
  const cell = g.meta.cell_m;
  const x0 = Math.floor(b.window[0] / cell) * cell, z0 = Math.floor(b.window[1] / cell) * cell;
  const x1 = Math.ceil(b.window[2] / cell) * cell, z1 = Math.ceil(b.window[3] / cell) * cell;
  if (cell % step) throw Error('Lattice step must divide the DEM cell');
  const cols = (x1 - x0) / step + 1, rows = (z1 - z0) / step + 1;
  const raw = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) raw[j * cols + i] = ground(g, x0 + i * step, z0 + j * step);
  // Two separable box passes approximate a Gaussian and remove the 100 m triangle facets.
  const a = raw.map((y,k) => relief?.(x0+(k%cols)*step,z0+Math.floor(k/cols)*step) ?? y);
  const tmp = new Float32Array(raw.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let s = 0, n = 0;
      for (let k = Math.max(0, i - smoothCells); k <= Math.min(cols - 1, i + smoothCells); k++) { s += a[j * cols + k]!; n++; }
      tmp[j * cols + i] = s / n;
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let s = 0, n = 0;
      for (let k = Math.max(0, j - smoothCells); k <= Math.min(rows - 1, j + smoothCells); k++) { s += tmp[k * cols + i]!; n++; }
      a[j * cols + i] = s / n;
    }
  }
  const h = new Float32Array(raw.length);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const edge = Math.min(i, j, cols - 1 - i, rows - 1 - j) * step;
    const t = Math.min(1, edge / blendM), w = t * t * (3 - 2 * t);
    h[j * cols + i] = raw[j * cols + i]! * (1 - w) + a[j * cols + i]! * w;
  }
  return sampleLattice(g, {x0, z0, step, cols, rows, h, cells: [x0 / cell, z0 / cell, x1 / cell, z1 / cell]});
}

export function sampleLattice(g:Grid, samples:LatticeSamples):Lattice {
  const {x0,z0,step,cols,rows,h}=samples;
  const x1=x0+(cols-1)*step,z1=z0+(rows-1)*step;
  const inside = (x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  const at = (x: number, z: number) => {
    if (!inside(x, z)) return ground(g, x, z);
    const c = Math.min(cols - 1, (x - x0) / step), r = Math.min(rows - 1, (z - z0) / step);
    const i = Math.min(cols - 2, Math.floor(c)), j = Math.min(rows - 2, Math.floor(r));
    const u = c - i, v = r - j, k = j * cols + i;
    if (u + v <= 1) return h[k]! * (1 - u - v) + h[k + 1]! * u + h[k + cols]! * v;
    return h[k + cols + 1]! * (u + v - 1) + h[k + cols]! * (1 - u) + h[k + 1]! * (1 - v);
  };
  return {...samples,at,inside};
}

/** Lower lattice vertices to `cap(x, z)` where it returns a number. Boundary vertices stay on the DEM. */
export function carve(l: Lattice, cap: (x: number, z: number) => number | undefined) {
  for (let j = 1; j < l.rows - 1; j++) for (let i = 1; i < l.cols - 1; i++) {
    const x = l.x0 + i * l.step, z = l.z0 + j * l.step, c = cap(x, z);
    if (c !== undefined) l.h[j * l.cols + i] = Math.min(l.h[j * l.cols + i]!, c);
  }
}
