/**
 * A played run's readable summary (the golden files) and its exit-criteria checks (phase1-slice.md §5.9).
 * Pure: the CLI writes them, the golden test compares them, the UI may show them.
 */
import {
  checkBands, loanSqueeze, prologueDecisions, tradeoffYears, type BandRecord, type BandResult, type Claims, type LoanYear,
  type TradeoffYear,
} from './calibration.js';
import type { EventContent } from './events.js';
import { isLive, moneyForProjects, obligationDue, type FiscalContent } from './fiscal.js';
import { commercialTargetM2, developableCells, inducedServiceJobs, shopOccupancy } from './growth.js';
import type { SliceParams } from './params.js';
import { stateAfter, type PlayRecord } from './play.js';
import type { SaveContent } from './save.js';
import type { GameState } from './state.js';
import { realIllegalShare } from './systems/reviews.js';
import type { TickContent } from './ticks.js';
import { verdict, type Verdict } from './verdict.js';
import { cellsOfRuns } from './zones.js';
import { formatYM } from './ym.js';

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);
const trailing = (xs: readonly number[]) => sum(xs.slice(-12));
const last = (xs: readonly number[]) => xs[xs.length - 1] ?? 0;

export interface YearPoint {
  at: string;                            // the last month the history recorded
  residents: number; registered: number; presentNonlocal: number; migrants: number; firmJobs: number;
  gdp: number; exports: number; revenue: number; obligationsPaid: number; projectSpend: number;   // the trailing year
  electricityKwhYear: number;             // R9.2 (§5.5): the month's consumption, annualised
  reserve: number; debt: number; arrears: number; scrutiny: number; illegalShare: number;
}
export function yearPoint(s: GameState): YearPoint {
  const h = s.history;
  let arrears = 0;
  for (const o of s.fiscal.obligations) if (o.kind === 'arrears' && isLive(o, s.date)) arrears += obligationDue(o, s);
  return {
    at: formatYM(last(h.months)),
    residents: last(h.resident), registered: last(h.registered),
    presentNonlocal: s.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.present : 0), 0),
    migrants: last(h.migrants), firmJobs: last(h.firmJobs),
    gdp: Math.round(trailing(h.gdp)), exports: Math.round(trailing(h.exports)), revenue: Math.round(trailing(h.revenue)),
    obligationsPaid: Math.round(trailing(h.obligationsPaid)), projectSpend: Math.round(trailing(h.projectSpend)),
    electricityKwhYear: Math.round(last(h.electricity) * 12),
    reserve: Math.round(s.fiscal.balances.general), debt: Math.round(last(h.debtOutstanding)), arrears: Math.round(arrears),
    scrutiny: r4(s.climate.scrutiny), illegalShare: r4(realIllegalShare(s)),
  };
}

export interface RunSummary {
  policy: string; seed: number; quarters: number;
  content: SaveContent;
  years: YearPoint[];                    // each year end the run reached, then the run's final state
  checkpoints: Checkpoint[];             // R6 (§5.9): the §9 checkpoints, read off the reached state
  reviews: { index: number; at: string; score: number; pass: boolean; vetoed?: string }[];
  sez: { opened?: string; readiness?: number; waveCards?: number };   // the opening's readiness and first wave
  verdict: Verdict | null;               // at the visit, when the run reached it
  fired: string[];                       // "<event id>@YYYY-MM"
  ended: string | null;
}

/** R6 (§5.9): the months of the three §9 checkpoints: the first year end, the following Q2, and the last quarter's end. */
export const CHECKPOINT_MONTHS = [12, 18, 60] as const;
type LandUseKey = 'industrial' | 'commercial' | 'residential';
export interface Checkpoint {
  id: string; at: string; months: number;
  population: { registered: number; resident: number; present: number; presentNonlocal: number; migrants: number };
  land: { plannedCells: Record<LandUseKey, number>; servicedCells: Record<LandUseKey, number>;
    developableCells: Record<LandUseKey, number> };
  floor: { industrialBuiltM2: number; industrialOpenM2: number; commercialBuiltM2: number; commercialOccupiedM2: number;
    residentialM2: number; villageRentalM2: number };
  jobs: { firmPosted: number; filled: number; vacancies: number };
  energy: { electricityKwhYear: number };   // R9.2 (§5.5): annualised from the month's consumption
  housing: { rentalBeds: number; rentalOccupants: number; crowding: number; turnedAway: number };
  works: { roadCells: number; powerSources: number; waterSources: number; facilities: number };
  fiscal: { reserve: number; moneyForProjects: number; debtOutstanding: number; arrears: number;
    revenueYear: number; spendingYear: number; spendingOverRevenue: number };
}

/** One §9 checkpoint, read from a reached state (§5.9). */
export function checkpoint(s: GameState, months: number, p: SliceParams, tick: TickContent): Checkpoint {
  const h = s.history;
  const byUse = (): Record<LandUseKey, number> => ({ industrial: 0, commercial: 0, residential: 0 });
  const planned = byUse(), serviced = byUse(), developable = byUse();
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  const dev = tick.network
    ? developableCells(s, { network: tick.network, ...(tick.buildable ? { buildable: tick.buildable } : {}) })
    : new Map<number, number[]>();
  for (const z of s.zones) {
    if (z.use !== 'industrial' && z.use !== 'commercial' && z.use !== 'residential') continue;
    const cells = cellsOfRuns(z.runs, s.grid);
    planned[z.use] += cells.length;
    serviced[z.use] += cells.filter((c) => served.has(c)).length;
    developable[z.use] += (dev.get(z.id) ?? []).length;
  }
  let industrialBuiltM2 = 0, industrialOpenM2 = 0, dormitoryM2 = 0, villageRentalM2 = 0, privateShopM2 = 0;
  for (const f of s.firms) {
    industrialBuiltM2 += f.floorM2;
    if (f.opens !== undefined) industrialOpenM2 += f.floorM2;
  }
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage !== 'completed') continue;
    if (c.archetype === 'dormitory') dormitoryM2 += c.m2;
    if (c.archetype === 'village_rental') villageRentalM2 += c.m2;
    if (c.archetype === 'shop_market' && c.builder === 'private') privateShopM2 += c.m2;
  }
  const induced = p.growth ? inducedServiceJobs(s, p) : new Map<number, number>();
  const occupiedShops = p.growth
    ? [...shopOccupancy(s, commercialTargetM2(induced, p.growth)).values()].reduce((a, x) => a + x, 0) : 0;
  const rentalBeds = s.housing.reduce((a, x) => a + x.beds.rental, 0);
  const rentalOccupants = s.housing.reduce((a, x) => a + x.occupants.rental, 0);
  const arrears = s.fiscal.obligations.filter((o) => o.kind === 'arrears' && isLive(o, s.date))
    .reduce((a, o) => a + obligationDue(o, s), 0);
  const revenueYear = trailing(h.revenue), spendingYear = trailing(h.obligationsPaid) + trailing(h.projectSpend);
  return {
    id: `checkpoint.${formatYM(s.date)}`, at: formatYM(s.date), months,
    population: {
      registered: s.pops.reduce((a, g) => a + (g.registration === 'local' ? g.size : 0), 0),
      resident: s.pops.reduce((a, g) => a + g.stayedSixMonths, 0),
      present: s.pops.reduce((a, g) => a + g.present, 0),
      presentNonlocal: s.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.present : 0), 0),
      migrants: s.pops.reduce((a, g) => a + (g.registration === 'nonlocal' ? g.size : 0), 0),
    },
    land: { plannedCells: planned, servicedCells: serviced, developableCells: developable },
    floor: { industrialBuiltM2, industrialOpenM2, commercialBuiltM2: privateShopM2, commercialOccupiedM2: occupiedShops,
      residentialM2: dormitoryM2, villageRentalM2 },
    jobs: { firmPosted: s.firms.reduce((a, f) => a + f.posted, 0), filled: s.labour.jobs.reduce((a, j) => a + j.filled, 0),
      vacancies: last(h.vacancies) },
    housing: { rentalBeds, rentalOccupants, crowding: rentalOccupants / Math.max(1, rentalBeds),
      turnedAway: last(h.turnedAway) },
    energy: { electricityKwhYear: Math.round(last(h.electricity) * 12) },
    works: { roadCells: s.roads.length,
      powerSources: s.structures.filter((x) => x.kind === 'power_source').length,
      waterSources: s.structures.filter((x) => x.kind === 'water_source').length,
      facilities: s.structures.filter((x) => x.kind === 'facility').length },
    fiscal: { reserve: s.fiscal.balances.general, moneyForProjects: moneyForProjects(s, p),
      debtOutstanding: last(h.debtOutstanding), arrears, revenueYear, spendingYear,
      spendingOverRevenue: revenueYear > 0 ? spendingYear / revenueYear : 0 },
  };
}

/** Round every number: whole numbers stay, money and people to integers, shares and multiples (under 100) to 4 decimals. */
function rounded<T>(x: T): T {
  const walk = (y: unknown): unknown => {
    if (typeof y === 'number') return Number.isInteger(y) || !Number.isFinite(y) ? y : Math.abs(y) < 100 ? r4(y) : Math.round(y);
    if (Array.isArray(y)) return y.map(walk);
    if (y && typeof y === 'object') return Object.fromEntries(Object.entries(y).map(([k, v]) => [k, walk(v)]));
    return y;
  };
  return walk(x) as T;
}

export function runSummary(rec: PlayRecord, meta: { policy: string; seed: number; quarters: number }, p: SliceParams,
  fc: FiscalContent, content: SaveContent, tick: TickContent): RunSummary {
  const f = rec.final;
  const years = rec.quarterEnds.filter((s) => s.date % 12 === 0).map(yearPoint);
  const end = yearPoint(f);
  if (years[years.length - 1]?.at !== end.at) years.push(end);
  const checkpoints = CHECKPOINT_MONTHS.flatMap((m) => {
    const s = stateAfter(rec, m);
    return s ? [checkpoint(s, m, p, tick)] : [];
  });
  return {
    ...meta, content: { ...content }, years, checkpoints,
    reviews: f.reviews.held.map((r) => ({ index: r.index, at: formatYM(r.date), score: r4(r.score), pass: r.pass,
      ...(r.vetoed ? { vetoed: r.vetoed } : {}) })),
    sez: { ...(f.sez.opened !== undefined ? { opened: formatYM(f.sez.opened) } : {}),
      ...(f.sez.readiness !== undefined ? { readiness: r4(f.sez.readiness) } : {}),
      ...(f.sez.waveCards !== undefined ? { waveCards: f.sez.waveCards } : {}) },
    verdict: f.ended?.reason === 'visit' ? rounded(verdict(f, p, fc)) : null,
    fired: f.events.fired.map((e) => `${e.id}@${formatYM(e.date)}`),
    ended: f.ended ? `${f.ended.reason}@${formatYM(f.ended.date)}` : null,
  };
}

// ---- the exit-criteria checks ----

export interface BandFiles { snapshot: readonly BandRecord[]; checkpoint: readonly BandRecord[] }
export interface ExitChecks {
  c1: { reachedVisit: boolean; quarters: number; growthBands: BandResult[] };
  c2: { years: TradeoffYear[]; everyYear: boolean; loan: { took: boolean; squeezed: boolean; years: LoanYear[] } };
  c3: { bands: BandResult[]; passed: number; failed: number; other: number };
  c4: { turns: { turn: number; cards: string[] }[]; everyTurn: boolean };
  c5: { wallMs?: number };
}

/** The number of prologue turns: one past the last `prologue_turn` trigger in the events content. */
export const prologueTurns = (events: EventContent) =>
  1 + Math.max(-1, ...events.map((d) => ('prologueTurn' in d.trigger ? d.trigger.prologueTurn : -1)));

/** The tradeoff margin of `check.tradeoff` in the checkpoint file (§5.9). */
export function tradeoffMargin(checkpoint: readonly BandRecord[]): number {
  const m = checkpoint.find((r) => r.id === 'check.tradeoff')?.margin;
  if (typeof m !== 'number') throw new Error('checkpoint_1983q4.yaml: check.tradeoff needs a margin');
  return m;
}

/**
 * Criteria 1–5 on one run (§5.9). `withoutLoan` is the same policy's run with the loan declined (criterion 2's loan
 * check). Criterion 5's wall time is the caller's (sim-core has no clock); its invariants are the property tests.
 */
export function exitChecks(rec: PlayRecord, withoutLoan: PlayRecord, files: BandFiles, claims: Claims, p: SliceParams,
  events: EventContent): ExitChecks {
  const f = rec.final;
  const start = f.scenario.start;
  const run = { at: (m: number) => stateAfter(rec, m), final: f, params: p };
  const growthBand = files.checkpoint.find((r) => r.kind === 'checkpoint')?.growth_band;
  const opts = { start, baseMonths: 12, ...(growthBand ? { growthBand } : {}) };
  const bands = [...checkBands(files.snapshot, claims, run, opts), ...checkBands(files.checkpoint, claims, run, opts)];
  const years = tradeoffYears(f, rec.quarterEnds, rec.cards, p, tradeoffMargin(files.checkpoint));
  const turns = prologueDecisions(rec.cards, start, prologueTurns(events));
  return {
    c1: { reachedVisit: f.ended?.reason === 'visit', quarters: rec.quarterEnds.length + (f.ended ? 1 : 0),
      growthBands: bands.filter((b) => b.kind === 'growth' || b.kind === 'upper_bound_and_growth'
        || (b.kind === 'design_band' && b.id.endsWith('residents_multiply'))) },
    c2: { years, everyYear: years.length > 0 && years.every((y) => y.tradeoff), loan: loanSqueeze(f, withoutLoan.final) },
    c3: { bands, passed: bands.filter((b) => b.result === 'pass').length, failed: bands.filter((b) => b.result === 'fail').length,
      other: bands.filter((b) => b.result !== 'pass' && b.result !== 'fail').length },
    c4: { turns, everyTurn: turns.every((t) => t.cards.length > 0) },
    c5: {},
  };
}

/**
 * The golden set's cross-run checks (§5.9): criterion 1's response to choices (the policies end with different
 * residents or GDP), and readiness_moves_wave (the run with the most readiness at the opening has a bigger first wave
 * than the run with the least, when their readiness differs).
 */
export function crossRunChecks(summaries: readonly RunSummary[]): {
  responds: boolean; readinessMovesWave: 'pass' | 'fail' | 'not_checkable'; detail: string;
} {
  const ends = summaries.map((x) => x.years[x.years.length - 1]!);
  const responds = new Set(ends.map((e) => e.residents)).size > 1 || new Set(ends.map((e) => e.gdp)).size > 1;
  const opened = summaries.filter((x) => x.sez.readiness !== undefined && x.sez.waveCards !== undefined);
  const lo = opened.reduce<RunSummary | undefined>((a, x) => (!a || x.sez.readiness! < a.sez.readiness! ? x : a), undefined);
  const hi = opened.reduce<RunSummary | undefined>((a, x) => (!a || x.sez.readiness! > a.sez.readiness! ? x : a), undefined);
  const readinessMovesWave = !lo || !hi || lo.sez.readiness === hi.sez.readiness ? 'not_checkable'
    : hi.sez.waveCards! > lo.sez.waveCards! ? 'pass' : 'fail';
  const detail = opened.map((x) => `${x.policy}: readiness ${x.sez.readiness}, ${x.sez.waveCards} first-wave cards`).join('; ');
  return { responds, readinessMovesWave, detail };
}
