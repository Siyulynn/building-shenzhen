/**
 * Investors (phase1-slice.md §5.5, §5.7): offers arrive as non-interrupting cards whose options are the sites, and an
 * accepted offer becomes a firm. Tick step 3, after the zone names. M5a adds gated origins, Shekou's capture of lost
 * investors and the deal-maker's shortcut card. The preview is a pure function (fiscal §7.2).
 */
import { OWNERSHIPS, type Ownership } from './enums.js';
import type { SliceParams } from './params.js';
import type { AreasContent, CardInstance, FirmTerms, GameState, LocalizedString, Zone } from './state.js';
import type { TickContext } from './step.js';
import { createFirm, firmTerms, sizeOffer, type FirmOffer } from './systems/industry.js';
import { cellsOfRuns } from './zones.js';
import { landFeeRate, regimeOf, type FiscalContent } from './fiscal.js';

/**
 * One record of content/slice/investors.yaml, compiled. Its numbers are params.investors.archetypes[id].
 * `requires`: an unlock key (§5.7); without it set, the archetype makes no arrival draw.
 */
export interface InvestorArchetype { id: string; name: LocalizedString; ownership: Ownership; existingPremises: boolean; requires?: string }
/** The buildable layer (data/starts/slice_buildable.json): sorted buildable cell indices. Content, never state. */
export interface Buildable { cells: Uint32Array }
export interface InvestorContent { investors?: readonly InvestorArchetype[]; buildable?: Buildable; fiscal?: FiscalContent }

/** The deal-maker's shortcut card (§5.7) and the unlock key from which Shekou competes. */
export const SHORTCUT_CARD = 'leader.shortcut';
export const SHEKOU_COMPETES = 'shekou.competes';

const CELL_M2 = 10_000;                               // a 100 m cell (§3)

/** Validate content/slice/investors.yaml against the params (§5.5). */
export function compileInvestors(raw: unknown, p: SliceParams): InvestorArchetype[] {
  if (!Array.isArray(raw)) throw new Error('investors: expected a list');
  const seen = new Set<string>();
  return raw.map((r: Record<string, any>, i) => {
    if (typeof r?.id !== 'string' || !r.id) throw new Error(`investors[${i}]: id is missing`);
    if (seen.has(r.id)) throw new Error(`investors: duplicate id ${r.id}`);
    seen.add(r.id);
    if (!(OWNERSHIPS as readonly string[]).includes(r.ownership)) throw new Error(`${r.id}: unknown ownership ${r.ownership}`);
    if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${r.id}: name needs zh and en`);
    if (typeof r.existing_premises !== 'boolean') throw new Error(`${r.id}: existing_premises must be true or false`);
    if (r.requires !== undefined && (typeof r.requires !== 'string' || !r.requires)) throw new Error(`${r.id}: requires must be an unlock key`);
    if (!p.investors.archetypes[r.id]) throw new Error(`${r.id}: params.investors.archetypes has no entry for it`);
    return { id: r.id, name: { zh: r.name.zh, en: r.name.en }, ownership: r.ownership as Ownership, existingPremises: r.existing_premises,
      ...(r.requires ? { requires: r.requires as string } : {}) };
  });
}

/** The compiled buildable layer, data/starts/slice_buildable.json (pipeline/m3b_buildable.py). */
export interface BuildableContent {
  format: number; areas_sha256: string; grid: { width: number; height: number };
  areas: { id: number; runs: [number, number, number][] }[];
}

/** Sorted buildable cells from the layer's per-area runs. Fails unless it was compiled from these areas. */
export function compileBuildable(raw: BuildableContent, areas: AreasContent): Buildable {
  if (raw.format !== 1) throw new Error(`buildable: unknown format ${raw.format}`);
  if (raw.areas_sha256 !== areas.areas_sha256) throw new Error('buildable: compiled from other areas; rerun pipeline/m3b_buildable.py');
  if (raw.grid.width !== areas.grid.width || raw.grid.height !== areas.grid.height) throw new Error('buildable: grid size differs');
  const all: number[] = [];
  for (const a of raw.areas) all.push(...cellsOfRuns(a.runs, raw.grid));
  return { cells: Uint32Array.from(new Set(all)).sort() };
}

function has(sorted: Uint32Array, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, m = sorted[mid]!;
    if (m === v) return true;
    if (m < v) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}

/** True when an archetype may arrive now: it needs no key, or its key is unlocked (§5.7). */
export const archetypeAvailable = (s: GameState, a: InvestorArchetype) => !a.requires || s.events.unlocked.includes(a.requires);

// ---- siting and capacity ----

/**
 * A zone's floor capacity: buildable cells × servicedShare × 10,000 m² × max_far (§5.5). Every cell counts without the
 * layer; the serviced share is 1 until M4's site preparation sets it. `raw` ignores the serviced share: the land a
 * shortcut can use (§5.7).
 */
export function zoneCapacityM2(s: GameState, z: Zone, p: SliceParams, buildable?: Buildable, raw = false): number {
  const cells = cellsOfRuns(z.runs, s.grid);
  const n = buildable ? cells.filter((c) => has(buildable.cells, c)).length : cells.length;
  return n * (raw ? 1 : z.servicedShare ?? 1) * CELL_M2 * p.industry.max_far;
}
/** The floor and dormitory area of the firms sited in a zone. */
export const zoneUsedM2 = (s: GameState, zone: number) =>
  s.firms.reduce((a, f) => a + (f.zone === zone ? f.floorM2 + f.dormM2 : 0), 0);

const zoneFits = (s: GameState, z: Zone, o: FirmOffer, p: SliceParams, b?: Buildable, raw = false) =>
  z.use === 'industrial' && zoneUsedM2(s, z.id) + o.floorM2 + o.dormM2 <= zoneCapacityM2(s, z, p, b, raw);
const premisesJobs = (s: GameState, area: number) =>
  s.firms.reduce((t, f) => t + (f.area === area && f.premises === 'existing' ? f.jobs : 0), 0);
const premisesFit = (s: GameState, area: number, o: FirmOffer, p: SliceParams) =>
  s.areas.some((a) => a.id === area && a.access === 'playable')
  && premisesJobs(s, area) + o.jobs <= p.industry.premises_jobs_per_area;

/** An offer's options (§5.5): industrial zones with room, then existing premises if allowed, then decline. */
export function siteOptions(s: GameState, a: InvestorArchetype, o: FirmOffer, p: SliceParams, b?: Buildable): string[] {
  const out = s.zones.filter((z) => zoneFits(s, z, o, p, b)).map((z) => `accept:zone:${z.id}`);
  if (a.existingPremises) {
    const areas = s.areas.filter((x) => x.access === 'playable').map((x) => x.id).sort((x, y) => x - y);
    for (const id of areas) if (premisesFit(s, id, o, p)) out.push(`accept:premises:${id}`);
  }
  out.push('decline');
  return out;
}

/** The shortcut's options (§5.7): decline first, then the industrial zones that fit only if all their land were serviced. */
export function shortcutOptions(s: GameState, o: FirmOffer, p: SliceParams, b?: Buildable): string[] {
  const zones = s.zones.filter((z) => !zoneFits(s, z, o, p, b) && zoneFits(s, z, o, p, b, true));
  return ['decline', ...zones.map((z) => `accept:zone:${z.id}`)];
}

/** An offer's concession (§5.8), carried in its payload by an event's offer. */
const termsOf = (c: CardInstance): FirmTerms | undefined => c.payload?.terms as FirmTerms | undefined;
const offerOf = (c: CardInstance): FirmOffer => {
  const o = c.payload?.offer as FirmOffer | undefined;
  if (!o) throw new Error(`card ${c.id} carries no offer`);
  return o;
};

/** The deal-maker who offers shortcuts (§5.7): the first leader with the trait, if any. */
const dealMaker = (s: GameState) => s.leadership.leaders.find((l) => l.traits.includes('deal_maker'));

/**
 * Raise an investor card of `jobs` jobs (§5.5): used by arrivals and by M5a's events (the guaranteed contract, the
 * first wave). Non-interrupting, with the sites as options and the offer as its payload.
 */
export function raiseOffer(ctx: TickContext, step: string, a: InvestorArchetype, jobs: number, p: SliceParams,
  buildable?: Buildable): CardInstance {
  const s = ctx.state;
  const o = sizeOffer(p, a.id, a.ownership, jobs);
  const inst = ctx.raise({ card: a.id, options: siteOptions(s, a, o, p, buildable), interrupting: false });
  inst.payload = { offer: { ...o } };
  inst.expires = s.date + p.investors.offer_months;
  ctx.events.push({ step, kind: 'offer_raised', detail: { card: inst.id, jobs: o.jobs } });
  return inst;
}

// ---- the investment step ----

/** Offers each month (§5.5, §5.7): lapse, resolve answers, withdraw orphaned shortcuts, refresh, arrivals, shortcuts. */
export function offers(p: SliceParams, content: InvestorContent) {
  const archetypes = content.investors ?? [];
  const byId = new Map(archetypes.map((a) => [a.id, a]));
  return (ctx: TickContext): void => {
    if (!archetypes.length) return;
    const s = ctx.state;
    const ev = (kind: string, detail: Record<string, unknown>) => ctx.events.push({ step: 'investment', kind, detail });
    /** An investor left without a firm: Shekou may take it (§5.7). Deterministic, no draw. */
    const lost = (card: CardInstance) => {
      if (!s.events.unlocked.includes(SHEKOU_COMPETES)) return;
      const K = s.shekou;
      K.carry = Math.round((K.carry + p.shekou.capture_share) * 1e9) / 1e9;
      if (K.carry >= 1) {
        K.carry = Math.round((K.carry - 1) * 1e9) / 1e9;
        K.captured += 1;
        K.jobs += offerOf(card).jobs;
        ev('shekou_captured', { card: card.id, jobs: offerOf(card).jobs });
      }
    };

    // 1. lapse
    s.pendingCards = s.pendingCards.filter((c) => {
      if (!byId.has(c.card) || c.expires === undefined || s.date < c.expires) return true;
      ev('offer_lapsed', { card: c.id });
      lost(c);
      return false;
    });

    // 2. resolve this month's answers, in answer order; the site is checked again
    for (const { card, option } of s.answered) {
      if (card.card === SHORTCUT_CARD) { resolveShortcut(card, option); continue; }
      const a = byId.get(card.card);
      if (!a) continue;
      if (option === 'decline') { ev('offer_declined', { card: card.id }); lost(card); continue; }
      const o = offerOf(card);
      const [, kind, id] = option.split(':');
      const n = Number(id);
      let firm: number | undefined;
      if (kind === 'zone') {
        const z = s.zones.find((x) => x.id === n);
        if (z && zoneFits(s, z, o, p, content.buildable)) {
          firm = createFirm(s, p, o, { premises: 'new_factory', area: z.area, zone: z.id }, undefined, termsOf(card)).id;
        }
      } else if (kind === 'premises' && a.existingPremises && premisesFit(s, n, o, p)) {
        firm = createFirm(s, p, o, { premises: 'existing', area: n }, undefined, termsOf(card)).id;
      }
      if (firm !== undefined) ev('offer_accepted', { card: card.id, firm });
      else { ev('offer_failed', { card: card.id, option }); lost(card); }
    }

    function resolveShortcut(card: CardInstance, option: string): void {
      const leader = s.leadership.leaders.find((l) => l.id === card.payload?.leader);
      const offerId = card.payload?.offerCard as string;
      if (option === 'decline') {
        if (leader) leader.rapport = Math.max(-100, leader.rapport - p.shortcut.rapport_on_decline);
        ev('shortcut_declined', { card: card.id, offer: offerId });
        return;
      }
      // the offer must still be pending: an offer answered in the same call wins (§5.7)
      const k = s.pendingCards.findIndex((c) => c.id === offerId);
      const z = s.zones.find((x) => x.id === Number(option.split(':')[2]));
      const o = offerOf(card);
      if (k < 0 || !leader || !z || !zoneFits(s, z, o, p, content.buildable, true)) {
        ev('offer_failed', { card: card.id, option });
        return;
      }
      const [offerCard] = s.pendingCards.splice(k, 1);
      const firm = createFirm(s, p, o, { premises: 'new_factory', area: z.area, zone: z.id }, leader.id, termsOf(offerCard!)).id;
      leader.disciplineRisk += p.shortcut.discipline_weight;
      s.leadership.entangled.push({ leader: leader.id, ref: `firm.${firm}`, date: s.date });
      ev('offer_accepted', { card: offerId, firm, shortcut: leader.id });
    }

    // 3. withdraw shortcuts whose offer has gone; refresh the options of pending offers and shortcuts
    s.pendingCards = s.pendingCards.filter((c) => {
      if (c.card !== SHORTCUT_CARD || s.pendingCards.some((x) => x.id === c.payload?.offerCard)) return true;
      ev('shortcut_withdrawn', { card: c.id });
      return false;
    });
    for (const c of s.pendingCards) {
      const a = byId.get(c.card);
      if (a) c.options = siteOptions(s, a, offerOf(c), p, content.buildable);
      else if (c.card === SHORTCUT_CARD) c.options = shortcutOptions(s, offerOf(c), p, content.buildable);
    }

    // 4. arrivals, in content order; a locked archetype makes no draw (§5.7)
    for (const a of archetypes) {
      if (!archetypeAvailable(s, a)) continue;
      const ap = p.investors.archetypes[a.id]!;
      if (ctx.rng.float() >= ap.rate_per_quarter / 3) continue;
      const [lo, hi] = ap.jobs;
      raiseOffer(ctx, 'investment', a, lo + ctx.rng.int(hi - lo + 1), p, content.buildable);
    }

    // 5. the deal-maker's shortcut: once per offer with no zone site, when a zone would fit it on unserviced land
    const dm = dealMaker(s);
    if (!dm) return;
    for (const c of [...s.pendingCards]) {
      if (!byId.has(c.card) || c.payload?.shortcutOffered || c.options.some((x) => x.startsWith('accept:zone:'))) continue;
      const options = shortcutOptions(s, offerOf(c), p, content.buildable);
      if (options.length < 2) continue;
      c.payload = { ...c.payload, shortcutOffered: true };
      const inst = ctx.raise({ card: SHORTCUT_CARD, options, interrupting: false });
      inst.payload = { offerCard: c.id, offer: { ...offerOf(c) }, leader: dm.id };
      if (c.expires !== undefined) inst.expires = c.expires;
      ev('shortcut_offered', { card: inst.id, offer: c.id });
    }
  };
}

// ---- the preview ----

export interface OfferPreview {
  archetype: string; ownership: Ownership; jobs: number;
  buildMonths: number; rampMonths: number;
  powerKw: number; waterM3Day: number;
  sites: {
    option: string; area: number; premises: 'new_factory' | 'existing';
    shortcut: boolean;                        // sited by the deal-maker's shortcut, on unserviced land (§5.7)
    opensInMonths: number;                    // after acceptance: build_months − 1 for a new factory, 1 in premises
    floorM2: number; dormM2: number;          // built for it; none in existing premises
    dormBeds: number; bedsNeeded: number;     // beds needed: jobs − dormitory beds
    zoneFreeM2?: number;                      // a zone's free floor capacity before this firm (all its land, for a shortcut)
    premisesJobsFree?: number;                // the area's existing premises, in jobs, before this firm
    powerFreeKw: number; waterFreeM3Day: number;
    taxHolidayMonths: number; landFeeFactor: number;   // its terms (§5.7)
    perYear: { output: number; exports: number; valueAdded: number };   // at full ramp
    fiscal?: {                                // with the fiscal content (M4, §5.6)
      cashThisQuarter: number;                // land-use fees for its first three months, after the fee factor
      retainedTaxPerYear: number;             // at full ramp after the holiday, under the current regime
      newObligationsPerYear: number;          // baselines for the people it brings and the floor it builds
    };
  }[];
}

/**
 * The partial-equilibrium preview of an investor card or a shortcut card (§5.5, §5.7, fiscal §7.2): pure, no state
 * change and no RNG. With the fiscal content it adds cash this quarter, retained tax per year and new obligations
 * per year (§5.6). A scheduled regime change is not computed.
 */
export function previewOffer(s: GameState, card: CardInstance, p: SliceParams, content: InvestorContent = {}): OfferPreview {
  const o = offerOf(card);
  const ap = p.investors.archetypes[o.archetype];
  if (!ap) throw new Error(`params: investors.archetypes has no ${o.archetype}`);
  const isShortcut = card.card === SHORTCUT_CARD;
  const offerCard = isShortcut ? s.pendingCards.find((c) => c.id === card.payload?.offerCard) : card;
  const terms = firmTerms(p, o.archetype, isShortcut ? String(card.payload?.leader) : undefined,
    offerCard ? termsOf(offerCard) : undefined);
  const holiday = terms?.taxHolidayMonths ?? 0, feeFactor = terms?.landFeeFactor ?? 1;
  const own = p.industry.by_ownership[o.ownership];
  const dormBeds = Math.floor(o.dormM2 / p.housing.m2_per_bed.dormitory);
  const free = (area: number) => {
    const a = s.areas.find((x) => x.id === area)!;
    let pw = 0, w = 0;
    for (const f of s.firms) if (f.area === area) { pw += f.powerKw; w += f.waterM3Day; }
    return { powerFreeKw: Math.max(0, a.utilities.powerCap - pw), waterFreeM3Day: Math.max(0, a.utilities.waterCap - w) };
  };
  const year = (factor: number) => {
    const output = o.jobs * own.output_per_job_month * 12 * factor;
    return { output, exports: output * own.export_share, valueAdded: output * own.value_added_ratio };
  };
  const F = p.fiscal;
  const regime = content.fiscal ? regimeOf(s, content.fiscal) : undefined;
  const money = (perYear: { valueAdded: number }, inZone: boolean, builtM2: number) => {
    if (!regime) return {};
    const land = inZone ? (builtM2 / p.industry.max_far) * feeFactor : 0;
    const fees = (m: number) => (landFeeRate(regime, s.date + m) * land) / 12;
    return { fiscal: {
      cashThisQuarter: Math.round(fees(0) + fees(1) + fees(2)),
      retainedTaxPerYear: Math.round(perYear.valueAdded * regime.tax.value_added_rate[o.ownership] * F.collection_efficiency
        * regime.tax.local_share),
      newObligationsPerYear: Math.round(12 * (o.jobs * (F.admin_per_resident_month + F.police_per_present_month)
        + builtM2 * F.sanitation_per_m2_month)),
    } };
  };
  const sites: OfferPreview['sites'] = [];
  for (const option of card.options) {
    const [, kind, id] = option.split(':');
    if (kind === 'zone') {
      const z = s.zones.find((x) => x.id === Number(id));
      if (!z) continue;
      sites.push({ option, area: z.area, premises: 'new_factory', shortcut: isShortcut, opensInMonths: ap.build_months - 1,
        floorM2: o.floorM2, dormM2: o.dormM2, dormBeds, bedsNeeded: Math.max(0, o.jobs - dormBeds),
        zoneFreeM2: zoneCapacityM2(s, z, p, content.buildable, isShortcut) - zoneUsedM2(s, z.id), ...free(z.area),
        taxHolidayMonths: holiday, landFeeFactor: feeFactor, perYear: year(1),
        ...money(year(1), true, o.floorM2 + o.dormM2) });
    } else if (kind === 'premises') {
      const area = Number(id);
      sites.push({ option, area, premises: 'existing', shortcut: false, opensInMonths: 1,
        floorM2: 0, dormM2: 0, dormBeds: 0, bedsNeeded: o.jobs,
        premisesJobsFree: p.industry.premises_jobs_per_area - premisesJobs(s, area), ...free(area),
        taxHolidayMonths: holiday, landFeeFactor: 1,
        perYear: year(p.industry.premises_output_factor), ...money(year(p.industry.premises_output_factor), false, 0) });
    }
  }
  return { archetype: o.archetype, ownership: o.ownership, jobs: o.jobs, buildMonths: ap.build_months, rampMonths: ap.ramp_months,
    powerKw: o.powerKw, waterM3Day: o.waterM3Day, sites };
}
