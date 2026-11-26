/**
 * Map-first turn actions for the headless policies (phase1-slice.md §5.9, R6): draw zones beside the roads, lay
 * outbound roads, phase zone servicing to the crew pool, and place water and power sources and facilities ahead of
 * the firms' need, all through the works queue (b&c §13.2). Pure and deterministic: every choice is read off the
 * state, the plan and the content, and every action is checked before it is given, so a policy never throws.
 * R9 (§5.9): an action whose tool gate is locked (§5.8) is held back until it opens, at no cost to the turn's money.
 */
import { contractLive, constructionCreditRoom, liveProject, moneyForProjects } from './fiscal.js';
import { ROAD_CLASSES, intensityOf, type RoadClass, type SliceParams } from './params.js';
import { roadClasses } from './freight.js';
import { HIGH_INTENSITY_KEY, type ImportQuota, type Intensity, type LandUse } from './enums.js';
import type { CellRuns, GameState, PlayerAction, Zone } from './state.js';
import type { TickContent } from './ticks.js';
import { liveOrder, spatialViews } from './works.js';
import { gateRefusal } from './gates.js';
import { cellsOfRuns, runsOfCells, templateZoneAction, zoneCellsAllowed } from './zones.js';
import { developableCells, zoneRoomM2 } from './growth.js';
import { coverFactors, needsBridge } from './landcover.js';
import { importedKw, powerPool } from './power.js';

/**
 * A zone the plan draws: a precedent's template cells, or an area's buildable cells nearest a road (both in its first
 * month, or when their gate opens), or R12 (§5.9) a design zone's own cells from `from_turn` (default 0).
 */
export type ZonePlan = { template: string } | { use: LandUse; area: number; cells: number } | DesignZonePlan;
/** R12 (§5.9): a zone drawn on given cells (the visit's design map, designPlan.ts), once, at the first turn from `from_turn` its gates allow. */
export interface DesignZonePlan { id: string; use: LandUse; intensity?: Intensity; runs: CellRuns; from_turn?: number }
const isDesign = (z: ZonePlan): z is DesignZonePlan => 'runs' in z;
/** Water and power: a source is placed when its areas' sited firms plus `headroom_jobs` would need more than they have. */
/** R8c (§5.5): substations ahead of need, purchases from a turn in chunks, and one station from a turn (none if absent). */
export interface UtilityPlan { headroom_jobs: number; max_sources: number; import_kw: number; import_from_turn: number; station_turn?: number }
export interface MapPlan {
  zones: readonly ZonePlan[];
  /** Outbound roads, as orthogonal [x, y] waypoints, committed in order once the one before is queued. */
  roads: readonly (readonly [number, number])[][];
  /** R8d (§5.12): road upgrades, as waypoints along existing roads and a class, ordered once every outbound road is built. */
  upgrades?: readonly { path: readonly (readonly [number, number])[]; class: RoadClass; from_turn?: number }[];
  /** The share of the local crew pool a turn's new servicing may take: phasing to crew capacity. */
  crew_share: number;
  /** A zone is serviced further only while its developable room is below this (m²): the next cells, not the whole zone. */
  room_ahead_m2: number;
  /** R10c (§5.13): on equal room, service the zone with the fewest cells left first (a small new zone before a large one). */
  small_zones_first?: boolean;
  utilities: UtilityPlan;
  /** Facilities placed once each, in order, when the money covers them: [facility type, area]. */
  facilities: readonly (readonly [string, number])[];
  /** Pool teams kept under contract while money for projects covers a year of their cost. */
  teams: readonly string[];
  /** Money for projects the plan leaves unspent. */
  reserve: number;
  /**
   * R9 (§5.9): through this turn, while the state-bank project loan is not yet offered, the plan commits as if it had
   * the loan's principal: its first works run ahead of the money and raise the loan, as a city that borrows to build.
   * Absent: the plan commits only what it has.
   */
  borrow_until_turn?: number;
  /** R11a (§5.14): the share of each new work the plan finances from the construction line, when it is open. Absent: 0. */
  credit_share?: number;
  /** R11 (§5.14): from this turn, apply this import-approval setting once the gate is open. Absent: the plan leaves it. */
  import_quota?: { level: ImportQuota; from_turn: number };
  /** R9 (§5.6): live road orders at once (default 1): a later plan road that touches the network starts beside the first. */
  roads_at_once?: number;
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

/** R9 (§5.8): whether the tool gates allow this action now (always, without tools content). */
export const gateAllows = (s: GameState, tick: TickContent, a: PlayerAction): boolean =>
  !tick.gates?.length || gateRefusal(s, tick.gates, a) === undefined;

/**
 * The plan's zones (§5.9): each plan entry, clipped to playable cells no earlier entry or plan road took. In the first
 * month (`later` false) every entry whose gate is open. R9: at a later turn's start (`later` true), each entry of a
 * gated use not drawn yet, once its gate opens. An entry is drawn while the zones of its use and area number at least
 * the plan's entries for them up to it.
 */
export function planZones(s: GameState, tick: TickContent, plan: MapPlan, later = false): PlayerAction[] {
  const taken = new Set([...s.zones.flatMap((z) => cellsOfRuns(z.runs, s.grid)),
    ...plan.roads.flatMap((r) => pathCells(s.grid.width, r) ?? [])]);
  const out: PlayerAction[] = [];
  const gated = (use: LandUse) => !!tick.gates?.some((g) => g.gate === `zone.${use}`);
  let roads: Set<number> | undefined;
  for (const [i, z] of plan.zones.entries()) {
    if (isDesign(z)) {
      // R12: drawn once (a zone of its use already holds one of its cells), never on a road, clipped like any stroke
      if (s.turn < (z.from_turn ?? 0)) continue;
      const own = new Set(cellsOfRuns(z.runs, s.grid));
      if (s.zones.some((x) => x.use === z.use && cellsOfRuns(x.runs, s.grid).some((c) => own.has(c)))) continue;
      roads ??= plannedRoads(s, tick);
      const runs = zoneCellsAllowed(s, runsOfCells([...own].filter((c) => !taken.has(c) && !roads!.has(c)).sort((p, q) => p - q), s.grid.width));
      if (!runs.length) continue;
      const a: PlayerAction & { type: 'create_zone' } = { type: 'create_zone', use: z.use, runs, ...(z.intensity ? { intensity: z.intensity } : {}) };
      if (!gateAllows(s, tick, a)) continue;
      if (z.intensity === 'high' && (!s.events.unlocked.includes(HIGH_INTENSITY_KEY) || !besideAvenue(s, tick, cellsOfRuns(a.runs, s.grid)))) continue;   // §5.3: waits for its unlock and avenue
      for (const c of cellsOfRuns(a.runs, s.grid)) taken.add(c);
      out.push(a);
      continue;
    }
    if (later) {
      if ('template' in z || !gated(z.use)) continue;
      const same = (x: ZonePlan) => !('template' in x) && !isDesign(x) && x.use === z.use && x.area === z.area;
      if (s.zones.filter((x) => x.use === z.use && x.area === z.area).length >= plan.zones.slice(0, i + 1).filter(same).length) continue;
    }
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
    if (!gateAllows(s, tick, a)) continue;
    for (const c of cellsOfRuns(a.runs, s.grid)) taken.add(c);
    out.push(a);
  }
  return out;
}

/** Whether an avenue cell is 4-adjacent to one of the cells: orders.ts's avenueAt, from the tick's network. */
function besideAvenue(s: GameState, tick: TickContent, cells: readonly number[]): boolean {
  if (!tick.network) return false;
  const k = roadClasses(s, tick.network), w = s.grid.width;
  return cells.some((c) => [c - w, c + w, ...(c % w ? [c - 1] : []), ...((c + 1) % w ? [c + 1] : [])].some((n) => k.get(n) === 'avenue'));
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
  const bridge = (c: number) => tick.landcover ? needsBridge(tick.landcover, c) : !!tick.buildable && !inSorted(tick.buildable.cells, c);
  for (const c of cells) cost += bridge(c) ? W.bridge.yuan_per_cell : W.road.yuan_per_cell;
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
 * for projects (less the plan's reserve) covers it. `holdServicing` (R10c): no servicing this turn (new zones pending).
 */
export function planWorks(s: GameState, tick: TickContent, p: SliceParams, plan: MapPlan, holdServicing = false): PlayerAction[] {
  const W = p.works;
  if (!W || !tick.network) return [];
  const out: PlayerAction[] = [];
  const w = s.grid.width;
  let money = moneyForProjects(s, p) - plan.reserve;
  if (plan.borrow_until_turn !== undefined && s.turn <= plan.borrow_until_turn && s.fiscal.projectLoan === 'not_offered') {
    money += p.fiscal.loan.principal;
  }
  // R11a (§5.14): the city draws on the regime's construction line for part of what it builds (credit_share); when
  // its own money cannot cover the rest, it draws that too, up to the line's room. The draw is a turn action of its own,
  // applied before the action it pays for.
  let credit = tick.fiscal ? constructionCreditRoom(s, p, tick.fiscal) : 0;
  const share = Math.max(0, Math.min(1, plan.credit_share ?? 0));
  const live = s.worksOrders.filter(liveOrder);
  // keep the plan's road corridors free for the roads (a source must not take a cell a later plan road needs)
  const used = new Set<number>(plan.roads.flatMap((r) => pathCells(w, r) ?? []));   // cells this turn's works leave free
  const newRoad = new Set<number>();                    // road cells this turn's actions take
  /** Pay a cost from the plan's money plus the line's share of it; empty when the two together cannot cover it. */
  const spend = (cost: number, a: PlayerAction): PlayerAction[] => {
    const shareDraw = Math.min(Math.floor(share * cost), credit);
    const need = cost - money - shareDraw;
    const total = shareDraw + (need > 0 ? need : 0);
    if (total > credit) return [];                            // the line has no room for the draw
    if (total > 0) {
      const draw: PlayerAction = { type: 'draw_credit', amount: total };
      if (!gateAllows(s, tick, draw)) return [];
      credit -= total; money += total;
    }
    money -= cost;
    return total > 0 ? [{ type: 'draw_credit', amount: total }, a] : [a];
  };

  // 1. outbound roads, `roads_at_once` live road orders at a time (one by default)
  let roadSlots = (plan.roads_at_once ?? 1) - live.filter((o) => o.kind === 'road').length;
  if (roadSlots > 0) {
    let pending = live.some((o) => o.kind === 'road');
    for (const path of plan.roads) {
      const r = roadOrder(s, tick, p, path);
      if (r === 'built' || r === 'blocked') continue;
      pending = true;
      const a: PlayerAction = { type: 'build_road', path: r.cells.map((c) => xy(c, w)) };
      const acts = gateAllows(s, tick, a) ? spend(r.cost, a) : [];
      if (acts.length) {
        out.push(...acts);
        for (const c of r.cells) newRoad.add(c);
        if (--roadSlots > 0) continue;            // the next plan road that touches the network now
      }
      break;
    }
    // R8d (§5.12): then the plan's upgrades, one at a time, each when the money covers the cells still below its class
    if (!pending && W.roads) for (const u of plan.upgrades ?? []) {
      const cells = pathCells(w, u.path);
      if (!cells || s.turn < (u.from_turn ?? 0)) continue;
      const classes = roadClasses(s, tick.network);
      if (cells.some((c) => !classes.has(c))) continue;            // an upgrade runs along roads only
      const rank = (k: RoadClass) => ROAD_CLASSES.indexOf(k);
      const low = cells.filter((c) => rank(classes.get(c)!) < rank(u.class));
      if (!low.length) continue;
      const rate = W.road.yuan_per_cell / W.road.units_per_cell, units = (k: RoadClass) => W.roads!.classes[k].units_per_cell;
      const cost = low.reduce((n, c) => n + rate * (units(u.class) - units(classes.get(c)!)), 0);
      const a: PlayerAction = { type: 'build_road', path: u.path.map((pt) => [pt[0], pt[1]] as [number, number]), class: u.class };
      const acts = gateAllows(s, tick, a) ? spend(cost, a) : [];
      if (acts.length) out.push(...acts);
      break;
    }
  }

  // 2. servicing, phased to the crew pool: one service order at a time, the zone with the least room first
  if (!holdServicing && !live.some((o) => o.kind === 'service')) {
    // R8a (§5.5): a cell's units and money follow its land cover, and an unrequisitioned cell owes compensation
    const capUnits = Math.floor(plan.crew_share * s.scenario.monthsPerTurn * p.capacity.local_crew);
    const rate = W.service.yuan_per_cell / W.service.units_per_cell;
    const req = new Set(s.requisitioned);
    // R8b (§5.3): and its zone's tier scales the work, and the money per unit of it
    const cellCost = (z: Zone, c: number) => {
      const f = coverFactors(p, tick.landcover, c), k = intensityOf(p.growth, z);
      const u = Math.max(1, Math.round(W.service.units_per_cell * f.cost * k.formation_work));
      return { u, yuan: u * rate * (k.formation_cost / k.formation_work)
        + (tick.landcover && !req.has(c) ? f.compensation * W.service.yuan_per_cell : 0) };
    };
    if (capUnits >= W.service.units_per_cell && money + credit > 0) {
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
        // R10c (§5.13): a plan may put the zone with the fewest cells left first on equal room
        .sort((a, b) => a.room - b.room || (plan.small_zones_first ? a.todo.length - b.todo.length : 0) || a.z.id - b.z.id);
      const pick = candidates[0];
      if (pick) {
        const cells: number[] = [];
        let units = 0, cost = 0;
        for (const c of pick.todo) {
          const k = cellCost(pick.z, c);
          if (units + k.u > capUnits || cost + k.yuan > money + credit) break;
          cells.push(c); units += k.u; cost += k.yuan;
        }
        const a: PlayerAction = { type: 'commit_works', zone: pick.z.id, cells: runsOfCells(cells, w) };
        if (cells.length && gateAllows(s, tick, a)) {
          out.push(...spend(cost, a));
        }
      }
    }
  }

  // 3. power (R8c, §5.5): substations ahead of each industrial zone's area need, purchases ahead of the city's need,
  // and one station from the plan's turn. Water is not an active constraint and is never built
  const org = p.growth?.industrial;
  const per = org ? p.industry.by_ownership[org.ownership] : undefined;
  const placements = [...s.structures.map((x) => ({ kind: x.kind, attach: x.attach, facility: x.facility })),
    ...live.flatMap((o) => (o.placement ? [{ kind: o.placement.kind, attach: o.placement.attach, facility: o.placement.facility }] : []))];
  const U = plan.utilities;
  const sub = W.structures.power_substation;
  const sited = s.firms.reduce((n, f) => n + f.powerKw, 0);
  const subOpen = gateAllows(s, tick, { type: 'place_structure', kind: 'power_substation', cell: [0, 0], attach: [0, 0] });
  // R10c (§5.13): trading firms' imports draw on the same forex quota; a structure the quota cannot cover waits
  let forex = s.fiscal.balances.forex;
  for (const z of s.zones.filter((x) => x.use === 'industrial')) {
    if (!per || !subOpen) break;
    const a = s.areas.find((x) => x.id === z.area)!;
    const zoneCells = new Set(cellsOfRuns(z.runs, s.grid));
    // a zone's substations are those attached to a road cell beside it (the cells structureSite picks)
    const serves = (attach: number) => neighbours(attach, w).some((c) => zoneCells.has(c));
    let kw = 0;
    for (const f of s.firms) if (f.area === a.id) kw += f.powerKw;
    const n = placements.filter((x) => (x.kind === 'power_substation' || x.kind === 'power_source') && serves(x.attach)).length;
    const need = kw + U.headroom_jobs * per.power_kw_per_job;
    if (n >= U.max_sources || a.utilities.powerCap + n * sub.capacity >= need) continue;
    if (sub.yuan > money + credit || (sub.forex_usd ?? 0) > forex) break;
    const site = structureSite(s, tick, zoneCells, used);
    if (!site) continue;
    const place: PlayerAction = { type: 'place_structure', kind: 'power_substation', cell: xy(site[0], w), attach: xy(site[1], w) };
    const acts = gateAllows(s, tick, place) ? spend(sub.yuan, place) : [];
    if (!acts.length) continue;
    used.add(site[0]);
    out.push(...acts); forex -= sub.forex_usd ?? 0;
  }
  // purchases: the pool with what is on order, against every sited firm and the headroom; up to the line's limit
  if (per && U.import_kw > 0 && s.turn >= U.import_from_turn) {
    const I = p.fiscal.power_import;
    const bought = importedKw(s), pool = powerPool(s);
    // a station still building is years away: it does not count
    const short = sited + U.headroom_jobs * per.power_kw_per_job - (pool.total + bought.pending);
    const room = I.max_kw - bought.arrived - bought.pending;
    const a: PlayerAction = { type: 'buy_power', kw: Math.min(room, U.import_kw) };
    if (short > 0 && room > 0 && gateAllows(s, tick, a)) out.push(a);
  }
  // a station, once, from the plan's turn: beside the first industrial zone, while money covers its first year
  const st = W.structures.power_station;
  if (per && U.station_turn !== undefined && s.turn >= U.station_turn && !placements.some((x) => x.kind === 'power_station')
    && gateAllows(s, tick, { type: 'place_structure', kind: 'power_station', cell: [0, 0], attach: [0, 0] })
    && money + credit >= (st.yuan * 12) / st.build_months && (st.forex_usd ?? 0) <= forex) {
    // R12: beside the first industrial zone that has a free site (a design zone's roads may be flanked by zones)
    let site: [number, number] | undefined;
    for (const z of s.zones) if (!site && z.use === 'industrial') site = structureSite(s, tick, new Set(cellsOfRuns(z.runs, s.grid)), used);
    if (site) {
      const a: PlayerAction = { type: 'place_structure', kind: 'power_station', cell: xy(site[0], w), attach: xy(site[1], w) };
      const acts = spend((st.yuan * 12) / st.build_months, a);
      if (acts.length) {
        used.add(site[0]);
        out.push(...acts); forex -= st.forex_usd ?? 0;
      }
    }
  }

  // 4. facilities: the k-th entry of a type is placed once k − 1 of that type exist, beside the first zone of its area
  const seen = new Map<string, number>();
  for (const [facility, area] of plan.facilities) {
    const k = (seen.get(facility) ?? 0) + 1;
    seen.set(facility, k);
    const sp = W.facilities[facility];
    if (!sp || placements.filter((x) => x.kind === 'facility' && x.facility === facility).length >= k) continue;
    if (!gateAllows(s, tick, { type: 'place_structure', kind: 'facility', facility, cell: [0, 0], attach: [0, 0] })) break;
    const z = s.zones.find((x) => x.area === area);
    if (!z || sp.yuan > money + credit || (sp.forex_usd ?? 0) > forex) break;
    const site = structureSite(s, tick, new Set(cellsOfRuns(z.runs, s.grid)), used);
    if (!site) continue;
    const a: PlayerAction = { type: 'place_structure', kind: 'facility', facility, cell: xy(site[0], w), attach: xy(site[1], w) };
    const acts = spend(sp.yuan, a);
    if (!acts.length) continue;
    used.add(site[0]);
    out.push(...acts); forex -= sp.forex_usd ?? 0;
    break;
  }

  // 5. pool teams
  for (const team of plan.teams) {
    const tp = p.teams[team];
    if (!tp || s.fiscal.contracts.some((c) => c.team === team && contractLive(s, c))) continue;
    const a: PlayerAction = { type: 'contract_team', team, mode: 'pool' };
    if (money + credit >= 12 * tp.cost_per_month && gateAllows(s, tick, a)) {
      out.push(...spend(12 * tp.cost_per_month, a));
    }
  }
  return out;
}
