/**
 * The UI's language (phase1-slice.md §11.1): every UI string has an en and a zh entry; each language renders with no
 * string from the other except place labels; switching language changes no sim state and no golden result.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cellsOfRuns, policyNamed, runSummary, templateZoneAction,
  type CardInstance, type GameState, type LocalizedString, type PlayRecord, type Slice,
} from '@sz/sim-core';
import { GOLDEN_POLICIES, ROOT, goldenPath, goldenText } from '../../cli/src/slice.js';
import { loadSlice } from '../src/load.js';
import { choose, enqueue, newSession, simError, submit, type Session } from '../src/controller.js';
import { LANGS, LANG_NAME, STORAGE_KEY, readStoredLang, resolveLang, storeLang, withLang, type Lang } from '../src/lang.js';
import {
  DRAWERS, errorText, hoverText, initialUi, pageTitle, renderBriefing, renderChips, renderCue, renderDecisions, renderDrawer,
  renderFlyout, renderInspector, renderOverlaySelect, renderPreview, renderQuarter, renderRail, renderStack,
  renderTutorial, renderVerdict, type UiState, type View,
} from '../src/render.js';
import { TOOLS, planGesture } from '../src/tools.js';
import { ENFORCEMENT, TABLES, T, bi, place } from '../src/strings.js';
import { SHORT_AREA, actionLabel, areaName, clipZone, previewZone, zoneName } from '../src/views.js';

const slice: Slice = loadSlice();
const HAN = /\p{Script=Han}/u;
const CJK_PUNCT = /[　-〿＀-￯]/u;

describe('the string table', () => {
  const entries = Object.entries(TABLES).flatMap(([table, xs]) => Object.entries(xs).map(([k, l]) => [`${table}.${k}`, l] as const));
  it('has entries', () => expect(entries.length).toBeGreaterThan(150));
  for (const [key, l] of entries) {
    it(`${key} has an en and a zh entry`, () => {
      expect(l.en.trim(), key).not.toBe('');
      expect(l.zh.trim(), key).not.toBe('');
      expect(HAN.test(l.en) || CJK_PUNCT.test(l.en), `${key} en: ${l.en}`).toBe(false);
      expect(HAN.test(l.zh), `${key} zh: ${l.zh}`).toBe(true);
    });
  }
});

describe('choosing the language', () => {
  it('takes ?lang first, then the stored choice, then English', () => {
    expect(resolveLang('', null)).toBe('en');
    expect(resolveLang('?seed=3', 'zh')).toBe('zh');
    expect(resolveLang('?lang=en', 'zh')).toBe('en');
    expect(resolveLang('?lang=zh&seed=2', 'en')).toBe('zh');
    expect(resolveLang('?lang=fr', 'xx')).toBe('en');
    expect(resolveLang('?lang=fr', 'zh')).toBe('zh');
  });
  it('rewrites ?lang and keeps ?seed', () => {
    expect(new URLSearchParams(withLang('?seed=4&lang=en', 'zh')).get('lang')).toBe('zh');
    expect(new URLSearchParams(withLang('?seed=4&lang=en', 'zh')).get('seed')).toBe('4');
    expect(withLang('', 'en')).toBe('?lang=en');
  });
  it('stores the choice, and survives blocked storage', () => {
    const m = new Map<string, string>();
    const mem = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
    storeLang('zh', () => mem);
    expect(m.get(STORAGE_KEY)).toBe('zh');
    expect(readStoredLang(() => mem)).toBe('zh');
    const blocked = () => { throw new Error('SecurityError'); };
    expect(readStoredLang(blocked)).toBeNull();
    expect(() => storeLang('en', blocked)).not.toThrow();
  });
});

// ---- rendering ----

/** Every place label's bilingual form, longest first (so a name inside another is removed after it). */
const PLACES: string[] = [...new Set([
  ...slice.init.areas.areas.map((a: { name: LocalizedString }) => bi(a.name)),
  ...slice.startSites.map((s) => bi(s.name)),
  ...slice.startNetwork.routes.map((r) => bi(r.name)),
  ...(slice.tick.precedents ?? []).map((p) => bi(p.name)),
  ...(slice.tick.gateways ?? []).map((g) => bi(g.name)),             // R8d (§5.12): the gateways are place labels
  ...Object.values(SHORT_AREA).map((n) => bi(n)),
])].sort((a, b) => b.length - a.length);

const ENT: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
/** The text a reader sees: tags and attributes dropped, entities decoded, place labels and the switch removed. */
function visible(html: string): string {
  // sim-core's own messages are diagnostics, shown as sim-core wrote them (§11.1): render.ts marks them
  let t = html.replace(/<span class="diag" lang="en">[^<]*<\/span>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENT[e]!);
  for (const p of PLACES) t = t.split(p).join(' ');
  for (const n of Object.values(LANG_NAME)) t = t.split(n).join(' ');
  return t;
}

/** The English names the Chinese UI must never show: the string table's and content's. */
const content = slice.tick;
const EN_NAMES: string[] = [...new Set([
  ...Object.values(TABLES).flatMap((xs) => Object.values(xs)),
  ...content.events.flatMap((e) => [e.name, ...(e.card?.options.map((o) => o.name) ?? [])]),
  ...(content.investors ?? []).map((i) => i.name),
  ...(content.fiscal?.projects ?? []).map((p) => p.name),
  ...(content.fiscal?.teams ?? []).map((p) => p.name),
  ...(content.fiscal?.regimes ?? []).map((p) => p.name),
  ...slice.init.leaders.map((l) => l.name),
].filter((l): l is LocalizedString => !!l && l.en !== l.zh).map((l) => l.en.trim()).filter((e) => e.length >= 2))];
const wordRe = (w: string) => new RegExp(`(?<![\\w.])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`);
const EN_RES = EN_NAMES.map((n) => [n, wordRe(n)] as const);
/** Latin words that are units or abbreviations both languages write the same way. */
const SHARED_LATIN = new Set(['kW', 'GDP', 'USD']);
/** An id (claim ids, card ids, the proxy's source id): not a word of either language. */
const isId = (tok: string) => /[._\d]/.test(tok);

function checkLang(where: string, html: string, lang: Lang): void {
  const text = visible(html);
  if (lang === 'en') {
    const m = HAN.exec(text) ?? CJK_PUNCT.exec(text);
    expect(m, `${where} (en) shows Chinese near: ${m ? text.slice(Math.max(0, m.index - 30), m.index + 30) : ''}`).toBeNull();
    return;
  }
  for (const [n, re] of EN_RES) expect(re.test(text), `${where} (zh) shows the English "${n}"`).toBe(false);
  const latin = text.split(/\s+/).filter((tok) => !isId(tok)).flatMap((tok) => tok.match(/[A-Za-z]{2,}/g) ?? [])
    .filter((w) => !SHARED_LATIN.has(w));
  expect(latin, `${where} (zh) shows Latin words`).toEqual([]);
}

/** Every screen of the session in one language, and a few hover readouts: sites, routes, zones. */
function screens(x: Session, lang: Lang): [string, string][] {
  const ui: UiState = { ...initialUi(slice), area: 7 };
  const v: View = { slice, x, ui, lang };
  const out: [string, string][] = [['quarter', renderQuarter(v)], ['cue', renderCue(v)],
    ['overlays', renderOverlaySelect(v)], ['rail', renderRail(v)], ['chips', renderChips(v)], ['stack', renderStack(v)],
    ['briefing', renderBriefing(v)], ['decisions', renderDecisions(v)], ['tutorial', renderTutorial({ ...v, ui: { ...ui, tutorialStep: 3 } })],
    ['readiness drawer', renderDrawer({ ...v, ui: { ...ui, drawer: 'readiness' } })], ['verdict', renderVerdict(v) ?? '']];
  for (const tool of TOOLS) out.push([`flyout ${tool}`, renderFlyout({ ...v, ui: { ...ui, tool } })]);
  for (const drawer of DRAWERS) out.push([`drawer ${drawer}`, renderDrawer({ ...v, ui: { ...ui, drawer } })]);
  for (const area of x.state.areas.filter((a) => a.access === 'playable')) {
    out.push([`population ${area.id}`, renderDrawer({ ...v, ui: { ...ui, drawer: 'population', area: area.id } })]);
  }
  for (const site of slice.startSites) {
    out.push([`inspector ${site.id}`, renderInspector({ ...v, ui: { ...ui, selected: { x: site.cell[0], y: site.cell[1] } }, selectedSite: site })]);
    out.push([`hover ${site.id}`, hoverText(v, { x: site.cell[0], y: site.cell[1], area: site.area })]);
  }
  const [sx, sy] = slice.startSites.find((q) => q.area === 7)?.cell ?? [0, 0];
  for (const tool of ['zone', 'road', 'erase', 'power'] as const) {
    out.push([`preview ${tool}`, renderPreview(planGesture(x, ui.opts, { tool, from: [sx + 1, sy + 1], to: [sx + 2, sy + 2] }), v)]);
  }
  const W = x.state.grid.width;
  for (const r of slice.startNetwork.routes) { const c = r.cells[0]!; out.push([`hover ${r.id}`, hoverText(v, { x: c % W, y: Math.floor(c / W), area: 0 })]); }
  for (const z of x.state.zones) {
    const c = cellsOfRuns(z.runs, x.state.grid)[0]!;
    out.push([`hover zone ${z.id}`, hoverText(v, { x: c % W, y: Math.floor(c / W), area: z.area })]);
    out.push([`inspector zone ${z.id}`, renderInspector({ ...v, ui: { ...ui, selected: { x: c % W, y: Math.floor(c / W) } } })]);
  }
  out.push(['title', pageTitle(lang)]);
  return out;
}

/** A fingerprint of everything the sim owns in a session: rendering must leave it as it was. */
const fingerprint = (x: Session) => JSON.stringify([x.state, x.rng.save(), x.answers, x.queue, x.mode, x.error]);

/**
 * Drive the controller with a golden policy, rendering every screen at every step in alternating languages (en, zh,
 * en, …) and, when `check` is set, checking each language shows nothing of the other.
 */
function drive(policyName: string, check: boolean): { x: Session; rec: PlayRecord; rendered: number } {
  const policy = policyNamed(policyName, slice.params, 1, slice.tick);
  let x = newSession(slice, 1);
  const seen = new Map<string, CardInstance>();
  const see = (s: GameState) => { for (const c of s.pendingCards) if (!seen.has(c.id)) seen.set(c.id, c); };
  const quarterEnds: GameState[] = [];
  let rendered = 0;
  const show = (k: number) => {
    const langs: Lang[] = check ? [...LANGS] : [LANGS[Math.abs(k) % 2]!];
    const before = fingerprint(x);
    for (const lang of langs) for (const [where, html] of screens(x, lang)) { rendered++; if (check) checkLang(`${policyName} step ${k} ${where}`, html, lang); }
    expect(fingerprint(x), 'rendering changed the session').toBe(before);
  };
  for (let k = 0; x.mode !== 'over' && k < 200; k++) {
    see(x.state);
    show(k);
    for (const a of policy(x.state, x.state.pendingCards)) {
      x = a.type === 'answer_card' ? choose(x, a.instance, a.option) : enqueue(x, a);
      expect(x.error).toBeUndefined();
    }
    show(k);                                                   // with the answers and the queue on screen
    const y = submit(x);
    expect(y.error).toBeUndefined();
    if (y.turnStart !== x.turnStart) quarterEnds.push(y.state);
    x = y;
    see(x.state);
  }
  show(-1);                                                    // the verdict
  return { x, rec: { final: x.state, quarterEnds, cards: [...seen.values()] }, rendered };
}

describe('each language shows only itself, except place labels', () => {
  for (const policy of ['default', 'aggressive', 'historical_prologue']) {
    it(`${policy}: every screen at every step, in English and in Chinese`, () => {
      const { x, rendered } = drive(policy, true);
      expect(x.mode).toBe('over');
      expect(rendered).toBeGreaterThan(100);
    }, 120_000);
  }

  it('the check catches the other language (it is not vacuous)', () => {
    expect(() => checkLang('bilingual', bi(T.endTurn), 'en')).toThrow();
    expect(() => checkLang('bilingual', bi(T.endTurn), 'zh')).toThrow();
    expect(() => checkLang('english word', `${T.endTurn.zh} Area`, 'zh')).toThrow();
    expect(() => checkLang('full-width', 'Turn（1）', 'en')).toThrow();
    expect(() => checkLang('place', `${T.area.en}: ${PLACES[0]}`, 'en')).not.toThrow();
    expect(() => checkLang('place', `${T.area.zh}: ${PLACES[0]} · claim.x_1 · 5 kW`, 'zh')).not.toThrow();
  });

  it('a queue holding every kind of order reads in one language, with that language\'s separators', () => {
    let x = newSession(slice);
    const pr = (slice.tick.precedents ?? []).find((p) => p.cells.length)!;
    const c = x.state.areas.find((q) => q.id === 7)!.cells[0]!, W = x.state.grid.width;
    const team = (slice.tick.fiscal?.teams ?? []).find((m) => !m.eventOnly && m.modes.includes('pool'))!;
    const project = slice.tick.fiscal!.projects[0]!.id;
    x = enqueue(x, { type: 'set_enforcement', level: 'high' });
    x = enqueue(x, { type: 'set_permit_regime', regime: 'strict' });
    x = enqueue(x, { type: 'create_zone', use: 'industrial', runs: previewZone(x.state, x.queue, c % W - 2, Math.floor(c / W), c % W + 4, Math.floor(c / W) + 4) });
    const a = templateZoneAction(x.state, pr);
    x = enqueue(x, { ...a, runs: clipZone(x.state, x.queue, a.runs) });
    x = enqueue(x, { type: 'remove_zone', zone: x.state.nextZoneId });
    x = enqueue(x, { type: 'commit_project', template: project, area: 7, priority: 'high' });
    x = enqueue(x, { type: 'commit_project', template: 'project.site_preparation', zone: x.state.nextZoneId + 1, priority: 'normal' });
    x = enqueue(x, { type: 'cancel_project', project: 1 });
    x = enqueue(x, { type: 'contract_team', team: team.id, mode: 'pool' });
    x = enqueue(x, { type: 'set_project_priority', project: 1, priority: 'low' });
    // R5's works actions and the zone edits
    const [cx, cy] = [c % W, Math.floor(c / W)];
    x = enqueue(x, { type: 'commit_works', zone: x.state.nextZoneId });
    x = enqueue(x, { type: 'commit_works', zone: x.state.nextZoneId, cells: [[cy, cx - 2, cx - 1]] });
    x = enqueue(x, { type: 'build_road', path: [[cx, cy + 6], [cx + 3, cy + 6]] });
    x = enqueue(x, { type: 'place_structure', kind: 'power_source', cell: [cx, cy + 7], attach: [cx, cy + 6] });
    x = enqueue(x, { type: 'place_structure', kind: 'facility', facility: 'school', cell: [cx + 1, cy + 7], attach: [cx + 1, cy + 6] });
    x = enqueue(x, { type: 'cancel_works', order: 1, cells: [[cy, cx, cx]] });
    x = enqueue(x, { type: 'set_works_paused', order: 1, paused: true });
    x = enqueue(x, { type: 'set_works_priority', order: 1, priority: 'high' });
    x = enqueue(x, { type: 'edit_zone', zone: x.state.nextZoneId, use: 'commercial' });
    x = enqueue(x, { type: 'rename_zone', zone: x.state.nextZoneId, name: null });
    expect(x.error).toBeUndefined();
    expect(x.queue.length).toBe(20);
    for (const [k, a] of x.queue.entries()) {
      const label = actionLabel(x.state, slice, x.queue, k);
      expect(label.en, a.type).not.toBe(a.type);
      expect(label.zh, a.type).not.toBe(a.type);
    }
    for (const lang of LANGS) {
      const v: View = { slice, x, lang, ui: { ...initialUi(slice), area: 7 } };
      checkLang('queue', renderStack(v), lang);
    }
    expect(actionLabel(x.state, slice, x.queue, 0).zh).toBe(`${T.enforcement.zh}：${ENFORCEMENT.high!.zh}`);
    expect(actionLabel(x.state, slice, x.queue, 0).en).toBe(`${T.enforcement.en}: ${ENFORCEMENT.high!.en}`);
    expect(actionLabel(x.state, slice, x.queue, 3).zh).toContain(bi(pr.name));
  });

  it('place labels read both names in both languages', () => {
    const s = newSession(slice).state;
    const a = areaName(s, 7);
    expect(a).toEqual(place(s.areas.find((q) => q.id === 7)!.name));
    for (const lang of LANGS) {
      const html = renderOverlaySelect({ slice, x: newSession(slice), lang, ui: initialUi(slice) });
      for (const r of slice.startNetwork.routes) expect(html).toContain(bi(r.name));
    }
  });

  it('a zone named by a precedent is a place; a generic zone is chrome in one language', () => {
    let x = newSession(slice);
    const pr = (slice.tick.precedents ?? []).find((p) => p.cells.length)!;
    for (const c of x.state.pendingCards) x = choose(x, c.id, c.options[0]);
    const a = templateZoneAction(x.state, pr);
    x = enqueue(x, { ...a, runs: clipZone(x.state, x.queue, a.runs) });
    const c = x.state.areas.find((q) => q.id === 7)!.cells[0]!, W = x.state.grid.width;
    const [cx, cy] = [c % W, Math.floor(c / W)];
    x = enqueue(x, { type: 'create_zone', use: 'industrial', runs: previewZone(x.state, x.queue, cx - 2, cy, cx + 4, cy + 4) });
    expect(x.error).toBeUndefined();
    let y = submit(x);
    while (y.mode === 'paused') { for (const q of y.state.pendingCards) y = choose(y, q.id, q.options[0]); y = submit(y); }
    const s = y.state;
    expect(s.zones.map((z) => z.name.kind).sort()).toEqual(['generic', 'precedent']);
    for (const z of s.zones) {
      const label = zoneName(s, slice, z.id);
      if (z.name.kind === 'precedent') expect(label).toEqual(place(pr.name));
      else expect(label.zh).not.toBe(label.en);
    }
  });

  it('errors render in the chosen language; sim-core\'s message is kept as its detail', () => {
    let x = newSession(slice);
    x = choose(x, 'no-such-card', 'x');
    expect(errorText(x.error!, 'en')).toBe(`${T.noSuchCard.en}: no-such-card`);
    expect(errorText(x.error!, 'zh')).toBe(`${T.noSuchCard.zh}: no-such-card`);
    const e = simError(new Error('no project template project.nothing'));
    expect(errorText(e, 'zh')).toBe(`${T.error.zh}: no project template project.nothing`);
    expect(e.what).toBe(T.error);
  });
});

describe('switching language changes no sim state and no golden result', () => {
  for (const policy of GOLDEN_POLICIES) {
    it(`${policy}: rendered in alternating languages, the run equals its golden file`, () => {
      const { x, rec } = drive(policy, false);
      expect(x.mode).toBe('over');
      const o = { policy, seed: 1, quarters: slice.init.scenario.turns };
      const text = goldenText(runSummary(rec, o, slice.params, slice.tick.fiscal!, slice.content, slice.tick));
      expect(text).toBe(readFileSync(join(ROOT, goldenPath(policy)), 'utf8').replace(/\r\n/g, '\n'));
    }, 120_000);
  }
});
