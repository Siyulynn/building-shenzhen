/**
 * Playing quarters with a policy through runQuarter, the path the CLI and the UI share (phase1-slice.md §5.9).
 */
import type { Rng } from './rng.js';
import { isFinished, type CardInstance, type GameState, type PlayerAction } from './state.js';
import { runQuarter, type DecisionPolicy, type TickStep } from './step.js';

export interface PlayRecord {
  final: GameState;
  /** quarterEnds[k]: the state at the end of turn k (k = 0 is the first quarter) */
  quarterEnds: GameState[];
  /** every card the run raised that a policy saw (pending at a turn's start or a pause), in order first seen */
  cards: CardInstance[];
}

/**
 * Play up to `quarters` turns. At each turn's start the policy answers the pending cards and gives its turn actions;
 * a `paused` result's cards are answered before the quarter continues. Stops when the scenario is finished.
 */
export function playQuarters(s0: GameState, rng: Rng, steps: readonly TickStep[], policy: DecisionPolicy,
  quarters = s0.scenario.turns): PlayRecord {
  const seen = new Map<string, CardInstance>();
  const see = (s: GameState) => { for (const c of s.pendingCards) if (!seen.has(c.id)) seen.set(c.id, c); };
  const quarterEnds: GameState[] = [];
  const ask = (s: GameState): PlayerAction[] => {
    see(s);
    const acts = policy(s, s.pendingCards);
    const answered = new Set(acts.flatMap((a) => (a.type === 'answer_card' ? [a.instance] : [])));
    const left = s.pendingCards.filter((c) => c.interrupting && !answered.has(c.id));
    if (left.length) throw new Error(`the policy left interrupting cards unanswered: ${left.map((c) => c.id).join(', ')}`);
    return acts;
  };
  let s = s0;
  for (let q = 0; q < quarters; q++) {
    if (isFinished(s) && !s.pendingCards.some((c) => c.interrupting)) break;
    let r = runQuarter(s, ask(s), rng, steps);
    while (r.status === 'paused') r = runQuarter(r.state, ask(r.state), rng, steps);
    s = r.state;
    see(s);
    if (r.status === 'turn_end') quarterEnds.push(s);
    else break;                                         // finished
  }
  return { final: s, quarterEnds, cards: [...seen.values()] };
}

/** The state after `months` months of a played run, when that is a quarter's end the run reached. */
export function stateAfter(rec: PlayRecord, months: number): GameState | undefined {
  if (months % 3 !== 0 || months <= 0) return undefined;
  return rec.quarterEnds[months / 3 - 1];
}
