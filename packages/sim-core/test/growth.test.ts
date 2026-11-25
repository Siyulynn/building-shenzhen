/** R3: organic growth (buildings-and-construction §13.3; phase1-slice §12 R3). */
import { describe, expect, it } from 'vitest';
import {
  Rng, addServicedLand, applyZoneAction, createTickSteps, developableCells, inducedServiceJobs, loadGame, post, runMonths,
  runsOfCells, saveFromJson, saveGame, saveToJson, step, validateParams, type CellRuns, type GameState, type SimEvent,
  type SliceParams, type TickContent,
} from '../src/index.js';
import { isVillageFloor } from '../src/systems/common.js';
import { content, initial, params, slice, events } from './fixtures.js';
import { checkInvariants, checkLedger, walk } from './invariants.js';

const SEZ = 'regime.contracting_1980s', COUNTY = 'regime.county_1979';
/** The map, the pool and the accounts, but no investors and no events: every firm here comes without a card. */
const TICK: TickContent = { network: slice.tick.network!, buildable: slice.tick.buildable!, fiscal: slice.tick.fiscal! };
const STEPS = createTickSteps(params, TICK);
const G = params.growth!;
/** R10b (§5.13): the processing stream alone, for the tests that count its firms against its own numbers. */
const { collective: _collective, ...processingOnly } = G;
const PROCESSING = createTickSteps(validateParams({ ...params, growth: processingOnly }), TICK);
/** An organic firm's stream: the collectives' or the processing firms'. */
const streamOf = (f: GameState['firms'][number]) => (f.archetype === G.collective?.archetype ? G.collective : G.industrial);
const rect = (x0: number, x1: number, y0: number, y1: number): CellRuns => {
  const runs: CellRuns = [];
  for (let y = y0; y <= y1; y++) runs.push([y, x0, x1]);
  return runs;
};
// A 4 × 4 block just south of the temporary Guangshen road (row 346), in area 5: 12 of its cells are buildable.
const CONNECTED = rect(361, 364, 347, 350);
const organicFirms = (s: GameState, zone?: number) => s.firms.filter((f) => f.origin === 'organic' && (zone === undefined || f.zone === zone));
const organicM2 = (s: GameState, f: (c: GameState['blocks'][number]['cohorts'][number]) => boolean) =>
  s.blocks.reduce((n, b) => n + b.cohorts.reduce((m, c) => m + (c.builder !== undefined && f(c) ? c.m2 : 0), 0), 0);

/** A start with serviced industrial land: `runs` zones, serviced at once, under `regime`. */
function landed(zones: { use: 'industrial' | 'commercial' | 'residential'; runs: CellRuns }[], regime = SEZ): GameState {
  const s = initial();
  s.fiscal.regime = regime;
  for (const a of s.areas) a.utilities = { powerCap: a.utilities.powerCap + 50_000, waterCap: a.utilities.waterCap + 10_000 };   // ample
  for (const z of zones) {
    applyZoneAction(s, { type: 'create_zone', use: z.use, runs: z.runs });
    addServicedLand(s, z.runs);
  }
  return s;
}
const isolated = (s: GameState) => runsOfCells([...s.areas.find((a) => a.id === 5)!.cells.slice(0, 16)], s.grid.width);
const run = (s: GameState, months: number, steps = STEPS, seed = 1) => runMonths(s, months, new Rng(seed), undefined, steps);

describe('R3: organic industry on reachable land', () => {
  it('builds on a zone a road reaches, not on an isolated one, with no investor content', () => {
    const s0 = initial();
    const s = landed([{ use: 'industrial', runs: CONNECTED }, { use: 'industrial', runs: isolated(s0) }]);
    const dev = developableCells(s, TICK as { network: NonNullable<TickContent['network']> });
    expect(dev.get(1)!.length).toBe(12);
    expect(dev.get(2)!.length).toBe(0);                               // serviced, but no road in reach
    const end = walk(s, 24, new Rng(1), STEPS, (b, a, e) => { checkInvariants(b, a, e); checkLedger(b, a); });
    expect(organicFirms(end, 1).length).toBeGreaterThan(0);
    expect(organicFirms(end, 2)).toEqual([]);
    expect(end.firms.every((f) => f.origin === 'organic')).toBe(true);   // no card was ever raised
    expect(end.pendingCards.filter((c) => c.payload?.offer !== undefined)).toEqual([]);
  });

  it('fills the floor it builds: organic firms open and post jobs with no cards', () => {
    const end = run(landed([{ use: 'industrial', runs: CONNECTED }]), 24);
    const open = organicFirms(end).filter((f) => f.opens !== undefined && f.opens < end.date);
    expect(open.length).toBeGreaterThan(0);
    expect(open.reduce((n, f) => n + f.posted, 0)).toBeGreaterThan(0);
    expect(open.every((f) => f.floorM2 === streamOf(f).firm_jobs * params.industry.by_ownership[f.ownership].floor_m2_per_job)).toBe(true);
    // never beyond the zone's room: 12 developable cells × 10,000 m² × far
    expect(organicFirms(end).reduce((n, f) => n + f.floorM2 + f.dormM2, 0)).toBeLessThanOrEqual(12 * 10_000 * G.far.industrial);
  });

  it('builds more under the SEZ regime than under the county budget', () => {
    const sez = run(landed([{ use: 'industrial', runs: CONNECTED }], SEZ), 24);
    const county = run(landed([{ use: 'industrial', runs: CONNECTED }], COUNTY), 24);
    expect(organicFirms(sez).length).toBeGreaterThan(organicFirms(county).length);
  });

  it('builds no firm its area could not supply', () => {
    const s = landed([{ use: 'industrial', runs: CONNECTED }]);
    const area = s.areas.find((a) => a.id === s.zones[0]!.area)!;
    const kw = G.industrial.firm_jobs * params.industry.by_ownership.hk_processing.power_kw_per_job;
    area.utilities.powerCap = 2 * kw;                                  // two firms in full, a third at two thirds…
    const end = run(s, 24, PROCESSING);
    const firms = organicFirms(end).length;
    expect(firms).toBe(Math.floor(2 / G.industrial.min_utility_share));   // …and a fourth would fall to one half
  });

  it('banks no more than one firm of demand while no land fits', () => {
    const end = run(initial(), 12);
    expect(end.firms).toEqual([]);
    const floor = G.industrial.firm_jobs * params.industry.by_ownership.hk_processing.floor_m2_per_job;
    expect(end.growth.carry).toBeLessThanOrEqual(floor);
  });
});

describe('R3: the builder pays', () => {
  it('posts nothing to the city ledger: the accounts match a run without growth until a firm opens', () => {
    const { growth: _off, ...rest } = params;
    const noGrowth = createTickSteps(validateParams(rest), TICK);
    const a = run(landed([{ use: 'industrial', runs: CONNECTED }]), 5, PROCESSING);
    const b = run(landed([{ use: 'industrial', runs: CONNECTED }]), 5, noGrowth);
    expect(organicFirms(a).length).toBeGreaterThan(0);
    expect(a.firms.every((f) => f.opens === undefined || f.opens >= a.date)).toBe(true);   // none open yet: no taxes
    // R4 (§5.11): the builds' construction jobs draw migrants, whose baseline services the city pays; nothing else differs
    const notBaseline = (l: GameState['fiscal']['ledger']) => l.filter((e) => e.ref !== 'baseline');
    expect(notBaseline(a.fiscal.ledger)).toEqual(notBaseline(b.fiscal.ledger));
    expect(a.fiscal.ledger.length).toBe(b.fiscal.ledger.length);
    expect(a.history.resident.at(-1)).toBeGreaterThanOrEqual(b.history.resident.at(-1)!);
  });

  it('names its builder on its cohorts and work, and takes the pool after the city', () => {
    // a pool that only one job can use: a water main of 30 crew at normal priority comes first
    const P: SliceParams = validateParams({ ...params, capacity: { ...params.capacity, local_crew: 30 } });
    const steps = createTickSteps(P, TICK);
    const s = landed([{ use: 'industrial', runs: CONNECTED }]);
    post(s, 'grant', 'general', 2_000_000, 'test.fund');
    let t = run(s, 1, steps);                                           // the first organic firm is created
    expect(organicFirms(t).length).toBeGreaterThan(0);
    const r = step(t, [{ type: 'commit_project', template: 'project.water_main', area: 5 }], new Rng(2), steps);
    if (r.status !== 'advanced') throw new Error(r.status);
    t = r.state;
    const firmCohorts = t.blocks.flatMap((b) => b.cohorts).filter((c) => c.firm !== undefined);
    expect(firmCohorts.length).toBeGreaterThan(0);
    expect(firmCohorts.every((c) => (c.crewBank ?? 0) === 0 && (c.workDone ?? 0) === 0)).toBe(true);
    expect(t.fiscal.projects[0]!.workDone + t.fiscal.projects[0]!.crewBank).toBeGreaterThan(0);
    const work = r.events.filter((e: SimEvent) => e.kind === 'work' && e.detail?.builder !== undefined);
    expect(work.every((e) => typeof e.detail!.builder === 'string')).toBe(true);
  });
});

describe('R3: shops, dormitories and villages', () => {
  /** Spending raised through the factory wage, as new jobs would raise it; the base jobs' reference stays. Service
   *  wages are not spending from R4 on (§13.3's basic-sector rule). */
  function spending(s: GameState, wage = 120): GameState {
    const t = run(s, 1);
    t.labour.wage.factory = wage;
    return t;
  }

  it('the start at rest supports no new service job', () => {
    const t = run(initial(), 3);
    expect([...inducedServiceJobs(t, params).values()].every((n) => n === 0)).toBe(true);
  });

  it('worker spending builds shops on commercial land and informal shops in the villages, as legal as M2 allows', () => {
    const s = spending(landed([{ use: 'commercial', runs: CONNECTED }]));
    expect([...inducedServiceJobs(s, params).values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    const end = walk(s, 12, new Rng(1), STEPS, (b, a, e) => checkInvariants(b, a, e));
    expect(organicM2(end, (c) => c.builder === 'private' && c.archetype === 'shop_market' && c.zone === 1)).toBeGreaterThan(0);
    const villageShops = end.blocks.flatMap((b) => b.cohorts).filter((c) => c.builder === 'village_household');
    expect(villageShops.length).toBeGreaterThan(0);
    expect(villageShops.every((c) => isVillageFloor(c) && c.archetype === 'shop_market')).toBe(true);
    // the quiet start builds none of it
    const quiet = run(landed([{ use: 'commercial', runs: CONNECTED }]), 13);
    expect(organicM2(quiet, () => true)).toBe(0);
  });

  it('a pressured village adds rental floor and a quiet one does not; work units add dormitories only under pressure', () => {
    const s = landed([{ use: 'residential', runs: CONNECTED }], SEZ);
    const area = s.zones[0]!.area;
    const g = s.pops.find((x) => x.area === area && x.kind === 'migrant_factory')!;
    const crowd = 400;                                                // migrants beyond the area's rental beds
    g.size += crowd; g.stayedSixMonths += crowd; g.present += crowd;
    const before = (t: GameState, a: number) => t.blocks.find((b) => b.area === a)!.cohorts
      .reduce((n, c) => n + (c.archetype === 'village_rental' ? c.m2 : 0), 0);
    const end = run(s, 12);
    const quietArea = 4;
    expect(before(end, area)).toBeGreaterThan(before(s, area));
    expect(before(end, quietArea)).toBe(before(s, quietArea));
    expect(organicM2(end, (c) => c.builder === 'work_unit' && c.archetype === 'dormitory')).toBeGreaterThan(0);
    const calm = run(landed([{ use: 'residential', runs: CONNECTED }], SEZ), 12);
    expect(organicM2(calm, () => true)).toBe(0);
  });
});

describe('R3: rest and saves', () => {
  it('builds nothing organic in 63 months with no zones', () => {
    // without the accounts, so the grant cliff raises no deficit card to answer
    const steps = createTickSteps(params, { network: TICK.network!, buildable: TICK.buildable! });
    const end = walk(initial(), 63, new Rng(5), steps, checkInvariants);
    expect(end.firms).toEqual([]);
    expect(organicM2(end, () => true)).toBe(0);
  });

  it('save, load and continue matches an uninterrupted run; a version 3 save loads', () => {
    const s = landed([{ use: 'industrial', runs: CONNECTED }, { use: 'commercial', runs: rect(366, 369, 347, 350) }]);
    const rng = new Rng(7);
    const whole = runMonths(s, 20, rng, undefined, STEPS);
    const rngA = new Rng(7);
    const mid = runMonths(s, 9, rngA, undefined, STEPS);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rngA, content))));
    const cont = runMonths(loaded.state, 11, loaded.rng, undefined, STEPS);
    expect(saveToJson(saveGame(cont, loaded.rng, content))).toBe(saveToJson(saveGame(whole, rng, content)));
    const save = saveFromJson(saveToJson(saveGame(initial(), new Rng(3), content)));
    const state = { ...(save.body.state as Record<string, unknown>) };
    delete state.growth;
    const back = loadGame({ ...save, header: { ...save.header, version: 3 }, body: { ...save.body, state } }, { events });
    expect(back.state.growth).toEqual({ carry: 0 });
  });
});
