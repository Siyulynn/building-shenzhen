/**
 * R11.1 playtest revision: the playable-first camera, the map key, the guide, the readiness target,
 * the reference-only historical plan and the fixed modal/panel wording.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInitialState, landCoverAt, playableAreaOf, sizeOffer, type Slice } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { choose, chooseGroup, enqueue, newSession } from '../src/controller.js';
import {
  hoverText, initialUi, renderBriefing, renderDecisions, renderDrawer, renderFlyout, renderInspector, renderOverlaySelect,
  renderReadinessStrip, renderStack, renderTutorial, type View,
} from '../src/render.js';
import { cardStack, inspectorView, playableBox, readinessView, siteName } from '../src/views.js';
import { STARTER_CELLS, STARTER_FROM, STARTER_TO, tutorialView } from '../src/tutorial.js';
import { applyPlan, planGesture, queuedBudget } from '../src/tools.js';
import { INTENSITY_BRIEF, T } from '../src/strings.js';

const slice: Slice = loadSlice();
const start = createInitialState(slice.init);
const W = start.grid.width;
const idx = (x: number, y: number) => y * W + x;

function surveyAnswered() {
  let x = newSession(slice);
  for (const c of x.state.pendingCards) if (c.card === 'event.first_project') x = choose(x, c.id, 'noted');
  return x;
}

const view = (over: Partial<Parameters<typeof renderBriefing>[0]['ui']> = {}, x = newSession(slice)): View =>
  ({ slice, x, lang: 'en', ui: { ...initialUi(slice), ...over } });

describe('R11.1 the playable-first map', () => {
  it('fits the seven playable areas, not all nine', () => {
    const [x0, y0, x1] = playableBox(start);
    expect(x0).toBeLessThan(334);
    expect(x1).toBeGreaterThan(492);
    expect(y0).toBeLessThan(299);
  });

  it('lists all nine areas in the key, and marks Shekou and Nantou as card-only', () => {
    const html = renderOverlaySelect(view());
    expect(html).toContain('Shekou');
    expect(html).toContain('Nantou');
    expect(html).toContain(T.cardsOnly.en);
    expect(html).toContain(T.cityBorder.en);
    expect(html).toContain(T.farmlandBuildable.en);
    expect(renderOverlaySelect(view({ tool: 'zone' }))).toContain(T.notFormable.en);
    expect(renderOverlaySelect(view({ tool: 'road' }))).not.toContain(T.notFormable.en);
  });

  it('calls the Sungang yard the freight yard, without the modern Shenzhen North name', () => {
    const yard = slice.startSites.find((s) => s.id === 'site.sungang_freight');
    expect(yard).toBeDefined();
    expect(siteName(yard!).zh).toBe('笋岗货场');
    expect(siteName(yard!).en).toBe('Sungang freight yard');
    expect(hoverText(view(), { x: yard!.cell[0], y: yard!.cell[1], area: yard!.area })).toContain('笋岗货场');
    expect(hoverText(view(), { x: yard!.cell[0], y: yard!.cell[1], area: yard!.area })).not.toContain('Shenzhen North');
  });

  it('names lowland farmland in the inspector so the field cover is legible', () => {
    const lc = slice.tick.landcover!;
    let cell = -1;
    for (let c = 0; c < lc.classOf.length; c++) if (landCoverAt(lc, c) === 'lowland_farm' && playableAreaOf(start, c)) { cell = c; break; }
    expect(cell).toBeGreaterThan(-1);
    const x = cell % W, y = Math.floor(cell / W);
    const c = inspectorView(start, slice, x, y);
    expect(c.landCover?.en).toBe('Lowland farmland');
    expect(hoverText(view(), { x, y, area: 1 })).toContain('Land cover: Lowland farmland');
  });
});

describe('R11.1 the guided opening', () => {
  it('starts at the welcome and advances only from the state', () => {
    const x = newSession(slice);
    expect(tutorialView(x, initialUi(slice))?.step).toBe(0);
    const opened = surveyAnswered();
    expect(tutorialView(opened, { ...initialUi(slice), tutorialStep: 1 })?.step).toBe(2);
    expect(tutorialView(opened, { ...initialUi(slice), tutorialStep: 2, tool: 'zone' })?.step).toBe(3);
    const zoned = enqueue(opened, { type: 'create_zone', use: 'industrial', runs: [[375, 387, 388]] });
    expect(tutorialView(zoned, { ...initialUi(slice), tutorialStep: 3 })?.step).toBe(4);
    const nextTurn = { ...zoned, state: { ...zoned.state, turn: 1 } };
    expect(tutorialView(nextTurn, { ...initialUi(slice), tutorialStep: 4 })?.step).toBe(5);
  });

  it('suggests a buildable, in-area starter block beside the start road', () => {
    const buildable = new Set(slice.tick.buildable!.cells);
    for (const [x, y] of STARTER_CELLS) {
      expect(playableAreaOf(start, idx(x, y))).toBe(1);
      expect(buildable.has(idx(x, y))).toBe(true);
    }
  });

  it('turns the first-wave formula into a 50% / three-card target', () => {
    const r = readinessView(start, slice);
    expect(r.targetCards).toBe(3);
    expect(r.targetBar).toBeCloseTo(0.5, 2);
    expect(renderReadinessStrip(view())).toContain('50.0%');
    expect(renderStack(view())).toContain('50.0%');
    expect(renderDrawer(view({ drawer: 'readiness' }))).toContain(T.weakestPart.en);
  });

  it('frames the guide as old Liang with the portrait and the city-office context', () => {
    const html = renderTutorial({ ...view(), ui: { ...initialUi(slice), tutorialStep: 1 } });
    expect(html).toContain(T.tutorialSpeaker.en);
    expect(html).toContain('laoliang.webp');
    expect(html).toContain('export-base');
  });

  it('has old Liang explain the first scrutiny score once, after the guide is done', () => {
    const base = newSession(slice);
    const x = { ...base, state: { ...base.state, climate: { ...base.state.climate, scrutiny: 4 } } };
    const ui = { ...initialUi(slice), tutorial: false };
    const tut = tutorialView(x, ui);
    expect(tut?.kind).toBe('scrutiny');
    expect(tut?.body.en).toContain('stepping stone');
    const html = renderTutorial({ ...view({ tutorial: false }, x) });
    expect(html).toContain(T.tutScrutinyDone.en);
    expect(tutorialView(x, { ...ui, scrutinySeen: true })).toBeUndefined();
  });

  it('puts the offer\'s shared figures at the top and asks each site only about power and beds', () => {
    const base = newSession(slice);
    const offer = sizeOffer(slice.params, 'investor.hk_processing', 'hk_processing', 120);
    const card = { id: 'offer@test', card: 'investor.hk_processing', options: ['accept:premises:1', 'accept:premises:2', 'decline'],
      interrupting: false, raisedAt: base.state.date, payload: { offer } };
    const x = { ...base, state: { ...base.state, pendingCards: [card] } };
    const c = cardStack(x.state, slice).find((q) => q.card === 'investor.hk_processing')!;
    const labels = c.lines.map((l) => l.label.en);
    for (const label of [T.offerJobs.en, T.powerNeed.en, T.bedsNeeded.en, T.perYearOutput.en, T.cash.en, T.retained.en, T.newObligations.en])
      expect(labels).toContain(label);
    expect(c.lines.map((l) => l.label.en)).not.toContain(T.area.en + ' Shenzhen market town');
    const site = c.options.find((o) => o.id === 'accept:premises:1')!;
    expect(site.note?.en).toMatch(new RegExp(`${T.powerEnough.en}|${T.powerShort.en}`));
    expect(site.note?.en).toMatch(new RegExp(`${T.bedsEnough.en}|${T.bedsShort.en}`));
    expect(site.note?.en).not.toContain(T.perYearOutput.en);
    expect(site.note?.en).not.toContain(T.cash.en);
  });

  it('counts queued land compensation in the budget chip committed figure', () => {
    const x = surveyAnswered();
    const p = planGesture(x, initialUi(slice).opts, { tool: 'zone', from: STARTER_FROM, to: STARTER_TO });
    expect(p.kind).toBe('actions');
    if (p.kind !== 'actions') return;
    const queued = applyPlan(x, p);
    expect(queuedBudget(queued)).toBe(p.preview.budget + p.preview.compensation);
  });
});

describe('R11.1 the reference-only historical plan and the wording', () => {
  it('no longer offers a zone-the-guide action', () => {
    const html = renderFlyout(view({ tool: 'zone' }));
    expect(html).not.toContain('data-act="zoneGuide"');
    expect(html).toContain(T.guideReference.en);
  });

  it('keeps locked choices the same size and moves the opener to a tooltip', () => {
    const html = renderFlyout(view({ tool: 'zone' }));
    expect(html).toContain(T.unlockLater.en);
    expect(html).not.toContain(T.opensWith.en);
    expect(html).not.toContain('class="opens"');
  });

  it('shows one brief description unless the details switch is on', () => {
    const brief = renderFlyout(view({ tool: 'zone', details: false }));
    expect(brief).toContain(INTENSITY_BRIEF.standard.en);
    expect(brief).not.toContain(T.formationHint.en);
    const full = renderFlyout(view({ tool: 'zone', details: true }));
    expect(full).toContain(T.formationHint.en);
    expect(full).toContain(T.intensityHint.en);
  });

  it('stacks identical petitions into one card with a count, and answers the group together', () => {
    const base = newSession(slice), date = base.state.date;
    const petition = (id: string) => ({
      id, card: 'event.petition', options: ['compensate', 'noted'], interrupting: false, raisedAt: date, expires: date + 2,
    });
    const x = { ...base, state: { ...base.state, pendingCards: [petition('event.petition@1979-02.0'), petition('event.petition@1979-03.1')] } };
    const group = cardStack(x.state, slice).find((c) => c.card === 'event.petition')!;
    expect(group.count).toBe(2);
    expect(renderDecisions({ ...view({}, x), ui: { ...initialUi(slice), decisions: true } })).toContain('×2');
    const answered = chooseGroup(x, group.id, 'compensate');
    expect(answered.answers[group.ids[0]!]).toBe('compensate');
    expect(answered.answers[group.ids[1]!]).toBe('compensate');
  });

  it('counts the cards and says how many must still be answered', () => {
    const x = surveyAnswered();
    expect(renderStack({ ...view({}, x) })).toContain(`0 ${T.toAnswer.en}`);
  });

  it('reads frontage prospectively for an unzoned cell beside the start road', () => {
    const c = inspectorView(start, slice, 388, 376);
    expect(c.frontage).toBeUndefined();
    expect(c.prospectiveFrontage?.depth).toBeGreaterThan(0);
    expect(renderInspector(view({ selected: { x: 388, y: 376 } }))).toContain(T.frontageIfZoned.en);
  });

  it('gives the briefing and decisions a scrolling body and a fixed footer', () => {
    expect(renderBriefing(view())).toContain('modal-body');
    expect(renderBriefing(view())).toContain('modal-foot');
    expect(renderDecisions(view({ decisions: true }))).toContain('modal-body');
  });
});

describe('R11.1 the present-day city limit data', () => {
  it('is a labelled reference layer inside the grid', () => {
    const border = JSON.parse(readFileSync(join(process.cwd(), 'data/starts/slice_city_border.json'), 'utf8')) as {
      reference: string; source: string; rings: [number, number][][];
    };
    expect(border.rings.length).toBeGreaterThan(0);
    expect(border.source).toBe('osm_shenzhen_admin');
    expect(border.reference).toContain('not a historical');
    for (const [x, y] of border.rings.flat()) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(start.grid.width);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(start.grid.height);
    }
  });
});
