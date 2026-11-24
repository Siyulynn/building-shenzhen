/**
 * The slice's screens as HTML (phase1-slice.md §11, §11.1): pure functions of the session, the UI's own choices and
 * the language. They read the views and the sim state and change neither; main.ts puts what they return on the page.
 * The chrome shows one language; place labels (marked by place() in the views) read zh and en in both.
 */
import {
  ENFORCEMENT_LEVELS, LAND_USES, PERMIT_REGIMES, PRIORITIES, formatYM,
  type LandUse, type Priority, type Slice, type SpatialViews, type StartSite,
} from '@sz/sim-core';
import { unanswered, type Session, type UiError } from './controller.js';
import { LANGS, LANG_NAME, HTML_LANG, pick, type Lang } from './lang.js';
import * as S from './strings.js';
import { bi, type L } from './strings.js';
import {
  OVERLAY_LAYERS, USE_COLOR, actionLabel, areaName, areaView, briefing, cardStack, ledgerView, leadersView,
  num, pct, projectCost, siteCells, projectsView, queuedZoneIds, reviewView, teamsView, verdictView, yuan, zoneName,
  type OverlayLayer,
} from './views.js';

/** The UI's own choices: never part of the session, never sent to the sim. */
export interface UiState {
  layer: OverlayLayer; tab: string; area: number; drawUse: LandUse | null;
  project: string; target: string; priority: Priority;
}
/** Everything a screen reads. */
export interface View {
  readonly slice: Slice; readonly x: Session; readonly ui: Readonly<UiState>; readonly lang: Lang;
  readonly spatial: SpatialViews; readonly selectedSite?: StartSite | undefined;
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

/** The switch: each language named in its own script (§11.1). */
export function renderLangSwitch(lang: Lang): string {
  return `<div class="lang" role="group" aria-label="${esc(pick(S.T.language, lang))}">${LANGS.map((k) =>
    `<button data-act="lang" data-lang="${k}" lang="${HTML_LANG[k]}" class="${k === lang ? 'sel' : ''}">${esc(LANG_NAME[k])}</button>`).join('')}</div>`;
}

// ---- the left panel: the turn screen ----

export function renderTurn(v: View): string {
  const { x, slice } = v, s = x.state, t = tx(v.lang);
  const br = briefing(s, slice, x.lastTurnStart);
  const delta = (d: number | undefined, money?: boolean) => d === undefined || d === 0 ? ''
    : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${money ? yuan(Math.abs(d)) : num(Math.abs(d))}</span>`;
  const rows = br.rows.map((r) => `<tr><td>${t(r.label)}</td><td class="n">${r.money ? yuan(r.value) : num(r.value)}</td><td class="n">${delta(r.delta, r.money)}</td></tr>`).join('');
  const cards = cardStack(s, slice).map((c) => `<div class="card ${c.interrupting ? 'int' : ''}">
      <h3>${t(c.title)}</h3>
      <div class="muted">${t(c.interrupting ? S.T.mustAnswer : S.T.optional)}${c.expires ? ` · ${t(S.T.expires)} ${c.expires}` : ''}</div>
      ${c.lines.map((l) => `<div class="line">${t(l.label)}: ${t(l.value)}</div>`).join('')}
      <div class="opts">${c.options.map((o) => `<button data-act="choose" data-card="${esc(c.id)}" data-opt="${esc(o.id)}"
        class="${x.answers[c.id] === o.id ? 'sel' : ''}">${t(o.label)}</button>`).join('')}</div></div>`).join('') || `<div class="muted">${t(S.T.noCards)}</div>`;
  const queue = x.queue.map((_, k) => `<div class="q"><span>${t(actionLabel(s, slice, x.queue, k))}</span>
      <button data-act="dequeue" data-k="${k}">${t(S.T.remove)}</button></div>`).join('') || `<div class="muted">${t(S.T.emptyQueue)}</div>`;
  const waiting = unanswered(x).length > 0;
  const go = x.mode === 'over' ? '' : `<button class="go" data-act="submit" ${waiting ? 'disabled' : ''}>${t(x.mode === 'paused' ? S.T.continue : S.T.endTurn)}</button>`;
  const error = x.error ? `<div class="err">${x.error.what === S.T.error ? '' : `${t(S.T.error)}: `}${esc(errorText(x.error, v.lang))}</div>` : '';
  return `${renderLangSwitch(v.lang)}<h1>${t(S.T.title)}</h1>
    <div class="muted">${esc(br.when)} · ${t(S.T.turn)} ${br.turn} / ${s.scenario.turns}${x.mode === 'paused' ? ` · ${t(S.T.paused)}` : ''} · ${t(S.T.seed)} ${x.seed}</div>
    <h2>${t(S.T.briefing)}</h2><table>${rows}</table>
    <h2>${t(S.T.cards)}</h2>${cards}
    ${x.mode === 'turn' ? `<h2>${t(S.T.queue)}</h2>${queue}` : ''}
    ${error}
    ${go}`;
}

// ---- the right panel ----

export const TABS: readonly [string, L][] = [['ledger', S.T.ledger], ['area', S.T.area], ['leaders', S.T.leaders], ['review', S.T.review],
  ['build', S.T.build], ['zones', S.T.zones], ['policy', S.T.policy]];
const bar = (n: number) => `<div class="bar"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, n)))}%"></i></div>`;
const row = (lang: Lang) => (l: L, val: string) => `<tr><td>${tx(lang)(l)}</td><td class="n">${esc(val)}</td></tr>`;

function renderLedger(v: View): string {
  const t = tx(v.lang), tr = row(v.lang);
  const l = ledgerView(v.x.state, v.slice);
  return `<div class="muted">${t(l.regime)}</div>
    <h2>${t(S.T.recurring)}</h2><table>${tr(S.T.revenue, yuan(l.recurring.revenue))}${tr(S.T.due, yuan(l.recurring.due))}
      ${tr(S.T.available, yuan(l.recurring.available))}${tr(S.T.perYear, yuan(l.recurring.perYear))}</table>
    <h2>${t(S.T.projectsView)}</h2><table>${tr(S.T.funds, yuan(l.projects.funds))}${tr(S.T.unspent, yuan(l.projects.unspent))}
      ${tr(S.T.available, yuan(l.projects.available))}${tr(S.T.borrowing, yuan(l.borrowing))}${tr(S.T.forex, `$${num(l.forexUsd)}`)}</table>
    <h2>${t(S.T.obligations)}</h2><table>${l.obligations.map((o) => tr(o.label, yuan(o.value))).join('')}</table>
    <h2>${t(S.T.loans)}</h2>${l.loans.map((n) => `<div>#${n.id} ${t(n.kind)} · ${t(S.T.outstanding)} ${yuan(n.outstanding)}
      <div class="muted">${n.next.map((e) => `${e.at}: ${yuan(e.principal)} + ${yuan(e.interest)}`).join(' · ')}</div></div>`).join('') || `<div class="muted">${t(S.T.noLoans)}</div>`}`;
}

function renderArea(v: View): string {
  const t = tx(v.lang), tr = row(v.lang), { ui } = v;
  const a = areaView(v.x.state, ui.area);
  if (!a) return `<div class="muted">${t(S.T.pickArea)}</div>`;
  const h = a.housing;
  const site = v.selectedSite?.area === ui.area ? v.selectedSite : undefined;
  const flag = site ? `<h2>≈ ${esc(bi(site.name))}</h2><div>${t(S.T.proxyLocation)} · ${esc(site.proxy)}</div>
    <details><summary>${t(S.T.evidence)}</summary>${site.claims.map((c) => `<div>${esc(c.id)}</div>`).join('')}</details>` : '';
  return `${flag}<h2>${t(a.name)} <span class="muted">#${ui.area}</span></h2><div class="muted">${t(S.T.pickArea)}</div>
    <h2>${t(S.T.pops)}</h2><table><tr><td></td><td class="n">${t(S.T.size)}</td><td class="n">${t(S.T.present)}</td></tr>
      ${a.pops.map((p) => `<tr><td>${t(p.label)}</td><td class="n">${num(p.size)}</td><td class="n">${num(p.present)}</td></tr>`).join('')}</table>
    ${h ? `<h2>${t(S.T.beds)}</h2><table>${tr(S.T.localBeds, `${num(h.occupants.local)} / ${num(h.beds.local)}`)}
      ${tr(S.T.rentalBeds, `${num(h.occupants.rental)} / ${num(h.beds.rental)}`)}${tr(S.T.crowding, h.crowding.toFixed(2))}${tr(S.T.rent, yuan(h.rent))}</table>` : ''}
    <h2>${t(S.T.jobs)}</h2><table>${a.jobs.map((j) => tr(j.label, `${num(j.filled)} / ${num(j.jobs)}`)).join('')}${tr(S.T.firms, String(a.firms))}</table>
    <h2>${t(S.T.utilities)}</h2><table>${tr(S.T.power, num(a.utilities.powerCap))}${tr(S.T.water, num(a.utilities.waterCap))}${tr(S.T.roadKm, String(a.roadKm))}</table>
    <h2>${t(S.T.facilities)}</h2><table>${tr(S.T.schoolPlaces, num(a.facilities.schoolPlaces))}${tr(S.T.clinicVisits, num(a.facilities.clinicVisits))}
      ${tr(S.T.policePosts, num(a.facilities.policePosts))}${tr(S.T.illegalShare, pct(a.illegalFloorShare))}</table>`;
}

function renderLeaders(v: View): string {
  const t = tx(v.lang), tr = row(v.lang);
  const lv = leadersView(v.x.state, v.slice), m = lv.mandate;
  return `<h2>${t(S.T.mandate)}</h2><div>${m.priority ? `${t(m.priority)} · ${t(m.met ? S.T.mandateMet : S.T.mandateOpen)}` : `<span class="muted">${t(S.T.noMandate)}</span>`}</div>`
    + lv.leaders.map((l) => `<div class="card"><div class="portrait">${esc([...pick(l.name, v.lang)][0] ?? '?')}</div><h3>${t(l.role)} · ${t(l.name)}</h3>
      <div class="muted">${l.traits.map(t).join(' · ') || ''}</div>
      <table>${tr(S.T.rapport, String(Math.round(l.rapport)))}${tr(S.T.standing, String(Math.round(l.standing)))}
      ${tr(S.T.disciplineRisk, pick(l.risk, v.lang))}${tr(S.T.shortcuts, String(l.shortcuts))}</table></div>`).join('')
    + (lv.falls.length ? `<h2>${t(S.T.falls)}</h2>${lv.falls.map((f) => `<div class="muted">${f.at}: ${t(f.leader)} → ${t(f.replacedBy)}</div>`).join('')}` : '');
}

function renderReview(v: View): string {
  const t = tx(v.lang);
  const r = reviewView(v.x.state, v.slice);
  const fmt = (share: boolean, n: number) => (share ? pct(n) : num(n));
  const next = r.next ? `<h2>${t(S.T.thisYear)}</h2><div>${t(S.T.projected)}: ${r.next.score.toFixed(2)}</div>
      <table><tr><td></td><td class="n">${t(S.T.value)}</td><td class="n">${t(S.T.target)}</td></tr>
      ${r.next.items.map((i) => `<tr><td>${t(i.label)}${bar(i.score)}</td><td class="n">${fmt(i.share, i.value)}</td><td class="n">${fmt(i.share, i.target)}</td></tr>`).join('')}</table>`
    : `<div class="muted">${t(S.T.noReviewLeft)}</div>`;
  return next + `<h2>${t(S.T.held)}</h2>` + r.held.map((h) => `<div>${h.at}: ${h.score.toFixed(2)} ${t(h.pass ? S.T.pass : S.T.fail)}${h.vetoed ? ` · ${t(S.T.vetoed)}` : ''}</div>`).join('');
}

/** Where the chosen project can go: the zones (and zones queued this turn) for a zone project, else the playable areas. */
export function targets(v: Pick<View, 'slice' | 'x' | 'ui'>): { value: string; label: L }[] {
  const { slice, x, ui } = v;
  const p = slice.tick.fiscal?.projects.find((q) => q.id === ui.project);
  if (p?.target === 'zone') {
    const ids = queuedZoneIds(x.state, x.queue);
    return [...x.state.zones.map((z) => ({ value: `zone:${z.id}`, label: zoneName(x.state, slice, z.id) })),
      ...[...ids.values()].map((id) => ({ value: `zone:${id}`, label: { zh: `${S.NEW_ZONE.zh} #${id}`, en: `${S.NEW_ZONE.en} #${id}` } }))];
  }
  return x.state.areas.filter((a) => a.access === 'playable').map((a) => ({ value: `area:${a.id}`, label: areaName(x.state, a.id) }));
}
/** The chosen target if it is still offered, else the first one offered. */
export function effectiveTarget(v: Pick<View, 'slice' | 'x' | 'ui'>): string {
  const opts = targets(v);
  return opts.some((o) => o.value === v.ui.target) ? v.ui.target : opts[0]?.value ?? '';
}

function renderBuild(v: View): string {
  const t = tx(v.lang), { x, slice, ui } = v;
  const projects = slice.tick.fiscal?.projects ?? [];
  const opts = targets(v), target = effectiveTarget(v);
  const zoneCells = target.startsWith('zone:') ? (() => {
    const id = Number(target.slice(5)), z = x.state.zones.find((q) => q.id === id);
    const k = [...queuedZoneIds(x.state, x.queue)].find(([, n]) => n === id)?.[0];
    const a = k !== undefined ? x.queue[k] : undefined;
    const runs = z ? z.runs : a?.type === 'create_zone' ? a.runs : [];
    return siteCells(x.state, slice, runs);
  })() : 0;
  const cost = projectCost(slice, ui.project, zoneCells);
  const live = projectsView(x.state, slice);
  return `<h2>${t(S.T.commit)}</h2>
    <select data-ui="project">${projects.map((p) => `<option value="${esc(p.id)}" ${p.id === ui.project ? 'selected' : ''}>${t(p.name)}</option>`).join('')}</select>
    <select data-ui="target">${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === target ? 'selected' : ''}>${t(o.label)}</option>`).join('')}</select>
    <select data-ui="priority">${PRIORITIES.map((p) => `<option value="${p}" ${p === ui.priority ? 'selected' : ''}>${t(S.PRIORITY[p]!)}</option>`).join('')}</select>
    <div class="muted">${yuan(cost.yuan)}${cost.forexUsd ? ` + $${num(cost.forexUsd)}` : ''}</div>
    <button data-act="commit" ${x.mode !== 'turn' || !target ? 'disabled' : ''}>${t(S.T.commit)}</button>
    <h2>${t(S.T.projectsList)}</h2>${live.map((p) => `<div class="card"><b>#${p.id}</b> ${t(p.name)} · ${t(p.where)}
      <div class="muted">${t(p.stage)}${p.waiting ? ` · ${t(p.waiting)}` : ''} · ${yuan(p.spent)} / ${yuan(p.budget)}</div>${bar(p.progress)}
      <button data-act="cancel" data-id="${p.id}" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.T.cancel)}</button></div>`).join('') || `<div class="muted">${t(S.T.none)}</div>`}
    <h2>${t(S.T.teams)}</h2>${teamsView(x.state, slice).map((m) => `<div class="q"><span>${t(m.name)} <span class="muted">${num(m.crew)} · ${yuan(m.costPerMonth)}/${t(S.T.months)}</span></span>
      ${m.live ? `<span class="muted">${t(S.T.live)}</span>` : `<button data-act="team" data-id="${esc(m.id)}" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.T.contract)}</button>`}</div>`).join('')}`;
}

function renderZones(v: View): string {
  const t = tx(v.lang), { x, slice, ui } = v;
  const uses = LAND_USES.map((u) => `<button data-act="draw" data-use="${u}" class="${ui.drawUse === u ? 'sel' : ''}"
      style="border-left:6px solid rgba(${USE_COLOR[u]!.slice(0, 3).join(',')})">${t(S.LAND_USE[u]!)}</button>`).join('');
  const precedents = (slice.tick.precedents ?? []).filter((p) => p.cells.length);
  return `<div class="muted">${t(S.T.drawZone)}</div><div class="opts">${uses}<button data-act="draw" data-use="" class="${ui.drawUse ? '' : 'sel'}">${t(S.T.drawOff)}</button></div>
    <h2>${t(S.T.template)}</h2>${precedents.map((p) => `<div class="q"><span>${esc(bi(p.name))} <span class="muted">${t(S.LAND_USE[p.use]!)}</span></span>
      <button data-act="template" data-id="${esc(p.id)}" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.T.apply)}</button></div>`).join('') || `<div class="muted">${t(S.T.none)}</div>`}
    <h2>${t(S.T.zones)}</h2>${x.state.zones.map((z) => `<div class="q"><span>${t(zoneName(x.state, slice, z.id))} <span class="muted">${z.cellCount} ${t(S.T.cells)}</span></span>
      <button data-act="rmzone" data-id="${z.id}" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.T.removeZone)}</button></div>`).join('') || `<div class="muted">${t(S.T.none)}</div>`}`;
}

function renderPolicy(v: View): string {
  const t = tx(v.lang), { x } = v, p = x.state.policy;
  return `<h2>${t(S.T.enforcement)}</h2><div class="opts">${ENFORCEMENT_LEVELS.map((n) => `<button data-act="enforce" data-v="${n}" class="${p.enforcement === n ? 'sel' : ''}" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.ENFORCEMENT[n]!)}</button>`).join('')}</div>
    <h2>${t(S.T.permits)}</h2><div class="opts">${PERMIT_REGIMES.map((n) => `<button data-act="permit" data-v="${n}" class="${p.permitRegime === n ? 'sel' : ''}" ${x.mode !== 'turn' ? 'disabled' : ''}>${t(S.PERMIT[n]!)}</button>`).join('')}</div>`;
}

export const PANELS: Readonly<Record<string, (v: View) => string>> = { ledger: renderLedger, area: renderArea, leaders: renderLeaders,
  review: renderReview, build: renderBuild, zones: renderZones, policy: renderPolicy };

/** The right panel: the tabs, then the chosen tab's panel. */
export function renderRight(v: View): string {
  const t = tx(v.lang);
  return `<div class="tabs">${TABS.map(([k, l]) => `<button data-act="tab" data-tab="${k}" class="${v.ui.tab === k ? 'sel' : ''}">${t(l)}</button>`).join('')}</div>${PANELS[v.ui.tab]!(v)}`;
}

/** The overlay buttons and the route key (route names are place labels). */
export function renderOverlays(v: View): string {
  const t = tx(v.lang);
  return OVERLAY_LAYERS.map((k) => `<button data-act="layer" data-layer="${k}" class="${v.ui.layer === k ? 'sel' : ''}">${t(S.OVERLAYS[k]!)}</button>`).join('')
    + `<div class="route-key">${t(S.T.temporaryAlignments)}${v.slice.startNetwork.routes.map((r) =>
      `<div><i class="${r.kind}"></i>${esc(bi(r.name))}</div>`).join('')}</div>`;
}

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
export function hoverText(v: View, c: { x: number; y: number; area: number }): string {
  const { x, slice, lang } = v, s = x.state, p = (l: L) => pick(l, lang);
  const z = s.zones.find((q) => q.runs.some(([y, x0, x1]) => y === c.y && c.x >= x0 && c.x <= x1));
  let out = `${c.x},${c.y}${c.area ? ` · ${p(areaName(s, c.area))}` : ''}${z ? ` · ${p(zoneName(s, slice, z.id))}` : ''}`;
  const site = slice.startSites.find((q) => q.cell[0] === c.x && q.cell[1] === c.y);
  if (site) out += ` · ≈ ${bi(site.name)} · ${p(S.T.proxyLocation)}`;
  const index = c.y * s.grid.width + c.x;
  for (const r of slice.startNetwork.routes) if (r.cells.includes(index)) out += ` · ${bi(r.name)} · ${p(S.T.temporaryAlignment)}`;
  if (z && !v.spatial.roads.component.has(index)) {
    const reach = v.spatial.frontage.get(index);
    out += reach ? ` · ${p(S.T.roadAccess)}: ${reach.depth}/${slice.startNetwork.maxFrontageDepth}` : ` · ${p(S.T.noRoadAccess)}`;
  }
  return out;
}
