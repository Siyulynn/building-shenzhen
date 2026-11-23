/**
 * The construction-capacity pool and city projects (phase1-slice.md §5.6), run inside tick step 4. One monthly pool of
 * crew units serves the firms' cohorts and the city's projects in priority order; a dedicated contract delivers its
 * project outside the pool; village self-build never draws on it. Work stays in whole months: allocated crew units
 * go into a bank, and a full crew in the bank is a month of work.
 */
import { VILLAGE_ARCHETYPES } from '../enums.js';
import {
  PRIORITIES, addObligation, addServicedLand, liveProject, payProject, projectFunds, type Project,
} from '../fiscal.js';
import type { SliceParams } from '../params.js';
import type { Cohort } from '../state.js';
import type { TickContext } from '../step.js';

/** A firm cohort's crew at full pace (§5.6). */
export const cohortCrew = (c: Cohort, p: SliceParams) => Math.max(1, Math.ceil(c.m2 * p.capacity.crew_per_m2));

/** The value of one month of work on a cohort, for GDP (§5.6): its m² × cost per m² ÷ its months of work. */
export function cohortMonthValue(c: Cohort, p: SliceParams): number {
  const per = VILLAGE_ARCHETYPES.includes(c.archetype) ? p.village_build.build_cost_per_m2
    : (p.construction.cost_per_m2 as Record<string, number>)[c.archetype] ?? 0;
  return (c.m2 * per) / Math.max(1, c.workTotal ?? 1);
}

/** Pool supply this month: the local crew plus every pool contract active this month. */
export function poolSupply(ctx: TickContext, p: SliceParams): number {
  const s = ctx.state;
  return p.capacity.local_crew + s.fiscal.contracts.reduce((a, c) =>
    a + (c.mode === 'pool' && c.starts <= s.date && s.date <= (c.ends ?? s.date) ? c.crew : 0), 0);
}

const delivered = (x: Project) => x.workDone * x.crew + x.crewBank;
const costAt = (x: Project, units: number) =>
  Math.round((x.budget * (delivered(x) + units)) / (x.crew * x.workTotal)) - x.spent;

/** The most of `units` the city can pay for this month (0 when nothing fits). */
function affordable(ctx: TickContext, p: SliceParams, x: Project, units: number): number {
  if (x.budget === 0) return units;                       // co-financed (§5.8): the city pays nothing
  const f = projectFunds(ctx.state, p);
  const cash = f.debt + f.land + f.general;
  if (costAt(x, units) <= cash) return units;
  let u = x.budget > 0 ? Math.floor(((cash + x.spent) * x.crew * x.workTotal) / x.budget) - delivered(x) : units;
  u = Math.max(0, Math.min(units, u));
  while (u > 0 && costAt(x, u) > cash) u--;
  return u;
}

/** Give a project `units` crew units of work this month: pay for them, bank them, and complete it if it is done. */
function work(ctx: TickContext, p: SliceParams, x: Project, units: number): void {
  const s = ctx.state;
  if (units <= 0) return;
  const pay = costAt(x, units);
  if (pay > 0) {
    payProject(s, p, pay, `project.${x.id}`);
    ctx.events.push({ step: 'construction', kind: 'project_paid', detail: { project: x.id, amount: pay } });
    ctx.events.push({ step: 'construction', kind: 'work', detail: { value: pay } });
  }
  x.spent += pay;
  x.crewBank += units;
  if (x.crewBank >= x.crew) { x.workDone += 1; x.crewBank -= x.crew; }
  x.stage = 'building';
  if (x.workDone >= x.workTotal) complete(ctx, p, x);
}

/** Apply a finished project's asset, then its obligations (§5.6). */
function complete(ctx: TickContext, p: SliceParams, x: Project): void {
  const s = ctx.state;
  const pp = p.projects[x.template]!;
  const area = s.areas.find((a) => a.id === x.area)!;
  x.stage = 'done'; x.completed = s.date; x.crewBank = 0;
  delete x.waiting;
  if (x.kind === 'road') area.roadKm += pp.road_km ?? 0;
  else if (x.kind === 'water_main') area.utilities.waterCap += pp.water_m3_day ?? 0;
  else if (x.kind === 'power_line') area.utilities.powerCap += pp.power_kw ?? 0;
  else if (x.kind === 'site_preparation') addServicedLand(s, x.cells ?? []);
  else if (x.kind === 'school') {
    const places = pp.school_places ?? 0;
    area.facilities.schoolPlaces += places;
    const wage = s.labour.wage.state;
    if ((pp.staff ?? 0) > 0) addObligation(s, { kind: 'payroll', perMonth: pp.staff! * wage, index: 'wages', baseWage: wage,
      from: s.date + 1, createdBy: `project.${x.id}` });
    if (places * (pp.service_per_place_month ?? 0) > 0) addObligation(s, { kind: 'service',
      perMonth: places * pp.service_per_place_month!, index: 'none', from: s.date + 1, createdBy: `project.${x.id}` });
  }
  const maint = (x.budget * pp.maint_rate_year) / 12;
  if (Math.round(maint) > 0) addObligation(s, { kind: 'maintenance', perMonth: maint, index: 'none', from: s.date + 1,
    createdBy: `project.${x.id}` });
  for (const c of s.fiscal.contracts) if (c.project === x.id && c.ends === undefined) c.ends = s.date;
  ctx.events.push({ step: 'construction', kind: 'project_completed', detail: { project: x.id } });
}

/**
 * Allocate this month's pool (§5.6) and work the city's projects. Returns the crew units given to each firm cohort;
 * the construction step banks them. Order: priority, start month, firm cohorts before projects, id, then cohort order.
 */
export function allocatePool(ctx: TickContext, p: SliceParams): Map<Cohort, number> {
  const s = ctx.state;
  // one queue in priority order: firm cohorts and pooled projects share the pool; dedicated projects draw only cash,
  // but in the same order, so a low-priority dedicated project never pays ahead of a high-priority pooled one
  type Job = { pri: number; start: number; type: number; id: number; ord: number; cohort?: Cohort; project?: Project };
  const jobs: Job[] = [];
  let ord = 0;
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage !== 'under_construction' || c.firm === undefined) continue;
    const f = s.firms.find((x) => x.id === c.firm);
    jobs.push({ pri: 1, start: f?.accepted ?? s.date, type: 0, id: c.firm, ord: ord++, cohort: c });
  }
  for (const x of s.fiscal.projects) {
    if (!liveProject(x)) continue;
    delete x.waiting;                                     // why it waits, and whether it is stalled, is this month's
    if (x.stage === 'stalled') x.stage = x.workDone > 0 || x.crewBank > 0 ? 'building' : 'committed';
    jobs.push({ pri: PRIORITIES.indexOf(x.priority), start: x.committed, type: 1, id: x.id, ord: ord++, project: x });
  }
  jobs.sort((a, b) => a.pri - b.pri || a.start - b.start || a.type - b.type || a.id - b.id || a.ord - b.ord);

  const out = new Map<Cohort, number>();
  let left = poolSupply(ctx, p);
  for (const j of jobs) {
    if (j.cohort) {
      const c = j.cohort, crew = cohortCrew(c, p);
      // no more than the work left, so a final partial month passes its spare units down the queue
      const rest = crew * ((c.workTotal ?? 1) - (c.workDone ?? 0)) - (c.crewBank ?? 0);
      const got = Math.max(0, Math.min(crew, left, rest));
      out.set(j.cohort, got);
      left -= got;
      continue;
    }
    const x = j.project!;
    // a fall from grace freezes the city's projects (§5.8): no work, no spending, no draw on the pool
    if (s.fiscal.frozenUntil !== undefined && s.date <= s.fiscal.frozenUntil) { x.waiting = 'frozen'; continue; }
    if (x.contract !== undefined) {                       // a dedicated contract: outside the pool
      const k = s.fiscal.contracts.find((c) => c.id === x.contract)!;
      if (s.date < k.starts) { x.waiting = 'mobilization'; continue; }
      const want = Math.min(k.crew, x.crew, x.crew * x.workTotal - delivered(x));
      const got = affordable(ctx, p, x, want);
      if (got < want) x.waiting = 'finance';
      if (got === 0) { x.stage = 'stalled'; continue; }
      work(ctx, p, x, got);
      continue;
    }
    const want = Math.min(x.crew, left, x.crew * x.workTotal - delivered(x));
    const got = affordable(ctx, p, x, want);
    left -= got;
    if (got < Math.min(x.crew, x.crew * x.workTotal - delivered(x))) x.waiting = got < want ? 'finance' : 'capacity';
    if (got === 0) { if (x.waiting === 'finance') x.stage = 'stalled'; continue; }
    work(ctx, p, x, got);
  }
  return out;
}
