/** The tick pipeline with the systems filled in from validated params (phase1-slice.md §5.2, §6). */
import { applyFiscalAction, isFiscalAction, refreshServicedShares, type FiscalContent } from './fiscal.js';
import type { SliceParams } from './params.js';
import type { GameState, PlayerAction } from './state.js';
import { TICK_STEPS, type TickContext, type TickStep } from './step.js';
import { construction } from './systems/construction.js';
import { finance } from './systems/finance.js';
import { housing } from './systems/housing.js';
import { labour } from './systems/labour.js';
import { migration } from './systems/migration.js';
import { production } from './systems/industry.js';
import { statistics } from './systems/statistics.js';
import { offers, type Buildable, type InvestorArchetype } from './investors.js';
import { zoning, type Precedent } from './zones.js';

/**
 * Content the tick reads, never stored in state (§5.3, §5.5, §5.6). Without precedents no zone takes a historical
 * name; without investor archetypes no offer is raised; without the fiscal content finance does nothing, no project
 * or team action is accepted, every cohort gets its month of work, and zones stay serviced (servicedShare absent).
 */
export interface TickContent {
  precedents?: readonly Precedent[]; investors?: readonly InvestorArchetype[]; buildable?: Buildable;
  fiscal?: FiscalContent;
}

/** Tick step 3: serviced shares (with the fiscal content), zone names, then investors look for sites (§5.3, §5.5, §5.6). */
function investment(params: SliceParams, content: TickContent) {
  const names = zoning(params, content.precedents ?? []);
  const offered = offers(params, content);
  return (ctx: TickContext): void => {
    if (content.fiscal) refreshServicedShares(ctx.state, content.buildable);
    names(ctx);
    offered(ctx);
  };
}

export function createTickSteps(params: SliceParams, content: TickContent = {}): readonly TickStep[] {
  const fc = content.fiscal;
  const impl: Record<string, (ctx: TickContext) => void> = {
    investment: investment(params, content),
    construction: construction(params, !!fc, content.buildable),
    labour: labour(params),
    housing: housing(params),
    migration: migration(params),
    production: production(params),
    ...(fc ? { finance: finance(params, fc) } : {}),
    statistics: statistics(params),
  };
  // the finance step owns the project and team actions (§5.6)
  const act = fc ? (s: GameState, a: PlayerAction): boolean => {
    if (!isFiscalAction(a)) return false;
    applyFiscalAction(s, params, fc, a, content.buildable);
    return true;
  } : undefined;
  return Object.freeze(TICK_STEPS.map((st) => {
    const run = impl[st.name];
    if (!run) return st;
    return st.name === 'finance' && act ? { name: st.name, run, act } : { name: st.name, run };
  }));
}
