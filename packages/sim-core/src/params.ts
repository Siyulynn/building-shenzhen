/** params/slice.yaml, parsed (phase1-slice.md §5.2, §8). Validated once; never stored in GameState. */
import type { Enforcement, HousingArchetype, MigrantKind, PermitRegime, PopKind, Sector } from './enums.js';
import { ENFORCEMENT_LEVELS, HOUSING_ARCHETYPES, MIGRANT_KINDS, PERMIT_REGIMES, POP_KINDS, SECTORS } from './enums.js';

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
  for (const m of p.migration.spring.away_months) if (!Number.isInteger(m) || m < 0 || m > 11) throw new Error('params: spring.away_months are 0..11');
  return p;
}
