/**
 * The planning-map HUD as HTML (phase1-slice.md §11.1, §11.2): pure functions of the session, the UI's own choices
 * and the language. They read the views and the sim state and change neither; main.ts puts what they return on the
 * page. The chrome shows one language; place labels (marked by place() in the views) read zh and en in both.
 */
import {
  ENFORCEMENT_LEVELS, LAND_USES, PERMIT_REGIMES, formatYM,
  type Slice, type StartSite,
} from '@sz/sim-core';
import { unanswered, type Session, type UiError } from './controller.js';
import { LANGS, LANG_NAME, HTML_LANG, pick, type Lang } from './lang.js';
import * as S from './strings.js';
import { bi, type L } from './strings.js';
import { BUILD_TOOLS, TOOLS, queuedBudget, type Plan, type Tool, type ToolOptions } from './tools.js';
import {
  DRAWERS, LAND_COVER_COLOR, powerView, OVERLAY_LAYERS, USE_COLOR, actionLabel, areaName, areaView, briefing, cardStack, chipsView, constraintContext,
  commitments, constraintLabel, finishedWork, icrCue, inspectorView, ledgerView, leadersView, mostHeldBack, num, pct, projectsView,
  reviewView, teamsView, verdictView, worksView, yuan, zoneName,
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
}
export const initialUi = (slice: Slice): UiState => ({
  layer: 'areas', tool: 'select', guide: false, drawer: null, decisions: false, briefing: true, selected: null, area: 1,
  opts: { use: 'industrial', planOnly: false, facility: Object.keys(slice.params.works?.facilities ?? {})[0] ?? 'school' },
});
/** Everything a screen reads. */
export interface View {
  readonly slice: Slice; readonly x: Session; readonly ui: Readonly<UiState>; readonly lang: Lang;
  readonly selectedSite?: StartSite | undefined;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ESC[c]!);

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
    <div class="muted">${t(S.T.turn)} ${turn} / ${s.scenario.turns}${x.mode === 'paused' ? ` · ${t(S.T.paused)}` : ''}</div>`;
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

/** The overlay switcher (top right): one dropdown. */
export function renderOverlaySelect(v: View): string {
  const t = tx(v.lang);
  return `<label class="muted">${t(S.T.overlay)} <select data-ui="layer">${OVERLAY_LAYERS.map((k) =>
    `<option value="${k}" ${v.ui.layer === k ? 'selected' : ''}>${t(S.OVERLAYS[k]!)}</option>`).join('')}</select></label>
    ${v.ui.layer === 'land_cover' ? `<details class="key" open><summary>${t(S.OVERLAYS.land_cover!)}</summary>${Object.entries(LAND_COVER_COLOR)
      .map(([k, c]) => `<div style="border-left:10px solid rgba(${c.slice(0, 3).join(',')})">&nbsp;${t(S.LAND_COVER[k]!)}</div>`).join('')}</details>` : ''}
    <details class="key"><summary>${t(S.T.temporaryAlignments)}</summary>${v.slice.startNetwork.routes.map((r) =>
      `<div><i class="${r.kind}"></i>${esc(bi(r.name))}</div>`).join('')}</details>`;
}

/** The chip strip (bottom): five chips of two stats each, each stat under a visible caption; each opens its drawer. */
export function renderChips(v: View): string {
  const t = tx(v.lang);
  const stat = (c: ReturnType<typeof chipsView>[number], k: 0 | 1) =>
    `<span><small>${t(c.captions[k])}</small><span class="tip">${t(c.hints[k])}</span>${esc(c.values[k])}</span>`;
  return chipsView(v.x.state, v.slice, queuedBudget(v.x)).map((c) => `<button class="chip${v.ui.drawer === c.id ? ' sel' : ''}" data-act="drawer" data-drawer="${c.id}">
    <b>${t(c.label)}</b>${stat(c, 0)}${stat(c, 1)}</button>`).join('');
}

/** The bottom-right stack: the queue, Briefing, Pending decisions, End quarter or Continue; errors as a toast. */
export function renderStack(v: View): string {
  const { x, slice } = v, s = x.state, t = tx(v.lang);
  const queue = x.mode === 'turn' && x.queue.length ? `<div class="queue"><div class="muted">${t(S.T.queue)}</div>${x.queue.map((_, k) =>
    `<div class="q"><span>${t(actionLabel(s, slice, x.queue, k))}</span><button data-act="dequeue" data-k="${k}" aria-label="${esc(pick(S.T.remove, v.lang))}">✕</button></div>`).join('')}</div>` : '';
  const cards = s.pendingCards.length, must = unanswered(x).length;
  const error = x.error ? `<div class="err" role="alert">${x.error.what === S.T.error ? '' : `${t(S.T.error)}: `}${t(x.error.what)}${x.error.detail !== undefined ? `: ${diag(x.error.detail)}` : ''}</div>` : '';
  const go = x.mode === 'over' ? '' : `<button class="go" data-act="submit" ${must ? 'disabled' : ''}>${t(x.mode === 'paused' ? S.T.continue : S.T.endQuarter)}</button>`;
  return `${error}${queue}
    <button data-act="briefing" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.T.briefing)}</button>
    <button data-act="decisions" class="${must ? 'must' : ''}">${t(S.T.pendingDecisions)} ${cards}${must ? ` · ${must} ${t(S.T.toAnswer)}` : ''}</button>
    ${go}`;
}

// ---- the tool rail and its flyout ----

const GLYPH: Readonly<Record<Tool, string>> = { select: '◎', road: '═', zone: '▦', service: '⚒', erase: '⌫', power: 'ϟ', station: '⌁', facility: '⌂' };

export function renderRail(v: View): string {
  const t = tx(v.lang);
  return TOOLS.map((k) => `<button class="tool${v.ui.tool === k ? ' sel' : ''}" data-act="tool" data-tool="${k}"
    ${BUILD_TOOLS.includes(k) && v.x.mode !== 'turn' ? 'disabled' : ''}><i>${GLYPH[k]}</i><span>${t(S.TOOL[k]!)}</span></button>`).join('');
}

/** The open tool's flyout: what it does, and its choices. */
export function renderFlyout(v: View): string {
  const t = tx(v.lang), { ui, slice } = v, k = ui.tool;
  let body = `<div class="muted">${t(S.TOOL_HINT[k]!)}</div>`;
  // R7 (§13 vocabulary): the Form site hint, wherever site formation is ordered
  const formation = `<div class="hint"><b>${t(S.T.siteFormation)}:</b> ${t(S.T.formationHint)}</div>`;
  if (k === 'service') body += formation;
  if (k === 'zone') {
    // R7 (§11.2): public is shown disabled with its reason; planGesture and sim-core still accept it until R8b
    const uses = LAND_USES.filter((u) => u !== 'reserve').map((u) => u === 'public'
      ? `<span class="off" title="${esc(pick(S.T.noPublicZone, v.lang))}"><button disabled>${t(S.LAND_USE[u]!)}</button></span>`
      : `<button data-act="use" data-use="${u}" class="${ui.opts.use === u ? 'sel' : ''}"
      style="border-left:6px solid rgba(${USE_COLOR[u]!.slice(0, 3).join(',')})">${t(S.LAND_USE[u]!)}</button>`).join('');
    const guides = (slice.tick.precedents ?? []).filter((p) => p.cells.length);
    body += `<div class="opts">${uses}</div>
      ${ui.opts.planOnly ? '' : formation}
      <label><input type="checkbox" data-ui="planOnly" ${ui.opts.planOnly ? 'checked' : ''}> ${t(S.T.planOnly)}</label>
      <label><input type="checkbox" data-ui="guide" ${ui.guide ? 'checked' : ''}> ${t(S.T.showGuide)}</label>
      ${guides.map((p) => `<div class="q"><span>${esc(bi(p.name))}</span><button data-act="zoneGuide" data-id="${esc(p.id)}" ${off(v)}>${t(S.T.zoneGuide)}</button></div>`).join('')}`;
  } else if (k === 'facility') {
    const types = Object.keys(slice.params.works?.facilities ?? {});
    body += `<label>${t(S.T.facilityType)} <select data-ui="facility">${types.map((f) =>
      `<option value="${esc(f)}" ${ui.opts.facility === f ? 'selected' : ''}>${t(S.FACILITY[f] ?? { zh: f, en: f })}</option>`).join('')}</select></label>`;
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
    ${Object.keys(p.byClass).length > 1 ? tr(S.T.landCover, Object.entries(p.byClass).map(([k, n]) => `${t(S.LAND_COVER[k]!)} ${num(n!)}`).join(', ')) : ''}
    ${p.orders ? `${tr(S.T.units, num(p.units))}${tr(S.T.crewPerMonth, num(p.crewPerMonth))}${tr(S.T.months, num(p.months))}` : ''}</table>
    ${p.note ? `<div class="down">${t(p.note)}</div>` : ''}`;
}

// ---- the cell inspector ----

export function renderInspector(v: View): string {
  const { ui, x, slice } = v, t = tx(v.lang), tr = row(v.lang);
  if (!ui.selected) return '';
  const c = inspectorView(x.state, slice, ui.selected.x, ui.selected.y);
  const site = v.selectedSite;
  const share = c.share ? pct(c.share.power) : pick(S.T.noDemand, v.lang);
  return `${closeBtn(v.lang, 'unselect')}<h3>${t(S.T.cell)} ${c.x},${c.y}</h3>
    ${c.area ? `<div>${t(c.area)}</div>` : ''}${c.site ? `<div>≈ ${t(c.site)} · ${t(S.T.proxyLocation)}</div>` : ''}
    ${c.route ? `<div>${t(c.route)} · ${t(S.T.temporaryAlignment)}</div>` : ''}
    <div class="muted">${t(S.T.perCell)}</div><table>
      ${c.zone ? tr(S.ZONE, pick(c.zone, v.lang)) : ''}${c.use ? tr(S.T.use, pick(c.use, v.lang)) : ''}
      ${tr(S.T.stage, pick(c.stage, v.lang))}
      ${c.progress ? `<tr><td>${t(S.T.progress)}${bar(c.progress.done / c.progress.total)}</td><td class="n">${num(c.progress.done)} / ${num(c.progress.total)}</td></tr>` : ''}
      ${tr(S.T.roadAccess, c.frontage ? `${t(S.T.depth)} ${c.frontage.depth} / ${c.frontage.max}` : pick(S.T.noRoadAccess, v.lang))}
      ${tr(S.T.supplied, share)}</table>
    <div class="muted">${t(S.T.stocks)}</div><table>
      ${c.zoneFloorM2 !== undefined ? tr(S.T.zoneFloor, `${num(c.zoneFloorM2)} m²`) : ''}
      ${c.villageFloorM2 !== undefined ? tr(S.T.villageFloor, `${num(c.villageFloorM2)} m²`) : ''}
      ${c.areaShare !== undefined ? tr(S.T.areaShare, pct(c.areaShare)) : ''}
      ${tr(S.T.jobs, `${num(c.jobs.filled)} / ${num(c.jobs.posted)}`)}${tr(S.T.beds, `${num(c.beds.occupants)} / ${num(c.beds.beds)}`)}</table>
    ${site ? `<details><summary>${t(S.T.evidence)}</summary>${site.claims.map((q) => `<div>${esc(q.id)}</div>`).join('')}<div>${esc(site.proxy)}</div></details>` : ''}
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
  return `<h2>${t(S.T.briefing)} · ${esc(br.when)}</h2><table>${rows}</table>
    <h3>${t(S.T.workFinished)}</h3>${fin}
    <h3>${t(S.T.heldBackArea)}</h3>${held ? `<div>${t(held.name)}: ${t(constraintLabel(held.constraint))} (${num(held.cells)}${v.lang === 'zh' ? '' : ' '}${t(S.T.cellsHeld)})</div>`
      : `<div class="muted">${t(S.T.nothingHeld)}</div>`}
    <button class="go" data-act="toMap">${t(S.T.toMap)}</button>`;
}

// ---- the decisions modal ----

export function renderDecisions(v: View): string {
  const { x, slice } = v, t = tx(v.lang);
  const cards = cardStack(x.state, slice).map((c) => `<div class="card ${c.interrupting ? 'int' : ''}">
      <h3>${t(c.title)}</h3>
      <div class="muted">${t(c.interrupting ? S.T.mustAnswer : S.T.optional)}${c.expires ? ` · ${t(S.T.expires)} ${c.expires}` : ''}</div>
      ${c.description ? `<p class="desc">${t(c.description)}</p>` : ''}
      ${c.lines.map((l) => `<div class="line">${t(l.label)}: ${t(l.value)}</div>`).join('')}
      <div class="opts">${c.options.map((o) => `<div class="opt"><button data-act="choose" data-card="${esc(c.id)}" data-opt="${esc(o.id)}"
        class="${x.answers[c.id] === o.id ? 'sel' : ''}">${t(o.label)}</button>${o.badges.length ? `<ul class="badges">${o.badges.map((b) =>
        `<li>${t(b)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div></div>`).join('') || `<div class="muted">${t(S.T.noCards)}</div>`;
  return `${closeBtn(v.lang, 'closeDecisions')}<h2>${t(S.T.pendingDecisions)}</h2>${cards}`;
}

// ---- the drawers ----

function drawerBuilding(v: View): string {
  const t = tx(v.lang), { x, slice } = v;
  const works = worksView(x.state, slice).map((w) => `<div class="card"><b>#${w.id}</b> ${t(w.kind)} · ${t(w.where)}
      <div class="muted">${t(w.stage)}${w.waiting ? ` · ${t(w.waiting)}` : ''} · ${yuan(w.spent)} / ${yuan(w.budget)} · ${t(S.T.remaining)} ${yuan(w.budget - w.spent)}</div>
      ${bar(w.total ? w.done / w.total : 0)}
      ${w.cells ? `<div class="cells">${w.cells.map((c) => `<span title="${c.x},${c.y}">${c.x},${c.y} ${t(c.stage)}</span>`).join(' · ')}</div>` : ''}
      <button data-act="pauseOrder" data-id="${w.id}" data-paused="${w.paused ? '0' : '1'}" ${off(v)}>${t(w.paused ? S.T.resume : S.T.pause)}</button>
      <button data-act="cancelOrder" data-id="${w.id}" ${off(v)}>${t(S.T.cancel)}</button></div>`).join('') || `<div class="muted">${t(S.T.none)}</div>`;
  const projects = projectsView(x.state, slice).map((p) => `<div class="card"><b>#${p.id}</b> ${t(p.name)} · ${t(p.where)}
      <div class="muted">${t(p.stage)}${p.waiting ? ` · ${t(p.waiting)}` : ''} · ${yuan(p.spent)} / ${yuan(p.budget)}</div>${bar(p.progress)}
      <button data-act="cancel" data-id="${p.id}" ${off(v)}>${t(S.T.cancel)}</button></div>`).join('');
  return `<h2>${t(S.T.worksQueue)}</h2>${works}
    ${projects ? `<h2>${t(S.T.projectsList)}</h2>${projects}` : ''}
    <h2>${t(S.T.teams)}</h2>${teamsView(x.state, slice).map((m) => `<div class="q"><span>${t(m.name)} <span class="muted">${num(m.crew)} · ${yuan(m.costPerMonth)}/${t(S.T.month)}</span></span>
      ${m.live ? `<span class="muted">${t(S.T.live)}</span>` : `<button data-act="team" data-id="${esc(m.id)}" ${off(v)}>${t(S.T.contract)}</button>`}</div>`).join('')}`;
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
    <button data-act="buyPower" data-kw="${pw.step}" ${pw.step > 0 ? off(v) : 'disabled'}>${t(S.T.buyPower)} ${num(pw.step)} kW</button>
    <h2>${t(S.T.utilities)}</h2><table>${areas.map((a) => tr(a.name, `${num(a.utilities.powerCap)} kW`)).join('')}</table>`;
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
    + `<h2>${t(S.T.enforcement)}</h2><div class="opts">${ENFORCEMENT_LEVELS.map((n) => `<button data-act="enforce" data-v="${n}" class="${p.enforcement === n ? 'sel' : ''}" ${off(v)}>${t(S.ENFORCEMENT[n]!)}</button>`).join('')}</div>
    <h2>${t(S.T.permits)}</h2><div class="opts">${PERMIT_REGIMES.map((n) => `<button data-act="permit" data-v="${n}" class="${p.permitRegime === n ? 'sel' : ''}" ${off(v)}>${t(S.PERMIT[n]!)}</button>`).join('')}</div>`;
}

export const DRAWER_BODY: Readonly<Record<DrawerId, (v: View) => string>> = {
  building: drawerBuilding, budget: drawerBudget, population: drawerPopulation, economy: drawerEconomy, politics: drawerPolitics,
};
/** The open drawer, or '' when none is open. */
export function renderDrawer(v: View): string {
  const d = v.ui.drawer;
  if (!d) return '';
  return `${closeBtn(v.lang, 'closeDrawer')}<h2>${tx(v.lang)(S.CHIP[d]!)}</h2>${DRAWER_BODY[d](v)}`;
}
export { DRAWERS };

/** The verdict screen, or undefined while the slice runs. */
export function renderVerdict(v: View): string | undefined {
  const { x, slice } = v, t = tx(v.lang), tr = row(v.lang);
  if (x.mode !== 'over') return undefined;
  const vd = verdictView(x.state, slice);
  const failed = x.state.ended?.reason === 'failure';
  return `${renderLangSwitch(v.lang)}<h1>${t(S.T.verdict)}</h1>
    ${failed ? `<div class="err">${t(S.T.failure)}</div>` : ''}
    ${vd ? `<h2>${t(S.T.growth)}</h2><table>${tr(S.T.residents, `×${vd.growth.residents.toFixed(2)}`)}${tr(S.T.gdpYear, `×${vd.growth.gdp.toFixed(2)}`)}
      ${tr(S.T.reserve, yuan(vd.ledger.reserve))}${tr(S.T.debt, yuan(vd.ledger.debtOutstanding))}${tr(S.T.arrears, yuan(vd.ledger.arrears))}
      ${tr(S.T.scrutiny, num(vd.scrutiny))}${tr(S.T.illegalShare, pct(vd.illegalShare))}
      ${tr(S.T.fiscalTest, yuan(vd.fiscalTest.balance))}</table>` : `<div class="muted">${t(S.T.ended)} · ${formatYM(x.state.date)}</div>`}
    <h2>${t(S.T.held)}</h2>${reviewView(x.state, slice).held.map((r) => `<div>${r.at}: ${r.score.toFixed(2)} ${t(r.pass ? S.T.pass : S.T.fail)}</div>`).join('')}
    <button class="go" data-act="restart">${t(S.T.restart)}</button>`;
}

/** The hover readout for a cell (plain text): the cell, its area and zone, a site or route there, and road access. */
export function hoverText(v: Pick<View, 'x' | 'slice' | 'lang'>, c: { x: number; y: number; area: number }): string {
  const { x, slice, lang } = v, s = x.state, p = (l: L) => pick(l, lang);
  const z = s.zones.find((q) => q.runs.some(([y, x0, x1]) => y === c.y && c.x >= x0 && c.x <= x1));
  let out = `${c.x},${c.y}${c.area ? ` · ${p(areaName(s, c.area))}` : ''}${z ? ` · ${p(zoneName(s, slice, z.id))}` : ''}`;
  const site = slice.startSites.find((q) => q.cell[0] === c.x && q.cell[1] === c.y);
  if (site) out += ` · ≈ ${bi(site.name)} · ${p(S.T.proxyLocation)}`;
  const index = c.y * s.grid.width + c.x;
  for (const r of slice.startNetwork.routes) if (r.cells.includes(index)) out += ` · ${bi(r.name)} · ${p(S.T.temporaryAlignment)}`;
  const spatial = constraintContext(s, slice).spatial;
  if (z && !spatial.roads.component.has(index)) {
    const reach = spatial.frontage.get(index);
    out += reach ? ` · ${p(S.T.roadAccess)}: ${reach.depth}/${slice.startNetwork.maxFrontageDepth}` : ` · ${p(S.T.noRoadAccess)}`;
  }
  return out;
}
