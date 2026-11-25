/**
 * Tool gates (phase1-slice.md §5.8, revision plan §4.4, R9): content/slice/tools.yaml names, for each gate, the unlock
 * key that opens it. `applyTurnAction` refuses a gated action while its key is not in `events.unlocked`, so headless
 * policies, replays and the UI keep one schedule. Keys are set only by event `unlock` effects; no code reads a date.
 * Pure: no state change, no RNG.
 */
import { INTENSITIES, LAND_USES } from './enums.js';
import type { EventContent } from './events.js';
import { ROAD_CLASSES } from './params.js';
import type { GameState, LocalizedString, PlayerAction } from './state.js';
import { OFFERED_STRUCTURES, liveOrder } from './works.js';

/** Every gate id the sim knows (§5.8). A gate not in the content is open. */
export const GATE_IDS: readonly string[] = Object.freeze([
  ...LAND_USES.map((u) => `zone.${u}`), ...INTENSITIES.map((k) => `zone.intensity.${k}`),
  ...ROAD_CLASSES.map((c) => `road.${c}`), ...OFFERED_STRUCTURES.map((k) => `structure.${k}`),
  'formation.bulk', 'works.priority', 'policy.enforcement', 'policy.import_quota', 'team.contract', 'power.buy',
]);

/** One compiled gate: what it is called, the key it requires, and the event that sets that key (for the rail). */
export interface ToolGate { gate: string; requires: string; name: LocalizedString; opener: { id: string; name: LocalizedString } }
export type ToolContent = readonly ToolGate[];

/** The keys an event's `unlock` effects set, in content order: the first event that sets a key opens it. */
function openers(events: EventContent): Map<string, { id: string; name: LocalizedString }> {
  const out = new Map<string, { id: string; name: LocalizedString }>();
  for (const d of events) for (const e of [...d.effects, ...d.onAnswer]) {
    if (e.kind === 'unlock' && !out.has(e.key)) out.set(e.key, { id: d.id, name: d.name });
  }
  return out;
}

/** Validate content/slice/tools.yaml (§5.8): known gate ids, no duplicate, and a key some event unlocks. */
export function compileTools(raw: unknown, events: EventContent): ToolGate[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error('tools: expected a list');
  const by = openers(events), seen = new Set<string>();
  return raw.map((r: Record<string, any>, i): ToolGate => {
    if (!GATE_IDS.includes(r?.gate)) throw new Error(`tools[${i}]: unknown gate ${r?.gate}; one of ${GATE_IDS.join(', ')}`);
    if (seen.has(r.gate)) throw new Error(`tools: duplicate gate ${r.gate}`);
    seen.add(r.gate);
    if (typeof r.requires !== 'string' || !r.requires) throw new Error(`${r.gate}: requires names an unlock key`);
    if (typeof r.name?.zh !== 'string' || typeof r.name?.en !== 'string') throw new Error(`${r.gate}: name needs zh and en`);
    const opener = by.get(r.requires);
    if (!opener) throw new Error(`${r.gate}: no event unlocks ${r.requires}`);
    return { gate: r.gate, requires: r.requires, name: { zh: r.name.zh, en: r.name.en }, opener };
  });
}

/** The gates an action needs now (§5.8). */
export function gatesOf(s: GameState, a: PlayerAction): string[] {
  const out: string[] = [];
  // a priority or a pace other than normal needs works.priority (R9 §5.6: pace is gated with priority)
  const pri = (p?: string, k?: string) => {
    if ((p !== undefined && p !== 'normal') || (k !== undefined && k !== 'normal')) out.push('works.priority');
  };
  switch (a.type) {
    case 'create_zone':
      out.push(`zone.${a.use}`, `zone.intensity.${a.intensity ?? 'standard'}`);
      break;
    case 'edit_zone':
      if (a.use !== undefined) out.push(`zone.${a.use}`);
      if (a.intensity !== undefined) out.push(`zone.intensity.${a.intensity}`);
      break;
    case 'build_road':
      out.push(`road.${a.class ?? 'street'}`); pri(a.priority, a.pace);
      break;
    case 'place_structure':
      out.push(`structure.${a.kind}`); pri(a.priority, a.pace);
      break;
    case 'commit_works':
      // without bulk formation, one zone at a time: refused while another zone's service order is live
      if (s.worksOrders.some((o) => o.kind === 'service' && liveOrder(o) && o.zone !== a.zone)) out.push('formation.bulk');
      pri(a.priority, a.pace);
      break;
    case 'commit_project': pri(a.priority); break;
    case 'set_works_priority': case 'set_project_priority': case 'set_works_pace': out.push('works.priority'); break;
    case 'set_enforcement': out.push('policy.enforcement'); break;
    case 'set_import_quota': out.push('policy.import_quota'); break;   // R10d (§5.13)
    case 'contract_team': out.push('team.contract'); break;
    case 'buy_power': out.push('power.buy'); break;
    default: break;
  }
  return out;
}

/** Whether a gate is open now: not in the content, or its key is unlocked. */
export function gateOpen(s: GameState, gates: ToolContent, id: string): boolean {
  const g = gates.find((x) => x.gate === id);
  return !g || s.events.unlocked.includes(g.requires);
}

/** The first locked gate an action needs, or undefined. */
export function lockedGate(s: GameState, gates: ToolContent, a: PlayerAction): ToolGate | undefined {
  for (const id of gatesOf(s, a)) {
    const g = gates.find((x) => x.gate === id);
    if (g && !s.events.unlocked.includes(g.requires)) return g;
  }
  return undefined;
}

/** Why the gates refuse this action now (§5.8), or undefined when they allow it. */
export function gateRefusal(s: GameState, gates: ToolContent, a: PlayerAction): string | undefined {
  const g = lockedGate(s, gates, a);
  return g ? `${g.name.en} is locked: it opens with ${g.opener.name.en}` : undefined;
}
