/** The tick pipeline with the systems filled in from validated params (phase1-slice.md §5.2, §6). */
import type { SliceParams } from './params.js';
import { TICK_STEPS, type TickContext, type TickStep } from './step.js';
import { construction } from './systems/construction.js';
import { housing } from './systems/housing.js';
import { labour } from './systems/labour.js';
import { migration } from './systems/migration.js';
import { statistics } from './systems/statistics.js';
import { zoning, type Precedent } from './zones.js';

/** `precedents` from compilePrecedents (§5.3): content, never state. Without them no zone takes a historical name. */
export function createTickSteps(params: SliceParams, precedents: readonly Precedent[] = []): readonly TickStep[] {
  const impl: Record<string, (ctx: TickContext) => void> = {
    investment: zoning(params, precedents),           // M3a: names only; investors arrive with M3b
    construction: construction(params),
    labour: labour(params),
    housing: housing(params),
    migration: migration(params),
    statistics: statistics(),
  };
  return Object.freeze(TICK_STEPS.map((st) => (impl[st.name] ? { name: st.name, run: impl[st.name]! } : st)));
}
