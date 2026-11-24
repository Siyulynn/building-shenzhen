/** params/slice.yaml, parsed (phase1-slice.md §5.2, §8). Validated once; never stored in GameState. */
import type { Enforcement, HousingArchetype, MigrantKind, Ownership, PermitRegime, PopKind, Sector } from './enums.js';
import { ENFORCEMENT_LEVELS, HOUSING_ARCHETYPES, MIGRANT_KINDS, OWNERSHIPS, PERMIT_REGIMES, POP_KINDS, SECTORS } from './enums.js';

export interface SliceParams {
  eras: { id: string; structural_max_floors: number }[];
  labour: {
    participation: Record<PopKind, number>;
    fill_order: Record<Sector, PopKind[]>;
    wage_start: Record<Sector, number>;
    wage_floor: Record<Sector, number>;
    wage_speed: number;
    construction_jobs_per_m2: number;
    turnover_month: number;          // R4 (§5.11): share of each job row's migrant holders who quit to idle each month
    jobs_per_crew_unit: number;      // R4 (§5.11): construction jobs per crew unit a project or works order uses
  };
  migration: {
    inland_wage: number;
    base: Record<MigrantKind, number>;
    sector: Record<MigrantKind, Sector>;
    pull_sectors: Record<MigrantKind, Sector[]>;   // R4 (§5.11)
    K_vac: number; network_alpha: number; K_net: number; network_lag_months: number;
    permit_factor: Record<PermitRegime, number>;
    base_exit: number; unemployment_push: number; housing_push: number;
    spring: { away_months: number[]; away_share: number; nonreturn: number; nonreturn_unemployment: number };
  };
  housing: {
    m2_per_bed: Record<HousingArchetype, number>;
    base_rent: number; rent_elasticity: number; crowding_floor: number; rent_speed: number; crowding_max: number;
  };
  village_build: {
    build_cost_per_m2: number; horizon_months: number; hurdle: number;
    p_enforce: Record<Enforcement, number>;
    response: number; max_start_m2_per_villager_month: number; duration_months: number;
    legal_floors: number; enforcement_max_floors: Record<Enforcement, number>;
  };
  zoning: {
    names: { min_overlap: number; max_offset_cells: number; max_scale_ratio: number;
      weights: { overlap: number; offset: number; scale: number } };
  };
  industry: {
    max_far: number; premises_jobs_per_area: number; premises_output_factor: number; order_index: number;
    by_ownership: Record<Ownership, {
      output_per_job_month: number; value_added_ratio: number; export_share: number;
      floor_m2_per_job: number; power_kw_per_job: number; water_m3_day_per_job: number;
    }>;
  };
  investors: {
    offer_months: number;
    archetypes: Record<string, {
      rate_per_quarter: number; jobs: [number, number]; dorm_beds_per_job: number; build_months: number; ramp_months: number;
      tax_holiday_months?: number;     // M5a (§5.7): no value-added tax in a firm's first months open
    }>;
  };
  // M5a (§5.7)
  events: Record<string, { jobs?: number; cost?: number; scrutiny?: number; standing?: number; area?: number; factor?: number;
    months?: number; tax_holiday_months?: number; land_fee_factor?: number }>;
  readiness: {
    areas: number[];
    weights: { roads: number; serviced_land: number; water_power: number };
    road_reach_cells: number;
    full_at: { roads: number; serviced_land: number };
    standard_wave: { ownership: Ownership; jobs: number };
    first_wave: { min_cards: number; max_cards: number };
  };
  sez: { priorities: Record<string, Record<string, number>> };
  shekou: { capture_share: number };
  shortcut: { discipline_weight: number; rapport_on_decline: number; land_fee_factor: number; extra_tax_holiday_months: number };
  // M5b (§5.8)
  climate: {
    reform_wind: number; scrutiny_decay: number; failure_threshold: number; failure_quarters: number;
    permit_factor: Record<PermitRegime, number>;
    gain: { loose_permit: number; illegal_share: number; grey_land_per_100k: number; shortcut: number };
  };
  sweep: { cash_cost: number; mood_penalty: number; campaign_months: number; visible_cut: number; base_p: number };
  review: { pass_mark: number; standing_pass: number; standing_fail: number; scrutiny_relief: number; scrutiny_fail: number };
  fall: { base: number; k: number; threshold: number; freeze_months: number; scrutiny: number };
  // M4 (§5.6)
  fiscal: {
    start_regime: string;
    start_balances: { general: number; land: number; debt: number; forex_usd: number };
    provincial_base_grant_per_year: number;
    county_base_revenue_per_month: number;
    county_base_obligations_per_month: number;
    admin_per_resident_month: number; police_per_present_month: number; sanitation_per_m2_month: number;
    collection_efficiency: number;
    reserve_months: number;
    forex: { retention_share: number; yuan_per_usd: number };
    short_loan: { revenue_multiple: number; rate_month: number; term_months: number };
    austerity_max_cut: number;
    loan: { principal: number; rate_month: number; grace_months: number; term_months: number; offer_months: number };
    cancel_penalty: number;
  };
  capacity: { local_crew: number; crew_per_m2: number };
  construction: { cost_per_m2: { standard_factory: number; dormitory: number; state_flats: number; shop_market: number } };
  projects: Record<string, ProjectParams>;
  teams: Record<string, { crew: number; mobilization_months: number; duration_months: number; cost_per_month: number }>;
  gdp: { base_va_per_job_month: Record<Sector, number>; construction_va_ratio: number };
  works?: WorksParams;                   // R2 (buildings-and-construction §13.2): absent = no works actions
  growth?: GrowthParams;                 // R3 (buildings-and-construction §13.3): absent = no organic growth
}

/** R3 organic growth (b&c §13.3). Placeholders, not sourced. */
export interface GrowthParams {
  pool_priority: 'high' | 'normal' | 'low';
  response: number;                      // share of a floor gap started in a month
  build_months: number;                  // shop and dormitory cohorts
  spend_share: number;                   // share of wages spent locally
  far: { industrial: number; commercial: number; residential: number };
  industrial: {
    archetype: string; ownership: Ownership; firm_jobs: number;
    firm: { dorm_beds_per_job: number; build_months: number; ramp_months: number };   // the archetype's numbers
    floor_m2_per_month: number;
    min_utility_share: number;           // the area's utility share, with this firm and all sited ones open
    regime_factor: Record<string, number>;   // by fiscal regime id; `default` for the rest
  };
  services: { spend_per_job_month: number; formal_share: number; m2_per_job: number; tax_rate: number };
  residential: { min_crowding: number };
  village_shops: { m2_per_job: number };
}

function validateGrowthParams(g: GrowthParams, p: SliceParams): void {
  const pos = (n: unknown) => typeof n === 'number' && n > 0;
  const share = (n: unknown) => typeof n === 'number' && n >= 0 && n <= 1;
  if (!['high', 'normal', 'low'].includes(g.pool_priority)) throw new Error('params: growth.pool_priority must be high, normal or low');
  if (!share(g.response) || !share(g.spend_share)) throw new Error('params: growth.response and growth.spend_share must be in [0, 1]');
  if (!Number.isInteger(g.build_months) || g.build_months < 1) throw new Error('params: growth.build_months must be a positive integer');
  need(g.far as unknown as Record<string, unknown>, ['industrial', 'commercial', 'residential'], 'growth.far');
  for (const k of ['industrial', 'commercial', 'residential'] as const) if (!pos(g.far[k])) throw new Error(`params: growth.far.${k} must be > 0`);
  const I = g.industrial;
  if (typeof I.archetype !== 'string' || !I.archetype || p.investors.archetypes[I.archetype]) {
    throw new Error('params: growth.industrial.archetype must be an id of its own, not an investor card archetype');
  }
  if (!(I.firm?.dorm_beds_per_job >= 0) || !Number.isInteger(I.firm.build_months) || I.firm.build_months < 1
    || !Number.isInteger(I.firm.ramp_months) || I.firm.ramp_months < 1) {
    throw new Error('params: growth.industrial.firm needs dorm_beds_per_job >= 0 and whole build_months and ramp_months >= 1');
  }
  if (!(OWNERSHIPS as readonly string[]).includes(I.ownership)) throw new Error(`params: growth.industrial.ownership ${I.ownership} is unknown`);
  if (!Number.isInteger(I.firm_jobs) || I.firm_jobs < 1) throw new Error('params: growth.industrial.firm_jobs must be a positive integer');
  if (!(I.floor_m2_per_month >= 0)) throw new Error('params: growth.industrial.floor_m2_per_month must be >= 0');
  if (!share(I.min_utility_share)) throw new Error('params: growth.industrial.min_utility_share must be in [0, 1]');
  if (!(I.regime_factor?.default !== undefined)) throw new Error('params: growth.industrial.regime_factor needs a default');
  for (const [k, v] of Object.entries(I.regime_factor)) if (!(v >= 0)) throw new Error(`params: growth.industrial.regime_factor.${k} must be >= 0`);
  if (!pos(g.services?.spend_per_job_month) || !share(g.services.formal_share) || !pos(g.services.m2_per_job)
    || !share(g.services.tax_rate)) {
    throw new Error('params: growth.services needs spend_per_job_month > 0, formal_share and tax_rate in [0, 1] and m2_per_job > 0');
  }
  if (!(g.residential?.min_crowding >= 0)) throw new Error('params: growth.residential.min_crowding must be >= 0');
  if (!pos(g.village_shops?.m2_per_job)) throw new Error('params: growth.village_shops.m2_per_job must be > 0');
}

/** A structure's or facility's works numbers (§13.2). */
export interface StructureWorksParams { units: number; yuan: number; capacity: number; forex_usd?: number }
export interface CellWorksParams { units_per_cell: number; yuan_per_cell: number }
export interface WorksParams {
  crew_per_order: number;
  maint_rate_year: number;           // R4 (phase1-slice §5.11): a done order's yearly maintenance, on its spending
  service: CellWorksParams; road: CellWorksParams; bridge: CellWorksParams;
  structures: { water_source: StructureWorksParams; power_source: StructureWorksParams };
  facilities: Record<string, StructureWorksParams>;
}

function validateWorksParams(w: WorksParams): void {
  const whole = (n: unknown, min: number) => Number.isSafeInteger(n) && (n as number) >= min;
  if (!whole(w.crew_per_order, 1)) throw new Error('params: works.crew_per_order must be a whole number >= 1');
  if (!(w.maint_rate_year >= 0 && w.maint_rate_year <= 1)) throw new Error('params: works.maint_rate_year must be in [0, 1]');
  for (const k of ['service', 'road', 'bridge'] as const) {
    if (!whole(w[k]?.units_per_cell, 1) || !whole(w[k]?.yuan_per_cell, 0)) {
      throw new Error(`params: works.${k} needs whole units_per_cell >= 1 and yuan_per_cell >= 0`);
    }
  }
  // one road order mixes road and bridge cells: the same yuan per unit keeps its pro-rata cost exact after a cancel
  if (w.road.yuan_per_cell * w.bridge.units_per_cell !== w.bridge.yuan_per_cell * w.road.units_per_cell) {
    throw new Error('params: works.road and works.bridge must cost the same per unit');
  }
  const kinds: [string, StructureWorksParams | undefined][] = [['structures.water_source', w.structures?.water_source],
    ['structures.power_source', w.structures?.power_source], ...Object.entries(w.facilities ?? {}).map(([k, v]) => [`facilities.${k}`, v] as [string, StructureWorksParams])];
  for (const [k, v] of kinds) {
    if (!v || !whole(v.units, 1) || !whole(v.yuan, 0) || !whole(v.capacity, 0) || (v.forex_usd !== undefined && !whole(v.forex_usd, 0))) {
      throw new Error(`params: works.${k} needs whole units >= 1, yuan, capacity and any forex_usd >= 0`);
    }
  }
}

/** A project template's numbers (§5.6). Site preparation has budget_per_cell and crew_per_cell instead of budget and crew. */
export interface ProjectParams {
  budget?: number; budget_per_cell?: number;
  crew?: number; crew_per_cell?: number;
  work_months: number; maint_rate_year: number; forex_usd?: number;
  road_km?: number; water_m3_day?: number; power_kw?: number;
  school_places?: number; staff?: number; service_per_place_month?: number;
}

function walk(v: unknown, path: string): void {
  if (v === null || v === undefined) throw new Error(`params: ${path} is not set`);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`params: ${path} is not a finite number`);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
  else if (typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${path}.${k}`);
}

function need(obj: Record<string, unknown>, keys: readonly string[], path: string): void {
  for (const k of keys) if (!(k in obj)) throw new Error(`params: ${path}.${k} is missing`);
}

/** Throws on a null, a non-finite number or a missing enum key. Returns the params typed. */
export function validateParams(raw: unknown): SliceParams {
  walk(raw, 'params');
  const p = raw as SliceParams;
  if (!p.eras?.length) throw new Error('params: eras is empty');
  need(p.labour.participation, POP_KINDS, 'labour.participation');
  need(p.labour.fill_order, SECTORS, 'labour.fill_order');
  need(p.labour.wage_start, SECTORS, 'labour.wage_start');
  need(p.labour.wage_floor, SECTORS, 'labour.wage_floor');
  for (const s of SECTORS) for (const k of p.labour.fill_order[s]) {
    if (!(POP_KINDS as readonly string[]).includes(k)) throw new Error(`params: labour.fill_order.${s} names ${k}`);
  }
  if (!(p.labour.turnover_month >= 0 && p.labour.turnover_month <= 1)) throw new Error('params: labour.turnover_month must be in [0, 1]');
  if (!(p.labour.jobs_per_crew_unit >= 0)) throw new Error('params: labour.jobs_per_crew_unit must be >= 0');
  need(p.migration.base, MIGRANT_KINDS, 'migration.base');
  need(p.migration.sector, MIGRANT_KINDS, 'migration.sector');
  need(p.migration.pull_sectors, MIGRANT_KINDS, 'migration.pull_sectors');
  for (const k of MIGRANT_KINDS) for (const sec of p.migration.pull_sectors[k]) {
    if (!(SECTORS as readonly string[]).includes(sec)) throw new Error(`params: migration.pull_sectors.${k} names ${sec}`);
    if (!p.labour.fill_order[sec].includes(k)) throw new Error(`params: migration.pull_sectors.${k}: ${k} may not fill ${sec}`);
  }
  need(p.migration.permit_factor, PERMIT_REGIMES, 'migration.permit_factor');
  need(p.housing.m2_per_bed, HOUSING_ARCHETYPES, 'housing.m2_per_bed');
  for (const a of HOUSING_ARCHETYPES) if (p.housing.m2_per_bed[a] <= 0) throw new Error(`params: housing.m2_per_bed.${a} must be > 0`);
  need(p.village_build.p_enforce, ENFORCEMENT_LEVELS, 'village_build.p_enforce');
  need(p.village_build.enforcement_max_floors, ENFORCEMENT_LEVELS, 'village_build.enforcement_max_floors');
  if (!Number.isInteger(p.migration.network_lag_months) || p.migration.network_lag_months < 1) {
    throw new Error('params: migration.network_lag_months must be a positive integer');
  }
  if (!(p.housing.crowding_max >= 1)) throw new Error('params: housing.crowding_max must be >= 1');
  if (!Number.isInteger(p.village_build.duration_months) || p.village_build.duration_months < 1) {
    throw new Error('params: village_build.duration_months must be a positive integer');
  }
  const zn = p.zoning?.names;
  if (!zn) throw new Error('params: zoning.names is not set');
  if (!(zn.min_overlap > 0 && zn.min_overlap <= 1)) throw new Error('params: zoning.names.min_overlap must be in (0, 1]');
  if (!(zn.max_offset_cells > 0)) throw new Error('params: zoning.names.max_offset_cells must be > 0');
  if (!(zn.max_scale_ratio > 1)) throw new Error('params: zoning.names.max_scale_ratio must be > 1');
  for (const k of ['overlap', 'offset', 'scale'] as const) {
    if (!(zn.weights?.[k] >= 0)) throw new Error(`params: zoning.names.weights.${k} must be >= 0`);
  }
  const I = p.industry, V = p.investors;
  if (!I || !V) throw new Error('params: industry and investors must be set');
  need(I.by_ownership, OWNERSHIPS, 'industry.by_ownership');
  if (!(I.max_far > 0)) throw new Error('params: industry.max_far must be > 0');
  if (!(I.premises_output_factor > 0 && I.premises_output_factor <= 1)) throw new Error('params: industry.premises_output_factor must be in (0, 1]');
  if (!(Number.isInteger(I.premises_jobs_per_area) && I.premises_jobs_per_area >= 0)) {
    throw new Error('params: industry.premises_jobs_per_area must be a whole number >= 0');
  }
  if (!(I.order_index >= 0)) throw new Error('params: industry.order_index must be >= 0');
  for (const o of OWNERSHIPS) {
    const b = I.by_ownership[o];
    if (!(b.value_added_ratio >= 0 && b.value_added_ratio <= 1)) throw new Error(`params: industry.by_ownership.${o}.value_added_ratio must be in [0, 1]`);
    if (!(b.export_share >= 0 && b.export_share <= 1)) throw new Error(`params: industry.by_ownership.${o}.export_share must be in [0, 1]`);
    if (!(b.floor_m2_per_job > 0)) throw new Error(`params: industry.by_ownership.${o}.floor_m2_per_job must be > 0`);
    for (const k of ['output_per_job_month', 'power_kw_per_job', 'water_m3_day_per_job'] as const) {
      if (!(b[k] >= 0)) throw new Error(`params: industry.by_ownership.${o}.${k} must be >= 0`);
    }
  }
  if (!Number.isInteger(V.offer_months) || V.offer_months <= 3) {
    throw new Error('params: investors.offer_months must be an integer above 3: an offer outlives a quarter (§5.5)');
  }
  for (const [id, a] of Object.entries(V.archetypes)) {
    const [lo, hi] = a.jobs;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi < lo) throw new Error(`params: investors.archetypes.${id}.jobs must be [min, max] integers`);
    for (const k of ['build_months', 'ramp_months'] as const) {
      if (!Number.isInteger(a[k]) || a[k] < 1) throw new Error(`params: investors.archetypes.${id}.${k} must be a positive integer`);
    }
    if (!(a.dorm_beds_per_job >= 0)) throw new Error(`params: investors.archetypes.${id}.dorm_beds_per_job must be >= 0`);
    if (!(a.rate_per_quarter >= 0 && a.rate_per_quarter <= 3)) throw new Error(`params: investors.archetypes.${id}.rate_per_quarter must be in [0, 3]`);
    if (a.tax_holiday_months !== undefined && !(Number.isInteger(a.tax_holiday_months) && a.tax_holiday_months >= 0)) {
      throw new Error(`params: investors.archetypes.${id}.tax_holiday_months must be a whole number >= 0`);
    }
  }
  for (const m of p.migration.spring.away_months) if (!Number.isInteger(m) || m < 0 || m > 11) throw new Error('params: spring.away_months are 0..11');
  validateFiscalParams(p);
  if (p.works !== undefined) validateWorksParams(p.works);
  if (p.growth !== undefined) validateGrowthParams(p.growth, p);
  validateM5aParams(p);
  validateM5bParams(p);
  return p;
}

function validateM5bParams(p: SliceParams): void {
  const C = p.climate, S = p.sweep, R = p.review, F = p.fall;
  if (!C || !S || !R || !F) throw new Error('params: climate, sweep, review and fall must be set (§5.8)');
  need(C.permit_factor, PERMIT_REGIMES, 'climate.permit_factor');
  if (!(C.scrutiny_decay >= 0 && C.scrutiny_decay <= 1)) throw new Error('params: climate.scrutiny_decay must be in [0, 1]');
  if (!(C.failure_threshold > 0 && C.failure_threshold <= 100)) throw new Error('params: climate.failure_threshold must be in (0, 100]');
  if (!posIntM5(C.failure_quarters)) throw new Error('params: climate.failure_quarters must be a positive integer');
  need(C.gain, ['loose_permit', 'illegal_share', 'grey_land_per_100k', 'shortcut'], 'climate.gain');
  for (const [k, v] of Object.entries(C.gain)) if (!(v >= 0)) throw new Error(`params: climate.gain.${k} must be >= 0`);
  for (const r of PERMIT_REGIMES) if (!(C.permit_factor[r] >= 0)) throw new Error(`params: climate.permit_factor.${r} must be >= 0`);
  if (!(C.reform_wind >= -1 && C.reform_wind <= 1)) throw new Error('params: climate.reform_wind must be in [-1, 1]');
  if (!posIntM5(S.campaign_months)) throw new Error('params: sweep.campaign_months must be a positive integer');
  if (!(S.visible_cut >= 0 && S.visible_cut <= 1) || !(S.cash_cost >= 0) || !(S.mood_penalty >= 0) || !(S.base_p >= 0)) {
    throw new Error('params: sweep has a bad cost, penalty, cut or base_p');
  }
  if (!(R.pass_mark > 0 && R.pass_mark <= 1)) throw new Error('params: review.pass_mark must be in (0, 1]');
  for (const k of ['standing_pass', 'standing_fail', 'scrutiny_relief', 'scrutiny_fail'] as const) {
    if (!(R[k] >= 0)) throw new Error(`params: review.${k} must be >= 0`);
  }
  if (!(F.scrutiny >= 0) || !(F.threshold >= 0)) throw new Error('params: fall.scrutiny and fall.threshold must be >= 0');
  if (!(F.base >= 0 && F.base <= 1) || !(F.k > 0) || !posIntM5(F.freeze_months)) throw new Error('params: fall needs base in [0, 1], k > 0, whole freeze_months');
}
const posIntM5 = (n: unknown) => Number.isInteger(n) && (n as number) >= 1;

function validateM5aParams(p: SliceParams): void {
  const R = p.readiness, Z = p.sez, K = p.shekou, S = p.shortcut;
  if (!p.events || !R || !Z || !K || !S) throw new Error('params: events, readiness, sez, shekou and shortcut must be set (§5.7)');
  for (const [id, e] of Object.entries(p.events)) {
    if (e.jobs !== undefined && !(Number.isInteger(e.jobs) && e.jobs >= 1)) throw new Error(`params: events.${id}.jobs must be a positive integer`);
    const bad = (k: string) => { throw new Error(`params: events.${id}.${k} is out of range`); };
    if (e.cost !== undefined && !(e.cost >= 0)) bad('cost');
    if (e.factor !== undefined && !(e.factor >= 0)) bad('factor');
    if (e.months !== undefined && !posIntM5(e.months)) bad('months');
    if (e.tax_holiday_months !== undefined && !(Number.isInteger(e.tax_holiday_months) && e.tax_holiday_months >= 0)) bad('tax_holiday_months');
    if (e.land_fee_factor !== undefined && !(e.land_fee_factor >= 0 && e.land_fee_factor <= 1)) bad('land_fee_factor');
    for (const k of ['scrutiny', 'standing'] as const) if (e[k] !== undefined && !Number.isFinite(e[k])) bad(k);
  }
  if (!R.areas?.length || R.areas.some((a) => !Number.isInteger(a))) throw new Error('params: readiness.areas must list area ids');
  for (const k of ['roads', 'serviced_land', 'water_power'] as const) {
    if (!(R.weights[k] >= 0)) throw new Error(`params: readiness.weights.${k} must be >= 0`);
  }
  if (!(R.weights.roads + R.weights.serviced_land + R.weights.water_power > 0)) throw new Error('params: readiness.weights must not all be 0');
  if (!(Number.isInteger(R.road_reach_cells) && R.road_reach_cells >= 0)) throw new Error('params: readiness.road_reach_cells must be a whole number');
  for (const k of ['roads', 'serviced_land'] as const) {
    if (!(R.full_at[k] > 0 && R.full_at[k] <= 1)) throw new Error(`params: readiness.full_at.${k} must be in (0, 1]`);
  }
  if (!(OWNERSHIPS as readonly string[]).includes(R.standard_wave.ownership)) throw new Error('params: readiness.standard_wave.ownership is unknown');
  if (!(R.standard_wave.jobs > 0)) throw new Error('params: readiness.standard_wave.jobs must be > 0');
  const W = R.first_wave;
  if (!Number.isInteger(W.min_cards) || !Number.isInteger(W.max_cards) || W.min_cards < 0 || W.max_cards < W.min_cards) {
    throw new Error('params: readiness.first_wave needs whole min_cards <= max_cards');
  }
  for (const [pr, mix] of Object.entries(Z.priorities)) {
    for (const [a, w] of Object.entries(mix)) {
      if (!(w >= 0)) throw new Error(`params: sez.priorities.${pr}.${a} must be >= 0`);
    }
  }
  if (!(K.capture_share >= 0 && K.capture_share <= 1)) throw new Error('params: shekou.capture_share must be in [0, 1]');
  if (!(S.discipline_weight >= 0) || !(S.rapport_on_decline >= 0)) throw new Error('params: shortcut weights must be >= 0');
  if (!(S.land_fee_factor >= 0 && S.land_fee_factor <= 1)) throw new Error('params: shortcut.land_fee_factor must be in [0, 1]');
  if (!(Number.isInteger(S.extra_tax_holiday_months) && S.extra_tax_holiday_months >= 0)) {
    throw new Error('params: shortcut.extra_tax_holiday_months must be a whole number >= 0');
  }
}

const posInt = (n: unknown) => Number.isInteger(n) && (n as number) >= 1;

function validateFiscalParams(p: SliceParams): void {
  const F = p.fiscal, C = p.capacity;
  if (!F || !C || !p.construction || !p.projects || !p.teams || !p.gdp) {
    throw new Error('params: fiscal, capacity, construction, projects, teams and gdp must be set (§5.6)');
  }
  need(F.start_balances, ['general', 'land', 'debt', 'forex_usd'], 'fiscal.start_balances');
  for (const [k, v] of Object.entries(F.start_balances)) {
    if (!(Number.isInteger(v) && v >= 0)) throw new Error(`params: fiscal.start_balances.${k} must be a whole number >= 0`);
  }
  for (const k of ['provincial_base_grant_per_year', 'county_base_revenue_per_month', 'county_base_obligations_per_month',
    'admin_per_resident_month', 'police_per_present_month', 'sanitation_per_m2_month', 'reserve_months'] as const) {
    if (!(F[k] >= 0)) throw new Error(`params: fiscal.${k} must be >= 0`);
  }
  for (const k of ['collection_efficiency', 'austerity_max_cut', 'cancel_penalty'] as const) {
    if (!(F[k] >= 0 && F[k] <= 1)) throw new Error(`params: fiscal.${k} must be in [0, 1]`);
  }
  if (!(F.forex.yuan_per_usd > 0) || !(F.forex.retention_share >= 0)) throw new Error('params: fiscal.forex needs yuan_per_usd > 0 and retention_share >= 0');
  if (!posInt(F.short_loan.term_months) || !(F.short_loan.rate_month >= 0) || !(F.short_loan.revenue_multiple >= 0)) {
    throw new Error('params: fiscal.short_loan needs term_months >= 1, rate_month >= 0 and revenue_multiple >= 0');
  }
  const L = F.loan;
  if (!(Number.isInteger(L.principal) && L.principal > 0) || !(L.rate_month >= 0) || !Number.isInteger(L.grace_months) || L.grace_months < 0
    || !posInt(L.term_months)) throw new Error('params: fiscal.loan has a bad term');
  if (!Number.isInteger(L.offer_months) || L.offer_months <= 3) {
    throw new Error('params: fiscal.loan.offer_months must be an integer above 3: the offer outlives a quarter (§5.6)');
  }
  if (!(Number.isInteger(C.local_crew) && C.local_crew >= 0)) throw new Error('params: capacity.local_crew must be a whole number');
  if (!(C.crew_per_m2 > 0)) throw new Error('params: capacity.crew_per_m2 must be > 0');
  for (const [id, t] of Object.entries(p.projects)) {
    const perCell = t.budget_per_cell !== undefined;
    if (perCell ? !(t.budget_per_cell! >= 0 && t.crew_per_cell! > 0) : !(t.budget! >= 0 && posInt(t.crew))) {
      throw new Error(`params: projects.${id} needs budget and a whole crew, or budget_per_cell and crew_per_cell`);
    }
    if (!posInt(t.work_months)) throw new Error(`params: projects.${id}.work_months must be a positive integer`);
    if (!(t.maint_rate_year >= 0)) throw new Error(`params: projects.${id}.maint_rate_year must be >= 0`);
    for (const k of ['forex_usd', 'road_km', 'water_m3_day', 'power_kw', 'school_places', 'staff', 'service_per_place_month'] as const) {
      const v = t[k];
      if (v !== undefined && !(v >= 0)) throw new Error(`params: projects.${id}.${k} must be >= 0`);
    }
  }
  for (const [id, t] of Object.entries(p.teams)) {
    if (!posInt(t.crew) || !Number.isInteger(t.mobilization_months) || t.mobilization_months < 0 || !posInt(t.duration_months)
      || !(t.cost_per_month >= 0)) throw new Error(`params: teams.${id} has a bad crew, mobilization, duration or cost`);
  }
  need(p.construction.cost_per_m2, ['standard_factory', 'dormitory', 'state_flats', 'shop_market'], 'construction.cost_per_m2');
  for (const [k, v] of Object.entries(p.construction.cost_per_m2)) {
    if (!(v >= 0)) throw new Error(`params: construction.cost_per_m2.${k} must be >= 0`);
  }
  need(p.gdp.base_va_per_job_month, SECTORS, 'gdp.base_va_per_job_month');
  for (const k of SECTORS) if (!(p.gdp.base_va_per_job_month[k] >= 0)) throw new Error(`params: gdp.base_va_per_job_month.${k} must be >= 0`);
  if (!(p.gdp.construction_va_ratio >= 0 && p.gdp.construction_va_ratio <= 1)) throw new Error('params: gdp.construction_va_ratio must be in [0, 1]');
}
