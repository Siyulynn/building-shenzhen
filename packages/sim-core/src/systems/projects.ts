/**
 * The construction-capacity pool and city projects (phase1-slice.md §5.6), run inside tick step 4. One monthly pool of
 * crew units serves the firms' cohorts and the city's projects in priority order; a dedicated contract delivers its
 * project outside the pool; village self-build never draws on it. Work stays in whole months: allocated crew units
 * go into a bank, and a full crew in the bank is a month of work.
 */
import { isVillageFloor } from './common.js';
import {
  PRIORITIES, addObligation, addServicedLand, liveProject, payProject, projectFunds, type Project,
} from '../fiscal.js';
import { orderMonth, workArea, type WorksContent } from '../orders.js';
import { allocateFreight, freightEvents, freightNetwork, materialBudgets, materialDemands } from '../freight.js';
import type { SliceParams } from '../params.js';
import { liveOrder, type WorksOrder } from '../works.js';
import type { Cohort, GameState } from '../state.js';
import { modifierFactor } from '../modifiers.js';
import type { TickContext } from '../step.js';

/** Cohorts whose work comes from the pool (§5.6): firms', and private and work-unit builds (b&c §13.3). */
export const pooledCohort = (c: Cohort) => c.firm !== undefined || c.builder === 'private' || c.builder === 'work_unit';

/** A firm cohort's crew at full pace (§5.6). */
/** A firm cohort's crew per month (§5.6). R9 (§5.8): live `cohort_crew` modifiers scale it; city works never. */
export const cohortCrew = (c: Cohort, p: SliceParams, s?: GameState) =>
  Math.max(1, Math.ceil(c.m2 * p.capacity.crew_per_m2 * (s ? modifierFactor(s, 'cohort_crew') : 1)));

/** The value of one month of work on a cohort, for GDP (§5.6): its m² × cost per m² ÷ its months of work. */
export function cohortMonthValue(c: Cohort, p: SliceParams): number {
  const per = isVillageFloor(c) ? p.village_build.build_cost_per_m2
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
  if (units > 0) ctx.events.push({ step: 'construction', kind: 'crew', detail: { area: x.area, units } });   // R4 (§5.11)
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

/** A firm cohort's crew units still to do, at most one month at full pace. */
function cohortRest(c: Cohort, p: SliceParams, s: GameState): number {
  const crew = cohortCrew(c, p, s);
  return Math.max(0, Math.min(crew, crew * ((c.workTotal ?? 1) - (c.workDone ?? 0)) - (c.crewBank ?? 0)));
}

/** R8d (§5.12): each area's crew-unit budget from its materials flow, and the month's freight events. */
function materials(ctx: TickContext, wc: WorksContent, wants: [number | undefined, number][]): Map<number, number> {
  const fc = wc.freight!, wanted = new Map<number, number>();
  for (const [a, u] of wants) if (a !== undefined && u > 0) wanted.set(a, (wanted.get(a) ?? 0) + u);
  const alloc = allocateFreight(fc, freightNetwork(ctx.state, fc), materialDemands(fc, wanted));
  ctx.events.push(...freightEvents('construction', alloc));
  return materialBudgets(fc, alloc);
}

/**
 * Allocate this month's pool (§5.6) and work the city's projects. Returns the crew units given to each firm cohort;
 * the construction step banks them. Order: priority, start month, firm cohorts before projects, id, then cohort order.
 */
export function allocatePool(ctx: TickContext, p: SliceParams, wc?: WorksContent): Map<Cohort, number> {
  const s = ctx.state;
  // one queue in priority order: firm cohorts and pooled projects share the pool; dedicated projects draw only cash,
  // but in the same order, so a low-priority dedicated project never pays ahead of a high-priority pooled one
  type Job = { pri: number; start: number; type: number; id: number; ord: number; area?: number; cohort?: Cohort; project?: Project; order?: WorksOrder };
  const jobs: Job[] = [];
  let ord = 0;
  // R3 (b&c §13.3): organic builds, the organic firms' among them, take the pool at growth.pool_priority
  const organic = PRIORITIES.indexOf(p.growth?.pool_priority ?? 'normal');
  for (const b of s.blocks) for (const c of b.cohorts) {
    if (c.stage !== 'under_construction' || !pooledCohort(c)) continue;
    if (c.firm === undefined) {
      jobs.push({ pri: organic, start: (c.due ?? s.date) - (c.workTotal ?? 0), type: 0, id: 0, ord: ord++, area: b.area, cohort: c });
      continue;
    }
    const f = s.firms.find((x) => x.id === c.firm);
    jobs.push({ pri: f?.origin === 'organic' ? organic : 1, start: f?.accepted ?? s.date, type: 0, id: c.firm, ord: ord++, area: b.area, cohort: c });
  }
  for (const x of s.fiscal.projects) {
    if (!liveProject(x)) continue;
    delete x.waiting;                                     // why it waits, and whether it is stalled, is this month's
    if (x.stage === 'stalled') x.stage = x.workDone > 0 || x.crewBank > 0 ? 'building' : 'committed';
    jobs.push({ pri: PRIORITIES.indexOf(x.priority), start: x.committed, type: 1, id: x.id, ord: ord++, area: x.area, project: x });
  }
  // R2 (b&c §13.2): works orders are the third job type; their views are computed once, before any work this month
  const month = wc && s.worksOrders.some(liveOrder) ? orderMonth(s, wc) : undefined;
  if (month) for (const o of s.worksOrders) {
    if (!liveOrder(o)) continue;
    delete o.waiting;
    const area = workArea(s, o);
    jobs.push({ pri: PRIORITIES.indexOf(o.priority), start: o.committed, type: 2, id: o.id, ord: ord++, ...(area !== undefined ? { area } : {}), order: o });
  }
  jobs.sort((a, b) => a.pri - b.pri || a.start - b.start || a.type - b.type || a.id - b.id || a.ord - b.ord);

  const frozen = s.fiscal.frozenUntil !== undefined && s.date <= s.fiscal.frozenUntil;
  // R8d (§5.12): construction materials from the mainland. Each area's crew-unit budget this month is what its
  // materials flow carries for the units its jobs would use at their pace; jobs draw it in queue order, as they draw
  // the pool, so a short area's spare units pass down the queue and nothing is lost
  const budget = wc?.freight ? materials(ctx, wc, jobs.map((j): [number | undefined, number] => {
    if (j.order) return [j.area, j.order.paused || frozen ? 0 : Math.min(wc.works.crew_per_order, month!.usable(j.order))];
    if (j.cohort) return [j.area, cohortRest(j.cohort, p, s)];
    const x = j.project!, k = x.contract !== undefined ? s.fiscal.contracts.find((c) => c.id === x.contract) : undefined;
    if (frozen || (k && s.date < k.starts)) return [j.area, 0];
    return [j.area, Math.min(k ? Math.min(k.crew, x.crew) : x.crew, x.crew * x.workTotal - delivered(x))];
  })) : undefined;
  const take = (area: number | undefined, u: number) => (budget && area !== undefined ? Math.max(0, Math.min(u, budget.get(area) ?? Infinity)) : u);
  const spend = (area: number | undefined, u: number) => { if (budget && area !== undefined && budget.has(area)) budget.set(area, budget.get(area)! - u); };

  const out = new Map<Cohort, number>();
  let left = poolSupply(ctx, p);
  for (const j of jobs) {
    if (j.order) {
      const o = j.order;
      if (o.paused) { o.waiting = 'paused'; continue; }
      if (frozen) { o.waiting = 'frozen'; continue; }
      const usable = month!.usable(o);
      if (usable === 0) { o.waiting = 'access'; continue; }
      const pace = Math.min(wc!.works.crew_per_order, usable), want = Math.min(pace, left, take(j.area, pace));
      const got = month!.affordable(o, want);
      if (got < pace) o.waiting = got < want ? 'finance' : 'capacity';
      const used = month!.work(o, got, ctx.events);
      left -= used;
      spend(j.area, used);
      continue;
    }
    if (j.cohort) {
      const c = j.cohort, crew = cohortCrew(c, p, s);
      // no more than the work left, so a final partial month passes its spare units down the queue
      const got = Math.max(0, Math.min(crew, left, cohortRest(c, p, s), take(j.area, crew)));
      out.set(j.cohort, got);
      left -= got;
      spend(j.area, got);
      continue;
    }
    const x = j.project!;
    // a fall from grace freezes the city's projects (§5.8): no work, no spending, no draw on the pool
    if (s.fiscal.frozenUntil !== undefined && s.date <= s.fiscal.frozenUntil) { x.waiting = 'frozen'; continue; }
    if (x.contract !== undefined) {                       // a dedicated contract: outside the pool
      const k = s.fiscal.contracts.find((c) => c.id === x.contract)!;
      if (s.date < k.starts) { x.waiting = 'mobilization'; continue; }
      const full = Math.min(k.crew, x.crew, x.crew * x.workTotal - delivered(x)), want = take(j.area, full);
      if (want === 0 && full > 0) { x.waiting = 'capacity'; continue; }   // R8d: no materials this month, not a stall
      const got = affordable(ctx, p, x, want);
      if (got < want) x.waiting = 'finance';
      else if (got < full) x.waiting = 'capacity';
      if (got === 0) { x.stage = 'stalled'; continue; }
      work(ctx, p, x, got);
      spend(j.area, got);
      continue;
    }
    const want = Math.min(x.crew, left, x.crew * x.workTotal - delivered(x), take(j.area, x.crew));
    const got = affordable(ctx, p, x, want);
    left -= got;
    spend(j.area, got);
    if (got < Math.min(x.crew, x.crew * x.workTotal - delivered(x))) x.waiting = got < want ? 'finance' : 'capacity';
    if (got === 0) { if (x.waiting === 'finance') x.stage = 'stalled'; continue; }
    work(ctx, p, x, got);
  }
  return out;
}
