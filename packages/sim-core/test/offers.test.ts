/** M3b's offer tests (phase1-slice.md §5.5): arrivals, options, siting, capacity, lapsing, the preview, determinism. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  Rng, compileBuildable, createTickSteps, loadGame, previewOffer, replay, runMonths, runQuarter, saveFromJson, saveGame, saveToJson, step,
  validateParams, type CardInstance, type GameState, type PlayerAction, type SimEvent, type TickStep,
} from '../src/index.js';
import { ROOT, areasJson, buildable, content, initial, investors, params, precedents } from './fixtures.js';
import { checkInvariants, walk } from './invariants.js';

const HK = 'investor.hk_processing', SOE = 'investor.inland_state_unit';
/** Params with fixed offers: Hong Kong offers of `jobs` jobs every month, no inland units. */
const fixed = (jobs: number, rate = 3) => validateParams({ ...params, investors: { ...params.investors, archetypes: {
  [HK]: { ...params.investors.archetypes[HK]!, rate_per_quarter: rate, jobs: [jobs, jobs] },
  [SOE]: { ...params.investors.archetypes[SOE]!, rate_per_quarter: 0 },
} } });
const P100 = fixed(100), P200 = fixed(200), P600 = fixed(600);
const SMALL = createTickSteps(P100, { precedents, investors });   // small enough for existing premises (150 jobs an area)
const stepsFor = (p = P200, extra?: (base: readonly TickStep[]) => TickStep[]) => {
  const base = createTickSteps(p, { precedents, investors });
  return extra ? extra(base) : base;
};
const STEPS = stepsFor();
const offerCards = (s: GameState) => s.pendingCards.filter((c) => c.card === HK || c.card === SOE);
const zoneAt = (x0: number, x1: number, y0: number, y1: number, use: 'industrial' | 'residential' = 'industrial'): PlayerAction => {
  const runs: [number, number, number][] = [];
  for (let y = y0; y <= y1; y++) runs.push([y, x0, x1]);
  return { type: 'create_zone', use, runs };
};
const ONE_CELL = zoneAt(360, 360, 372, 372);                    // area 7
const answer = (c: CardInstance, option: string): PlayerAction => ({ type: 'answer_card', instance: c.id, option });
function month(s: GameState, actions: PlayerAction[] = [], steps = STEPS, rng = new Rng(1)) {
  const r = step(s, actions, rng, steps);
  if (r.status !== 'advanced') throw new Error(r.status);
  return r;
}
const kinds = (events: SimEvent[]) => events.filter((e) => e.step === 'investment').map((e) => e.kind);
const PREMISES = [1, 2, 3, 4, 5, 6, 7].map((a) => `accept:premises:${a}`);

describe('M3b offers: arrivals and options', () => {
  it('raises no offer without investor content, so earlier runs are unchanged', () => {
    const end = runMonths(initial(), 24, new Rng(1), () => [], createTickSteps(params, { precedents }));
    expect(end.pendingCards).toHaveLength(0);
    expect(end.firms).toHaveLength(0);
  });

  it('draws arrivals from the seed: the same seed gives the same offers, sized within the range', () => {
    const steps = createTickSteps(params, { precedents, investors });
    const raised = (seed: number) => {
      const out: string[] = [];
      walk(initial(), 63, new Rng(seed), steps, (_b, _s, events) => {
        for (const e of events) if (e.kind === 'offer_raised') out.push(`${e.detail!.card}:${e.detail!.jobs}`);
      });
      return out;
    };
    const a = raised(3);
    expect(a).toEqual(raised(3));
    expect(a.length).toBeGreaterThan(3);                       // about half a card a quarter over 21 quarters
    expect(a).not.toEqual(raised(4));
    for (const r of a) {
      const [card, jobs] = [r.split('@')[0]!, Number(r.split(':').pop())];
      const [lo, hi] = params.investors.archetypes[card]!.jobs;
      expect(jobs >= lo && jobs <= hi).toBe(true);
    }
  });

  it('offers industrial zones with room, existing premises and decline; an inland unit needs a zone', () => {
    const r = month(initial());
    const c = offerCards(r.state)[0]!;
    expect(c).toMatchObject({ card: HK, interrupting: false, expires: initial().date + params.investors.offer_months });
    expect(c.payload).toMatchObject({ offer: { archetype: HK, jobs: 200, floorM2: 2000, dormM2: 300 } });
    expect(kinds(r.events)).toEqual(['card_raised', 'offer_raised']);
    // 200 jobs is more than an area's existing premises hold: with no zone, only decline
    expect(c.options).toEqual(['decline']);
    expect(offerCards(month(initial(), [], SMALL).state)[0]!.options).toEqual([...PREMISES, 'decline']);
    // an industrial zone is offered first; a residential one is not
    const z = month(initial(), [ONE_CELL, zoneAt(361, 362, 372, 372, 'residential')], SMALL);
    expect(offerCards(z.state)[0]!.options).toEqual(['accept:zone:1', ...PREMISES, 'decline']);
    const soe = createTickSteps(validateParams({ ...params, investors: { ...params.investors, archetypes: {
      [HK]: { ...params.investors.archetypes[HK]!, rate_per_quarter: 0 },
      [SOE]: { ...params.investors.archetypes[SOE]!, rate_per_quarter: 3 } } } }), { precedents, investors });
    expect(offerCards(month(initial(), [], soe).state)[0]!.options).toEqual(['decline']);
  });

  it('shows a zone drawn after the offer in the next options, and accepts into it (through runQuarter)', () => {
    const rng = new Rng(2);
    const q1 = runQuarter(initial(), [], rng, STEPS);
    expect(q1.status).toBe('turn_end');
    const first = offerCards(q1.state)[0]!;
    expect(first.options).not.toContain('accept:zone:1');
    const q2 = runQuarter(q1.state, [ONE_CELL], rng, STEPS);
    const again = offerCards(q2.state).find((c) => c.id === first.id)!;
    expect(again.options[0]).toBe('accept:zone:1');
    const q3 = runQuarter(q2.state, [answer(again, 'accept:zone:1')], rng, STEPS);
    expect(q3.state.firms).toHaveLength(1);
    expect(q3.state.firms[0]).toMatchObject({ zone: 1, area: 7, premises: 'new_factory', jobs: 200 });
  });
});

describe('M3b offers: answers', () => {
  it('accepts into a zone or existing premises; declining and lapsing create nothing', () => {
    const r0 = month(initial(), [ONE_CELL], SMALL);
    const [c] = offerCards(r0.state);
    const acc = month(r0.state, [answer(c!, 'accept:zone:1')], SMALL);
    expect(acc.state.firms).toHaveLength(1);
    expect(kinds(acc.events)).toContain('offer_accepted');
    const prem = month(r0.state, [answer(c!, 'accept:premises:2')], SMALL);
    expect(prem.state.firms[0]).toMatchObject({ premises: 'existing', area: 2, floorM2: 0, dormM2: 0 });
    const dec = month(r0.state, [answer(c!, 'decline')], SMALL);
    expect(dec.state.firms).toHaveLength(0);
    expect(kinds(dec.events)).toContain('offer_declined');
    // left unanswered, an offer lapses after offer_months
    const quiet = createTickSteps(fixed(200, 0), { precedents, investors });
    let s = r0.state;
    const lapsed: number[] = [];
    for (let m = 1; m <= params.investors.offer_months; m++) {
      const r = month(s, [], quiet);
      if (kinds(r.events).includes('offer_lapsed')) lapsed.push(m);
      s = r.state;
    }
    expect(lapsed).toEqual([params.investors.offer_months]);
    expect(offerCards(s)).toHaveLength(0);
  });

  it('takes effect when an accept given beside a pending interrupting card clears, and replays', () => {
    const steps = stepsFor(P200, (base) => base.map((st) => st.name !== 'events' ? st : { name: 'events', run: (ctx) => {
      if (ctx.state.history.months.length === 1) ctx.raise({ card: 'fixture.stop', options: ['ok'], interrupting: true });
    } }));
    const rng = new Rng(6);
    const r0 = step(initial(), [ONE_CELL], rng, steps);
    const r1 = step(r0.state, [], rng, steps);
    const offer = offerCards(r1.state)[0]!, stop = r1.state.pendingCards.find((c) => c.card === 'fixture.stop')!;
    const paused = step(r1.state, [answer(offer, 'accept:zone:1')], rng, steps);
    expect(paused.status).toBe('paused');
    expect(paused.state.firms).toHaveLength(0);
    const ok = step(paused.state, [answer(stop, 'ok')], rng, steps);
    expect(ok.status).toBe('advanced');
    expect(ok.state.firms).toHaveLength(1);
    const end = runMonths(ok.state, 4, rng, () => [], steps);
    const rngB = new Rng(6);
    const again = replay(initial(), end.actionLog, 7, rngB, steps);
    expect(saveToJson(saveGame(again, rngB, content))).toBe(saveToJson(saveGame(end, rng, content)));
  });
});

describe('M3b offers: capacity', () => {
  it('a one-cell zone takes one 600-job firm and refuses the second; of two accepts in one call the first wins', () => {
    const steps = stepsFor(P600);
    const r0 = month(initial(), [ONE_CELL], steps);
    const r1 = month(r0.state, [], steps);
    const [a, b] = offerCards(r1.state);
    expect(a!.options[0]).toBe('accept:zone:1');                // 6,900 m² of 10,000: each fits alone
    expect(b!.options[0]).toBe('accept:zone:1');
    const both = month(r1.state, [answer(a!, 'accept:zone:1'), answer(b!, 'accept:zone:1')], steps);
    expect(both.state.firms).toHaveLength(1);
    expect(kinds(both.events).slice(0, 2)).toEqual(['offer_accepted', 'offer_failed']);
    // the zone is full: no pending offer lists it any more
    for (const c of offerCards(both.state)) expect(c.options).not.toContain('accept:zone:1');
  });

  it('leaves a firm running in its area when its zone is removed, and offers the zone no more', () => {
    const r0 = month(initial(), [ONE_CELL]);
    const r1 = month(r0.state, [answer(offerCards(r0.state)[0]!, 'accept:zone:1')]);
    let s = month(r1.state, [{ type: 'remove_zone', zone: 1 }]).state;
    s = walk(s, 14, new Rng(2), STEPS, checkInvariants);
    const f = s.firms[0]!;
    expect(f).toMatchObject({ area: 7, zone: 1 });
    expect(f.opens).toBeDefined();
    expect(f.posted).toBeGreaterThan(0);
    for (const c of offerCards(s)) expect(c.options.some((o) => o.startsWith('accept:zone'))).toBe(false);
  });

  it('caps jobs in existing premises per area', () => {
    const steps = stepsFor(fixed(100));
    const r0 = month(initial(), [], steps);
    const r1 = month(r0.state, [answer(offerCards(r0.state)[0]!, 'accept:premises:1')], steps);
    // 100 of 150 jobs used in area 1: the next 100-job offer can't go there
    for (const c of offerCards(r1.state)) expect(c.options).not.toContain('accept:premises:1');
  });
});

describe('M3b buildable layer', () => {
  it('counts only buildable cells towards a zone; zoning unbuildable land stays legal', () => {
    const steps = createTickSteps(P200, { precedents, investors, buildable });
    const hill = zoneAt(440, 442, 305, 307);                     // area 6: nine cells too steep or wet to build
    const r = month(initial(), [hill, ONE_CELL], steps);
    expect(r.state.zones.map((z) => z.area)).toEqual([6, 7]);
    const c = offerCards(r.state)[0]!;
    expect(c.options).toEqual(['accept:zone:2', 'decline']);    // the hill zone has no room
    const v = previewOffer(r.state, c, P200, { investors, buildable });
    expect(v.sites[0]!.zoneFreeM2).toBe(10_000);                 // area 7's cell is buildable
    // without the layer, every cell counts
    expect(offerCards(month(initial(), [hill, ONE_CELL]).state)[0]!.options).toEqual(['accept:zone:1', 'accept:zone:2', 'decline']);
  });

  it('matches the per-area counts the pipeline reports, and refuses a layer from other areas', () => {
    const text = readFileSync(join(ROOT, 'data/starts/slice_buildable.json'), 'utf8');
    const raw = JSON.parse(text);
    expect(buildable.cells.length).toBe(raw.areas.reduce((a: number, x: { buildable_count: number }) => a + x.buildable_count, 0));
    expect(() => compileBuildable({ ...raw, areas_sha256: 'x' }, areasJson)).toThrow(/other areas/);
  });
});

describe('M3b serviced land hook', () => {
  it('scales a zone capacity by its serviced share; absent means fully serviced', () => {
    const r0 = month(initial(), [ONE_CELL]);
    const z = r0.state.zones[0]!;
    expect(z.servicedShare).toBeUndefined();
    const c = offerCards(r0.state)[0]!;
    const free = (s: GameState) => previewOffer(s, c, P200, { investors }).sites[0]!.zoneFreeM2;
    expect(free(r0.state)).toBe(10_000);
    z.servicedShare = 0.5;
    expect(free(r0.state)).toBe(5_000);
    // unserviced: the zone drops out of the options at the next refresh, and survives a save
    z.servicedShare = 0;
    const r1 = month(r0.state);
    expect(offerCards(r1.state).every((x) => !x.options.includes('accept:zone:1'))).toBe(true);
    const back = loadGame(saveFromJson(saveToJson(saveGame(r1.state, new Rng(1), content)))).state;
    expect(back.zones[0]!.servicedShare).toBe(0);
  });
});

describe('M3b preview', () => {
  it('is pure and shows jobs, beds, utilities and output per site', () => {
    const r0 = month(initial(), [ONE_CELL]);
    const c = offerCards(r0.state)[0]!;
    const before = saveToJson(saveGame(r0.state, new Rng(1), content));
    const v = previewOffer(r0.state, c, P200, { investors });
    expect(saveToJson(saveGame(r0.state, new Rng(1), content))).toBe(before);
    const build = P200.investors.archetypes[HK]!.build_months;
    expect(v).toMatchObject({ jobs: 200, powerKw: 100, buildMonths: build });
    const zone = v.sites[0]!;
    expect(zone).toMatchObject({ option: 'accept:zone:1', area: 7, premises: 'new_factory', opensInMonths: build - 1,
      floorM2: 2000, dormM2: 300, dormBeds: 60, bedsNeeded: 140, zoneFreeM2: 10_000, powerFreeKw: 120, waterFreeM3Day: 60 });
    expect(zone.perYear.output).toBe(200 * 400 * 12);
    expect(zone.perYear.exports).toBe(zone.perYear.output);
    expect(zone.perYear.valueAdded).toBeCloseTo(zone.perYear.output * 0.2, 6);
    expect(v.sites).toHaveLength(1);                            // too big for existing premises; decline has no site
    // a smaller offer may also use existing premises, at the premises factor
    const r1 = month(initial(), [ONE_CELL], SMALL);
    const w = previewOffer(r1.state, offerCards(r1.state)[0]!, P100, { investors });
    expect(w.sites).toHaveLength(8);                            // the zone and seven areas' premises
    const prem = w.sites.find((x) => x.option === 'accept:premises:1')!;
    // no dormitory in existing premises: every job needs a bed
    expect(prem).toMatchObject({ area: 1, premises: 'existing', opensInMonths: 1, floorM2: 0, dormBeds: 0, bedsNeeded: 100,
      premisesJobsFree: 150, powerFreeKw: 300, waterFreeM3Day: 150 });
    expect(prem.zoneFreeM2).toBeUndefined();
    expect(prem.perYear.output).toBeCloseTo(100 * 400 * 12 * P100.industry.premises_output_factor, 6);
  });
});

describe('M3b offers: determinism', () => {
  it('save, load and continue, and replay, with offers accepted by the default policy', () => {
    const steps = createTickSteps(params, { precedents, investors });
    const rng = new Rng(13);
    const end = runMonths(initial(), 30, rng, undefined, steps);
    expect(end.firms.length).toBeGreaterThan(0);
    const text = saveToJson(saveGame(end, rng, content));
    const rngA = new Rng(13);
    const mid = runMonths(initial(), 17, rngA, undefined, steps);
    const loaded = loadGame(saveFromJson(saveToJson(saveGame(mid, rngA, content))));
    expect(saveToJson(saveGame(runMonths(loaded.state, 13, loaded.rng, undefined, steps), loaded.rng, content))).toBe(text);
    const rngB = new Rng(13);
    expect(saveToJson(saveGame(replay(initial(), end.actionLog, 30, rngB, steps), rngB, content))).toBe(text);
  });

  it('keeps the M2 invariants and the firm sums for the whole slice, accepting offers into zones and premises', () => {
    const steps = createTickSteps(fixed(150, 1.5), { precedents, investors, buildable });
    const rng = new Rng(21);
    let s = month(initial(), [zoneAt(360, 369, 360, 369)], steps, rng).state;   // a 100-cell industrial zone in area 7
    for (let m = 1; m < 63; m++) {
      // odd months take the first site (the zone), even months the last before decline (existing premises, if any)
      const acts = offerCards(s).filter((c) => c.options.length > 1)
        .map((c) => answer(c, c.options[m % 2 ? 0 : c.options.length - 2]!));
      const r = month(s, acts, steps, rng);
      checkInvariants(s, r.state, r.events);
      s = r.state;
    }
    expect(s.firms.length).toBeGreaterThan(5);
    expect(s.firms.some((f) => f.premises === 'existing')).toBe(true);
    expect(s.firms.some((f) => f.premises === 'new_factory' && f.posted > 0)).toBe(true);
  });
});
