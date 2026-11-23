/**
 * Headless decision policies (phase1-slice.md §5.8, §10): they answer every pending card, so a run never pauses.
 */
import { LOAN_CARD } from './fiscal.js';
import { SHORTCUT_CARD } from './investors.js';
import { runsOfCells } from './zones.js';
import type { CardInstance, GameState, PlayerAction } from './state.js';
import type { DecisionPolicy } from './step.js';

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
