/** R8b (phase1-slice.md §5.3, §11.2): the zones flyout's intensity, and a drag that carries it. */
import { describe, expect, it } from 'vitest';
import { HIGH_INTENSITY_KEY, type Slice } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { newSession, type Session } from '../src/controller.js';
import { initialUi, renderFlyout, type View } from '../src/render.js';
import { planGesture } from '../src/tools.js';
import * as S from '../src/strings.js';

const slice: Slice = loadSlice();
const flyout = (x: Session, lang: 'en' | 'zh') =>
  renderFlyout({ slice, x, ui: { ...initialUi(slice), tool: 'zone' }, lang } satisfies View);
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('R8b the zone intensity', () => {
  it('offers low and standard; high is disabled with its reason until unlocked, in both languages', () => {
    const x = newSession(slice);
    for (const lang of ['en', 'zh'] as const) {
      const html = flyout(x, lang);
      expect(html).toContain('data-tier="low"');
      expect(html).toContain('data-tier="standard"');
      expect(html).not.toContain('data-tier="high"');
      expect(html).toContain(esc(S.T.highLocked[lang]));
      expect(html).not.toContain('data-use="public"');
    }
    const open: Session = { ...x, state: { ...x.state, events: { ...x.state.events, unlocked: [HIGH_INTENSITY_KEY] } } };
    expect(flyout(open, 'en')).toContain('data-tier="high"');
  });

  it('a drag with low chosen creates a low zone; standard adds no field', () => {
    const x = newSession(slice);
    const opts = { use: 'industrial' as const, planOnly: true, facility: 'school' };
    const g = { tool: 'zone' as const, from: [349, 370] as const, to: [351, 372] as const };
    const zoneAction = (p: ReturnType<typeof planGesture>) =>
      (p.kind === 'actions' ? p.actions.find((a) => a.type === 'create_zone') : undefined);
    expect(zoneAction(planGesture(x, { ...opts, intensity: 'low' }, g))).toMatchObject({ type: 'create_zone', intensity: 'low' });
    expect(zoneAction(planGesture(x, { ...opts, intensity: 'standard' }, g))).not.toHaveProperty('intensity');
  });
});
