/** The M2 invariants (phase1-slice.md §5.2) and M3b's firm sums (§5.5), shared by the test files. */
import { expect } from 'vitest';
import {
  ACCOUNTS, Rng, debtServiceAt, isLive, isMigrant, obligationDue, principalOutstanding, step, type GameState, type SimEvent,
  type TickStep,
} from '../src/index.js';
import { bedsByPool, illegalShare, villageM2 } from '../src/systems/common.js';
import { labourForce } from '../src/systems/labour.js';
import { initial as freshInitial, params } from './fixtures.js';

/** The start state never changes: built once, read by the checks below. */
let start0: GameState | undefined;
const initial = () => (start0 ??= freshInitial());

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
  // R4 (§5.11): who holds which jobs agrees with the groups and the rows, once the labour step has run
  if (s.labour.held.length || s.labour.jobs.every((r) => r.filled === 0)) {
    for (const h of s.labour.held) expect(Number.isInteger(h.n) && h.n > 0).toBe(true);
    for (const g of s.pops) for (const sec of Object.keys(g.employed) as (keyof typeof g.employed)[]) {
      expect(s.labour.held.filter((h) => h.home === g.area && h.kind === g.kind && h.sector === sec).reduce((a, h) => a + h.n, 0))
        .toBe(g.employed[sec]);
    }
    for (const r of s.labour.jobs) {
      expect(s.labour.held.filter((h) => h.area === r.area && h.sector === r.sector).reduce((a, h) => a + h.n, 0)).toBe(r.filled);
    }
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
    // R3 (b&c §13.3): work units' dormitories and other organic cohorts are not firm floor
    const m2 = (a: string) => b.cohorts.reduce((t, c) => t + (c.archetype === a && c.builder === undefined ? c.m2 : 0), 0);
    const startM2 = (a: string) => start.blocks.find((x) => x.area === b.area)!.cohorts
      .reduce((t, c) => t + (c.archetype === a ? c.m2 : 0), 0);
    // R10c (§5.13): a services firm's premises are shop floor
    const floorOf = (sec: 'factory' | 'services') => here.reduce((t, f) => t + (f.sector === sec ? f.floorM2 : 0), 0);
    expect(m2('standard_factory') - startM2('standard_factory')).toBe(floorOf('factory'));
    expect(m2('shop_market') - startM2('shop_market')).toBe(floorOf('services'));
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

/** M4 (§5.6): no stock negative, and per account Σ new entries = Δ balance; dues add up; stalls wait for money. */
export function checkLedger(before: GameState, after: GameState): void {
  const added = after.fiscal.ledger.slice(before.fiscal.ledger.length);
  for (const acc of ACCOUNTS) {
    const sum = added.reduce((a, e) => a + (e.account === acc ? e.amount : 0), 0);
    expect(after.fiscal.balances[acc] - before.fiscal.balances[acc]).toBe(sum);
    expect(after.fiscal.balances[acc]).toBeGreaterThanOrEqual(0);
  }
  for (const e of added) expect(Number.isInteger(e.amount) && e.amount !== 0).toBe(true);
  for (const l of after.fiscal.loans) expect(principalOutstanding(l, after.date)).toBeGreaterThanOrEqual(0);
  // obligations due = baselines + live obligations (arrears among them) + debt service. A month the closing visit
  // halts at its events step (§5.8) runs no finance and records no history: there is nothing to add up
  const d = before.date, h = after.history, n = h.obligationsDue.length - 1;
  if (h.months.length > before.history.months.length) {
    let lines = 0;
    for (const o of after.fiscal.obligations) if (isLive(o, d)) lines += obligationDue(o, after);
    for (const l of after.fiscal.loans) lines += debtServiceAt(l, d);
    expect(h.obligationsDue[n]).toBe(h.baselineDue[n]! + lines);
  }
  // a project is stalled only while it waits for money
  for (const x of after.fiscal.projects) if (x.stage === 'stalled') expect(x.waiting).toBe('finance');
}
