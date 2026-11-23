/** The tick pipeline with the systems filled in from validated params (phase1-slice.md §5.2, §6). */
import type { SliceParams } from './params.js';
import { TICK_STEPS, type TickContext, type TickStep } from './step.js';
import { construction } from './systems/construction.js';
import { housing } from './systems/housing.js';
import { labour } from './systems/labour.js';
import { migration } from './systems/migration.js';
import { statistics } from './systems/statistics.js';

export function createTickSteps(params: SliceParams): readonly TickStep[] {
  const impl: Record<string, (ctx: TickContext) => void> = {
    construction: construction(params),
    labour: labour(params),
    housing: housing(params),
    migration: migration(params),
    statistics: statistics(),
  };
  return Object.freeze(TICK_STEPS.map((st) => (impl[st.name] ? { name: st.name, run: impl[st.name]! } : st)));
}
