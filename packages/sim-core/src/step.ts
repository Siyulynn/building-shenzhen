/**
 * step(state, actions, rng, steps?): one monthly sub-step (PLAN §6.2, phase1-slice.md §5.1, §6).
 * Answers are applied first; an unanswered interrupting card pauses the turn; otherwise the tick runs in order.
 */
import type { Rng, Stream } from './rng.js';
import { cloneState, isFinished, type CardInstance, type GameState, type PlayerAction, type SubStep } from './state.js';
import { ENFORCEMENT_LEVELS, PERMIT_REGIMES } from './enums.js';
import { formatYM, type YM } from './ym.js';
import { statistics } from './systems/statistics.js';
import { applyZoneAction, isZoneAction, type AvenueAt } from './zones.js';

export interface SimEvent { step: string; kind: string; detail?: Record<string, unknown> }
export interface MonthStats { date: YM }

export interface TickContext {
  state: GameState;
  rng: Stream;               // this step's own stream
  events: SimEvent[];
  raise(card: { card: string; options: string[]; interrupting: boolean }): CardInstance;
}
/**
 * A tick step. `act`, if present, owns turn actions beyond the core ones (§5.6): it returns true when it applied one,
 * and throws when the action is its kind but invalid.
 */
export interface TickStep {
  name: string; run(ctx: TickContext): void; act?(state: GameState, action: PlayerAction): boolean;
  /** R2 (b&c §13.2): called after every applied turn action, so a step can follow edits it does not own */
  afterAction?(state: GameState, action: PlayerAction): void;
  /** R8b (§5.3): whether an avenue touches these cells, for a high zone; the construction step gives it */
  avenueAt?: AvenueAt;
}

export type StepResult =
  | { status: 'advanced'; state: GameState; events: SimEvent[]; stats: MonthStats }
  | { status: 'paused'; state: GameState; pendingCards: CardInstance[] }
  | { status: 'finished'; state: GameState };

/**
 * One quarterly turn (PLAN §2): up to three sub-steps. `actions` apply before the first one.
 * - paused: a sub-step left an interrupting card mid-quarter; answer it and call again to finish the quarter.
 * - turn_end: the quarter is over. Interrupting cards from its last month are in `pendingCards`; they are
 *   answered in the next turn's planning, with that turn's actions.
 * - finished: the scenario is over and nothing is left to answer.
 */
export type QuarterResult =
  | { status: 'paused'; state: GameState; pendingCards: CardInstance[] }
  | { status: 'turn_end'; state: GameState; pendingCards: CardInstance[] }
  | { status: 'finished'; state: GameState };

const noop = () => {};

/**
 * The 14 steps of §6, in order, with no systems: all no-ops except statistics, which records the month's series.
 * `createTickSteps(params)` (ticks.ts) fills in the systems.
 */
export const TICK_STEPS: readonly TickStep[] = Object.freeze([
  { name: 'external', run: noop },
  { name: 'events', run: noop },
  { name: 'investment', run: noop },
  { name: 'construction', run: noop },
  { name: 'labour', run: noop },
  { name: 'production', run: noop },
  { name: 'housing', run: noop },
  { name: 'migration', run: noop },
  { name: 'needs', run: noop },
  { name: 'informal', run: noop },
  { name: 'finance', run: noop },
  { name: 'stability', run: noop },
  { name: 'statistics', run: statistics() },
  { name: 'reviews', run: noop },
]);

/** Actions are plain JSON: the log keeps its own deep copy, so a caller reusing an action cannot change it. */
const log = (s: GameState, action: PlayerAction) =>
  s.actionLog.push({ date: s.date, subStep: s.subStep, action: JSON.parse(JSON.stringify(action)) as PlayerAction });

/** A turn action (§4, §5.1): validated, applied and logged. Exported for previews, which apply to a clone. */
export function applyTurnAction(s: GameState, action: PlayerAction, steps: readonly TickStep[]): void {
  if (action.type === 'set_enforcement') {
    if (!(ENFORCEMENT_LEVELS as readonly string[]).includes(action.level)) throw new Error(`unknown enforcement ${action.level}`);
    s.policy.enforcement = action.level;
  } else if (action.type === 'set_permit_regime') {
    if (!(PERMIT_REGIMES as readonly string[]).includes(action.regime)) throw new Error(`unknown permit regime ${action.regime}`);
    s.policy.permitRegime = action.regime;
  } else if (isZoneAction(action)) {
    applyZoneAction(s, action, steps.find((st) => st.avenueAt)?.avenueAt);
  } else if (!steps.some((st) => st.act?.(s, action))) {
    throw new Error(`unknown action type ${(action as { type: string }).type}`);
  }
  for (const st of steps) st.afterAction?.(s, action);
  log(s, action);
}

function applyAnswer(s: GameState, action: PlayerAction & { type: 'answer_card' }): void {
  const k = s.pendingCards.findIndex((c) => c.id === action.instance);
  if (k < 0) throw new Error(`no pending card ${action.instance}`);
  const card = s.pendingCards[k]!;
  if (!card.options.includes(action.option)) throw new Error(`card ${card.id} has no option ${action.option}`);
  s.pendingCards.splice(k, 1);
  s.answered.push({ card, option: action.option });   // for its system's next tick (§5.5)
  log(s, action);
}

const blockingCards = (s: GameState) => s.pendingCards.filter((c) => c.interrupting);

export function step(state: GameState, actions: readonly PlayerAction[], rng: Rng,
  steps: readonly TickStep[] = TICK_STEPS): StepResult {
  // After the last month, cards raised by it (the closing event) can still be answered; no month runs.
  if (isFinished(state) && !actions.length && !blockingCards(state).length) {
    throw new Error('the scenario has ended: no turns left');
  }
  // past the last turn only answers are accepted: no turn is left for a turn action to act in (§5.1)
  if (isFinished(state)) {
    const late = actions.find((a) => a.type !== 'answer_card');
    if (late) throw new Error(`the scenario has ended: ${late.type} cannot be applied, only card answers`);
  }
  const s = cloneState(state);
  // answers first; turn actions only once no interrupting card is left (§5.1), logged after the answers
  for (const a of actions) if (a.type === 'answer_card') applyAnswer(s, a);
  const blocking = blockingCards(s);
  if (blocking.length) return { status: 'paused', state: s, pendingCards: blocking };
  for (const a of actions) if (a.type !== 'answer_card') applyTurnAction(s, a, steps);
  if (isFinished(s)) return { status: 'finished', state: s };

  const events: SimEvent[] = [];
  let raised = 0;
  // an end set by the events step (the closing visit, §5.8) stops the month there: the final state is the previous
  // month's, its date stays, and only the cards raised so far are left to answer
  const endedBefore = s.ended !== undefined;
  let halted = false;
  for (const st of steps) {
    const ctx: TickContext = {
      state: s, rng: rng.stream(st.name), events,
      raise: ({ card, options, interrupting }) => {
        if (!options.length) throw new Error(`card ${card} has no options`);
        const inst: CardInstance = { id: `${card}@${formatYM(s.date)}.${raised++}`, card, options: [...options],
          interrupting, raisedAt: s.date };
        s.pendingCards.push(inst);
        events.push({ step: st.name, kind: 'card_raised', detail: { instance: inst.id } });
        return inst;
      },
    };
    st.run(ctx);
    if (st.name === 'events' && !endedBefore && s.ended !== undefined) { halted = true; break; }
  }
  s.answered = [];                                       // every system has seen this month's answers

  const stats: MonthStats = { date: s.date };
  if (halted) return { status: 'advanced', state: s, events, stats };
  s.date += 1;
  if (s.subStep === 2) { s.subStep = 0; s.turn += 1; } else s.subStep = (s.subStep + 1) as SubStep;
  return { status: 'advanced', state: s, events, stats };
}

export function runQuarter(state: GameState, actions: readonly PlayerAction[], rng: Rng,
  steps: readonly TickStep[] = TICK_STEPS): QuarterResult {
  if (isFinished(state) && !actions.length && !blockingCards(state).length) return { status: 'finished', state };
  const turn = state.turn;
  let s = state;
  let acts = actions;
  for (;;) {
    const r = step(s, acts, rng, steps);
    acts = [];
    if (r.status !== 'advanced') return r;
    s = r.state;
    const blocking = blockingCards(s);
    if (s.turn !== turn) return { status: 'turn_end', state: s, pendingCards: blocking };
    if (blocking.length) return { status: 'paused', state: s, pendingCards: blocking };
  }
}

/** Answers the pending cards for a headless run (PLAN §6.2). Must answer every interrupting card. */
export type DecisionPolicy = (state: GameState, pending: CardInstance[]) => PlayerAction[];
export const firstOption: DecisionPolicy = (_s, pending) =>
  pending.map((c) => ({ type: 'answer_card', instance: c.id, option: c.options[0]! }));

/** Advance `months` months. Before each step the policy sees the pending cards and gives its answers. */
export function runMonths(state: GameState, months: number, rng: Rng, policy: DecisionPolicy = firstOption,
  steps: readonly TickStep[] = TICK_STEPS): GameState {
  let s = state;
  for (let done = 0; done < months; done++) {
    const r = step(s, policy(s, s.pendingCards), rng, steps);
    if (r.status === 'paused') throw new Error(`the policy left cards unanswered: ${r.pendingCards.map((c) => c.id).join(', ')}`);
    s = r.state;
  }
  return s;
}

/** Re-run from an initial state, feeding each logged answer back at its own month and sub-step. */
export function replay(initial: GameState, log: GameState['actionLog'], months: number, rng: Rng,
  steps: readonly TickStep[] = TICK_STEPS): GameState {
  let i = 0;
  const policy: DecisionPolicy = (s) => {
    const out: PlayerAction[] = [];
    while (i < log.length && log[i]!.date === s.date && log[i]!.subStep === s.subStep) out.push(log[i++]!.action);
    return out;
  };
  const s = runMonths(initial, months, rng, policy, steps);
  if (i !== log.length) throw new Error(`replay used ${i} of ${log.length} logged actions`);
  return s;
}
