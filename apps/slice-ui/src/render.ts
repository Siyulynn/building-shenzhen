/**
 * The planning-map HUD as HTML (phase1-slice.md §11.1, §11.2): pure functions of the session, the UI's own choices
 * and the language. They read the views and the sim state and change neither; main.ts puts what they return on the
 * page. The chrome shows one language; place labels (marked by place() in the views) read zh and en in both.
 */
import {
  ENFORCEMENT_LEVELS, IMPORT_QUOTAS, HIGH_INTENSITY_KEY, INTENSITIES, LAND_USES, PERMIT_REGIMES, SHORTCUT_CARD, formatYM, landCoverAt,
  type Slice, type StartSite,
} from '@sz/sim-core';
import { unanswered, type Session, type UiError } from './controller.js';
import { LANGS, LANG_NAME, HTML_LANG, pick, type Lang } from './lang.js';
import * as S from './strings.js';
import { bi, type L } from './strings.js';
import { BUILD_TOOLS, TOOLS, queuedBudget, type Plan, type Tool, type ToolOptions } from './tools.js';
import { tutorialView } from './tutorial.js';
import {
  DRAWERS, LAND_COVER_COLOR, powerView, freightView, OVERLAY_LAYERS, USE_COLOR, actionLabel, areaName, areaView, briefing, cardStack, chipsView, constraintContext,
  commitments, constraintLabel, finishedWork, icrCue, inspectorView, ledgerView, leadersView, mostHeldBack, num, pct, projectsView,
  reviewView, readinessView, siteName, teamsView, verdictView, worksView, yuan, zoneName, gateLock, newsView, modifiersView,
  type DrawerId, type OverlayLayer,
} from './views.js';

/** The UI's own choices: never part of the session, never sent to the sim. */
export interface UiState {
  layer: OverlayLayer;
  tool: Tool;
  opts: ToolOptions;
  guide: boolean;                              // the historical plan drawn over the map; commits nothing
  drawer: DrawerId | null;                     // one at a time
  decisions: boolean;                          // the card modal
  briefing: boolean;                           // the start-of-turn briefing, over the dimmed map
  selected: { x: number; y: number } | null;   // the inspected cell
  area: number;                                // the Population drawer's area
  tutorial: boolean;                           // R11.1: the guided opening, session-only
  tutorialStep: number;
  scrutinySeen: boolean;                       // R11.1: old Liang has explained the first scrutiny score
  sezReported: boolean;                        // R11.2: the prologue result has been shown
  details: boolean;                            // R11.1: full flyout descriptions; off = one brief line
}
export const initialUi = (slice: Slice): UiState => ({
  layer: 'areas', tool: 'select', guide: false, drawer: null, decisions: false, briefing: true, selected: null, area: 1,
  tutorial: true, tutorialStep: 0, scrutinySeen: false, sezReported: false, details: false,
  opts: { use: 'industrial', planOnly: false, facility: Object.keys(slice.params.works?.facilities ?? {})[0] ?? 'school' },
});
/** Everything a screen reads. */
export interface View {
  readonly slice: Slice; readonly x: Session; readonly ui: Readonly<UiState>; readonly lang: Lang;
  readonly selectedSite?: StartSite | undefined;
  readonly historical?: import('./views.js').HistoricalPlan | undefined;   // R11.2: the 1984 proposal
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ESC[c]!);

/** The guide's portrait (R11.1). Bundled by Vite; tests only read the surrounding HTML. */
const LAOLIANG = new URL('./assets/laoliang.webp', import.meta.url).href;

/** The language's text of a string, escaped. */
const tx = (lang: Lang) => (l: L) => esc(pick(l, lang));

export const pageTitle = (lang: Lang) => pick(S.T.title, lang);
export const htmlLang = (lang: Lang) => HTML_LANG[lang];

/** An error as the chosen language shows it: the string-table entry, then its detail. */
export function errorText(e: UiError, lang: Lang): string {
  const what = pick(e.what, lang);
  return e.detail === undefined ? what : `${what}: ${e.detail}`;
}

/** A diagnostic (sim-core's own message, or ids): shown as written, marked so the language checks skip it (§11.1). */
const diag = (d: string) => `<span class="diag" lang="en">${esc(d)}</span>`;

/** The switch: each language named in its own script (§11.1). */
export function renderLangSwitch(lang: Lang): string {
  return `<div class="lang" role="group" aria-label="${esc(pick(S.T.language, lang))}">${LANGS.map((k) =>
    `<button data-act="lang" data-lang="${k}" lang="${HTML_LANG[k]}" class="${k === lang ? 'sel' : ''}">${esc(LANG_NAME[k])}</button>`).join('')}</div>`;
}

const bar = (n: number) => `<div class="bar"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, n)))}%"></i></div>`;
const row = (lang: Lang) => (l: L, val: string) => `<tr><td>${tx(lang)(l)}</td><td class="n">${esc(val)}</td></tr>`;
const closeBtn = (lang: Lang, act: string) => `<button class="x" data-act="${act}" aria-label="${esc(pick(S.T.close, lang))}">✕</button>`;
const off = (v: View) => (v.x.mode !== 'turn' ? 'disabled' : '');
const delta = (d: number | undefined, money?: boolean) => d === undefined || d === 0 ? ''
  : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${money ? yuan(Math.abs(d)) : num(Math.abs(d))}</span>`;

// ---- the first level: the quarter, the cue, the overlay switcher, the chips, the stack ----

/** The quarter label (top left): the date and the turn out of 21, and the language switch. */
export function renderQuarter(v: View): string {
  const { x } = v, s = x.state, t = tx(v.lang);
  const turn = Math.min(s.turn + 1, s.scenario.turns);
  return `${renderLangSwitch(v.lang)}<div class="when">${esc(formatYM(s.date))}</div>
    <div class="muted">${t(S.T.turn)} ${turn} / ${s.scenario.turns}${x.mode === 'paused' ? ` · ${t(S.T.paused)}` : ''}</div>
    <button class="gamebtn" data-act="gameMenu">${t(S.MENU.game)}</button>`;
}

/** The I/C/R cue (top centre): three bars and no numbers; hovering a bar names its two inputs. */
export function renderCue(v: View): string {
  const t = tx(v.lang), cue = icrCue(v.x.state, v.slice);
  return `<span class="muted">${t(S.T.demandCue)}</span>` + (['i', 'c', 'r'] as const).map((k) => {
    const b = cue[k];
    return `<div class="cue${b.low ? ' low' : ''}"><b>${t(S.CUE[k]!)}</b>${bar(b.level)}
      <span class="tip">${b.inputs.map((i) => t(i.label)).join('<br>')}${b.low ? `<br><em>${t(S.T.low)}</em>` : ''}</span></div>`;
  }).join('');
}

/** The overlay switcher (top right): the dropdown, the map controls and the key (R11.1). */
export function renderOverlaySelect(v: View): string {
  const t = tx(v.lang), s = v.x.state;
  const areas = s.areas.map((a) => `<div class="arearow"><button data-act="focusArea" data-id="${a.id}"
    title="${esc(t(S.T.focusArea))}" aria-label="${esc(`${t(areaName(s, a.id))} · ${t(S.T.focusArea)}`)}">${a.id}</button>
    <span class="${a.access === 'playable' ? '' : 'muted'}">${esc(t(areaName(s, a.id)))}${a.access === 'playable' ? '' : ` · ${t(S.T.cardsOnly)}`}</span></div>`).join('');
  return `<label class="muted">${t(S.T.overlay)} <select data-ui="layer">${OVERLAY_LAYERS.map((k) =>
    `<option value="${k}" ${v.ui.layer === k ? 'selected' : ''}>${t(S.OVERLAYS[k]!)}</option>`).join('')}</select></label>
    <div class="mapctl"><button data-act="mapFitPlayable">${t(S.T.fitPlayable)}</button><button data-act="mapFitAll">${t(S.T.fitAll)}</button>
      <span class="zoom"><button data-act="mapZoomOut" aria-label="${esc(t(S.T.zoomOut))}" title="${esc(t(S.T.zoomOut))}">−</button>
      <button data-act="mapZoomIn" aria-label="${esc(t(S.T.zoomIn))}" title="${esc(t(S.T.zoomIn))}">+</button></span></div>
    <details class="key" open><summary>${t(S.T.mapKey)}</summary>
      <div><i class="sw playable"></i>${t(S.T.playableArea)}</div>
      <div><i class="sw card"></i>${t(S.T.cardOnlyArea)}</div>
      <div><i class="sw border"></i>${t(S.T.cityBorder)}</div>
      <div><i class="sw farm"></i>${t(S.T.farmlandBuildable)}</div>
      ${v.ui.tool === 'zone' ? `<div class="muted">${t(S.T.notFormable)}</div>
        <div><i class="sw villageNoform"></i>${t(S.T.notFormableVillage)}</div>
        <div><i class="sw hillNoform"></i>${t(S.T.notFormableHill)}</div>` : ''}
      <div class="muted">${t(S.T.zoneKey)}</div>
      ${['industrial', 'residential', 'commercial'].map((k) => `<div><i class="sw" style="background:rgba(${USE_COLOR[k]!.slice(0, 3).join(',')},.7)"></i>${t(S.LAND_USE[k]!)}</div>`).join('')}
      ${v.historical ? `<div><i class="sw" style="border:1px dashed #24476b"></i>${t(S.T.historicalProposal)}</div>
        <div><i class="sw" style="border:1px dashed #5c1f24;background:rgba(196,120,60,.25)"></i>${t(S.T.historicalWorks)}</div>
        <div><i class="sw" style="border:1px solid #3a5a32;background:rgba(96,150,84,.4)"></i>${t(S.T.historicalReference)}</div>
        <div><i class="sw" style="border:0;border-top:3px solid #24476b"></i>${t(S.T.historicalRoadAvenue)}</div>
        <div><i class="sw" style="border:0;border-top:2px solid #4a6f8f"></i>${t(S.T.historicalRoadStreet)}</div>
        <div><i class="sw" style="border:0;border-top:2px dashed #7a8b70"></i>${t(S.T.historicalRoadTrack)}</div>` : ''}
      <div><i class="sw road"></i>${t(S.T.startRoutes)}</div>
    </details>
    <details class="key"><summary>${t(S.T.areasLegend)} (${s.areas.length})</summary>${areas}</details>
    <details class="key"><summary>${t(S.T.temporaryAlignments)}</summary><div class="hint">${t(S.T.temporaryAlignmentHint)}</div>${v.slice.startNetwork.routes.map((r) =>
      `<div><i class="${r.kind}"></i>${esc(bi(r.name))}</div>`).join('')}</details>
    ${v.ui.layer === 'land_cover' ? `<details class="key" open><summary>${t(S.OVERLAYS.land_cover!)}</summary>${Object.entries(LAND_COVER_COLOR)
      .map(([k, c]) => `<div style="border-left:10px solid rgba(${c.slice(0, 3).join(',')})">&nbsp;${t(S.LAND_COVER[k]!)}</div>`).join('')}</details>` : ''}`;
}

/** The chip strip (bottom): five chips of two stats each, each stat under a visible caption; each opens its drawer. */
export function renderChips(v: View): string {
  const t = tx(v.lang);
  const stat = (c: ReturnType<typeof chipsView>[number], k: 0 | 1) =>
    `<span><small>${t(c.captions[k])}</small><span class="tip">${t(c.hints[k])}</span>${esc(c.values[k])}</span>`;
  return chipsView(v.x.state, v.slice, queuedBudget(v.x)).map((c) => `<button class="chip${v.ui.drawer === c.id ? ' sel' : ''}" data-act="drawer" data-drawer="${c.id}">
    <b>${t(c.label)}</b>${stat(c, 0)}${stat(c, 1)}</button>`).join('');
}

/** R11.1: the readiness strip in the lower-right stack; the details open as a drawer. */
export function renderReadinessStrip(v: View): string {
  const { x, slice } = v, t = tx(v.lang);
  if (x.state.sez.opened || x.mode === 'over') return '';
  const r = readinessView(x.state, slice);
  return `<button class="readystrip${v.ui.drawer === 'readiness' ? ' sel' : ''}" data-act="drawer" data-drawer="readiness">
    <span class="readyrow"><b>${t(S.T.bar)}</b><span>${pct(r.bar)}</span><small>${t(S.T.readinessTarget)} ${pct(r.targetBar)}</small></span>
    <span class="bar readibar"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, r.bar)))}%"></i><b class="mark" style="left:${Math.round(100 * r.targetBar)}%"></b></span>
  </button>`;
}

/** The bottom-right stack: readiness, the queue, Briefing, Pending decisions, End quarter or Continue; errors as a toast. */
export function renderStack(v: View): string {
  const { x, slice } = v, s = x.state, t = tx(v.lang);
  const queue = x.mode === 'turn' && x.queue.length ? `<div class="queue"><div class="muted">${t(S.T.queue)}</div>${x.queue.map((_, k) =>
    `<div class="q"><span>${t(actionLabel(s, slice, x.queue, k))}</span><button data-act="dequeue" data-k="${k}" aria-label="${esc(pick(S.T.remove, v.lang))}">✕</button></div>`).join('')}</div>` : '';
  const cards = cardStack(s, slice).length, must = unanswered(x).length;
  const error = x.error ? `<div class="err" role="alert">${x.error.what === S.T.error ? '' : `${t(S.T.error)}: `}${t(x.error.what)}${x.error.detail !== undefined ? `: ${diag(x.error.detail)}` : ''}</div>` : '';
  const committed = commitments(s, slice, queuedBudget(x));
  const over = committed.projected < 0 ? `<div class="warn">${t(S.T.overspend)}: ${yuan(-committed.projected)}</div>` : '';
  const go = x.mode === 'over' ? '' : `<button class="go" data-act="submit" ${must ? 'disabled' : ''}>${t(x.mode === 'paused' ? S.T.continue : S.T.endQuarter)}</button>`;
  return `${error}${over}${renderReadinessStrip(v)}${queue}
    <button data-act="briefing" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.T.briefing)}</button>
    <button data-act="decisions" class="${must ? 'must' : cards ? 'answered' : ''}">${t(S.T.pendingDecisions)} ${cards} · ${must} ${t(S.T.toAnswer)}</button>
    ${go}`;
}

/** R11.1: the guided opening as a movable dialogue with old Liang. main.ts applies the highlight. */
export function renderTutorial(v: View): string {
  const tut = tutorialView(v.x, v.ui, v.slice);
  if (!tut) return '';
  const t = tx(v.lang), scrutiny = tut.kind === 'scrutiny', sez = tut.kind === 'sez';
  const action = tut.action === 'start' ? `<button class="go" data-act="tutorialNext">${t(S.T.tutorialStart)}</button>`
    : tut.action === 'block' ? `<button data-act="tutorialBlock">${t(S.T.tutorialUseBlock)}</button>`
    : tut.action === 'done' ? `<button class="go" data-act="tutorialDone">${t(S.T.tutorialDone)}</button>`
    : tut.action === 'scrutiny' ? `<button class="go" data-act="scrutinyDone">${t(S.T.tutScrutinyDone)}</button>`
    : tut.action === 'sez' ? `<button class="go" data-act="sezDone">${t(S.T.sezResultDone)}</button>` : '';
  const step = sez ? t(S.T.sezResult) : scrutiny ? t(S.T.scrutiny) : `${tut.step + 1} / 6`;
  return `<div class="tuthead"><span class="grip" aria-hidden="true">⠿</span><b>${t(S.T.tutorialSpeaker)}</b>
      <small>${t(S.T.tutorialRole)}</small><span class="tutstep">${step}</span></div>
    <div class="tutbody"><img class="tutportrait" src="${esc(LAOLIANG)}" alt="" width="76" height="96">
      <div class="tutsay"><h3>${t(tut.title)}</h3><p>“${t(tut.body)}”</p>
      <div class="opts">${action}${scrutiny || sez ? '' : `<button data-act="tutorialSkip">${t(S.T.tutorialSkip)}</button>`}</div>
      ${tut.waiting ? `<div class="muted">${t(S.T.tutorialWait)}</div>` : ''}</div></div>`;
}

// ---- the tool rail and its flyout ----

const GLYPH: Readonly<Record<Tool, string>> = { select: '◎', road: '═', zone: '▦', service: '⚒', erase: '⌫', power: 'ϟ', station: '⌁', facility: '⌂' };

/** R9 (§11.2): the gate a whole tool needs; its zone uses, road classes and tiers are gated inside the flyout. */
const TOOL_GATE: Partial<Record<Tool, string>> = { power: 'structure.power_substation', station: 'structure.power_station', facility: 'structure.facility' };
/** R11.1: a gated choice is simply greyed; the opener is a hover tooltip, not extra copy. */
const lockedButton = (_lock: L, lang: Lang, label: string) =>
  `<button disabled aria-disabled="true" title="${esc(pick(S.T.unlockLater, lang))}">${label}</button>`;

export function renderRail(v: View): string {
  const t = tx(v.lang), s = v.x.state;
  return TOOLS.map((k) => {
    const lock = TOOL_GATE[k] ? gateLock(s, v.slice, TOOL_GATE[k]!) : undefined;
    const dis = (BUILD_TOOLS.includes(k) && v.x.mode !== 'turn') || lock ? 'disabled' : '';
    return `<button class="tool${v.ui.tool === k ? ' sel' : ''}${lock ? ' locked' : ''}" data-act="tool" data-tool="${k}" ${dis}
    ${lock ? `title="${esc(pick(S.T.unlockLater, v.lang))}"` : ''}><i>${GLYPH[k]}</i><span>${t(S.TOOL[k]!)}</span></button>`;
  }).join('');
}

/** R9 (§5.6): the works pace, for the tools that order works; greyed until works.priority opens. */
function paceRow(v: View): string {
  const t = tx(v.lang), cur = v.ui.opts.pace ?? 'normal', lock = gateLock(v.x.state, v.slice, 'works.priority');
  const steps = ['normal', 'push', 'all_out'].map((k) => k !== 'normal' && lock ? lockedButton(lock, v.lang, t(S.PACE[k]!))
    : `<button data-act="pace" data-pace="${k}" class="${cur === k ? 'sel' : ''}" title="${esc(t(S.PACE_BRIEF[k]!))}">${t(S.PACE[k]!)}</button>`).join('');
  return `<div class="muted">${t(S.T.pace)}</div><div class="opts">${steps}</div>
    <div class="hint">${t(v.ui.details ? S.T.paceHint : S.PACE_BRIEF[cur]!)}</div>`;
}

/** The open tool's flyout: what it does, and its choices. */
export function renderFlyout(v: View): string {
  const t = tx(v.lang), { ui, slice } = v, k = ui.tool;
  let body = `<div class="muted">${t(S.TOOL_HINT[k]!)}</div>`;
  if (BUILD_TOOLS.includes(k)) body += `<div class="hint gesture">${t(S.T.mapGestureHint)}</div>`;
  body += `<label class="switch"><input type="checkbox" data-ui="details" ${ui.details ? 'checked' : ''}> ${t(S.T.showDetails)}</label>`;
  // R7 (§13 vocabulary): the Form site hint, wherever site formation is ordered
  const formation = `<div class="hint"><b>${t(S.T.siteFormation)}:</b> ${t(S.T.formationHint)}</div>`;
  if (k === 'service') body += (v.ui.details ? formation : `<div class="hint"><b>${t(S.T.siteFormation)}:</b> ${t(S.T.formationBrief)}</div>`) + paceRow(v);
  if (k === 'power') body += paceRow(v);                // a station builds at its own pace (§5.6)
  if (k === 'zone') {
    // R8b (§11.2): public is gone; facilities are placed directly
    const uses = LAND_USES.filter((u) => u !== 'reserve').map((u) => {
      const lock = gateLock(v.x.state, slice, `zone.${u}`);   // R9 (§11.2)
      return lock ? lockedButton(lock, v.lang, t(S.LAND_USE[u]!)) : `<button data-act="use" data-use="${u}" class="${ui.opts.use === u ? 'sel' : ''}"
      style="border-left:6px solid rgba(${USE_COLOR[u]!.slice(0, 3).join(',')})">${t(S.LAND_USE[u]!)}</button>`;
    }).join('');
    // R8b (§5.3): the intensity; high is shown disabled with its reason until it is unlocked
    const tier = ui.opts.intensity ?? 'standard', highOpen = v.x.state.events.unlocked.includes(HIGH_INTENSITY_KEY);
    // R9 (§11.2): a tier's gate names its opener; without gates, high keeps its R8b reason
    const tiers = INTENSITIES.map((k) => {
      const lock = gateLock(v.x.state, slice, `zone.intensity.${k}`) ?? (k === 'high' && !highOpen && !slice.tick.gates?.length ? S.T.highLocked : undefined);
      return lock ? lockedButton(lock, v.lang, t(S.INTENSITY[k]!))
        : `<button data-act="intensity" data-tier="${k}" class="${tier === k ? 'sel' : ''}" title="${esc(t(S.INTENSITY_DETAIL[k]!))}">${t(S.INTENSITY[k]!)}</button>`;
    }).join('');
    const guides = v.historical?.zones.length ? v.historical.zones : (slice.tick.precedents ?? []).filter((p) => p.cells.length);
    body += `<div class="opts">${uses}</div>
      <div class="muted">${t(S.T.intensity)}</div><div class="opts">${tiers}</div>
      <div class="hint">${t(ui.details ? S.T.intensityHint : S.INTENSITY_BRIEF[tier]!)}</div>
      ${ui.opts.planOnly ? '' : (ui.details ? formation : `<div class="hint"><b>${t(S.T.siteFormation)}:</b> ${t(S.T.formationBrief)}</div>`) + paceRow(v)}
      <label><input type="checkbox" data-ui="planOnly" ${ui.opts.planOnly ? 'checked' : ''}> ${t(S.T.planOnly)}</label>
      <label><input type="checkbox" data-ui="guide" ${ui.guide ? 'checked' : ''}> ${t(S.T.showGuide)}</label>
      <div class="hint">${t(S.T.guideReference)}</div>
      ${v.historical ? `<div class="muted">${t(S.T.historicalPlan)} · ${esc(v.historical.date)}</div>` : ''}
      <details class="key historical"><summary>${t(S.T.historicalPlanZones)} (${guides.length})</summary>
        ${guides.map((p) => `<div class="q"><span>${esc(bi(p.name))}</span></div>`).join('')}</details>`;
  } else if (k === 'road') {
    // R8d (§5.12): the tier before the drag
    const cls = ui.opts.roadClass ?? 'street';
    body += `<div class="muted">${t(S.T.roadTier)}</div><div class="opts">${['track', 'street', 'avenue'].map((c) => {
      const lock = gateLock(v.x.state, slice, `road.${c}`);   // R9 (§11.2)
      return lock ? lockedButton(lock, v.lang, t(S.ROAD_CLASS[c]!))
        : `<button data-act="roadClass" data-cls="${c}" class="${cls === c ? 'sel' : ''}">${t(S.ROAD_CLASS[c]!)}</button>`;
    }).join('')}</div>
      <div class="hint">${t(v.ui.details ? S.T.roadTierHint : S.T.roadTierBrief)}</div>${paceRow(v)}`;
  } else if (k === 'facility') {
    const types = Object.keys(slice.params.works?.facilities ?? {});
    body += `<label>${t(S.T.facilityType)} <select data-ui="facility">${types.map((f) =>
      `<option value="${esc(f)}" ${ui.opts.facility === f ? 'selected' : ''}>${t(S.FACILITY[f] ?? { zh: f, en: f })}</option>`).join('')}</select></label>${paceRow(v)}`;
  }
  return `<h3>${t(S.TOOL[k]!)}</h3>${body}`;
}

/** The live preview next to the cursor while a tool is used. */
export function renderPreview(plan: Plan, v: Pick<View, 'x' | 'lang'>): string {
  const t = tx(v.lang), tr = row(v.lang);
  if (plan.kind === 'none') return '';
  if (plan.kind === 'refused') return `<div class="refused">${t(plan.what)}${plan.detail ? `<div class="muted">${diag(plan.detail)}</div>` : ''}</div>`;
  if (plan.kind === 'dequeue') return `<div>${t(S.T.remove)}: ${t(plan.label)}</div>`;
  const p = plan.preview;
  return `${p.area ? `<div>${t(areaName(v.x.state, p.area))}</div>` : ''}<table>
    ${tr(S.T.cells, num(p.cells))}${p.bridges ? tr(S.T.bridges, num(p.bridges)) : ''}
    ${tr(S.T.cost, `${yuan(p.budget)}${p.forexUsd ? ` + $${num(p.forexUsd)}` : ''}`)}
    ${p.compensation ? tr(S.OBLIGATION.compensation!, yuan(p.compensation)) : ''}
    ${Object.keys(p.byClass).length > 0 ? tr(S.T.landCover, Object.entries(p.byClass).map(([k, n]) => `${t(S.LAND_COVER[k]!)} ${num(n!)}`).join(', ')) : ''}
    ${p.orders ? `${tr(S.T.units, num(p.units))}${tr(S.T.crewPerMonth, num(p.crewPerMonth))}${tr(S.T.months, num(p.months))}` : ''}
    ${p.pace ? `${tr(S.T.monthsSaved, num(p.pace.monthsSaved))}${tr(S.T.extraYuan, yuan(p.pace.extraYuan))}` : ''}</table>
    ${p.note ? `<div class="down">${t(p.note)}</div>` : ''}`;
}

// ---- the cell inspector ----

export function renderInspector(v: View): string {
  const { ui, x, slice } = v, t = tx(v.lang), tr = row(v.lang);
  if (!ui.selected) return '';
  const c = inspectorView(x.state, slice, ui.selected.x, ui.selected.y);
  const share = c.share ? pct(c.share.power) : pick(S.T.noDemand, v.lang);
  return `${closeBtn(v.lang, 'unselect')}<h3>${t(S.T.cell)} ${c.x},${c.y}</h3>
    ${c.area ? `<div>${t(c.area)}</div>` : ''}${c.site ? `<div>${t(c.site)}</div>` : ''}
    ${c.route ? `<div>${t(c.route)} · ${t(S.T.temporaryAlignment)}</div>` : ''}
    ${c.landCover ? `<div class="muted">${t(S.T.landCover)}: ${t(c.landCover)}</div>` : ''}
    <div class="muted">${t(S.T.perCell)}</div><table>
      ${c.zone ? tr(S.ZONE, pick(c.zone, v.lang)) : ''}${c.use ? tr(S.T.use, pick(c.use, v.lang)) : ''}
      ${tr(S.T.stage, pick(c.stage, v.lang))}
      ${c.progress ? `<tr><td>${t(S.T.progress)}${bar(c.progress.done / c.progress.total)}</td><td class="n">${num(c.progress.done)} / ${num(c.progress.total)}</td></tr>` : ''}
      ${tr(S.T.roadAccess, c.frontage ? `${t(S.T.depth)} ${c.frontage.depth} / ${c.frontage.max}`
        : c.prospectiveFrontage ? `${t(S.T.frontageIfZoned)} · ${t(S.T.depth)} ${c.prospectiveFrontage.depth} / ${c.prospectiveFrontage.max}`
        : `${t(S.T.noFrontageNear)} (${slice.startNetwork.maxFrontageDepth})`)}
      ${tr(S.T.supplied, share)}</table>
    <div class="muted">${t(S.T.stocks)}</div><table>
      ${c.zoneFloorM2 !== undefined ? tr(S.T.zoneFloor, `${num(c.zoneFloorM2)} m²`) : ''}
      ${c.villageFloorM2 !== undefined ? tr(S.T.villageFloor, `${num(c.villageFloorM2)} m²`) : ''}
      ${c.areaShare !== undefined ? tr(S.T.areaShare, pct(c.areaShare)) : ''}
      ${tr(S.T.jobs, `${num(c.jobs.filled)} / ${num(c.jobs.posted)}`)}${tr(S.T.beds, `${num(c.beds.occupants)} / ${num(c.beds.beds)}`)}</table>
    <div class="held"><b>${t(S.T.heldBackBy)}:</b> ${t(constraintLabel(c.constraint))}</div>`;
}

// ---- the briefing ----

export function renderBriefing(v: View): string {
  const { x, slice } = v, s = x.state, t = tx(v.lang);
  const br = briefing(s, slice, x.lastTurnStart);
  const rows = br.rows.map((r) => `<tr><td>${t(r.label)}</td><td class="n">${r.money ? yuan(r.value) : num(r.value)}</td><td class="n">${delta(r.delta, r.money)}</td></tr>`).join('');
  const fin = finishedWork(s, x.lastTurnStart).map((f) => {
    const parts: [number, L][] = [[f.serviced, S.T.servicedCells], [f.roads, S.T.roadCells], [f.sources, S.T.sourcesPlaced],
      [f.facilities, S.T.facilitiesPlaced], [f.orders, S.T.ordersDone], [f.firms, S.T.firmsOpened]];
    return `<div>${t(f.name)}: ${parts.filter(([n]) => n > 0).map(([n, l]) => `${num(n)}${v.lang === 'zh' ? '' : ' '}${t(l)}`).join(v.lang === 'zh' ? '，' : ', ')}</div>`;
  }).join('') || `<div class="muted">${t(S.T.noWorkFinished)}</div>`;
  const held = mostHeldBack(s, slice);
  // R9 (§11.2): the news since the previous turn's start, by desk, and the timed modifiers still in force
  const news = newsView(s, slice, x.lastTurnStart).map((g) => `<div class="desk"><h4>${t(S.DESK[g.desk] ?? { zh: g.desk, en: g.desk })}</h4>${g.items.map((n) =>
    n.text ? (n.letter ? `<article class="news letter"><div class="letterhead">${t(n.name)}</div><p>${t(n.text)}</p></article>`
      : `<div class="news"><b>${t(n.name)}</b><p>${t(n.text)}</p></div>`)
      : `<div class="news headline">${t(n.name)}</div>`).join('')}</div>`).join('') || `<div class="muted">${t(S.T.noNews)}</div>`;
  const mods = modifiersView(s, slice).map((m) => `<div>${t(m.target)} ×${String(Math.round(m.factor * 100) / 100)} · ${num(m.quartersLeft)} ${t(S.T.quartersLeft)} · ${t(m.source)}</div>`).join('')
    || `<div class="muted">${t(S.T.noModifiers)}</div>`;
  return `${closeBtn(v.lang, 'toMap')}<h2>${t(S.T.briefing)} · ${esc(br.when)}</h2>
    <div class="modal-body"><h3>${t(S.T.news)}</h3>${news}<h3>${t(S.T.liveModifiers)}</h3>${mods}<table>${rows}</table>
    <h3>${t(S.T.workFinished)}</h3>${fin}
    <h3>${t(S.T.heldBackArea)}</h3>${held ? `<div>${t(held.name)}: ${t(constraintLabel(held.constraint))} (${num(held.cells)}${v.lang === 'zh' ? '' : ' '}${t(S.T.cellsHeld)})</div>`
      : `<div class="muted">${t(S.T.nothingHeld)}</div>`}</div>
    <div class="modal-foot"><button class="go" data-act="toMap">${t(S.T.toMap)}</button></div>`;
}

// ---- the decisions modal ----

export function renderDecisions(v: View): string {
  const { x, slice } = v, t = tx(v.lang);
  const cards = cardStack(x.state, slice);
  const investor = (c: (typeof cards)[number]) =>
    c.card === SHORTCUT_CARD || (slice.tick.investors ?? []).some((a) => a.id === c.card);
  const main = cards.filter((c) => !investor(c) || c.interrupting);
  const more = cards.filter((c) => investor(c) && !c.interrupting);
  const html = (c: (typeof cards)[number]) => `<div class="card ${c.interrupting ? 'int' : ''}">
      <h3>${t(c.title)}${c.count > 1 ? ` ×${c.count}` : ''}</h3>
      <div class="muted">${t(c.interrupting ? S.T.mustAnswer : S.T.optional)}${c.raised ? ` · ${t(S.T.raised)} ${c.raised}` : ''}${c.expires ? ` · ${t(S.T.expires)} ${c.expires}` : ''}${c.count > 1 ? ` · ${t(S.T.stacked)} ${c.count}` : ''}</div>
      ${c.description ? `<p class="desc">${t(c.description)}</p>` : ''}
      ${c.lines.map((l) => `<div class="line">${t(l.label)}: ${t(l.value)}</div>`).join('')}
      <div class="opts">${c.options.map((o) => `<div class="opt"><button data-act="choose" data-card="${esc(c.id)}" data-opt="${esc(o.id)}" data-group="${c.count > 1 ? '1' : '0'}"
        class="${x.answers[c.id] === o.id ? 'sel' : ''}">${t(o.label)}</button>${o.note ? `<div class="muted">${t(o.note)}</div>` : ''}${o.badges.length ? `<ul class="badges">${o.badges.map((b) =>
        `<li>${t(b)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div></div>`;
  const moreHtml = more.length
    ? `<details class="more"><summary>${t(S.T.moreOffers)} (${more.length})</summary>${more.map(html).join('')}</details>` : '';
  return `${closeBtn(v.lang, 'closeDecisions')}<h2>${t(S.T.pendingDecisions)}</h2><div class="modal-body">${main.map(html).join('')}${moreHtml || (main.length ? '' : `<div class="muted">${t(S.T.noCards)}</div>`)}</div>
    <div class="modal-foot"><button data-act="closeDecisions">${t(S.T.close)}</button></div>`;
}

// ---- the drawers ----

function drawerBuilding(v: View): string {
  const t = tx(v.lang), { x, slice } = v;
  const teamLock = gateLock(x.state, slice, 'team.contract');
  const works = worksView(x.state, slice, x.queue).map((w) => `<div class="card"><b>#${w.id}</b> ${t(w.kind)} · ${t(w.where)}
      ${w.priority === 'high' ? `<span class="tag">${t(S.T.highPriority)}</span>` : ''}
      <div class="muted">${t(w.stage)}${w.waiting ? ` · ${t(w.waiting)}` : ''}${w.cancelling ? ` · ${t(S.T.cancelPending)}` : ''} · ${yuan(w.spent)} / ${yuan(w.budget)} · ${t(S.T.remaining)} ${yuan(w.budget - w.spent)}</div>
      ${w.compensation ? `<div class="line">${t(S.T.compensation)}: ${yuan(w.compensation)}</div>` : ''}
      ${w.byClass ? `<div class="line">${t(S.T.landCover)}: ${Object.entries(w.byClass).map(([k, n]) => `${t(S.LAND_COVER[k] ?? { zh: k, en: k })} ${num(n!)}`).join(' · ')}</div>` : ''}
      ${bar(w.total ? w.done / w.total : 0)}
      ${w.crewDefault ? `<div class="muted">${t(S.T.crews)}${w.crewPending ? ` · ${t(S.T.queue)}` : ''}</div><div class="opts">${[...new Set([w.crewDefault, w.crewDefault * 2, w.crewDefault * 3, w.crewDefault * 4, w.crew])]
        .filter((n) => n > 0 && n <= w.crewMax).map((n) => `<button data-act="orderCrews" data-id="${w.id}" data-crews="${n}"
        class="${w.crew === n ? 'sel' : ''}" ${off(v) || w.cancelling ? 'disabled' : ''}>${num(n)}</button>`).join('')}</div>` : ''}
      ${w.cells ? `<div class="cells">${w.cells.map((c) => `<span title="${c.x},${c.y}">${c.x},${c.y} ${t(c.stage)}</span>`).join(' · ')}</div>` : ''}
      ${w.gap ? `<button data-act="showGap" data-x="${w.gap.x}" data-y="${w.gap.y}" ${off(v)}>${t(S.T.showGap)}</button>` : ''}
      <button data-act="pauseOrder" data-id="${w.id}" data-paused="${w.paused ? '0' : '1'}" ${off(v) || w.cancelling ? 'disabled' : ''}>${t(w.paused ? S.T.resume : S.T.pause)}</button>
      <button data-act="cancelOrder" data-id="${w.id}" ${off(v) || w.cancelling ? 'disabled' : ''}>${t(w.cancelling ? S.T.cancelPending : S.T.cancel)}</button></div>`).join('') || `<div class="muted">${t(S.T.none)}</div>`;
  const crewCap = `<div class="muted">${t(S.T.crewCap)}: ${num(slice.params.works?.crew_per_order ?? 0)}</div>`;
  const projects = projectsView(x.state, slice).map((p) => `<div class="card"><b>#${p.id}</b> ${t(p.name)} · ${t(p.where)}
      <div class="muted">${t(p.stage)}${p.waiting ? ` · ${t(p.waiting)}` : ''} · ${yuan(p.spent)} / ${yuan(p.budget)}</div>${bar(p.progress)}
      <button data-act="cancel" data-id="${p.id}" ${off(v)}>${t(S.T.cancel)}</button></div>`).join('');
  return `<h2>${t(S.T.worksQueue)}</h2>${crewCap}${works}
    ${projects ? `<h2>${t(S.T.projectsList)}</h2>${projects}` : ''}
    <h2>${t(S.T.teams)}</h2>${teamsView(x.state, slice).map((m) => `<div class="q"><span>${t(m.name)} <span class="muted">${num(m.crew)} · ${yuan(m.costPerMonth)}/${t(S.T.month)}</span></span>
      ${m.live ? `<span class="muted">${t(S.T.live)}</span>` : teamLock ? lockedButton(teamLock, v.lang, t(S.T.contract))   // R9 (§11.2)
        : `<button data-act="team" data-id="${esc(m.id)}" ${off(v)}>${t(S.T.contract)}</button>`}</div>`).join('')}`;
}

/** R11.1: the prologue readiness details, opened from the lower-right strip. */
function drawerReadiness(v: View): string {
  const { x, slice } = v, t = tx(v.lang), r = readinessView(x.state, slice, x.lastTurnStart);
  const parts: [string, number][] = [['roads', r.roads], ['land', r.servicedLand], ['power', r.waterPower]];
  const labels: Record<string, L> = { roads: S.T.readyRoads, land: S.T.readyLand, power: S.T.readyWaterPower };
  const deltaKey = { roads: 'roads', land: 'servicedLand', power: 'waterPower' } as const;
  const partDelta = (k: string) => r.delta?.[deltaKey[k as keyof typeof deltaKey]];
  const weakest = r.weakest === 'servicedLand' ? 'land' : r.weakest === 'waterPower' ? 'power' : 'roads';
  const target = `${t(S.T.readinessTarget)}: ${pct(r.targetBar)} · ${r.targetCards} ${t(S.T.readinessCards)}`;
  return `<div class="readihead"><span class="readipct">${pct(r.bar)}</span><span class="muted">· ${t(S.T.readinessForecast)} ${r.forecast}</span></div>
    <div class="bar readibar"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, r.bar)))}%"></i><b class="mark" style="left:${Math.round(100 * r.targetBar)}%"></b></div>
    <div class="readitarget">${target}</div>
    <div class="readiparts">${parts.map(([k, n]) => { const d = partDelta(k); return `<div class="${k === weakest ? 'weak' : ''}"><span>${t(labels[k]!)}</span>${bar(n)}<b>${pct(n)}</b>${d === undefined || Math.abs(d) < 0.0005 ? '' : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '-'}${(100 * Math.abs(d)).toFixed(1)} ${t(S.T.points)}</span>`}</div>`; }).join('')}</div>
    <div class="muted">${t(S.T.weakestPart)}: ${t(labels[weakest]!)}${r.newFirms ? ` · ${num(r.newFirms)} ${t(S.T.newFirms)}` : ''}</div>
    <div class="hint">${t(S.T.readinessExplainer)}</div>`;
}

function drawerBudget(v: View): string {
  const t = tx(v.lang), tr = row(v.lang);
  const l = ledgerView(v.x.state, v.slice);
  const m = commitments(v.x.state, v.slice, queuedBudget(v.x));
  return `<div class="muted">${t(l.regime)}</div>
    <h2>${t(S.T.recurring)}</h2><table>${tr(S.T.revenue, yuan(l.recurring.revenue))}${tr(S.T.due, yuan(l.recurring.due))}
      ${tr(S.T.available, yuan(l.recurring.available))}${tr(S.T.perYear, yuan(l.recurring.perYear))}</table>
    <h2>${t(S.T.projectsView)}</h2><table>${tr(S.T.funds, yuan(l.projects.funds))}${tr(S.T.unspent, yuan(l.projects.unspent))}
      ${tr(S.T.available, yuan(l.projects.available))}${tr(S.T.borrowing, yuan(l.borrowing))}${tr(S.T.forex, `$${num(l.forexUsd)}`)}</table>
    <h2>${t(S.T.committed)}</h2><table>${tr(S.T.unspent, yuan(m.live))}${tr(S.T.queuedThisTurn, yuan(m.queued))}${tr(S.T.oneOffDue, yuan(m.oneOff))}
      ${tr(S.T.committed, yuan(m.committed))}${tr(S.T.afterCommitments, yuan(m.projected))}</table>
    <h2>${t(S.T.obligations)}</h2><table>${l.obligations.map((o) => tr(o.label, yuan(o.value))).join('')}</table>
    <h2>${t(S.T.loans)}</h2>${l.loans.map((n) => `<div>#${n.id} ${t(n.kind)} · ${t(S.T.outstanding)} ${yuan(n.outstanding)}
      <div class="muted">${n.next.map((e) => `${e.at}: ${yuan(e.principal)} + ${yuan(e.interest)}`).join(' · ')}</div></div>`).join('') || `<div class="muted">${t(S.T.noLoans)}</div>`}`;
}

function drawerPopulation(v: View): string {
  const t = tx(v.lang), tr = row(v.lang), s = v.x.state;
  const a = areaView(s, v.ui.area);
  const pickArea = `<select data-ui="area">${s.areas.filter((q) => q.access === 'playable').map((q) =>
    `<option value="${q.id}" ${q.id === v.ui.area ? 'selected' : ''}>${t(areaName(s, q.id))}</option>`).join('')}</select>`;
  if (!a) return pickArea;
  const h = a.housing;
  return `${pickArea}
    <h2>${t(S.T.pops)}</h2><table><tr><td></td><td class="n">${t(S.T.size)}</td><td class="n">${t(S.T.present)}</td></tr>
      ${a.pops.map((p) => `<tr><td>${t(p.label)}</td><td class="n">${num(p.size)}</td><td class="n">${num(p.present)}</td></tr>`).join('')}</table>
    ${h ? `<h2>${t(S.T.beds)}</h2><table>${tr(S.T.localBeds, `${num(h.occupants.local)} / ${num(h.beds.local)}`)}
      ${tr(S.T.rentalBeds, `${num(h.occupants.rental)} / ${num(h.beds.rental)}`)}${tr(S.T.crowding, h.crowding.toFixed(2))}${tr(S.T.rent, yuan(h.rent))}
      ${tr(S.T.turnedAway, num(s.housing.find((q) => q.area === v.ui.area)?.turnedAway ?? 0))}</table>` : ''}
    <h2>${t(S.T.facilities)}</h2><table>${tr(S.T.schoolPlaces, num(a.facilities.schoolPlaces))}${tr(S.T.clinicVisits, num(a.facilities.clinicVisits))}
      ${tr(S.T.policePosts, num(a.facilities.policePosts))}${tr(S.T.illegalShare, pct(a.illegalFloorShare))}</table>`;
}

function drawerEconomy(v: View): string {
  const t = tx(v.lang), tr = row(v.lang), s = v.x.state;
  const buyLock = gateLock(s, v.slice, 'power.buy');
  const bySector = new Map<string, { jobs: number; filled: number }>();
  for (const j of s.labour.jobs) { const r = bySector.get(j.sector) ?? { jobs: 0, filled: 0 }; bySector.set(j.sector, { jobs: r.jobs + j.jobs, filled: r.filled + j.filled }); }
  const exportsQ = s.history.exports.slice(-3).reduce((a, n) => a + n, 0);
  const areas = s.areas.filter((a) => a.access === 'playable').map((a) => areaView(s, a.id)!);
  const pw = powerView(s, v.slice);
  return `<h2>${t(S.T.jobs)}</h2><table>${[...bySector].map(([k, r]) => tr(S.SECTOR[k] ?? { zh: k, en: k }, `${num(r.filled)} / ${num(r.jobs)}`)).join('')}
      ${tr(S.T.firms, String(s.firms.length))}${tr(S.T.exports, `$${num(exportsQ)}`)}</table>
    <h2>${t(S.T.powerPool)}</h2><table>${tr(S.T.powerLocal, num(pw.local))}${tr(S.T.powerBought, num(pw.imported))}
      ${tr(S.T.powerOnOrder, num(pw.onOrder))}${tr(S.T.powerStations, num(pw.stations))}${tr(S.T.powerSited, num(pw.sited))}${tr(S.T.powerSpare, num(pw.spare))}
      ${tr(S.T.powerUnmet, pw.unmet.length ? pw.unmet.map((a) => t(areaName(s, a))).join(' · ') : t(S.T.none))}</table>
    <div class="muted">${t(S.T.buyPowerHint)}</div>
    ${buyLock ? lockedButton(buyLock, v.lang, `${t(S.T.buyPower)} ${num(pw.step)} kW`)   // R9 (§11.2)
      : `<button data-act="buyPower" data-kw="${pw.step}" ${pw.step > 0 ? off(v) : 'disabled'}>${t(S.T.buyPower)} ${num(pw.step)} kW</button>`}
    <h2>${t(S.T.utilities)}</h2><table>${areas.map((a) => tr(a.name, `${num(a.utilities.powerCap)} kW`)).join('')}</table>${drawerFreight(v)}`;
}

/** R8d (§5.12): each gateway's capacity and unmet tonnes, and each shipping area's weakest link. */
function drawerFreight(v: View): string {
  const fv = freightView(v.x.state, v.slice);
  if (!fv) return '';
  const t = tx(v.lang), tr = row(v.lang), s = v.x.state;
  return `<h2>${t(S.T.freight)}</h2><div class="muted">${t(S.T.freightHint)}</div><table>
      ${fv.gateways.map((g) => tr({ zh: bi(g.name), en: bi(g.name) }, `${num(g.capacity.in)} / ${num(g.capacity.out)}${g.unmet.in + g.unmet.out > 0
        ? ` · ${t(S.T.freightUnmet)} ${num(g.unmet.in)} / ${num(g.unmet.out)}` : ''}`)).join('')}</table>
    ${fv.areas.length && fv.hk ? `<div class="muted">${t(S.T.freightRoute)}: ${esc(bi(fv.hk))}</div><table>${fv.areas.map((a) =>
      tr(areaName(s, a.area), `${num(a.capacity)}${a.weakest ? ` · ${a.weakest[0]},${a.weakest[1]}` : ''}`)).join('')}</table>` : ''}`;
}

function drawerPolitics(v: View): string {
  const t = tx(v.lang), tr = row(v.lang), { x } = v, p = x.state.policy;
  const lv = leadersView(x.state, v.slice), m = lv.mandate;
  const r = reviewView(x.state, v.slice);
  const fmt = (share: boolean, n: number) => (share ? pct(n) : num(n));
  const next = r.next ? `<h2>${t(S.T.thisYear)}</h2><div>${t(S.T.projected)}: ${r.next.score.toFixed(2)}</div>
      <table><tr><td></td><td class="n">${t(S.T.value)}</td><td class="n">${t(S.T.target)}</td></tr>
      ${r.next.items.map((i) => `<tr><td>${t(i.label)}${bar(i.score)}</td><td class="n">${fmt(i.share, i.value)}</td><td class="n">${fmt(i.share, i.target)}</td></tr>`).join('')}</table>`
    : `<div class="muted">${t(S.T.noReviewLeft)}</div>`;
  return `<h2>${t(S.T.mandate)}</h2><div>${m.priority ? `${t(m.priority)} · ${t(m.met ? S.T.mandateMet : S.T.mandateOpen)}` : `<span class="muted">${t(S.T.noMandate)}</span>`}</div>`
    + lv.leaders.map((l) => `<div class="card"><div class="portrait">${esc([...pick(l.name, v.lang)][0] ?? '?')}</div><h3>${t(l.role)} · ${t(l.name)}</h3>
      <div class="muted">${l.traits.map(t).join(' · ')}</div>
      <table>${tr(S.T.rapport, String(Math.round(l.rapport)))}${tr(S.T.standing, String(Math.round(l.standing)))}
      ${tr(S.T.disciplineRisk, pick(l.risk, v.lang))}${tr(S.T.shortcuts, String(l.shortcuts))}</table></div>`).join('')
    + (lv.falls.length ? `<h2>${t(S.T.falls)}</h2>${lv.falls.map((f) => `<div class="muted">${f.at}: ${t(f.leader)} → ${t(f.replacedBy)}</div>`).join('')}` : '')
    + next + `<h2>${t(S.T.held)}</h2>` + r.held.map((h) => `<div>${h.at}: ${h.score.toFixed(2)} ${t(h.pass ? S.T.pass : S.T.fail)}${h.vetoed ? ` · ${t(S.T.vetoed)}` : ''}</div>`).join('')
    + `<h2>${t(S.T.enforcement)}</h2><div class="opts">${ENFORCEMENT_LEVELS.map((n) => {
      const lock = n !== p.enforcement ? gateLock(v.x.state, v.slice, 'policy.enforcement') : undefined;   // R9 (§11.2)
      return lock ? lockedButton(lock, v.lang, t(S.ENFORCEMENT[n]!))
        : `<button data-act="enforce" data-v="${n}" class="${p.enforcement === n ? 'sel' : ''}" ${off(v)}>${t(S.ENFORCEMENT[n]!)}</button>`;
    }).join('')}</div>
    <h2>${t(S.T.importQuota)}</h2><div class="opts">${IMPORT_QUOTAS.map((n) => {
      const cur = p.importQuota ?? 'balanced';                    // R10d (§5.13)
      const lock = n !== cur ? gateLock(v.x.state, v.slice, 'policy.import_quota') : undefined;
      return lock ? lockedButton(lock, v.lang, t(S.IMPORT_QUOTA[n]!))
        : `<button data-act="quota" data-v="${n}" class="${cur === n ? 'sel' : ''}" ${off(v)}>${t(S.IMPORT_QUOTA[n]!)}</button>`;
    }).join('')}</div>
    <h2>${t(S.T.permits)}</h2><div class="opts">${PERMIT_REGIMES.map((n) => `<button data-act="permit" data-v="${n}" class="${p.permitRegime === n ? 'sel' : ''}" ${off(v)}>${t(S.PERMIT[n]!)}</button>`).join('')}</div>`;
}

export const DRAWER_BODY: Readonly<Record<(typeof DRAWERS)[number], (v: View) => string>> = {
  building: drawerBuilding, budget: drawerBudget, population: drawerPopulation, economy: drawerEconomy, politics: drawerPolitics,
};
/** The open drawer, or '' when none is open. The readiness drawer is opened from the prologue strip. */
export function renderDrawer(v: View): string {
  const d = v.ui.drawer;
  if (!d) return '';
  if (d === 'readiness') return `${closeBtn(v.lang, 'closeDrawer')}<h2>${tx(v.lang)(S.T.bar)}</h2>${drawerReadiness(v)}`;
  return `${closeBtn(v.lang, 'closeDrawer')}<h2>${tx(v.lang)(S.CHIP[d]!)}</h2>${DRAWER_BODY[d](v)}`;
}
export { DRAWERS };

/** The verdict screen, or undefined while the slice runs. */
export function renderVerdict(v: View): string | undefined {
  const { x, slice } = v, t = tx(v.lang), tr = row(v.lang);
  if (x.mode !== 'over') return undefined;
  const vd = verdictView(x.state, slice);
  const failed = x.state.ended?.reason === 'failure';
  const held = reviewView(x.state, slice).held;
  const summary = vd ? `<div class="verdict-summary">
    <p>${t(vd.growth.residents >= 1.5 || vd.growth.gdp >= 2 ? S.T.verdictGrew : S.T.verdictStagnant)}</p>
    <p>${t(vd.fiscalTest.balance >= 0 ? S.T.verdictFiscalGood : S.T.verdictFiscalBad)}</p>
    <p>${t(held.length && held.every((r) => r.pass) ? S.T.verdictReviewsGood : S.T.verdictReviewsMixed)}</p></div>` : '';
  return `${renderLangSwitch(v.lang)}<h1>${t(S.T.verdict)}</h1>
    ${failed ? `<div class="err">${t(S.T.failure)}</div>` : summary}
    ${vd ? `<h2>${t(S.T.growth)}</h2><table>${tr(S.T.residents, `×${vd.growth.residents.toFixed(2)}`)}${tr(S.T.gdpYear, `×${vd.growth.gdp.toFixed(2)}`)}
      ${tr(S.T.reserve, yuan(vd.ledger.reserve))}${tr(S.T.debt, yuan(vd.ledger.debtOutstanding))}${tr(S.T.arrears, yuan(vd.ledger.arrears))}
      ${tr(S.T.scrutiny, num(vd.scrutiny))}${tr(S.T.illegalShare, pct(vd.illegalShare))}
      ${tr(S.T.fiscalTest, yuan(vd.fiscalTest.balance))}${tr(S.T.debtService, yuan(vd.fiscalTest.debtService))}
      ${tr(S.T.bankShare, pct(vd.bankShare))}${tr(S.T.debtToRevenue, vd.debtToRevenue.toFixed(2))}
      ${tr(S.T.briefingLoan, yuan(vd.briefingLoan))}
      ${tr(S.T.wage, yuan(vd.wageMonth))}${tr(S.T.sheds, num(vd.shedBeds))}
      ${tr(S.T.forexBurned, `$${num(vd.forex.burnedUsd)} · $${num(vd.forex.earnedUsd)} · $${num(vd.forex.quotaUsd)}`)}</table>` : `<div class="muted">${t(S.T.ended)} · ${formatYM(x.state.date)}</div>`}
    <h2>${t(S.T.held)}</h2>${reviewView(x.state, slice).held.map((r) => `<div>${r.at}: ${r.score.toFixed(2)} ${t(r.pass ? S.T.pass : S.T.fail)}</div>`).join('')}
    <button class="go" data-act="restart">${t(S.T.restart)}</button>`;
}

/** The hover readout for a cell (plain text): the cell, its area and zone, a site or route there, and road access. */
export function hoverText(v: Pick<View, 'x' | 'slice' | 'lang'>, c: { x: number; y: number; area: number }): string {
  const { x, slice, lang } = v, s = x.state, p = (l: L) => pick(l, lang);
  const z = s.zones.find((q) => q.runs.some(([y, x0, x1]) => y === c.y && c.x >= x0 && c.x <= x1));
  let out = `${c.x},${c.y}${c.area ? ` · ${p(areaName(s, c.area))}` : ''}${z ? ` · ${p(zoneName(s, slice, z.id))}` : ''}`;
  const site = slice.startSites.find((q) => q.cell[0] === c.x && q.cell[1] === c.y);
  if (site) out += ` · ${bi(siteName(site))}`;
  const index = c.y * s.grid.width + c.x;
  const lc = slice.tick.landcover ? landCoverAt(slice.tick.landcover, index) : undefined;
  if (lc) out += ` · ${p(S.T.landCover)}: ${p(S.LAND_COVER[lc] ?? { zh: lc, en: lc })}`;
  for (const r of slice.startNetwork.routes) if (r.cells.includes(index)) out += ` · ${bi(r.name)} · ${p(S.T.temporaryAlignment)}`;
  const spatial = constraintContext(s, slice).spatial;
  if (z && !spatial.roads.component.has(index)) {
    const reach = spatial.frontage.get(index);
    out += reach ? ` · ${p(S.T.roadAccess)}: ${reach.depth}/${slice.startNetwork.maxFrontageDepth}` : ` · ${p(S.T.noRoadAccess)}`;
  }
  return out;
}
