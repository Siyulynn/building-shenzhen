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

/**
 * Never borrows and never takes a grey option: declines the loan, the shortcut and the co-financing; investors go into
 * existing premises, else into a fully serviced zone, else are declined; strict permits and high enforcement, no
 * sweep, austerity on a deficit card; otherwise the first option. In its first month it draws the same 12-cell
 * industrial zone in Shangbu as historicalPrologue and commits its site preparation.
 */
export const cautious: DecisionPolicy = (s: GameState, pending) => {
  const out = pending.map((c) => {
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
  if (s.turn === 0 && s.subStep === 0 && s.zones.length === 0) {
    const area = s.areas.find((a) => a.id === 7)!;
    out.push(
      { type: 'set_enforcement', level: 'high' },
      { type: 'create_zone', use: 'industrial', runs: runsOfCells([...area.cells.slice(0, 12)], s.grid.width) },
      { type: 'commit_project', template: 'project.site_preparation', zone: s.nextZoneId },
    );
  }
  return out;
};

/** Cards the aggressive player answers against the first option: every grey option, every loan. */
export const AGGRESSIVE_CHOICES: Readonly<Record<string, string>> = Object.freeze({
  'event.permit_choice': 'loose', 'event.temporary_residence': 'standard', 'event.typhoon': 'defer',
  'event.corps_advance': 'tents', 'event.fire': 'noted', 'event.escapes': 'noted', 'event.petition': 'noted',
  'event.readiness_check': 'rush', 'event.sweep': 'sweep', 'event.corps_deployment': 'accept',
  [COFINANCING_CARD]: 'accept', [LOAN_CARD]: 'take', [DEFICIT_CARD]: 'borrow_short',
});
/**
 * The aggressive player's build list, committed one a turn while money for projects covers it (§5.9): power and water
 * for its two industrial zones first, then roads, then more power. An entry repeated n times is built n times.
 */
export const AGGRESSIVE_BUILDS: readonly { template: string; area: number }[] = Object.freeze([
  ...[7, 5].flatMap((area) => ['project.power_line', 'project.water_main'].map((template) => ({ template, area }))),
  ...[7, 5, 2].map((area) => ({ template: 'project.road_link', area })),
  ...[7, 5, 7, 5].map((area) => ({ template: 'project.power_line', area })),
]);
/** The pool teams the aggressive player keeps under contract while money for projects covers a year of their cost. */
export const AGGRESSIVE_TEAMS: readonly string[] = Object.freeze(['team.engineering_corps', 'team.outside_soe']);

/**
 * Takes every grey option: the loan and the co-financing; every investor and shortcut at its first site; loose
 * permits and low enforcement; a sweep every October; borrow_short on a deficit card. In its first month it draws
 * 24-cell industrial zones in Shangbu (area 7) and Sungang (area 5) and commits site preparation in both; at each
 * turn's start it commits the next project of AGGRESSIVE_BUILDS while money for projects and the forex quota cover it.
 */
export function aggressive(p: SliceParams): DecisionPolicy {
  return (s: GameState, pending) => {
    const out = pending.map((c) => {
      if (isInvestor(c) || c.card === SHORTCUT_CARD) return answer(c, firstAccept(c) ?? pick(c));
      return answer(c, pick(c, AGGRESSIVE_CHOICES[c.card]));
    });
    // past the last turn only answers are accepted (§5.1): a closing card can still be pending
    if (s.subStep !== 0 || isFinished(s)) return out;
    if (s.turn === 0 && s.zones.length === 0) {
      const zone = s.nextZoneId;
      const runs = (id: number) => runsOfCells([...s.areas.find((a) => a.id === id)!.cells.slice(0, 24)], s.grid.width);
      out.push(
        { type: 'set_enforcement', level: 'low' },
        { type: 'create_zone', use: 'industrial', runs: runs(7) },
        { type: 'create_zone', use: 'industrial', runs: runs(5) },
        { type: 'commit_project', template: 'project.site_preparation', zone },
        { type: 'commit_project', template: 'project.site_preparation', zone: zone + 1 },
      );
      return out;
    }
    // the next entry not yet built as often as the list asks
    const asked = new Map<string, number>();
    const next = AGGRESSIVE_BUILDS.find((b) => {
      const k = `${b.template}@${b.area}`;
      asked.set(k, (asked.get(k) ?? 0) + 1);
      return s.fiscal.projects.filter((x) => x.template === b.template && x.area === b.area && x.stage !== 'cancelled').length < asked.get(k)!;
    });
    let money = moneyForProjects(s, p);
    if (next) {
      const pp = p.projects[next.template]!;
      if (money >= (pp.budget ?? 0) && (pp.forex_usd ?? 0) <= s.fiscal.balances.forex) {
        out.push({ type: 'commit_project', template: next.template, area: next.area });
        money -= pp.budget ?? 0;
      }
    }
    for (const team of AGGRESSIVE_TEAMS) {
      const tp = p.teams[team];
      if (!tp || s.fiscal.contracts.some((c) => c.team === team && contractLive(s, c))) continue;
      if (money >= 12 * tp.cost_per_month) {
        out.push({ type: 'contract_team', team, mode: 'pool' });
        money -= 12 * tp.cost_per_month;
      }
    }
    return out;
  };
}

/** A uniformly random option for each pending card, from its own generator (never the sim's streams). */
export function randomPolicy(seed: number): DecisionPolicy {
  const rng = new Rng(seed).stream('random_policy');
  return (_s, pending) => pending.map((c) => answer(c, c.options[rng.int(c.options.length)]!));
}

export const POLICY_NAMES = ['default', 'decline_all', 'historical_prologue', 'cautious', 'aggressive', 'random'] as const;
export type PolicyName = (typeof POLICY_NAMES)[number];
/** §10's policies by name. A random policy draws from `seed`. */
export function policyNamed(name: string, p: SliceParams, seed = 1): DecisionPolicy {
  switch (name as PolicyName) {
    case 'default': return firstOption;
    case 'decline_all': return declineAll;
    case 'historical_prologue': return historicalPrologue;
    case 'cautious': return cautious;
    case 'aggressive': return aggressive(p);
    case 'random': return randomPolicy(seed);
    default: throw new Error(`unknown policy ${name}; one of ${POLICY_NAMES.join(', ')}`);
  }
}
