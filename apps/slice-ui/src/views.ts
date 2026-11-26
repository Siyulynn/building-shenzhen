/**
 * The UI's views (phase1-slice.md §11, §11.1): pure functions from the state and the slice to what the screens show.
 * They call sim-core's own derivations (fiscalViews, previewOffer, indicatorValue, scoreReview, verdict, zoneLabel)
 * and never re-derive them. main.ts only renders what these return.
 */
import {
  FAILURE_CARD, LOAN_CARD, buildableCells, DEFICIT_CARD, REVIEW_CARD, SHORTCUT_CARD, contractLive, fiscalViews, formatYM, indicatorValue,
  gdpNow, liveProject, moneyForProjects, obligationDue, unspentCommitments, previewOffer, runsOfCells, scoreReview, tripChance, verdict,
  readiness, firstWaveCards, zoneFrontage,
  zoneCellsAllowed, zoneLabel, cellsOfRuns, playableAreaOf, liveOrder, spatialViews, developableCells, placedSupply,
  prospectiveShare, utilityShare, sizeOffer, orderFactor, inducedServiceJobs, zoneBuiltM2, zoneRoomM2, largestRemainder,
  VILLAGE_ARCHETYPES, SOURCE_KINDS, areaTakes, poolFactor, powerPool, importedKw, utilityShares,
  firmFreight, freightContent, freightNetwork, crewPool, modifierLive,
  type CardInstance, type CellRuns, type EventDef, type EventEffect, type CellWork, type GameState, type PlayerAction, type Slice, type SpatialViews,
  type StartSite, type WorksOrder, type Zone, type LandCoverClass, landCoverAt,
} from '@sz/sim-core';
import * as S from './strings.js';
import { place, type L } from './strings.js';

const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);
const last = (xs: readonly number[]) => xs[xs.length - 1] ?? 0;
/** Chinese separators for the English ones: a full-width colon, and no space between words. */
const ZH_SEP: Readonly<Record<string, string>> = { ': ': '：', ' ': '' };
const cat = (a: L, b: L, sep = ' ', zhSep = ZH_SEP[sep] ?? sep): L => ({ zh: `${a.zh}${zhSep}${b.zh}`, en: `${a.en}${sep}${b.en}` });
const raw = (t: string): L => ({ zh: t, en: t });
/** A label then a value, as one localized string. */
const lv = (l: L, v: string): L => ({ zh: `${l.zh} ${v}`, en: `${l.en} ${v}` });
const joinL = (xs: readonly L[], sep: string): L => ({ zh: xs.map((x) => x.zh).join(sep), en: xs.map((x) => x.en).join(sep) });
export const yuan = (x: number) => `¥${Math.round(x).toLocaleString('en-US')}`;
export const num = (x: number) => Math.round(x).toLocaleString('en-US');
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

// ---- names ----
// Place names (areas, sites, routes, precedent zones) are marked with place(): they stay bilingual (§11.1).

/** R11.1: short names for the map key and labels; the register keeps the full descriptions. */
export const SHORT_AREA: Readonly<Record<number, L>> = {
  2: { zh: '罗湖口岸', en: 'Luohu crossing' },
  4: { zh: '黄贝岭', en: 'Huangbeiling' },
};
/** R11.1: the name the player sees; the register keeps the full historical name and its citation. */
export const SITE_NAME: Readonly<Record<string, L>> = {
  'site.sungang_freight': { zh: '笋岗货场', en: 'Sungang freight yard' },
};
export const siteName = (site: StartSite): L => SITE_NAME[site.id] ?? site.name;
export function areaName(s: GameState, id: number): L {
  if (SHORT_AREA[id]) return place(SHORT_AREA[id]!);
  const name = s.areas.find((a) => a.id === id)?.name;
  return name ? place(name) : cat(S.AREA, raw(` ${id}`), '');
}
/** A zone's zoneLabel: a place when it carries a precedent's name, otherwise chrome (`area · use #id`). */
export function zoneName(s: GameState, slice: Slice, id: number): L {
  const z = s.zones.find((x) => x.id === id);
  if (!z) return cat(S.ZONE, raw(` #${id}`), '');
  const precedents = slice.tick.precedents ?? [];
  const label = zoneLabel(s, z, precedents);
  const n = z.name;
  return n.kind === 'precedent' && precedents.some((p) => p.id === n.precedent) ? place(label) : label;
}
const named = <T extends { id: string; name: L }>(xs: readonly T[] | undefined, id: string) => xs?.find((x) => x.id === id)?.name;

/** A card's title from content (events, investors) or the UI's strings (system cards); undefined if neither names it. */
export function cardTitle(slice: Slice, card: string): L | undefined {
  return named(slice.tick.events, card) ?? named(slice.tick.investors, card) ?? S.SYSTEM_CARDS[card];
}

/** An option's label: the event's own option names first, then the shared options, then sites; undefined if unnamed. */
export function optionLabel(s: GameState, slice: Slice, card: string, option: string): L | undefined {
  const ev = slice.tick.events.find((d) => d.id === card);
  const own = ev?.card?.options.find((o) => o.id === option)?.name;
  if (own) return own;
  if (S.OPTIONS[option]) return S.OPTIONS[option];
  const zone = /^accept:zone:(\d+)$/.exec(option);
  if (zone) return cat(S.ACCEPT_ZONE, zoneName(s, slice, Number(zone[1])));
  const prem = /^accept:premises:(\d+)$/.exec(option);
  if (prem) return cat(S.ACCEPT_PREMISES, areaName(s, Number(prem[1])));
  return undefined;
}

// ---- cards ----

export interface Line { label: L; value: L }
export interface CardView {
  id: string; card: string; title: L; interrupting: boolean; raised?: string; expires?: string;
  ids: readonly string[]; count: number;              // R11.1: identical emergent cards stack into one
  description?: L;                                    // R7: an event card's content description
  options: { id: string; label: L; badges: L[]; note?: L }[];   // note: R11.1's site status on an offer
  lines: Line[];
}

/** R11.1: an offer's shared project lines, and the one-line status shown under each site's button. */
function offerView(s: GameState, c: CardInstance, slice: Slice): { lines: Line[]; notes: Map<string, L> } {
  const v = previewOffer(s, c, slice.params, slice.tick);
  const beds = v.sites.map((q) => q.bedsNeeded), output = v.sites.map((q) => q.perYear.output);
  const f0 = v.sites[0]?.fiscal;
  const same = (xs: readonly number[]) => xs.length > 0 && xs.every((x) => x === xs[0]);
  const shared = {
    beds: same(beds), output: same(output),
    cash: f0 !== undefined && v.sites.every((q) => q.fiscal?.cashThisQuarter === f0.cashThisQuarter),
    retained: f0 !== undefined && v.sites.every((q) => q.fiscal?.retainedTaxPerYear === f0.retainedTaxPerYear),
    obligations: f0 !== undefined && v.sites.every((q) => q.fiscal?.newObligationsPerYear === f0.newObligationsPerYear),
  };
  // The project's own figures once at the top; each site only says whether it can carry them.
  const lines: Line[] = [
    { label: S.T.offerJobs, value: raw(num(v.jobs)) }, { label: S.T.powerNeed, value: raw(`${num(v.powerKw)} kW`) }];
  if (shared.beds) lines.push({ label: S.T.bedsNeeded, value: raw(num(beds[0]!)) });
  if (shared.output) lines.push({ label: S.T.perYearOutput, value: raw(yuan(output[0]!)) });
  if (shared.cash) lines.push({ label: S.T.cash, value: raw(yuan(f0!.cashThisQuarter)) });
  if (shared.retained) lines.push({ label: S.T.retained, value: raw(yuan(f0!.retainedTaxPerYear)) });
  if (shared.obligations) lines.push({ label: S.T.newObligations, value: raw(yuan(f0!.newObligationsPerYear)) });
  const notes = new Map<string, L>();
  for (const site of v.sites) {
    const h = s.housing.find((q) => q.area === site.area);
    const bedsFree = h ? Math.max(0, h.beds.local + h.beds.rental - h.occupants.local - h.occupants.rental) : 0;
    const parts = [lv(S.T.opensIn, String(site.opensInMonths)),
      site.powerFreeKw >= v.powerKw ? S.T.powerEnough! : S.T.powerShort!,
      bedsFree >= site.bedsNeeded ? S.T.bedsEnough! : S.T.bedsShort!];
    if (!shared.beds) parts.push(lv(S.T.bedsNeeded, num(site.bedsNeeded)));
    if (!shared.output) parts.push(lv(S.T.perYearOutput, yuan(site.perYear.output)));
    const f = site.fiscal;
    if (f) {
      if (!shared.cash) parts.push(lv(S.T.cash, yuan(f.cashThisQuarter)));
      if (!shared.retained) parts.push(lv(S.T.retained, yuan(f.retainedTaxPerYear)));
      if (!shared.obligations) parts.push(lv(S.T.newObligations, yuan(f.newObligationsPerYear)));
    }
    notes.set(site.option, joinL(parts, ' · '));
  }
  return { lines, notes };
}

function cardLines(s: GameState, slice: Slice, c: CardInstance): Line[] {
  const p = slice.params;
  const pl = (c.payload ?? {}) as Record<string, any>;
  const out: Line[] = [];
  if (c.card === LOAN_CARD) {
    out.push({ label: S.T.principal, value: raw(yuan(pl.principal)) }, { label: S.T.rate, value: raw(pct(pl.rate_month)) },
      { label: S.T.grace, value: raw(String(pl.grace_months)) }, { label: S.T.term, value: raw(String(pl.term_months)) });
  }
  if (c.card === DEFICIT_CARD) {
    out.push({ label: S.T.shortfall, value: raw(yuan(pl.shortfall)) }, { label: S.T.capacity, value: raw(yuan(pl.capacity)) });
  }
  if (c.card === REVIEW_CARD && pl.review) {
    const r = pl.review as GameState['reviews']['held'][number];
    const verdictL = joinL([r.pass ? S.T.pass : S.T.fail, ...(r.vetoed ? [S.T.vetoed] : [])], ', ');
    out.push({ label: S.T.score, value: cat(raw(`${r.score.toFixed(2)} (`), cat(verdictL, raw(')'), ''), '') });
    for (const it of r.items) out.push({ label: S.INDICATOR[it.indicator] ?? raw(it.indicator), value: raw(`${num(it.value * (it.indicator === 'order_check' ? 100 : 1))}${it.indicator === 'order_check' ? '%' : ''} → ${it.score.toFixed(2)}`) });
  }
  if (c.card === FAILURE_CARD) out.push({ label: S.T.scrutiny, value: raw(num(pl.scrutiny)) });
  if (pl.report) {
    const r = pl.report as { bar: number; roads: number; servicedLand: number; waterPower: number; forecastCards: number };
    out.push({ label: S.T.bar, value: raw(pct(r.bar)) }, { label: S.T.readyRoads, value: raw(pct(r.roads)) },
      { label: S.T.readyLand, value: raw(pct(r.servicedLand)) }, { label: S.T.readyWaterPower, value: raw(pct(r.waterPower)) },
      { label: S.T.forecast, value: raw(String(r.forecastCards)) });
  }
  if (pl.grantFactor !== undefined) {
    out.push({ label: S.T.grantFactor, value: raw(String(pl.grantFactor)) }, { label: S.T.recurring, value: raw(yuan(pl.recurring)) });
    if (pl.warning) out.push({ label: S.T.warning, value: raw(`${formatYM(pl.warning.from)} → ${pl.warning.factor}`) });
  }
  return out;
}

const plus = (l: L, n: number): L => lv(l, `${n >= 0 ? '+' : '−'}${num(Math.abs(n))}`);
const then = (a: L, b: L): L => ({ zh: `${a.zh}${b.zh}`, en: `${a.en}${b.en}` });

/** One effect's badges, read from params as the effect itself reads them (§11.2, R7); [] adds none. */
function effectBadge(d: EventDef, e: EventEffect, option: string, slice: Slice, count = 1): L[] {
  const p = slice.params, n = (p.events[d.id] ?? {}) as Record<string, number | undefined>;
  const fc = slice.tick.fiscal, B = S.BADGE;
  switch (e.kind) {
    case 'cost': return [lv(B.cost!, yuan((n.cost ?? 0) * count))];
    case 'scrutiny': return [plus(B.scrutiny!, (n.scrutiny ?? 0) * count)];
    case 'standing': return [plus(B.standing!, (n.standing ?? 0) * count)];
    case 'commit_choice': {
      const t = fc?.projects.find((x) => x.id === option);
      if (!t) return [];                                     // an option that is not a template commits nothing
      const budget = p.projects?.[t.id]?.budget;
      return [then(B.commits!, t.name), ...(budget !== undefined ? [lv(B.cost!, yuan(budget))] : [])];
    }
    case 'set_permit': return [then(B.permit!, S.PERMIT[option] ?? raw(option))];
    case 'rush': return [B.rush!];
    case 'sweep': return [lv(B.cost!, yuan(p.sweep.cash_cost)), lv(B.sweepHides!, num(p.sweep.campaign_months)), B.sweepMood!];
    case 'contract_team': case 'crew_arrival': {          // R9 (§5.6): an arrival reads as the team it adds
      const t = fc?.teams.find((x) => x.id === e.team);
      return [then(B.team!, t?.name ?? raw(e.team))];
    }
    case 'cofinance': {
      // R9 (§11.2): a co-financed structure reads by its kind; the M4 form by its project template
      if (e.structure !== undefined) return [then(B.cofinance!, S.STRUCTURE[e.structure] ?? raw(e.structure))];
      const t = fc?.projects.find((x) => x.id === e.template);
      return [then(B.cofinance!, t?.name ?? raw(e.template!))];
    }
    case 'offer': return [e.terms ? cat(B.offer!, B.offerTerms!, ', ', '，') : B.offer!];
    case 'offer_loan': return [B.loan!];
    case 'sez_open': return [B.sezOpen!];
    case 'set_regime': return [B.regime!];
    case 'unlock': {
      // R9 (§11.2): a key that opens tool gates names them
      const gs = (slice.tick.gates ?? []).filter((g) => g.requires === e.key);
      const opened = gs.length ? [then(B.opens!, { zh: gs.map((g) => g.name.zh).join('、'), en: gs.map((g) => g.name.en).join(', ') })] : [];
      return e.key.startsWith('investors.') ? [B.unlockInvestment!, ...opened] : opened.length ? opened : [B.unlock!];
    }
    case 'first_wave': return [B.firstWave!];
    case 'orders': return [lv(B.orders!, `×${n.factor ?? 1}`)];
    case 'veto': return [B.veto!];
    case 'end_run': return [B.endRun!];
    case 'readiness_check': case 'budget_report': return [B.report!];
    case 'modifier': {                                     // R9 (§11.2): "Investor arrivals ×0.75 for 9 months"
      const f = n[e.factor ?? e.target] ?? 1, m = n[e.months ?? 'months'] ?? 0, t = S.MODIFIER_TARGET[e.target] ?? raw(e.target);
      return [{ zh: `${t.zh} ×${f}${B.monthsFor!.zh}${m}${B.months!.zh}`, en: `${t.en} ×${f}${B.monthsFor!.en} ${m} ${B.months!.en}` }];
    }
    case 'modifier_shift': {                               // R9: "‹source›'s effects end 3 months sooner"
      const m = n[e.months ?? 'months'] ?? 0, src = slice.tick.events.find((x) => x.id === e.source)?.name ?? raw(e.source);
      const w = m < 0 ? B.sooner! : B.later!;
      return [{ zh: `${src.zh}${B.effectsOf!.zh}${w.zh}${Math.abs(m)}${B.months!.zh}`, en: `${src.en}${B.effectsOf!.en} ${w.en} ${Math.abs(m)} ${B.months!.en}` }];
    }
    case 'credit_draw': return [lv(B.credit!, `${Math.round((n.credit ?? 0) / 1e4)}万`)];
    default: { const never: never = e; return never; }
  }
}

/**
 * Each option's effect badges (§11.2, R7): derived from the on_answer effects that apply to it, so a badge cannot
 * disagree with what the option does. Effects applied when the event fired are not the option's. Pure.
 */
export function effectBadges(d: EventDef, slice: Slice, _s?: GameState, count = 1): Record<string, L[]> {
  const out: Record<string, L[]> = {};
  for (const o of d.card?.options ?? []) {
    const bs = d.onAnswer.filter((e) => e.option === undefined || e.option === o.id).flatMap((e) => effectBadge(d, e, o.id, slice, count));
    out[o.id] = bs.length ? bs : [S.BADGE.noEffect!];
  }
  return out;
}

export function cardView(s: GameState, slice: Slice, c: CardInstance, count = 1, ids: readonly string[] = [c.id]): CardView {
  const ev = slice.tick.events.find((d) => d.id === c.card);
  const badges = ev ? effectBadges(ev, slice, s, count) : {};
  const offer = c.payload?.offer ? offerView(s, c, slice) : undefined;
  return {
    id: c.id, card: c.card, title: cardTitle(slice, c.card) ?? raw(c.card), interrupting: c.interrupting,
    ids, count,
    ...(c.raisedAt !== undefined ? { raised: formatYM(c.raisedAt) } : {}),
    ...(c.expires !== undefined ? { expires: formatYM(c.expires) } : {}),
    ...(ev?.description ? { description: ev.description } : {}),
    options: c.options.map((o) => ({ id: o, label: optionLabel(s, slice, c.card, o) ?? raw(o), badges: badges[o] ?? [],
      ...(offer?.notes.get(o) ? { note: offer.notes.get(o) } : {}) })),
    lines: [...(offer?.lines ?? []), ...cardLines(s, slice, c)],
  };
}

/**
 * The stack: interrupting cards first, then the rest in order. Identical emergent cards fired more than
 * once in a quarter stack into one card with a count; one choice answers the group.
 */
export function cardStack(s: GameState, slice: Slice): CardView[] {
  const sorted = [...s.pendingCards].sort((a, b) => Number(b.interrupting) - Number(a.interrupting));
  const groups = new Map<string, CardInstance[]>();
  for (const c of sorted) {
    const ev = slice.tick.events.find((d) => d.id === c.card);
    const groupable = !c.interrupting && ev?.family === 'emergent';
    const key = groupable ? `emergent:${c.card}` : `card:${c.id}`;
    const list = groups.get(key);
    if (list) list.push(c); else groups.set(key, [c]);
  }
  return [...groups.values()].map(([c, ...rest]) => cardView(s, slice, c!, rest.length + 1, [c!.id, ...rest.map((q) => q.id)]));
}

// ---- the briefing ----

/**
 * The quarter's GDP (§11.2): the last three recorded months; before the first month is recorded (Turn 1), the quarter
 * at the current month's rate, 3 × gdpNow, so the first screen shows the starting economy rather than ¥0 (R7).
 */
export const quarterGdp = (s: GameState, slice: Slice) =>
  s.history.gdp.length ? sum(s.history.gdp.slice(-3)) : 3 * gdpNow(s, slice.params);

export interface Indicator { label: L; value: number; delta?: number; money?: boolean }
const presentNonlocal = (s: GameState) => sum(s.pops.map((g) => (g.registration === 'nonlocal' ? g.present : 0)));
const indicators = (s: GameState, slice: Slice): Indicator[] => [
  { label: S.T.residents, value: sum(s.pops.map((g) => g.stayedSixMonths)) },   // the resident measure (§5.9), from the state
  { label: S.T.presentNonlocal, value: presentNonlocal(s) },
  { label: S.T.firmJobs, value: sum(s.firms.map((f) => f.posted)) },
  { label: S.T.gdpQuarter, value: Math.round(quarterGdp(s, slice)), money: true },
  { label: S.T.moneyForProjects, value: Math.round(moneyForProjects(s, slice.params)), money: true },
  { label: S.T.scrutiny, value: Math.round(s.climate.scrutiny) },
];
// ---- R9 (§11.2): locked gates, the news and the live modifiers ----

/** "Opens with ‹opener›" for a gate id that is locked now; undefined when it is open (or ungated). */
export function gateLock(s: GameState, slice: Slice, gate: string): L | undefined {
  const g = (slice.tick.gates ?? []).find((x) => x.gate === gate);
  if (!g || s.events.unlocked.includes(g.requires)) return undefined;
  return { zh: `${S.T.opensWith.zh}${g.opener.name.zh}`, en: `${S.T.opensWith.en}${g.opener.name.en}` };
}

export interface NewsItem { id: string; desk: string; name: L; text?: L; letter: boolean }
/**
 * The news records fired since the previous turn's start (§11.2; on Turn 1 those fired at init): the opening letters
 * in full, then the lead in full, then at most two more as headlines; grouped under their desk, in that order.
 */
export function newsView(now: GameState, slice: Slice, before?: GameState): { desk: string; items: NewsItem[] }[] {
  const fresh = new Set(now.events.fired.slice(before ? before.events.fired.length : 0).map((f) => f.id));
  // R11.1: the office note's context now lives in old Liang's guide; do not print the note as a wall of text.
  const hidden = new Set(['news.1979q1.office_note']);
  const defs = slice.tick.events.filter((d) => d.family === 'news' && d.news && fresh.has(d.id) && !hidden.has(d.id));   // content order
  const letters = defs.filter((d) => d.news!.tone === 'opening'), rest = defs.filter((d) => d.news!.tone !== 'opening');
  const items: NewsItem[] = [
    ...letters.map((d) => ({ id: d.id, desk: d.news!.desk, name: d.name, ...(d.text ? { text: d.text } : {}), letter: true })),
    ...rest.slice(0, 1).map((d) => ({ id: d.id, desk: d.news!.desk, name: d.name, ...(d.text ? { text: d.text } : {}), letter: false })),
    ...rest.slice(1, 3).map((d) => ({ id: d.id, desk: d.news!.desk, name: d.name, letter: false })),
  ];
  const out: { desk: string; items: NewsItem[] }[] = [];
  for (const it of items) {
    const g = out.find((x) => x.desk === it.desk);
    if (g) g.items.push(it); else out.push({ desk: it.desk, items: [it] });
  }
  return out;
}
/** The live timed modifiers (§11.2): the target in words, the factor, the quarters left and the source's name. */
export function modifiersView(s: GameState, slice: Slice): { target: L; factor: number; quartersLeft: number; source: L }[] {
  return (s.events.modifiers ?? []).filter((m) => modifierLive(s, m)).map((m) => ({
    target: S.MODIFIER_TARGET[m.target] ?? raw(m.target), factor: m.factor,
    quartersLeft: Math.ceil((m.until - s.date + 1) / 3),
    source: slice.tick.events.find((d) => d.id === m.source)?.name ?? raw(m.source),
  }));
}

/** The quarter's indicators, each with its change since the previous turn's start. */
export function briefing(now: GameState, slice: Slice, before?: GameState): { when: string; turn: number; rows: Indicator[] } {
  const a = indicators(now, slice), b = before ? indicators(before, slice) : undefined;
  return { when: formatYM(now.date), turn: now.turn + 1,
    rows: a.map((x, k) => (b ? { ...x, delta: x.value - b[k]!.value } : x)) };
}

// ---- panels ----

export function ledgerView(s: GameState, slice: Slice) {
  const v = fiscalViews(s, slice.params);
  return {
    recurring: v.recurring, projects: v.projects, forexUsd: v.importAccessUSD, borrowing: v.borrowingCapacity,
    balances: { ...s.fiscal.balances },
    obligations: Object.entries(v.obligationsByKind).map(([k, x]) => ({ label: S.OBLIGATION[k] ?? raw(k), value: x })),
    loans: v.loans.map((l) => ({ id: l.id, kind: S.LOAN_KIND[l.kind] ?? raw(l.kind), outstanding: l.outstanding,
      next: l.schedule.filter((e) => e.date >= s.date).slice(0, 4).map((e) => ({ at: formatYM(e.date), principal: e.principal, interest: e.interest })) })),
    regime: named(slice.tick.fiscal?.regimes, s.fiscal.regime) ?? raw(s.fiscal.regime),
  };
}

export function areaView(s: GameState, id: number) {
  const a = s.areas.find((x) => x.id === id);
  if (!a) return undefined;
  const pops = s.pops.filter((g) => g.area === id);
  const h = s.housing.find((x) => x.area === id);
  return {
    name: place(a.name), access: a.access,
    pops: pops.map((g) => ({ label: S.POP_KIND[g.kind] ?? raw(g.kind), size: g.size, present: g.present })),
    housing: h ? { beds: h.beds, occupants: h.occupants, crowding: h.crowding, rent: h.rent } : undefined,
    jobs: s.labour.jobs.filter((j) => j.area === id).map((j) => ({ label: S.SECTOR[j.sector] ?? raw(j.sector), jobs: j.jobs, filled: j.filled })),
    utilities: a.utilities, facilities: a.facilities, illegalFloorShare: a.illegalFloorShare, roadKm: a.roadKm,
    firms: s.firms.filter((f) => f.area === id).length,
  };
}

export type RiskBand = 'low' | 'medium' | 'high';
/** Discipline risk as a hint: the chance of a fall within a year, banded. A hint only: the number stays hidden. */
export function riskBand(risk: number, slice: Slice): RiskBand {
  if (!(risk > 0)) return 'low';
  const year = 1 - Math.pow(1 - tripChance(risk, slice.params), 12);
  return year < 0.25 ? 'medium' : 'high';
}
/** The unlock key content sets when the mandate is met (content/slice/events.yaml, event.mandate_met). */
export const MANDATE_MET = 'mandate.met';
const SEZ_EVENT = 'event.sez_established';
/** The mandate (§5.8): the SEZ's chosen priority, named by its card's option in content, and whether it is met. */
export function mandateView(s: GameState, slice: Slice): { priority?: L; met: boolean } {
  const priority = s.sez.priority ? optionLabel(s, slice, SEZ_EVENT, s.sez.priority) : undefined;
  return { ...(priority ? { priority } : {}), met: s.events.unlocked.includes(MANDATE_MET) };
}
const leaderName = (s: GameState, slice: Slice, id: string): L =>
  [...s.leadership.leaders, ...s.leadership.bench, ...slice.init.leaders].find((l) => l.id === id)?.name ?? raw(id);
export function leadersView(s: GameState, slice: Slice) {
  return {
    mandate: mandateView(s, slice),
    leaders: s.leadership.leaders.map((l) => ({
      id: l.id, name: l.name, role: S.ROLE[l.role] ?? raw(l.role), traits: l.traits.map((t) => S.TRAIT[t] ?? raw(t)),
      rapport: l.rapport, standing: l.standing, risk: S.RISK[riskBand(l.disciplineRisk, slice)],
      shortcuts: s.leadership.entangled.filter((e) => e.leader === l.id).length,
    })),
    falls: s.falls.map((f) => ({ at: formatYM(f.date), leader: leaderName(s, slice, f.leader), replacedBy: leaderName(s, slice, f.replacedBy) })),
  };
}

/** This year's review (the k-th December review takes the k-th target) scored as if held now, and the reviews held. */
export function reviewView(s: GameState, slice: Slice) {
  const t = slice.tick.targets?.[s.reviews.held.length];
  const now = t ? scoreReview(s, slice.params, t) : undefined;
  return {
    next: t && now ? { lightweight: t.lightweight, score: now.score, items: t.indicators.map((x, k) => ({
      label: S.INDICATOR[x.indicator] ?? raw(x.indicator), floor: x.floor, target: x.target, weight: x.weight,
      value: now.items[k]!.value, score: now.items[k]!.score, share: x.indicator === 'order_check' })) } : undefined,
    held: s.reviews.held.map((r) => ({ at: formatYM(r.date), score: r.score, pass: r.pass, vetoed: r.vetoed })),
    indicatorNow: (k: Parameters<typeof indicatorValue>[2]) => indicatorValue(s, slice.params, k),
  };
}

export function verdictView(s: GameState, slice: Slice) {
  return s.ended?.reason === 'visit' ? verdict(s, slice.params, slice.tick.fiscal!) : undefined;
}

export function projectsView(s: GameState, slice: Slice) {
  return s.fiscal.projects.filter(liveProject).map((x) => ({
    id: x.id, name: named(slice.tick.fiscal?.projects, x.template) ?? raw(x.template),
    where: x.zone !== undefined ? zoneName(s, slice, x.zone) : areaName(s, x.area),
    stage: S.STAGE[x.stage] ?? raw(x.stage), waiting: x.waiting ? S.WAITING[x.waiting] : undefined,
    progress: x.workTotal ? x.workDone / x.workTotal : 0, budget: x.budget, spent: x.spent, priority: x.priority,
  }));
}
export function teamsView(s: GameState, slice: Slice) {
  return (slice.tick.fiscal?.teams ?? []).filter((t) => !t.eventOnly && t.modes.includes('pool')).map((t) => ({
    id: t.id, name: t.name, live: s.fiscal.contracts.some((c) => c.team === t.id && contractLive(s, c)),
    costPerMonth: slice.params.teams[t.id]?.cost_per_month ?? 0, crew: slice.params.teams[t.id]?.crew ?? 0,
  }));
}
/** The cells site preparation would service in a zone: sim-core's buildable cells, less the land already serviced. */
export function siteCells(s: GameState, slice: Slice, runs: CellRuns): number {
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  return buildableCells(s, runs, slice.tick.buildable).filter((c) => !served.has(c)).length;
}
/** A project's cost before committing: its budget, or per cell for site preparation (cells from siteCells). */
export function projectCost(slice: Slice, template: string, cells = 0): { yuan: number; forexUsd: number } {
  const pp = slice.params.projects[template];
  if (!pp) return { yuan: 0, forexUsd: 0 };
  return { yuan: pp.budget ?? (pp.budget_per_cell ?? 0) * cells, forexUsd: pp.forex_usd ?? 0 };
}

// ---- the queue, and zones drawn this turn ----

/** The id the k-th queued action's zone will get, if it creates one: nextZoneId + the zones queued before it. */
export function queuedZoneIds(s: GameState, queue: readonly PlayerAction[]): Map<number, number> {
  const out = new Map<number, number>();
  let next = s.nextZoneId;
  queue.forEach((a, k) => { if (a.type === 'create_zone') out.set(k, next++); });
  return out;
}

/** Cells a new zone may take: zoneCellsAllowed's clip, less the zones already queued this turn. */
export function clipZone(s: GameState, queue: readonly PlayerAction[], runs: CellRuns): CellRuns {
  const queued = new Set(queue.flatMap((a) => (a.type === 'create_zone' ? cellsOfRuns(a.runs, s.grid) : [])));
  return zoneCellsAllowed(s, runsOfCells(cellsOfRuns(runs, s.grid).filter((c) => !queued.has(c)), s.grid.width));
}

/** A drawn rectangle's cells (inclusive corners), clipped by clipZone. */
export function previewZone(s: GameState, queue: readonly PlayerAction[], x0: number, y0: number, x1: number, y1: number): CellRuns {
  const [ax, bx] = [Math.max(0, Math.min(x0, x1)), Math.min(s.grid.width - 1, Math.max(x0, x1))];
  const [ay, by] = [Math.max(0, Math.min(y0, y1)), Math.min(s.grid.height - 1, Math.max(y0, y1))];
  if (ax > bx || ay > by) return [];
  const runs: CellRuns = [];
  for (let y = ay; y <= by; y++) runs.push([y, ax, bx]);
  return clipZone(s, queue, runs);
}

export function actionLabel(s: GameState, slice: Slice, queue: readonly PlayerAction[], k: number): L {
  const a = queue[k]!;
  switch (a.type) {
    case 'set_enforcement': return cat(S.T.enforcement, S.ENFORCEMENT[a.level] ?? raw(a.level), ': ');
    case 'set_import_quota': return cat(S.T.importQuota, S.IMPORT_QUOTA[a.level] ?? raw(a.level), ': ');
    case 'set_permit_regime': return cat(S.T.permits, S.PERMIT[a.regime] ?? raw(a.regime), ': ');
    case 'create_zone': {
      const cells = a.runs.reduce((t, [, x0, x1]) => t + x1 - x0 + 1, 0);
      const tplName = a.template ? named(slice.tick.precedents, a.template) : undefined;
      const tpl = tplName ? place(tplName) : undefined;
      return cat(cat(S.LAND_USE[a.use] ?? raw(a.use), tpl ?? raw(`#${queuedZoneIds(s, queue).get(k)}`), ' ', ' '),
        { zh: `（${cells}${S.T.cells.zh}）`, en: ` (${cells} ${S.T.cells.en})` }, '');
    }
    case 'remove_zone': return cat(S.T.removeZone, zoneName(s, slice, a.zone), ': ');
    case 'commit_project': {
      const name = named(slice.tick.fiscal?.projects, a.template) ?? raw(a.template);
      const where = a.zone !== undefined ? zoneName(s, slice, a.zone) : areaName(s, a.area ?? 0);
      return cat(cat(S.T.commit, name, ': '), where, ' · ');
    }
    case 'cancel_project': return cat(S.T.cancel, raw(` #${a.project}`), '');
    case 'contract_team': return cat(S.T.contract, named(slice.tick.fiscal?.teams, a.team) ?? raw(a.team), ': ');
    case 'set_project_priority': return cat(cat(S.T.priority, raw(` #${a.project}`), ''), S.PRIORITY[a.priority] ?? raw(a.priority), ': ');
    case 'edit_zone': return cat(S.T.zones, zoneRef(s, slice, a.zone), ': ');
    case 'rename_zone': return cat(S.T.zones, zoneRef(s, slice, a.zone), ': ');
    case 'commit_works': {
      const n = a.cells ? cellsOfRuns(a.cells, s.grid).length : undefined;
      const where = zoneRef(s, slice, a.zone);
      return cat(cat(S.ORDER_KIND.service!, where, ': '), n === undefined ? raw('') : { zh: `（${n}${S.T.cells.zh}）`, en: ` (${n} ${S.T.cells.en})` }, '');
    }
    case 'build_road': {
      const [x0, y0] = a.path[0] ?? [0, 0], [x1, y1] = a.path[a.path.length - 1] ?? [0, 0];
      return cat(S.ORDER_KIND.road!, raw(`${x0},${y0} → ${x1},${y1}`), ': ');
    }
    case 'place_structure': {
      const kind = a.kind === 'facility' && a.facility ? S.FACILITY[a.facility] ?? raw(a.facility) : S.STRUCTURE[a.kind] ?? raw(a.kind);
      return cat(kind, cat(areaName(s, playableAreaOf(s, a.cell[1] * s.grid.width + a.cell[0])), raw(` · ${a.cell[0]},${a.cell[1]}`), ''), ': ');
    }
    case 'cancel_works': return cat(S.T.cancel, cat(orderName(s, a.order), raw(a.cells ? ` (${cellsOfRuns(a.cells, s.grid).length})` : ''), ''), ': ');
    case 'set_works_paused': return cat(a.paused ? S.T.pause : S.T.resume, orderName(s, a.order), ': ');
    case 'set_works_priority': return cat(cat(S.T.priority, orderName(s, a.order), ' '), S.PRIORITY[a.priority] ?? raw(a.priority), ': ');
    case 'set_works_pace': return cat(cat(S.T.pace, orderName(s, a.order), ' '), S.PACE[a.pace] ?? raw(a.pace), ': ');
    default: return raw((a as { type: string }).type);
  }
}

// ---- map overlays (§11): one RGBA pixel per cell ----

export const OVERLAY_LAYERS = ['areas', 'land_use', 'stages', 'network', 'utilities', 'held', 'demand', 'occupancy', 'illegal',
  'service_gap', 'buildable', 'land_cover'] as const;
export type OverlayLayer = (typeof OVERLAY_LAYERS)[number];
export type RGBA = [number, number, number, number];

/** A 0..1 value to a yellow-to-red ramp, half transparent. */
export function ramp(v: number): RGBA {
  const t = Math.max(0, Math.min(1, v));
  return [Math.round(240 - 40 * t), Math.round(220 - 180 * t), Math.round(120 - 90 * t), 170];
}
export const USE_COLOR: Record<string, RGBA> = {
  industrial: [196, 120, 60, 200], residential: [220, 200, 90, 200], commercial: [200, 80, 120, 200],
  reserve: [120, 160, 110, 200],
};
const PLAYABLE: RGBA = [255, 236, 120, 60], CARD_ONLY: RGBA = [200, 150, 80, 60];
/** R8a (phase1-slice §5.5, §11.1): one colour per land-cover class. */
export const LAND_COVER_COLOR: Record<LandCoverClass, RGBA> = {
  water: [70, 120, 190, 200], tidal_flat: [140, 170, 190, 200], pond: [90, 170, 190, 210], hill: [110, 120, 90, 190],
  village: [170, 80, 60, 220], town: [120, 60, 70, 220], upland: [170, 160, 90, 180], lowland_farm: [190, 210, 120, 170],
};

/** The per-area value a layer shows, 0..1 (rental crowding is shown as occupants ÷ beds, capped at 1.5). */
export function areaValue(s: GameState, layer: OverlayLayer, area: number): number {
  const a = s.areas.find((x) => x.id === area);
  if (!a) return 0;
  if (layer === 'illegal') return a.illegalFloorShare;
  if (layer === 'occupancy') return Math.min(1, (s.housing.find((h) => h.area === area)?.crowding ?? 0) / 1.5);
  if (layer === 'service_gap') return a.serviceGap;      // never set in Phase 1: reads 0 (§11.1)
  return 0;
}

export function overlayRgba(s: GameState, slice: Slice, layer: OverlayLayer): Uint8ClampedArray {
  const { width: W, height: H } = s.grid;
  const px = new Uint8ClampedArray(W * H * 4);
  const paint = (cells: Iterable<number>, c: RGBA) => { for (const i of cells) px.set(c, i * 4); };
  if (layer === 'areas') for (const a of s.areas) paint(a.cells, a.access === 'playable' ? PLAYABLE : CARD_ONLY);
  else if (layer === 'land_use') for (const z of s.zones) paint(cellsOfRuns(z.runs, s.grid), USE_COLOR[z.use] ?? [255, 255, 255, 180]);
  else if (layer === 'land_cover') {
    const lc = slice.tick.landcover;
    if (lc) for (let c = 0; c < lc.classOf.length; c++) { const k = landCoverAt(lc, c); if (k) px.set(LAND_COVER_COLOR[k], c * 4); }
  } else if (layer === 'buildable') {
    paint(slice.tick.buildable?.cells ?? [], [150, 190, 120, 110]);
    paint(cellsOfRuns(s.servicedLand, s.grid), [60, 200, 120, 220]);
  } else if (layer === 'stages' || layer === 'network' || layer === 'utilities' || layer === 'held' || layer === 'demand') {
    const k = constraintContext(s, slice);
    const zoned = [...k.zoneAt.keys()];
    if (layer === 'stages') {
      paint(zoned, STAGE_COLOR.zoned);
      for (const w of s.cellWorks) px.set(stageColor(w), w.cell * 4);
      paint(k.served, STAGE_COLOR.serviced);
    } else if (layer === 'network') {
      paint(zoned, NO_REACH);
      for (const [c, f] of k.spatial.frontage) px.set(depthColor(f.depth, slice.startNetwork.maxFrontageDepth), c * 4);
      paint(k.spatial.roads.component.keys(), ROAD_COLOR);
    } else if (layer === 'utilities') {
      for (const c of k.developable.values()) paint(c, NO_DEMAND);
      for (const [c, sh] of k.shares) px.set(shareColor(Math.min(sh.power, sh.water)), c * 4);
      for (const x of s.structures) px.set(x.kind === 'power_source' || x.kind === 'power_substation' ? POWER_COLOR
        : x.kind === 'power_station' ? STATION_COLOR : x.kind === 'water_source' ? WATER_COLOR : FACILITY_COLOR, x.cell * 4);
    } else if (layer === 'held') {
      for (const c of zoned) px.set(RUNG_COLOR[cellConstraint(s, slice, c).rung], c * 4);
    } else {
      for (const [c, z] of k.zoneAt) {
        const b = z.use === 'industrial' ? k.cue.i : z.use === 'commercial' ? k.cue.c : z.use === 'residential' ? k.cue.r : undefined;
        px.set(b ? shareColor(b.level) : NO_DEMAND, c * 4);
      }
    }
  } else for (const a of s.areas) if (a.access === 'playable') paint(a.cells, ramp(areaValue(s, layer, a.id)));
  return px;
}

// the R5 overlays' colours (§11.2)
export const STAGE_COLOR = {
  zoned: [210, 210, 210, 90] as RGBA, planned: [120, 160, 255, 160] as RGBA, serviced: [60, 200, 120, 220] as RGBA,
};
/** A works cell's stage colour: planned, servicing (brighter with work done) or serviced. */
export function stageColor(w: Pick<CellWork, 'stage' | 'workDone' | 'workTotal'>): RGBA {
  if (w.stage === 'serviced') return STAGE_COLOR.serviced;
  if (w.stage === 'planned') return STAGE_COLOR.planned;
  const t = w.workDone / Math.max(1, w.workTotal);
  return [Math.round(120 - 60 * t), Math.round(160 + 40 * t), Math.round(255 - 135 * t), 200];
}
const ROAD_COLOR: RGBA = [245, 245, 235, 235], NO_REACH: RGBA = [220, 70, 60, 190], NO_DEMAND: RGBA = [170, 170, 170, 110];
const POWER_COLOR: RGBA = [255, 220, 60, 255], WATER_COLOR: RGBA = [80, 170, 255, 255], FACILITY_COLOR: RGBA = [200, 120, 255, 255];
const STATION_COLOR: RGBA = [255, 150, 60, 255];
/** Frontage depth 1 (green) to the deepest reach (yellow). */
export function depthColor(depth: number, max: number): RGBA {
  const t = max > 1 ? (depth - 1) / (max - 1) : 0;
  return [Math.round(80 + 170 * t), Math.round(200 + 20 * t), 90, 200];
}
/** A share or a level 0..1: red (0) to green (1). */
export function shareColor(v: number): RGBA {
  const t = Math.max(0, Math.min(1, v));
  return [Math.round(230 - 170 * t), Math.round(70 + 140 * t), 70, 210];
}
export const RUNG_COLOR: Readonly<Record<Rung, RGBA>> = {
  unbuildable: [90, 90, 90, 200], unzoned: [0, 0, 0, 0], not_queued: [200, 200, 200, 170], waiting: [230, 60, 60, 220],
  no_frontage: [240, 120, 40, 220], servicing: [100, 150, 255, 200], utility: [250, 210, 40, 220], low_demand: [190, 120, 220, 210],
  building: [120, 220, 230, 210], active: [60, 200, 120, 220],
};

/** The area (playable or card-only) a cell belongs to, or 0. */
export function areaAt(s: GameState, cell: number): number {
  for (const a of s.areas) {
    let lo = 0, hi = a.cells.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1, v = a.cells[m]!; if (v === cell) return a.id; if (v < cell) lo = m + 1; else hi = m - 1; }
  }
  return 0;
}

/** The slice's bounding box in cells [x0, y0, x1, y1], over every area: the whole-territory fit. */
export function sliceBox(s: GameState): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of s.areas) for (const c of a.cells) {
    const x = c % s.grid.width, y = Math.floor(c / s.grid.width);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** The seven playable areas' bounding box, padded: the default build view (R11.1). */
export function playableBox(s: GameState, pad = 10): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of s.areas) {
    if (a.access !== 'playable') continue;
    for (const c of a.cells) {
      const x = c % s.grid.width, y = Math.floor(c / s.grid.width);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return Number.isFinite(x0) ? [x0 - pad, y0 - pad, x1 + pad, y1 + pad] : sliceBox(s);
}

/** One area's bounding box, padded, for the legend's "focus" controls. */
export function areaBox(s: GameState, id: number, pad = 6): [number, number, number, number] | undefined {
  const a = s.areas.find((x) => x.id === id);
  if (!a || !a.cells.length) return undefined;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of a.cells) {
    const x = c % s.grid.width, y = Math.floor(c / s.grid.width);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/** The prologue's readiness panel (R11.1): the bar, its three parts and a first-wave target. */
export function readinessView(s: GameState, slice: Slice) {
  const r = readiness(s, slice.params, slice.tick.buildable);
  const wave = slice.params.readiness.first_wave;
  const targetCards = Math.min(wave.max_cards, Math.max(wave.min_cards, 3));
  // The first-wave card count rounds, so find the smallest bar that actually yields the target.
  let targetBar = 0;
  for (let b = 0; b <= 1; b += 0.01) if (firstWaveCards(b, slice.params) >= targetCards) { targetBar = b; break; }
  return {
    bar: r.bar, roads: r.roads, servicedLand: r.servicedLand, waterPower: r.waterPower, weakest: r.weakest,
    forecast: firstWaveCards(r.bar, slice.params), targetCards, targetBar,
  };
}

// ---- R5 (§11.2): the planning map's derived views. Pure, never saved; they add no sim fields ----

const CELL_M2 = 10_000;
/** A cue level below this reads low (the ladder's rung 8). */
export const LOW = 1 / 3;
type GrowthUse = 'industrial' | 'commercial' | 'residential';
const isGrowthUse = (u: string): u is GrowthUse => u === 'industrial' || u === 'commercial' || u === 'residential';
const isOpenFirm = (f: GameState['firms'][number], date: number) => f.opens !== undefined && date >= f.opens;
function inSorted(sorted: ArrayLike<number>, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, x = sorted[m]!; if (x === v) return true; if (x < v) lo = m + 1; else hi = m - 1; }
  return false;
}
const growthContent = (slice: Slice) => ({ network: slice.startNetwork, ...(slice.tick.buildable ? { buildable: slice.tick.buildable } : {}) });
const isVillageCohort = (c: GameState['blocks'][number]['cohorts'][number]) =>
  VILLAGE_ARCHETYPES.includes(c.archetype) || c.builder === 'village_household';

/** A zone id named by an action: a current zone's label, or a zone queued this turn. */
function zoneRef(s: GameState, slice: Slice, id: number): L {
  if (s.zones.some((z) => z.id === id)) return zoneName(s, slice, id);
  return cat(S.T.newZone, raw(` #${id}`), '', '');
}
/** A works order's short name: its kind and id. */
function orderName(s: GameState, id: number): L {
  const o = s.worksOrders.find((q) => q.id === id);
  return cat(o ? S.ORDER_KIND[o.kind] ?? raw(o.kind) : S.ORDER_KIND.service!, raw(` #${id}`), '', '');
}

// ---- the I/C/R cue ----

export interface CueInput { label: L; level: number }
export interface CueBar { level: number; low: boolean; inputs: readonly [CueInput, CueInput] }
export interface Cue { i: CueBar; c: CueBar; r: CueBar }
const bar3 = (level: number, a: [L, number], b: [L, number]): CueBar => ({
  level, low: level < LOW, inputs: [{ label: a[0], level: a[1] }, { label: b[0], level: b[1] }] });
const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** Demand crowding (§5.11) by playable area, its highest, and the turned away last month. */
function crowdingNow(s: GameState): { max: number; byArea: Map<number, number>; turnedAway: number } {
  const playable = new Set(s.areas.filter((a) => a.access === 'playable').map((a) => a.id));
  const byArea = new Map<number, number>();
  let max = 0, turnedAway = 0;
  for (const h of s.housing) {
    if (!playable.has(h.area)) continue;
    const d = (h.occupants.rental + h.turnedAway) / Math.max(1, h.beds.rental);
    byArea.set(h.area, d);
    max = Math.max(max, d);
    turnedAway += h.turnedAway;
  }
  return { max, byArea, turnedAway };
}

/** The I/C/R demand cue (§11.2): each bar a level 0..1, with its two inputs. */
export function icrCue(s: GameState, slice: Slice): Cue {
  const p = slice.params, G = p.growth;
  if (!G) return { i: bar3(0, [S.CUE_INPUT.industrialDemand!, 0], [S.CUE_INPUT.headroom!, 0]),
    c: bar3(0, [S.CUE_INPUT.spending!, 0], [S.CUE_INPUT.shopPosts!, 0]), r: bar3(0, [S.CUE_INPUT.crowding!, 0], [S.CUE_INPUT.turnedAway!, 0]) };
  // I: demand against one organic firm's floor, and the best prospective utility share a new firm would see
  const I = G.industrial;
  const factor = I.regime_factor[s.fiscal.regime] ?? I.regime_factor.default!;
  const offer = sizeOffer(p, I.archetype, I.ownership, I.firm_jobs);
  const demand = clamp01((I.floor_m2_per_month * p.industry.order_index * orderFactor(s) * factor + s.growth.carry) / Math.max(1, offer.floorM2));
  const g = growthContent(slice);
  const ind = s.zones.filter((z) => z.use === 'industrial');
  let best = 0;
  if (ind.length) {
    for (const z of ind) best = Math.max(best, prospectiveShare(s, z.area, offer.powerKw, offer.waterM3Day,
      placedSupply(s, g, () => true, { zone: z.id, kw: offer.powerKw, m3: offer.waterM3Day })));
  } else {
    for (const a of s.areas) if (a.access === 'playable') best = Math.max(best, prospectiveShare(s, a.id, offer.powerKw, offer.waterM3Day));
  }
  const headroom = clamp01(best / Math.max(1e-9, I.min_utility_share));
  // C: the formal service jobs spending supports, against the formal posts that have shop floor
  let induced = 0;
  for (const n of inducedServiceJobs(s, p).values()) induced += n;
  const formal = induced * G.services.formal_share;
  const posts = s.labour.servicePosts.reduce((n, x) => n + x.formal, 0);
  const shortfall = formal > 0 ? clamp01((formal - posts) / formal) : 0;
  // R: demand crowding and the turned away
  const cr = crowdingNow(s);
  const crowd = clamp01(cr.max / (2 * G.residential.min_crowding));
  const turned = cr.turnedAway > 0 ? 2 / 3 : 0;
  return {
    i: bar3(Math.min(demand, headroom), [S.CUE_INPUT.industrialDemand!, demand], [S.CUE_INPUT.headroom!, headroom]),
    c: bar3(shortfall, [S.CUE_INPUT.spending!, formal > 0 ? 1 : 0], [S.CUE_INPUT.shopPosts!, formal > 0 ? clamp01(posts / formal) : 0]),
    r: bar3(Math.max(crowd, turned), [S.CUE_INPUT.crowding!, crowd], [S.CUE_INPUT.turnedAway!, turned]),
  };
}

// ---- the constraint ladder ----

export const RUNGS = ['unbuildable', 'unzoned', 'not_queued', 'waiting', 'no_frontage', 'servicing', 'utility', 'low_demand',
  'building', 'active'] as const;
export type Rung = (typeof RUNGS)[number];
export interface CellConstraint { rung: Rung; why?: L }
/** Power and water supplied share at a demanding cell, each 0..1 (§11.2 "A cell's supplied share"). R8c: water reads 1. */
export interface CellShare { power: number; water: number }

/** What the ladder reads, built once per state (§11.2): the views, the shares, the cue, the zones with building. */
export interface ConstraintContext {
  spatial: SpatialViews;
  developable: Map<number, number[]>;
  served: Set<number>;
  zoneAt: Map<number, Zone>;
  works: Map<number, CellWork>;
  orders: Map<number, WorksOrder>;
  siteAt: Map<number, GameState['fiscal']['projects'][number]>;
  shares: Map<number, CellShare>;
  cue: Cue;
  building: Set<number>;
  crowding: Map<number, number>;
}
const CTX = new WeakMap<GameState, ConstraintContext>();

/**
 * Each demanding cell's supplied share: the area's capacity pro rata, plus the cell's substation supply, scaled by the
 * city pool's factor when the areas' takes exceed it (§5.5, §11.2). Water is not an active constraint (R8c): it reads 1.
 */
function cellShares(s: GameState, slice: Slice, developable: Map<number, number[]>): Map<number, CellShare> {
  const out = new Map<number, CellShare>();
  const demand = { power: new Map<number, number>(), water: new Map<number, number>() };
  const areaNeed = new Map<number, { power: number; water: number }>();
  for (const f of s.firms) if (isOpenFirm(f, s.date)) {
    const a = areaNeed.get(f.area) ?? { power: 0, water: 0 };
    areaNeed.set(f.area, { power: a.power + f.powerKw, water: a.water + f.waterM3Day });
  }
  const areaOf = new Map<number, number>();
  for (const z of s.zones) {
    const cs = developable.get(z.id) ?? [];
    if (!cs.length) continue;
    let kw = 0, m3 = 0;
    for (const f of s.firms) if (f.zone === z.id && isOpenFirm(f, s.date)) { kw += f.powerKw; m3 += f.waterM3Day; }
    void m3;
    const split = largestRemainder(Math.ceil(kw), cs.map(() => 1));
    cs.forEach((c, i) => { if (split[i]! > 0) { demand.power.set(c, split[i]!); areaOf.set(c, z.area); } });
  }
  const cells = [...demand.power.keys()].sort((a, b) => a - b);
  if (!cells.length) return out;
  const placed = s.structures.some((x) => SOURCE_KINDS.power!.includes(x.kind))
    ? spatialViews(s, slice.startNetwork, { demand }).supply : undefined;
  // the pool's factor over what each area can take: its local plant plus what its cells receive from substations
  const delivered = new Map<number, { power: number }>();
  for (const c of cells) {
    const a = areaOf.get(c)!, got = Math.min(demand.power.get(c) ?? 0, placed?.power.get(c) ?? 0);
    delivered.set(a, { power: (delivered.get(a)?.power ?? 0) + got });
  }
  const f = poolFactor(areaTakes(s, new Map([...areaNeed].map(([a, n]) => [a, n.power])), delivered), powerPool(s).total);
  for (const c of cells) {
    const area = s.areas.find((a) => a.id === areaOf.get(c));
    const need = areaNeed.get(area?.id ?? -1)?.power ?? 0;
    const d = demand.power.get(c) ?? 0;
    const fromArea = need > 0 ? Math.max(0, area?.utilities.powerCap ?? 0) / need : 1;
    out.set(c, { power: d > 0 ? Math.min(1, fromArea + (placed?.power.get(c) ?? 0) / d) * f : 1, water: 1 });
  }
  return out;
}

/** The city power pool for the Economy drawer (§5.5, §11.2): supply, firms' need, spare, and the areas short of it. */
export function powerView(s: GameState, slice: Slice) {
  const pool = powerPool(s), bought = importedKw(s);
  const sited = s.firms.reduce((n, f) => n + f.powerKw, 0);
  const g = growthContent(slice);
  const shares = utilityShares(s, placedSupply(s, g, (f) => isOpenFirm(f, s.date)));
  const unmet = [...shares].filter(([, v]) => v < 1).map(([a]) => a).sort((a, b) => a - b);
  const I = slice.params.fiscal.power_import;
  return { ...pool, onOrder: bought.pending, sited, spare: Math.max(0, pool.total - sited), unmet,
    room: Math.max(0, I.max_kw - bought.arrived - bought.pending), step: Math.min(500, Math.max(0, I.max_kw - bought.arrived - bought.pending)) };
}

/**
 * Freight for the Economy drawer (§5.12): each gateway's capacity and last month's unmet tonnes, and for each area
 * with shipping firms its path to the Hong Kong rail gateway and the weakest cell on it. Undefined without freight.
 */
export function freightView(s: GameState, slice: Slice) {
  const fc = freightContent(slice.params, slice.tick.network, slice.tick.gateways);
  if (!fc) return undefined;
  const net = freightNetwork(s, fc), W = s.grid.width;
  const unmet = (k: string) => last(s.history.freightUnmet?.[k] ?? []);
  const gateways = fc.gateways.map((g) => ({ id: g.id, name: g.name as L, capacity: g.capacity,
    unmet: { in: unmet(`${g.id}:in`), out: unmet(`${g.id}:out`) } }));
  const hk = fc.gateways.find((g) => g.faces === 'hong_kong' && g.mode === 'rail');
  const shipping = [...new Set(s.firms.filter((f) => isOpenFirm(f, s.date) && firmFreight(f, fc.freight)).map((f) => f.area))].sort((a, b) => a - b);
  const areas = hk ? shipping.map((a) => {
    const p = net.path(a, hk);
    return { area: a, capacity: p.capacity, ...(p.weakest !== undefined ? { weakest: [p.weakest % W, Math.floor(p.weakest / W)] as const } : {}) };
  }) : [];
  return { gateways, areas, hk: hk?.name as L | undefined };
}

export function constraintContext(s: GameState, slice: Slice): ConstraintContext {
  const hit = CTX.get(s);
  if (hit) return hit;
  const spatial = spatialViews(s, slice.startNetwork);
  const developable = developableCells(s, growthContent(slice));
  const zoneAt = new Map<number, Zone>();
  for (const z of s.zones) for (const c of cellsOfRuns(z.runs, s.grid)) if (!zoneAt.has(c)) zoneAt.set(c, z);
  const siteAt = new Map<number, GameState['fiscal']['projects'][number]>();
  for (const x of s.fiscal.projects) if (x.cells && liveProject(x)) for (const c of cellsOfRuns(x.cells, s.grid)) siteAt.set(c, x);
  const building = new Set<number>();
  for (const b of s.blocks) for (const c of b.cohorts) if (c.zone !== undefined && c.stage === 'under_construction') building.add(c.zone);
  for (const f of s.firms) if (f.zone !== undefined && !isOpenFirm(f, s.date)) building.add(f.zone);
  const ctx: ConstraintContext = {
    spatial, developable, served: new Set(cellsOfRuns(s.servicedLand, s.grid)), zoneAt,
    works: new Map(s.cellWorks.map((w) => [w.cell, w])), orders: new Map(s.worksOrders.map((o) => [o.id, o])), siteAt,
    shares: cellShares(s, slice, developable), cue: icrCue(s, slice), building, crowding: crowdingNow(s).byArea,
  };
  CTX.set(s, ctx);
  return ctx;
}

/** Is the cell on the buildable layer (every cell is, without the layer)? */
export const isBuildable = (slice: Slice, cell: number) => !slice.tick.buildable || inSorted(slice.tick.buildable.cells, cell);

/** The first constraint that applies at a cell, on §11.2's ladder. */
export function cellConstraint(s: GameState, slice: Slice, cell: number): CellConstraint {
  const k = constraintContext(s, slice);
  if (!isBuildable(slice, cell)) {
    const lc = slice.tick.landcover ? landCoverAt(slice.tick.landcover, cell) : undefined;   // R8a: name the class
    return lc ? { rung: 'unbuildable', why: S.LAND_COVER[lc]! } : { rung: 'unbuildable' };
  }
  const z = k.zoneAt.get(cell);
  if (!z) return { rung: 'unzoned' };
  const served = k.served.has(cell);
  const w = k.works.get(cell);
  const o = w?.order !== undefined ? k.orders.get(w.order) : undefined;
  const live = o !== undefined && liveOrder(o) ? o : undefined;
  const site = k.siteAt.get(cell);
  if (!served && !live && !site) return { rung: 'not_queued' };
  if (!served) {
    if (live?.waiting) return { rung: 'waiting', why: S.WAITING[live.waiting] ?? raw(live.waiting) };
    if (site?.waiting) return { rung: 'waiting', why: S.WAITING[site.waiting] ?? raw(site.waiting) };
  }
  if (!k.spatial.frontage.has(cell)) return { rung: 'no_frontage' };
  if (!served) return { rung: 'servicing' };
  if (!isGrowthUse(z.use)) return { rung: 'active' };
  const sh = k.shares.get(cell);
  if (sh && Math.min(sh.power, sh.water) < 1) return { rung: 'utility', why: sh.power <= sh.water ? S.T.power : S.T.water };
  const G = slice.params.growth;
  const room = G ? zoneRoomM2(s, z, k.developable.get(z.id)?.length ?? 0, G) : 0;
  if (room > 0) {
    const cue = z.use === 'industrial' ? k.cue.i : z.use === 'commercial' ? k.cue.c : k.cue.r;
    if (cue.low) return { rung: 'low_demand', why: cue.inputs[0].level <= cue.inputs[1].level ? cue.inputs[0].label : cue.inputs[1].label };
    if (z.use === 'residential' && G && (k.crowding.get(z.area) ?? 0) < G.residential.min_crowding) {
      return { rung: 'low_demand', why: S.CUE_INPUT.crowding! };
    }
  }
  if (k.building.has(z.id)) return { rung: 'building' };
  return { rung: 'active' };
}

/** The constraint as one line: the rung's name and, if any, why. */
export function constraintLabel(c: CellConstraint): L {
  const r = S.RUNG[c.rung]!;
  return c.why ? cat(r, c.why, ': ') : r;
}

/**
 * The area most held back (§11.2): the playable area with the most zoned cells on the earliest rung, ties by area id.
 * Unbuildable and active cells never name an area. Undefined when nothing is held back.
 */
export function mostHeldBack(s: GameState, slice: Slice): { area: number; name: L; constraint: CellConstraint; cells: number } | undefined {
  type Best = { rank: number; cells: number; constraint: CellConstraint };
  const best = new Map<number, Best>();
  const k = constraintContext(s, slice);
  for (const [c, z] of [...k.zoneAt].sort((a, b) => a[0] - b[0])) {
    const con = cellConstraint(s, slice, c);
    if (con.rung === 'unbuildable' || con.rung === 'active') continue;
    const area = playableAreaOf(s, c) || z.area, rank = RUNGS.indexOf(con.rung);
    const b = best.get(area);
    if (!b || rank < b.rank) best.set(area, { rank, cells: 1, constraint: con });
    else if (rank === b.rank) b.cells += 1;
  }
  let pick: [number, Best] | undefined;
  for (const e of [...best].sort((a, b) => a[0] - b[0])) {
    if (!pick || e[1].rank < pick[1].rank || (e[1].rank === pick[1].rank && e[1].cells > pick[1].cells)) pick = e;
  }
  return pick ? { area: pick[0], name: areaName(s, pick[0]), constraint: pick[1].constraint, cells: pick[1].cells } : undefined;
}

// ---- the cell inspector ----

export interface InspectorView {
  x: number; y: number; area?: L; zone?: L; use?: L; stage: L; landCover?: L;
  progress?: { done: number; total: number };
  frontage?: { depth: number; max: number };
  /** R11.1: an unzoned cell's frontage if it were zoned now, so scouting does not read "no access" beside a road. */
  prospectiveFrontage?: { depth: number; max: number };
  share?: CellShare; areaShare?: number;
  zoneFloorM2?: number; villageFloorM2?: number;
  jobs: { filled: number; posted: number }; beds: { occupants: number; beds: number };
  site?: L; route?: L;
  constraint: CellConstraint;
}

export function inspectorView(s: GameState, slice: Slice, x: number, y: number): InspectorView {
  const cell = y * s.grid.width + x, k = constraintContext(s, slice);
  const lc = slice.tick.landcover ? landCoverAt(slice.tick.landcover, cell) : undefined;
  const areaId = playableAreaOf(s, cell) || areaAt(s, cell);
  const z = k.zoneAt.get(cell), w = k.works.get(cell);
  const stage = w ? S.WORK_STAGE[w.stage]! : k.served.has(cell) ? S.WORK_STAGE.serviced! : z ? S.WORK_STAGE.zoned! : S.T.notZoned;
  const f = k.spatial.frontage.get(cell);
  const site = slice.startSites.find((q) => q.cell[0] === x && q.cell[1] === y);
  const route = slice.startNetwork.routes.find((r) => r.cells.includes(cell));
  const jobs = s.labour.jobs.filter((j) => j.area === areaId);
  const h = s.housing.find((q) => q.area === areaId);
  const village = s.blocks.filter((b) => b.area === areaId)
    .reduce((n, b) => n + b.cohorts.reduce((m, c) => m + (c.stage === 'completed' && isVillageCohort(c) ? c.m2 : 0), 0), 0);
  const share = k.shares.get(cell);
  const v: InspectorView = {
    x, y, stage, constraint: cellConstraint(s, slice, cell),
    jobs: { filled: jobs.reduce((n, j) => n + j.filled, 0), posted: jobs.reduce((n, j) => n + j.jobs, 0) },
    beds: { occupants: h ? h.occupants.local + h.occupants.rental : 0, beds: h ? h.beds.local + h.beds.rental : 0 },
  };
  if (areaId) v.area = areaName(s, areaId);
  if (lc) v.landCover = S.LAND_COVER[lc] ?? raw(lc);
  if (z) { v.zone = zoneName(s, slice, z.id); v.use = S.LAND_USE[z.use] ?? raw(z.use); v.zoneFloorM2 = zoneBuiltM2(s, z.id); }
  if (w) v.progress = { done: w.workDone, total: w.workTotal };
  if (f) v.frontage = { depth: f.depth, max: slice.startNetwork.maxFrontageDepth };
  else if (!z) {
    // R11.1: the same road network, read as if this one cell were zoned. Unzoned cells otherwise always read "no road".
    const p = zoneFrontage(k.spatial.roads, [cell], slice.startNetwork.maxFrontageDepth).get(cell);
    if (p) v.prospectiveFrontage = { depth: p.depth, max: slice.startNetwork.maxFrontageDepth };
  }
  if (share) { v.share = share; v.areaShare = utilityShare(s, z?.area ?? areaId); }
  if (areaId && village > 0) v.villageFloorM2 = village;
  if (site) v.site = place(siteName(site));
  if (route) v.route = place(route.name);
  return v;
}

// ---- the floor at core zoom (render only) ----

/**
 * Each developable cell's drawn share of its zone's floor (§11.2): the zone's floor, built and building, spread over
 * its developable cells frontage first (lower depth, then cell index), each filled to growth.far before the next.
 */
export function floorSpread(s: GameState, slice: Slice): Map<number, number> {
  const out = new Map<number, number>();
  const G = slice.params.growth;
  if (!G) return out;
  const k = constraintContext(s, slice);
  for (const z of s.zones) {
    if (!isGrowthUse(z.use)) continue;
    const cap = CELL_M2 * G.far[z.use];
    const cells = [...(k.developable.get(z.id) ?? [])].sort((a, b) =>
      (k.spatial.frontage.get(a)?.depth ?? 99) - (k.spatial.frontage.get(b)?.depth ?? 99) || a - b);
    let left = zoneBuiltM2(s, z.id);
    for (const c of cells) {
      if (left <= 0) break;
      const take = Math.min(cap, left);
      out.set(c, take / cap);
      left -= take;
    }
  }
  return out;
}

/** Village floor over its plots' footprint, by area (§5.2): how much the settlement anchors thicken at core zoom. */
export function villageFloors(s: GameState): Map<number, number> {
  const out = new Map<number, number>();
  for (const v of s.villagePlots) {
    if (v.footprintM2 <= 0) continue;
    const m2 = s.blocks.filter((b) => b.area === v.area)
      .reduce((n, b) => n + b.cohorts.reduce((m, c) => m + (c.stage === 'completed' && isVillageCohort(c) ? c.m2 : 0), 0), 0);
    out.set(v.area, m2 / v.footprintM2);
  }
  return out;
}

// ---- the chips ----

export const DRAWERS = ['building', 'budget', 'population', 'economy', 'politics'] as const;
/** Chip drawers plus the prologue readiness detail panel (R11.1). */
export type DrawerId = (typeof DRAWERS)[number] | 'readiness';
export interface Chip { id: DrawerId; label: L; values: readonly [string, string]; captions: [L, L];                  // R7: the visible caption above each stat
  hints: readonly [L, L] }
const signedYuan = (v: number) => `${v < 0 ? '−' : '+'}${yuan(Math.abs(v))}`;

/** Works running and stalled: live orders and projects without and with a waiting reason. */
export function worksCounts(s: GameState): { running: number; stalled: number } {
  let running = 0, stalled = 0;
  for (const o of s.worksOrders) if (liveOrder(o)) { if (o.waiting) stalled++; else running++; }
  for (const x of s.fiscal.projects) if (liveProject(x)) { if (x.waiting || x.stage === 'stalled') stalled++; else running++; }
  return { running, stalled };
}
/** Crews in use last month (city works and projects) and the pool this month (§11.2's chip stats). */
export function crewsView(s: GameState, slice: Slice): { used: number; total: number } {
  const p = slice.params;
  const total = crewPool(s, p);                          // R9 (§5.6): the core, the arrivals and the pool contracts
  return { used: Math.round(last(s.history.constructionPosts) / Math.max(1e-9, p.labour.jobs_per_crew_unit)), total };
}
/** This year's review targets met now, out of all of them. */
export function targetsMet(s: GameState, slice: Slice): { met: number; of: number } {
  const r = reviewView(s, slice).next;
  if (!r) return { met: 0, of: 0 };
  return { met: r.items.filter((i) => i.value >= i.target).length, of: r.items.length };
}

/**
 * The money committed and what is left after it (§11.2, R7), from existing exports only. `committed` is the live
 * orders' and projects' budget − spent (sim-core's unspentCommitments), the budgets of the orders this turn's queue
 * would create (`queuedBudget`, from previewWorks), and the one-off obligations (those with an end) still due this
 * quarter. `projected` is the money for projects less what moneyForProjects does not already hold back: the queue
 * and the one-offs. Recurring obligations stay in the ledger's net per quarter, against revenue.
 */
export function commitments(s: GameState, slice: Slice, queuedBudget = 0) {
  const quarterEnd = s.date + (2 - s.subStep);
  let oneOff = 0;
  for (const o of s.fiscal.obligations) {
    if (o.until === undefined || o.until < s.date) continue;          // recurring, or already past
    const months = Math.max(0, Math.min(o.until, quarterEnd) - Math.max(o.from, s.date) + 1);
    oneOff += months * obligationDue(o, s);
  }
  const live = unspentCommitments(s);
  return { live, queued: queuedBudget, oneOff, committed: live + queuedBudget + oneOff,
    projected: moneyForProjects(s, slice.params) - queuedBudget - oneOff };
}

export function chipsView(s: GameState, slice: Slice, queuedBudget = 0): Chip[] {
  const crews = crewsView(s, slice), wc = worksCounts(s), t = targetsMet(s, slice), m = commitments(s, slice, queuedBudget);
  return [
    { id: 'building', label: S.CHIP.building!, captions: [S.CHIP_STAT.crews!, S.CHIP_STAT.works!],
      values: [`${num(crews.used)} / ${num(crews.total)} · ${yuan(m.committed)}`, `${wc.running} / ${wc.stalled}`],
      hints: [S.T.crewsCommitted, S.T.worksRunning] },
    { id: 'budget', label: S.CHIP.budget!, captions: [S.CHIP_STAT.forProjects!, S.CHIP_STAT.commitments!],
      values: [yuan(moneyForProjects(s, slice.params)), `${yuan(m.committed)} · ${signedYuan(m.projected)}`],
      hints: [S.T.moneyForProjects, S.T.commitmentsHint] },
    { id: 'population', label: S.CHIP.population!, captions: [S.CHIP_STAT.residents!, S.CHIP_STAT.turnedAway!],
      values: [num(sum(s.pops.map((g) => g.stayedSixMonths))), num(sum(s.housing.map((h) => h.turnedAway)))],
      hints: [S.T.residents, S.T.turnedAway] },
    { id: 'economy', label: S.CHIP.economy!, captions: [S.CHIP_STAT.gdp!, S.CHIP_STAT.vacancies!],
      values: [yuan(quarterGdp(s, slice)), num(last(s.history.vacancies))],
      hints: [S.T.gdpQuarter, S.T.vacancies] },
    { id: 'politics', label: S.CHIP.politics!, captions: [S.CHIP_STAT.scrutiny!, S.CHIP_STAT.targets!],
      values: [num(s.climate.scrutiny), `${t.met} / ${t.of}`],
      hints: [S.T.scrutiny, S.T.targetsMet] },
  ];
}

// ---- the works queue (the Building drawer) ----

export interface WorkRow {
  id: number; kind: L; where: L; stage: L; waiting?: L; paused: boolean; priority: string;
  done: number; total: number; spent: number; budget: number; cells?: { x: number; y: number; stage: L }[];
}
function orderWhere(s: GameState, slice: Slice, o: WorksOrder): L {
  const W = s.grid.width, xy = (c: number) => `${c % W},${Math.floor(c / W)}`;
  if (o.kind === 'service') return o.zone !== undefined ? zoneRef(s, slice, o.zone) : S.ORDER_KIND.service!;
  if (o.kind === 'road') {
    const a = o.path?.[0]?.cell ?? 0, b = o.path?.[o.path.length - 1]?.cell ?? a;
    return cat(areaName(s, playableAreaOf(s, a)), raw(` · ${xy(a)} → ${xy(b)}`), '', '');
  }
  const pl = o.placement!;
  const kind = pl.kind === 'facility' && pl.facility ? S.FACILITY[pl.facility] ?? raw(pl.facility) : S.STRUCTURE[pl.kind]!;
  return cat(kind, cat(areaName(s, playableAreaOf(s, pl.cell)), raw(` · ${xy(pl.cell)}`), '', ''), ': ');
}
export function worksView(s: GameState, slice: Slice): WorkRow[] {
  const W = s.grid.width;
  return s.worksOrders.filter(liveOrder).map((o) => ({
    id: o.id, kind: S.ORDER_KIND[o.kind]!, where: orderWhere(s, slice, o), stage: S.ORDER_STAGE[o.stage]!,
    ...(o.waiting ? { waiting: S.WAITING[o.waiting] ?? raw(o.waiting) } : {}), paused: o.paused, priority: o.priority,
    done: o.unitsDone, total: o.unitsTotal, spent: o.spent, budget: o.budget,
    ...(o.kind === 'service' ? { cells: s.cellWorks.filter((w) => w.order === o.id)
      .map((w) => ({ x: w.cell % W, y: Math.floor(w.cell / W), stage: S.WORK_STAGE[w.stage]! })) } : {}),
  }));
}

// ---- the briefing: where work finished ----

export interface Finished { area: number; name: L; serviced: number; roads: number; sources: number; facilities: number; orders: number; firms: number }
/** What finished between two turn starts, by playable area (§11.2). */
export function finishedWork(now: GameState, before: GameState | undefined): Finished[] {
  if (!before) return [];
  const rows = new Map<number, Finished>();
  const row = (area: number) => {
    let r = rows.get(area);
    if (!r) { r = { area, name: areaName(now, area), serviced: 0, roads: 0, sources: 0, facilities: 0, orders: 0, firms: 0 }; rows.set(area, r); }
    return r;
  };
  const was = new Set(cellsOfRuns(before.servicedLand, before.grid));
  for (const c of cellsOfRuns(now.servicedLand, now.grid)) if (!was.has(c)) row(playableAreaOf(now, c)).serviced++;
  const roads = new Set(before.roads);
  for (const c of now.roads) if (!roads.has(c)) row(playableAreaOf(now, c)).roads++;
  for (const x of now.structures) if (x.id >= before.nextStructureId) {
    const r = row(playableAreaOf(now, x.cell));
    if (x.kind === 'facility') r.facilities++; else r.sources++;
  }
  const doneBefore = new Set(before.worksOrders.filter((o) => o.stage === 'done').map((o) => o.id));
  for (const o of now.worksOrders) if (o.stage === 'done' && !doneBefore.has(o.id)) {
    const cell = o.kind === 'road' ? o.path?.[0]?.cell : o.kind === 'structure' ? o.placement?.cell
      : now.cellWorks.find((w) => w.order === o.id)?.cell;
    row(cell !== undefined ? playableAreaOf(now, cell) : now.zones.find((z) => z.id === o.zone)?.area ?? 0).orders++;
  }
  for (const f of now.firms) if (f.opens !== undefined && f.opens > before.date && f.opens <= now.date) row(f.area).firms++;
  return [...rows.values()].filter((r) => r.area > 0).sort((a, b) => a.area - b.area);
}

// ---- the queue: removing an action keeps the others valid ----

const ZONE_REF_TYPES = new Set(['commit_works', 'commit_project', 'edit_zone', 'remove_zone', 'rename_zone']);
const zoneRefOf = (a: PlayerAction): number | undefined => (ZONE_REF_TYPES.has(a.type) ? (a as { zone?: number }).zone : undefined);

/**
 * The queue without action k (§11.2): removing a queued create_zone also removes the queued actions naming its zone,
 * and renumbers references to the zones queued after it.
 */
export function dropQueued(s: GameState, queue: readonly PlayerAction[], k: number): PlayerAction[] {
  const zid = queuedZoneIds(s, queue).get(k);
  return queue.flatMap((a, j) => {
    if (j === k) return [];
    const ref = zoneRefOf(a);
    if (zid === undefined || ref === undefined) return [a];
    if (ref === zid) return [];
    return ref > zid ? [{ ...a, zone: ref - 1 } as PlayerAction] : [a];
  });
}
