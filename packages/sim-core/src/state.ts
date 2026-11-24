/** The slice's game state (phase1-slice.md §5, §5.1, §5.2). Later milestones add modules from their specs. */
import {
  HOUSING_ARCHETYPES, POP_KINDS, REGISTRATION, SECTORS, USE_OF, isMigrant,
  type BuildingArchetype, type Enforcement, type HousingArchetype, type LandUse, type MigrantKind, type Ownership,
  type PermitRegime, type PopKind, type Sector,
} from './enums.js';
import { cloneFiscal, initialFiscal, type FiscalState, type Priority, type TeamMode } from './fiscal.js';
import type { SliceParams } from './params.js';
import { bedsByPool } from './systems/common.js';
import { parseYM, type YM } from './ym.js';
import { cloneOrder, type CellWork, type PlacedStructure, type StructureKind, type WorksOrder } from './works.js';

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
  roadKm: number;              // completed city roads in the area (M4, §5.6)
}

export type Queue6 = [number, number, number, number, number, number];
/** phase1-slice.md §5, §5.2. All counts are integers; size === stayedSixMonths + Σ underSix. */
export interface PopGroup {
  area: number; kind: PopKind; registration: 'local' | 'nonlocal' | 'hmt';
  size: number; stayedSixMonths: number; underSix: Queue6; present: number;
  employed: Record<Sector, number>; wage: number; savings: number; mood: number;
}

// buildings §2.2, with the cohort's archetype and due month (M2), and its work counters and firm (M3b, §5.5)
export type FloorUse = 'residential_rental' | 'residential_owner' | 'dormitory' | 'shop' | 'workshop' | 'factory'
  | 'office' | 'warehouse' | 'public' | 'vacant';
export type Stage = 'planned' | 'under_construction' | 'stalled' | 'completed' | 'demolished';
export type Legality = 'permitted' | 'unpermitted_tolerated' | 'marked_illegal' | 'condemned';
export type BlockEventKind = 'start' | 'complete' | 'add_floors' | 'change_use' | 'stall' | 'resume' | 'demolish'
  | 'legalise' | 'mark_illegal';
export interface Cohort { era: number; use: FloorUse; stage: Stage; legality: Legality; m2: number;
  archetype: BuildingArchetype; due?: YM;
  workDone?: number; workTotal?: number;   // months of work done and needed, while under construction
  crewBank?: number;                       // pool crew units banked toward its next month of work (M4, §5.6)
  firm?: number }                         // the firm whose factory or dormitory this is, until completion
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

/** Row runs [y, x0, x1], inclusive, sorted by y then x0, disjoint: plain JSON (§5.3). */
export type CellRuns = [number, number, number][];
export type ZoneName = { kind: 'generic' } | { kind: 'precedent'; precedent: string } | { kind: 'custom'; zh: string; en: string };
/** phase1-slice.md §5.3. The player's plan; village households ignore it. */
export interface Zone {
  id: number;                 // from nextZoneId, never reused
  use: LandUse;
  runs: CellRuns; cellCount: number;
  area: number;               // the playable area holding most of its cells (ties: lower id)
  created: YM;
  template?: string;          // the precedent it was applied from: a record of what the player did
  servicedShare?: number;     // §5.5 hook: the share of its buildable cells serviced (三通一平), 0–1; absent = 1. Set by M4
  name: ZoneName;
}

/** phase1-slice.md §5.5. A firm is a fact on the ground: it keeps its area when its zone is edited or removed. */
export interface Firm {
  id: number;                     // from nextFirmId, never reused
  archetype: string; ownership: Ownership; sector: 'factory';
  area: number; zone?: number; premises: 'new_factory' | 'existing';
  jobs: number; floorM2: number; dormM2: number; powerKw: number; waterM3Day: number;
  accepted: YM; opens?: YM;        // set when its factory completes (the month after acceptance in existing premises)
  posted: number; staffed: number; output: number;   // this month's: jobs posted, jobs filled, gross output (yuan)
  terms?: FirmTerms;               // M5a (§5.7): absent = no tax holiday, the full land-use fee
}
/** A firm's incentives (§5.7): its tax holiday, its land-use fee factor, and the leader whose shortcut sited it. */
export interface FirmTerms { taxHolidayMonths?: number; landFeeFactor?: number; shortcut?: string }

/** M5a (§5.7): fired events and unlock keys; the SEZ's opening; Shekou's tally; the leaders. */
export interface EventsState { fired: { id: string; date: YM }[]; unlocked: string[] }
export interface SezState { opened?: YM; priority?: string; readiness?: number; waveCards?: number }
export interface ShekouState { captured: number; jobs: number; carry: number }
export type LeaderRole = 'secretary' | 'mayor';
/** leadership §2.1, the Phase 1 subset. Fictional composites (AGENTS.md). */
export interface Leader { id: string; name: LocalizedString; role: LeaderRole; traits: string[]; disciplineRisk: number; rapport: number;
  standing: number }                                    // M5b (§5.8): with superiors, 0..100
/** bench: the replacements a fall from grace draws on (§5.8), by role. */
export interface LeadershipState { leaders: Leader[]; entangled: { leader: string; ref: string; date: YM }[]; bench: Leader[] }
/** content/slice/leaders.yaml, compiled. A record with replacementFor is on the bench, not in the start pair. */
export interface LeaderContent { id: string; name: LocalizedString; role: LeaderRole; traits: string[]; rapport: number;
  replacementFor?: LeaderRole }

/** M5b (§5.8): the climate, the sweep, the reviews, falls from grace and the Hong Kong order shock. */
export interface Climate { reformWind: number; scrutiny: number; overQuarters: number }
export interface Sweep { until?: YM }                 // a campaign runs from its answer's month through until
export interface ReviewRecord { index: number; date: YM; lightweight: boolean; score: number; pass: boolean; caught: boolean;
  vetoed?: string; items: { indicator: string; value: number; score: number }[] }
export interface ReviewsState { held: ReviewRecord[]; vetoes: { date: YM; reason: string }[] }
export interface FallRecord { date: YM; leader: string; replacedBy: string; entangled: boolean }
export interface OrdersState { factor: number; until?: YM }
export const LEADER_TRAITS = ['deal_maker', 'cautious'] as const;

export interface CardInstance { id: string; card: string; options: string[]; interrupting: boolean; raisedAt: YM;
  payload?: Record<string, unknown>; expires?: YM }
/** An answered card awaiting its system's tick (§5.5): kept through a paused call, cleared after the tick. */
export interface AnsweredCard { card: CardInstance; option: string }
export type PlayerAction =
  | { type: 'answer_card'; instance: string; option: string }
  | { type: 'set_enforcement'; level: Enforcement }
  | { type: 'set_permit_regime'; regime: PermitRegime }
  | { type: 'create_zone'; use: LandUse; runs: CellRuns; template?: string }
  | { type: 'edit_zone'; zone: number; add?: CellRuns; remove?: CellRuns; use?: LandUse }
  | { type: 'remove_zone'; zone: number }
  | { type: 'rename_zone'; zone: number; name: LocalizedString | null }
  // M4 (§5.6): owned by the finance step
  | { type: 'commit_project'; template: string; area?: number; zone?: number; priority?: Priority }
  | { type: 'set_project_priority'; project: number; priority: Priority }
  | { type: 'cancel_project'; project: number }
  | { type: 'contract_team'; team: string; mode: TeamMode; project?: number }
  // R2 (buildings-and-construction §13.2): owned by the construction step, with works params, fiscal and network
  | { type: 'commit_works'; zone: number; cells?: CellRuns; priority?: Priority }
  | { type: 'build_road'; path: [number, number][]; priority?: Priority }
  | { type: 'place_structure'; kind: StructureKind; cell: [number, number]; attach: [number, number]; facility?: string; priority?: Priority }
  | { type: 'cancel_works'; order: number; cells?: CellRuns }
  | { type: 'set_works_paused'; order: number; paused: boolean }
  | { type: 'set_works_priority'; order: number; priority: Priority };
export type SubStep = 0 | 1 | 2;
export interface ActionLogEntry { date: YM; subStep: SubStep; action: PlayerAction }

export interface History {
  months: YM[];
  registered: number[]; resident: number[]; present: number[]; migrants: number[];
  jobs: Record<Sector, number[]>; employed: Record<Sector, number[]>;
  rentalBeds: number[]; crowding: number[]; rent: number[]; underConstructionM2: number[]; illegalShare: number[];
  inflow: number[]; outflow: number[];
  firmJobs: number[]; firmStaffed: number[]; output: number[]; exports: number[]; valueAdded: number[];
  // M4 (§5.6): nominal yuan per month
  gdp: number[]; revenue: number[]; obligationsDue: number[]; baselineDue: number[]; obligationsPaid: number[];
  projectSpend: number[]; reserve: number[]; debtOutstanding: number[]; austerity: number[];
}

export interface GameState {
  date: YM;
  turn: number;
  subStep: SubStep;
  scenario: { start: YM; turns: number; monthsPerTurn: number };
  grid: { width: number; height: number };
  areas: SliceArea[];
  pops: PopGroup[];
  blocks: BlockStock[];
  villagePlots: { area: number; footprintM2: number }[];
  labour: LabourMarket;
  housing: HousingMarket[];
  migration: MigrationState;
  policy: PolicyLevers;
  zones: Zone[];              // id order
  nextZoneId: number;
  firms: Firm[];              // id order
  nextFirmId: number;
  fiscal: FiscalState;        // M4 (§5.6)
  servicedLand: CellRuns;     // serviced cells (三通一平), sorted runs
  cellWorks: CellWork[];      // R1 (b&c §13.1): one per committed cell, sorted by cell; empty until R2 writes them
  structures: PlacedStructure[];   // R1: placed sources and facilities, id order
  nextStructureId: number;
  roads: number[];            // R2 (b&c §13.2): built road cells, sorted; start-network roads stay content
  worksOrders: WorksOrder[];  // R2: municipal works orders, id order
  nextOrderId: number;
  events: EventsState;        // M5a (§5.7)
  sez: SezState;
  shekou: ShekouState;
  leadership: LeadershipState;
  climate: Climate;           // M5b (§5.8)
  sweep: Sweep;
  reviews: ReviewsState;
  falls: FallRecord[];
  orders: OrdersState;
  ended?: { date: YM; reason: 'failure' | 'visit' };   // the run ended early: by the climate or the closing visit
  pendingCards: CardInstance[];
  answered: AnsweredCard[];
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
    utilities: { water_m3_day: number; power_kw: number };   // spare capacity for new industry (§5.5)
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
    inflow: [], outflow: [], firmJobs: [], firmStaffed: [], output: [], exports: [], valueAdded: [],
    gdp: [], revenue: [], obligationsDue: [], baselineDue: [], obligationsPaid: [], projectSpend: [], reserve: [],
    debtOutstanding: [], austerity: [] };
}

/** content/slice/leaders.yaml (§5.7): the pair, fictional, with the Phase 1 traits. */
export function compileLeaders(raw: unknown): LeaderContent[] {
  if (!Array.isArray(raw)) throw new Error('leaders: expected a list');
  const seen = new Set<string>();
  const out = raw.map((r: Record<string, any>, i): LeaderContent => {
    if (typeof r?.id !== 'string' || !r.id) throw new Error(`leaders[${i}]: id is missing`);
    if (seen.has(r.id)) throw new Error(`leaders: duplicate id ${r.id}`);
    seen.add(r.id);
    if (r.fictional !== true) throw new Error(`${r.id}: leaders are fictional composites; set fictional: true`);
    if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${r.id}: name needs zh and en`);
    if (r.role !== 'secretary' && r.role !== 'mayor') throw new Error(`${r.id}: role must be secretary or mayor`);
    const traits = Array.isArray(r.traits) ? r.traits : [];
    for (const t of traits) if (!(LEADER_TRAITS as readonly string[]).includes(t)) throw new Error(`${r.id}: unknown trait ${t}`);
    if (!(typeof r.rapport === 'number' && r.rapport >= -100 && r.rapport <= 100)) throw new Error(`${r.id}: rapport must be in [-100, 100]`);
    if (r.replacement_for !== undefined && r.replacement_for !== r.role) {
      throw new Error(`${r.id}: replacement_for must be its own role (${r.role})`);
    }
    return { id: r.id, name: { zh: r.name.zh, en: r.name.en }, role: r.role as LeaderRole, traits: [...traits], rapport: r.rapport,
      ...(r.replacement_for ? { replacementFor: r.replacement_for as LeaderRole } : {}) };
  });
  // one Secretary and one Mayor in office (leadership §6); the bench holds the rest
  for (const role of ['secretary', 'mayor'] as const) {
    if (out.filter((l) => l.role === role && !l.replacementFor).length > 1) throw new Error(`leaders: more than one ${role} in office`);
  }
  return out;
}

export function createInitialState(content: {
  scenario: ScenarioContent; areas: AreasContent; start: StartContent; params: SliceParams;
  leaders?: readonly LeaderContent[];                        // M5a (§5.7): without them, no shortcut is offered
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
      roadKm: 0,
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
    for (const arch of HOUSING_ARCHETYPES) {
      const m2 = s.housing_m2[arch];
      if (!(m2 >= 0)) throw new Error(`start area ${area.id}: housing_m2.${arch} must be >= 0`);
      if (m2 > 0) cohorts.push({ era, use: USE_OF[arch], stage: 'completed', legality: 'permitted', m2, archetype: arch });
    }
    const u = s.utilities;
    if (!u || !(u.water_m3_day >= 0) || !(u.power_kw >= 0)) throw new Error(`start area ${area.id}: utilities need water_m3_day and power_kw >= 0`);
    area.utilities = { waterCap: u.water_m3_day, powerCap: u.power_kw };
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
    grid: { width: areas.grid.width, height: areas.grid.height },
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
    zones: [],
    nextZoneId: 1,
    firms: [],
    nextFirmId: 1,
    fiscal: initialFiscal(params),
    servicedLand: [],
    cellWorks: [],
    structures: [],
    nextStructureId: 1,
    roads: [],
    worksOrders: [],
    nextOrderId: 1,
    events: { fired: [], unlocked: [] },
    sez: {},
    shekou: { captured: 0, jobs: 0, carry: 0 },
    leadership: {
      leaders: (content.leaders ?? []).filter((l) => !l.replacementFor).map(toLeader),
      entangled: [],
      bench: (content.leaders ?? []).filter((l) => l.replacementFor).map(toLeader),
    },
    climate: { reformWind: params.climate.reform_wind, scrutiny: 0, overQuarters: 0 },
    sweep: {},
    reviews: { held: [], vetoes: [] },
    falls: [],
    orders: { factor: 1 },
    pendingCards: [],
    answered: [],
    actionLog: [],
    history: emptyHistory(),
  };
}

const toLeader = (l: LeaderContent): Leader => ({ id: l.id, name: { ...l.name }, role: l.role, traits: [...l.traits],
  disciplineRisk: 0, rapport: l.rapport, standing: 50 });

/** Cards are plain JSON; the payload is copied whole. */
const copyCard = (c: CardInstance): CardInstance => ({ ...c, options: [...c.options],
  ...(c.payload ? { payload: JSON.parse(JSON.stringify(c.payload)) as Record<string, unknown> } : {}) });

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
    grid: { ...s.grid },
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
    zones: s.zones.map((z) => ({ ...z, runs: z.runs.map((r) => [...r] as CellRuns[number]), name: { ...z.name } })),
    firms: s.firms.map((f) => ({ ...f, ...(f.terms ? { terms: { ...f.terms } } : {}) })),
    fiscal: cloneFiscal(s.fiscal),
    servicedLand: s.servicedLand.map((r) => [...r] as CellRuns[number]),
    cellWorks: s.cellWorks.map((w) => ({ ...w })),
    structures: s.structures.map((x) => ({ ...x })),
    roads: [...s.roads],
    worksOrders: s.worksOrders.map(cloneOrder),
    events: { fired: [...s.events.fired], unlocked: [...s.events.unlocked] },   // fired entries are never changed
    sez: { ...s.sez },
    shekou: { ...s.shekou },
    leadership: { leaders: s.leadership.leaders.map((l) => ({ ...l, name: { ...l.name }, traits: [...l.traits] })),
      entangled: [...s.leadership.entangled],
      bench: s.leadership.bench.map((l) => ({ ...l, name: { ...l.name }, traits: [...l.traits] })) },
    climate: { ...s.climate },
    sweep: { ...s.sweep },
    reviews: { held: [...s.reviews.held], vetoes: [...s.reviews.vetoes] },   // records are never changed after they are written
    falls: [...s.falls],
    orders: { ...s.orders },
    ...(s.ended ? { ended: { ...s.ended } } : {}),
    pendingCards: s.pendingCards.map(copyCard),
    answered: s.answered.map((a) => ({ card: copyCard(a.card), option: a.option })),
    actionLog: [...s.actionLog],
    history: {
      months: [...h.months], registered: [...h.registered], resident: [...h.resident], present: [...h.present],
      migrants: [...h.migrants], jobs: copyBySector(h.jobs, (a) => [...a]), employed: copyBySector(h.employed, (a) => [...a]),
      rentalBeds: [...h.rentalBeds], crowding: [...h.crowding], rent: [...h.rent],
      underConstructionM2: [...h.underConstructionM2], illegalShare: [...h.illegalShare],
      inflow: [...h.inflow], outflow: [...h.outflow],
      firmJobs: [...h.firmJobs], firmStaffed: [...h.firmStaffed], output: [...h.output], exports: [...h.exports],
      valueAdded: [...h.valueAdded],
      gdp: [...h.gdp], revenue: [...h.revenue], obligationsDue: [...h.obligationsDue], baselineDue: [...h.baselineDue],
      obligationsPaid: [...h.obligationsPaid], projectSpend: [...h.projectSpend], reserve: [...h.reserve],
      debtOutstanding: [...h.debtOutstanding], austerity: [...h.austerity],
    },
  };
}

/** The scenario is over after its last turn, or once it has ended early (§5.8: the failure state, the closing visit). */
export function isFinished(s: GameState): boolean {
  return s.turn >= s.scenario.turns || s.ended !== undefined;
}

