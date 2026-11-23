/**
 * step(state, actions, rng, steps?): one monthly sub-step (PLAN §6.2, phase1-slice.md §5.1, §6).
 * Answers are applied first; an unanswered interrupting card pauses the turn; otherwise the tick runs in order.
 */
import type { Rng, Stream } from './rng.js';
import { cloneState, isFinished, type CardInstance, type GameState, type PlayerAction, type SubStep } from './state.js';
import { formatYM, type YM } from './ym.js';

export interface SimEvent { step: string; kind: string; detail?: Record<string, unknown> }
export interface MonthStats { date: YM }

export interface TickContext {
  state: GameState;
  rng: Stream;               // this step's own stream
  events: SimEvent[];
  raise(card: { card: string; options: string[]; interrupting: boolean }): CardInstance;
}
export interface TickStep { name: string; run(ctx: TickContext): void }

export type StepResult =
  | { status: 'advanced'; state: GameState; events: SimEvent[]; stats: MonthStats }
  | { status: 'paused'; state: GameState; pendingCards: CardInstance[] };

const noop = () => {};

/** The 14 steps of §6, in order. M1: all no-ops except statistics, which records the month. */
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
  { name: 'statistics', run: (ctx: TickContext) => { ctx.state.history.months.push(ctx.state.date); } },
  { name: 'reviews', run: noop },
]);

function applyAction(s: GameState, action: PlayerAction): void {
  if (action.type !== 'answer_card') throw new Error(`unknown action type ${(action as { type: string }).type}`);
  const k = s.pendingCards.findIndex((c) => c.id === action.instance);
  if (k < 0) throw new Error(`no pending card ${action.instance}`);
  const card = s.pendingCards[k]!;
  if (!card.options.includes(action.option)) throw new Error(`card ${card.id} has no option ${action.option}`);
  s.pendingCards.splice(k, 1);
  s.actionLog.push({ date: s.date, subStep: s.subStep, action: { ...action } });
}

export function step(state: GameState, actions: readonly PlayerAction[], rng: Rng,
  steps: readonly TickStep[] = TICK_STEPS): StepResult {
  if (isFinished(state)) throw new Error('the scenario has ended: no turns left');
  const s = cloneState(state);
  for (const a of actions) applyAction(s, a);

  const blocking = s.pendingCards.filter((c) => c.interrupting);
  if (blocking.length) return { status: 'paused', state: s, pendingCards: blocking };

  const events: SimEvent[] = [];
  let raised = 0;
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
  }

  const stats: MonthStats = { date: s.date };
  s.date += 1;
  if (s.subStep === 2) { s.subStep = 0; s.turn += 1; } else s.subStep = (s.subStep + 1) as SubStep;
  return { status: 'advanced', state: s, events, stats };
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
