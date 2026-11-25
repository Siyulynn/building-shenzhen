/**
 * Headless decision policies (phase1-slice.md §5.8, §10): they answer every pending card, so a run never pauses.
 */
import { DEFICIT_CARD, LOAN_CARD, contractLive, moneyForProjects } from './fiscal.js';
import { SHORTCUT_CARD } from './investors.js';
import type { SliceParams } from './params.js';
import { Rng } from './rng.js';
import { runsOfCells } from './zones.js';
import { isFinished, type CardInstance, type GameState, type PlayerAction } from './state.js';
import { firstOption, type DecisionPolicy } from './step.js';
import type { TickContent } from './ticks.js';
import { gateAllows, planWorks, planZones, type MapPlan } from './mapPlan.js';

/** The co-financing card of the prologue's briefing, and the prologue's first-project card (content/slice/events.yaml). */
export const COFINANCING_CARD = 'event.cofinancing';
export const FIRST_PROJECT_CARD = 'event.first_project';

const answer = (c: CardInstance, option: string): PlayerAction => ({ type: 'answer_card', instance: c.id, option });
/** An investor's card carries its offer; a shortcut's carries one too, but is its own kind. */
const isInvestor = (c: CardInstance) => c.card !== SHORTCUT_CARD && c.payload?.offer !== undefined;

/** Decline every investor, shortcut, co-financing and loan; otherwise the first option. */
export const declineAll: DecisionPolicy = (_s, pending) => pending.map((c) =>
  answer(c, (isInvestor(c) || c.card === SHORTCUT_CARD || c.card === LOAN_CARD || c.card === COFINANCING_CARD)
    && c.options.includes('decline') ? 'decline' : c.options[0]!));

/**
 * The scripted plan for the prologue snapshot (§9.1): the first project is the road toward Luohu; investors go into
 * existing premises when they fit, else are declined; it takes the loan and the co-financing; and in its first month
 * it draws a 12-cell industrial zone in Shangbu (area 7) and commits a power line there and the zone's site
 * preparation. It applies no template zone.
 */
export const historicalPrologue: DecisionPolicy = (s: GameState, pending) => {
  const out = pending.map((c) => {
    if (isInvestor(c)) return answer(c, c.options.find((o) => o.startsWith('accept:premises:')) ?? 'decline');
    if (c.card === SHORTCUT_CARD) return answer(c, 'decline');
    if (c.card === LOAN_CARD) return answer(c, 'take');
    if (c.card === COFINANCING_CARD && c.options.includes('accept')) return answer(c, 'accept');
    if (c.card === FIRST_PROJECT_CARD && c.options.includes('project.road_link')) return answer(c, 'project.road_link');
    return answer(c, c.options[0]!);
  });
  if (s.turn === 0 && s.subStep === 0 && s.zones.length === 0) {
    const area = s.areas.find((a) => a.id === 7)!;
    const zone = s.nextZoneId;
    out.push(
      { type: 'create_zone', use: 'industrial', runs: runsOfCells([...area.cells.slice(0, 12)], s.grid.width) },
      { type: 'commit_project', template: 'project.power_line', area: 7 },
      { type: 'commit_project', template: 'project.site_preparation', zone },
    );
  }
  // The Q1 budget briefing: after the loan, prepare a second block so the prologue spends as a city that is building.
  if (s.turn === 4 && s.subStep === 0 && s.zones.length === 1) {
    const area = s.areas.find((a) => a.id === 7)!;
    const zone = s.nextZoneId;
    out.push(
      { type: 'create_zone', use: 'industrial', runs: runsOfCells([...area.cells.slice(12, 24)], s.grid.width) },
      { type: 'commit_project', template: 'project.site_preparation', zone },
    );
  }
  return out;
};

// ---- M6a (§5.9): the CLI's policies ----

/** The option `want` if the card has it, else its first option. */
const pick = (c: CardInstance, want?: string) => (want !== undefined && c.options.includes(want) ? want : c.options[0]!);
const firstAccept = (c: CardInstance) => c.options.find((o) => o.startsWith('accept:'));

/** Cards the cautious player answers against the first option: it never borrows, never takes a grey option. */
export const CAUTIOUS_CHOICES: Readonly<Record<string, string>> = Object.freeze({
  'event.permit_choice': 'strict', 'event.temporary_residence': 'strict', 'event.sweep': 'no_sweep',
  [LOAN_CARD]: 'decline', [COFINANCING_CARD]: 'decline', [DEFICIT_CARD]: 'austerity',
});

/** The cautious player's card answers (§5.9): investors go into existing premises, else a fully serviced zone. */
export const cautiousAnswers: DecisionPolicy = (s: GameState, pending) => pending.map((c) => {
  if (isInvestor(c)) {
    const zoneOk = (o: string) => {
      const z = s.zones.find((x) => `accept:zone:${x.id}` === o);
      return !!z && (z.servicedShare ?? 1) >= 1;
    };
    return answer(c, c.options.find((o) => o.startsWith('accept:premises:')) ?? c.options.find(zoneOk) ?? 'decline');
  }
  if (c.card === SHORTCUT_CARD) return answer(c, 'decline');
  return answer(c, pick(c, CAUTIOUS_CHOICES[c.card]));
});

/** Cards the aggressive player answers against the first option: every grey option, every loan. */
export const AGGRESSIVE_CHOICES: Readonly<Record<string, string>> = Object.freeze({
  'event.permit_choice': 'loose', 'event.temporary_residence': 'standard', 'event.typhoon': 'defer',
  'event.corps_advance': 'tents', 'event.fire': 'noted', 'event.escapes': 'noted', 'event.petition': 'noted',
  'event.readiness_check': 'rush', 'event.sweep': 'sweep', 'event.corps_deployment': 'accept',
  [COFINANCING_CARD]: 'accept', [LOAN_CARD]: 'take', [DEFICIT_CARD]: 'borrow_short',
});
/** The aggressive player's card answers: every investor and shortcut at its first site, every grey option. */
export const aggressiveAnswers: DecisionPolicy = (_s, pending) => pending.map((c) => {
  if (isInvestor(c) || c.card === SHORTCUT_CARD) return answer(c, firstAccept(c) ?? pick(c));
  return answer(c, pick(c, AGGRESSIVE_CHOICES[c.card]));
});
/** The historical player's card answers: historicalPrologue's (premises or decline, the loan, the co-financing). */
export const historicalAnswers: DecisionPolicy = (s, pending) => historicalPrologue(s, pending)
  .filter((a) => a.type === 'answer_card');

// ---- R6 (§5.9): the map-first plans ----

/** The cautious plan: one small industrial zone and a dormitory block in Shangbu, a quarter of the crews, little power. */
export const CAUTIOUS_PLAN: MapPlan = Object.freeze<MapPlan>({
  zones: [{ use: 'industrial', area: 7, cells: 12 }, { use: 'residential', area: 7, cells: 4 }],
  roads: [[[385, 370], [395, 370]]], crew_share: 0.25, room_ahead_m2: 10_000,
  utilities: { headroom_jobs: 100, max_sources: 2, import_kw: 500, import_from_turn: 4 }, facilities: [], teams: [], reserve: 300_000,
});
/**
 * R8d (§5.12): the corridor from Shangbu to the Luohu yard, along the Guangshen and Jianshe roads, as an avenue: in
 * three legs, each committed when the money covers it, once the plan's outbound roads are built.
 */
const CORRIDOR_UPGRADES: MapPlan['upgrades'] = [
  { path: [[378, 352], [380, 352], [380, 363]], class: 'avenue' }, { path: [[380, 363], [384, 363], [384, 377]], class: 'avenue' },
  { path: [[384, 377], [386, 377], [386, 390]], class: 'avenue' }];
/**
 * The aggressive plan: industrial zones in Shangbu (area 7) and Sungang (area 5), dormitories in Shangbu, shops in
 * the market town; a road south through Shangbu and one east into Dongmen–Wenjindu (area 4); half the crews on
 * servicing; power and water a year ahead; a school; both pool teams.
 */
export const AGGRESSIVE_PLAN: MapPlan = Object.freeze<MapPlan>({
  zones: [{ template: 'precedent.zone.shangbu_industrial' }, { use: 'residential', area: 7, cells: 8 }, { use: 'commercial', area: 1, cells: 4 },
    { use: 'industrial', area: 5, cells: 16 }],
  roads: [[[365, 353], [365, 372], [355, 372]], [[355, 373], [355, 376], [349, 376]], [[355, 371], [355, 369], [351, 369]]],
  upgrades: CORRIDOR_UPGRADES.map((u) => ({ ...u, from_turn: 12 })),   // R8d: from turn 12, once it has met the limit
  crew_share: 0.5, room_ahead_m2: 40_000,
  utilities: { headroom_jobs: 300, max_sources: 8, import_kw: 1000, import_from_turn: 8, station_turn: 9 }, facilities: [['school', 1]],
  teams: ['team.engineering_corps', 'team.outside_soe'], reserve: 0,
});
/**
 * The historical plan: the Shangbu template zone (§5.3), reached by a road south from the Guangshen road, with
 * dormitories beside the road and shops in the market town; a third of the crews; a school in the town.
 */
export const HISTORICAL_PLAN: MapPlan = Object.freeze<MapPlan>({
  zones: [{ template: 'precedent.zone.shangbu_industrial' }, { use: 'residential', area: 7, cells: 6 }, { use: 'commercial', area: 1, cells: 4 }],
  roads: [[[365, 353], [365, 372], [355, 372]], [[355, 373], [355, 376], [349, 376]], [[355, 371], [355, 369], [351, 369]]],
  upgrades: CORRIDOR_UPGRADES,
  crew_share: 0.34, room_ahead_m2: 30_000,
  utilities: { headroom_jobs: 200, max_sources: 8, import_kw: 1000, import_from_turn: 2, station_turn: 6 }, facilities: [['school', 1]],
  teams: ['team.engineering_corps'], reserve: 0,
});

/**
 * A map-first policy (§5.9): `answers` answers the cards; in its first month it gives `first` and draws the plan's
 * zones, and at each later turn's start it gives the plan's works (mapPlan.ts). Nothing goes through M4's projects.
 * R9 (§5.8): what a tool gate holds back waits for it: a gated zone is drawn, and `first`'s enforcement level set, at
 * the first turn's start its gate is open.
 */
export function mapPolicy(answers: DecisionPolicy, plan: MapPlan, p: SliceParams, tick: TickContent,
  first: readonly PlayerAction[] = []): DecisionPolicy {
  return (s, pending) => {
    const out = answers(s, pending);
    // past the last turn only answers are accepted (§5.1): a closing card can still be pending
    if (s.subStep !== 0 || isFinished(s)) return out;
    const firsts = first.filter((a) => gateAllows(s, tick, a));
    if (s.turn === 0 && s.zones.length === 0) return [...out, ...firsts, ...planZones(s, tick, plan)];
    // R9: an enforcement level the gate held back at the start, given once it opens (nothing else sets it)
    const held = firsts.filter((a) => a.type === 'set_enforcement' && a.level !== s.policy.enforcement);
    return [...out, ...held, ...planZones(s, tick, plan, true), ...planWorks(s, tick, p, plan)];
  };
}

/** Never borrows and never takes a grey option; strict permits and high enforcement; the cautious plan. */
export const cautious = (p: SliceParams, tick: TickContent): DecisionPolicy =>
  mapPolicy(cautiousAnswers, CAUTIOUS_PLAN, p, tick, [{ type: 'set_enforcement', level: 'high' }]);
/** Takes every grey option, the loan and the co-financing; loose permits and low enforcement; the aggressive plan. */
export const aggressive = (p: SliceParams, tick: TickContent): DecisionPolicy =>
  mapPolicy(aggressiveAnswers, AGGRESSIVE_PLAN, p, tick, [{ type: 'set_enforcement', level: 'low' }]);
/** historicalPrologue's answers with the historical plan: the CLI's historical_prologue (§5.9). */
export const historical = (p: SliceParams, tick: TickContent): DecisionPolicy =>
  mapPolicy(historicalAnswers, HISTORICAL_PLAN, p, tick);

/** A uniformly random option for each pending card, from its own generator (never the sim's streams). */
export function randomPolicy(seed: number): DecisionPolicy {
  const rng = new Rng(seed).stream('random_policy');
  return (_s, pending) => pending.map((c) => answer(c, c.options[rng.int(c.options.length)]!));
}

export const POLICY_NAMES = ['default', 'decline_all', 'historical_prologue', 'cautious', 'aggressive', 'random'] as const;
export type PolicyName = (typeof POLICY_NAMES)[number];
/**
 * §10's policies by name. A random policy draws from `seed`. The map-first ones (cautious, aggressive,
 * historical_prologue) read the slice's tick content: the start network, the buildable layer and the precedents.
 */
export function policyNamed(name: string, p: SliceParams, seed = 1, tick?: TickContent): DecisionPolicy {
  const map = () => {
    if (!tick?.network) throw new Error(`policy ${name} plays from the map: it needs the slice's tick content`);
    return tick;
  };
  switch (name as PolicyName) {
    case 'default': return firstOption;
    case 'decline_all': return declineAll;
    case 'historical_prologue': return historical(p, map());
    case 'cautious': return cautious(p, map());
    case 'aggressive': return aggressive(p, map());
    case 'random': return randomPolicy(seed);
    default: throw new Error(`unknown policy ${name}; one of ${POLICY_NAMES.join(', ')}`);
  }
}
