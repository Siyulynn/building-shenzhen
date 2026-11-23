/** The M2 invariants (phase1-slice.md §5.2) and M3b's firm sums (§5.5), shared by the test files. */
import { expect } from 'vitest';
import { Rng, isMigrant, step, type GameState, type SimEvent, type TickStep } from '../src/index.js';
import { bedsByPool, illegalShare, villageM2 } from '../src/systems/common.js';
import { labourForce } from '../src/systems/labour.js';
import { initial, params } from './fixtures.js';

/** Run month by month, calling check after each with the month's events. */
export function walk(s0: GameState, months: number, rng: Rng, steps: readonly TickStep[],
  check: (before: GameState, after: GameState, events: SimEvent[]) => void): GameState {
  let s = s0;
  for (let i = 0; i < months; i++) {
    const r = step(s, [], rng, steps);
    if (r.status !== 'advanced') throw new Error(`month ${i}: ${r.status}`);
    check(s, r.state, r.events);
    s = r.state;
  }
  return s;
}

export function checkInvariants(before: GameState, s: GameState, events: SimEvent[]): void {
  const flows = new Map<string, number>();
  for (const e of events) if (e.kind === 'flow') {
    const d = e.detail as { area: number; pop: string; inflow: number; outflow: number };
    const k = `${d.area}:${d.pop}`;
    flows.set(k, (flows.get(k) ?? 0) + d.inflow - d.outflow);
  }
  for (const g of s.pops) {
    const was = before.pops.find((x) => x.area === g.area && x.kind === g.kind)?.size ?? 0;
    expect(g.size - was).toBe(flows.get(`${g.area}:${g.kind}`) ?? 0);
    expect(g.size).toBe(g.stayedSixMonths + g.underSix.reduce((a, b) => a + b, 0));
    for (const n of [g.size, g.stayedSixMonths, g.present, ...g.underSix, ...Object.values(g.employed)]) {
      expect(Number.isInteger(n) && n >= 0).toBe(true);
    }
    expect(g.present).toBeLessThanOrEqual(g.size);
    expect(Object.values(g.employed).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(labourForce(g, params));
    if (!isMigrant(g.kind)) expect(g.size).toBe(was);              // births and deaths are zero in M2
  }
  for (const r of s.labour.jobs) expect(r.jobs >= 0 && r.filled >= 0 && r.filled <= r.jobs).toBe(true);
  for (const sec of Object.keys(s.labour.wage) as (keyof typeof s.labour.wage)[]) {
    const filled = s.labour.jobs.reduce((a, r) => a + (r.sector === sec ? r.filled : 0), 0);
    expect(s.pops.reduce((a, g) => a + g.employed[sec], 0)).toBe(filled);
  }
  for (const b of s.blocks) {
    for (const c of b.cohorts) expect(c.m2).toBeGreaterThan(0);
    const m = s.housing.find((x) => x.area === b.area)!;
    expect(m.beds).toEqual(bedsByPool(b, params));
    expect(s.areas.find((a) => a.id === b.area)!.illegalFloorShare).toBe(illegalShare(b));
    const plot = s.villagePlots.find((v) => v.area === b.area)!;
    const maxFloors = Math.min(params.eras[0]!.structural_max_floors, params.village_build.enforcement_max_floors[s.policy.enforcement]);
    const startVillage = villageM2(initial().blocks.find((x) => x.area === b.area)!, ['completed']);
    expect(villageM2(b, ['completed', 'under_construction'])).toBeLessThanOrEqual(Math.max(startVillage, plot.footprintM2 * maxFloors));
  }
  checkFirms(s);
}

/** M3b (§5.5): firm floor is the block's, staffing is whole and within the posts and the rows. */
export function checkFirms(s: GameState): void {
  const start = initial();
  for (const b of s.blocks) {
    const here = s.firms.filter((f) => f.area === b.area);
    const m2 = (a: string) => b.cohorts.reduce((t, c) => t + (c.archetype === a ? c.m2 : 0), 0);
    const startM2 = (a: string) => start.blocks.find((x) => x.area === b.area)!.cohorts
      .reduce((t, c) => t + (c.archetype === a ? c.m2 : 0), 0);
    expect(m2('standard_factory') - startM2('standard_factory')).toBe(here.reduce((t, f) => t + f.floorM2, 0));
    expect(m2('dormitory') - startM2('dormitory')).toBe(here.reduce((t, f) => t + f.dormM2, 0));
  }
  for (const f of s.firms) {
    for (const n of [f.posted, f.staffed]) expect(Number.isInteger(n) && n >= 0).toBe(true);
    expect(f.staffed).toBeLessThanOrEqual(f.posted);
    expect(f.posted).toBeLessThanOrEqual(f.jobs);
    // step() has moved the date on: the month that just ran is s.date - 1
    if (f.opens === undefined || f.opens > s.date - 1) expect(f.posted).toBe(0);
  }
  for (const r of s.labour.jobs) {
    const firms = s.firms.filter((f) => f.area === r.area && f.sector === r.sector);
    const posted = firms.reduce((t, f) => t + f.posted, 0), staffed = firms.reduce((t, f) => t + f.staffed, 0);
    expect(staffed).toBeLessThanOrEqual(r.filled);
    expect(r.filled - staffed).toBeLessThanOrEqual(r.jobs - posted);     // base staffing within the base jobs
  }
}
