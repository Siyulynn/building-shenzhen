/**
 * The slice's headless runner (phase1-slice.md §5.9, §10): load the slice from the repository, play it with a policy
 * through runQuarter, and analyse the run. The command line is in main.ts; the HTML is in report.ts.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { loadStore } from '@sz/evidence';
import {
  LOAN_CARD, Rng, compileSlice, formatYM, createInitialState, createTickSteps, exitChecks, playQuarters, policyNamed, runSummary,
  type BandFiles, type BandRecord, type Claims, type DecisionPolicy, type ExitChecks, type PlayRecord, type RunSummary,
  type Slice,
} from '@sz/sim-core';

export const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const sha256 = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const readRepo = (p: string) => readFileSync(join(ROOT, p), 'utf8');

export const loadSlice = (): Slice => compileSlice(readRepo, parse, sha256);

/** Claims by id, with their value and status, from data/evidence/claims (never copied into content). */
export function loadClaims(): Claims {
  const store = loadStore(ROOT);
  return new Map([...store.claims].map(([id, c]) => [id, { value: c.value.value, status: c.value.status }]));
}

export const BAND_FILES = { snapshot: 'content/slice/snapshot_1980q2.yaml', checkpoint: 'content/slice/checkpoint_1983q4.yaml' };
export const loadBands = (): BandFiles => ({
  snapshot: parse(readRepo(BAND_FILES.snapshot)) as BandRecord[],
  checkpoint: parse(readRepo(BAND_FILES.checkpoint)) as BandRecord[],
});

export interface RunOptions { policy: string; seed: number; quarters: number }

/** Play one run. The policy is made fresh for the run, so a random policy starts from its seed. */
export function play(slice: Slice, o: RunOptions, wrap: (p: DecisionPolicy) => DecisionPolicy = (p) => p): PlayRecord {
  const steps = createTickSteps(slice.params, slice.tick);
  const s0 = createInitialState(slice.init);
  return playQuarters(s0, new Rng(o.seed), steps, wrap(policyNamed(o.policy, slice.params, o.seed)), o.quarters);
}

/** The same policy, but the project loan's card is always declined (criterion 2's counterfactual). */
export const declineLoan = (p: DecisionPolicy): DecisionPolicy => (s, pending) => p(s, pending).map((a) => {
  const c = a.type === 'answer_card' ? pending.find((x) => x.id === a.instance) : undefined;
  return c?.card === LOAN_CARD ? { ...a, option: 'decline' } : a;
});

export interface Analysis {
  options: RunOptions;
  summary: RunSummary;
  checks: ExitChecks;
  series: { months: string[]; resident: number[]; present: number[]; migrants: number[]; firmJobs: number[]; gdp: number[];
    exportsUsd: number[]; revenue: number[]; obligationsDue: number[]; obligationsPaid: number[]; projectSpend: number[];
    reserve: number[]; debtOutstanding: number[]; illegalShare: number[] };
  cards: { id: string; card: string; raisedAt: string; options: string[]; answer?: string }[];
}

/** Run the policy, its no-loan counterfactual, and every check. Deterministic: no clock is read here. */
export function analyse(slice: Slice, o: RunOptions, claims = loadClaims(), bands = loadBands()): { rec: PlayRecord; a: Analysis } {
  const rec = play(slice, o);
  const without = play(slice, o, declineLoan);
  const checks = exitChecks(rec, without, bands, claims, slice.params, slice.tick.events);
  const h = rec.final.history;
  const answers = new Map(rec.final.actionLog.flatMap((e) => (e.action.type === 'answer_card' ? [[e.action.instance, e.action.option]] : [])));
  const yuanPerUsd = slice.params.fiscal.forex.yuan_per_usd;
  return {
    rec,
    a: {
      options: o,
      summary: runSummary(rec, o, slice.params, slice.tick.fiscal!, slice.content),
      checks,
      series: {
        months: h.months.map(formatYM),
        resident: h.resident, present: h.present, migrants: h.migrants, firmJobs: h.firmJobs,
        gdp: h.gdp.map(Math.round), exportsUsd: h.exports.map((x) => Math.round(x / yuanPerUsd)),
        revenue: h.revenue, obligationsDue: h.obligationsDue, obligationsPaid: h.obligationsPaid, projectSpend: h.projectSpend,
        reserve: h.reserve, debtOutstanding: h.debtOutstanding.map(Math.round), illegalShare: h.illegalShare,
      },
      cards: rec.cards.map((c) => ({ id: c.id, card: c.card, raisedAt: formatYM(c.raisedAt), options: [...c.options],
        ...(answers.has(c.id) ? { answer: answers.get(c.id)! } : {}) })),
    },
  };
}

/** run.json's text: canonical (sorted keys), with non-finite numbers as strings, so equal runs give equal bytes. */
export function runJson(a: Analysis): string {
  const canon = (x: unknown): unknown => {
    if (typeof x === 'number') return Number.isFinite(x) ? x : String(x);
    if (Array.isArray(x)) return x.map(canon);
    if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon((x as Record<string, unknown>)[k])]));
    return x;
  };
  return JSON.stringify(canon(a), null, 1) + '\n';
}

// ---- golden runs (§5.9) ----

export const GOLDEN_POLICIES = ['default', 'cautious', 'aggressive', 'decline_all', 'historical_prologue'] as const;
export const GOLDEN_DIR = 'data/golden/slice';
export const goldenPath = (policy: string, seed = 1) => join(GOLDEN_DIR, `${policy}-seed${seed}.json`);

/** A golden summary's text: the summary as stable, readable JSON. */
export const goldenText = (s: RunSummary) => JSON.stringify(s, null, 2) + '\n';
export function goldenSummary(slice: Slice, policy: string, seed = 1): RunSummary {
  const o = { policy, seed, quarters: slice.init.scenario.turns };
  return runSummary(play(slice, o), o, slice.params, slice.tick.fiscal!, slice.content);
}
