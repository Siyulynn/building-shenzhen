/**
 * The slice in the browser (phase1-slice.md §11.1, §11.2): a full-bleed planning map with a HUD floating over it.
 * main.ts only wires the DOM: it puts the renderers' HTML on the page, turns map gestures into the tools' plans and
 * sends them to the controller. The UI shows one language, English or Simplified Chinese (?lang=, the stored choice,
 * then English); switching it only re-renders, and place labels stay bilingual in both.
 */
import { choose, dequeue, enqueue, newSession, submit, type Session } from './controller.js';
import { isLang, readStoredLang, resolveLang, storeLang, withLang, type Lang } from './lang.js';
import { loadSlice } from './load.js';
import { SliceMap, type Cell } from './map.js';
import {
  hoverText, htmlLang, initialUi, pageTitle, renderBriefing, renderChips, renderCue, renderDecisions, renderDrawer,
  renderFlyout, renderInspector, renderOverlaySelect, renderPreview, renderQuarter, renderRail, renderStack, renderVerdict,
  type UiState, type View,
} from './render.js';
import { sceneOf } from './scene.js';
import { BUILD_TOOLS, applyPlan, guidePlan, planGesture, type Plan, type Tool } from './tools.js';
import { unanswered } from './controller.js';
import type { DrawerId, OverlayLayer } from './views.js';
import type { LandUse, RoadClass } from '@sz/sim-core';

const $ = (id: string) => document.getElementById(id)!;

const slice = loadSlice();
const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1) || 1;
let lang: Lang = resolveLang(location.search, readStoredLang());
storeLang(lang);                                   // a ?lang visit is remembered too
let x: Session = newSession(slice, seed);
const ui: UiState = initialUi(slice);
let plan: Plan | null = null;                      // the gesture being drawn, and its preview
let cursor = { x: 0, y: 0 };

const siteAt = (c: { x: number; y: number }) => slice.startSites.find((s) => s.cell[0] === c.x && s.cell[1] === c.y);
const view = (): View => ({ slice, x, ui, lang, selectedSite: ui.selected ? siteAt(ui.selected) : undefined });
const isBuildTool = (t: Tool) => BUILD_TOOLS.includes(t);

function gesture(from: Cell, to: Cell, done: boolean): void {
  const p = planGesture(x, ui.opts, { tool: ui.tool, from: [from.x, from.y], to: [to.x, to.y] });
  if (!done) { plan = p; render(); return; }
  plan = null;
  x = applyPlan(x, p);
  render();
}

/** Close the briefing; a card that must be answered (the opening one on Turn 1, R7) then opens by itself (§11.2). */
function leaveBriefing(): void {
  ui.briefing = false;
  if (unanswered(x).length) ui.decisions = true;
}

const map = new SliceMap($('map') as HTMLCanvasElement, slice, x.state, {
  hover: (c, client) => {
    cursor = client;
    $('hover').textContent = c ? hoverText(view(), c) : '';
    placePreview();
  },
  click: (c) => {
    if (ui.briefing) { leaveBriefing(); render(); return; }   // the first click on the map closes the briefing
    if (isBuildTool(ui.tool) && x.mode === 'turn') { gesture(c, c, true); return; }
    ui.selected = { x: c.x, y: c.y };
    if (c.area) ui.area = c.area;
    render();
  },
  drag: (from, to, done) => {
    if (ui.briefing) leaveBriefing();
    if (x.mode !== 'turn') return;
    gesture(from, to, done);
  },
});

function placePreview(): void {
  const el = $('preview');
  if (!plan || plan.kind === 'none') { el.style.display = 'none'; return; }
  el.innerHTML = renderPreview(plan, { x, lang });
  el.style.display = 'block';
  el.style.left = `${Math.min(innerWidth - 260, cursor.x + 16)}px`;
  el.style.top = `${Math.min(innerHeight - 160, cursor.y + 16)}px`;
}

/** Switch the language: store it, rewrite ?lang in place (keeping ?seed), re-render. The session is untouched. */
function setLang(next: Lang): void {
  lang = next;
  storeLang(next);
  try { history.replaceState(history.state, '', `${location.pathname}${withLang(location.search, next)}${location.hash}`); } catch { /* ignore */ }
  render();
}

const show = (id: string, html: string) => { const el = $(id); el.innerHTML = html; el.style.display = html ? '' : 'none'; };

function render(): void {
  if (x.mode !== 'turn' && isBuildTool(ui.tool)) ui.tool = 'select';   // tools are off mid-quarter and after the end
  if (x.mode === 'paused' && unanswered(x).length) ui.decisions = true;
  const v = view();
  document.documentElement.lang = htmlLang(lang);
  document.title = pageTitle(lang);
  show('quarter', renderQuarter(v));
  show('cue', renderCue(v));
  show('overlay', renderOverlaySelect(v));
  show('inspector', renderInspector(v));
  show('rail', renderRail(v));
  show('flyout', ui.tool === 'select' || ui.drawer ? '' : renderFlyout(v));
  show('chips', renderChips(v));
  show('stack', renderStack(v));
  show('drawer', renderDrawer(v));
  show('decisions', ui.decisions ? renderDecisions(v) : '');
  const briefingOn = ui.briefing && x.mode === 'turn' && !ui.decisions;
  show('briefing', briefingOn ? renderBriefing(v) : '');
  $('dim').style.display = briefingOn || ui.decisions ? 'block' : 'none';
  map.setScene(sceneOf(x, slice, { layer: ui.layer, guide: ui.guide, selected: ui.selected, plan }));
  map.setDrawMode(isBuildTool(ui.tool) && x.mode === 'turn');
  placePreview();
  const verdict = renderVerdict(v);
  if (verdict === undefined) $('verdict').style.display = 'none';
  else { $('verdictBody').innerHTML = verdict; $('verdict').style.display = 'flex'; }
}

const act = (a: Parameters<typeof enqueue>[1]) => { x = enqueue(x, a); render(); };

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!t) return;
  const d = t.dataset;
  switch (d.act) {
    case 'lang': if (isLang(d.lang) && d.lang !== lang) setLang(d.lang); return;
    case 'tool': ui.tool = d.tool as Tool; plan = null; ui.drawer = null; break;   // the flyout and a drawer share the left column
    case 'use': ui.opts.use = d.use as LandUse; break;
    case 'roadClass': ui.opts.roadClass = d.cls as RoadClass; break;
    case 'zoneGuide': {
      const p = slice.tick.precedents?.find((q) => q.id === d.id);
      if (p) x = applyPlan(x, guidePlan(x, ui.opts, p));
      break;
    }
    case 'drawer': ui.drawer = ui.drawer === d.drawer ? null : d.drawer as DrawerId; break;
    case 'closeDrawer': ui.drawer = null; break;
    case 'decisions': ui.decisions = !ui.decisions; ui.briefing = false; break;
    case 'closeDecisions': ui.decisions = false; break;
    case 'briefing': ui.briefing = true; ui.decisions = false; break;
    case 'toMap': leaveBriefing(); break;
    case 'unselect': ui.selected = null; break;
    case 'choose': x = choose(x, d.card!, x.answers[d.card!] === d.opt ? undefined : d.opt); break;
    case 'dequeue': x = dequeue(x, Number(d.k)); break;
    case 'submit': {
      const before = x.turnStart;
      x = submit(x);
      if (x.turnStart !== before && x.mode === 'turn') { ui.briefing = true; ui.decisions = false; }
      if (x.mode === 'paused') ui.decisions = true;
      break;
    }
    case 'enforce': return act({ type: 'set_enforcement', level: d.v as never });
    case 'permit': return act({ type: 'set_permit_regime', regime: d.v as never });
    case 'cancel': return act({ type: 'cancel_project', project: Number(d.id) });
    case 'team': return act({ type: 'contract_team', team: d.id!, mode: 'pool' });
    case 'buyPower': return act({ type: 'buy_power', kw: Number(d.kw) });
    case 'pauseOrder': return act({ type: 'set_works_paused', order: Number(d.id), paused: d.paused === '1' });
    case 'cancelOrder': return act({ type: 'cancel_works', order: Number(d.id) });
    case 'restart': x = newSession(slice, x.seed); ui.briefing = true; ui.selected = null; break;
  }
  render();
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement & HTMLSelectElement;
  switch (t.dataset.ui) {
    case 'layer': ui.layer = t.value as OverlayLayer; break;
    case 'facility': ui.opts.facility = t.value; break;
    case 'planOnly': ui.opts.planOnly = t.checked; break;
    case 'guide': ui.guide = t.checked; break;
    case 'area': ui.area = Number(t.value); break;
    default: return;
  }
  render();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (plan) plan = null;
  else if (ui.decisions && !unanswered(x).length) ui.decisions = false;
  else if (ui.drawer) ui.drawer = null;
  else if (ui.briefing) leaveBriefing();
  else if (ui.selected) ui.selected = null;
  else ui.tool = 'select';
  render();
});

render();
