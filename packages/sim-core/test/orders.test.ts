/** R2: municipal works orders, placement and the preview (buildings-and-construction §13.2; phase1-slice §12 R2). */
import { describe, expect, it } from 'vitest';
import {
  Rng, SAVE_VERSION, applyTurnAction, landCoverAt, needsBridge, cellsOfRuns, createTickSteps, firstOption, liveOrder, loadGame, post, previewWorks, replay,
  runMonths, saveFromJson, saveGame, saveToJson, spatialViews, step, templateZoneAction, unspentCommitments,
  type CellRuns, type GameState, type PlayerAction, type WorksOrder,
} from '../src/index.js';
import { content, initial, params, slice, UNGATED } from './fixtures.js';
import { checkInvariants, checkLedger } from './invariants.js';

// A pace that does not divide a cell's units, so months end with cells part-serviced
const WORKS = { ...params.works!, crew_per_order: 30 };
const STEPS = createTickSteps({ ...params, works: WORKS }, UNGATED);
const W = slice.init.areas.grid.width;
const at = (x: number, y: number) => y * W + x;
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);
const SHANGBU = UNGATED.precedents!.find((p) => p.id === 'precedent.zone.shangbu_industrial')!;
// The guide sits at rows 370–375, x 349–354; the temporary Guangshen road runs along row 346. A spur south down
// x 360 from (360,346), over the hill cell (360,347) (a road, not a bridge, since R8a: only water and tidal flats
// bridge), then west along row 369 fronts the guide's top row: 23 + 10 cells. The phase is that top row.
const SPUR: [number, number][] = [[360, 347], [360, 369], [350, 369]];
const SPUR_CELLS = 33;
const PHASE: CellRuns = [[370, 349, 354]];
const FUND = 5_000_000;
// R8a (phase1-slice §5.5): the guide's 36 cells are all lowland_farm, so each forms at its class's units and money
const FARM_UNITS = Math.round(WORKS.service.units_per_cell * params.growth!.land_cover!.lowland_farm.cost);
const FARM_YUAN = FARM_UNITS * WORKS.service.yuan_per_cell / WORKS.service.units_per_cell;
const copy = (s: GameState) => loadGame(saveFromJson(saveToJson(saveGame(s, new Rng(0), content)))).state;

/** Months of play, answering every card with its first option; `first` are turn actions in the first month. */
function play(s: GameState, months: number, rng: Rng, first: PlayerAction[] = []): GameState {
  let todo = first;
  return runMonths(s, months, rng, (st, cards) => { const a = [...firstOption(st, cards), ...todo]; todo = []; return a; }, STEPS);
}
/** A start with money for works, granted through the ledger so the accounts stay whole. */
function funded(): GameState {
  const s = initial();
  post(s, 'grant', 'general', FUND, 'test.fund');
  return s;
}
const worksPaid = (s: GameState, id: number) => 0 - s.fiscal.ledger
  .filter((l) => l.ref === `works.${id}` && l.type === 'project').reduce((n, l) => n + l.amount, 0);

/** §13.2's invariants: sunk spending is the ledger's; no stock negative; serviced works are serviced land. */
function checkOrders(s: GameState): void {
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  for (const o of s.worksOrders) {
    expect(o.unitsDone).toBeGreaterThanOrEqual(0);
    expect(o.unitsDone).toBeLessThanOrEqual(o.unitsTotal);
    expect(o.spent).toBe(worksPaid(s, o.id));
    expect(o.spent).toBeLessThanOrEqual(o.budget);
    if (o.stage === 'done') expect(o.unitsDone).toBe(o.unitsTotal);
  }
  const sunk = s.worksOrders.filter((o) => o.kind === 'service').reduce((n, o) => n + o.unitsDone, 0);
  expect(s.cellWorks.reduce((n, w) => n + w.workDone, 0)).toBe(sunk);
  for (const w of s.cellWorks) expect(served.has(w.cell)).toBe(w.stage === 'serviced');
  expect(s.roads).toEqual([...new Set(s.roads)].sort((a, b) => a - b));
}

const guide = (s: GameState) => templateZoneAction(s, SHANGBU);

describe('R2 placement validates the map', () => {
  it('refuses a road that starts off the network, leaves playable land, or adds no new road', () => {
    const s = funded();
    expect(() => apply(s, { type: 'build_road', path: [[362, 360], [362, 365]] })).toThrow(/start or end next to a road/);
    expect(() => apply(s, { type: 'build_road', path: [[352, 347], [352, 349]] })).toThrow(/not playable/);
    expect(() => apply(s, { type: 'build_road', path: [[355, 346], [358, 346]] })).toThrow(/adds no new road/);
    expect(() => apply(s, { type: 'build_road', path: [[355, 347], [357, 349]] })).toThrow(/orthogonal/);
    expect(() => apply(s, { type: 'build_road', path: [[0, 0], [0, 1]] })).toThrow(/not playable/);
    expect(s.worksOrders).toEqual([]);
  });

  it('prices a road by its cells, bridging only water and tidal flats (R8a)', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: SPUR });
    const o = s.worksOrders[0]!;
    const bridges = o.path!.filter((c) => c.bridge).length, cells = o.path!.length;
    expect(cells).toBe(SPUR_CELLS);
    expect(landCoverAt(UNGATED.landcover!, at(360, 347))).toBe('hill');
    expect(o.path![0]).toMatchObject({ cell: at(360, 347), bridge: false });
    expect(o.unitsTotal).toBe((cells - bridges) * WORKS.road.units_per_cell + bridges * WORKS.bridge.units_per_cell);
    expect(o.budget).toBe(Math.round(o.unitsTotal * WORKS.road.yuan_per_cell / WORKS.road.units_per_cell));
    for (const c of o.path!) expect(c.bridge).toBe(needsBridge(UNGATED.landcover!, c.cell));
    expect(() => apply(s, { type: 'build_road', path: [[361, 350], [362, 350]] })).not.toThrow();   // may branch off a queued road
    expect(() => apply(s, { type: 'build_road', path: [[360, 349], [360, 352]] })).toThrow(/adds no new road/);
  });


  it('places a structure only on playable, unoccupied land attached beside it, and draws its forex at commit', () => {
    const s = funded();
    const forex = s.fiscal.balances.forex;
    expect(() => apply(s, { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [358, 345] })).toThrow(/does not touch/);
    expect(() => apply(s, { type: 'place_structure', kind: 'power_substation', cell: [356, 346], attach: [356, 346] })).toThrow(/a road/);
    expect(() => apply(s, { type: 'place_structure', kind: 'facility', facility: 'clinic', cell: [356, 345], attach: [356, 346] }))
      .toThrow(/no facility type/);
    apply(s, { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346] });
    expect(s.fiscal.balances.forex).toBe(forex - WORKS.structures.power_substation.forex_usd!);
    expect(() => apply(s, { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346] })).toThrow(/already holds/);
  });

  it('builds a placed source once its attach cell is a road, and its capacity then supplies along the network', () => {
    const rng = new Rng(2);
    const s0 = funded();
    const s = play(s0, 12, rng, [{ type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346], priority: 'high' }]);
    expect(s.worksOrders[0]).toMatchObject({ stage: 'done', unitsDone: WORKS.structures.power_substation.units });
    expect(s.structures).toMatchObject([{ kind: 'power_substation', cell: at(356, 345), attach: at(356, 346),
      capacity: WORKS.structures.power_substation.capacity }]);
    expect(spatialViews(s, slice.startNetwork).sources.power)
      .toEqual(new Map([[at(356, 346), WORKS.structures.power_substation.capacity]]));
    checkOrders(s);
  });

  it('keeps M4 site preparation off cells that have works', () => {
    const s = funded();
    apply(s, guide(s));
    apply(s, { type: 'commit_works', zone: 1, cells: PHASE });
    apply(s, { type: 'commit_project', template: 'project.site_preparation', zone: 1 });
    const project = s.fiscal.projects.at(-1)!;
    const prepared = new Set(cellsOfRuns(project.cells!, s.grid));
    for (const c of cellsOfRuns(PHASE, s.grid)) expect(prepared.has(c)).toBe(false);
    expect(prepared.size).toBe(30);
  });
});

describe('R2 guides and phasing', () => {
  it('showing a guide and previewing its cost spends nothing and changes nothing', () => {
    const s = funded();
    const before = saveToJson(saveGame(s, new Rng(1), content));
    const all = previewWorks(s, WORKS, [guide(s), { type: 'commit_works', zone: s.nextZoneId }], apply);
    const phase = previewWorks(s, WORKS, [guide(s), { type: 'build_road', path: SPUR },
      { type: 'commit_works', zone: s.nextZoneId, cells: PHASE }], apply);
    expect(saveToJson(saveGame(s, new Rng(1), content))).toBe(before);
    expect(all).toMatchObject({ ok: true, orders: [{ kind: 'service', cells: 36, units: 36 * FARM_UNITS,
      budget: 36 * FARM_YUAN, compensation: 36 * params.growth!.land_cover!.lowland_farm.compensation * WORKS.service.yuan_per_cell }] });
    expect(phase.ok && phase.orders.map((o) => [o.kind, o.cells, o.bridges])).toEqual([['road', SPUR_CELLS, 0], ['service', 6, 0]]);
    expect(phase.ok && phase.orders[1]).toMatchObject({ crewPerMonth: 30, months: Math.ceil(6 * FARM_UNITS / 30), units: 6 * FARM_UNITS,
      budget: 6 * FARM_YUAN });
    expect(previewWorks(s, WORKS, [{ type: 'commit_works', zone: 99 }], apply)).toEqual({ ok: false, error: 'no zone 99' });
  });

  it('phasing the guide develops its first frontage without funding the rest', () => {
    const rng = new Rng(3);
    const s0 = funded();
    const s = play(s0, 26, rng, [guide(s0), { type: 'build_road', path: SPUR, priority: 'high' },
      { type: 'commit_works', zone: 1, cells: PHASE, priority: 'high' }]);
    checkOrders(s);
    const [road, phase] = s.worksOrders as [WorksOrder, WorksOrder];
    expect(road.stage).toBe('done');
    expect(phase.stage).toBe('done');
    expect(s.roads.length).toBe(SPUR_CELLS);
    const phaseCells = cellsOfRuns(PHASE, s.grid), served = new Set(cellsOfRuns(s.servicedLand, s.grid));
    for (const c of phaseCells) expect(served.has(c)).toBe(true);
    const rest = cellsOfRuns(s.zones[0]!.runs, s.grid).filter((c) => !phaseCells.includes(c));
    expect(rest.length).toBe(30);
    for (const c of rest) expect(served.has(c) || s.cellWorks.some((w) => w.cell === c)).toBe(false);
    expect(road.spent + phase.spent).toBe(road.budget + phase.budget);
    expect(phase.spent).toBeLessThan(36 * FARM_YUAN);   // the whole guide's servicing alone
    // the phase's frontage is the new road's, and the next row inward is now reachable from it
    const v = spatialViews(s, slice.startNetwork);
    expect(v.frontage.get(at(352, 370))?.depth).toBe(1);
    expect(v.frontage.get(at(352, 371))?.depth).toBe(2);
    expect(v.frontage.get(at(349, 370))?.depth).toBe(2);   // (349,369) is off playable land: reached from its neighbour
  });

  it('a service order waits for access until its road is built, then works', () => {
    const rng = new Rng(4);
    const s0 = funded();
    let s = play(s0, 1, rng, [guide(s0), { type: 'commit_works', zone: 1, cells: PHASE, priority: 'high' }]);
    expect(s.worksOrders[0]).toMatchObject({ waiting: 'access', unitsDone: 0, spent: 0 });
    s = play(s, 18, rng, [{ type: 'build_road', path: SPUR, priority: 'high' }]);
    checkOrders(s);
    expect(s.worksOrders[0]!.unitsDone).toBeGreaterThan(0);
  });
});

describe('R2 cancel and pause conserve funds and work', () => {
  it('cancelling unstarted cells releases their commitment and keeps sunk work and spending', () => {
    const rng = new Rng(5);
    const s0 = funded();
    const s = play(s0, 18, rng, [guide(s0), { type: 'build_road', path: SPUR, priority: 'high' },
      { type: 'commit_works', zone: 1, priority: 'high' }]);
    const o = s.worksOrders[1]!;
    expect(o.unitsDone).toBeGreaterThan(0);
    const started = s.cellWorks.filter((w) => w.order === o.id && w.workDone > 0);
    const unstarted = s.cellWorks.filter((w) => w.order === o.id && w.workDone === 0).length;
    expect(started.some((w) => w.stage === 'servicing')).toBe(true);
    expect(unstarted).toBeGreaterThan(0);
    const c = copy(s);
    apply(c, { type: 'cancel_works', order: o.id });
    const after = c.worksOrders[1]!;
    expect(c.fiscal.balances).toEqual(s.fiscal.balances);                 // no refund, no penalty
    expect(c.fiscal.ledger.length).toBe(s.fiscal.ledger.length);
    expect(after).toMatchObject({ unitsDone: o.unitsDone, spent: o.spent, stage: 'working' });
    expect(o.budget - after.budget).toBe(unstarted * FARM_YUAN);
    expect(unspentCommitments(s) - unspentCommitments(c)).toBe(unstarted * FARM_YUAN);
    expect(c.cellWorks.filter((w) => w.order === o.id)).toEqual(started);
    expect(() => apply(c, { type: 'cancel_works', order: o.id })).toThrow(/no unstarted work/);
    const end = runMonths(c, 6, rng, firstOption, STEPS);
    expect(end.worksOrders[1]).toMatchObject({ stage: 'done', spent: after.budget });
    checkOrders(end);
  });

  it('a paused order takes no crew and no money, and resumes where it stopped', () => {
    const rng = new Rng(6);
    const s0 = funded();
    let s = play(s0, 4, rng, [guide(s0), { type: 'build_road', path: SPUR, priority: 'high' }]);
    const id = s.worksOrders[0]!.id;
    const mid = { ...s.worksOrders[0]! }, roads = [...s.roads];
    expect(mid.unitsDone).toBeGreaterThan(0);
    s = play(s, 3, rng, [{ type: 'set_works_paused', order: id, paused: true }]);
    expect(s.worksOrders[0]).toMatchObject({ unitsDone: mid.unitsDone, spent: mid.spent, paused: true, waiting: 'paused' });
    expect(s.roads).toEqual(roads);
    expect(worksPaid(s, id)).toBe(mid.spent);
    s = play(s, 2, rng, [{ type: 'set_works_paused', order: id, paused: false }]);
    expect(s.worksOrders[0]!.unitsDone).toBe(mid.unitsDone + 2 * 30);
    checkOrders(s);
  });

  it('a zone removal cancels unstarted work, detaches started work, and a new commit adopts it', () => {
    const rng = new Rng(7);
    const s0 = funded();
    let s = play(s0, 18, rng, [guide(s0), { type: 'build_road', path: SPUR, priority: 'high' },
      { type: 'commit_works', zone: 1, priority: 'high' }]);
    const o = s.worksOrders[1]!;
    const started = s.cellWorks.filter((w) => w.order === o.id && w.workDone > 0).map((w) => w.cell);
    const partial = s.cellWorks.filter((w) => w.order === o.id && w.stage === 'servicing').map((w) => w.cell);
    expect(partial.length).toBeGreaterThan(0);
    s = play(s, 1, rng, [{ type: 'remove_zone', zone: 1 }]);
    const closed = s.worksOrders[1]!;
    expect(liveOrder(closed)).toBe(false);
    expect(s.cellWorks.filter((w) => w.order === undefined).map((w) => w.cell)).toEqual(started);
    expect(unspentCommitments(s)).toBe(0);
    checkOrders(s);
    s = play(s, 1, rng, [guide(s), { type: 'commit_works', zone: s.nextZoneId }]);
    const adopted = s.worksOrders.at(-1)!;
    expect(s.cellWorks.filter((w) => partial.includes(w.cell)).every((w) => w.order === adopted.id)).toBe(true);
    expect(adopted.unitsTotal).toBeLessThan(36 * FARM_UNITS);
  });
});

describe('R2 queue rules and accounts', () => {
  it('keeps population and money whole, month by month, through a works run (the shared invariants)', () => {
    const rng = new Rng(11);
    let s = funded();
    let first: PlayerAction[] = [guide(s), { type: 'build_road', path: SPUR, priority: 'high' },
      { type: 'commit_works', zone: 1, cells: PHASE, priority: 'high' },
      { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346] }];
    for (let m = 0; m < 24; m++) {
      const r = step(s, [...firstOption(s, s.pendingCards), ...first], rng, STEPS);
      first = [];
      if (r.status !== 'advanced') throw new Error(r.status);
      checkInvariants(s, r.state, r.events);
      checkLedger(s, r.state);
      checkOrders(r.state);
      s = r.state;
    }
    expect(s.worksOrders.every((o) => o.stage === 'done')).toBe(true);
  });

  it('serves the higher priority first on a scarce pool, and the other waits for capacity', () => {
    const scarce = { ...params, works: WORKS, capacity: { ...params.capacity, local_crew: 30 } };
    const steps = createTickSteps(scarce, UNGATED);
    const rng = new Rng(12);
    const go = (s: GameState, acts: PlayerAction[]) =>
      runMonths(s, 1, rng, (st, cards) => { const a = [...firstOption(st, cards), ...acts]; acts = []; return a; }, steps);
    let s = go(funded(), [{ type: 'build_road', path: SPUR, priority: 'high' },
      { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346], priority: 'high' }]);
    expect(s.worksOrders.map((o) => [o.unitsDone, o.waiting ?? null])).toEqual([[30, null], [0, 'capacity']]);
    s = go(s, [{ type: 'set_works_priority', order: 1, priority: 'low' }]);
    expect(s.worksOrders.map((o) => [o.unitsDone, o.waiting ?? null])).toEqual([[30, 'capacity'], [30, null]]);
    expect(() => go(s, [{ type: 'set_works_priority', order: 1, priority: 'urgent' as 'high' }])).toThrow(/unknown priority/);
  });

  it('a commit beyond the money raises the loan flag, and cancelling it clears the flag', () => {
    const s = initial();
    expect(s.fiscal.loanWanted).toBe(false);
    apply(s, { type: 'build_road', path: SPUR });
    expect(s.fiscal.loanWanted).toBe(true);
    apply(s, { type: 'cancel_works', order: 1 });
    expect(s.worksOrders[0]!.stage).toBe('cancelled');
    expect(s.fiscal.loanWanted).toBe(false);
    expect(unspentCommitments(s)).toBe(0);
  });

  it('cancelling an unstarted structure returns its forex quota', () => {
    const s = funded();
    const forex = s.fiscal.balances.forex;
    apply(s, { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346] });
    apply(s, { type: 'cancel_works', order: 1 });
    expect(s.fiscal.balances.forex).toBe(forex);
    expect(s.worksOrders[0]).toMatchObject({ stage: 'cancelled', spent: 0 });
  });

  it('services only buildable cells, as M4 site preparation does', () => {
    const s = funded();
    // (359,347) and (360,347) are playable but unbuildable; (361,347) is buildable
    apply(s, { type: 'create_zone', use: 'industrial', runs: [[347, 359, 361]] });
    expect(() => apply(s, { type: 'commit_works', zone: 1, cells: [[347, 360, 360]] })).toThrow(/not buildable/);
    apply(s, { type: 'commit_works', zone: 1 });
    expect(s.cellWorks.map((w) => w.cell)).toEqual([at(361, 347)]);
  });

  it('migrates a version 2 save to empty roads and orders', () => {
    const save = saveFromJson(saveToJson(saveGame(initial(), new Rng(3), content)));
    const state = { ...(save.body.state as Record<string, unknown>) };
    delete state.roads; delete state.worksOrders; delete state.nextOrderId; delete state.growth;
    const v2 = { ...save, header: { ...save.header, version: 2 }, body: { ...save.body, state } };
    const back = loadGame(v2);
    expect(back.header.version).toBe(SAVE_VERSION);   // through every later migration (R3: version 4)
    expect(back.state).toEqual(loadGame(save).state);
  });
});

describe('R2 works are saved and replayed', () => {
  it('matches an uninterrupted run after save, load and continue, and replays from the action log', () => {
    const run = (k: number) => {
      const rng = new Rng(9);
      const s0 = funded();
      const mid = play(s0, k, rng, [guide(s0), { type: 'build_road', path: SPUR, priority: 'high' },
        { type: 'commit_works', zone: 1, cells: PHASE }]);
      return { mid, rng };
    };
    const full = run(20);
    const text = saveToJson(saveGame(full.mid, full.rng, content));
    const half = run(8);
    expect(half.mid.worksOrders.some((o) => o.stage === 'working')).toBe(true);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(half.mid, half.rng, content))));
    expect(loaded.header.content.network_sha256).toBe(content.network_sha256);
    const end = play(loaded.state, 12, loaded.rng);
    expect(saveToJson(saveGame(end, loaded.rng, content))).toBe(text);
    const rng = new Rng(9);
    const again = replay(funded(), full.mid.actionLog, 20, rng, STEPS);
    expect(saveToJson(saveGame(again, rng, content))).toBe(text);
  });
});

describe('R7 road drags strip the cells that are already road (b&c §13.2)', () => {
  const roadOrders = (s: GameState) => s.worksOrders.filter((o) => o.kind === 'road');
  const cellsOf = (o: WorksOrder) => o.path!.map((c) => c.cell);

  it('extends a road from a drag that begins on it', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: [[358, 346], [358, 349]] });   // (358,346) is the Guangshen road
    const [o, ...rest] = roadOrders(s);
    expect(rest).toEqual([]);
    expect(cellsOf(o!)).toEqual([at(358, 347), at(358, 348), at(358, 349)]);
  });

  it('builds both sides of a drag that crosses a road, each from the road outward', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: [[356, 344], [356, 348]] });
    const os = roadOrders(s);
    expect(os.map(cellsOf)).toEqual([[at(356, 345), at(356, 344)], [at(356, 347), at(356, 348)]]);
    expect(new Set(os.map((o) => o.id)).size).toBe(2);
    // the preview prices both segments, and only the new cells
    const p = previewWorks(funded(), WORKS, [{ type: 'build_road', path: [[356, 344], [356, 348]] }], apply);
    expect(p.ok && p.orders.map((x) => x.cells)).toEqual([2, 2]);
  });

  it('strips a queued path too, and refuses a drag entirely along a road', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: SPUR });
    apply(s, { type: 'build_road', path: [[359, 348], [361, 348]] });   // crosses the queued spur at (360,348)
    expect(roadOrders(s).slice(1).map(cellsOf)).toEqual([[at(359, 348)], [at(361, 348)]]);
    expect(() => apply(s, { type: 'build_road', path: [[355, 346], [357, 346]] })).toThrow(/that drag adds no new road/);
    expect(roadOrders(s)).toHaveLength(3);
  });

  it('still refuses a structure on the path, and a new cell that touches no road', () => {
    const s = funded();
    apply(s, { type: 'place_structure', kind: 'power_substation', cell: [356, 345], attach: [356, 346] });
    const before = s.worksOrders.length;
    expect(() => apply(s, { type: 'build_road', path: [[356, 346], [356, 344]] })).toThrow(/holds a structure/);
    expect(() => apply(s, { type: 'build_road', path: [[362, 360]] })).toThrow(/start or end next to a road/);
    expect(s.worksOrders).toHaveLength(before);
  });

  it('cancelling one segment leaves the other', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: [[356, 344], [356, 348]] });
    const [a, b] = roadOrders(s);
    apply(s, { type: 'cancel_works', order: a!.id });
    expect(a!.stage).toBe('cancelled');
    expect(b!.stage).toBe('queued');
    expect(cellsOf(b!)).toEqual([at(356, 347), at(356, 348)]);
  });
});
