// The whole procedural basin as plain records: deterministic for a seed, built before any masking so
// switching a mask off or on never reshuffles anything outside it.
import type {Grid} from '../grid';
import {contains, densify, nearest, principalAngle, segDist, type P} from './geom';
import {grainFor, inWindow, loadBasin, masksAt, type Basin, type GroundTint, type MaskDef, type RawMap} from './gis';
import {carve, lattice, type Lattice, type HeightProxy} from './ground';
import {network, ponds as pondLevels, rivers, type NetCfg, type Network, type Ribbon} from './network';
import {grove, plots, settlement, worksite, type SettlementOpts, type Building, type Env, type Piece, type Tree} from './fabric';

export interface GenCfg extends NetCfg {
  seed: string; lattice_m: number; smooth_radius_cells: number; edge_blend_m: number;
  settlement: {default: SettlementOpts['mix']; mix: Record<string, SettlementOpts['mix']>; parcel_m: number; lane_m: number; street_setback_m: number};
  rivers: NetCfg['rivers'] & {dyke_m?: number; dyke_height_m?: number; bank_setback_m?: number};
  reservoir?: {site: string; cell: [number, number]; search_cells: [number, number, number, number]};
  masks: MaskDef[];
}
export interface Pond {id: string; parent: string; ring: P[]; level: number}
export interface Reservoir {site: string; level: number; quads: [number, number, number, number][]; cells: number}
export interface BasinPlan {
  basin: Basin; lattice: Lattice; net: Network; ponds: Pond[]; banks: Ribbon[]; dykes: Ribbon[]; reservoir?: Reservoir;
  groundTints?:GroundTint[];
  buildings: Building[]; trees: Tree[]; pieces: Piece[];
}
export type BasinRenderPlan=Omit<BasinPlan,'net'>&{net:Pick<Network,'ribbons'|'tracks'|'rivers'|'bridges'>};

/** Shared land/water grade for procedural batches and authored patches. */
export function basinGround(g: Grid, raw: RawMap, cfg: GenCfg, relief?: HeightProxy) {
  const b = loadBasin(raw, cfg.masks);
  const l = lattice(g, b, cfg.lattice_m, cfg.smooth_radius_cells, cfg.edge_blend_m, relief);
  const dyke = cfg.rivers.dyke_m ?? 4, dykeH = cfg.rivers.dyke_height_m ?? 1.4, setback = cfg.rivers.bank_setback_m ?? 6;
  const rs = rivers(b, l, cfg);
  const pd = pondLevels(b, l).map(p => ({id: p.id, parent: p.parent, ring: p.poly.rings[0]!, level: p.level, poly: p.poly}));
  // Carve water into the lattice: channel bed below the surface, banks no higher than a short ramp.
  const best = new Map<number, number>();
  for (const r of rs) r.points.forEach(([x, z], i) => {
    const half = r.widths[i]!, reach = half + dyke + 22, lv = r.level[i]!;
    for (let jz = Math.ceil((z - reach - l.z0) / l.step); jz <= Math.floor((z + reach - l.z0) / l.step); jz++)
      for (let ix = Math.ceil((x - reach - l.x0) / l.step); ix <= Math.floor((x + reach - l.x0) / l.step); ix++) {
        if (ix < 1 || jz < 1 || ix >= l.cols - 1 || jz >= l.rows - 1) continue;
        const d = Math.hypot(l.x0 + ix * l.step - x, l.z0 + jz * l.step - z);
        if (d > reach) continue;
        const cap = d < half + 2 ? lv - 1.4 : lv + 0.2 + Math.max(0, d - half - 2) / 22 * 2.2;
        const k = jz * l.cols + ix;
        best.set(k, Math.min(best.get(k) ?? Infinity, cap));
      }
  });
  for (const p of pd) {
    const [x0, z0, x1, z1] = p.poly.box, edge = densify([...p.ring, p.ring[0]!], 5);
    for (let jz = Math.ceil((z0 - 22 - l.z0) / l.step); jz <= Math.floor((z1 + 22 - l.z0) / l.step); jz++)
      for (let ix = Math.ceil((x0 - 22 - l.x0) / l.step); ix <= Math.floor((x1 + 22 - l.x0) / l.step); ix++) {
        if (ix < 1 || jz < 1 || ix >= l.cols - 1 || jz >= l.rows - 1) continue;
        const x = l.x0 + ix * l.step, z = l.z0 + jz * l.step, k = jz * l.cols + ix;
        let cap: number | undefined;
        if (contains(p.poly, x, z)) cap = p.level - 1;
        else if (edge.some(e => Math.hypot(e[0] - x, e[1] - z) < 21)) cap = p.level + 0.35;
        if (cap !== undefined) best.set(k, Math.min(best.get(k) ?? Infinity, cap));
      }
  }
  carve(l, (x, z) => best.get(Math.round((z - l.z0) / l.step) * l.cols + Math.round((x - l.x0) / l.step)));
  return {b,l,rs,pd};
}

export function basinNetwork({b,l,rs,pd}:ReturnType<typeof basinGround>,cfg:GenCfg){
  const dyke=cfg.rivers.dyke_m??4, setback=cfg.rivers.bank_setback_m??6;
  const net = network(b, l, cfg, rs);
  for (const r of rs) for (let i=1; i<r.points.length; i++)
    net.water.add([r.points[i-1]!,r.points[i]!],Math.max(r.widths[i-1]!,r.widths[i]!)+dyke+setback,'river:'+r.id);
  for (const p of pd) net.water.add([...p.ring, p.ring[0]!], 6, 'pond:' + p.id);
  return net;
}

export function planBasin(g: Grid, raw: RawMap, cfg: GenCfg, relief?: HeightProxy): BasinPlan {
  const base=basinGround(g,raw,cfg,relief), {b,l,rs,pd}=base;
  const dyke=cfg.rivers.dyke_m??4, dykeH=cfg.rivers.dyke_height_m??1.4;
  const net=basinNetwork(base,cfg);

  const env: Env = {
    height: l.at,
    blocked: (x, z) => !inWindow(b, x, z, 2) || !!net.corridors.hit(x, z, cfg.settlement.street_setback_m) || !!net.water.hit(x, z),
    masks: (x, z, what) => masksAt(b, x, z, what),
  };
  const buildings: Building[] = [], trees: Tree[] = [], pieces: Piece[] = [];
  const roadLines = Object.keys(cfg.roads).map(id => b.lines.get(id)!.points);
  const streetAngle = (ring: P[]): number | undefined => {
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    let bestD = 160, ang: number | undefined;
    for (const line of roadLines) for (let i = 1; i < line.length; i++) {
      const d = segDist(cx, cz, line[i - 1]!, line[i]!);
      if (d < bestD) { bestD = d; ang = Math.atan2(line[i]![1] - line[i - 1]![1], line[i]![0] - line[i - 1]![0]); }
    }
    return ang;
  };
  for (const a of b.cover) {
    const ring = a.poly.rings[0]!, [cx, cz] = ring[0]!;
    const own = principalAngle(ring);
    switch (a.kind) {
      case 'settlement': {
        const mix = cfg.settlement.mix[a.parent] ?? cfg.settlement.default;
        const s = settlement(a, streetAngle(ring) ?? grainFor(b, a.parent, cx, cz) ?? own,
          {parcel: cfg.settlement.parcel_m, lane: cfg.settlement.lane_m, mix}, env, cfg.seed);
        buildings.push(...s.buildings); trees.push(...s.trees);
        trees.push(...grove(a, 22, 0.08, {banyan: 1, lychee: 2, bamboo: 1.5}, env, cfg.seed));
        break;
      }
      case 'worksite': {
        const w = worksite(a, streetAngle(ring) ?? own, env, cfg.seed);
        pieces.push(...w.pieces); buildings.push(...w.buildings);
        break;
      }
      case 'field':
        pieces.push(...plots(a, grainFor(b, a.parent, cx, cz) ?? own, {kind: 'field', strip: 22, plot: 44, ditchEvery: 5}, env, cfg.seed));
        trees.push(...grove(a, 26, 0.05, {lychee: 2, bamboo: 1.2, banyan: 0.3}, env, cfg.seed));
        break;
      case 'pond_complex':
        pieces.push(...plots(a, grainFor(b, a.parent, cx, cz) ?? own, {kind: 'ponds', strip: 32, plot: 38, ditchEvery: 0}, env, cfg.seed));
        trees.push(...grove(a, 24, 0.05, {lychee: 2, bamboo: 1, banyan: 0.4}, env, cfg.seed));
        break;
      case 'upland_cover':
        trees.push(...grove(a, 11, 0.9, {pine: 5, scrub: 4, lychee: 1.4, banyan: 0.3}, env, cfg.seed));
        break;
      case 'open_ground':
        trees.push(...grove(a, 18, 0.25, {banyan: 1, lychee: 2, scrub: 2}, env, cfg.seed));
        break;
      default: break; // unknown, water, river_margin, transport_land: neutral ground, nothing generated
    }
  }
  // Pond embankments straddle the traced edge; river dykes run along both banks.
  const banks: Ribbon[] = pd.map(p => {
    const pts = densify([...p.ring, p.ring[0]!], 6);
    return {id: p.id + '/bank', cls: 'bank', points: pts, ys: pts.map(([x, z]) => Math.max(p.level + 0.7, l.at(x, z) + 0.12)),
      half: 4.5, skirt: pts.map(() => true), masked: pts.map(() => [])};
  });
  const dykes: Ribbon[] = [];
  for (const r of rs) for (const side of [-1, 1]) {
    const pts = r.points.map(([x, z], i) => {
      const a = r.points[Math.max(0, i - 1)]!, c = r.points[Math.min(r.points.length - 1, i + 1)]!;
      const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz) || 1, o = side * (r.widths[i]! + dyke / 2);
      return [x - dz / len * o, z + dx / len * o] as P;
    });
    const ys = pts.map(([x, z], i) => Math.max(r.level[i]! + dykeH, l.at(x, z) + 0.15));
    // Dykes stop at bridges, and at junctions where they would run into another river's channel.
    const open = pts.map(([x, z]) => inWindow(b, x, z, 1)
      && net.bridges.every(br => Math.hypot(br.at[0] - x, br.at[1] - z) > br.span / 2 + 6)
      && rs.every(q => q === r || nearest(q.points, x, z).d > q.half + dyke + 2));
    let run: number[] = [];
    const flush = () => {
      if (run.length > 1) dykes.push({id: `${r.id}/dyke${side}/${dykes.length}`, cls: 'dyke', points: run.map(i => pts[i]!),
        ys: run.map(i => ys[i]!), half: dyke / 2, skirt: run.map(() => true), masked: run.map(() => [])});
      run = [];
    };
    open.forEach((o, i) => { if (o) run.push(i); else flush(); });
    flush();
  }
  return {basin: b, lattice: l, net, ponds: pd, banks, dykes, buildings, trees, pieces,
    reservoir: cfg.reservoir ? reservoir(g, cfg.reservoir) : undefined};
}

/** Reservoir outline from the October 1979 MSS water mask: the connected blob at the site cell, resampled at 25 m. */
export function reservoir(g: Grid, c: NonNullable<GenCfg['reservoir']>): Reservoir | undefined {
  const {width} = g.meta, cell = g.meta.cell_m, [c0, r0, c1, r1] = c.search_cells;
  const water = (i: number, j: number) => g.water79[j * width + i] === 1;
  if (!water(c.cell[0], c.cell[1])) return undefined;
  const blob = new Set<number>(), stack = [c.cell];
  while (stack.length) {
    const [i, j] = stack.pop()!, k = j * width + i;
    if (i < c0 || i > c1 || j < r0 || j > r1 || blob.has(k) || !water(i, j)) continue;
    blob.add(k);
    stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
  }
  const elev = [...blob].map(k => g.elevation[k]!).sort((a, b) => a - b);
  const level = elev[Math.floor(elev.length / 2)]! + 0.5;
  const v = (x: number, z: number) => {
    const fi = x / cell, fj = z / cell, i = Math.floor(fi), j = Math.floor(fj), u = fi - i, w = fj - j;
    const m = (a: number, b: number) => blob.has(b * width + a) ? 1 : 0;
    return (m(i, j) * (1 - u) + m(i + 1, j) * u) * (1 - w) + (m(i, j + 1) * (1 - u) + m(i + 1, j + 1) * u) * w;
  };
  const quads: Reservoir['quads'] = [], s = 25;
  for (let z = r0 * cell; z < r1 * cell; z += s) {
    let start: number | undefined;
    for (let x = c0 * cell; x <= c1 * cell; x += s) {
      const inside = x < c1 * cell && v(x + s / 2, z + s / 2) >= 0.5;
      if (inside && start === undefined) start = x;
      if (!inside && start !== undefined) { quads.push([start, z, x, z + s]); start = undefined; }
    }
  }
  return {site: c.site, level, quads, cells: blob.size};
}
