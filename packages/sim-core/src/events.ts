/**
 * Events (phase1-slice.md §5.7, §5.8, §7): tick step 2. Anchors fire on their content dates, scripted beats on their
 * prologue turn, recurring ones in a month of the year, emergent ones on a monthly hazard, milestones on a condition;
 * their effects are a closed set of kinds. No code reads a calendar year: every date is content citing claims.
 */
import { PERMIT_REGIMES, type PermitRegime } from './enums.js';
import {
  addObligation, applyFiscalAction, commitCofinanced, fiscalViews, grantFactor, liveProject, regimeOf, type FiscalContent,
} from './fiscal.js';
import type { SliceParams } from './params.js';
import type { CardInstance, FirmTerms, GameState, LocalizedString } from './state.js';
import type { TickContext } from './step.js';
import { archetypeAvailable, raiseOffer, type Buildable, type InvestorArchetype } from './investors.js';
import { firstWaveCards, readiness } from './readiness.js';
import { offerProjectLoan } from './systems/finance.js';
import { isOpen } from './systems/industry.js';
import { verdict } from './verdict.js';
import { parseYM, type YM } from './ym.js';
import { isOpeningBeat } from './opening.js';
import { LAND_COVER_CLASSES, type LandCover } from './landcover.js';
import { OFFERED_STRUCTURES, liveOrder, type StructureKind } from './works.js';
import { orderCofinanced } from './orders.js';
import type { StartNetwork } from './sites.js';

export type EventEffect = { option?: string } & (
  | { kind: 'offer'; archetype: string; terms?: boolean }
  | { kind: 'readiness_check' }
  | { kind: 'unlock'; key: string }
  | { kind: 'set_regime'; regime: string }
  | { kind: 'sez_open' }
  | { kind: 'first_wave' }
  // M5b (§5.8)
  | { kind: 'scrutiny' }
  | { kind: 'cost' }
  | { kind: 'standing' }
  | { kind: 'set_permit' }
  | { kind: 'commit_choice'; area: number }
  | { kind: 'offer_loan' }
  | { kind: 'cofinance'; template?: string; structure?: StructureKind; area: number }   // R9: a structure in place of a template
  | { kind: 'contract_team'; team: string }
  | { kind: 'rush' }
  | { kind: 'orders' }
  | { kind: 'budget_report' }
  | { kind: 'sweep' }
  | { kind: 'veto'; reason: string }
  | { kind: 'end_run' });
const EFFECT_KINDS = ['offer', 'readiness_check', 'unlock', 'set_regime', 'sez_open', 'first_wave', 'scrutiny', 'cost',
  'standing', 'set_permit', 'commit_choice', 'offer_loan', 'cofinance', 'contract_team', 'rush', 'orders', 'budget_report',
  'sweep', 'veto', 'end_run'] as const;
/** The effect kinds whose number is params.events.<id>.<field>. */
const NUMBER_OF: Partial<Record<EventEffect['kind'], string[]>> = {
  scrutiny: ['scrutiny'], cost: ['cost'], standing: ['standing'], orders: ['factor', 'months'],
};

/** Milestone conditions (§5.8), read from the state. */
export const EVENT_CONDITIONS = ['first_zone_firm_open', 'firm_open', 'shekou_captured', 'site_preparation_committed',
  'village_works'] as const;
export type EventCondition = (typeof EVENT_CONDITIONS)[number];
export type EventTrigger =
  | { date: YM }
  | { prologueTurn: number }
  | { monthOfYear: number }                                        // recurring: every year in that month
  | { hazard: number; monthsOfYear?: number[]; fromTurn?: number; guaranteedByTurn?: number; condition?: EventCondition }
  | { condition: EventCondition };
/** lapse: the option taken when a non-interrupting card expires unanswered (§5.8); without it, nothing happens. */
export interface EventCard { interrupting: boolean; options: { id: string; name: LocalizedString }[]; lapse?: string }
/** One record of content/slice/events.yaml, compiled. Content, never state. */
/** R9 (§5.8): where a news record is read, and its tone. */
export const NEWS_DESKS = ['beijing', 'province', 'city', 'hong_kong'] as const;
export const NEWS_TONES = ['opening', 'warning', 'relief', 'texture'] as const;
export interface NewsBlock { desk: (typeof NEWS_DESKS)[number]; tone: (typeof NEWS_TONES)[number] }
/** The effect kinds a news record may carry (revision plan §4.4). */
const NEWS_EFFECTS: readonly string[] = ['unlock'];
export interface EventDef {
  id: string; name: LocalizedString; family: 'anchor' | 'scripted' | 'recurring' | 'emergent' | 'milestone' | 'news';
  news?: NewsBlock; text?: LocalizedString;                       // R9 (§5.8): a news record's block and its text
  description?: LocalizedString;                                  // R7 (§5.7): what happened and why it matters
  trigger: EventTrigger; recurring: boolean;
  requires?: string; until?: string;                              // gates: an unlock key that must be set, or not yet
  effects: EventEffect[]; card?: EventCard; onAnswer: EventEffect[];
}
export type EventContent = readonly EventDef[];

/** The readiness report card's option (§5.7), and the option of every card that only reports. */
export const READINESS_NOTED = 'noted';
export const FAILURE_CARD = 'climate.failure';

const FAMILIES = ['anchor', 'scripted', 'recurring', 'emergent', 'milestone', 'news'] as const;
const monthOk = (m: unknown) => Number.isInteger(m) && (m as number) >= 0 && (m as number) <= 11;
const wholeOk = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;

function effectsOf(raw: unknown, id: string, what: string): EventEffect[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${id}: ${what} must be a list`);
  return raw.map((e: Record<string, any>) => {
    if (!(EFFECT_KINDS as readonly string[]).includes(e?.kind)) throw new Error(`${id}: unknown effect kind ${e?.kind}`);
    if (e.kind === 'offer' && typeof e.archetype !== 'string') throw new Error(`${id}: an offer names an archetype`);
    if (e.kind === 'unlock' && (typeof e.key !== 'string' || !e.key)) throw new Error(`${id}: an unlock names a key`);
    if (e.kind === 'set_regime' && typeof e.regime !== 'string') throw new Error(`${id}: set_regime names a regime`);
    if ((e.kind === 'commit_choice' || e.kind === 'cofinance') && !Number.isInteger(e.area)) throw new Error(`${id}: ${e.kind} names an area`);
    if (e.kind === 'cofinance' && (typeof e.template === 'string') === (e.structure !== undefined)) {
      throw new Error(`${id}: cofinance names a template or a structure, not both`);
    }
    if (e.kind === 'cofinance' && e.structure !== undefined && !OFFERED_STRUCTURES.includes(e.structure)) {
      throw new Error(`${id}: cofinance cannot order a ${e.structure}`);
    }
    if (e.kind === 'contract_team' && typeof e.team !== 'string') throw new Error(`${id}: contract_team names a team`);
    if (e.kind === 'veto' && typeof e.reason !== 'string') throw new Error(`${id}: a veto names its reason`);
    if (e.option !== undefined && what !== 'on_answer') throw new Error(`${id}: only an on_answer effect names an option`);
    return { ...e } as EventEffect;
  });
}

function triggerOf(r: Record<string, any>): { trigger: EventTrigger; recurring: boolean } {
  const t = r.trigger ?? {};
  const keys = ['date', 'prologue_turn', 'month_of_year', 'hazard', 'condition'].filter((k) => t[k] !== undefined);
  // a hazard may carry a condition as its gate; otherwise exactly one kind
  const kinds = keys.includes('hazard') ? ['hazard'] : keys;
  if (kinds.length !== 1) throw new Error(`${r.id}: the trigger needs exactly one of date, prologue_turn, month_of_year, hazard and condition`);
  const recurring = t.recurring === true;
  const cond = (c: unknown): EventCondition => {
    if (!(EVENT_CONDITIONS as readonly string[]).includes(c as string)) throw new Error(`${r.id}: unknown condition ${c}`);
    return c as EventCondition;
  };
  switch (kinds[0]) {
    case 'date': return { trigger: { date: parseYM(String(t.date)) }, recurring: false };
    case 'prologue_turn':
      if (!wholeOk(t.prologue_turn)) throw new Error(`${r.id}: prologue_turn must be a whole number`);
      return { trigger: { prologueTurn: t.prologue_turn }, recurring: false };
    case 'month_of_year':
      if (!monthOk(t.month_of_year)) throw new Error(`${r.id}: month_of_year must be 0..11`);
      if (!recurring) throw new Error(`${r.id}: a month_of_year trigger is recurring`);
      return { trigger: { monthOfYear: t.month_of_year }, recurring: true };
    case 'hazard': {
      if (!(typeof t.hazard === 'number' && t.hazard >= 0 && t.hazard <= 1)) throw new Error(`${r.id}: hazard must be in [0, 1]`);
      if (t.months_of_year !== undefined && !(Array.isArray(t.months_of_year) && t.months_of_year.every(monthOk))) {
        throw new Error(`${r.id}: months_of_year must list months 0..11`);
      }
      for (const k of ['from_turn', 'guaranteed_by_turn']) if (t[k] !== undefined && !wholeOk(t[k])) throw new Error(`${r.id}: ${k} must be a whole number`);
      if (t.guaranteed_by_turn !== undefined && t.from_turn !== undefined && t.guaranteed_by_turn < t.from_turn) {
        throw new Error(`${r.id}: guaranteed_by_turn must not come before from_turn`);
      }
      return { trigger: { hazard: t.hazard,
        ...(t.months_of_year ? { monthsOfYear: [...t.months_of_year] } : {}),
        ...(t.from_turn !== undefined ? { fromTurn: t.from_turn } : {}),
        ...(t.guaranteed_by_turn !== undefined ? { guaranteedByTurn: t.guaranteed_by_turn } : {}),
        ...(t.condition !== undefined ? { condition: cond(t.condition) } : {}) }, recurring };
    }
    default:
      return { trigger: { condition: cond(t.condition) }, recurring: false };
  }
}

/**
 * Validate content/slice/events.yaml (§5.7, §5.8) against the params, the investor archetypes and, if given, the
 * fiscal content: every effect and trigger kind is known; offers name archetypes with jobs in params.events; effect
 * numbers are in params.events; set_regime, commit_choice, cofinance and contract_team name fiscal content;
 * set_permit's options are permit regimes; sez_open and first_wave sit in an on_answer whose card's options are the
 * keys of params.sez.priorities; a per-option effect names one of its card's options.
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
    if (!(FAMILIES as readonly string[]).includes(r.family)) throw new Error(`${r.id}: family must be one of ${FAMILIES.join(', ')}`);
    const desc = r.description;
    if (desc !== undefined && (typeof desc?.zh !== 'string' || !desc.zh.trim() || typeof desc.en !== 'string' || !desc.en.trim())) {
      throw new Error(`${r.id}: description needs a non-empty zh and en`);
    }
    const { trigger, recurring } = triggerOf(r);
    if (r.family === 'anchor' && !('date' in trigger)) throw new Error(`${r.id}: an anchor fires on its date`);
    // R9 (§5.8): a news record: a desk and tone, a text in both languages, a claim, no card, unlock-only effects
    let news: NewsBlock | undefined, text: LocalizedString | undefined;
    if (r.family === 'news') {
      if (!(NEWS_DESKS as readonly string[]).includes(r.news?.desk)) throw new Error(`${r.id}: news.desk must be one of ${NEWS_DESKS.join(', ')}`);
      if (!(NEWS_TONES as readonly string[]).includes(r.news?.tone)) throw new Error(`${r.id}: news.tone must be one of ${NEWS_TONES.join(', ')}`);
      if (r.news.weather !== undefined) throw new Error(`${r.id}: news has no weather; a timed modifier carries it (§5.8)`);
      if (typeof r.text?.zh !== 'string' || !r.text.zh.trim() || typeof r.text?.en !== 'string' || !r.text.en.trim()) {
        throw new Error(`${r.id}: news text needs a non-empty zh and en`);
      }
      if (!Array.isArray(r.claims) || !r.claims.length) throw new Error(`${r.id}: a news record cites at least one claim`);
      if (r.card !== undefined || r.on_answer !== undefined) throw new Error(`${r.id}: a news record has no card`);
      if (!('date' in trigger) && !isOpeningBeat({ trigger, recurring })) throw new Error(`${r.id}: news fires on a date, or at turn 0`);
      for (const e of r.effects ?? []) if (!NEWS_EFFECTS.includes(e?.kind)) throw new Error(`${r.id}: a news record's effects may only be ${NEWS_EFFECTS.join(' or ')}`);
      news = { desk: r.news.desk, tone: r.news.tone };
      text = { zh: r.text.zh, en: r.text.en };
    } else if (r.news !== undefined || r.text !== undefined) throw new Error(`${r.id}: only a news record has news and text`);
    for (const g of ['requires', 'until']) if (r[g] !== undefined && (typeof r[g] !== 'string' || !r[g])) throw new Error(`${r.id}: ${g} names an unlock key`);
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
      if (r.card.lapse !== undefined) {
        if (card.interrupting) throw new Error(`${r.id}: an interrupting card never lapses`);
        if (!card.options.some((o) => o.id === r.card.lapse)) throw new Error(`${r.id}: card.lapse ${r.card.lapse} is not an option`);
        card.lapse = r.card.lapse;
      }
    }
    const effects = effectsOf(r.effects, r.id, 'effects');
    const onAnswer = effectsOf(r.on_answer, r.id, 'on_answer');
    // R7 (§5.8): a turn-0 beat fires in createInitialState, which has no RNG or tick: it may only unlock
    if (isOpeningBeat({ trigger, recurring }) && effects.some((e) => e.kind !== 'unlock')) {
      throw new Error(`${r.id}: a turn-0 beat fires at init and its effects may only unlock`);
    }
    if (onAnswer.length && !card) throw new Error(`${r.id}: on_answer needs a card`);
    const optionIds = card?.options.map((o) => o.id) ?? [];
    const num = p.events[r.id] as Record<string, number | undefined> | undefined;
    for (const e of [...effects, ...onAnswer]) {
      if (e.option !== undefined && !optionIds.includes(e.option)) throw new Error(`${r.id}: no card option ${e.option}`);
      for (const f of NUMBER_OF[e.kind] ?? []) {
        if (typeof num?.[f] !== 'number') throw new Error(`${r.id}: params.events.${r.id}.${f} is not set`);
      }
      if (e.kind === 'offer') {
        if (!investors.some((a) => a.id === e.archetype)) throw new Error(`${r.id}: unknown archetype ${e.archetype}`);
        if (!num?.jobs) throw new Error(`${r.id}: params.events.${r.id}.jobs is not set`);
        if (e.terms && num.tax_holiday_months === undefined && num.land_fee_factor === undefined) {
          throw new Error(`${r.id}: an offer with terms needs params.events.${r.id}.tax_holiday_months or land_fee_factor`);
        }
      }
      if (fiscal) {
        if (e.kind === 'set_regime' && !fiscal.regimes.some((x) => x.id === e.regime)) throw new Error(`${r.id}: unknown regime ${e.regime}`);
        if (e.kind === 'cofinance' && e.template !== undefined && !fiscal.projects.some((x) => x.id === e.template && x.target === 'area')) {
          throw new Error(`${r.id}: cofinance needs an area project template, not ${e.template}`);
        }
        if (e.kind === 'contract_team' && !fiscal.teams.some((x) => x.id === e.team && x.modes.includes('pool'))) {
          throw new Error(`${r.id}: contract_team needs a pool team, not ${e.team}`);
        }
      }
      if ((e.kind === 'set_permit' || e.kind === 'commit_choice') && !onAnswer.includes(e)) throw new Error(`${r.id}: ${e.kind} runs on answer`);
      if (e.kind === 'set_permit' && !optionIds.every((o) => (PERMIT_REGIMES as readonly string[]).includes(o))) {
        throw new Error(`${r.id}: set_permit's options must be permit regimes`);
      }
      if ((e.kind === 'budget_report' || e.kind === 'end_run') && !card) throw new Error(`${r.id}: ${e.kind} needs a card`);
      if ((e.kind === 'sez_open' || e.kind === 'first_wave') && !onAnswer.includes(e)) throw new Error(`${r.id}: ${e.kind} runs on answer`);
    }
    if (onAnswer.some((e) => e.kind === 'sez_open' || e.kind === 'first_wave')) {
      const keys = Object.keys(p.sez.priorities).sort().join(',');
      if ([...optionIds].sort().join(',') !== keys) throw new Error(`${r.id}: its options must be params.sez.priorities' keys`);
    }
    return { id: r.id, name: { zh: r.name.zh, en: r.name.en }, family: r.family,
      ...(desc ? { description: { zh: desc.zh, en: desc.en } } : {}), ...(news ? { news, text } : {}), trigger, recurring,
      ...(r.requires ? { requires: r.requires } : {}), ...(r.until ? { until: r.until } : {}),
      effects, ...(card ? { card } : {}), onAnswer };
  });
}

/** The playable areas with village-class cells (§5.5); without a land-cover layer, none. */
export function villageAreas(s: GameState, lc?: LandCover): Set<number> {
  const out = new Set<number>();
  if (!lc) return out;
  const v = LAND_COVER_CLASSES.indexOf('village');
  for (const a of s.areas) if (a.access === 'playable' && a.cells.some((c) => lc.classOf[c] === v)) out.add(a.id);
  return out;
}

/**
 * R9 (§5.8): the petition's condition. A live works service order, or a live site-preparation project the city pays
 * for, in an area with village-class cells; or a land-compensation obligation, once one exists.
 */
function villageWorks(s: GameState, villages: ReadonlySet<number>): boolean {
  if (s.fiscal.obligations.some((o) => o.kind === 'compensation')) return true;
  const areaOfZone = (z?: number) => s.zones.find((q) => q.id === z)?.area;
  const inVillageArea = (z?: number) => { const a = areaOfZone(z); return a !== undefined && villages.has(a); };
  return s.worksOrders.some((o) => o.kind === 'service' && liveOrder(o) && inVillageArea(o.zone))
    || s.fiscal.projects.some((x) => x.kind === 'site_preparation' && !x.cofinanced && liveProject(x) && inVillageArea(x.zone));
}

/** Is a milestone's condition true now (§5.8)? `villages` is villageAreas' set, for village_works. */
export function conditionHolds(s: GameState, c: EventCondition, villages: ReadonlySet<number> = new Set()): boolean {
  if (c === 'village_works') return villageWorks(s, villages);
  if (c === 'first_zone_firm_open') return s.firms.some((f) => f.zone !== undefined && isOpen(f, s.date));
  if (c === 'firm_open') return s.firms.some((f) => isOpen(f, s.date));
  if (c === 'shekou_captured') return s.shekou.captured > 0;
  // R4.5: a works service order prepares sites too (§5.8)
  return s.fiscal.projects.some((x) => x.kind === 'site_preparation' && x.stage !== 'cancelled')
    || s.worksOrders.some((o) => o.kind === 'service' && o.stage !== 'cancelled');
}

const gated = (s: GameState, d: EventDef) =>
  (!d.requires || s.events.unlocked.includes(d.requires)) && (!d.until || !s.events.unlocked.includes(d.until));

/** The readiness report a card carries (§5.7): the parts, the bar, the weakest part and the first wave's forecast. */
export function readinessReport(s: GameState, p: SliceParams, buildable?: Buildable) {
  const r = readiness(s, p, buildable);
  return { ...r, forecastCards: firstWaveCards(r.bar, p) };
}

/**
 * The budget card (§5.8): this year's grant factor and the recurring balance at last month's rate with this month's
 * grant, plus the four-quarter warning when the regime's grant schedule cuts the factor within the next 12 months:
 * the coming factor and the balance at that grant. The card fires before this month's finance, so last month's grant
 * (the ledger's) is swapped for this month's (the schedule's). Read from content.
 */
export function budgetReport(s: GameState, p: SliceParams, fc: FiscalContent) {
  const r = regimeOf(s, fc), now = grantFactor(r, s.date);
  const perMonth = p.fiscal.provincial_base_grant_per_year / 12;
  const grantNow = perMonth * now;
  const lastGrant = s.fiscal.ledger.reduce((a, e) => a + (e.date === s.date - 1 && e.type === 'grant' ? e.amount : 0), 0);
  const recurring = s.history.months.length ? fiscalViews(s, p).recurring.available - lastGrant + grantNow : 0;
  const cut = r.grantSchedule.find((e) => e.from > s.date && e.from <= s.date + 12 && e.factor < now);
  return { grantFactor: now, recurring,
    ...(cut ? { warning: { from: cut.from, factor: cut.factor, recurringAfter: recurring - grantNow + perMonth * cut.factor } } : {}) };
}

/** Tick step 2 (§5.7, §5.8): expire event cards, apply this month's answers, then fire the events that are due. */
export function events(p: SliceParams, content: {
  events?: EventContent; investors?: readonly InvestorArchetype[]; buildable?: Buildable; fiscal?: FiscalContent;
  landcover?: LandCover; network?: StartNetwork;
}) {
  const defs = content.events ?? [];
  const byId = new Map(defs.map((d) => [d.id, d]));
  const archetypes = content.investors ?? [];
  const fc = content.fiscal;
  let villages: Set<number> | undefined;
  return (ctx: TickContext): void => {
    if (!defs.length) return;
    const s = ctx.state;
    villages ??= villageAreas(s, content.landcover);                // the areas never change in a run
    const ev = (kind: string, detail: Record<string, unknown>) => ctx.events.push({ step: 'events', kind, detail });
    const num = (d: EventDef, f: string) => (p.events[d.id] as Record<string, number>)[f]!;
    const expiry = () => s.date + (3 - s.subStep);                // a non-interrupting card stays to the next turn
    let cofinanced: number | undefined;                           // set by cofinance, taken by the next offer
    let cofinancedOrder: number | undefined;                      // R9: the same, for a co-financed works order

    /** Apply one effect; a card-report effect returns its piece of the card's payload. */
    const apply = (d: EventDef, e: EventEffect, option?: string): Record<string, unknown> | undefined => {
      switch (e.kind) {
        case 'offer': {
          const a = archetypes.find((x) => x.id === e.archetype);
          if (!a) throw new Error(`${d.id}: no investor archetype ${e.archetype}`);
          const inst = raiseOffer(ctx, 'events', a, num(d, 'jobs'), p, content.buildable);
          // the co-financed project of the same answer is the deal's: declining the investor withdraws it
          if (cofinanced !== undefined) { inst.payload = { ...inst.payload, cofinanced }; cofinanced = undefined; }
          if (cofinancedOrder !== undefined) { inst.payload = { ...inst.payload, cofinancedOrder }; cofinancedOrder = undefined; }
          if (e.terms) {
            const terms: FirmTerms = {};
            const n = p.events[d.id]!;
            if (n.tax_holiday_months) terms.taxHolidayMonths = n.tax_holiday_months;
            if (n.land_fee_factor !== undefined) terms.landFeeFactor = n.land_fee_factor;
            inst.payload = { ...inst.payload, terms };
          }
          return undefined;
        }
        case 'readiness_check': {
          const report = readinessReport(s, p, content.buildable);
          if (d.card) return { report };
          const inst = ctx.raise({ card: d.id, options: [READINESS_NOTED], interrupting: false });
          inst.payload = { report };
          inst.expires = expiry();
          return undefined;
        }
        case 'unlock':
          if (!s.events.unlocked.includes(e.key)) s.events.unlocked.push(e.key);
          ev('unlocked', { key: e.key, by: d.id });
          return undefined;
        case 'set_regime':
          s.fiscal.regime = e.regime;
          ev('regime', { regime: e.regime, by: d.id });
          return undefined;
        case 'sez_open': {
          const r = readiness(s, p, content.buildable);
          s.sez = { opened: s.date, priority: option!, readiness: r.bar };
          ev('sez_opened', { priority: option, readiness: r.bar, weakest: r.weakest });
          return undefined;
        }
        case 'first_wave':
          firstWave(d);
          return undefined;
        case 'scrutiny':
          s.climate.scrutiny = clamp100(s.climate.scrutiny + num(d, 'scrutiny'));
          ev('scrutiny', { delta: num(d, 'scrutiny'), by: d.id });
          return undefined;
        case 'cost':
          addObligation(s, { kind: 'transfer', perMonth: num(d, 'cost'), index: 'none', from: s.date, until: s.date,
            createdBy: d.id });
          return undefined;
        case 'standing':
          for (const l of s.leadership.leaders) l.standing = clamp100(l.standing + num(d, 'standing'));
          return undefined;
        case 'set_permit':
          s.policy.permitRegime = option as PermitRegime;
          ev('permit', { regime: option, by: d.id });
          return undefined;
        case 'commit_choice':
          if (!fc || !option || !fc.projects.some((t) => t.id === option)) return undefined;   // 'later' commits nothing
          tryFiscal(d, { type: 'commit_project', template: option, area: e.area });
          return undefined;
        case 'offer_loan':
          if (fc) offerProjectLoan(ctx, p);
          return undefined;
        case 'cofinance':
          if (e.structure !== undefined) {                        // R9 (§5.8): a co-financed works order
            const o = p.works && content.network ? orderCofinanced(s, p.works, content.network, e.structure, e.area) : undefined;
            if (!o) { ev('event_action_failed', { action: 'cofinance', by: d.id, reason: `no free site beside a road in area ${e.area}` }); return undefined; }
            cofinancedOrder = o.id;
            ev('cofinanced', { order: o.id, by: d.id });
            return undefined;
          }
          if (!fc) return undefined;
          cofinanced = commitCofinanced(s, p, fc, e.template!, e.area).id;
          ev('cofinanced', { project: cofinanced, by: d.id });
          return undefined;
        case 'contract_team':
          if (fc) tryFiscal(d, { type: 'contract_team', team: e.team, mode: 'pool' });
          return undefined;
        case 'rush':
          for (const x of s.fiscal.projects) if (liveProject(x)) x.priority = 'high';
          return undefined;
        case 'orders':
          s.orders = { factor: num(d, 'factor'), until: s.date + num(d, 'months') - 1 };
          ev('orders', { factor: s.orders.factor, until: s.orders.until, by: d.id });
          return undefined;
        case 'budget_report':
          return fc ? { budget: budgetReport(s, p, fc) } : undefined;
        case 'sweep':
          addObligation(s, { kind: 'transfer', perMonth: p.sweep.cash_cost, index: 'none', from: s.date, until: s.date,
            createdBy: d.id });
          for (const g of s.pops) if (g.registration === 'nonlocal') g.mood = Math.max(0, g.mood - p.sweep.mood_penalty);
          s.sweep = { until: s.date + p.sweep.campaign_months - 1 };
          ev('sweep', { months: p.sweep.campaign_months });
          return undefined;
        case 'veto':
          s.reviews.vetoes.push({ date: s.date, reason: e.reason });
          return undefined;
        case 'end_run':
          s.ended = { date: s.date, reason: 'visit' };
          ev('run_ended', { reason: 'visit', by: d.id });
          return fc ? { verdict: verdict(s, p, fc) } : undefined;
      }
    };
    const tryFiscal = (d: EventDef, a: Parameters<typeof applyFiscalAction>[3]) => {
      try { applyFiscalAction(s, p, fc!, a, content.buildable, true); ev('event_action', { action: a.type, by: d.id }); }
      catch (err) { ev('event_action_failed', { action: a.type, by: d.id, reason: (err as Error).message }); }
    };

    // the first wave (§5.7): its size from the bar at the opening, each card's origin drawn by the priority's weights
    const firstWave = (d: EventDef) => {
      const bar = s.sez.readiness ?? readiness(s, p, content.buildable).bar;
      const n = firstWaveCards(bar, p);
      const mix = p.sez.priorities[s.sez.priority ?? ''] ?? {};
      const pool = archetypes.filter((a) => archetypeAvailable(s, a) && (mix[a.id] ?? 0) > 0);
      const total = pool.reduce((t, a) => t + mix[a.id]!, 0);
      let raisedCards = 0;
      for (let k = 0; k < n && total > 0; k++) {
        let x = ctx.rng.float() * total, a = pool[pool.length - 1]!;
        for (const q of pool) { x -= mix[q.id]!; if (x < 0) { a = q; break; } }
        const [lo, hi] = p.investors.archetypes[a.id]!.jobs;
        raiseOffer(ctx, 'events', a, lo + ctx.rng.int(hi - lo + 1), p, content.buildable);
        raisedCards++;
      }
      s.sez = { ...s.sez, waveCards: raisedCards };
      ev('first_wave', { cards: raisedCards, readiness: bar, by: d.id });
    };

    // 1. event cards past their expiry leave; a card with a lapse option takes it, so ignoring a crisis is a choice
    const lapsed: { d: EventDef; option: string }[] = [];
    s.pendingCards = s.pendingCards.filter((c: CardInstance) => {
      if (!byId.has(c.card) || c.expires === undefined || s.date < c.expires) return true;
      const d = byId.get(c.card)!;
      ev('event_card_lapsed', { card: c.id, ...(d.card?.lapse ? { option: d.card.lapse } : {}) });
      if (d.card?.lapse) lapsed.push({ d, option: d.card.lapse });
      return false;
    });
    for (const { d, option } of lapsed) {
      for (const e of d.onAnswer) if (e.option === undefined || e.option === option) apply(d, e, option);
    }

    // 2. this month's answers: on_answer effects in order, a per-option effect only for its option
    for (const { card, option } of s.answered) {
      const d = byId.get(card.card);
      if (!d) continue;
      ev('event_answered', { event: d.id, option });
      for (const e of d.onAnswer) if (e.option === undefined || e.option === option) apply(d, e, option);
    }

    // 3. fire the events that are due, in content order; a hazard draws once a month while it can fire
    const firedOnce = (d: EventDef) => s.events.fired.some((f) => f.id === d.id);
    const firedNow = (d: EventDef) => s.events.fired.some((f) => f.id === d.id && f.date === s.date);
    for (const d of defs) {
      if (firedNow(d) || (!d.recurring && firedOnce(d)) || !gated(s, d)) continue;
      const t = d.trigger;
      let due: boolean;
      if ('date' in t) due = s.date >= t.date;
      else if ('prologueTurn' in t) due = s.turn >= t.prologueTurn;
      else if ('monthOfYear' in t) due = s.date % 12 === t.monthOfYear;
      else if ('hazard' in t) {
        if ((t.fromTurn !== undefined && s.turn < t.fromTurn) || (t.condition && !conditionHolds(s, t.condition, villages))) continue;
        const inSeason = !t.monthsOfYear || t.monthsOfYear.includes(s.date % 12);
        due = inSeason && ctx.rng.float() < t.hazard;
        // the guaranteed emergent beat (§2.1): the last month of that turn, if it has not fired by then
        if (!due && t.guaranteedByTurn === s.turn && s.subStep === 2 && !firedOnce(d)) due = true;
      } else due = conditionHolds(s, t.condition, villages);
      if (!due) continue;
      s.events.fired.push({ id: d.id, date: s.date });
      ev('event_fired', { event: d.id });
      let payload: Record<string, unknown> = {};
      for (const e of d.effects) payload = { ...payload, ...apply(d, e) };
      if (d.card) {
        const inst = ctx.raise({ card: d.id, options: d.card.options.map((o) => o.id), interrupting: d.card.interrupting });
        if (d.onAnswer.some((e) => e.kind === 'first_wave')) payload = { ...payload, report: readinessReport(s, p, content.buildable) };
        if (Object.keys(payload).length) inst.payload = payload;
        if (!d.card.interrupting) inst.expires = expiry();
      }
    }
  };
}

const clamp100 = (x: number) => Math.min(100, Math.max(0, x));
