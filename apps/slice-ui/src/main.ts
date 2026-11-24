/**
 * The slice in the browser (phase1-slice.md §11, §11.1): puts the renderers' HTML on the page and sends the player's
 * choices to the controller. Ugly on purpose. The UI shows one language, English or Simplified Chinese (?lang=, the
 * stored choice, then English); switching it only re-renders, and place labels stay bilingual in both.
 */
import { spatialViews, templateZoneAction, type LandUse, type PlayerAction, type Priority, type StartSite } from '@sz/sim-core';
import { choose, dequeue, enqueue, newSession, simError, submit, type Session } from './controller.js';
import { isLang, readStoredLang, resolveLang, storeLang, withLang, type Lang } from './lang.js';
import { loadSlice } from './load.js';
import { SliceMap } from './map.js';
import {
  effectiveTarget, hoverText, htmlLang, pageTitle, renderOverlays, renderRight, renderTurn, renderVerdict,
  type UiState, type View,
} from './render.js';
import { clipZone, overlayRgba, previewZone, type OverlayLayer } from './views.js';

const $ = (id: string) => document.getElementById(id)!;

const slice = loadSlice();
const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1) || 1;
let lang: Lang = resolveLang(location.search, readStoredLang());
let x: Session = newSession(slice, seed);
const ui: UiState = { layer: 'areas', tab: 'ledger', area: 7, drawUse: null,
  project: slice.tick.fiscal?.projects[0]?.id ?? '', target: '', priority: 'normal' };

const siteAt = (c: { x: number; y: number }) => slice.startSites.find((s) => s.cell[0] === c.x && s.cell[1] === c.y);
/** The derived views (b&c §13.1), rebuilt from the state whenever its zones or works change; never saved. */
let spatial = spatialViews(x.state, slice.startNetwork);
let mapped: [typeof x.state.zones, typeof x.state.cellWorks] | undefined;
let selectedSite: StartSite | undefined;
const view = (): View => ({ slice, x, ui, lang, spatial, selectedSite });

const map = new SliceMap($('map') as HTMLCanvasElement, x.state, slice.startSites, slice.startNetwork.routes, {
  hover: (c) => { $('hover').textContent = c ? hoverText(view(), c) : ''; },
  click: (c) => {
    selectedSite = siteAt(c);
    const area = selectedSite?.area ?? c.area;
    if (area) { ui.area = area; ui.tab = 'area'; }
    render();
  },
  drawing: (x0, y0, x1, y1) => previewZone(x.state, x.queue, x0, y0, x1, y1),
  drew: (x0, y0, x1, y1) => {
    const runs = previewZone(x.state, x.queue, x0, y0, x1, y1);
    if (ui.drawUse && runs.length) x = enqueue(x, { type: 'create_zone', use: ui.drawUse, runs });
    render();
  },
});

const act = (a: PlayerAction) => { x = enqueue(x, a); render(); };

/** Switch the language: store it, rewrite ?lang in place (keeping ?seed), re-render. The session is untouched. */
function setLang(next: Lang): void {
  lang = next;
  storeLang(next);
  try { history.replaceState(history.state, '', `${location.pathname}${withLang(location.search, next)}${location.hash}`); } catch { /* ignore */ }
  render();
}

function render(): void {
  if (mapped?.[0] !== x.state.zones || mapped[1] !== x.state.cellWorks) {
    spatial = spatialViews(x.state, slice.startNetwork);
    mapped = [x.state.zones, x.state.cellWorks];
  }
  ui.target = effectiveTarget({ slice, x, ui });
  const v = view();
  document.documentElement.lang = htmlLang(lang);
  document.title = pageTitle(lang);
  $('left').innerHTML = renderTurn(v);
  $('right').innerHTML = renderRight(v);
  $('overlays').innerHTML = renderOverlays(v);
  const queued = x.queue.flatMap((a) => (a.type === 'create_zone' ? [{ runs: a.runs, color: 'rgba(120,230,255,.6)' }] : []));
  const zones = ui.layer === 'land_use' ? queued : [...x.state.zones.map((z) => ({ runs: z.runs, color: 'rgba(255,255,255,.22)' })), ...queued];
  map.setState(x.state, overlayRgba(x.state, slice, ui.layer), zones);
  map.setDrawMode(ui.drawUse !== null && x.mode === 'turn');
  const verdict = renderVerdict(v);
  if (verdict === undefined) $('verdict').style.display = 'none';
  else { $('verdictBody').innerHTML = verdict; $('verdict').style.display = 'flex'; }
}

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!t) return;
  const d = t.dataset;
  switch (d.act) {
    case 'lang': if (isLang(d.lang) && d.lang !== lang) setLang(d.lang); return;
    case 'choose': x = choose(x, d.card!, x.answers[d.card!] === d.opt ? undefined : d.opt); break;
    case 'dequeue': x = dequeue(x, Number(d.k)); break;
    case 'submit': x = submit(x); break;
    case 'tab': ui.tab = d.tab!; break;
    case 'layer': ui.layer = d.layer as OverlayLayer; break;
    case 'draw': ui.drawUse = (d.use || null) as LandUse | null; break;
    case 'enforce': return act({ type: 'set_enforcement', level: d.v as never });
    case 'permit': return act({ type: 'set_permit_regime', regime: d.v as never });
    case 'rmzone': return act({ type: 'remove_zone', zone: Number(d.id) });
    case 'cancel': return act({ type: 'cancel_project', project: Number(d.id) });
    case 'team': return act({ type: 'contract_team', team: d.id!, mode: 'pool' });
    case 'template': {
      const p = slice.tick.precedents?.find((q) => q.id === d.id);
      if (!p) break;
      try {
        const a = templateZoneAction(x.state, p);
        const runs = clipZone(x.state, x.queue, a.runs);
        if (runs.length) return act({ ...a, runs });
      } catch (err) { x = { ...x, error: simError(err) }; }
      break;
    }
    case 'commit': {
      const [kind, id] = ui.target.split(':');
      return act({ type: 'commit_project', template: ui.project, priority: ui.priority,
        ...(kind === 'zone' ? { zone: Number(id) } : { area: Number(id) }) });
    }
    case 'restart': x = newSession(slice, x.seed); break;
  }
  render();
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLSelectElement;
  if (t.dataset.ui === 'project') ui.project = t.value;
  else if (t.dataset.ui === 'target') ui.target = t.value;
  else if (t.dataset.ui === 'priority') ui.priority = t.value as Priority;
  else return;
  render();
});

render();
