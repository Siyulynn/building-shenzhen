/**
 * R4.5: map works earn the M-series credit (phase1-slice §5.7, §5.8; buildings-and-construction §13.2). A run that
 * builds only from the map moves readiness, the review's projects and the site-preparation milestone.
 */
import { describe, expect, it } from 'vitest';
import {
  Rng, applyTurnAction, conditionHolds, createTickSteps, firstOption, indicatorValue, post, reachClasses, readiness, runMonths, validateParams,
  type GameState, type PlayerAction,
} from '../src/index.js';
import { initial, params, slice, UNGATED } from './fixtures.js';

const STEPS = createTickSteps(params, UNGATED);
const NO_GROWTH = createTickSteps({ ...params, growth: undefined }, UNGATED);
const W = slice.init.areas.grid.width;
const at = (x: number, y: number) => y * W + x;
const apply = (s: GameState, a: PlayerAction) => applyTurnAction(s, a, STEPS);

// Shangbu (area 7, a readiness area) along the temporary Guangshen road's row 352
const ZONE: PlayerAction = { type: 'create_zone', use: 'industrial', runs: [[353, 366, 368]] };
const ROAD_TOWARD: [number, number][] = [[369, 357], [369, 353]];   // drawn toward the network: its end touches row 352
const SOURCES: PlayerAction[] = [
  { type: 'place_structure', kind: 'power_substation', cell: [372, 351], attach: [372, 352], priority: 'high' },
];

function funded(): GameState {
  const s = initial();
  post(s, 'grant', 'general', 5_000_000, 'test.fund');
  return s;
}
/** Month by month, answering every card with its first option; `first` are turn actions in the first month. */
function months(s: GameState, n: number, rng: Rng, first: PlayerAction[], each: (s: GameState) => void = () => {},
  steps = STEPS): GameState {
  let todo = first;
  for (let i = 0; i < n; i++) {
    s = runMonths(s, 1, rng, (st, cards) => { const a = [...firstOption(st, cards), ...todo]; todo = []; return a; }, steps);
    each(s);
  }
  return s;
}
const MAP_WORKS: PlayerAction[] = [ZONE, { type: 'build_road', path: ROAD_TOWARD, priority: 'high' },
  { type: 'commit_works', zone: 1, priority: 'high' }, ...SOURCES];

describe('R4.5 build_road accepts either end', () => {
  it('reverses a path whose last cell touches the network, and still refuses one with neither end touching', () => {
    const s = funded();
    apply(s, { type: 'build_road', path: ROAD_TOWARD });
    expect(s.worksOrders[0]!.path!.map((c) => c.cell)).toEqual([353, 354, 355, 356, 357].map((y) => at(369, y)));
    expect(() => apply(s, { type: 'build_road', path: [[362, 360], [362, 365]] })).toThrow(/start or end next to a road/);
  });
});

describe('R4.5 a map-only run earns the M-series credit', () => {
  it('moves all three parts of readiness', () => {
    // the same seed left idle: its cards' first options commit the same M4 projects (a road link in area 2)
    const idle = months(funded(), 12, new Rng(5), [], () => {}, NO_GROWTH);
    const before = readiness(idle, params, UNGATED.buildable);
    // R8c: a substation delivers only what the city pool holds, so the run also buys power for it to carry
    const s = months(funded(), 12, new Rng(5), [...MAP_WORKS, { type: 'buy_power', kw: 1000 }], () => {}, NO_GROWTH);
    expect(s.fiscal.projects.map((x) => [x.template, x.area, x.stage])).toEqual(idle.fiscal.projects.map((x) => [x.template, x.area, x.stage]));
    expect(s.areas.map((a) => [a.roadKm, a.utilities])).toEqual(idle.areas.map((a) => [a.roadKm, a.utilities]));
    expect(s.worksOrders.every((o) => o.stage === 'done')).toBe(true);
    const r = readiness(s, params, UNGATED.buildable);
    expect(r.roads).toBeGreaterThan(before.roads);
    expect(r.servicedLand).toBeGreaterThan(before.servicedLand);
    expect(r.waterPower).toBeGreaterThan(before.waterPower);
    expect(s.areas.find((a) => a.id === 7)!.roadKm).toBe(0);                  // the count is readiness's alone
  });

  it('counts done works orders as completed projects in the review window', () => {
    const s = months(funded(), 12, new Rng(6), MAP_WORKS);
    const end = s.history.months.at(-1)!;
    const m4 = s.fiscal.projects.filter((x) => x.completed !== undefined && x.completed > end - 12).length;
    expect(s.worksOrders.filter((o) => o.stage === 'done').length).toBe(MAP_WORKS.length - 1);   // the zone is not an order
    expect(indicatorValue(s, params, 'projects_completed')).toBe(m4 + MAP_WORKS.length - 1);
  });

  it('meets the site-preparation milestone with a works service order, and not with a cancelled one', () => {
    const s = funded();
    expect(conditionHolds(s, 'site_preparation_committed')).toBe(false);
    apply(s, ZONE);
    apply(s, { type: 'commit_works', zone: 1 });
    expect(conditionHolds(s, 'site_preparation_committed')).toBe(true);
    apply(s, { type: 'cancel_works', order: s.worksOrders[0]!.id });
    expect(s.worksOrders[0]!.stage).toBe('cancelled');
    expect(conditionHolds(s, 'site_preparation_committed')).toBe(false);
  });
});

describe('R4.5 a placed school feeds its area as an M4 school does', () => {
  it('adds its places to the area and owes payroll and service from the next month', () => {
    const F = params.works!.facilities.school!;
    const s0 = funded();
    const area = (st: GameState) => st.areas.find((a) => a.access === 'playable' && a.cells.includes(at(370, 351)))!;
    const before = area(s0).facilities.schoolPlaces;
    const s = months(s0, 8, new Rng(7), [{ type: 'place_structure', kind: 'facility', facility: 'school', cell: [370, 351],
      attach: [370, 352], priority: 'high' }]);
    const o = s.worksOrders[0]!;
    expect(o.stage).toBe('done');
    expect(s.structures).toMatchObject([{ kind: 'facility', facility: 'school', cell: at(370, 351), capacity: F.capacity }]);
    expect(area(s).facilities.schoolPlaces).toBe(before + F.capacity);
    expect(s.areas.filter((a) => a !== area(s)).every((a) => a.facilities.schoolPlaces === 0)).toBe(true);
    const mine = s.fiscal.obligations.filter((x) => x.createdBy === `works.${o.id}`);
    expect(mine.map((x) => x.kind).sort()).toEqual(['maintenance', 'payroll', 'service']);
    const pay = mine.find((x) => x.kind === 'payroll')!;
    expect(pay).toMatchObject({ index: 'wages', from: o.completed! + 1, perMonth: Math.round(F.staff! * pay.baseWage!) });
    expect(mine.find((x) => x.kind === 'service')!.perMonth).toBe(F.capacity * F.service_per_place_month!);
  });

  it('refuses a facility type with no area stock to feed', () => {
    const bad = { ...params, works: { ...params.works!, facilities: { ...params.works!.facilities, clinic: params.works!.facilities.school! } } };
    expect(() => validateParams(bad)).toThrow(/no area stock/);
  });
});

describe('R4.5 the start network joins Area 2 to Area 1', () => {
  it('puts the town and the station in one reach class; areas 4 and 6 stay alone', () => {
    const c = reachClasses(initial(), slice.startNetwork);
    expect(c.get(2)).toBe(c.get(1));
    for (const a of [4, 6]) expect([...c].filter(([, k]) => k === c.get(a)).map(([x]) => x)).toEqual([a]);
    const jianshe = slice.startNetwork.routes.find((r) => r.id === 'site.jianshe_road')!;
    expect(jianshe).toMatchObject({ kind: 'road', placement: 'temporary' });
    expect(jianshe.cells.length).toBe(13);
  });
});
