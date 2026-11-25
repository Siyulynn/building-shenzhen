/**
 * R8d's tests (phase1-slice.md §5.12): road tiers and freight through the gateways. Widest paths over the road cells,
 * pro-rata gateway shares, and where a shortfall lands: firm posts for exports and inputs, the pace of building for
 * materials. Nothing here is stored: every share is recomputed from state.
 */
import { describe, expect, it } from 'vitest';
import {
  Rng, aggressive, allocateFreight, applyTurnAction, areaShare, cloneState, createInitialState, createTickSteps,
  firmFreight, firstOption, freightContent, freightNetwork, loadGame, parseYM, playQuarters, policyNamed, post,
  postFirmJobs, roadClasses, runMonths, saveGame, saveFromJson, saveToJson, setRoadClass, step, widestPaths,
  type FreightContent, type FreightNetwork, type GameState, type Gateway, type PlayerAction,
} from '../src/index.js';
import { content, initial, params, slice } from './fixtures.js';
import { checkInvariants, checkLedger } from './invariants.js';

const STEPS = createTickSteps(params, slice.tick);
const FC = freightContent(params, slice.tick.network, slice.tick.gateways)!;
const C = params.works!.roads!.classes;
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);
const W = initial().grid.width;
const at = (x: number, y: number) => y * W + x;
const gw = (id: string) => FC.gateways.find((g) => g.id === id)!;
const funded = () => { const s = initial(); post(s, 'grant', 'general', 5_000_000, 'test.fund'); return s; };

describe('R8d widest paths', () => {
  it('picks the avenue over a parallel track, and reports the weakest cell on the way', () => {
    // a 5 × 3 grid: the source (5) and the target (9) are avenue cells at the ends of row 1, which is empty between;
    // a track runs along row 0 and a street along row 2, each joined to both ends
    const cap = new Map<number, number>([[5, C.avenue.capacity_t_month], [9, C.avenue.capacity_t_month]]);
    for (let x = 0; x < 5; x++) { cap.set(x, C.track.capacity_t_month); cap.set(10 + x, C.street.capacity_t_month); }
    const { width, via } = widestPaths(5, 3, cap, [5]);
    expect(width.get(9)).toBe(C.street.capacity_t_month);                    // along the street, not the track
    expect(cap.get(via.get(9)!)).toBe(C.street.capacity_t_month);            // the weakest cell is a street cell
    // without the street, the track is the only way
    for (let x = 0; x < 5; x++) cap.delete(10 + x);
    expect(widestPaths(5, 3, cap, [5]).width.get(9)).toBe(C.track.capacity_t_month);
  });
});

describe('R8d allocation', () => {
  const g: Gateway = { id: 'gateway.test', name: { zh: '测', en: 'test' }, site: 'site.test', cell: 0, faces: 'hong_kong', mode: 'rail',
    capacity: { out: 100, in: 0 }, claims: [] };
  const fc: FreightContent = { ...FC, gateways: [g] };
  const net = (paths: Record<number, number>): FreightNetwork =>
    ({ reach: [], access: new Map(), path: (area) => ({ capacity: paths[area] ?? 0 }) });

  it('shares a full gateway pro rata to what each area can bring, by largest remainder in area order', () => {
    const d = (area: number, t: number) => ({ area, face: 'hong_kong' as const, mode: 'rail' as const, dir: 'out' as const, t });
    const a = allocateFreight(fc, net({ 1: 1e9, 2: 1e9, 3: 1e9 }), [d(3, 50), d(1, 50), d(2, 50)]);
    expect(a.areas.map((x) => [x.area, x.flow])).toEqual([[1, 34], [2, 33], [3, 33]]);
    expect(a.gateways.find((x) => x.dir === 'out')).toMatchObject({ demand: 150, flow: 100, capacity: 100 });
    // an area's flow never exceeds its weakest cell: area 1 brings 10, the rest share what is left of the demand's split
    const b = allocateFreight(fc, net({ 1: 10, 2: 1e9 }), [d(1, 80), d(2, 80)]);
    expect(b.areas.find((x) => x.area === 1)!.flow).toBe(10);
    expect(b.areas.find((x) => x.area === 2)!.flow).toBeLessThanOrEqual(80);
    expect(areaShare(b, 1, 'out')).toBeCloseTo(10 / 80, 12);
    // an area that reaches no gateway is not constrained (so it can build the road that connects it)
    const c = allocateFreight(fc, net({}), [d(4, 500)]);
    expect(c.areas[0]).toMatchObject({ flow: 500, demand: 500 });
    expect(c.areas[0]!.gateway).toBeUndefined();
    expect(areaShare(c, 4, 'out')).toBe(1);
  });

  it('sums an area\'s rail and road flows into one gateway before its weakest cell caps them', () => {
    const road: Gateway = { ...g, id: 'gateway.road', mode: 'road', capacity: { out: 1000, in: 0 } };
    const two: FreightContent = { ...FC, gateways: [{ ...g, capacity: { out: 1000, in: 0 } }, road] };
    const d = (mode: 'rail' | 'road', t: number) => ({ area: 1, face: 'hong_kong' as const, mode, dir: 'out' as const, t });
    // the road gateway is not reached: the road flow joins the rail one, and the two together get the path's 30 t
    const one: FreightNetwork = { reach: [], access: new Map(), path: (_a, x) => ({ capacity: x.id === 'gateway.test' ? 30 : 0 }) };
    const a = allocateFreight(two, one, [d('rail', 40), d('road', 40)]);
    expect(a.areas).toEqual([expect.objectContaining({ gateway: 'gateway.test', demand: 80, flow: 30 })]);
    // a flow takes the wider path, its own mode's on a tie: a narrow road to the road gateway does not narrow it
    const narrow: FreightNetwork = { reach: [], access: new Map(), path: (_a, x) => ({ capacity: x.id === 'gateway.test' ? 30 : 5 }) };
    expect(allocateFreight(two, narrow, [d('road', 40)]).areas[0]).toMatchObject({ gateway: 'gateway.test', flow: 30 });
    const even: FreightNetwork = { reach: [], access: new Map(), path: () => ({ capacity: 30 }) };
    expect(allocateFreight(two, even, [d('road', 40)]).areas[0]).toMatchObject({ gateway: 'gateway.road', flow: 30 });
  });
});

describe('R8d the start network', () => {
  it('reaches the yards of Luohu, the station and the Guangshen road, but not Wenjindu; nothing binds in 1979', () => {
    const s = initial(), net = freightNetwork(s, FC);
    for (const id of ['gateway.luohu', 'gateway.shenzhen_station', 'gateway.guangshen_road']) {
      expect(net.reach.find((r) => r.gateway.id === id)!.width.size).toBeGreaterThan(0);
    }
    expect(net.reach.find((r) => r.gateway.id === 'gateway.wenjindu')!.width.size).toBe(0);
    expect(net.path(7, gw('gateway.luohu')).capacity).toBe(C.street.capacity_t_month);
    const t = runMonths(s, 12, new Rng(1), firstOption, STEPS);
    for (const row of Object.values(t.history.freightUnmet ?? {})) expect(row.every((v) => v === 0)).toBe(true);
    expect(t.history.freightUnmet!['gateway.luohu:out']!.length).toBe(t.history.months.length);
  });
});

describe('R8d road classes', () => {
  it('upgrades a start road: the override changes, s.roads and readiness do not, and it costs the difference in units', () => {
    let s = funded();
    apply(s, { type: 'build_road', path: [[355, 346], [358, 346]], class: 'avenue' });
    const o = s.worksOrders[0]!;
    expect(o.path!.every((c) => c.upgrade && c.class === 'avenue')).toBe(true);
    expect(o.unitsTotal).toBe(4 * (C.avenue.units_per_cell - C.street.units_per_cell));
    // a street over a street adds nothing; an unknown class is refused
    expect(() => apply(s, { type: 'build_road', path: [[350, 346], [352, 346]] })).toThrow(/adds no new road/);
    expect(() => apply(s, { type: 'build_road', path: [[350, 346], [352, 346]], class: 'motorway' as never })).toThrow(/unknown road class/);
    for (let m = 0; m < 3 && o.stage !== 'done'; m++) {
      const r = step(s, firstOption(s, s.pendingCards), new Rng(m), STEPS);
      if (r.status !== 'advanced') throw new Error(r.status);
      checkInvariants(s, r.state, r.events);
      checkLedger(s, r.state);
      s = r.state;
    }
    expect(s.worksOrders[0]!.stage).toBe('done');
    expect(s.roads).toEqual([]);
    const k = roadClasses(s, slice.startNetwork);
    expect([355, 356, 357, 358].map((x) => k.get(at(x, 346)))).toEqual(['avenue', 'avenue', 'avenue', 'avenue']);
    expect(k.get(at(354, 346))).toBe('street');
    // a later avenue drag over the avenue is stripped
    expect(() => apply(s, { type: 'build_road', path: [[355, 346], [358, 346]], class: 'avenue' })).toThrow(/adds no new road/);
  });

  it('builds a new track at a track\'s units and records its class', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: [[369, 357], [369, 353]], class: 'track' });
    const o = s.worksOrders[0]!;
    expect(o.path!.every((c) => c.class === 'track' && !c.upgrade)).toBe(true);
    expect(o.path!.filter((c) => !c.bridge).every((c) => c.units === C.track.units_per_cell)).toBe(true);
  });
});

describe('R8d where the shortfall lands', () => {
  it('an unmet export share lowers that firm\'s posts and nothing else', () => {
    const rec = playQuarters(createInitialState(slice.init), new Rng(1), STEPS, aggressive(params, slice.tick), 12);
    const s = cloneState(rec.final);
    postFirmJobs(s, params);
    const before = s.firms.map((f) => f.posted);
    const target = s.firms.find((f) => f.posted > 0 && firmFreight(f, FC.freight))!;
    postFirmJobs(s, params, undefined, () => (f) => (f === target ? 0.5 : 1));
    expect(s.firms.map((f) => f.posted)).toEqual(before.map((n, i) => (s.firms[i] === target ? Math.floor(n * 0.5) : n)));
  });

  it('a firm in existing premises, or of an archetype with no freight entry, needs no gateway', () => {
    const s = initial();
    const f = { archetype: 'investor.hk_processing', premises: 'existing' } as GameState['firms'][number];
    expect(firmFreight(f, FC.freight)).toBeUndefined();
    expect(firmFreight({ ...f, premises: 'new_factory', archetype: 'nobody' }, FC.freight)).toBeUndefined();
    expect(firmFreight({ ...f, premises: 'new_factory' }, FC.freight)).toBeDefined();
    expect(s.firms.length).toBe(0);
  });

  it('a short materials flow slows a works order without losing money or work', () => {
    const tight = { ...slice.tick, gateways: slice.tick.gateways!.map((g) => g.id === 'gateway.shenzhen_station'
      ? { ...g, capacity: { ...g.capacity, in: 20 * params.freight!.t_per_crew_month } } : g) };
    const steps = { full: STEPS, tight: createTickSteps(params, tight) };
    const run = (k: keyof typeof steps) => {
      let s = funded();
      applyTurnAction(s, { type: 'build_road', path: [[369, 357], [369, 353]] }, steps[k]);
      const done: number[] = [];
      for (let m = 0; m < 4; m++) {
        const r = step(s, firstOption(s, s.pendingCards), new Rng(m), steps[k]);
        if (r.status !== 'advanced') throw new Error(r.status);
        checkInvariants(s, r.state, r.events);
        checkLedger(s, r.state);
        s = r.state;
        done.push(s.worksOrders[0]!.unitsDone);
      }
      return { s, done };
    };
    const full = run('full'), tightRun = run('tight');
    expect(tightRun.done[0]).toBeLessThan(full.done[0]!);
    expect(tightRun.done[0]).toBeLessThanOrEqual(20);
    // paid for exactly the work done, at the order's rate; nothing refunded or lost
    for (const r of [full, tightRun]) {
      const o = r.s.worksOrders[0]!;
      expect(o.spent).toBe(Math.round((params.works!.road.yuan_per_cell / params.works!.road.units_per_cell) * o.unitsDone));
    }
    expect(tightRun.s.history.freightUnmet!['gateway.shenzhen_station:in']!.some((v) => v > 0)).toBe(true);
  });
});

describe('R8d the road is the lever', () => {
  it('at the aggressive plan\'s first short quarter, an avenue corridor posts more over the next quarter', () => {
    const rec = playQuarters(createInitialState(slice.init), new Rng(1), STEPS, aggressive(params, slice.tick));
    const unmet = (s: GameState) => (s.history.freightUnmet?.['gateway.luohu:out'] ?? []).slice(-3).reduce((a, b) => a + b, 0);
    const q = rec.quarterEnds.findIndex((s) => unmet(s) > 0);
    const s0 = rec.quarterEnds[q]!;
    const wide = cloneState(s0);
    for (const c of roadClasses(wide, slice.startNetwork).keys()) setRoadClass(wide, c, 'avenue');
    const posts = (s: GameState) => {
      let n = 0;
      for (let m = 0; m < 3; m++) { s = runMonths(s, 1, new Rng(9 + m), firstOption, STEPS); n += s.firms.reduce((k, f) => k + f.posted, 0); }
      return n;
    };
    expect(posts(wide)).toBeGreaterThan(posts(cloneState(s0)));
  });
});

describe('R8d calibration', () => {
  const unmetBy = (s: GameState) => Object.values(s.history.freightUnmet ?? {}).reduce((n, row) => n + row.reduce((a, b) => a + b, 0), 0);
  const run = (policy: string) => playQuarters(createInitialState(slice.init), new Rng(1), STEPS, policyNamed(policy, params, 1, slice.tick));

  it('the aggressive plan meets the limit by the end of the 1982 turns; the prologue years are never constrained', () => {
    const rec = run('aggressive');
    const q = rec.quarterEnds.findIndex((s) => unmetBy(s) > 0);
    expect(q).toBeGreaterThanOrEqual(0);
    expect(rec.quarterEnds[q]!.date).toBeLessThanOrEqual(parseYM('1982-12'));
    for (const policy of ['historical_prologue', 'aggressive']) {
      const r = policy === 'aggressive' ? rec : run(policy);
      const end1980 = r.quarterEnds.find((s) => s.date >= parseYM('1980-12'))!;
      expect(unmetBy(end1980)).toBe(0);
    }
  });
});

describe('R8d nothing is stored', () => {
  it('a clone and a saved and loaded state give the same allocation', () => {
    const rec = playQuarters(createInitialState(slice.init), new Rng(1), STEPS, aggressive(params, slice.tick), 15);
    const s = rec.final;
    const alloc = (t: GameState) => {
      const net = freightNetwork(t, FC);
      return allocateFreight(FC, net, t.firms.filter((f) => f.posted > 0 && firmFreight(f, FC.freight)).map((f) =>
        ({ area: f.area, face: 'hong_kong' as const, mode: 'rail' as const, dir: 'out' as const, t: f.posted * 2 })));
    };
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(s, new Rng(1), content)))).state;
    expect(alloc(cloneState(s))).toEqual(alloc(s));
    expect(alloc(loaded)).toEqual(alloc(s));
    expect(roadClasses(loaded, slice.startNetwork)).toEqual(roadClasses(s, slice.startNetwork));
  });
});
