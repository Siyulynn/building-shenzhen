/**
 * Zones, the historical template and historical names (phase1-slice.md §5.3, M3a). Zones are the player's plan:
 * explicit entities with stable ids. A zone close enough to a historical zone (a precedent) in location, purpose and
 * scale takes its name. Names are labels: nothing in the economy reads them.
 */
import { HIGH_INTENSITY_KEY, INTENSITIES, LAND_USES, type Intensity, type LandUse } from './enums.js';
import type { SliceParams } from './params.js';
import type { CellRuns, GameState, LocalizedString, PlayerAction, Zone } from './state.js';
import type { TickContext } from './step.js';

type Grid = GameState['grid'];
export const PRECEDENT_KINDS = ['zone'] as const;            // enterprise | landmark | cluster arrive with M3c (§5.4)

// ---- cell runs: [y, x0, x1], inclusive ----

/** Sorted, unique cell indices (y × width + x) from runs. Throws on a malformed run or one outside the grid. */
export function cellsOfRuns(runs: unknown, grid: Grid): number[] {
  if (!Array.isArray(runs)) throw new Error('zone runs must be a list of [y, x0, x1]');
  const out = new Set<number>();
  for (const r of runs) {
    if (!Array.isArray(r) || r.length !== 3 || !r.every((n) => Number.isInteger(n))) {
      throw new Error(`malformed zone run ${JSON.stringify(r)}`);
    }
    const [y, x0, x1] = r as [number, number, number];
    if (y < 0 || y >= grid.height || x0 < 0 || x1 < x0 || x1 >= grid.width) {
      throw new Error(`zone run ${JSON.stringify(r)} is malformed or outside the grid`);
    }
    for (let x = x0; x <= x1; x++) out.add(y * grid.width + x);
  }
  return [...out].sort((a, b) => a - b);
}

/** Runs from sorted unique cell indices: sorted by y then x0, disjoint. */
export function runsOfCells(cells: readonly number[], width: number): CellRuns {
  const runs: CellRuns = [];
  for (const c of cells) {
    const y = Math.floor(c / width), x = c % width;
    const last = runs[runs.length - 1];
    if (last && last[0] === y && last[2] === x - 1) last[2] = x;
    else runs.push([y, x, x]);
  }
  return runs;
}

function has(sorted: Uint32Array, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, m = sorted[mid]!;
    if (m === v) return true;
    if (m < v) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}

/** The playable area holding a cell, or 0 (card-only areas and cells outside every area). */
export function playableAreaOf(s: GameState, cell: number): number {
  for (const a of s.areas) if (a.access === 'playable' && has(a.cells, cell)) return a.id;
  return 0;
}

function zonedCells(s: GameState, except?: number): Set<number> {
  const taken = new Set<number>();
  for (const z of s.zones) if (z.id !== except) for (const c of cellsOfRuns(z.runs, s.grid)) taken.add(c);
  return taken;
}

/** The cells of `runs` a stroke may zone: playable and in no other zone (§5.3). The UI clips a stroke with this. */
export function zoneCellsAllowed(s: GameState, runs: CellRuns, except?: number): CellRuns {
  const taken = zonedCells(s, except);
  return runsOfCells(cellsOfRuns(runs, s.grid).filter((c) => !taken.has(c) && playableAreaOf(s, c) > 0), s.grid.width);
}

/** The playable area holding most of the cells; ties go to the lower area id. */
function majorityArea(s: GameState, cells: readonly number[]): number {
  const n = new Map<number, number>();
  for (const c of cells) { const a = playableAreaOf(s, c); n.set(a, (n.get(a) ?? 0) + 1); }
  let best = 0, bestN = 0;
  for (const [a, k] of n) if (a > 0 && (k > bestN || (k === bestN && a < best))) { best = a; bestN = k; }
  return best;
}

function checkUse(use: unknown): LandUse {
  if (!(LAND_USES as readonly unknown[]).includes(use)) throw new Error(`unknown land use ${String(use)}`);
  return use as LandUse;
}

function checkPlaceable(s: GameState, cells: readonly number[], except?: number): void {
  const taken = zonedCells(s, except);
  for (const c of cells) {
    const where = `cell [${c % s.grid.width}, ${Math.floor(c / s.grid.width)}]`;
    if (playableAreaOf(s, c) === 0) throw new Error(`${where} is not in a playable area`);
    if (taken.has(c)) throw new Error(`${where} is already in another zone`);
  }
}

function setCells(s: GameState, z: Zone, cells: readonly number[]): void {
  z.runs = runsOfCells(cells, s.grid.width);
  z.cellCount = cells.length;
  z.area = majorityArea(s, cells);
}

const ZONE_ACTIONS: readonly string[] = ['create_zone', 'edit_zone', 'remove_zone', 'rename_zone'];
export const isZoneAction = (a: PlayerAction): boolean => ZONE_ACTIONS.includes(a.type);

/** Checks a tier (§5.3): a known one, and for high the unlock key and, through `avenueAt`, an avenue beside the cells. */
function checkIntensity(s: GameState, k: unknown, cells: readonly number[], avenueAt?: AvenueAt): Intensity {
  if (!(INTENSITIES as readonly unknown[]).includes(k)) throw new Error(`unknown intensity ${String(k)}`);
  if (k === 'high') checkHigh(s, cells, avenueAt);
  return k as Intensity;
}
/** Whether an avenue cell is 4-adjacent to one of these cells; the construction step gives it, from the road network. */
export type AvenueAt = (s: GameState, cells: readonly number[]) => boolean;
/** High intensity's two conditions (§5.3), each refused with its reason. Exported for commit_works. */
export function checkHigh(s: GameState, cells: readonly number[], avenueAt?: AvenueAt): void {
  if (!s.events.unlocked.includes(HIGH_INTENSITY_KEY)) throw new Error('high intensity is not available yet');
  if (!avenueAt) throw new Error('high intensity needs the road network to check its avenue');
  if (!avenueAt(s, cells)) throw new Error('high intensity needs an avenue beside the zone');
}

/** Whether any of the zone's cells is serviced or has site-formation works (§5.3). */
function formedIn(s: GameState, zone: number, cells: readonly number[]): boolean {
  if (s.cellWorks.some((w) => w.zone === zone)) return true;
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  return cells.some((c) => served.has(c));
}

/** Apply one zone action (§5.3). Throws on an invalid one, changing nothing; the caller logs a valid one. */
export function applyZoneAction(s: GameState, a: PlayerAction, avenueAt?: AvenueAt): void {
  const find = (id: number) => {
    const z = s.zones.find((x) => x.id === id);
    if (!z) throw new Error(`no zone ${id}`);
    return z;
  };
  switch (a.type) {
    case 'create_zone': {
      const use = checkUse(a.use);
      const cells = cellsOfRuns(a.runs, s.grid);
      if (!cells.length) throw new Error('a zone needs at least one cell');
      checkPlaceable(s, cells);
      if (a.template !== undefined && typeof a.template !== 'string') throw new Error('a zone template must be a precedent id');
      const k = a.intensity !== undefined ? checkIntensity(s, a.intensity, cells, avenueAt) : undefined;
      const z: Zone = { id: s.nextZoneId, use, runs: [], cellCount: 0, area: 0, created: s.date,
        ...(a.template !== undefined ? { template: a.template } : {}), ...(k && k !== 'standard' ? { intensity: k } : {}),
        name: { kind: 'generic' } };
      setCells(s, z, cells);
      s.nextZoneId += 1;
      s.zones.push(z);
      return;
    }
    case 'edit_zone': {
      const z = find(a.zone);
      const current = cellsOfRuns(z.runs, s.grid);
      const here = new Set(current);
      const added = (a.add ? cellsOfRuns(a.add, s.grid) : []).filter((c) => !here.has(c));
      const removed = new Set(a.remove ? cellsOfRuns(a.remove, s.grid) : []);
      checkPlaceable(s, added, z.id);
      const cells = [...current, ...added].filter((c) => !removed.has(c)).sort((x, y) => x - y);
      if (!cells.length) throw new Error(`the edit would leave zone ${z.id} empty: remove it instead`);
      const use = a.use !== undefined ? checkUse(a.use) : z.use;
      const k = a.intensity !== undefined ? a.intensity : z.intensity ?? 'standard';
      // a high zone's cells are rechecked on every edit: it must still touch an avenue
      if (a.intensity !== undefined || k === 'high') checkIntensity(s, k, cells, avenueAt);
      // formation is priced at the tier in force: a zone with formed or forming land may not be raised (§5.3)
      const rank = (t: Intensity) => INTENSITIES.indexOf(t);
      if (rank(k) > rank(z.intensity ?? 'standard') && formedIn(s, z.id, current)) {
        throw new Error(`zone ${z.id} has formed land: its intensity can no longer be raised`);
      }
      z.use = use;
      if (k === 'standard') delete z.intensity; else z.intensity = k;
      setCells(s, z, cells);
      return;
    }
    case 'remove_zone': {
      find(a.zone);
      s.zones = s.zones.filter((z) => z.id !== a.zone);
      return;
    }
    case 'rename_zone': {
      const z = find(a.zone);
      if (a.name === null) { z.name = { kind: 'generic' }; return; }
      const n = a.name as Partial<LocalizedString> | undefined;
      if (typeof n?.zh !== 'string' || typeof n.en !== 'string' || !n.zh.trim() || !n.en.trim()) {
        throw new Error('a zone name needs zh and en text, or null for the default');
      }
      z.name = { kind: 'custom', zh: n.zh, en: n.en };
      return;
    }
    default:
      throw new Error(`not a zone action: ${a.type}`);
  }
}

// ---- precedents ----

type PrecedentGeometry =
  | { kind: 'square'; cell: [number, number]; side: number }
  | { kind: 'runs'; runs: CellRuns }
  | { kind: 'unplaced' };
/** One record of content/slice/precedents.yaml, parsed. */
export interface PrecedentContent { id: string; kind: string; name: LocalizedString; use: string; geometry: PrecedentGeometry }
/** A compiled precedent. Precedents never enter GameState. */
export interface Precedent {
  id: string; kind: (typeof PRECEDENT_KINDS)[number]; name: LocalizedString; use: LandUse;
  cells: readonly number[];                 // sorted cell indices, clipped to the grid; empty when unplaced
  centroid: [number, number] | null;        // [x, y] in cells; null when unplaced
}

function centroid(cells: readonly number[], width: number): [number, number] | null {
  if (!cells.length) return null;
  let sx = 0, sy = 0;
  for (const c of cells) { sx += c % width; sy += Math.floor(c / width); }
  return [sx / cells.length, sy / cells.length];
}

/** Validate content/slice/precedents.yaml and compile each placed geometry to cells clipped to the grid (§5.3). */
export function compilePrecedents(raw: unknown, areas: { grid: Grid }): Precedent[] {
  const grid = areas.grid;
  if (!Array.isArray(raw)) throw new Error('precedents: expected a list');
  const seen = new Set<string>();
  return (raw as PrecedentContent[]).map((r, i) => {
    if (typeof r?.id !== 'string' || !r.id) throw new Error(`precedents[${i}]: id is missing`);
    if (seen.has(r.id)) throw new Error(`precedents: duplicate id ${r.id}`);
    seen.add(r.id);
    if (!(PRECEDENT_KINDS as readonly string[]).includes(r.kind)) throw new Error(`${r.id}: kind ${r.kind} is not supported yet`);
    if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${r.id}: name needs zh and en`);
    const use = checkUse(r.use);
    const g = r.geometry;
    let cells: number[] = [];
    if (g?.kind === 'square') {
      const [cx, cy] = Array.isArray(g.cell) ? g.cell : [NaN, NaN];
      if (![cx, cy, g.side].every((n) => Number.isInteger(n)) || g.side < 1) throw new Error(`${r.id}: a square needs an integer cell and side`);
      const h = Math.floor((g.side - 1) / 2);
      const x0 = Math.max(0, cx - h), x1 = Math.min(grid.width - 1, cx - h + g.side - 1);
      const y0 = Math.max(0, cy - h), y1 = Math.min(grid.height - 1, cy - h + g.side - 1);
      const runs: CellRuns = [];
      for (let y = y0; y <= y1; y++) if (x0 <= x1) runs.push([y, x0, x1]);
      cells = cellsOfRuns(runs, grid);
    } else if (g?.kind === 'runs') {
      cells = cellsOfRuns(g.runs, grid);
    } else if (g?.kind !== 'unplaced') {
      throw new Error(`${r.id}: geometry kind must be square, runs or unplaced`);
    }
    if (g.kind !== 'unplaced' && !cells.length) throw new Error(`${r.id}: its geometry has no cell inside the grid`);
    return { id: r.id, kind: 'zone' as const, name: { zh: r.name.zh, en: r.name.en }, use, cells,
      centroid: centroid(cells, grid.width) };
  });
}

/** The create_zone that applies a template zone: its cells, clipped to playable cells in no zone (§5.3). */
export function templateZoneAction(s: GameState, p: Precedent): PlayerAction & { type: 'create_zone' } {
  if (!p.cells.length) throw new Error(`${p.id} is unplaced: it has no template cells`);
  const runs = zoneCellsAllowed(s, runsOfCells(p.cells, s.grid.width));
  if (!runs.length) throw new Error(`${p.id}: every template cell is outside the playable areas or already zoned`);
  return { type: 'create_zone', use: p.use, runs, template: p.id };
}

// ---- name matching ----

/** The match score of a zone and a precedent, or null when the pair does not match (§5.3). */
export function matchScore(z: { use: LandUse; cells: readonly number[] }, p: Precedent, width: number,
  m: SliceParams['zoning']['names']): number | null {
  if (!p.cells.length || !p.centroid || z.use !== p.use || !z.cells.length) return null;
  const inP = new Set(p.cells);
  let shared = 0;
  for (const c of z.cells) if (inP.has(c)) shared++;
  const overlap = shared / p.cells.length;
  const [zx, zy] = centroid(z.cells, width)!;
  const offset = Math.hypot(zx - p.centroid[0], zy - p.centroid[1]);
  const ratio = z.cells.length / p.cells.length;
  if (overlap < m.min_overlap && offset > m.max_offset_cells) return null;
  if (ratio < 1 / m.max_scale_ratio || ratio > m.max_scale_ratio) return null;
  // a pair can match on overlap alone with its centroids beyond max_offset_cells: the offset term floors at 0
  return m.weights.overlap * overlap + m.weights.offset * Math.max(0, 1 - offset / m.max_offset_cells)
    + m.weights.scale * (1 - Math.abs(Math.log(ratio)) / Math.log(m.max_scale_ratio));
}

/**
 * Give each zone at most one precedent's name and each precedent at most one zone (§5.3): a zone keeps last month's
 * name while the pair still matches; the rest go greedily by score, ties to the lower zone id, then file order.
 * Zones with a custom name take no part.
 */
export function assignZoneNames(s: GameState, precedents: readonly Precedent[], p: SliceParams): void {
  const m = p.zoning.names;
  const zones = s.zones.filter((z) => z.name.kind !== 'custom');
  const cellsOf = new Map(zones.map((z) => [z.id, cellsOfRuns(z.runs, s.grid)]));
  const score = (z: Zone, pr: Precedent) => matchScore({ use: z.use, cells: cellsOf.get(z.id)! }, pr, s.grid.width, m);
  const taken = new Set<string>();
  const named = new Set<number>();
  for (const z of zones) {
    if (z.name.kind !== 'precedent') continue;
    const id = z.name.precedent;
    const pr = precedents.find((x) => x.id === id);
    if (pr && !taken.has(pr.id) && score(z, pr) !== null) { taken.add(pr.id); named.add(z.id); }
  }
  const pairs: { z: Zone; pi: number; sc: number }[] = [];
  precedents.forEach((pr, pi) => {
    if (pr.kind !== 'zone' || taken.has(pr.id)) return;
    for (const z of zones) {
      if (named.has(z.id)) continue;
      const sc = score(z, pr);
      if (sc !== null) pairs.push({ z, pi, sc });
    }
  });
  pairs.sort((a, b) => b.sc - a.sc || a.z.id - b.z.id || a.pi - b.pi);
  for (const { z, pi } of pairs) {
    const pr = precedents[pi]!;
    if (named.has(z.id) || taken.has(pr.id)) continue;
    z.name = { kind: 'precedent', precedent: pr.id };
    taken.add(pr.id); named.add(z.id);
  }
  for (const z of zones) if (!named.has(z.id)) z.name = { kind: 'generic' };
}

/** Tick step 3's zoning pass: names settle before investors look for sites (M3b). */
export const zoning = (p: SliceParams, precedents: readonly Precedent[]) =>
  (ctx: TickContext): void => assignZoneNames(ctx.state, precedents, p);

const USE_LABEL: Record<LandUse, LocalizedString> = {
  industrial: { zh: '工业区', en: 'industrial zone' },
  residential: { zh: '居住区', en: 'residential zone' },
  commercial: { zh: '商业区', en: 'commercial zone' },
  reserve: { zh: '储备用地', en: 'reserve land' },
};

/** A zone's display name: its custom or precedent name, or the generic label from its area, use and id (§5.3). */
export function zoneLabel(s: GameState, z: Zone, precedents: readonly Precedent[]): LocalizedString {
  const n = z.name;
  if (n.kind === 'custom') return { zh: n.zh, en: n.en };
  if (n.kind === 'precedent') {
    const pr = precedents.find((x) => x.id === n.precedent);
    if (pr) return { ...pr.name };
  }
  const area = s.areas.find((a) => a.id === z.area);
  const u = USE_LABEL[z.use];
  return { zh: `${area?.name.zh ?? '?'} · ${u.zh} #${z.id}`, en: `${area?.name.en ?? '?'} · ${u.en} #${z.id}` };
}
