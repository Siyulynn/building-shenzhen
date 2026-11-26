/**
 * Timed modifiers (phase1-slice.md §5.8, revision plan §4.4, R9): a news record or a card option scales one existing
 * knob for some months. They live in `state.events.modifiers`; live ones on a target multiply. Pure, no RNG.
 */
import type { GameState } from './state.js';
import type { YM } from './ym.js';

/** The knobs a modifier may scale (a new target is a spec change). */
export const MODIFIER_TARGETS = ['investor_rate', 'scrutiny_gain', 'cohort_crew', 'wage_drift'] as const;
export type ModifierTarget = (typeof MODIFIER_TARGETS)[number];
export interface Modifier { source: string; target: ModifierTarget; factor: number; until: YM }

/** Whether a modifier is live this month. */
export const modifierLive = (s: GameState, m: Modifier): boolean => s.date <= m.until;

/** The product of every live modifier on a target; 1 with none. */
export function modifierFactor(s: GameState, target: ModifierTarget): number {
  let f = 1;
  for (const m of s.events.modifiers ?? []) if (m.target === target && modifierLive(s, m)) f *= m.factor;
  return f;
}

/** Drop the modifiers that have ended; the field is omitted when none is left (so a pre-R9 state is unchanged). */
export function dropExpired(s: GameState): void {
  const ms = s.events.modifiers;
  if (!ms) return;
  const live = ms.filter((m) => modifierLive(s, m));
  if (live.length) s.events.modifiers = live; else delete s.events.modifiers;
}
