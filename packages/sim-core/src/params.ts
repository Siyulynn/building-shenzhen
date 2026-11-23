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
  };
  migration: {
    inland_wage: number;
    base: Record<MigrantKind, number>;
    sector: Record<MigrantKind, Sector>;
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
    }>;
  };
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
  construction: { cost_per_m2: { standard_factory: number; dormitory: number; state_flats: number } };
  projects: Record<string, ProjectParams>;
  teams: Record<string, { crew: number; mobilization_months: number; duration_months: number; cost_per_month: number }>;
  gdp: { base_va_per_job_month: Record<Sector, number>; construction_va_ratio: number };
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
  need(p.migration.base, MIGRANT_KINDS, 'migration.base');
  need(p.migration.sector, MIGRANT_KINDS, 'migration.sector');
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
  if (!(I.order_index >= 0)) throw new Error('params: industry.order_index must be >= 0');
  for (const o of OWNERSHIPS) {
    const b = I.by_ownership[o];
    if (!(b.value_added_ratio >= 0 && b.value_added_ratio <= 1)) throw new Error(`params: industry.by_ownership.${o}.value_added_ratio must be in [0, 1]`);
    if (!(b.export_share >= 0 && b.export_share <= 1)) throw new Error(`params: industry.by_ownership.${o}.export_share must be in [0, 1]`);
    if (!(b.floor_m2_per_job > 0)) throw new Error(`params: industry.by_ownership.${o}.floor_m2_per_job must be > 0`);
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
    if (!(a.rate_per_quarter >= 0 && a.rate_per_quarter <= 3)) throw new Error(`params: investors.archetypes.${id}.rate_per_quarter must be in [0, 3]`);
  }
  for (const m of p.migration.spring.away_months) if (!Number.isInteger(m) || m < 0 || m > 11) throw new Error('params: spring.away_months are 0..11');
  validateFiscalParams(p);
  return p;
}

const posInt = (n: unknown) => Number.isInteger(n) && (n as number) >= 1;

function validateFiscalParams(p: SliceParams): void {
  const F = p.fiscal, C = p.capacity;
  if (!F || !C || !p.construction || !p.projects || !p.teams || !p.gdp) {
    throw new Error('params: fiscal, capacity, construction, projects, teams and gdp must be set (§5.6)');
  }
  for (const [k, v] of Object.entries(F.start_balances)) if (!(v >= 0)) throw new Error(`params: fiscal.start_balances.${k} must be >= 0`);
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
  if (!(L.principal > 0) || !(L.rate_month >= 0) || !Number.isInteger(L.grace_months) || L.grace_months < 0
    || !posInt(L.term_months) || !posInt(L.offer_months)) throw new Error('params: fiscal.loan has a bad term');
  if (!(Number.isInteger(C.local_crew) && C.local_crew >= 0)) throw new Error('params: capacity.local_crew must be a whole number');
  if (!(C.crew_per_m2 > 0)) throw new Error('params: capacity.crew_per_m2 must be > 0');
  for (const [id, t] of Object.entries(p.projects)) {
    const perCell = t.budget_per_cell !== undefined;
    if (perCell ? !(t.budget_per_cell! >= 0 && t.crew_per_cell! > 0) : !(t.budget! >= 0 && posInt(t.crew))) {
      throw new Error(`params: projects.${id} needs budget and a whole crew, or budget_per_cell and crew_per_cell`);
    }
    if (!posInt(t.work_months)) throw new Error(`params: projects.${id}.work_months must be a positive integer`);
    if (!(t.maint_rate_year >= 0)) throw new Error(`params: projects.${id}.maint_rate_year must be >= 0`);
  }
  for (const [id, t] of Object.entries(p.teams)) {
    if (!posInt(t.crew) || !Number.isInteger(t.mobilization_months) || t.mobilization_months < 0 || !posInt(t.duration_months)
      || !(t.cost_per_month >= 0)) throw new Error(`params: teams.${id} has a bad crew, mobilization, duration or cost`);
  }
  need(p.gdp.base_va_per_job_month, SECTORS, 'gdp.base_va_per_job_month');
  if (!(p.gdp.construction_va_ratio >= 0 && p.gdp.construction_va_ratio <= 1)) throw new Error('params: gdp.construction_va_ratio must be in [0, 1]');
}
