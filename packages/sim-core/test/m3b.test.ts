/** M3b's tests (phase1-slice.md §5.5): firms, production, utilities, the answered queue and determinism. */
import { describe, expect, it } from 'vitest';
import {
  Rng, createTickSteps, loadGame, replay, runMonths, saveFromJson, saveGame, saveToJson, step, validateParams,
  type GameState, type TickStep,
} from '../src/index.js';
import { leave } from '../src/systems/common.js';
import { createFirm, sizeOffer, type FirmSite } from '../src/systems/industry.js';
import { content, initial, params, precedents } from './fixtures.js';
import { checkFirms, checkInvariants, walk } from './invariants.js';

const STEPS = createTickSteps(params, { precedents });
const HK = 'investor.hk_processing';
const BUILD = params.investors.archetypes[HK]!.build_months;
const RAMP = params.investors.archetypes[HK]!.ramp_months;
const OPEN = BUILD - 1;                          // work begins in the month of acceptance (month 0)

/** The initial state with one Hong Kong processing firm of `jobs` jobs sited in month 0. */
function withFirm(jobs = 200, site: FirmSite = { premises: 'new_factory', area: 7, zone: 1 }, mut?: (s: GameState) => void) {
  const s = initial();
  mut?.(s);
  createFirm(s, params, sizeOffer(params, HK, 'hk_processing', jobs), site);
  return s;
}
const run = (s0: GameState, months: number, seed = 1, steps: readonly TickStep[] = STEPS) =>
  walk(s0, months, new Rng(seed), steps, checkInvariants);
const series = (s0: GameState, months: number, seed = 1) => run(s0, months, seed).history;
const row = (s: GameState, area: number, sector: string) => s.labour.jobs.find((r) => r.area === area && r.sector === sector)!;

describe('M3b params', () => {
  it('validates the industry and investor params', () => {
    expect(() => validateParams({ ...params, investors: { ...params.investors, offer_months: 3 } })).toThrow(/outlives a quarter/);
    expect(() => validateParams({ ...params, industry: { ...params.industry, max_far: 0 } })).toThrow(/max_far/);
    const bad = { ...params.investors.archetypes, [HK]: { ...params.investors.archetypes[HK]!, jobs: [50, 10] as [number, number] } };
    expect(() => validateParams({ ...params, investors: { ...params.investors, archetypes: bad } })).toThrow(/jobs/);
  });

  it('seeds the spare utilities per area from the start content', () => {
    expect(initial().areas.find((a) => a.id === 7)!.utilities).toEqual({ waterCap: 60, powerCap: 120 });
  });
});

describe('M3b firms: the loop', () => {
  it('builds a factory and dormitory, then hires, ramps up and produces', () => {
    const s0 = withFirm();
    // 200 jobs: 2,000 m² of factory, and 0.3 dormitory beds a job at 5 m² a bed
    expect(s0.firms[0]).toMatchObject({ id: 1, area: 7, zone: 1, jobs: 200, floorM2: 2000, dormM2: 300 });
    expect(s0.firms[0]!.opens).toBeUndefined();
    expect(s0.nextFirmId).toBe(2);
    const bare = series(initial(), 24), end = run(s0, 24), h = end.history;
    expect(end.firms[0]!.opens).toBe(s0.date + OPEN);

    // under construction: 2,300 m² while the work lasts, then none
    expect(h.underConstructionM2[0]! - bare.underConstructionM2[0]!).toBe(2300);
    expect(h.underConstructionM2[OPEN - 1]! - bare.underConstructionM2[OPEN - 1]!).toBe(2300);
    expect(h.underConstructionM2[OPEN]! - bare.underConstructionM2[OPEN]!).toBe(0);
    const cons = (x: typeof h, m: number) => x.jobs.construction[m]!;
    expect(cons(h, 0) - cons(bare, 0)).toBe(Math.floor(2300 * params.labour.construction_jobs_per_m2));

    // no factory jobs before it opens; then the ramp: a third, two thirds, all of them
    expect(h.firmJobs.slice(0, OPEN).every((n) => n === 0)).toBe(true);
    expect(h.firmJobs.slice(OPEN, OPEN + RAMP + 1)).toEqual([66, 133, 200, 200]);
    expect(h.rentalBeds[OPEN]! - bare.rentalBeds[OPEN]!).toBe(300 / params.housing.m2_per_bed.dormitory);

    // output at 400 a job-month, all exported, a fifth of it value added; none without the firm
    expect(h.firmStaffed[23]).toBe(200);                         // the start's idle locals staff a small firm
    expect(h.output[23]).toBe(h.firmStaffed[23]! * 400);
    expect(h.exports[23]).toBe(h.output[23]);
    expect(h.valueAdded[23]).toBeCloseTo(h.output[23]! * 0.2, 6);
    expect(bare.output.every((x) => x === 0)).toBe(true);
  });

  it('opens on completion, not on the estimate: a cohort with more work left opens later', () => {
    const s0 = withFirm();
    for (const c of s0.blocks.find((b) => b.area === 7)!.cohorts) if (c.firm === 1) c.workTotal = BUILD + 4;
    const end = run(s0, BUILD + 6);
    expect(end.firms[0]!.opens).toBe(s0.date + BUILD + 3);
    expect(end.history.firmJobs.slice(0, BUILD + 3).every((n) => n === 0)).toBe(true);
  });

  it('draws migrants and fills beds once a firm outgrows the local slack', () => {
    const big = (s: GameState) => { s.areas.find((a) => a.id === 7)!.utilities = { waterCap: 1000, powerCap: 1000 }; };
    const bare = run(initial(), 36), end = run(withFirm(1000, undefined, big), 36), h = end.history;
    expect(h.firmJobs[OPEN + RAMP]).toBe(1000);
    expect(h.migrants[35]!).toBeGreaterThan(bare.history.migrants[35]! + 300);
    expect(h.firmStaffed[35]!).toBeGreaterThan(900);
    // housing demand: the dormitory's 300 beds, then village rental floor for the rest
    expect(h.rentalBeds[35]! - bare.history.rentalBeds[35]!).toBeGreaterThan(300);
    const rentalOccupants = (s: GameState) => s.housing.reduce((a, m) => a + m.occupants.rental, 0);
    expect(rentalOccupants(end) - rentalOccupants(bare)).toBeGreaterThan(300);
  });

  it('keeps firm staffing within its row when people leave after matching', () => {
    const big = (s: GameState) => { s.areas.find((a) => a.id === 7)!.utilities = { waterCap: 1000, powerCap: 1000 }; };
    const s = run(withFirm(1000, undefined, big), OPEN + 6);
    const g = s.pops.find((x) => x.area === 7 && x.kind === 'migrant_factory')!;
    leave(s, g, g.size, params);                                   // every factory migrant in area 7 goes
    const r = row(s, 7, 'factory');
    expect(s.firms[0]!.staffed).toBeLessThanOrEqual(r.filled);
    checkFirms(s);
  });

  it('caps posts at the area utility share: a small power cap binds output', () => {
    // 200 jobs need 100 kW; 50 kW gives half
    const h = series(withFirm(200, undefined, (s) => { s.areas.find((a) => a.id === 7)!.utilities.powerCap = 50; }), BUILD + 6);
    expect(h.firmJobs[OPEN + 5]).toBe(100);
    const full = series(withFirm(), BUILD + 6);
    expect(full.output[OPEN + 5]!).toBeGreaterThan(h.output[OPEN + 5]!);
    // two firms share the area's capacity
    const two = withFirm(200, undefined, (s) => { s.areas.find((a) => a.id === 7)!.utilities.powerCap = 150; });
    createFirm(two, params, sizeOffer(params, HK, 'hk_processing', 200), { premises: 'new_factory', area: 7, zone: 1 });
    const end = run(two, BUILD + 6);
    expect(end.firms.map((f) => f.posted)).toEqual([150, 150]);
  });

  it('opens a firm in existing premises the next month, builds nothing and produces at the premises factor', () => {
    const s0 = withFirm(100, { premises: 'existing', area: 1 });
    expect(s0.firms[0]).toMatchObject({ premises: 'existing', floorM2: 0, dormM2: 0, opens: s0.date + 1 });
    expect(s0.firms[0]!.zone).toBeUndefined();
    const end = run(s0, 12);
    const f = end.firms[0]!;
    expect(end.history.firmJobs.slice(0, 4)).toEqual([0, 33, 66, 100]);
    expect(f.output).toBeCloseTo(f.staffed * 400 * params.industry.premises_output_factor, 6);
    expect(end.history.underConstructionM2[0]).toBe(series(initial(), 1).underConstructionM2[0]);
  });

  it('shares an area factory row between base jobs and firms, whole', () => {
    const end = run(withFirm(), BUILD + 8, 3);
    const r = row(end, 7, 'factory'), f = end.firms[0]!;
    expect(r.jobs).toBe(end.labour.baseJobs.find((b) => b.area === 7 && b.sector === 'factory')!.jobs + f.posted);
    expect(f.staffed).toBeGreaterThan(0);
  });
});

describe('M3b answers reach their system', () => {
  it('keeps an answer through a paused call and hands it to the next tick, then clears it', () => {
    const seen: string[][] = [];
    const steps: TickStep[] = STEPS.map((st) => st.name !== 'events' ? st : { name: 'events', run: (ctx) => {
      seen.push(ctx.state.answered.map((a) => `${a.card.card}:${a.option}`));
      const n = ctx.state.history.months.length;
      if (n === 0) {
        ctx.raise({ card: 'fixture.offer', options: ['yes', 'no'], interrupting: false });
        ctx.raise({ card: 'fixture.stop', options: ['ok'], interrupting: true });
        ctx.raise({ card: 'fixture.stop2', options: ['ok'], interrupting: true });
      }
    } });
    const rng = new Rng(4);
    const r1 = step(initial(), [], rng, steps);
    const [offer, stop, stop2] = r1.state.pendingCards;
    const paused = step(r1.state, [{ type: 'answer_card', instance: offer!.id, option: 'yes' },
      { type: 'answer_card', instance: stop!.id, option: 'ok' }], rng, steps);
    expect(paused.status).toBe('paused');
    expect(paused.state.answered.map((a) => a.option)).toEqual(['yes', 'ok']);
    const ok = step(paused.state, [{ type: 'answer_card', instance: stop2!.id, option: 'ok' }], rng, steps);
    expect(ok.status).toBe('advanced');
    expect(seen[1]).toEqual(['fixture.offer:yes', 'fixture.stop:ok', 'fixture.stop2:ok']);
    expect(ok.state.answered).toEqual([]);
  });
});

describe('M3b determinism', () => {
  it('save, load and continue, and replay, give the same game with a firm', () => {
    const rng = new Rng(9);
    const end = runMonths(withFirm(), 20, rng, undefined, STEPS);
    const text = saveToJson(saveGame(end, rng, content));
    const rngA = new Rng(9);
    const mid = runMonths(withFirm(), 11, rngA, undefined, STEPS);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rngA, content))));
    const cont = runMonths(loaded.state, 9, loaded.rng, undefined, STEPS);
    expect(saveToJson(saveGame(cont, loaded.rng, content))).toBe(text);
    const rngB = new Rng(9);
    expect(saveToJson(saveGame(replay(withFirm(), end.actionLog, 20, rngB, STEPS), rngB, content))).toBe(text);
  });

  it('changes no input state: firms and a card with a payload', () => {
    const s0 = withFirm();
    s0.pendingCards.push({ id: 'fixture.x@0', card: 'fixture.x', options: ['a'], interrupting: false, raisedAt: s0.date,
      payload: { offer: { jobs: 5 } }, expires: s0.date + 6 });
    const before = saveToJson(saveGame(s0, new Rng(5), content));
    const r = step(s0, [{ type: 'answer_card', instance: 'fixture.x@0', option: 'a' }], new Rng(5), STEPS);
    expect(r.status).toBe('advanced');
    expect(saveToJson(saveGame(s0, new Rng(5), content))).toBe(before);
    expect(s0.pendingCards[0]!.payload).toEqual({ offer: { jobs: 5 } });
  });
});
