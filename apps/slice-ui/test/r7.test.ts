/**
 * R7's acceptance checks ("Clarity", docs/design/phase1-revision-plan.md §2; phase1-slice.md §11.2, §13 vocabulary):
 * cards that can be judged (a description and derived effect badges), Turn 1's GDP, the opening card at init, and
 * chips with labels and the money committed this turn.
 */
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { Rng, compileEvents, createInitialState, gdpNow, step, type CardInstance, type Slice } from '@sz/sim-core';
import { loadSlice } from '../src/load.js';
import { newSession, type Session } from '../src/controller.js';
import { esc, initialUi, renderDecisions, type View } from '../src/render.js';
import { BADGE } from '../src/strings.js';
import { briefing, chipsView, effectBadges, yuan } from '../src/views.js';
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
    const r = step(s0, [], new Rng(1), newSession(slice).steps);
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
