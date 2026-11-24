/**
 * The UI's turn protocol (phase1-slice.md §11.1): pure, shaped like playQuarters. The session holds the state, the
 * run's Rng, the player's answers and queued turn actions, and the turn's start for the briefing. Nothing here calls
 * step to preview; submit is the only way into the sim. Its own messages are bilingual; an error thrown by sim-core is
 * shown as sim-core wrote it, in English, after the bilingual 'Could not apply' (§11.1).
 */
import {
  Rng, createInitialState, createTickSteps, isFinished, runQuarter,
  type GameState, type PlayerAction, type Slice, type TickStep,
} from '@sz/sim-core';
import { T, bi } from './strings.js';

export type Mode = 'turn' | 'paused' | 'over';
export interface Session {
  readonly slice: Slice;
  readonly steps: readonly TickStep[];
  readonly seed: number;
  readonly rng: Rng;                       // advanced in place by runQuarter; replaced from its save when a call throws
  readonly state: GameState;
  readonly mode: Mode;
  readonly turnStart: GameState;           // the state at this turn's start
  readonly lastTurnStart?: GameState;      // the previous turn's start: the briefing's deltas
  readonly answers: Readonly<Record<string, string>>;   // card instance → option
  readonly queue: readonly PlayerAction[]; // turn actions, sent with End turn
  readonly error?: string;
}

const modeOf = (s: GameState): Mode =>
  isFinished(s) && !s.pendingCards.some((c) => c.interrupting) ? 'over' : 'turn';

export function newSession(slice: Slice, seed = 1): Session {
  const state = createInitialState(slice.init);
  return { slice, steps: createTickSteps(slice.params, slice.tick), seed, rng: new Rng(seed), state, mode: modeOf(state),
    turnStart: state, answers: {}, queue: [] };
}

/** Pick an option for a pending card (or clear it with undefined). */
export function choose(x: Session, instance: string, option: string | undefined): Session {
  const card = x.state.pendingCards.find((c) => c.id === instance);
  if (!card) return { ...x, error: `${bi(T.noSuchCard)}: ${instance}` };
  if (option !== undefined && !card.options.includes(option)) return { ...x, error: `${bi(T.noSuchOption)}: ${option}` };
  const answers = { ...x.answers };
  if (option === undefined) delete answers[instance]; else answers[instance] = option;
  const { error: _e, ...rest } = x;
  return { ...rest, answers };
}

/** Queue a turn action for End turn. Only at a turn's start (§11.1). */
export function enqueue(x: Session, a: PlayerAction): Session {
  if (x.mode !== 'turn') return { ...x, error: bi(T.turnStartOnly) };
  if (a.type === 'answer_card') return choose(x, a.instance, a.option);
  const { error: _e, ...rest } = x;
  return { ...rest, queue: [...x.queue, a] };
}
export function dequeue(x: Session, k: number): Session {
  const { error: _e, ...rest } = x;
  return { ...rest, queue: x.queue.filter((_, i) => i !== k) };
}

/** The interrupting cards still without an answer: End turn or Continue waits for them. */
export const unanswered = (x: Session) => x.state.pendingCards.filter((c) => c.interrupting && x.answers[c.id] === undefined);

/** The actions submit would send: the answers, then (at a turn's start) the queue. */
export function outgoing(x: Session): PlayerAction[] {
  const answers: PlayerAction[] = x.state.pendingCards.flatMap((c) =>
    x.answers[c.id] !== undefined ? [{ type: 'answer_card' as const, instance: c.id, option: x.answers[c.id]! }] : []);
  return x.mode === 'turn' ? [...answers, ...x.queue] : answers;
}

/**
 * End turn (or Continue a paused quarter): one runQuarter call. The session adopts the returned state on every
 * status; a call that throws leaves the session as it was, with its Rng restored and the error shown.
 */
export function submit(x: Session): Session {
  if (x.mode === 'over') return { ...x, error: bi(T.ended) };
  const left = unanswered(x);
  if (left.length) return { ...x, error: `${bi(T.answerFirst)}: ${left.map((c) => c.id).join(', ')}` };
  const saved = x.rng.save();
  let r: ReturnType<typeof runQuarter>;
  try {
    r = runQuarter(x.state, outgoing(x), x.rng, x.steps);
  } catch (e) {
    return { ...x, rng: Rng.load(saved), error: e instanceof Error ? e.message : String(e) };
  }
  const base = { slice: x.slice, steps: x.steps, seed: x.seed, rng: x.rng, state: r.state, answers: {}, queue: [] };
  if (r.status === 'paused') {
    return { ...base, mode: 'paused', turnStart: x.turnStart, ...(x.lastTurnStart ? { lastTurnStart: x.lastTurnStart } : {}) };
  }
  if (r.status === 'turn_end') return { ...base, mode: modeOf(r.state), turnStart: r.state, lastTurnStart: x.turnStart };
  return { ...base, mode: 'over', turnStart: x.turnStart, lastTurnStart: x.turnStart };
}
