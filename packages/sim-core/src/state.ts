/** The slice's game state (phase1-slice.md §5, §5.1, §5.2). Later milestones add modules from their specs. */
import {
  ARCHETYPES, POP_KINDS, REGISTRATION, SECTORS, USE_OF, isMigrant,
  type Enforcement, type HousingArchetype, type MigrantKind, type PermitRegime, type PopKind, type Sector,
} from './enums.js';
import type { SliceParams } from './params.js';
import { bedsByPool } from './systems/common.js';
import { parseYM, type YM } from './ym.js';

export interface LocalizedString { zh: string; en: string }

/** phase1-slice.md §5. Utilities, facilities and the service gap start at zero until their systems arrive. */
export interface SliceArea {
  id: number; key: string; name: LocalizedString; cells: Uint32Array;
  access: 'playable' | 'card_only';
  flag?: 'shekou_enclave';
  utilities: { waterCap: number; powerCap: number };
  facilities: { schoolPlaces: number; clinicVisits: number; policePosts: number };
  illegalFloorShare: number;
  serviceGap: number;
}

export type Queue6 = [number, number, number, number, number, number];
/** phase1-slice.md §5, §5.2. All counts are integers; size === stayedSixMonths + Σ underSix. */
export interface PopGroup {
  area: number; kind: PopKind; registration: 'local' | 'nonlocal' | 'hmt';
  size: number; stayedSixMonths: number; underSix: Queue6; present: number;
  employed: Record<Sector, number>; wage: number; savings: number; mood: number;
}

// buildings §2.2, with the cohort's archetype and due month (M2)
export type FloorUse = 'residential_rental' | 'residential_owner' | 'dormitory' | 'shop' | 'workshop' | 'factory'
  | 'office' | 'warehouse' | 'public' | 'vacant';
export type Stage = 'planned' | 'under_construction' | 'stalled' | 'completed' | 'demolished';
export type Legality = 'permitted' | 'unpermitted_tolerated' | 'marked_illegal' | 'condemned';
export type BlockEventKind = 'start' | 'complete' | 'add_floors' | 'change_use' | 'stall' | 'resume' | 'demolish'
  | 'legalise' | 'mark_illegal';
export interface Cohort { era: number; use: FloorUse; stage: Stage; legality: Legality; m2: number;
  archetype: HousingArchetype; due?: YM }
export interface BlockEvent { date: YM; kind: BlockEventKind; use?: FloorUse; m2: number; builder: string }
export interface BlockStock {
  blockId: number; cell: number; area: number; village?: number;
  cohorts: Cohort[]; events: BlockEvent[]; rightsSummary: { title: string; share: number }[];
}

export interface JobRow { area: number; sector: Sector; jobs: number; filled: number }
export interface LabourMarket {
  wage: Record<Sector, number>;
  jobs: JobRow[];
  baseJobs: { area: number; sector: Sector; jobs: number }[];
}
export interface HousingMarket {
  area: number;
  beds: { local: number; rental: number };
  occupants: { local: number; rental: number };
  crowding: number;
  rent: number;
}
export interface MigrationState { stockLag: Record<MigrantKind, number[]> }
export interface PolicyLevers { permitRegime: PermitRegime; enforcement: Enforcement }

export interface CardInstance { id: string; card: string; options: string[]; interrupting: boolean; raisedAt: YM }
export type PlayerAction =
  | { type: 'answer_card'; instance: string; option: string }
  | { type: 'set_enforcement'; level: Enforcement }
  | { type: 'set_permit_regime'; regime: PermitRegime };
export type SubStep = 0 | 1 | 2;
export interface ActionLogEntry { date: YM; subStep: SubStep; action: PlayerAction }

export interface History {
  months: YM[];
  registered: number[]; resident: number[]; present: number[]; migrants: number[];
  jobs: Record<Sector, number[]>; employed: Record<Sector, number[]>;
  rentalBeds: number[]; crowding: number[]; rent: number[]; underConstructionM2: number[]; illegalShare: number[];
  inflow: number[]; outflow: number[];
}

export interface GameState {
  date: YM;
  turn: number;
  subStep: SubStep;
  scenario: { start: YM; turns: number; monthsPerTurn: number };
  areas: SliceArea[];
  pops: PopGroup[];
  blocks: BlockStock[];
  villagePlots: { area: number; footprintM2: number }[];
  labour: LabourMarket;
  housing: HousingMarket[];
  migration: MigrationState;
  policy: PolicyLevers;
  pendingCards: CardInstance[];
  actionLog: ActionLogEntry[];
  history: History;
}

/** content/slice/scenario.yaml, parsed. */
export interface ScenarioContent { start: string; turns: number; months_per_turn: number }

/** data/starts/slice_areas.json (pipeline/m1_areas.py), parsed. */
export interface AreasContent {
  format: number;
  areas_sha256: string;
  grid: { width: number; height: number; cell_m: number; origin_top_left: [number, number]; crs: string };
  areas: {
    id: number; key: string; name: LocalizedString; access: 'playable' | 'card_only'; flag?: 'shekou_enclave';
    proxy_subdistricts: string[]; cell_count: number; runs: [number, number, number][];
  }[];
}

/** content/slice/start_1979.yaml, parsed (§5.2). */
export interface StartContent {
  policy: { permit_regime: PermitRegime; enforcement: Enforcement };
  era: string;
  rights: { title: string; share: number }[];
  areas: {
    area: number;
    pops: Record<PopKind, number>;
    base_jobs: Record<Sector, number>;
    housing_m2: Record<HousingArchetype, number>;
    village_footprint_m2: number;
  }[];
}

export const AREAS_FORMAT = 1;

/** Expand row runs [y, x0, x1] (inclusive) into sorted cell indices y * width + x. */
export function cellsFromRuns(runs: [number, number, number][], width: number): Uint32Array {
  let n = 0;
  for (const [, x0, x1] of runs) n += x1 - x0 + 1;
  const out = new Uint32Array(n);
  let k = 0;
  for (const [y, x0, x1] of runs) for (let x = x0; x <= x1; x++) out[k++] = y * width + x;
  return out.sort();
}

const zeroBySector = (): Record<Sector, number> =>
  Object.fromEntries(SECTORS.map((s) => [s, 0])) as Record<Sector, number>;
const seriesBySector = (): Record<Sector, number[]> =>
  Object.fromEntries(SECTORS.map((s) => [s, []])) as unknown as Record<Sector, number[]>;
const isCount = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;

export function emptyHistory(): History {
  return { months: [], registered: [], resident: [], present: [], migrants: [], jobs: seriesBySector(),
    employed: seriesBySector(), rentalBeds: [], crowding: [], rent: [], underConstructionM2: [], illegalShare: [],
    inflow: [], outflow: [] };
}

export function createInitialState(content: {
  scenario: ScenarioContent; areas: AreasContent; start: StartContent; params: SliceParams;
}): GameState {
  const { scenario, areas, start, params } = content;
  if (scenario.months_per_turn !== 3) throw new Error('the slice has three monthly sub-steps per turn (§2)');
  if (!Number.isInteger(scenario.turns) || scenario.turns <= 0) throw new Error('scenario.turns must be a positive integer');
  if (areas.format !== AREAS_FORMAT) throw new Error(`slice_areas.json format ${areas.format}, expected ${AREAS_FORMAT}`);
  const startYM = parseYM(scenario.start);
  if (startYM % 3 !== 0) throw new Error(`the start month ${scenario.start} is not the first month of a quarter`);
  const era = params.eras.findIndex((e) => e.id === start.era);
  if (era < 0) throw new Error(`start era ${start.era} is not in params.eras`);

  const seen = new Set<number>();
  const sliceAreas: SliceArea[] = areas.areas.map((a) => {
    if (seen.has(a.id)) throw new Error(`duplicate area id ${a.id}`);
    seen.add(a.id);
    const cells = cellsFromRuns(a.runs, areas.grid.width);
    if (cells.length !== a.cell_count) throw new Error(`area ${a.id}: runs give ${cells.length} cells, not ${a.cell_count}`);
    return {
      id: a.id, key: a.key, name: { zh: a.name.zh, en: a.name.en }, cells, access: a.access,
      ...(a.flag ? { flag: a.flag } : {}),
      utilities: { waterCap: 0, powerCap: 0 },
      facilities: { schoolPlaces: 0, clinicVisits: 0, policePosts: 0 },
      illegalFloorShare: 0,
      serviceGap: 0,
    };
  });

  const pops: PopGroup[] = [];
  const blocks: BlockStock[] = [];
  const villagePlots: GameState['villagePlots'] = [];
  const baseJobs: LabourMarket['baseJobs'] = [];
  const housing: HousingMarket[] = [];
  const startAreas = new Map(start.areas.map((s) => [s.area, s]));
  for (const area of sliceAreas) {                           // state order = AREA_ORDER
    const s = startAreas.get(area.id);
    if (!s) continue;
    if (area.access !== 'playable') throw new Error(`area ${area.id} is card-only and has no pops (§6.1)`);
    for (const kind of POP_KINDS) {
      const n = s.pops[kind];
      if (!isCount(n)) throw new Error(`start area ${area.id}: pops.${kind} must be a count`);
      if (n === 0) continue;
      pops.push({ area: area.id, kind, registration: REGISTRATION[kind], size: n, stayedSixMonths: n,
        underSix: [0, 0, 0, 0, 0, 0], present: n, employed: zeroBySector(), wage: 0, savings: 0, mood: 0.5 });
    }
    for (const sector of SECTORS) {
      const j = s.base_jobs[sector];
      if (!isCount(j)) throw new Error(`start area ${area.id}: base_jobs.${sector} must be a count`);
      baseJobs.push({ area: area.id, sector, jobs: j });
    }
    const cohorts: Cohort[] = [];
    for (const arch of ARCHETYPES) {
      const m2 = s.housing_m2[arch];
      if (!(m2 >= 0)) throw new Error(`start area ${area.id}: housing_m2.${arch} must be >= 0`);
      if (m2 > 0) cohorts.push({ era, use: USE_OF[arch], stage: 'completed', legality: 'permitted', m2, archetype: arch });
    }
    blocks.push({ blockId: area.id, cell: area.cells[0] ?? 0, area: area.id, cohorts, events: [],
      rightsSummary: start.rights.map((r) => ({ ...r })) });
    villagePlots.push({ area: area.id, footprintM2: s.village_footprint_m2 });
    // the market as housing (step 7) would compute it, with rent at its target, so the start is at rest (§5.2)
    const beds = bedsByPool(blocks[blocks.length - 1]!, params);
    const here = pops.filter((g) => g.area === area.id);
    const occupants = {
      local: here.reduce((a, g) => a + (isMigrant(g.kind) ? 0 : g.size), 0),
      rental: here.reduce((a, g) => a + (isMigrant(g.kind) ? g.size : 0), 0),
    };
    const crowding = occupants.rental / Math.max(1, beds.rental);
    const H = params.housing;
    housing.push({ area: area.id, beds, occupants, crowding,
      rent: H.base_rent * Math.pow(Math.max(crowding, H.crowding_floor), H.rent_elasticity) });
  }
  for (const s of start.areas) if (!seen.has(s.area)) throw new Error(`start names unknown area ${s.area}`);

  const lagLen = params.migration.network_lag_months;
  const stockOf = (k: MigrantKind) => pops.filter((p) => p.kind === k).reduce((a, p) => a + p.size, 0);
  return {
    date: startYM,
    turn: 0,
    subStep: 0,
    scenario: { start: startYM, turns: scenario.turns, monthsPerTurn: scenario.months_per_turn },
    areas: sliceAreas,
    pops,
    blocks,
    villagePlots,
    labour: { wage: { ...params.labour.wage_start }, jobs: [], baseJobs },
    housing,
    migration: { stockLag: {
      migrant_factory: Array(lagLen).fill(stockOf('migrant_factory')),
      migrant_construction: Array(lagLen).fill(stockOf('migrant_construction')),
    } },
    policy: { permitRegime: start.policy.permit_regime, enforcement: start.policy.enforcement },
    pendingCards: [],
    actionLog: [],
    history: emptyHistory(),
  };
}

const copyBySector = <T>(r: Record<Sector, T>, f: (v: T) => T): Record<Sector, T> =>
  Object.fromEntries(SECTORS.map((s) => [s, f(r[s])])) as Record<Sector, T>;

/**
 * A copy that step() may change. Area cells are shared: nothing writes them. Append-only logs (the action log,
 * block events, history series) copy the array but share entries, which are never changed after they are written.
 */
export function cloneState(s: GameState): GameState {
  const h = s.history;
  return {
    ...s,
    scenario: { ...s.scenario },
    areas: s.areas.map((a) => ({ ...a, name: { ...a.name }, utilities: { ...a.utilities }, facilities: { ...a.facilities } })),
    pops: s.pops.map((p) => ({ ...p, underSix: [...p.underSix] as Queue6, employed: { ...p.employed } })),
    blocks: s.blocks.map((b) => ({ ...b, cohorts: b.cohorts.map((c) => ({ ...c })), events: [...b.events],
      rightsSummary: b.rightsSummary.map((r) => ({ ...r })) })),
    villagePlots: s.villagePlots.map((v) => ({ ...v })),
    labour: { wage: { ...s.labour.wage }, jobs: s.labour.jobs.map((j) => ({ ...j })), baseJobs: s.labour.baseJobs.map((j) => ({ ...j })) },
    housing: s.housing.map((m) => ({ ...m, beds: { ...m.beds }, occupants: { ...m.occupants } })),
    migration: { stockLag: { migrant_factory: [...s.migration.stockLag.migrant_factory],
      migrant_construction: [...s.migration.stockLag.migrant_construction] } },
    policy: { ...s.policy },
    pendingCards: s.pendingCards.map((c) => ({ ...c, options: [...c.options] })),
    actionLog: [...s.actionLog],
    history: {
      months: [...h.months], registered: [...h.registered], resident: [...h.resident], present: [...h.present],
      migrants: [...h.migrants], jobs: copyBySector(h.jobs, (a) => [...a]), employed: copyBySector(h.employed, (a) => [...a]),
      rentalBeds: [...h.rentalBeds], crowding: [...h.crowding], rent: [...h.rent],
      underConstructionM2: [...h.underConstructionM2], illegalShare: [...h.illegalShare],
      inflow: [...h.inflow], outflow: [...h.outflow],
    },
  };
}

export function isFinished(s: GameState): boolean {
  return s.turn >= s.scenario.turns;
}

