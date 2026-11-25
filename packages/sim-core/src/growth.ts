/**
 * Organic growth (buildings-and-construction §13.3, R3): on serviced land a road reaches, small processing firms,
 * private shop builders and work units build without a card; village households add informal shops. Nobody here is
 * paid from the city's ledger. Run inside tick step 4, after the month's cohort work and the village rental starts.
 * Deterministic: no draw.
 */
import { SECTORS, USE_OF } from './enums.js';
import { intensityOf, zonePowerKw, type GrowthParams, type OrganicStream, type SliceParams } from './params.js';
import { largestRemainder } from './round.js';
import type { StartNetwork } from './sites.js';
import type { BlockStock, Cohort, GameState, OrganicBuilder, ServicePosts, Zone } from './state.js';
import type { TickContext } from './step.js';
import { bedsByPool, villageM2 } from './systems/common.js';
import { createFirm, orderFactor, prospectiveShare, sizeOffer } from './systems/industry.js';
import { ACTIVE_UTILITIES, SOURCE_KINDS, spatialViews } from './works.js';
import { cellsOfRuns } from './zones.js';

export interface GrowthContent { network: StartNetwork; buildable?: { cells: Uint32Array } }

const CELL_M2 = 10_000;
type GrowthUse = 'industrial' | 'commercial' | 'residential';
const isGrowthUse = (u: string): u is GrowthUse => u === 'industrial' || u === 'commercial' || u === 'residential';

function inSorted(sorted: Uint32Array, v: number): boolean {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, x = sorted[m]!;
    if (x === v) return true;
    if (x < v) lo = m + 1; else hi = m - 1;
  }
  return false;
}

/** The floor of everything built or building in a zone: its firms' factories and dormitories, and its organic cohorts. */
export function zoneBuiltM2(s: GameState, zone: number): number {
  let m2 = 0;
  for (const f of s.firms) if (f.zone === zone) m2 += f.floorM2 + f.dormM2;
  for (const b of s.blocks) for (const c of b.cohorts) if (c.zone === zone && c.firm === undefined && c.stage !== 'demolished') m2 += c.m2;
  return m2;
}

/** Each zone's developable cells (§13.3): buildable, serviced and within a road's reach. */
export function developableCells(s: GameState, g: GrowthContent): Map<number, number[]> {
  const views = spatialViews(s, g.network);
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  const out = new Map<number, number[]>();
  for (const z of s.zones) {
    out.set(z.id, cellsOfRuns(z.runs, s.grid).filter((c) =>
      served.has(c) && views.frontage.has(c) && (!g.buildable || inSorted(g.buildable.cells, c))));
  }
  return out;
}

/** A utility amount by area: the placed sources' supply to the firms there (phase1-slice §5.11). */
export type AreaSupply = Map<number, { power: number; water: number }>;

/**
 * What placed sources deliver to each area's firms (phase1-slice §5.11). Each zone with firms that `counts` demands
 * their need (and `extra`'s, for a firm not yet sited), spread evenly over its developable cells; supply is
 * allocated on the road components (b&c §13.1) and each zone's share is summed into its area. Without a placed
 * source this is empty, and nothing is computed.
 */
export function placedSupply(s: GameState, g: GrowthContent, counts: (f: GameState['firms'][number]) => boolean,
  extra?: { zone: number; kw: number; m3: number }): AreaSupply {
  const out: AreaSupply = new Map();
  // R8c (§5.5): power is the one active utility; its distributing structures are substations (and R2 power sources)
  if (!s.structures.some((x) => SOURCE_KINDS.power.includes(x.kind))) return out;
  const cells = developableCells(s, g);
  const demand = { power: new Map<number, number>(), water: new Map<number, number>() };
  for (const z of s.zones) {
    const cs = cells.get(z.id) ?? [];
    if (!cs.length) continue;
    let kw = 0, m3 = 0;
    for (const f of s.firms) if (f.zone === z.id && counts(f)) { kw += f.powerKw; m3 += f.waterM3Day; }
    if (extra?.zone === z.id) { kw += extra.kw; m3 += extra.m3; }
    for (const [u, need] of ([['power', kw], ['water', m3]] as const).filter(([u]) => ACTIVE_UTILITIES.includes(u))) {
      const split = largestRemainder(Math.ceil(need), cs.map(() => 1));
      cs.forEach((c, i) => { if (split[i]! > 0) demand[u].set(c, split[i]!); });
    }
  }
  if (!demand.power.size && !demand.water.size) return out;
  const views = spatialViews(s, g.network, { demand });
  for (const z of s.zones) {
    let power = 0, water = 0;
    for (const c of cells.get(z.id) ?? []) { power += views.supply.power.get(c) ?? 0; water += views.supply.water.get(c) ?? 0; }
    if (!power && !water) continue;
    const a = out.get(z.area) ?? { power: 0, water: 0 };
    out.set(z.area, { power: a.power + power, water: a.water + water });
  }
  return out;
}

/** A zone's room for organic floor (§13.3): developable cells × 10,000 m² × far, less what is built or building. */
export function zoneRoomM2(s: GameState, z: Zone, cells: number, G: GrowthParams): number {
  if (!isGrowthUse(z.use) || cells === 0) return 0;
  return Math.max(0, Math.floor(cells * CELL_M2 * G.far[z.use] * intensityOf(G, z).far - zoneBuiltM2(s, z.id)));
}

/**
 * Service jobs the new spending supports, by playable area (§13.3): spending from last month's matching above what
 * the start's base jobs at their starting wages would spend, split over areas by where the spenders live.
 */
export function inducedServiceJobs(s: GameState, p: SliceParams): Map<number, number> {
  const G = p.growth!;
  const spend = new Map<number, number>();
  let total = 0, ref = 0;
  // wages earned outside services only (the basic-sector rule, R4): service posts come from this spending
  for (const g of s.pops) {
    let w = 0;
    for (const sec of SECTORS) if (sec !== 'services') w += g.employed[sec] * s.labour.wage[sec];
    spend.set(g.area, (spend.get(g.area) ?? 0) + w * G.spend_share);
    total += w * G.spend_share;
  }
  for (const j of s.labour.baseJobs) if (j.sector !== 'services') ref += j.jobs * p.labour.wage_start[j.sector] * G.spend_share;
  const jobs = Math.floor(Math.max(0, total - ref) / G.services.spend_per_job_month + 1e-9);
  const areas = s.areas.filter((a) => a.access === 'playable').map((a) => a.id);
  const split = largestRemainder(jobs, areas.map((a) => Math.max(0, spend.get(a) ?? 0)));
  return new Map(areas.map((a, i) => [a, split[i]!]));
}

const sumM2 = (b: BlockStock, f: (c: Cohort) => boolean) => b.cohorts.reduce((n, c) => n + (f(c) ? c.m2 : 0), 0);
const building = (c: Cohort) => c.stage === 'under_construction' || c.stage === 'completed';
const isPrivateShop = (c: Cohort) => c.builder === 'private' && c.archetype === 'shop_market';
const isVillageShop = (c: Cohort) => c.builder === 'village_household' && c.archetype === 'shop_market';

/** The commercial target (§13.3): shop floor the formal share of the induced service jobs wants, over the slice. */
export function commercialTargetM2(induced: ReadonlyMap<number, number>, G: GrowthParams): number {
  let jobs = 0;
  for (const n of induced.values()) jobs += n;
  return Math.floor(jobs * G.services.formal_share * G.services.m2_per_job);
}

/**
 * Occupied private shop floor by zone (§13.3), derived, never stored: completed shop floor is occupied up to the
 * commercial target, zone by zone in id order.
 */
export function shopOccupancy(s: GameState, target: number): Map<number, number> {
  const byZone = new Map<number, number>();
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage === 'completed' && isPrivateShop(c) && c.zone !== undefined) byZone.set(c.zone, (byZone.get(c.zone) ?? 0) + c.m2);
  }
  const out = new Map<number, number>();
  let left = target;
  for (const [zone, m2] of [...byZone].sort((a, b) => a[0] - b[0])) {
    const take = Math.min(m2, Math.max(0, left));
    out.set(zone, take);
    left -= take;
  }
  return out;
}

/**
 * Service posts by area (phase1-slice §5.11), from last month's matching: formal posts on the area's occupied private
 * shop floor, informal posts where the spenders live. Neither exceeds its share of the induced service jobs.
 */
export function servicePosts(s: GameState, p: SliceParams): ServicePosts[] {
  const G = p.growth!;
  const induced = inducedServiceJobs(s, p);
  const occupied = shopOccupancy(s, commercialTargetM2(induced, G));
  const areaOfZone = new Map<number, number>();
  for (const b of s.blocks) for (const c of b.cohorts) if (c.zone !== undefined && isPrivateShop(c)) areaOfZone.set(c.zone, b.area);
  const formalM2 = new Map<number, number>();
  for (const [z, m2] of occupied) { const a = areaOfZone.get(z)!; formalM2.set(a, (formalM2.get(a) ?? 0) + m2); }
  const out: ServicePosts[] = [];
  for (const [area, n] of induced) {
    const formal = Math.floor((formalM2.get(area) ?? 0) / G.services.m2_per_job + 1e-9);
    const informal = Math.floor(n * (1 - G.services.formal_share) + 1e-9);
    if (formal || informal) out.push({ area, formal, informal });
  }
  return out;
}

function startCohort(ctx: TickContext, b: BlockStock, c: Omit<Cohort, 'era' | 'stage'>, builder: OrganicBuilder): void {
  const s = ctx.state;
  b.cohorts.push({ era: b.cohorts[0]?.era ?? 0, stage: 'under_construction', ...c, builder });
  b.events.push({ date: s.date, kind: 'start', use: c.use, m2: c.m2, builder });
  ctx.events.push({ step: 'construction', kind: 'organic_start', detail: { area: b.area, archetype: c.archetype, m2: c.m2, builder,
    ...(c.zone !== undefined ? { zone: c.zone } : {}) } });
}

/** Split m² over zones by their room, one cohort each (largest remainder, ties to the lower id). */
function startInZones(ctx: TickContext, zones: { z: Zone; room: number }[], m2: number, archetype: 'shop_market' | 'dormitory',
  builder: OrganicBuilder, G: GrowthParams): void {
  const s = ctx.state;
  const split = largestRemainder(m2, zones.map((x) => x.room));
  zones.forEach(({ z }, i) => {
    const n = split[i]!;
    const b = s.blocks.find((x) => x.area === z.area);
    if (n <= 0 || !b) return;
    startCohort(ctx, b, { use: USE_OF[archetype], legality: 'permitted', m2: n, archetype, zone: z.id,
      due: s.date + G.build_months, workDone: 0, workTotal: G.build_months }, builder);
  });
}

/**
 * One organic firm stream (b&c §13.3; R10b, §5.13): its banked demand becomes owner-built firms of `I.firm_jobs` in the
 * industrial zone with the most room that its area could supply. `bank` names the stream's carry in `s.growth`.
 */
function organicFirms(ctx: TickContext, p: SliceParams, g: GrowthContent, I: OrganicStream, bank: 'carry' | 'collectiveCarry',
  room: (z: Zone) => number): void {
  const s = ctx.state;
  const factor = I.regime_factor[s.fiscal.regime] ?? I.regime_factor.default!;
  let carry = (s.growth[bank] ?? 0) + I.floor_m2_per_month * p.industry.order_index * orderFactor(s) * factor;
  const offer = sizeOffer(p, I.archetype, I.ownership, I.firm_jobs);
  const need = offer.floorM2 + offer.dormM2;
  // R9 backlog brake (b&c §13.3): a zone's firms' factory and dormitory floor still under construction
  const firmZone = new Map(s.firms.map((f) => [f.id, f.zone]));
  const backlog = new Map<number, number>();
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage !== 'under_construction' || c.firm === undefined) continue;
    const z = firmZone.get(c.firm);
    if (z !== undefined) backlog.set(z, (backlog.get(z) ?? 0) + c.m2);
  }
  while (carry >= offer.floorM2) {
    let best: Zone | undefined, bestRoom = 0;
    for (const z of s.zones) {
      if (z.use !== 'industrial') continue;
      if (I.max_backlog_m2 !== undefined && (backlog.get(z.id) ?? 0) > I.max_backlog_m2) continue;
      const r = room(z);
      // a builder puts up no factory its area could not supply: every firm there open, this one too
      const kw = zonePowerKw(p.growth, z, offer.powerKw);   // R8b (§5.3): the tier's power, as createFirm will set it
      if (r >= need && r > bestRoom && prospectiveShare(s, z.area, kw, offer.waterM3Day,
        placedSupply(s, g, () => true, { zone: z.id, kw, m3: offer.waterM3Day })) >= I.min_utility_share) {
        best = z; bestRoom = r;
      }
    }
    if (!best) { carry = offer.floorM2; break; }
    const f = createFirm(s, p, offer, { premises: 'new_factory', area: best.area, zone: best.id });
    f.origin = 'organic';
    backlog.set(best.id, (backlog.get(best.id) ?? 0) + need);   // its own floor is now under construction
    carry -= offer.floorM2;
    ctx.events.push({ step: 'construction', kind: 'organic_firm', detail: { firm: f.id, zone: best.id, area: best.area } });
  }
  s.growth[bank] = Math.round(carry * 1e6) / 1e6;
}

/** The month's organic pass (§13.3). */
export function growthPass(ctx: TickContext, p: SliceParams, g: GrowthContent): void {
  const s = ctx.state;
  const G = p.growth!;
  const cells = developableCells(s, g);
  const room = (z: Zone) => zoneRoomM2(s, z, cells.get(z.id)?.length ?? 0, G);

  // 1. industrial: banked demand becomes owner-built firms in the zone with the most room; R10b (§5.13): processing
  // firms, then local collectives, each from its own bank, sharing the zones' room and backlog
  organicFirms(ctx, p, g, G.industrial, 'carry', room);
  if (G.collective) organicFirms(ctx, p, g, G.collective, 'collectiveCarry', room);

  // 2. commercial: private shop floor toward the target the induced spending sets
  const induced = inducedServiceJobs(s, p);
  const target = commercialTargetM2(induced, G);
  const shopStock = s.blocks.reduce((n, b) => n + sumM2(b, (c) => building(c) && isPrivateShop(c)), 0);
  const shopZones = s.zones.filter((z) => z.use === 'commercial').map((z) => ({ z, room: room(z) })).filter((x) => x.room > 0);
  const shopRoom = shopZones.reduce((n, x) => n + x.room, 0);
  const shops = Math.floor(Math.min(Math.max(0, target - shopStock) * G.response, shopRoom));
  if (shops > 0) startInZones(ctx, shopZones, shops, 'shop_market', 'private', G);

  // 3. residential: work units answer rental pressure in their own area with dormitories
  for (const m of s.housing) {
    // demand crowding (phase1-slice §5.11): the occupants and last month's turned-away arrivals
    if ((m.occupants.rental + m.turnedAway) / Math.max(1, m.beds.rental) < G.residential.min_crowding) continue;
    const zones = s.zones.filter((z) => z.use === 'residential' && z.area === m.area).map((z) => ({ z, room: room(z) }))
      .filter((x) => x.room > 0);
    if (!zones.length) continue;
    const b = s.blocks.find((x) => x.area === m.area);
    if (!b) continue;
    const unmet = Math.max(0, m.occupants.rental + m.turnedAway - bedsByPool(b, p).rental - pipelineRentalBeds(b, p));
    const m2 = Math.floor(Math.min(unmet * p.housing.m2_per_bed.dormitory * G.response, zones.reduce((n, x) => n + x.room, 0)));
    if (m2 > 0) startInZones(ctx, zones, m2, 'dormitory', 'work_unit', G);
  }

  // 4. village shops: informal floor where the spenders live, under the village cap and the M2 legality rule
  const vb = p.village_build;
  for (const b of s.blocks) {
    const plot = s.villagePlots.find((v) => v.area === b.area);
    const villagers = s.pops.find((x) => x.area === b.area && x.kind === 'villager')?.size ?? 0;
    if (!plot || plot.footprintM2 <= 0 || villagers <= 0) continue;
    const want = (induced.get(b.area) ?? 0) * (1 - G.services.formal_share) * G.village_shops.m2_per_job;
    const stock = sumM2(b, (c) => building(c) && isVillageShop(c));
    const era = b.cohorts[0]?.era ?? 0;
    const maxFloors = Math.min(p.eras[era]!.structural_max_floors, vb.enforcement_max_floors[s.policy.enforcement]);
    const now = villageM2(b, ['completed', 'under_construction']);
    const start = Math.floor(Math.min(Math.max(0, want - stock) * G.response, Math.max(0, plot.footprintM2 * maxFloors - now)));
    if (start <= 0) continue;
    const permitted = Math.min(start, Math.max(0, Math.floor(plot.footprintM2 * vb.legal_floors - now)));
    for (const [m2, legality] of [[permitted, 'permitted'], [start - permitted, 'unpermitted_tolerated']] as const) {
      if (m2 <= 0) continue;
      startCohort(ctx, b, { use: USE_OF.shop_market, legality, m2, archetype: 'shop_market', due: s.date + vb.duration_months,
        workDone: 0, workTotal: vb.duration_months }, 'village_household');
    }
  }
}

/** Rental beds under construction in a block, over every rental archetype (§5.2, §13.3). */
export function pipelineRentalBeds(b: BlockStock, p: SliceParams): number {
  let beds = 0;
  for (const a of ['village_rental', 'dormitory'] as const) {
    beds += Math.floor(sumM2(b, (c) => c.stage === 'under_construction' && c.archetype === a) / p.housing.m2_per_bed[a]);
  }
  return beds;
}
