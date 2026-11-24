/**
 * The UI's views (phase1-slice.md §11, §11.1): pure functions from the state and the slice to what the screens show.
 * They call sim-core's own derivations (fiscalViews, previewOffer, indicatorValue, scoreReview, verdict, zoneLabel)
 * and never re-derive them. main.ts only renders what these return.
 */
import {
  FAILURE_CARD, LOAN_CARD, buildableCells, DEFICIT_CARD, REVIEW_CARD, SHORTCUT_CARD, contractLive, fiscalViews, formatYM, indicatorValue,
  liveProject, moneyForProjects, previewOffer, runsOfCells, scoreReview, tripChance, verdict,
  zoneCellsAllowed, zoneLabel, cellsOfRuns,
  type CardInstance, type CellRuns, type GameState, type PlayerAction, type Slice,
} from '@sz/sim-core';
import * as S from './strings.js';
import type { L } from './strings.js';

const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);
const last = (xs: readonly number[]) => xs[xs.length - 1] ?? 0;
const cat = (a: L, b: L, sep = ' '): L => ({ zh: `${a.zh}${b.zh}`, en: `${a.en}${sep}${b.en}` });
const raw = (t: string): L => ({ zh: t, en: t });
export const yuan = (x: number) => `¥${Math.round(x).toLocaleString('en-US')}`;
export const num = (x: number) => Math.round(x).toLocaleString('en-US');
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

// ---- names ----

export function areaName(s: GameState, id: number): L {
  return s.areas.find((a) => a.id === id)?.name ?? cat(S.AREA, raw(` ${id}`), '');
}
export function zoneName(s: GameState, slice: Slice, id: number): L {
  const z = s.zones.find((x) => x.id === id);
  return z ? zoneLabel(s, z, slice.tick.precedents ?? []) : cat(S.ZONE, raw(` #${id}`), '');
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

export interface Line { label: L; value: string }
export interface CardView {
  id: string; card: string; title: L; interrupting: boolean; expires?: string;
  options: { id: string; label: L }[];
  lines: Line[];
}

function cardLines(s: GameState, slice: Slice, c: CardInstance): Line[] {
  const p = slice.params;
  const pl = (c.payload ?? {}) as Record<string, any>;
  const out: Line[] = [];
  if (pl.offer) {
    const v = previewOffer(s, c, p, slice.tick);
    out.push({ label: S.T.offerJobs, value: num(v.jobs) }, { label: S.T.powerNeed, value: `${num(v.powerKw)} kW` });
    for (const site of v.sites) {
      const lbl = optionLabel(s, slice, c.card, site.option) ?? raw(site.option);
      const f = site.fiscal;
      out.push({ label: lbl, value: [
        `${S.bi(S.T.opensIn)} ${site.opensInMonths}`,
        `${S.bi(S.T.powerFree)} ${num(site.powerFreeKw)} kW`,
        `${S.bi(S.T.bedsNeeded)} ${num(site.bedsNeeded)}`,
        `${S.bi(S.T.perYearOutput)} ${yuan(site.perYear.output)}`,
        ...(f ? [`${S.bi(S.T.cash)} ${yuan(f.cashThisQuarter)}`, `${S.bi(S.T.retained)} ${yuan(f.retainedTaxPerYear)}`,
          `${S.bi(S.T.newObligations)} ${yuan(f.newObligationsPerYear)}`] : []),
      ].join(' · ') });
    }
  }
  if (c.card === LOAN_CARD) {
    out.push({ label: S.T.principal, value: yuan(pl.principal) }, { label: S.T.rate, value: pct(pl.rate_month) },
      { label: S.T.grace, value: String(pl.grace_months) }, { label: S.T.term, value: String(pl.term_months) });
  }
  if (c.card === DEFICIT_CARD) {
    out.push({ label: S.T.shortfall, value: yuan(pl.shortfall) }, { label: S.T.capacity, value: yuan(pl.capacity) });
  }
  if (c.card === REVIEW_CARD && pl.review) {
    const r = pl.review as GameState['reviews']['held'][number];
    out.push({ label: S.T.score, value: `${r.score.toFixed(2)} (${S.bi(r.pass ? S.T.pass : S.T.fail)}${r.vetoed ? `, ${S.bi(S.T.vetoed)}` : ''})` });
    for (const it of r.items) out.push({ label: S.INDICATOR[it.indicator] ?? raw(it.indicator), value: `${num(it.value * (it.indicator === 'order_check' ? 100 : 1))}${it.indicator === 'order_check' ? '%' : ''} → ${it.score.toFixed(2)}` });
  }
  if (c.card === FAILURE_CARD) out.push({ label: S.T.scrutiny, value: num(pl.scrutiny) });
  if (pl.report) {
    const r = pl.report as { bar: number; roads: number; servicedLand: number; waterPower: number; forecastCards: number };
    out.push({ label: S.T.bar, value: pct(r.bar) }, { label: S.T.readyRoads, value: pct(r.roads) },
      { label: S.T.readyLand, value: pct(r.servicedLand) }, { label: S.T.readyWaterPower, value: pct(r.waterPower) },
      { label: S.T.forecast, value: String(r.forecastCards) });
  }
  if (pl.grantFactor !== undefined) {
    out.push({ label: S.T.grantFactor, value: String(pl.grantFactor) }, { label: S.T.recurring, value: yuan(pl.recurring) });
    if (pl.warning) out.push({ label: S.T.warning, value: `${formatYM(pl.warning.from)} → ${pl.warning.factor}` });
  }
  return out;
}

export function cardView(s: GameState, slice: Slice, c: CardInstance): CardView {
  return {
    id: c.id, card: c.card, title: cardTitle(slice, c.card) ?? raw(c.card), interrupting: c.interrupting,
    ...(c.expires !== undefined ? { expires: formatYM(c.expires) } : {}),
    options: c.options.map((o) => ({ id: o, label: optionLabel(s, slice, c.card, o) ?? raw(o) })),
    lines: cardLines(s, slice, c),
  };
}
/** The stack: interrupting cards first, then the rest in the order raised. */
export const cardStack = (s: GameState, slice: Slice) =>
  [...s.pendingCards].sort((a, b) => Number(b.interrupting) - Number(a.interrupting)).map((c) => cardView(s, slice, c));

// ---- the briefing ----

export interface Indicator { label: L; value: number; delta?: number; money?: boolean }
const presentNonlocal = (s: GameState) => sum(s.pops.map((g) => (g.registration === 'nonlocal' ? g.present : 0)));
const indicators = (s: GameState, slice: Slice): Indicator[] => [
  { label: S.T.residents, value: sum(s.pops.map((g) => g.stayedSixMonths)) },   // the resident measure (§5.9), from the state
  { label: S.T.presentNonlocal, value: presentNonlocal(s) },
  { label: S.T.firmJobs, value: sum(s.firms.map((f) => f.posted)) },
  { label: S.T.gdpQuarter, value: Math.round(sum(s.history.gdp.slice(-3))), money: true },
  { label: S.T.moneyForProjects, value: Math.round(moneyForProjects(s, slice.params)), money: true },
  { label: S.T.scrutiny, value: Math.round(s.climate.scrutiny) },
];
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
    name: a.name, access: a.access,
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
    case 'set_permit_regime': return cat(S.T.permits, S.PERMIT[a.regime] ?? raw(a.regime), ': ');
    case 'create_zone': {
      const cells = a.runs.reduce((t, [, x0, x1]) => t + x1 - x0 + 1, 0);
      const tpl = a.template ? named(slice.tick.precedents, a.template) : undefined;
      return cat(cat(S.LAND_USE[a.use] ?? raw(a.use), tpl ?? raw(`#${queuedZoneIds(s, queue).get(k)}`), ' '),
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
    case 'set_project_priority': return cat(S.T.priority, raw(` #${a.project} ${a.priority}`), '');
    default: return raw(a.type);
  }
}

// ---- map overlays (§11): one RGBA pixel per cell ----

export const OVERLAY_LAYERS = ['areas', 'land_use', 'illegal', 'occupancy', 'service_gap', 'buildable'] as const;
export type OverlayLayer = (typeof OVERLAY_LAYERS)[number];
export type RGBA = [number, number, number, number];

/** A 0..1 value to a yellow-to-red ramp, half transparent. */
export function ramp(v: number): RGBA {
  const t = Math.max(0, Math.min(1, v));
  return [Math.round(240 - 40 * t), Math.round(220 - 180 * t), Math.round(120 - 90 * t), 170];
}
export const USE_COLOR: Record<string, RGBA> = {
  industrial: [196, 120, 60, 200], residential: [220, 200, 90, 200], commercial: [200, 80, 120, 200],
  public: [90, 140, 210, 200], reserve: [120, 160, 110, 200],
};
const PLAYABLE: RGBA = [255, 236, 120, 60], CARD_ONLY: RGBA = [200, 150, 80, 60];

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
  else if (layer === 'buildable') {
    paint(slice.tick.buildable?.cells ?? [], [150, 190, 120, 110]);
    paint(cellsOfRuns(s.servicedLand, s.grid), [60, 200, 120, 220]);
  } else for (const a of s.areas) if (a.access === 'playable') paint(a.cells, ramp(areaValue(s, layer, a.id)));
  return px;
}

/** The area (playable or card-only) a cell belongs to, or 0. */
export function areaAt(s: GameState, cell: number): number {
  for (const a of s.areas) {
    let lo = 0, hi = a.cells.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1, v = a.cells[m]!; if (v === cell) return a.id; if (v < cell) lo = m + 1; else hi = m - 1; }
  }
  return 0;
}

/** The slice's bounding box in cells [x0, y0, x1, y1], over every area: the map fits to it. */
export function sliceBox(s: GameState): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of s.areas) for (const c of a.cells) {
    const x = c % s.grid.width, y = Math.floor(c / s.grid.width);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
