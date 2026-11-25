/**
 * R7's acceptance checks ("Clarity", docs/design/phase1-revision-plan.md §2; phase1-slice.md §11.2, §13 vocabulary):
 * cards that can be judged (a description and derived effect badges), Turn 1's GDP, the opening card at init, and
 * chips with labels and the money committed this turn.
 */
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { Rng, compileEvents, createInitialState, gdpNow, step, type CardInstance, type Slice } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { choose, enqueue, newSession, submit, unanswered, type Session } from '../src/controller.js';
import { esc, initialUi, renderChips, renderDecisions, renderDrawer, renderFlyout, type View } from '../src/render.js';
import { BADGE, CHIP_STAT, T, TOOL } from '../src/strings.js';
import { briefing, chipsView, commitments, effectBadges, yuan } from '../src/views.js';
import { applyPlan, planGesture, queuedBudget } from '../src/tools.js';
import { LANGS } from '../src/lang.js';

const slice: Slice = loadSlice();
const cards = slice.tick.events.filter((d) => d.card);
const view = (x: Session, lang: 'en' | 'zh'): View => ({ slice, x, ui: initialUi(slice), lang });

describe('R7 cards that can be judged', () => {
  it('every card in events.yaml has a description in both languages', () => {
    expect(cards.length).toBeGreaterThan(20);
    for (const d of cards) {
      expect(d.description?.en.trim(), d.id).toBeTruthy();
      expect(d.description?.zh.trim(), d.id).toBeTruthy();
    }
  });

  it('compileEvents refuses an empty description', () => {
    const raw = parse(`- id: event.x
  name: { zh: 甲, en: X }
  description: { zh: "", en: An event }
  family: scripted
  trigger: { prologue_turn: 1 }
  card: { interrupting: false, options: [ { id: noted, name: { zh: 知道了, en: Noted } } ] }
  claims: []`);
    expect(() => compileEvents(raw, slice.params, slice.tick.investors!, slice.tick.fiscal)).toThrow(/description/);
  });

  it('every option of every card yields at least one badge, in both languages', () => {
    for (const d of cards) {
      const b = effectBadges(d, slice);
      for (const o of d.card!.options) {
        expect(b[o.id]?.length, `${d.id}/${o.id}`).toBeGreaterThan(0);
        for (const l of b[o.id]!) for (const lang of LANGS) expect(l[lang].trim(), `${d.id}/${o.id}`).not.toBe('');
      }
    }
  });

  it('badges read their numbers from params, as the effects do', () => {
    const typhoon = effectBadges(slice.tick.events.find((d) => d.id === 'event.typhoon')!, slice);
    const n = slice.params.events['event.typhoon']!;
    expect(typhoon.repair!.map((l) => l.en)).toEqual([`Cost ${yuan(n.cost!)}`]);
    expect(typhoon.defer!.map((l) => l.en)).toEqual([`Scrutiny +${n.scrutiny}`]);

    const first = effectBadges(slice.tick.events.find((d) => d.id === 'event.first_project')!, slice);
    const road = slice.tick.fiscal!.projects.find((t) => t.id === 'project.road_link')!;
    expect(first['project.road_link']!.map((l) => l.en)).toEqual([`Commits ${road.name.en}`,
      `Cost ${yuan(slice.params.projects!['project.road_link']!.budget!)}`]);
    expect(first.later).toEqual([BADGE.noEffect]);            // `later` is not a template: it commits nothing

    const sez = effectBadges(slice.tick.events.find((d) => d.id === 'event.sez_established')!, slice);
    expect(sez['priority.industry']!.map((l) => l.en)).toContain('Unlocks investment');
    const sweep = effectBadges(slice.tick.events.find((d) => d.id === 'event.sweep')!, slice);
    expect(sweep.no_sweep).toEqual([BADGE.noEffect]);
    expect(sweep.sweep![0]!.en).toBe(`Cost ${yuan(slice.params.sweep.cash_cost)}`);
  });

  it('the decisions modal shows the description, then each option with its badges', () => {
    const x0 = newSession(slice);
    const d = slice.tick.events.find((e) => e.id === 'event.typhoon')!;
    const card: CardInstance = { id: 'event.typhoon@test', card: d.id, options: d.card!.options.map((o) => o.id),
      interrupting: false, raisedAt: x0.state.date };
    const x: Session = { ...x0, state: { ...x0.state, pendingCards: [card] } };
    for (const lang of LANGS) {
      const html = renderDecisions(view(x, lang));
      expect(html).toContain(esc(d.description![lang]));
      const badges = effectBadges(d, slice);
      expect(html).toContain(`<li>${esc(badges.repair![0]![lang])}</li>`);
      expect(html.indexOf(esc(d.description![lang]))).toBeLessThan(html.indexOf('class="badges"'));
    }
  });
});

describe('R7 Turn 1 tells the truth: GDP', () => {
  it('gdpNow reads the starting economy before any month runs, and equals the first idle month', () => {
    const s0 = createInitialState(slice.init);
    const g0 = gdpNow(s0, slice.params);
    expect(g0).toBeGreaterThan(0);
    const opening = s0.pendingCards.find((c) => c.card === 'event.first_project')!;
    const r = step(s0, [{ type: 'answer_card', instance: opening.id, option: 'later' }], new Rng(1), newSession(slice).steps);
    expect(r.state.history.gdp[0]).toBe(g0);                 // an idle first month: no work, every base job held
    expect(gdpNow(r.state, slice.params)).toBe(r.state.history.gdp[0]);
  });

  it('Turn 1 shows the quarter at the current rate on the chip and in the briefing, not ¥0', () => {
    const x = newSession(slice);
    const q = 3 * gdpNow(x.state, slice.params);
    expect(chipsView(x.state, slice).find((c) => c.id === 'economy')!.values[0]).toBe(yuan(q));
    expect(briefing(x.state, slice).rows.find((r) => r.label.en.includes('GDP'))!.value).toBe(Math.round(q));
  });
});

describe('R7 Turn 1 tells the truth: the opening decision', () => {
  it('Turn 1 opens on the card, with the map tools on; the answer and the turn orders both land in 1979-01', () => {
    const x0 = newSession(slice);
    expect(x0.mode).toBe('turn');
    const card = unanswered(x0);
    expect(card.map((c) => c.card)).toEqual(['event.first_project']);
    expect(submit(x0).error).toBeDefined();                     // it must be answered first
    let x = choose(x0, card[0]!.id, 'later');
    x = enqueue(x, { type: 'set_enforcement', level: 'high' });
    const y = submit(x);
    expect(y.error).toBeUndefined();
    const start = x0.state.date;
    expect(y.state.actionLog.filter((e) => e.date === start).map((e) => e.action.type)).toEqual(['answer_card', 'set_enforcement']);
    expect(y.state.pendingCards.some((c) => c.card === 'event.first_project')).toBe(false);
  });
});

describe('R7 chips and money you can see', () => {
  /** The session at Turn 1 with the opening card answered `later`, and one zone with its site formation queued. */
  function queued(): { x0: Session; x: Session } {
    let x0 = newSession(slice);
    for (const c of unanswered(x0)) x0 = choose(x0, c.id, 'later');
    const g = slice.startNetwork.routes.find((r) => r.id === 'site.guangshen_road')!;
    const W = x0.state.grid.width, c = g.cells[Math.floor(g.cells.length / 2)]!;
    const [gx, gy] = [c % W + 1, Math.floor(c / W)];
    const plan = planGesture(x0, { use: 'industrial', planOnly: false, facility: 'school' }, { tool: 'zone', from: [gx, gy], to: [gx + 2, gy + 2] });
    expect(plan.kind).toBe('actions');
    return { x0, x: applyPlan(x0, plan) };
  }

  it('every chip stat has a visible caption, in both languages', () => {
    const x = newSession(slice);
    for (const lang of LANGS) {
      const html = renderChips(view(x, lang));
      for (const c of chipsView(x.state, slice)) {
        expect(c.captions).toHaveLength(2);
        for (const cap of c.captions) expect(html).toContain(`<small>${esc(cap[lang])}</small>`);
      }
    }
    expect(Object.keys(CHIP_STAT)).toHaveLength(10);
  });

  it('a queued order lowers the funds after commitments at once, by its preview budget', () => {
    const { x0, x } = queued();
    const q = queuedBudget(x);
    expect(q).toBeGreaterThan(0);
    const before = commitments(x0.state, slice, queuedBudget(x0)), after = commitments(x.state, slice, q);
    expect(x.state).toBe(x0.state);                              // nothing is sent to the sim
    expect(after.committed - before.committed).toBe(q);
    expect(before.projected - after.projected).toBe(q);
    const chip = (y: Session) => chipsView(y.state, slice, queuedBudget(y)).find((c) => c.id === 'budget')!.values[1];
    expect(chip(x)).not.toBe(chip(x0));
  });

  it('the chips read the same numbers as the Budget drawer at the same state', () => {
    const { x } = queued();
    const m = commitments(x.state, slice, queuedBudget(x));
    const chips = chipsView(x.state, slice, queuedBudget(x));
    const budget = chips.find((c) => c.id === 'budget')!, building = chips.find((c) => c.id === 'building')!;
    expect(budget.values[1]).toContain(yuan(m.committed));
    expect(building.values[0]).toContain(yuan(m.committed));
    const drawer = renderDrawer({ ...view(x, 'en'), ui: { ...initialUi(slice), drawer: 'budget' } });
    expect(drawer).toContain(yuan(m.committed));
    expect(drawer).toContain(yuan(m.projected));
    expect(drawer).toContain(yuan(m.queued));
  });
});

describe('R7 terms and the parked public zone', () => {
  const flyout = (tool: 'zone' | 'service', lang: 'en' | 'zh', planOnly = false) =>
    renderFlyout({ ...view(newSession(slice), lang), ui: { ...initialUi(slice), tool, opts: { ...initialUi(slice).opts, planOnly } } });

  it('the zones flyout offers no public zone (R8b removed it), in both languages', () => {
    for (const lang of LANGS) {
      const html = flyout('zone', lang);
      expect(html).not.toContain('data-use="public"');
      expect(html).toContain('data-use="industrial"');
      expect(html).toContain(esc(T.formationHint[lang]));         // zone painting orders site formation
      expect(flyout('zone', lang, true)).not.toContain(esc(T.formationHint[lang]));   // Plan only orders none
    }
  });

  it('the Form site flyout names the tool and says the plot-edge connections are included', () => {
    for (const lang of LANGS) {
      const html = flyout('service', lang);
      expect(html).toContain(esc(TOOL.service![lang]));
      expect(html).toContain(esc(T.formationHint[lang]));
    }
    expect(TOOL.service!.en).toBe('Form site');
    expect(T.formationHint.en).toMatch(/water and power connection at the plot edge\. Already included/);
  });
});
