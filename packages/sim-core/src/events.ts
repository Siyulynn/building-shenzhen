/**
 * Events (phase1-slice.md §5.7, §7): tick step 2. Anchors fire on their content dates, scripted beats on their
 * prologue turn; their effects are a closed set of kinds. The SEZ chain, the guaranteed first contract, the readiness
 * check and the first wave run through here. No code reads a calendar year: every date is content citing claims.
 */
import type { SliceParams } from './params.js';
import type { CardInstance, GameState, LocalizedString } from './state.js';
import type { TickContext } from './step.js';
import { archetypeAvailable, raiseOffer, type Buildable, type InvestorArchetype } from './investors.js';
import { firstWaveCards, readiness } from './readiness.js';
import type { FiscalContent } from './fiscal.js';
import { parseYM, type YM } from './ym.js';

export type EventEffect =
  | { kind: 'offer'; archetype: string }
  | { kind: 'readiness_check' }
  | { kind: 'unlock'; key: string }
  | { kind: 'set_regime'; regime: string }
  | { kind: 'sez_open' }
  | { kind: 'first_wave' };
const EFFECT_KINDS = ['offer', 'readiness_check', 'unlock', 'set_regime', 'sez_open', 'first_wave'] as const;
export type EventTrigger = { date: YM } | { prologueTurn: number };
export interface EventCard { interrupting: boolean; options: { id: string; name: LocalizedString }[] }
/** One record of content/slice/events.yaml, compiled. Content, never state. */
export interface EventDef {
  id: string; name: LocalizedString; family: 'anchor' | 'scripted';
  trigger: EventTrigger; effects: EventEffect[]; card?: EventCard; onAnswer: EventEffect[];
}
export type EventContent = readonly EventDef[];

/** The readiness report card's option (§5.7). */
export const READINESS_NOTED = 'noted';

function effectsOf(raw: unknown, id: string, what: string): EventEffect[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${id}: ${what} must be a list`);
  return raw.map((e: Record<string, any>) => {
    if (!(EFFECT_KINDS as readonly string[]).includes(e?.kind)) throw new Error(`${id}: unknown effect kind ${e?.kind}`);
    if (e.kind === 'offer' && typeof e.archetype !== 'string') throw new Error(`${id}: an offer names an archetype`);
    if (e.kind === 'unlock' && (typeof e.key !== 'string' || !e.key)) throw new Error(`${id}: an unlock names a key`);
    if (e.kind === 'set_regime' && typeof e.regime !== 'string') throw new Error(`${id}: set_regime names a regime`);
    return { ...e } as EventEffect;
  });
}

/**
 * Validate content/slice/events.yaml (§5.7) against the params, the investor archetypes and, if given, the fiscal
 * content: every effect kind is known, offers name archetypes with jobs in params.events, set_regime names a regime,
 * and sez_open and first_wave sit in an on_answer whose card's options are the keys of params.sez.priorities.
 */
export function compileEvents(raw: unknown, p: SliceParams, investors: readonly InvestorArchetype[],
  fiscal?: FiscalContent): EventDef[] {
  if (!Array.isArray(raw)) throw new Error('events: expected a list');
  for (const [pr, mix] of Object.entries(p.sez.priorities)) {
    for (const a of Object.keys(mix)) if (!investors.some((x) => x.id === a)) throw new Error(`params: sez.priorities.${pr} names unknown archetype ${a}`);
  }
  const seen = new Set<string>();
  return raw.map((r: Record<string, any>, i): EventDef => {
    if (typeof r?.id !== 'string' || !r.id) throw new Error(`events[${i}]: id is missing`);
    if (seen.has(r.id)) throw new Error(`events: duplicate id ${r.id}`);
    seen.add(r.id);
    if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${r.id}: name needs zh and en`);
    if (r.family !== 'anchor' && r.family !== 'scripted') throw new Error(`${r.id}: family must be anchor or scripted`);
    const t = r.trigger ?? {};
    const hasDate = t.date !== undefined, hasTurn = t.prologue_turn !== undefined;
    if (hasDate === hasTurn) throw new Error(`${r.id}: the trigger needs exactly one of date and prologue_turn`);
    if (hasTurn && !(Number.isInteger(t.prologue_turn) && t.prologue_turn >= 0)) throw new Error(`${r.id}: prologue_turn must be a whole number`);
    if (r.family === 'anchor' && !hasDate) throw new Error(`${r.id}: an anchor fires on its date`);
    const trigger: EventTrigger = hasDate ? { date: parseYM(String(t.date)) } : { prologueTurn: t.prologue_turn };
    let card: EventCard | undefined;
    if (r.card !== undefined) {
      const opts = Array.isArray(r.card.options) ? r.card.options : [];
      if (!opts.length) throw new Error(`${r.id}: a card needs options`);
      for (const o of opts) {
        if (typeof o?.id !== 'string' || typeof o.name?.zh !== 'string' || typeof o.name?.en !== 'string') {
          throw new Error(`${r.id}: each card option needs an id and a name in zh and en`);
        }
      }
      if (typeof r.card.interrupting !== 'boolean') throw new Error(`${r.id}: card.interrupting must be true or false`);
      card = { interrupting: r.card.interrupting, options: opts.map((o: any) => ({ id: o.id, name: { zh: o.name.zh, en: o.name.en } })) };
    }
    const effects = effectsOf(r.effects, r.id, 'effects');
    const onAnswer = effectsOf(r.on_answer, r.id, 'on_answer');
    if (onAnswer.length && !card) throw new Error(`${r.id}: on_answer needs a card`);
    for (const e of [...effects, ...onAnswer]) {
      if (e.kind === 'offer') {
        if (!investors.some((a) => a.id === e.archetype)) throw new Error(`${r.id}: unknown archetype ${e.archetype}`);
        if (!p.events[r.id]?.jobs) throw new Error(`${r.id}: params.events.${r.id}.jobs is not set`);
      }
      if (e.kind === 'set_regime' && fiscal && !fiscal.regimes.some((x) => x.id === e.regime)) {
        throw new Error(`${r.id}: unknown regime ${e.regime}`);
      }
      if ((e.kind === 'sez_open' || e.kind === 'first_wave') && !onAnswer.includes(e)) throw new Error(`${r.id}: ${e.kind} runs on answer`);
    }
    if (onAnswer.some((e) => e.kind === 'sez_open' || e.kind === 'first_wave')) {
      const keys = Object.keys(p.sez.priorities).sort().join(',');
      if (card!.options.map((o) => o.id).sort().join(',') !== keys) throw new Error(`${r.id}: its options must be params.sez.priorities' keys`);
    }
    return { id: r.id, name: { zh: r.name.zh, en: r.name.en }, family: r.family, trigger, effects,
      ...(card ? { card } : {}), onAnswer };
  });
}

const due = (s: GameState, t: EventTrigger) => ('date' in t ? s.date >= t.date : s.turn >= t.prologueTurn);

/** The readiness report a card carries (§5.7): the parts, the bar, the weakest part and the first wave's forecast. */
export function readinessReport(s: GameState, p: SliceParams, buildable?: Buildable) {
  const r = readiness(s, p, buildable);
  return { ...r, forecastCards: firstWaveCards(r.bar, p) };
}

/** Tick step 2 (§5.7): expire event cards, apply this month's answers, then fire the events that are due. */
export function events(p: SliceParams, content: {
  events?: EventContent; investors?: readonly InvestorArchetype[]; buildable?: Buildable;
}) {
  const defs = content.events ?? [];
  const byId = new Map(defs.map((d) => [d.id, d]));
  const archetypes = content.investors ?? [];
  return (ctx: TickContext): void => {
    if (!defs.length) return;
    const s = ctx.state;
    const ev = (kind: string, detail: Record<string, unknown>) => ctx.events.push({ step: 'events', kind, detail });

    const apply = (d: EventDef, e: EventEffect, option?: string) => {
      if (e.kind === 'offer') {
        const a = archetypes.find((x) => x.id === e.archetype);
        if (!a) throw new Error(`${d.id}: no investor archetype ${e.archetype}`);
        raiseOffer(ctx, 'events', a, p.events[d.id]!.jobs!, p, content.buildable);
      } else if (e.kind === 'readiness_check') {
        const inst = ctx.raise({ card: d.id, options: [READINESS_NOTED], interrupting: false });
        inst.payload = { report: readinessReport(s, p, content.buildable) };
        inst.expires = s.date + (3 - s.subStep);
      } else if (e.kind === 'unlock') {
        if (!s.events.unlocked.includes(e.key)) s.events.unlocked.push(e.key);
        ev('unlocked', { key: e.key, by: d.id });
      } else if (e.kind === 'set_regime') {
        s.fiscal.regime = e.regime;
        ev('regime', { regime: e.regime, by: d.id });
      } else if (e.kind === 'sez_open') {
        const r = readiness(s, p, content.buildable);
        s.sez = { opened: s.date, priority: option!, readiness: r.bar };
        ev('sez_opened', { priority: option, readiness: r.bar, weakest: r.weakest });
      } else {
        firstWave(ctx, d);
      }
    };

    // the first wave (§5.7): its size from the bar at the opening, each card's origin drawn by the priority's weights
    const firstWave = (c: TickContext, d: EventDef) => {
      const bar = s.sez.readiness ?? readiness(s, p, content.buildable).bar;
      const n = firstWaveCards(bar, p);
      const mix = p.sez.priorities[s.sez.priority ?? ''] ?? {};
      const pool = archetypes.filter((a) => archetypeAvailable(s, a) && (mix[a.id] ?? 0) > 0);
      const total = pool.reduce((t, a) => t + mix[a.id]!, 0);
      let raisedCards = 0;
      for (let k = 0; k < n && total > 0; k++) {
        let x = c.rng.float() * total, a = pool[pool.length - 1]!;
        for (const q of pool) { x -= mix[q.id]!; if (x < 0) { a = q; break; } }
        const [lo, hi] = p.investors.archetypes[a.id]!.jobs;
        raiseOffer(c, 'events', a, lo + c.rng.int(hi - lo + 1), p, content.buildable);
        raisedCards++;
      }
      s.sez = { ...s.sez, waveCards: raisedCards };
      ev('first_wave', { cards: raisedCards, readiness: bar, by: d.id });
    };

    // 1. event cards past their expiry leave
    s.pendingCards = s.pendingCards.filter((c: CardInstance) => {
      if (!byId.has(c.card) || c.expires === undefined || s.date < c.expires) return true;
      ev('event_card_lapsed', { card: c.id });
      return false;
    });

    // 2. this month's answers: on_answer effects in order
    for (const { card, option } of s.answered) {
      const d = byId.get(card.card);
      if (!d) continue;
      ev('event_answered', { event: d.id, option });
      for (const e of d.onAnswer) apply(d, e, option);
    }

    // 3. fire the events that are due, once each, in content order
    for (const d of defs) {
      if (s.events.fired.some((f) => f.id === d.id) || !due(s, d.trigger)) continue;
      s.events.fired.push({ id: d.id, date: s.date });
      ev('event_fired', { event: d.id });
      for (const e of d.effects) apply(d, e);
      if (d.card) {
        const inst = ctx.raise({ card: d.id, options: d.card.options.map((o) => o.id), interrupting: d.card.interrupting });
        if (d.onAnswer.some((e) => e.kind === 'first_wave')) inst.payload = { report: readinessReport(s, p, content.buildable) };
        if (!d.card.interrupting) inst.expires = s.date + (3 - s.subStep);
      }
    }
  };
}
