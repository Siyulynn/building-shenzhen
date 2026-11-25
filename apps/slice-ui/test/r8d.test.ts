/** R8d (phase1-slice.md §5.12, §11.2): the road tier in the flyout, and the freight table in the Economy drawer. */
import { describe, expect, it } from 'vitest';
import type { Slice } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { newSession, type Session } from '../src/controller.js';
import { initialUi, renderDrawer, renderFlyout, type View } from '../src/render.js';
import { planGesture } from '../src/tools.js';
import { freightView } from '../src/views.js';

/** R9 (§5.8): without the tool gates, so these map-tool checks can use every tool from Turn 1. */
const loaded: Slice = loadSlice();
const slice: Slice = { ...loaded, tick: { ...loaded.tick, gates: undefined } };
const view = (x: Session, lang: 'en' | 'zh'): View => ({ slice, x, ui: initialUi(slice), lang });

describe('R8d the road tier and the freight table', () => {
  it('offers the tiers in the road flyout, and a drag along a start road with avenue chosen is an upgrade', () => {
    const x = newSession(slice);
    const fly = renderFlyout({ ...view(x, 'en'), ui: { ...initialUi(slice), tool: 'road' } });
    for (const c of ['track', 'street', 'avenue']) expect(fly).toContain(`data-cls="${c}"`);
    const opts = { use: 'industrial' as const, planOnly: false, facility: 'school' };
    const plan = planGesture(x, { ...opts, roadClass: 'avenue' }, { tool: 'road', from: [355, 346], to: [358, 346] });
    expect(plan.kind).toBe('actions');
    if (plan.kind === 'actions') expect(plan.actions).toEqual([{ type: 'build_road', path: [[355, 346], [358, 346]], class: 'avenue' }]);
    // a street over the street adds nothing
    expect(planGesture(x, opts, { tool: 'road', from: [355, 346], to: [358, 346] }).kind).toBe('refused');
  });

  it('lists the four gateways, bilingual in both languages, with their capacities', () => {
    const x = newSession(slice);
    const fv = freightView(x.state, slice)!;
    expect(fv.gateways.map((g) => g.id)).toEqual(['gateway.luohu', 'gateway.wenjindu', 'gateway.shenzhen_station', 'gateway.guangshen_road']);
    for (const lang of ['en', 'zh'] as const) {
      const d = renderDrawer({ ...view(x, lang), ui: { ...initialUi(slice), drawer: 'economy' } });
      expect(d).toContain('罗湖口岸 Luohu crossing');
      expect(d).toContain('30,000 / 90,000');
    }
  });
});
