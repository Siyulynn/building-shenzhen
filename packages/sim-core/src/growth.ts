/**
 * Organic growth (buildings-and-construction §13.3, R3): on serviced land a road reaches, small processing firms,
 * private shop builders and work units build without a card; village households add informal shops. Nobody here is
 * paid from the city's ledger. Run inside tick step 4, after the month's cohort work and the village rental starts.
 * Deterministic: no draw.
 */
import { SECTORS, USE_OF } from './enums.js';
import type { GrowthParams, SliceParams } from './params.js';
import { largestRemainder } from './round.js';
import type { StartNetwork } from './sites.js';
import type { BlockStock, Cohort, GameState, OrganicBuilder, Zone } from './state.js';
import type { TickContext } from './step.js';
import { bedsByPool, villageM2 } from './systems/common.js';
import { createFirm, orderFactor, prospectiveShare, sizeOffer } from './systems/industry.js';
import { spatialViews } from './works.js';
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

/** A zone's room for organic floor (§13.3): developable cells × 10,000 m² × far, less what is built or building. */
export function zoneRoomM2(s: GameState, z: Zone, cells: number, G: GrowthParams): number {
  if (!isGrowthUse(z.use) || cells === 0) return 0;
  return Math.max(0, Math.floor(cells * CELL_M2 * G.far[z.use] - zoneBuiltM2(s, z.id)));
}

/**
 * Service jobs the new spending supports, by playable area (§13.3): spending from last month's matching above what
 * the start's base jobs at their starting wages would spend, split over areas by where the spenders live.
 */
export function inducedServiceJobs(s: GameState, p: SliceParams): Map<number, number> {
  const G = p.growth!;
  const spend = new Map<number, number>();
  let total = 0, ref = 0;
  for (const g of s.pops) {
    let w = 0;
    for (const sec of SECTORS) w += g.employed[sec] * s.labour.wage[sec];
    spend.set(g.area, (spend.get(g.area) ?? 0) + w * G.spend_share);
    total += w * G.spend_share;
  }
  for (const j of s.labour.baseJobs) ref += j.jobs * p.labour.wage_start[j.sector] * G.spend_share;
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

/** The month's organic pass (§13.3). */
export function growthPass(ctx: TickContext, p: SliceParams, g: GrowthContent): void {
  const s = ctx.state;
  const G = p.growth!;
  const cells = developableCells(s, g);
  const room = (z: Zone) => zoneRoomM2(s, z, cells.get(z.id)?.length ?? 0, G);

  // 1. industrial: banked demand becomes owner-built firms in the zone with the most room
  const I = G.industrial;
  const factor = I.regime_factor[s.fiscal.regime] ?? I.regime_factor.default!;
  s.growth.carry += I.floor_m2_per_month * p.industry.order_index * orderFactor(s) * factor;
  const offer = sizeOffer(p, I.archetype, I.ownership, I.firm_jobs);
  const need = offer.floorM2 + offer.dormM2;
  while (s.growth.carry >= offer.floorM2) {
    let best: Zone | undefined, bestRoom = 0;
    for (const z of s.zones) {
      if (z.use !== 'industrial') continue;
      const r = room(z);
      // a builder puts up no factory its area could not supply: every firm there open, this one too
      if (r >= need && r > bestRoom && prospectiveShare(s, z.area, offer.powerKw, offer.waterM3Day) >= I.min_utility_share) {
        best = z; bestRoom = r;
      }
    }
    if (!best) { s.growth.carry = offer.floorM2; break; }
    const f = createFirm(s, p, offer, { premises: 'new_factory', area: best.area, zone: best.id });
    f.origin = 'organic';
    s.growth.carry -= offer.floorM2;
    ctx.events.push({ step: 'construction', kind: 'organic_firm', detail: { firm: f.id, zone: best.id, area: best.area } });
  }
  s.growth.carry = Math.round(s.growth.carry * 1e6) / 1e6;

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
    if (m.crowding < G.residential.min_crowding) continue;
    const zones = s.zones.filter((z) => z.use === 'residential' && z.area === m.area).map((z) => ({ z, room: room(z) }))
      .filter((x) => x.room > 0);
    if (!zones.length) continue;
    const b = s.blocks.find((x) => x.area === m.area);
    if (!b) continue;
    const unmet = Math.max(0, m.occupants.rental - bedsByPool(b, p).rental - pipelineRentalBeds(b, p));
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
