/**
 * The opening beats (phase1-slice.md §5.8, R7): the scripted beats of turn 0 (`prologue_turn: 0`) fire as part of the
 * initial state, not in the first month's events step, so their card is pending before the player's first action.
 * Init has no RNG and no tick context, so a turn-0 beat may only unlock keys and raise its card (compileEvents
 * refuses any other effect on one). Each is recorded in `events.fired` at the start month, so the events step never
 * fires it again; its answer reaches the events step in the month it is given, as any card's does.
 */
import type { EventDef, EventContent } from './events.js';
import type { CardInstance, GameState } from './state.js';
import { formatYM } from './ym.js';

/** A beat compileEvents lets fire at init: scripted, turn 0, once. */
export const isOpeningBeat = (d: Pick<EventDef, 'trigger' | 'recurring'>): boolean =>
  'prologueTurn' in d.trigger && d.trigger.prologueTurn === 0 && !d.recurring;

/** Fire the turn-0 beats on a fresh state, in content order. Changes `s` in place. */
export function openingBeats(s: GameState, defs: EventContent): void {
  let raised = 0;
  const gated = (d: EventDef) =>
    (!d.requires || s.events.unlocked.includes(d.requires)) && (!d.until || !s.events.unlocked.includes(d.until));
  for (const d of defs) {
    if (!isOpeningBeat(d) || s.events.fired.some((f) => f.id === d.id) || !gated(d)) continue;
    s.events.fired.push({ id: d.id, date: s.date });
    for (const e of d.effects) {
      if (e.kind !== 'unlock') throw new Error(`${d.id}: a turn-0 beat fires at init and can only unlock (§5.8)`);
      if (!s.events.unlocked.includes(e.key)) s.events.unlocked.push(e.key);
    }
    if (!d.card) continue;
    const inst: CardInstance = { id: `${d.id}@${formatYM(s.date)}.${raised++}`, card: d.id,
      options: d.card.options.map((o) => o.id), interrupting: d.card.interrupting, raisedAt: s.date };
    if (!d.card.interrupting) inst.expires = s.date + (3 - s.subStep);   // as the events step: to the next turn
    s.pendingCards.push(inst);
  }
}
