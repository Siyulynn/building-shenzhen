/**
 * The slice's fiscal state, content, ledger helpers, project and team actions, and views (phase1-slice.md §5.6;
 * fiscal-and-macro §3, §6, §7, §11). The tick steps that use them are systems/finance.ts and systems/construction.ts.
 */
import { OWNERSHIPS, type Ownership } from './enums.js';
import type { ProjectParams, SliceParams } from './params.js';
import type { CellRuns, GameState, LocalizedString, PlayerAction } from './state.js';
import { parseYM, type YM } from './ym.js';
import { cellsOfRuns, runsOfCells } from './zones.js';

export const ACCOUNTS = ['general', 'land', 'debt', 'forex'] as const;
export type AccountId = (typeof ACCOUNTS)[number];          // forex is a quota to buy, in USD; never added to yuan
export type TxType = 'tax' | 'grant' | 'land_fee' | 'obligation' | 'project' | 'loan' | 'retention' | 'import';
export interface LedgerEntry { date: YM; type: TxType; account: AccountId; amount: number; ref: string }
export type ObligationKind = 'payroll' | 'service' | 'maintenance' | 'transfer' | 'arrears';
export interface Obligation {
  id: number; kind: ObligationKind; perMonth: number; index: 'none' | 'wages'; baseWage?: number;
  from: YM; until?: YM; createdBy: string;
}
export interface Loan {
  id: number; kind: 'project' | 'short'; principal: number; rate: number;
  schedule: { date: YM; principal: number; interest: number }[]; taken: YM;
}
export const PROJECT_KINDS = ['road', 'water_main', 'power_line', 'site_preparation', 'school'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];
export const PRIORITIES = ['high', 'normal', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];
export interface Project {
  id: number; template: string; kind: ProjectKind;
  area: number; zone?: number; cells?: CellRuns;
  budget: number; spent: number;
  crew: number; workTotal: number; workDone: number; crewBank: number;
  priority: Priority; contract?: number;
  committed: YM; completed?: YM;
  stage: 'committed' | 'building' | 'stalled' | 'done' | 'cancelled';
  waiting?: 'capacity' | 'finance' | 'mobilization' | 'frozen';   // frozen: a fall from grace (§5.8)
  cofinanced?: true;                         // M5b (§5.8): paid by an investor; budget 0
}
export type TeamMode = 'pool' | 'dedicated';
export interface TeamContract { id: number; team: string; mode: TeamMode; project?: number; crew: number; signed: YM; starts: YM; ends?: YM }
export const DEFICIT_OPTIONS = ['borrow_short', 'use_land_money', 'austerity'] as const;   // the headless default first
export type DeficitOption = (typeof DEFICIT_OPTIONS)[number];
export interface FiscalState {
  regime: string;
  balances: Record<AccountId, number>;
  ledger: LedgerEntry[];
  obligations: Obligation[];
  loans: Loan[];
  projects: Project[];
  contracts: TeamContract[];
  nextId: { obligation: number; loan: number; project: number; contract: number };
  projectLoan: 'not_offered' | 'offered' | 'declined' | 'taken';
  loanWanted: boolean;                       // a commit left money for projects below zero: offer the loan
  deficit?: { turn: number; option?: DeficitOption };
  austerity: number;
  frozenUntil?: YM;                          // M5b (§5.8): city projects get no work until this month, inclusive
}

export const DEFICIT_CARD = 'fiscal.deficit';
export const LOAN_CARD = 'fiscal.project_loan';

// ---- content ----

export interface Regime {
  id: string; name: LocalizedString;
  tax: { value_added_rate: Record<Ownership, number>; local_share: number };
  landFee: { from: YM; perM2Year: number }[];
  landForRecurring: 'sanctioned' | 'grey' | 'forbidden';
  grantSchedule: { from: YM; factor: number }[];
}
export interface ProjectTemplate { id: string; name: LocalizedString; kind: ProjectKind; target: 'area' | 'zone' }
/** eventOnly: contracted only by an event (§5.8), never by the player's contract_team. */
export interface TeamTemplate { id: string; name: LocalizedString; modes: TeamMode[]; eventOnly?: true }
/** content/slice/fiscal_regimes.yaml, projects.yaml and teams.yaml, compiled. Content, never state. */
export interface FiscalContent { regimes: Regime[]; projects: ProjectTemplate[]; teams: TeamTemplate[] }

const nameOf = (r: Record<string, any>, id: string): LocalizedString => {
  if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${id}: name needs zh and en`);
  return { zh: r.name.zh, en: r.name.en };
};
const list = (raw: unknown, what: string): Record<string, any>[] => {
  if (!Array.isArray(raw)) throw new Error(`${what}: expected a list`);
  const seen = new Set<string>();
  for (const [i, r] of raw.entries()) {
    if (typeof r?.id !== 'string' || !r.id) throw new Error(`${what}[${i}]: id is missing`);
    if (seen.has(r.id)) throw new Error(`${what}: duplicate id ${r.id}`);
    seen.add(r.id);
  }
  return raw as Record<string, any>[];
};
/** Dated entries, sorted, the first from no later than the start. */
function dated<T>(raw: unknown, id: string, what: string, f: (e: Record<string, any>) => T): (T & { from: YM })[] {
  if (!Array.isArray(raw)) throw new Error(`${id}: ${what} must be a list`);
  const out = raw.map((e: Record<string, any>) => ({ ...f(e), from: parseYM(String(e.from)) }));
  for (let i = 1; i < out.length; i++) if (out[i]!.from <= out[i - 1]!.from) throw new Error(`${id}: ${what} must be in date order`);
  return out;
}

/** Validate the three M4 content files against each other and the params (§5.6). */
export function compileFiscal(raw: { regimes: unknown; projects: unknown; teams: unknown }, p: SliceParams): FiscalContent {
  const regimes = list(raw.regimes, 'fiscal_regimes').map((r): Regime => {
    if (typeof r.tax !== 'object' || r.tax === null) throw new Error(`${r.id}: tax is missing`);
    const rates = r.tax.value_added_rate ?? {};
    for (const o of OWNERSHIPS) if (!(rates[o] >= 0 && rates[o] <= 1)) throw new Error(`${r.id}: tax.value_added_rate.${o} must be in [0, 1]`);
    if (!(r.tax.local_share >= 0 && r.tax.local_share <= 1)) throw new Error(`${r.id}: tax.local_share must be in [0, 1]`);
    if (!['sanctioned', 'grey', 'forbidden'].includes(r.land_for_recurring)) throw new Error(`${r.id}: land_for_recurring is unknown`);
    const grantSchedule = dated(r.grant_schedule, r.id, 'grant_schedule', (e) => {
      if (!(e.factor >= 0)) throw new Error(`${r.id}: a grant factor must be >= 0`);
      return { factor: e.factor as number };
    });
    if (!grantSchedule.length) throw new Error(`${r.id}: grant_schedule is empty`);
    const landFee = dated(r.land_fee, r.id, 'land_fee', (e) => {
      if (!(e.per_m2_year >= 0)) throw new Error(`${r.id}: land_fee per_m2_year must be >= 0`);
      return { perM2Year: e.per_m2_year as number };
    });
    return { id: r.id, name: nameOf(r, r.id), tax: { value_added_rate: { ...rates }, local_share: r.tax.local_share },
      landFee, landForRecurring: r.land_for_recurring, grantSchedule };
  });
  if (!regimes.some((r) => r.id === p.fiscal.start_regime)) throw new Error(`params: fiscal.start_regime ${p.fiscal.start_regime} is not a regime`);
  const projects = list(raw.projects, 'projects').map((r): ProjectTemplate => {
    if (!(PROJECT_KINDS as readonly string[]).includes(r.kind)) throw new Error(`${r.id}: unknown kind ${r.kind}`);
    const target = r.kind === 'site_preparation' ? 'zone' : 'area';
    if (r.target !== target) throw new Error(`${r.id}: a ${r.kind} project targets a ${target}`);
    const pp = p.projects[r.id];
    if (!pp) throw new Error(`${r.id}: params.projects has no entry for it`);
    if ((r.kind === 'site_preparation') !== (pp.budget_per_cell !== undefined)) {
      throw new Error(`${r.id}: site preparation is priced per cell, every other project by budget`);
    }
    return { id: r.id, name: nameOf(r, r.id), kind: r.kind, target };
  });
  const teams = list(raw.teams, 'teams').map((r): TeamTemplate => {
    const modes = Array.isArray(r.modes) ? r.modes : [];
    if (!modes.length || modes.some((m: string) => m !== 'pool' && m !== 'dedicated')) throw new Error(`${r.id}: modes must be pool and/or dedicated`);
    if (!p.teams[r.id]) throw new Error(`${r.id}: params.teams has no entry for it`);
    if (r.event_only !== undefined && typeof r.event_only !== 'boolean') throw new Error(`${r.id}: event_only must be true or false`);
    return { id: r.id, name: nameOf(r, r.id), modes: [...modes], ...(r.event_only ? { eventOnly: true as const } : {}) };
  });
  return { regimes, projects, teams };
}

// ---- state ----

export function initialFiscal(p: SliceParams): FiscalState {
  const b = p.fiscal.start_balances;
  return {
    regime: p.fiscal.start_regime,
    balances: { general: b.general, land: b.land, debt: b.debt, forex: b.forex_usd },
    ledger: [], obligations: [], loans: [], projects: [], contracts: [],
    nextId: { obligation: 1, loan: 1, project: 1, contract: 1 },
    projectLoan: 'not_offered', loanWanted: false, austerity: 0,
  };
}

/** A copy step() may change. Ledger entries and loan schedules are never changed after they are written: shared. */
export function cloneFiscal(f: FiscalState): FiscalState {
  return {
    ...f,
    balances: { ...f.balances },
    ledger: [...f.ledger],
    obligations: f.obligations.map((o) => ({ ...o })),
    loans: f.loans.map((l) => ({ ...l })),
    projects: f.projects.map((x) => ({ ...x, ...(x.cells ? { cells: x.cells.map((r) => [...r] as CellRuns[number]) } : {}) })),
    contracts: f.contracts.map((c) => ({ ...c })),
    nextId: { ...f.nextId },
    ...(f.deficit ? { deficit: { ...f.deficit } } : {}),
  };
}

// ---- the ledger ----

/** Write one entry, rounded once to a whole yuan (USD for forex), and move the balance. Zero amounts write nothing. */
export function post(s: GameState, type: TxType, account: AccountId, amount: number, ref: string): number {
  const a = Math.round(amount);
  if (a === 0) return 0;
  s.fiscal.balances[account] += a;
  s.fiscal.ledger.push({ date: s.date, type, account, amount: a, ref });
  return a;
}

export function regimeOf(s: GameState, fc: FiscalContent): Regime {
  const r = fc.regimes.find((x) => x.id === s.fiscal.regime);
  if (!r) throw new Error(`no fiscal regime ${s.fiscal.regime}`);
  return r;
}
/** The value of a dated schedule in month t: the last entry from no later than t (0 before the first). */
export function scheduleAt<T extends { from: YM }>(sched: readonly T[], t: YM, get: (e: T) => number): number {
  let v = 0;
  for (const e of sched) if (e.from <= t) v = get(e);
  return v;
}
export const grantFactor = (r: Regime, t: YM) => scheduleAt(r.grantSchedule, t, (e) => e.factor);
export const landFeeRate = (r: Regime, t: YM) => scheduleAt(r.landFee, t, (e) => e.perM2Year);

export const isLive = (o: Obligation, t: YM) => o.from <= t && (o.until === undefined || t <= o.until);
export function obligationDue(o: Obligation, s: GameState): number {
  if (o.index === 'wages' && o.baseWage) return Math.round(o.perMonth * s.labour.wage.state / o.baseWage);
  return o.perMonth;
}
export function addObligation(s: GameState, o: Omit<Obligation, 'id'>): Obligation {
  const rec: Obligation = { id: s.fiscal.nextId.obligation++, ...o, perMonth: Math.round(o.perMonth) };
  s.fiscal.obligations.push(rec);
  return rec;
}
export const debtServiceAt = (l: Loan, t: YM) =>
  l.schedule.reduce((a, e) => a + (e.date === t ? e.principal + e.interest : 0), 0);
export const principalOutstanding = (l: Loan, t: YM) =>
  l.principal - l.schedule.reduce((a, e) => a + (e.date < t ? e.principal : 0), 0);

/**
 * A loan's schedule from its first month: interest only for `grace` months, then equal principal over `term` months,
 * with interest on what is outstanding. Whole yuan; the last instalment takes the rounding.
 */
export function loanSchedule(principal: number, rate: number, first: YM, grace: number, term: number): Loan['schedule'] {
  const out: Loan['schedule'] = [];
  let left = principal;
  const each = Math.floor(principal / term);
  for (let k = 0; k < grace + term; k++) {
    const pr = k < grace ? 0 : k === grace + term - 1 ? left : each;
    out.push({ date: first + k, principal: pr, interest: Math.round(left * rate) });
    left -= pr;
  }
  return out;
}

// ---- money for projects ----

const last = (a: readonly number[]) => (a.length ? a[a.length - 1]! : 0);
/** The baselines due this month (fiscal §6.1, §5.6): the county's own spending, per head and per m² of completed floor. */
export function baselineDue(s: GameState, p: SliceParams): number {
  const F = p.fiscal;
  let resident = 0, present = 0, floor = 0;
  for (const g of s.pops) { resident += g.stayedSixMonths; present += g.present; }
  for (const b of s.blocks) for (const c of b.cohorts) if (c.stage === 'completed') floor += c.m2;
  return Math.round(F.county_base_obligations_per_month + F.admin_per_resident_month * resident
    + F.police_per_present_month * present + F.sanitation_per_m2_month * floor);
}
/**
 * general is drawn for projects only down to reserve_months × last month's obligations due (§5.6); in the first
 * month, with no month closed yet, × this month's baselines.
 */
export const reserveFloor = (s: GameState, p: SliceParams) => Math.round(p.fiscal.reserve_months
  * (s.history.obligationsDue.length ? last(s.history.obligationsDue) : baselineDue(s, p)));
export const liveProject = (x: Project) => x.stage !== 'done' && x.stage !== 'cancelled';
/** What a project may draw this month, by account in drawing order. */
export function projectFunds(s: GameState, p: SliceParams): { debt: number; land: number; general: number } {
  const b = s.fiscal.balances;
  return { debt: b.debt, land: b.land, general: Math.max(0, b.general - reserveFloor(s, p)) };
}
export const unspentCommitments = (s: GameState) =>
  s.fiscal.projects.reduce((a, x) => a + (liveProject(x) ? x.budget - x.spent : 0), 0)
  + s.worksOrders.reduce((a, o) => a + (o.stage === 'queued' || o.stage === 'working' ? o.budget - o.spent : 0), 0);   // R2 (b&c §13.2)
export function moneyForProjects(s: GameState, p: SliceParams): number {
  const f = projectFunds(s, p);
  return f.debt + f.land + f.general - unspentCommitments(s);
}
/** Pay `amount` for a project from debt, then land, then general above the floor. The caller checks it fits. */
export function payProject(s: GameState, p: SliceParams, amount: number, ref: string): void {
  let left = amount;
  const f = projectFunds(s, p);
  for (const acc of ['debt', 'land', 'general'] as const) {
    const take = Math.min(left, f[acc]);
    if (take > 0) { post(s, 'project', acc, -take, ref); left -= take; }
  }
  if (left > 0) throw new Error(`project payment ${ref} short by ${left}`);
}

/** Borrowing capacity for the deficit card (§5.6): a multiple of the last 12 months' recurring revenue, less short debt. */
export function borrowingCapacity(s: GameState, p: SliceParams): number {
  const rev = s.history.revenue.slice(-12).reduce((a, b) => a + b, 0);
  const owed = s.fiscal.loans.reduce((a, l) => a + (l.kind === 'short' ? principalOutstanding(l, s.date) : 0), 0);
  return Math.max(0, Math.floor(p.fiscal.short_loan.revenue_multiple * rev - owed));
}

// ---- serviced land (三通一平) ----

const has = (sorted: Uint32Array, v: number) => {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, x = sorted[m]!; if (x === v) return true; if (x < v) lo = m + 1; else hi = m - 1; }
  return false;
};
/** A zone's buildable cells (every cell without the layer). */
export function buildableCells(s: GameState, runs: CellRuns, buildable?: { cells: Uint32Array }): number[] {
  const cells = cellsOfRuns(runs, s.grid);
  return buildable ? cells.filter((c) => has(buildable.cells, c)) : cells;
}
/** Each zone's servicedShare = its buildable cells in servicedLand ÷ its buildable cells (§5.6, tick step 3). */
export function refreshServicedShares(s: GameState, buildable?: { cells: Uint32Array }): void {
  const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
  for (const z of s.zones) {
    const cells = buildableCells(s, z.runs, buildable);
    z.servicedShare = cells.length ? cells.filter((c) => served.has(c)).length / cells.length : 0;
  }
}
export function addServicedLand(s: GameState, runs: CellRuns): void {
  const all = new Set([...cellsOfRuns(s.servicedLand, s.grid), ...cellsOfRuns(runs, s.grid)]);
  s.servicedLand = runsOfCells([...all].sort((a, b) => a - b), s.grid.width);
}

// ---- actions (owned by the finance step, §5.6) ----

const FISCAL_ACTIONS: readonly string[] = ['commit_project', 'set_project_priority', 'cancel_project', 'contract_team'];
export const isFiscalAction = (a: PlayerAction) => FISCAL_ACTIONS.includes(a.type);

const projectParams = (p: SliceParams, id: string): ProjectParams => {
  const pp = p.projects[id];
  if (!pp) throw new Error(`params: projects has no ${id}`);
  return pp;
};
const findProject = (s: GameState, id: number) => {
  const x = s.fiscal.projects.find((q) => q.id === id);
  if (!x) throw new Error(`no project ${id}`);
  return x;
};

/** Validate and apply a project or team action; throws on an invalid one, like a zone action. */
export function applyFiscalAction(s: GameState, p: SliceParams, fc: FiscalContent, a: PlayerAction,
  buildable?: { cells: Uint32Array }, fromEvent = false): void {
  const F = s.fiscal;
  if (a.type === 'commit_project') {
    const t = fc.projects.find((x) => x.id === a.template);
    if (!t) throw new Error(`no project template ${a.template}`);
    const pp = projectParams(p, t.id);
    if (a.priority !== undefined && !(PRIORITIES as readonly string[]).includes(a.priority)) throw new Error(`unknown priority ${a.priority}`);
    let area: number, zone: number | undefined, cells: CellRuns | undefined, budget: number, crew: number;
    if (t.target === 'zone') {
      const z = s.zones.find((x) => x.id === a.zone);
      if (!z) throw new Error(`${t.id} needs an existing zone`);
      // neither serviced nor already being serviced by a live site-preparation project
      const served = new Set(cellsOfRuns(s.servicedLand, s.grid));
      for (const x of F.projects) if (x.cells && liveProject(x)) for (const c of cellsOfRuns(x.cells, s.grid)) served.add(c);
      for (const w of s.cellWorks) served.add(w.cell);     // R2 (b&c §13.2): cells with works belong to their orders
      const todo = buildableCells(s, z.runs, buildable).filter((c) => !served.has(c));
      if (!todo.length) throw new Error(`zone ${z.id} has no buildable cells left to service`);
      area = z.area; zone = z.id; cells = runsOfCells(todo, s.grid.width);
      budget = pp.budget_per_cell! * todo.length;
      crew = Math.max(1, Math.ceil(pp.crew_per_cell! * todo.length));
    } else {
      const ar = s.areas.find((x) => x.id === a.area);
      if (!ar || ar.access !== 'playable') throw new Error(`${t.id} needs a playable area`);
      area = ar.id; budget = pp.budget!; crew = pp.crew!;
    }
    const fx = pp.forex_usd ?? 0;
    if (fx > F.balances.forex) throw new Error(`${t.id} needs ${fx} USD of forex quota; ${F.balances.forex} is left`);
    const id = F.nextId.project++;
    if (fx > 0) post(s, 'import', 'forex', -fx, `project.${id}`);
    F.projects.push({ id, template: t.id, kind: t.kind, area, ...(zone !== undefined ? { zone, cells } : {}),
      budget: Math.round(budget), spent: 0, crew, workTotal: pp.work_months, workDone: 0, crewBank: 0,
      priority: a.priority ?? 'normal', committed: s.date, stage: 'committed' });
    if (moneyForProjects(s, p) < 0 && F.projectLoan !== 'taken') F.loanWanted = true;
  } else if (a.type === 'set_project_priority') {
    if (!(PRIORITIES as readonly string[]).includes(a.priority)) throw new Error(`unknown priority ${a.priority}`);
    const x = findProject(s, a.project);
    if (!liveProject(x)) throw new Error(`project ${x.id} is ${x.stage}`);
    x.priority = a.priority;
  } else if (a.type === 'cancel_project') {
    const x = findProject(s, a.project);
    if (!liveProject(x)) throw new Error(`project ${x.id} is ${x.stage}`);
    x.stage = 'cancelled';
    delete x.waiting;
    const penalty = Math.round(p.fiscal.cancel_penalty * (x.budget - x.spent));
    if (penalty > 0) addObligation(s, { kind: 'transfer', perMonth: penalty, index: 'none', from: s.date, until: s.date,
      createdBy: `cancel:project.${x.id}` });
    for (const c of F.contracts) if (c.project === x.id && c.ends === undefined) c.ends = s.date;
    if (F.loanWanted && moneyForProjects(s, p) >= 0) F.loanWanted = false;
  } else if (a.type === 'contract_team') {
    const t = fc.teams.find((x) => x.id === a.team);
    if (!t) throw new Error(`no team ${a.team}`);
    if (t.eventOnly && !fromEvent) throw new Error(`${t.id} arrives only with its event`);
    if (!t.modes.includes(a.mode)) throw new Error(`${t.id} does not work in ${a.mode} mode`);
    if (F.contracts.some((c) => c.team === t.id && contractLive(s, c))) throw new Error(`${t.id} already has a live contract`);
    const tp = p.teams[t.id]!;
    const id = F.nextId.contract++;
    const starts = s.date + tp.mobilization_months;
    if (a.mode === 'dedicated') {
      if (a.project === undefined) throw new Error('a dedicated contract names a project');
      const x = findProject(s, a.project);
      if (!liveProject(x)) throw new Error(`project ${x.id} is ${x.stage}`);
      if (x.contract !== undefined) throw new Error(`project ${x.id} already has a contract`);
      x.contract = id;
      F.contracts.push({ id, team: t.id, mode: 'dedicated', project: x.id, crew: tp.crew, signed: s.date, starts });
    } else {
      if (a.project !== undefined) throw new Error('a pool contract names no project');
      const ends = starts + tp.duration_months - 1;
      F.contracts.push({ id, team: t.id, mode: 'pool', crew: tp.crew, signed: s.date, starts, ends });
      if (tp.cost_per_month > 0) addObligation(s, { kind: 'service', perMonth: tp.cost_per_month, index: 'none', from: s.date,
        until: ends, createdBy: `contract.${id}` });
    }
  } else {
    throw new Error(`not a fiscal action: ${a.type}`);
  }
}

/**
 * Commit a co-financed project (§5.8): an area template in a playable area, paid by the investor. Its budget is 0, so
 * the city spends nothing on it, draws no forex and owes no maintenance; it still needs crews from the pool.
 */
export function commitCofinanced(s: GameState, p: SliceParams, fc: FiscalContent, template: string, area: number): Project {
  const t = fc.projects.find((x) => x.id === template);
  if (!t || t.target !== 'area') throw new Error(`${template} is not an area project template`);
  const ar = s.areas.find((x) => x.id === area);
  if (!ar || ar.access !== 'playable') throw new Error(`${template} needs a playable area`);
  const pp = projectParams(p, t.id);
  const F = s.fiscal;
  const x: Project = { id: F.nextId.project++, template: t.id, kind: t.kind, area, budget: 0, spent: 0, crew: pp.crew!,
    workTotal: pp.work_months, workDone: 0, crewBank: 0, priority: 'normal', committed: s.date, stage: 'committed',
    cofinanced: true };
  F.projects.push(x);
  return x;
}

/** Withdraw a co-financed project whose investor walked away (§5.8): cancelled, with no penalty, as it cost nothing. */
export function withdrawCofinanced(s: GameState, project: number): boolean {
  const x = s.fiscal.projects.find((q) => q.id === project);
  if (!x || !x.cofinanced || !liveProject(x)) return false;
  x.stage = 'cancelled';
  delete x.waiting;
  for (const c of s.fiscal.contracts) if (c.project === x.id && c.ends === undefined) c.ends = s.date;
  return true;
}

/** A contract is live from signing until it ends (a dedicated one until its project is done or cancelled). */
export function contractLive(s: GameState, c: TeamContract): boolean {
  if (c.ends !== undefined) return s.date <= c.ends;
  const x = s.fiscal.projects.find((q) => q.id === c.project);
  return !!x && liveProject(x);
}

// ---- views (fiscal §7) ----

export interface FiscalViews {
  recurring: { revenue: number; due: number; available: number; perYear: number };
  projects: { funds: number; unspent: number; available: number };
  importAccessUSD: number;
  borrowingCapacity: number;
  obligationsByKind: Record<ObligationKind | 'baseline' | 'debt_service', number>;
  loans: { id: number; kind: Loan['kind']; outstanding: number; schedule: Loan['schedule'] }[];
}

/** The player's views (§5.6, fiscal §7): pure, from the state and last month's series. */
export function fiscalViews(s: GameState, p: SliceParams): FiscalViews {
  const revenue = last(s.history.revenue), due = last(s.history.obligationsDue);
  const f = projectFunds(s, p), unspent = unspentCommitments(s);
  const byKind = { baseline: baselineDue(s, p), debt_service: s.fiscal.loans.reduce((a, l) => a + debtServiceAt(l, s.date), 0),
    payroll: 0, service: 0, maintenance: 0, transfer: 0, arrears: 0 };
  for (const o of s.fiscal.obligations) if (isLive(o, s.date)) byKind[o.kind] += obligationDue(o, s);
  return {
    recurring: { revenue, due, available: revenue - due, perYear: 12 * (revenue - due) },
    projects: { funds: f.debt + f.land + f.general, unspent, available: f.debt + f.land + f.general - unspent },
    importAccessUSD: s.fiscal.balances.forex,
    borrowingCapacity: borrowingCapacity(s, p),
    obligationsByKind: byKind,
    loans: s.fiscal.loans.map((l) => ({ id: l.id, kind: l.kind, outstanding: principalOutstanding(l, s.date), schedule: l.schedule })),
  };
}
