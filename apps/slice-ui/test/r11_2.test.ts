/**
 * R11.2: the playtest fixes. Decision-queue folding, shortcut origin, mixed offer cards, works feedback,
 * readiness deltas, the SEZ prologue result and the map key.
 */
import { describe, expect, it } from 'vitest';
import { sizeOffer, type GameState, type WorksOrder } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { newSession, type Session } from '../src/controller.js';
import { initialUi, renderDecisions, renderDrawer, renderOverlaySelect, renderTutorial, type UiState, type View } from '../src/render.js';
import { actionLabel, cardView, readinessView, worksView } from '../src/views.js';
import { tutorialView } from '../src/tutorial.js';
import * as S from '../src/strings.js';

const slice = loadSlice();
const base = newSession(slice);
const view = (x: Session = base, ui: Partial<UiState> = {}, lang: 'en' | 'zh' = 'en'): View =>
  ({ slice, x, lang, ui: { ...initialUi(slice), ...ui } });

const zone = (s: GameState, id = 1): GameState['zones'][number] => ({
  id, use: 'industrial', runs: [[375, 386, 386], [375, 387, 387], [376, 386, 387]], cellCount: 4, area: 1,
  created: s.date, servicedShare: 1, name: { kind: 'generic' },
});

const offer = (jobs: number) => ({ ...sizeOffer(slice.params, 'investor.hk_processing', 'hk_processing', jobs) });

describe('R11.2 decision queue', () => {
  it('folds optional investor cards and keeps event cards visible', () => {
    const s = base.state;
    const investor = { id: 'offer@test', card: 'investor.hk_processing', options: ['accept:zone:1', 'accept:premises:1', 'decline'],
      interrupting: false, raisedAt: s.date, payload: { offer: offer(100) } };
    const typhoon = { id: 'event.typhoon@test', card: 'event.typhoon', options: ['repair', 'defer'], interrupting: false, raisedAt: s.date };
    const x = { ...base, state: { ...s, zones: [zone(s)], pendingCards: [investor, typhoon] } };
    const html = renderDecisions(view(x, { decisions: true }));
    expect(html).toContain(S.T.moreOffers.en);
    expect(html).toContain('(1)');
    expect(html).toContain('A typhoon');
    expect(html.indexOf('A typhoon')).toBeLessThan(html.indexOf(S.T.moreOffers.en));
    expect(html).toContain('Hong Kong processing contract');
  });

  it('names the offer a shortcut belongs to', () => {
    const s = base.state;
    const sc = { id: 'leader.shortcut@test', card: 'leader.shortcut', options: ['decline', 'accept:zone:1'], interrupting: false,
      payload: { offerCard: 'offer@test', leader: 'leader.mayor', offer: offer(120) } };
    const x = { ...base, state: { ...s, zones: [zone(s)], pendingCards: [sc] } };
    const c = cardView(x.state, slice, sc as never);
    expect(c.lines.some((l) => l.label.en === S.T.shortcutFrom.en && l.value.en.includes('120'))).toBe(true);
  });
});

describe('R11.2 offer cards', () => {
  it('splits a differing figure by site kind and keeps the site note to months, power and beds', () => {
    const s = base.state;
    const card = { id: 'offer@test', card: 'investor.hk_processing', options: ['accept:zone:1', 'accept:premises:1', 'decline'],
      interrupting: false, payload: { offer: offer(100) } };
    const x = { ...base, state: { ...s, zones: [zone(s)], pendingCards: [card] } };
    const c = cardView(x.state, slice, card as never);
    const output = c.lines.find((l) => l.label.en === S.T.perYearOutput.en)!;
    expect(output.value.en).toContain(S.T.inPremises.en);
    expect(output.value.en).toContain(S.T.inNewFactory.en);
    const site = c.options.find((o) => o.id === 'accept:zone:1')!;
    expect(site.note?.en).toContain(S.T.opensIn.en);
    expect(site.note?.en).not.toContain(S.T.perYearOutput.en);
  });
});

describe('R11.2 works feedback', () => {
  it('marks a queued cancel, a disconnected road, compensation and a high-priority order', () => {
    const s = base.state, W = s.grid.width, cell = 375 * W + 386;
    const road: WorksOrder = { id: 7, kind: 'road', priority: 'high', paused: false, committed: s.date, stage: 'queued',
      waiting: 'access', unitsTotal: 12, unitsDone: 0, budget: 420_000, spent: 0, path: [{ cell, units: 12 }] };
    const service: WorksOrder = { id: 8, kind: 'service', priority: 'normal', paused: false, committed: s.date, stage: 'queued',
      unitsTotal: 40, unitsDone: 0, budget: 288_000, spent: 0, zone: 1 };
    const state: GameState = { ...s, zones: [zone(s)], worksOrders: [road, service],
      cellWorks: [{ cell, zone: 1, workTotal: 40, workDone: 0, stage: 'planned', order: 8 }],
      fiscal: { ...s.fiscal, obligations: [{ id: 1, kind: 'compensation', perMonth: 240_000, index: 'none', from: s.date, createdBy: 'works.8' }] } };
    const x: Session = { ...base, state, queue: [{ type: 'cancel_works', order: 7 }] };
    const rows = worksView(state, slice, x.queue);
    const r = rows.find((q) => q.id === 7)!;
    expect(r.cancelling).toBe(true);
    expect(r.gap).toEqual({ x: 386, y: 375 });
    expect(r.priority).toBe('high');
    expect(r.crew).toBe(40);
    expect(r.crewMax).toBe(400);
    expect(rows.find((q) => q.id === 8)!.compensation).toBe(240_000);
    const html = renderDrawer(view(x, { drawer: 'building' }));
    expect(html).toContain(S.T.cancelPending.en);
    expect(html).toContain(S.T.showGap.en);
    expect(html).toContain(S.T.compensation.en);
    expect(html).toContain(S.T.crewCap.en);
    expect(html).toContain('data-act="orderCrews"');
    expect(html).toContain('data-crews="80"');
    const label = actionLabel(state, slice, [{ type: 'set_works_crews', order: 7, crews: 80 }], 0);
    expect(label.en).toContain(S.T.crews.en);
    expect(label.en).toContain('80');
    const pending = worksView(state, slice, [{ type: 'set_works_crews', order: 7, crews: 80 }]).find((q) => q.id === 7)!;
    expect(pending.crew).toBe(80);
    expect(pending.crewPending).toBe(true);
  });
});

describe('R11.2 readiness and the prologue result', () => {
  it('shows a part delta and the new firms behind a power drop', () => {
    const s = base.state, cell = 375 * s.grid.width + 386;
    const now = { ...s, roads: [...s.roads, cell] };
    const before = { ...s, roads: [] };
    const r = readinessView(now, slice, before);
    expect(r.delta).toBeDefined();
    expect(r.delta!.roads).toBeGreaterThan(0);
    expect(r.newFirms).toBe(0);
  });

  it('shows the prologue result once when the SEZ opens, with the actual numbers', () => {
    const s = { ...base.state, sez: { opened: base.state.date, priority: 'priority.industry' as const } };
    const x = { ...base, state: s };
    const ui = { ...initialUi(slice), tutorial: false, scrutinySeen: true };
    const tut = tutorialView(x, ui, slice);
    expect(tut?.kind).toBe('sez');
    expect(tut?.body.en).toContain('Readiness');
    expect(tut?.body.en).toContain('first wave');
    const html = renderTutorial(view(x, ui));
    expect(html).toContain(S.T.sezResultDone.en);
    expect(tutorialView(x, { ...ui, sezReported: true }, slice)).toBeUndefined();
  });
});

describe('R11.2 map key', () => {
  it('names the zone colours', () => {
    const html = renderOverlaySelect(view());
    expect(html).toContain(S.T.zoneKey.en);
    expect(html).toContain(S.LAND_USE.industrial!.en);
    expect(html).toContain(S.LAND_USE.residential!.en);
    expect(html).toContain(S.LAND_USE.commercial!.en);
  });
});
