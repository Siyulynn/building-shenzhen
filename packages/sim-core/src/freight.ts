/**
 * R8d (phase1-slice.md §5.12): road tiers and freight through the gateways. One bottleneck, no traffic sim: each
 * month, one widest-path (maximin) search per gateway from its yard over the road cells, weighted by class capacity;
 * each area's flow is the lower of its demand, its path's weakest cell and its pro-rata share of the gateway.
 * Everything here is recomputed from state and content, never stored.
 */
import { ROAD_CLASSES, type FreightParams, type RoadClass, type RoadClassParams, type SliceParams } from './params.js';
import { largestRemainder } from './round.js';
import type { StartNetwork, StartSite } from './sites.js';
import type { AreasContent, Firm, GameState, LocalizedString } from './state.js';

export const FACES = ['hong_kong', 'mainland'] as const;
export type Face = (typeof FACES)[number];
export type FreightMode = 'rail' | 'road';
export type Direction = 'in' | 'out';

/** One record of content/slice/gateways.yaml, compiled. */
export interface Gateway {
  id: string; name: LocalizedString; site: string; cell: number;
  faces: Face; mode: FreightMode; capacity: Record<Direction, number>;
  claims: readonly { id: string; use: string }[];
}
/** What the freight pass reads: the gateways, the start network, and the params. */
export interface FreightContent {
  gateways: readonly Gateway[]; network: StartNetwork; freight: FreightParams; classes: Record<RoadClass, RoadClassParams>;
}

/** The freight content when everything it needs is present (§5.12); otherwise freight never limits anything. */
export function freightContent(p: SliceParams, network?: StartNetwork, gateways?: readonly Gateway[]): FreightContent | undefined {
  return p.freight && p.works?.roads && network && gateways?.length
    ? { gateways, network, freight: p.freight, classes: p.works.roads.classes } : undefined;
}

/** Compile gateways.yaml: each gateway's cell comes from its site's placement or its start route's end, never typed. */
export function compileGateways(raw: unknown, sites: readonly StartSite[], network: StartNetwork, areas: AreasContent): Gateway[] {
  if (!Array.isArray(raw)) throw new Error('gateways: expected a list');
  const W = areas.grid.width, seen = new Set<string>(), pairs = new Set<string>();
  return raw.map((r: Record<string, any>, i): Gateway => {
    const id = r?.id;
    if (typeof id !== 'string' || !id.startsWith('gateway.') || seen.has(id)) throw new Error(`gateways[${i}]: bad or duplicate id`);
    seen.add(id);
    if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${id}: name needs zh and en`);
    if (!(FACES as readonly string[]).includes(r.faces)) throw new Error(`${id}: faces must be ${FACES.join(' or ')}`);
    if (r.mode !== 'rail' && r.mode !== 'road') throw new Error(`${id}: mode must be rail or road`);
    const pair = `${r.faces}:${r.mode}`;
    if (pairs.has(pair)) throw new Error(`${id}: a second ${r.mode} gateway facing ${r.faces}`);
    pairs.add(pair);
    const cap = r.capacity_t_month;
    for (const d of ['in', 'out'] as const) {
      if (!Number.isSafeInteger(cap?.[d]) || cap[d] < 0) throw new Error(`${id}: capacity_t_month.${d} must be a whole number >= 0`);
    }
    if (!Array.isArray(r.claims) || !r.claims.length || !r.claims.every((c: any) => typeof c?.id === 'string' && c.use === 'design_note')) {
      throw new Error(`${id}: every claim is cited as design_note (capacities are placeholders)`);
    }
    let cell: number;
    if (r.at === 'site') {
      const s = sites.find((x) => x.id === r.site);
      if (!s) throw new Error(`${id}: no placed site ${r.site}`);
      cell = s.cell[1] * W + s.cell[0];
    } else if (r.at?.route_end === 'first' || r.at?.route_end === 'last') {
      const route = network.routes.find((x) => x.id === r.site);
      if (!route) throw new Error(`${id}: no start route ${r.site}`);
      cell = r.at.route_end === 'first' ? route.cells[0]! : route.cells[route.cells.length - 1]!;
    } else throw new Error(`${id}: at must be site or { route_end: first | last }`);
    return { id, name: { zh: r.name.zh, en: r.name.en }, site: r.site, cell, faces: r.faces, mode: r.mode,
      capacity: { in: cap.in, out: cap.out }, claims: r.claims.map((c: any) => ({ id: c.id, use: c.use })) };
  });
}

// ---- road classes ----

/** Every road cell's class: the overrides, else its start route's class, else street (§5.12). */
export function roadClasses(s: GameState, network: StartNetwork): Map<number, RoadClass> {
  const out = new Map<number, RoadClass>();
  for (const r of network.routes) if (r.kind === 'road') for (const c of r.cells) out.set(c, r.class ?? 'street');
  for (const c of s.roads) if (!out.has(c)) out.set(c, 'street');
  if (s.roadClass) for (const k of ROAD_CLASSES) for (const c of s.roadClass[k]) if (out.has(c)) out.set(c, k);
  return out;
}

/** Record that `cell` is now of class `k` (only the override lists change). */
export function setRoadClass(s: GameState, cell: number, k: RoadClass): void {
  const rc = s.roadClass ?? (s.roadClass = { track: [], street: [], avenue: [] });
  for (const c of ROAD_CLASSES) rc[c] = rc[c].filter((x) => x !== cell);
  rc[k] = [...rc[k], cell].sort((a, b) => a - b);
}

// ---- the widest path ----

const neighbours = (c: number, w: number, h: number) => {
  const out: number[] = [], x = c % w;
  if (x > 0) out.push(c - 1);
  if (x + 1 < w) out.push(c + 1);
  if (c >= w) out.push(c - w);
  if (c < w * (h - 1)) out.push(c + w);
  return out;
};

/** A max-heap of [width, cell]: widest first, then the lower cell, so the search is deterministic. */
class Heap {
  private a: [number, number][] = [];
  get size() { return this.a.length; }
  private above = (i: number, j: number) => this.a[i]![0] > this.a[j]![0] || (this.a[i]![0] === this.a[j]![0] && this.a[i]![1] < this.a[j]![1]);
  private swap(i: number, j: number) { const t = this.a[i]!; this.a[i] = this.a[j]!; this.a[j] = t; }
  push(x: [number, number]) {
    this.a.push(x);
    for (let i = this.a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!this.above(i, p)) break; this.swap(i, p); i = p; }
  }
  pop(): [number, number] {
    const top = this.a[0]!, last = this.a.pop()!;
    if (this.a.length) {
      this.a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.above(l, m)) m = l;
        if (r < this.a.length && this.above(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
}

/**
 * Widest paths from `sources` over the cells of `cap` (4-connected): each reached cell's width is the largest, over
 * paths from a source, of the path's weakest cell; `via` is the weakest cell on that path.
 */
export function widestPaths(width: number, height: number, cap: ReadonlyMap<number, number>, sources: Iterable<number>):
  { width: Map<number, number>; via: Map<number, number> } {
  const best = new Map<number, number>(), via = new Map<number, number>(), heap = new Heap(), done = new Set<number>();
  for (const c of [...sources].sort((a, b) => a - b)) {
    const k = cap.get(c);
    if (k === undefined || best.has(c)) continue;
    best.set(c, k); via.set(c, c); heap.push([k, c]);
  }
  while (heap.size) {
    const [w, c] = heap.pop();
    if (done.has(c) || w !== best.get(c)) continue;
    done.add(c);
    for (const n of neighbours(c, width, height)) {
      const k = cap.get(n);
      if (k === undefined || done.has(n)) continue;
      const nw = Math.min(w, k);
      if (nw > (best.get(n) ?? -1)) { best.set(n, nw); via.set(n, k < w ? n : via.get(c)!); heap.push([nw, n]); }
    }
  }
  return { width: best, via };
}

// ---- areas' access ----

const areaGrids = new WeakMap<object, Int32Array>();
/** Cell → playable area id (−1 elsewhere), cached on the areas' shared cell arrays. */
function areaGrid(s: GameState): Int32Array {
  const key = s.areas[0]!.cells;
  let g = areaGrids.get(key);
  if (!g) {
    g = new Int32Array(s.grid.width * s.grid.height).fill(-1);
    for (const a of s.areas) if (a.access === 'playable') for (const c of a.cells) g[c] = a.id;
    areaGrids.set(key, g);
  }
  return g;
}

/** Each area's access: the road cells within `depth` (Chebyshev) of one of its cells, sorted (§5.12). */
export function areaAccess(s: GameState, roads: Iterable<number>, depth: number): Map<number, number[]> {
  const g = areaGrid(s), W = s.grid.width, H = s.grid.height, out = new Map<number, Set<number>>();
  for (const c of roads) {
    const x0 = c % W, y0 = Math.floor(c / W);
    for (let y = Math.max(0, y0 - depth); y <= Math.min(H - 1, y0 + depth); y++) {
      for (let x = Math.max(0, x0 - depth); x <= Math.min(W - 1, x0 + depth); x++) {
        const a = g[y * W + x]!;
        if (a >= 0) { let set = out.get(a); if (!set) out.set(a, set = new Set()); set.add(c); }
      }
    }
  }
  return new Map([...out].sort((a, b) => a[0] - b[0]).map(([a, set]) => [a, [...set].sort((p, q) => p - q)]));
}

// ---- the network view and allocation ----

export interface GatewayReach { gateway: Gateway; width: Map<number, number>; via: Map<number, number> }
/** One month's freight view of the roads: each gateway's widest paths and each area's access. */
export interface FreightNetwork {
  reach: GatewayReach[]; access: Map<number, number[]>;
  /** An area's path capacity to a gateway (0: not reached), and the weakest cell on that path. */
  path(area: number, gateway: Gateway): { capacity: number; weakest?: number };
}

export function freightNetwork(s: GameState, fc: FreightContent): FreightNetwork {
  const classes = roadClasses(s, fc.network), cap = new Map<number, number>();
  for (const [c, k] of classes) cap.set(c, fc.classes[k].capacity_t_month);
  const access = areaAccess(s, classes.keys(), fc.network.maxFrontageDepth);
  const W = s.grid.width, H = s.grid.height, R = fc.freight.yard_cells;
  const reach = fc.gateways.map((g): GatewayReach => {
    const gx = g.cell % W, gy = Math.floor(g.cell / W);
    const yard = [...cap.keys()].filter((c) => Math.abs((c % W) - gx) + Math.abs(Math.floor(c / W) - gy) <= R);
    return { gateway: g, ...widestPaths(W, H, cap, yard) };
  });
  return {
    reach, access,
    path(area, gateway) {
      const r = reach.find((x) => x.gateway === gateway)!;
      let capacity = 0, weakest: number | undefined;
      for (const c of access.get(area) ?? []) {
        const w = r.width.get(c) ?? 0;
        if (w > capacity) { capacity = w; weakest = r.via.get(c); }
      }
      return weakest === undefined ? { capacity } : { capacity, weakest };
    },
  };
}

/** One flow's demand from one area, in tonnes a month. */
export interface FreightDemand { area: number; face: Face; mode: FreightMode; dir: Direction; t: number }
export interface AreaFlow { area: number; face: Face; dir: Direction; gateway?: string; demand: number; flow: number }
export interface GatewayFlow { gateway: string; dir: Direction; demand: number; flow: number; capacity: number }
export interface FreightAllocation { areas: AreaFlow[]; gateways: GatewayFlow[] }

/**
 * Allocate demands to gateways (§5.12). A flow goes to the face's gateway with the wider path from the area, its own
 * mode's on a tie; with neither reached it is not constrained (no gateway, flow = demand). An area's flows into one
 * gateway and direction are summed before its path caps them, so together they never pass its weakest cell. A
 * gateway's capacity is shared pro rata to what each area can bring (min of demand and path), by largest remainder in
 * area order.
 */
export function allocateFreight(fc: FreightContent, net: FreightNetwork, demands: readonly FreightDemand[]): FreightAllocation {
  const areas: AreaFlow[] = [], at = new Map<string, number>();
  for (const d of [...demands].sort((a, b) => a.area - b.area)) {
    if (!(d.t > 0)) continue;
    const own = fc.gateways.find((g) => g.faces === d.face && g.mode === d.mode);
    const other = fc.gateways.find((g) => g.faces === d.face && g.mode !== d.mode);
    const width = (g?: Gateway) => (g ? net.path(d.area, g).capacity : 0);
    const pick = width(own) > 0 && width(own) >= width(other) ? own : width(other) > 0 ? other : undefined;
    const key = `${d.area}:${d.face}:${d.dir}:${pick?.id ?? ''}`;
    const i = at.get(key);
    if (i !== undefined) { areas[i]!.demand += d.t; areas[i]!.flow += d.t; continue; }
    at.set(key, areas.push({ area: d.area, face: d.face, dir: d.dir, ...(pick ? { gateway: pick.id } : {}), demand: d.t, flow: d.t }) - 1);
  }
  const queues = new Map<string, { i: number; want: number }[]>();
  areas.forEach((x, i) => {
    if (x.gateway === undefined) return;
    const g = fc.gateways.find((y) => y.id === x.gateway)!, key = `${g.id}:${x.dir}`;
    const q = queues.get(key) ?? (queues.set(key, []), queues.get(key)!);
    q.push({ i, want: Math.min(x.demand, net.path(x.area, g).capacity) });
  });
  const gateways: GatewayFlow[] = [];
  for (const g of fc.gateways) for (const dir of ['in', 'out'] as const) {
    const q = queues.get(`${g.id}:${dir}`) ?? [];
    const capacity = g.capacity[dir], total = q.reduce((n, x) => n + x.want, 0);
    const split = total <= capacity ? q.map((x) => x.want) : largestRemainder(capacity, q.map((x) => x.want));
    q.forEach((x, k) => { areas[x.i]!.flow = Math.min(x.want, split[k]!); });
    gateways.push({ gateway: g.id, dir, capacity, demand: q.reduce((n, x) => n + areas[x.i]!.demand, 0),
      flow: q.reduce((n, x) => n + areas[x.i]!.flow, 0) });
  }
  return { areas, gateways };
}

/** An area's share of a direction's demand that moves (1 when it has none). */
export function areaShare(a: FreightAllocation, area: number, dir: Direction, face?: Face): number {
  let d = 0, f = 0;
  for (const x of a.areas) if (x.area === area && x.dir === dir && (face === undefined || x.face === face)) { d += x.demand; f += x.flow; }
  return d > 0 ? Math.min(1, f / d) : 1;
}

// ---- the three flows ----

/** A firm's freight params, or none: existing premises and archetypes without an entry ship by the old ways. */
export function firmFreight(f: Firm, fp: FreightParams) {
  return f.premises === 'existing' ? undefined : fp.by_archetype[f.archetype];
}

/** Exports out and inputs in, from each firm's posts before freight (§5.12). */
export function firmDemands(s: GameState, p: SliceParams, fc: FreightContent, pre: ReadonlyMap<Firm, number>): FreightDemand[] {
  const by = new Map<string, FreightDemand>();
  const add = (area: number, face: Face, mode: FreightMode, dir: Direction, t: number) => {
    const k = `${area}:${face}:${mode}:${dir}`;
    const d = by.get(k);
    if (d) d.t += t; else by.set(k, { area, face, mode, dir, t });
  };
  for (const [f, posts] of pre) {
    const fr = firmFreight(f, fc.freight);
    if (!fr || posts <= 0) continue;
    const o = p.industry.by_ownership[f.ownership];
    const out = posts * o.output_per_job_month * o.export_share * fr.t_per_yuan;
    // R10c (§5.13): a trading firm's imports for resale come in from Hong Kong beside the processing inputs
    const imports = posts * o.output_per_job_month * (o.import_share ?? 0) * fr.t_per_yuan;
    add(f.area, 'hong_kong', fr.mode, 'out', out);
    add(f.area, 'hong_kong', fr.mode, 'in', out * fr.input_ratio + imports);
  }
  return [...by.values()];
}

/** Construction materials in from the mainland by rail: crew units each area's jobs would use × t_per_crew_month. */
export const materialDemands = (fc: FreightContent, wanted: ReadonlyMap<number, number>): FreightDemand[] =>
  [...wanted].map(([area, units]) => ({ area, face: 'mainland', mode: 'rail', dir: 'in', t: units * fc.freight.t_per_crew_month }));

/** Each area's crew-unit budget this month from its materials flow (Infinity when not constrained). */
export function materialBudgets(fc: FreightContent, a: FreightAllocation): Map<number, number> {
  const out = new Map<number, number>();
  for (const x of a.areas) {
    if (x.face !== 'mainland' || x.dir !== 'in') continue;
    out.set(x.area, x.flow >= x.demand || fc.freight.t_per_crew_month <= 0 ? Infinity : Math.floor(x.flow / fc.freight.t_per_crew_month));
  }
  return out;
}

/** The month's freight events: one per gateway and direction with demand. */
export function freightEvents(step: string, a: FreightAllocation) {
  return a.gateways.filter((g) => g.demand > 0).map((g) => ({ step, kind: 'freight',
    detail: { gateway: g.gateway, dir: g.dir, demand: g.demand, flow: g.flow, capacity: g.capacity } }));
}
