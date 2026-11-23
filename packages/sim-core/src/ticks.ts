/** The tick pipeline with the systems filled in from validated params (phase1-slice.md §5.2, §6). */
import type { SliceParams } from './params.js';
import { TICK_STEPS, type TickContext, type TickStep } from './step.js';
import { construction } from './systems/construction.js';
import { housing } from './systems/housing.js';
import { labour } from './systems/labour.js';
import { migration } from './systems/migration.js';
import { production } from './systems/industry.js';
import { statistics } from './systems/statistics.js';
import { zoning, type Precedent } from './zones.js';

/**
 * Content the tick reads, never stored in state (§5.3, §5.5). Without precedents no zone takes a historical name;
 * without investor archetypes no offer is raised.
 */
export interface TickContent { precedents?: readonly Precedent[] }

export function createTickSteps(params: SliceParams, content: TickContent = {}): readonly TickStep[] {
  const impl: Record<string, (ctx: TickContext) => void> = {
    investment: zoning(params, content.precedents ?? []),
    construction: construction(params),
    labour: labour(params),
    housing: housing(params),
    migration: migration(params),
    production: production(params),
    statistics: statistics(params),
  };
  return Object.freeze(TICK_STEPS.map((st) => (impl[st.name] ? { name: st.name, run: impl[st.name]! } : st)));
}
