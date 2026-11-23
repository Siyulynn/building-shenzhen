/**
 * The climate, the sweep, the annual review and the fall from grace (phase1-slice.md §5.8; leadership §2.6, §3, §4;
 * fiscal §6.8, §6.9). The climate runs in tick step 12 (stability), the fall and the review in step 14 (reviews).
 * Both run only with the events content; the review needs content/slice/targets.yaml too.
 */
import type { SliceParams } from '../params.js';
import type { GameState, ReviewRecord } from '../state.js';
import type { TickContext } from '../step.js';
import { FAILURE_CARD } from '../events.js';
import { illegalShare, villageM2 } from './common.js';

export const REVIEW_INDICATORS = ['exports_usd', 'forex_earned_usd', 'foreign_firm_jobs', 'projects_completed', 'order_check'] as const;
export type ReviewIndicator = (typeof REVIEW_INDICATORS)[number];
export const REVIEW_CARD = 'review.annual';

/** One annual review of content/slice/targets.yaml, compiled. The k-th entry is the k-th review: no year is read. */
export interface ReviewTarget {
  id: string; lightweight: boolean;
  indicators: { indicator: ReviewIndicator; weight: number; floor: number; target: number }[];
}
export type TargetContent = readonly ReviewTarget[];

export function compileTargets(raw: unknown): ReviewTarget[] {
  if (!Array.isArray(raw)) throw new Error('targets: expected a list');
  const seen = new Set<string>();
  return raw.map((r: Record<string, any>, i) => {
    if (typeof r?.id !== 'string' || !r.id) throw new Error(`targets[${i}]: id is missing`);
    if (seen.has(r.id)) throw new Error(`targets: duplicate id ${r.id}`);
    seen.add(r.id);
    if (typeof r.lightweight !== 'boolean') throw new Error(`${r.id}: lightweight must be true or false`);
    if (!Array.isArray(r.indicators) || !r.indicators.length) throw new Error(`${r.id}: indicators must be a non-empty list`);
    const indicators = r.indicators.map((x: Record<string, any>) => {
      if (!(REVIEW_INDICATORS as readonly string[]).includes(x?.indicator)) throw new Error(`${r.id}: unknown indicator ${x?.indicator}`);
      if (!(x.weight > 0)) throw new Error(`${r.id}: ${x.indicator}'s weight must be > 0`);
      if (typeof x.floor !== 'number' || typeof x.target !== 'number' || x.floor === x.target) {
        throw new Error(`${r.id}: ${x.indicator} needs a floor and a different target`);
      }
      return { indicator: x.indicator as ReviewIndicator, weight: x.weight, floor: x.floor, target: x.target };
    });
    return { id: r.id, lightweight: r.lightweight, indicators };
  });
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** The real illegal-floor share of the city's completed village floor (the statistics step's series, computed now). */
export function realIllegalShare(s: GameState): number {
  const all = s.blocks.reduce((a, b) => a + villageM2(b, ['completed']), 0);
  return all > 0 ? s.blocks.reduce((a, b) => a + illegalShare(b) * villageM2(b, ['completed']), 0) / all : 0;
}
/** What inspectors see (§5.8): during a sweep, the real share × (1 − visible_cut). */
export const visibleIllegalShare = (s: GameState, p: SliceParams) =>
  realIllegalShare(s) * (s.sweep.active ? 1 - p.sweep.visible_cut : 1);

/** An indicator's value now (§5.8): trailing flows over the last 12 months of history. */
export function indicatorValue(s: GameState, p: SliceParams, k: ReviewIndicator): number {
  const h = s.history;
  if (k === 'exports_usd') return h.exports.slice(-12).reduce((a, x) => a + x, 0) / p.fiscal.forex.yuan_per_usd;
  if (k === 'forex_earned_usd') {
    return s.fiscal.ledger.reduce((a, e) => a + (e.type === 'retention' && e.date > s.date - 12 ? e.amount : 0), 0);
  }
  if (k === 'foreign_firm_jobs') return s.firms.reduce((a, f) => a + (f.ownership !== 'inland_soe' ? f.posted : 0), 0);
  if (k === 'projects_completed') {
    return s.fiscal.projects.filter((x) => x.completed !== undefined && x.completed > s.date - 12).length;
  }
  return visibleIllegalShare(s, p);
}

/** Σ w × clamp((value − floor) ÷ (target − floor), 0, 1) ÷ Σ w; lower is better when floor > target. */
export function scoreReview(s: GameState, p: SliceParams, t: ReviewTarget): { score: number; items: ReviewRecord['items'] } {
  let num = 0, den = 0;
  const items = t.indicators.map((x) => {
    const value = indicatorValue(s, p, x.indicator);
    const score = clamp((value - x.floor) / (x.target - x.floor), 0, 1);
    num += x.weight * score; den += x.weight;
    return { indicator: x.indicator, value, score };
  });
  return { score: num / den, items };
}

/** Tick step 12 (§5.8): scrutiny's decay and gains, the sweep's clock, and the failure state at a quarter's end. */
export function climate(p: SliceParams) {
  return (ctx: TickContext): void => {
    const s = ctx.state, C = p.climate;
    let gains = s.policy.permitRegime === 'loose' ? C.gain.loose_permit : 0;
    gains += C.gain.illegal_share * realIllegalShare(s);
    for (const e of ctx.events) {
      if (e.kind === 'land_for_recurring' && e.detail?.status !== 'sanctioned') gains += C.gain.grey_land_per_100k * (e.detail!.amount as number) / 1e5;
      if (e.kind === 'offer_accepted' && e.detail?.shortcut !== undefined) gains += C.gain.shortcut;
    }
    s.climate.scrutiny = clamp(s.climate.scrutiny * (1 - C.scrutiny_decay) + C.permit_factor[s.policy.permitRegime] * gains, 0, 100);
    if (s.sweep.active) {
      s.sweep.monthsLeft -= 1;
      if (s.sweep.monthsLeft <= 0) s.sweep = { active: false, monthsLeft: 0 };
    }
    if (s.subStep !== 2) return;
    s.climate.overQuarters = s.climate.scrutiny > C.failure_threshold ? s.climate.overQuarters + 1 : 0;
    if (s.climate.overQuarters >= C.failure_quarters && !s.ended) {
      s.ended = { date: s.date, reason: 'failure' };
      const inst = ctx.raise({ card: FAILURE_CARD, options: ['noted'], interrupting: false });
      inst.payload = { scrutiny: s.climate.scrutiny, quarters: s.climate.overQuarters };
      ctx.events.push({ step: 'stability', kind: 'run_ended', detail: { reason: 'failure' } });
    }
  };
}

/** The chance a leader's risk trips this month (leadership §2.6): base × sigmoid(k × (risk − threshold)). */
export const tripChance = (risk: number, p: SliceParams) =>
  p.fall.base / (1 + Math.exp(-p.fall.k * (risk - p.fall.threshold)));

/** Tick step 14 (§5.8): the fall from grace each month, then the annual review in December with the targets. */
export function reviews(p: SliceParams, targets?: TargetContent) {
  return (ctx: TickContext): void => {
    const s = ctx.state;
    const ev = (kind: string, detail: Record<string, unknown>) => ctx.events.push({ step: 'reviews', kind, detail });
    s.pendingCards = s.pendingCards.filter((c) => c.card !== REVIEW_CARD || c.expires === undefined || s.date < c.expires);

    // the fall from grace: only a leader with discipline risk draws, so a player with no shortcut never trips
    for (const l of [...s.leadership.leaders]) {
      if (!(l.disciplineRisk > 0) || ctx.rng.float() >= tripChance(l.disciplineRisk, p)) continue;
      const entangled = s.leadership.entangled.some((e) => e.leader === l.id);
      const k = s.leadership.bench.findIndex((b) => b.role === l.role);
      let replacedBy = l.id;
      if (k >= 0) {
        const [next] = s.leadership.bench.splice(k, 1);
        s.leadership.leaders[s.leadership.leaders.indexOf(l)] = { ...next!, disciplineRisk: 0 };
        replacedBy = next!.id;
      } else l.disciplineRisk = 0;
      s.falls.push({ date: s.date, leader: l.id, replacedBy, entangled });
      s.fiscal.frozenUntil = s.date + p.fall.freeze_months;
      s.climate.scrutiny = clamp(s.climate.scrutiny + p.fall.scrutiny, 0, 100);
      if (entangled) s.reviews.vetoes.push({ date: s.date, reason: 'leader_corruption' });
      ev('fall', { leader: l.id, replacedBy, entangled });
    }

    if (!targets || s.date % 12 !== 11) return;                 // the review is held in December
    const t = targets[s.reviews.held.length];
    if (!t) return;
    const { score, items } = scoreReview(s, p, t);
    // the unannounced team: it catches a sweep in progress with p = min(1, base_p × (real − visible))
    let caught = false;
    if (s.sweep.active) {
      const hidden = realIllegalShare(s) - visibleIllegalShare(s, p);
      caught = ctx.rng.float() < Math.min(1, p.sweep.base_p * hidden);
      if (caught) s.reviews.vetoes.push({ date: s.date, reason: 'sweep_caught' });
    }
    const veto = s.reviews.vetoes.find((v) => v.date > s.date - 12)?.reason;
    const pass = t.lightweight || (score >= p.review.pass_mark && veto === undefined);
    if (!t.lightweight) {
      for (const l of s.leadership.leaders) l.standing = clamp(l.standing + (pass ? p.review.standing_pass : -p.review.standing_fail), 0, 100);
      s.climate.scrutiny = clamp(s.climate.scrutiny + (pass ? -p.review.scrutiny_relief : p.review.scrutiny_fail), 0, 100);
    }
    const rec: ReviewRecord = { index: s.reviews.held.length, date: s.date, lightweight: t.lightweight, score, pass, caught,
      ...(veto !== undefined && !t.lightweight ? { vetoed: veto } : {}), items };
    s.reviews.held.push(rec);
    const inst = ctx.raise({ card: REVIEW_CARD, options: ['noted'], interrupting: false });
    inst.payload = { review: rec, target: t.id };
    inst.expires = s.date + (3 - s.subStep);
    ev('review', { index: rec.index, score, pass, ...(rec.vetoed ? { vetoed: rec.vetoed } : {}) });
  };
}
