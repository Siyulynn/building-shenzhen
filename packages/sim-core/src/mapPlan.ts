/**
 * Map-first turn actions for the headless policies (phase1-slice.md §5.9, R6): draw zones beside the roads, lay
 * outbound roads, phase zone servicing to the crew pool, and place water and power sources and facilities ahead of
 * the firms' need, all through the works queue (b&c §13.2). Pure and deterministic: every choice is read off the
 * state, the plan and the content, and every action is checked before it is given, so a policy never throws.
 */
import { contractLive, liveProject, moneyForProjects } from './fiscal.js';
import type { SliceParams } from './params.js';
import type { LandUse } from './enums.js';
import type { GameState, PlayerAction } from './state.js';
import type { TickContent } from './ticks.js';
import { liveOrder, spatialViews } from './works.js';
import { cellsOfRuns, runsOfCells, templateZoneAction, zoneCellsAllowed } from './zones.js';
import { developableCells, zoneRoomM2 } from './growth.js';

/** A zone the plan draws in its first month: a precedent's template cells, or an area's buildable cells nearest a road. */
export type ZonePlan = { template: string } | { use: LandUse; area: number; cells: number };
/** Water and power: a source is placed when its areas' sited firms plus `headroom_jobs` would need more than they have. */
export interface UtilityPlan { headroom_jobs: number; max_sources: number }
export interface MapPlan {
  zones: readonly ZonePlan[];
  /** Outbound roads, as orthogonal [x, y] waypoints, committed in order once the one before is queued. */
  roads: readonly (readonly [number, number])[][];
  /** The share of the local crew pool a turn's new servicing may take: phasing to crew capacity. */
  crew_share: number;
  /** A zone is serviced further only while its developable room is below this (m²): the next cells, not the whole zone. */
  room_ahead_m2: number;
  utilities: UtilityPlan;
  /** Facilities placed once each, in order, when the money covers them: [facility type, area]. */
  facilities: readonly (readonly [string, number])[];
  /** Pool teams kept under contract while money for projects covers a year of their cost. */
  teams: readonly string[];
  /** Money for projects the plan leaves unspent. */
  reserve: number;
}

const neighbours = (c: number, w: number) => [c - w, c - 1, c + 1, c + w];
const xy = (c: number, w: number): [number, number] => [c % w, Math.floor(c / w)];

function inSorted(sorted: Uint32Array | readonly number[], v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, x = sorted[m]!;
    if (x === v) return true;
    if (x < v) lo = m + 1; else hi = m - 1;
  }
  return false;
}

/** Road cells that exist or are queued: the start network's, the built ones and live road orders' paths. */
export function plannedRoads(s: GameState, tick: TickContent): Set<number> {
  const out = new Set([...(tick.network?.routes ?? []).filter((r) => r.kind === 'road').flatMap((r) => r.cells), ...s.roads]);
  for (const o of s.worksOrders) if (liveOrder(o) && o.path) for (const p of o.path) out.add(p.cell);
  return out;
}

/**
 * An area's `n` buildable, unzoned cells nearest a road (four-connected steps through the area's cells), ties by cell
 * index; returned sorted.
 */
export function cellsNearRoad(s: GameState, tick: TickContent, area: number, n: number, taken: ReadonlySet<number>): number[] {
  const a = s.areas.find((x) => x.id === area);
  if (!a || n <= 0) return [];
  const w = s.grid.width, roads = plannedRoads(s, tick), dist = new Map<number, number>(), queue: number[] = [];
  for (const c of a.cells) if (!roads.has(c) && neighbours(c, w).some((x) => roads.has(x))) { dist.set(c, 1); queue.push(c); }
  for (let i = 0; i < queue.length; i++) for (const x of neighbours(queue[i]!, w)) {
    if (!dist.has(x) && !roads.has(x) && inSorted(a.cells, x)) { dist.set(x, dist.get(queue[i]!)! + 1); queue.push(x); }
  }
  const ok = (c: number) => !taken.has(c) && (!tick.buildable || inSorted(tick.buildable.cells, c));
  return [...dist].filter(([c]) => ok(c)).sort((p, q) => p[1] - q[1] || p[0] - q[0]).slice(0, n).map(([c]) => c)
    .sort((p, q) => p - q);
}

/** The first month's zones (§5.9): each plan entry, clipped to playable cells no earlier entry or plan road took. */
export function planZones(s: GameState, tick: TickContent, plan: MapPlan): PlayerAction[] {
  const taken = new Set([...s.zones.flatMap((z) => cellsOfRuns(z.runs, s.grid)),
    ...plan.roads.flatMap((r) => pathCells(s.grid.width, r) ?? [])]);
  const out: PlayerAction[] = [];
  for (const z of plan.zones) {
    let a: PlayerAction & { type: 'create_zone' };
    if ('template' in z) {
      const p = tick.precedents?.find((x) => x.id === z.template);
      if (!p || !p.cells.length) continue;
      const runs = zoneCellsAllowed(s, runsOfCells(p.cells.filter((c) => !taken.has(c)), s.grid.width));
      if (!runs.length) continue;
      a = { ...templateZoneAction(s, p), runs };
    } else {
      const cells = cellsNearRoad(s, tick, z.area, z.cells, taken);
      if (!cells.length) continue;
      a = { type: 'create_zone', use: z.use, runs: runsOfCells(cells, s.grid.width) };
    }
    for (const c of cellsOfRuns(a.runs, s.grid)) taken.add(c);
    out.push(a);
  }
  return out;
}

/** A plan road's cells, expanded from its orthogonal waypoints; undefined if two waypoints are not in line. */
function pathCells(w: number, waypoints: readonly (readonly [number, number])[]): number[] | undefined {
  const cells: number[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const [tx, ty] = waypoints[i]!;
    if (i === 0) { cells.push(ty * w + tx); continue; }
    let [x, y] = waypoints[i - 1]!;
    const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
    if ((dx === 0) === (dy === 0)) return undefined;
    while (x !== tx || y !== ty) { x += dx; y += dy; cells.push(y * w + x); }
  }
  return cells;
}

/** The cost of a road path at the works rates, and whether every cell can take a road now (orders.ts's checks). */
function roadOrder(s: GameState, tick: TickContent, p: SliceParams, waypoints: readonly (readonly [number, number])[]):
  { cells: number[]; cost: number } | 'built' | 'blocked' {
  const w = s.grid.width, W = p.works!;
  const cells = pathCells(w, waypoints);
  if (!cells?.length) return 'blocked';
  const roads = plannedRoads(s, tick);
  if (cells.every((c) => roads.has(c))) return 'built';
  const works = new Set(s.cellWorks.map((x) => x.cell));
  const feet = new Set([...s.structures.map((x) => x.cell), ...s.worksOrders.filter((o) => liveOrder(o) && o.placement).map((o) => o.placement!.cell)]);
  const playable = (c: number) => s.areas.some((a) => a.access === 'playable' && inSorted(a.cells, c));
  if (new Set(cells).size !== cells.length || cells.some((c) => roads.has(c) || works.has(c) || feet.has(c) || !playable(c))) return 'blocked';
  const touches = (c: number) => neighbours(c, w).some((n) => roads.has(n));
  if (!touches(cells[0]!) && !touches(cells[cells.length - 1]!)) return 'blocked';
  let cost = 0;
  for (const c of cells) cost += tick.buildable && !inSorted(tick.buildable.cells, c) ? W.bridge.yuan_per_cell : W.road.yuan_per_cell;
  return { cells, cost };
}

/**
 * A free cell for a structure beside a road cell that touches `zoneCells`: playable, not a road, not zoned, with no
 * works and no structure. Lowest cell first, then the lowest road cell. Undefined if there is none.
 */
function structureSite(s: GameState, tick: TickContent, zoneCells: ReadonlySet<number>, used: ReadonlySet<number>): [number, number] | undefined {
  const w = s.grid.width, roads = plannedRoads(s, tick);
  const zoned = new Set(s.zones.flatMap((z) => cellsOfRuns(z.runs, s.grid)));
  const works = new Set(s.cellWorks.map((x) => x.cell));
  const feet = new Set([...s.structures.map((x) => x.cell), ...s.worksOrders.filter((o) => liveOrder(o) && o.placement).map((o) => o.placement!.cell)]);
  const built = new Set([...(tick.network?.routes ?? []).filter((r) => r.kind === 'road').flatMap((r) => r.cells), ...s.roads]);
  const playable = (c: number) => s.areas.some((a) => a.access === 'playable' && inSorted(a.cells, c));
  let best: [number, number] | undefined;
  for (const r of [...built].sort((a, b) => a - b)) {
    if (!neighbours(r, w).some((x) => zoneCells.has(x))) continue;
    for (const c of neighbours(r, w)) {
      if (roads.has(c) || zoned.has(c) || works.has(c) || feet.has(c) || used.has(c) || !playable(c)) continue;
      if (!best || c < best[0]) best = [c, r];
    }
  }
  return best;
}

/**
 * One turn's works for the plan (§5.9), at a turn's start after the first: the next outbound road, the next
 * servicing phase, water and power ahead of the firms' need, then facilities and pool teams, each only while money
 * for projects (less the plan's reserve) covers it.
 */
export function planWorks(s: GameState, tick: TickContent, p: SliceParams, plan: MapPlan): PlayerAction[] {
  const W = p.works;
  if (!W || !tick.network) return [];
  const out: PlayerAction[] = [];
  const w = s.grid.width;
  let money = moneyForProjects(s, p) - plan.reserve;
  const live = s.worksOrders.filter(liveOrder);
  // keep the plan's road corridors free for the roads (a source must not take a cell a later plan road needs)
  const used = new Set<number>(plan.roads.flatMap((r) => pathCells(w, r) ?? []));   // cells this turn's works leave free
  const newRoad = new Set<number>();                    // road cells this turn's actions take

  // 1. outbound roads, one live road order at a time
  if (!live.some((o) => o.kind === 'road')) {
    for (const path of plan.roads) {
      const r = roadOrder(s, tick, p, path);
      if (r === 'built' || r === 'blocked') continue;
      if (r.cost <= money) {
        out.push({ type: 'build_road', path: r.cells.map((c) => xy(c, w)) });
        money -= r.cost;
      }
      break;
    }
  }

  // 2. servicing, phased to the crew pool: one service order at a time, the zone with the least room first
  if (!live.some((o) => o.kind === 'service')) {
    const cap = Math.floor((plan.crew_share * s.scenario.monthsPerTurn * p.capacity.local_crew) / W.service.units_per_cell);
    const affordable = Math.floor(Math.max(0, money) / W.service.yuan_per_cell);
    const n = Math.min(cap, affordable);
    if (n > 0) {
      const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
      const works = new Set(s.cellWorks.map((x) => x.cell));
      const roads = plannedRoads(s, tick);
      const views = spatialViews(s, tick.network);
      const dev = developableCells(s, { network: tick.network, ...(tick.buildable ? { buildable: tick.buildable } : {}) });
      for (const x of s.fiscal.projects) if (x.cells && liveProject(x)) for (const c of cellsOfRuns(x.cells, s.grid)) served.add(c);
      const ok = (c: number) => views.frontage.has(c) && !served.has(c) && !works.has(c) && !roads.has(c) && !newRoad.has(c)
        && (!tick.buildable || inSorted(tick.buildable.cells, c));
      const candidates = s.zones.filter((z) => z.use === 'industrial' || z.use === 'residential' || z.use === 'commercial')
        .map((z) => ({ z, room: zoneRoomM2(s, z, dev.get(z.id)?.length ?? 0, p.growth!), todo: cellsOfRuns(z.runs, s.grid).filter(ok) }))
        .filter((x) => x.todo.length > 0 && x.room < plan.room_ahead_m2)
        .sort((a, b) => a.room - b.room || a.z.id - b.z.id);
      const pick = candidates[0];
      if (pick) {
        const cells = pick.todo.slice(0, n);
        out.push({ type: 'commit_works', zone: pick.z.id, cells: runsOfCells(cells, w) });
        money -= cells.length * W.service.yuan_per_cell;
      }
    }
  }

  // 3. water and power for each industrial zone, ahead of its area's sited firms' need: the scarcer one first
  const org = p.growth?.industrial;
  const per = org ? p.industry.by_ownership[org.ownership] : undefined;
  const placements = [...s.structures.map((x) => ({ kind: x.kind, attach: x.attach, facility: x.facility })),
    ...live.flatMap((o) => (o.placement ? [{ kind: o.placement.kind, attach: o.placement.attach, facility: o.placement.facility }] : []))];
  for (const z of s.zones.filter((x) => x.use === 'industrial')) {
    if (!per) break;
    const a = s.areas.find((x) => x.id === z.area)!;
    const zoneCells = new Set(cellsOfRuns(z.runs, s.grid));
    // a zone's sources are those attached to a road cell beside it (the cells structureSite picks)
    const serves = (attach: number) => neighbours(attach, w).some((c) => zoneCells.has(c));
    let kw = 0, m3 = 0;
    for (const f of s.firms) if (f.area === a.id) { kw += f.powerKw; m3 += f.waterM3Day; }
    const want = (['power_source', 'water_source'] as const).map((kind) => {
      const sp = W.structures[kind];
      const n = placements.filter((x) => x.kind === kind && serves(x.attach)).length;
      const need = kind === 'power_source' ? kw + plan.utilities.headroom_jobs * per.power_kw_per_job
        : m3 + plan.utilities.headroom_jobs * per.water_m3_day_per_job;
      const have = (kind === 'power_source' ? a.utilities.powerCap : a.utilities.waterCap) + n * sp.capacity;
      return { kind, sp, n, short: need > 0 ? have / need : Infinity };
    }).sort((x, y) => x.short - y.short);
    for (const { kind, sp, n, short } of want) {
      if (n >= plan.utilities.max_sources || short >= 1) continue;
      if (sp.yuan > money || (sp.forex_usd ?? 0) > s.fiscal.balances.forex) break;   // the scarcer one waits for money
      const site = structureSite(s, tick, zoneCells, used);
      if (!site) continue;
      used.add(site[0]);
      out.push({ type: 'place_structure', kind, cell: xy(site[0], w), attach: xy(site[1], w) });
      money -= sp.yuan;
    }
  }

  // 4. facilities: the k-th entry of a type is placed once k − 1 of that type exist, beside the first zone of its area
  const seen = new Map<string, number>();
  for (const [facility, area] of plan.facilities) {
    const k = (seen.get(facility) ?? 0) + 1;
    seen.set(facility, k);
    const sp = W.facilities[facility];
    if (!sp || placements.filter((x) => x.kind === 'facility' && x.facility === facility).length >= k) continue;
    const z = s.zones.find((x) => x.area === area);
    if (!z || sp.yuan > money) break;
    const site = structureSite(s, tick, new Set(cellsOfRuns(z.runs, s.grid)), used);
    if (!site) continue;
    used.add(site[0]);
    out.push({ type: 'place_structure', kind: 'facility', facility, cell: xy(site[0], w), attach: xy(site[1], w) });
    money -= sp.yuan;
    break;
  }

  // 5. pool teams
  for (const team of plan.teams) {
    const tp = p.teams[team];
    if (!tp || s.fiscal.contracts.some((c) => c.team === team && contractLive(s, c))) continue;
    if (money >= 12 * tp.cost_per_month) {
      out.push({ type: 'contract_team', team, mode: 'pool' });
      money -= 12 * tp.cost_per_month;
    }
  }
  return out;
}
