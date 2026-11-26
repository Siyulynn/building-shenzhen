/** R9 (phase1-slice §11.2): locked tools greyed with their opener, the works pace, the news and the live modifiers. */
import { describe, expect, it } from 'vitest';
import { formatYM, type Slice } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { newSession, type Session } from '../src/controller.js';
import { DRAWER_BODY, initialUi, renderBriefing, renderFlyout, renderPreview, renderRail, type View } from '../src/render.js';
import * as S from '../src/strings.js';
import { planGesture, type ToolOptions } from '../src/tools.js';
import { actionLabel, gateLock, modifiersView, newsView } from '../src/views.js';

const slice: Slice = loadSlice();
const view = (x: Session, tool: View['ui']['tool'] = 'select', lang: 'en' | 'zh' = 'en', opts: Partial<ToolOptions> = {}): View =>
  ({ slice, x, ui: { ...initialUi(slice), tool, opts: { ...initialUi(slice).opts, ...opts } }, lang });
const opened = (x: Session, ...keys: string[]): Session =>
  ({ ...x, state: { ...x.state, events: { ...x.state.events, unlocked: [...x.state.events.unlocked, ...keys] } } });
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const opener = (gate: string) => slice.tick.gates!.find((g) => g.gate === gate)!;

describe('R9 locked tools (§11.2)', () => {
  it('greys a locked tool on the rail with an unlock-later tooltip, in both languages, and frees it once its key is set', () => {
    const x = newSession(slice);
    for (const lang of ['en', 'zh'] as const) {
      const rail = renderRail(view(x, 'select', lang));
      expect(rail).toMatch(/class="tool locked" data-act="tool" data-tool="power" disabled/);
      expect(rail).toContain(esc(S.T.unlockLater[lang]));
    }
    const open = opened(x, opener('structure.power_substation').requires);
    expect(renderRail(view(open))).not.toMatch(/data-tool="power" disabled/);
    expect(gateLock(open.state, slice, 'structure.power_substation')).toBeUndefined();
  });

  it('greys a locked zone use and road class in the flyout, never hiding them', () => {
    const x = newSession(slice);
    const zone = renderFlyout(view(x, 'zone'));
    expect(zone).not.toContain('data-use="residential"');
    expect(zone).toContain(esc(S.T.unlockLater.en));
    expect(zone).toContain('data-use="industrial"');
    const road = renderFlyout(view(x, 'road'));
    expect(road).not.toContain('data-cls="avenue"');
    expect(road).toContain(esc(S.T.unlockLater.en));
    expect(road).toContain('data-cls="street"');
  });
});

describe('R9 locked Govern controls (§11.2)', () => {
  it('greys the team contract and the power purchase until their keys are set', () => {
    const x = newSession(slice);
    const building = DRAWER_BODY.building(view(x)), economy = DRAWER_BODY.economy(view(x));
    expect(building).toContain(esc(S.T.unlockLater.en));
    expect(economy).toContain(esc(S.T.unlockLater.en));
    expect(economy).not.toContain('data-act="buyPower"');
    const open = opened(x, opener('team.contract').requires, opener('power.buy').requires);
    expect(DRAWER_BODY.economy(view(open))).toContain('data-act="buyPower"');
    expect(DRAWER_BODY.building(view(open))).not.toContain(esc(S.T.unlockLater.en));
  });
});

describe('R9 the works pace in the flyout and preview (§5.6, §11.2)', () => {
  it('offers Push and All-out greyed until works.priority opens', () => {
    const x = newSession(slice);
    const lockedHtml = renderFlyout(view(x, 'road'));
    expect(lockedHtml).toContain('data-pace="normal"');
    expect(lockedHtml).not.toContain('data-pace="push"');
    expect(lockedHtml).toContain(esc(S.T.unlockLater.en));
    const open = opened(x, opener('works.priority').requires);
    expect(renderFlyout(view(open, 'road'))).toContain('data-pace="all_out"');
  });

  it('a paced road carries its pace, and its preview gives the months saved and the extra yuan', () => {
    const x = opened(newSession(slice), opener('works.priority').requires);
    const g = { tool: 'road' as const, from: [360, 347] as const, to: [360, 369] as const };
    const base: ToolOptions = { use: 'industrial', planOnly: false, facility: 'school' };
    const normal = planGesture(x, base, g), push = planGesture(x, { ...base, pace: 'push' }, g);
    expect(normal.kind).toBe('actions');
    expect(push.kind).toBe('actions');
    if (normal.kind !== 'actions' || push.kind !== 'actions') return;
    expect(push.actions[0]).toMatchObject({ type: 'build_road', pace: 'push' });
    expect(normal.preview.pace).toBeUndefined();
    expect(push.preview.pace!.extraYuan).toBe(push.preview.budget - normal.preview.budget);
    expect(push.preview.pace!.extraYuan).toBeGreaterThan(0);
    expect(push.preview.pace!.monthsSaved).toBe(normal.preview.months - push.preview.months);
    expect(push.preview.pace!.monthsSaved).toBeGreaterThan(0);
    const html = renderPreview(push, { x, lang: 'en' });
    expect(html).toContain(S.T.monthsSaved.en);
    expect(html).toContain(S.T.extraYuan.en);
    // locked, the same gesture is refused with sim-core's reason
    const refused = planGesture(newSession(slice), { ...base, pace: 'push' }, g);
    expect(refused).toMatchObject({ kind: 'refused' });
    expect(actionLabel(x.state, slice, [{ type: 'set_works_pace', order: 1, pace: 'push' }], 0).en).toContain(S.PACE.push!.en);
  });
});

describe('R9 the briefing: news and live modifiers (§11.2)', () => {
  it('on Turn 1 shows the opening letter in full under its desk, without the office note or a fiction label', () => {
    const x = newSession(slice);
    const news = newsView(x.state, slice, x.lastTurnStart);
    const letters = news.flatMap((g) => g.items).filter((i) => i.letter);
    expect(letters.map((i) => i.id)).toEqual(['news.1979q1.assignment']);
    expect(letters.every((i) => i.text !== undefined)).toBe(true);
    const note = slice.tick.events.find((d) => d.id === 'news.1979q1.office_note')!;
    for (const lang of ['en', 'zh'] as const) {
      const html = renderBriefing(view(x, 'select', lang));
      expect(html).not.toContain(esc(note.name[lang]));          // the context now lives in old Liang's guide
      expect(html.toLowerCase()).not.toContain('fiction');        // no fiction disclaimer on the letter
      expect(html).toContain('letterhead');
      for (const g of news) expect(html).toContain(esc(S.DESK[g.desk]![lang]));
      expect(html).toContain(esc(S.T.noModifiers[lang]));
    }
  });

  it('shows at most a lead in full and two headlines, and nothing a previous briefing showed', () => {
    const x = newSession(slice);
    const ids = slice.tick.events.filter((d) => d.family === 'news' && d.news!.tone !== 'opening').map((d) => d.id);
    expect(ids.length).toBeGreaterThan(3);
    const state = { ...x.state, events: { ...x.state.events, fired: [...x.state.events.fired, ...ids.map((id) => ({ id, date: x.state.date }))] } };
    const items = newsView(state, slice, x.state).flatMap((g) => g.items);
    expect(items.length).toBe(3);
    expect(items.filter((i) => i.text !== undefined).length).toBe(1);
    expect(items[0]!.id).toBe(ids[0]);
    expect(newsView(state, slice, state)).toEqual([]);
  });

  it('lists a live modifier with its target, factor, quarters left and source', () => {
    const x = newSession(slice);
    const until = x.state.date + 5;                  // this month and five more: two quarters
    const state = { ...x.state, events: { ...x.state.events, modifiers: [{ source: 'news.1981q4.chenyun', target: 'investor_rate' as const, factor: 0.9, until }] } };
    const [m] = modifiersView(state, slice);
    expect(m).toMatchObject({ target: S.MODIFIER_TARGET.investor_rate, factor: 0.9, quartersLeft: 2 });
    expect(m!.source.en).toBe(slice.tick.events.find((d) => d.id === 'news.1981q4.chenyun')!.name.en);
    const html = renderBriefing(view({ ...x, state }, 'select', 'en'));
    expect(html).toContain(`${S.MODIFIER_TARGET.investor_rate!.en} ×0.9 · 2 ${S.T.quartersLeft.en}`);
    expect(modifiersView({ ...state, date: until + 1 }, slice)).toEqual([]);
    expect(formatYM(until)).toBeTruthy();
  });
});
