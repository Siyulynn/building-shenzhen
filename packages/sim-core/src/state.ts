/** The slice's game state, M1 subset (phase1-slice.md §5, §5.1). Later milestones add modules from their specs. */
import { parseYM, type YM } from './ym.js';

export interface LocalizedString { zh: string; en: string }

/** phase1-slice.md §5. Utilities, facilities and the summaries start at zero until their systems arrive. */
export interface SliceArea {
  id: number; key: string; name: LocalizedString; cells: Uint32Array;
  access: 'playable' | 'card_only';
  flag?: 'shekou_enclave';
  utilities: { waterCap: number; powerCap: number };
  facilities: { schoolPlaces: number; clinicVisits: number; policePosts: number };
  illegalFloorShare: number;
  serviceGap: number;
}

export interface CardInstance { id: string; card: string; options: string[]; interrupting: boolean; raisedAt: YM }
export type PlayerAction = { type: 'answer_card'; instance: string; option: string };
export type SubStep = 0 | 1 | 2;
export interface ActionLogEntry { date: YM; subStep: SubStep; action: PlayerAction }

export interface GameState {
  date: YM;
  turn: number;
  subStep: SubStep;
  scenario: { start: YM; turns: number; monthsPerTurn: number };
  areas: SliceArea[];
  pendingCards: CardInstance[];
  actionLog: ActionLogEntry[];
  history: { months: YM[] };
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

export function createInitialState(content: { scenario: ScenarioContent; areas: AreasContent }): GameState {
  const { scenario, areas } = content;
  if (scenario.months_per_turn !== 3) throw new Error('the slice has three monthly sub-steps per turn (§2)');
  if (!Number.isInteger(scenario.turns) || scenario.turns <= 0) throw new Error('scenario.turns must be a positive integer');
  if (areas.format !== AREAS_FORMAT) throw new Error(`slice_areas.json format ${areas.format}, expected ${AREAS_FORMAT}`);
  const start = parseYM(scenario.start);
  if (start % 3 !== 0) throw new Error(`the start month ${scenario.start} is not the first month of a quarter`);
  const seen = new Set<number>();
  return {
    date: start,
    turn: 0,
    subStep: 0,
    scenario: { start, turns: scenario.turns, monthsPerTurn: scenario.months_per_turn },
    areas: areas.areas.map((a) => {
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
    }),
    pendingCards: [],
    actionLog: [],
    history: { months: [] },
  };
}

/**
 * A copy that step() may change. Area cells are shared: nothing writes them. Append-only logs (the action log,
 * later the ledger) copy the array but share their entries, which are never changed after they are written.
 */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    scenario: { ...s.scenario },
    areas: s.areas.map((a) => ({ ...a, name: { ...a.name }, utilities: { ...a.utilities }, facilities: { ...a.facilities } })),
    pendingCards: s.pendingCards.map((c) => ({ ...c, options: [...c.options] })),
    actionLog: [...s.actionLog],
    history: { months: [...s.history.months] },
  };
}

export function isFinished(s: GameState): boolean {
  return s.turn >= s.scenario.turns;
}
