/**
 * The slice in the browser (phase1-slice.md §11, §11.1): renders the views and sends the player's choices to the
 * controller. Ugly on purpose. Every string is shown in Simplified Chinese and English side by side.
 */
import {
  ENFORCEMENT_LEVELS, LAND_USES, PERMIT_REGIMES, PRIORITIES, formatYM, templateZoneAction,
  cellsOfRuns, roadNetwork, zoneFrontage, type Frontage, type LandUse, type PlayerAction, type Priority, type StartSite,
} from '@sz/sim-core';
import { choose, dequeue, enqueue, newSession, submit, unanswered, type Session } from './controller.js';
import { loadSlice } from './load.js';
import { SliceMap } from './map.js';
import * as S from './strings.js';
import { bi, type L } from './strings.js';
import {
  OVERLAY_LAYERS, USE_COLOR, actionLabel, areaName, areaView, briefing, cardStack, clipZone, ledgerView, leadersView,
  num, pct, previewZone, projectCost, siteCells, projectsView, queuedZoneIds, reviewView, teamsView, verdictView, yuan, zoneName,
  overlayRgba, type OverlayLayer,
} from './views.js';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ESC[c]!);
const b = (l: L) => esc(bi(l));
const $ = (id: string) => document.getElementById(id)!;

const slice = loadSlice();
const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1) || 1;
let x: Session = newSession(slice, seed);
const ui = { layer: 'areas' as OverlayLayer, tab: 'ledger', area: 7, drawUse: null as LandUse | null,
  project: slice.tick.fiscal?.projects[0]?.id ?? '', target: '', priority: 'normal' as Priority };

const siteAt = (c: { x: number; y: number }) => slice.startSites.find((s) => s.cell[0] === c.x && s.cell[1] === c.y);
const { routes, maxFrontageDepth } = slice.startNetwork;
const roads = roadNetwork(x.state.grid, routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells));
const frontage = new Map<number, Frontage>();
let mappedZones: typeof x.state.zones | undefined;
let selectedSite: StartSite | undefined;
const map = new SliceMap($('map') as HTMLCanvasElement, x.state, slice.startSites, routes, {
  hover: (c) => {
    if (!c) { $('hover').textContent = ''; return; }
    const z = x.state.zones.find((q) => q.runs.some(([y, x0, x1]) => y === c.y && c.x >= x0 && c.x <= x1));
    $('hover').textContent = `${c.x},${c.y}${c.area ? ` · ${bi(areaName(x.state, c.area))}` : ''}${z ? ` · ${bi(zoneName(x.state, slice, z.id))}` : ''}`;
    const site = siteAt(c);
    if (site) $('hover').textContent += ` · ≈ ${bi(site.name)} · 近似位置 Proxy location`;
    const index = c.y * x.state.grid.width + c.x;
    for (const r of routes) if (r.cells.includes(index)) $('hover').textContent += ` · ${bi(r.name)} · 临时走线 Temporary alignment`;
    if (z && !roads.component.has(index)) {
      const reach = frontage.get(index);
      $('hover').textContent += reach ? ` · 道路可达 Road access: ${reach.depth}/${maxFrontageDepth}`
        : ' · 无道路连接 No road access';
    }
  },
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

// ---- the left panel: the turn screen ----

function renderTurn(): string {
  const s = x.state;
  const br = briefing(s, slice, x.lastTurnStart);
  const delta = (d: number | undefined, money?: boolean) => d === undefined || d === 0 ? ''
    : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${money ? yuan(Math.abs(d)) : num(Math.abs(d))}</span>`;
  const rows = br.rows.map((r) => `<tr><td>${b(r.label)}</td><td class="n">${r.money ? yuan(r.value) : num(r.value)}</td><td class="n">${delta(r.delta, r.money)}</td></tr>`).join('');
  const cards = cardStack(s, slice).map((c) => `<div class="card ${c.interrupting ? 'int' : ''}">
      <h3>${b(c.title)}</h3>
      <div class="muted">${b(c.interrupting ? S.T.mustAnswer : S.T.optional)}${c.expires ? ` · ${b(S.T.expires)} ${c.expires}` : ''}</div>
      ${c.lines.map((l) => `<div class="line">${b(l.label)}: ${esc(l.value)}</div>`).join('')}
      <div class="opts">${c.options.map((o) => `<button data-act="choose" data-card="${esc(c.id)}" data-opt="${esc(o.id)}"
        class="${x.answers[c.id] === o.id ? 'sel' : ''}">${b(o.label)}</button>`).join('')}</div></div>`).join('') || `<div class="muted">${b(S.T.noCards)}</div>`;
  const queue = x.queue.map((_, k) => `<div class="q"><span>${b(actionLabel(s, slice, x.queue, k))}</span>
      <button data-act="dequeue" data-k="${k}">${b(S.T.remove)}</button></div>`).join('') || `<div class="muted">${b(S.T.emptyQueue)}</div>`;
  const waiting = unanswered(x).length > 0;
  const go = x.mode === 'over' ? '' : `<button class="go" data-act="submit" ${waiting ? 'disabled' : ''}>${b(x.mode === 'paused' ? S.T.continue : S.T.endTurn)}</button>`;
  return `<h1>${b(S.T.title)}</h1>
    <div class="muted">${esc(br.when)} · ${b(S.T.turn)} ${br.turn} / ${s.scenario.turns}${x.mode === 'paused' ? ` · ${b(S.T.paused)}` : ''} · ${b(S.T.seed)} ${x.seed}</div>
    <h2>${b(S.T.briefing)}</h2><table>${rows}</table>
    <h2>${b(S.T.cards)}</h2>${cards}
    ${x.mode === 'turn' ? `<h2>${b(S.T.queue)}</h2>${queue}` : ''}
    ${x.error ? `<div class="err">${b(S.T.error)}: ${esc(x.error)}</div>` : ''}
    ${go}`;
}

// ---- the right panel ----

const TABS: [string, L][] = [['ledger', S.T.ledger], ['area', S.T.area], ['leaders', S.T.leaders], ['review', S.T.review],
  ['build', S.T.build], ['zones', S.T.zones], ['policy', S.T.policy]];
const tr = (l: L, v: string) => `<tr><td>${b(l)}</td><td class="n">${esc(v)}</td></tr>`;
const bar = (v: number) => `<div class="bar"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, v)))}%"></i></div>`;

function renderLedger(): string {
  const l = ledgerView(x.state, slice);
  return `<div class="muted">${b(l.regime)}</div>
    <h2>${b(S.T.recurring)}</h2><table>${tr(S.T.revenue, yuan(l.recurring.revenue))}${tr(S.T.due, yuan(l.recurring.due))}
      ${tr(S.T.available, yuan(l.recurring.available))}${tr(S.T.perYear, yuan(l.recurring.perYear))}</table>
    <h2>${b(S.T.projectsView)}</h2><table>${tr(S.T.funds, yuan(l.projects.funds))}${tr(S.T.unspent, yuan(l.projects.unspent))}
      ${tr(S.T.available, yuan(l.projects.available))}${tr(S.T.borrowing, yuan(l.borrowing))}${tr(S.T.forex, `$${num(l.forexUsd)}`)}</table>
    <h2>${b(S.T.obligations)}</h2><table>${l.obligations.map((o) => tr(o.label, yuan(o.value))).join('')}</table>
    <h2>${b(S.T.loans)}</h2>${l.loans.map((n) => `<div>#${n.id} ${b(n.kind)} · ${b(S.T.outstanding)} ${yuan(n.outstanding)}
      <div class="muted">${n.next.map((e) => `${e.at}: ${yuan(e.principal)} + ${yuan(e.interest)}`).join(' · ')}</div></div>`).join('') || `<div class="muted">${b(S.T.noLoans)}</div>`}`;
}

function renderArea(): string {
  const v = areaView(x.state, ui.area);
  if (!v) return `<div class="muted">${b(S.T.pickArea)}</div>`;
  const h = v.housing;
  const site = selectedSite?.area === ui.area ? selectedSite : undefined;
  const flag = site ? `<h2>≈ ${b(site.name)}</h2><div>近似位置 Proxy location · ${esc(site.proxy)}</div>
    <details><summary>证据 Evidence</summary>${site.claims.map((c) => `<div>${esc(c.id)}</div>`).join('')}</details>` : '';
  return `${flag}<h2>${b(v.name)} <span class="muted">#${ui.area}</span></h2><div class="muted">${b(S.T.pickArea)}</div>
    <h2>${b(S.T.pops)}</h2><table><tr><td></td><td class="n">${b(S.T.size)}</td><td class="n">${b(S.T.present)}</td></tr>
      ${v.pops.map((p) => `<tr><td>${b(p.label)}</td><td class="n">${num(p.size)}</td><td class="n">${num(p.present)}</td></tr>`).join('')}</table>
    ${h ? `<h2>${b(S.T.beds)}</h2><table>${tr(S.T.localBeds, `${num(h.occupants.local)} / ${num(h.beds.local)}`)}
      ${tr(S.T.rentalBeds, `${num(h.occupants.rental)} / ${num(h.beds.rental)}`)}${tr(S.T.crowding, h.crowding.toFixed(2))}${tr(S.T.rent, yuan(h.rent))}</table>` : ''}
    <h2>${b(S.T.jobs)}</h2><table>${v.jobs.map((j) => tr(j.label, `${num(j.filled)} / ${num(j.jobs)}`)).join('')}${tr(S.T.firms, String(v.firms))}</table>
    <h2>${b(S.T.utilities)}</h2><table>${tr(S.T.power, num(v.utilities.powerCap))}${tr(S.T.water, num(v.utilities.waterCap))}${tr(S.T.roadKm, String(v.roadKm))}</table>
    <h2>${b(S.T.facilities)}</h2><table>${tr(S.T.schoolPlaces, num(v.facilities.schoolPlaces))}${tr(S.T.clinicVisits, num(v.facilities.clinicVisits))}
      ${tr(S.T.policePosts, num(v.facilities.policePosts))}${tr(S.T.illegalShare, pct(v.illegalFloorShare))}</table>`;
}

function renderLeaders(): string {
  const v = leadersView(x.state, slice), m = v.mandate;
  return `<h2>${b(S.T.mandate)}</h2><div>${m.priority ? `${b(m.priority)} · ${b(m.met ? S.T.mandateMet : S.T.mandateOpen)}` : `<span class="muted">${b(S.T.noMandate)}</span>`}</div>`
    + v.leaders.map((l) => `<div class="card"><div class="portrait">${esc([...l.name.zh][0] ?? '?')}</div><h3>${b(l.role)} · ${b(l.name)}</h3>
      <div class="muted">${l.traits.map(b).join(' · ') || ''}</div>
      <table>${tr(S.T.rapport, String(Math.round(l.rapport)))}${tr(S.T.standing, String(Math.round(l.standing)))}
      ${tr(S.T.disciplineRisk, bi(l.risk))}${tr(S.T.shortcuts, String(l.shortcuts))}</table></div>`).join('')
    + (v.falls.length ? `<h2>${b(S.T.falls)}</h2>${v.falls.map((f) => `<div class="muted">${f.at}: ${b(f.leader)} → ${b(f.replacedBy)}</div>`).join('')}` : '');
}

function renderReview(): string {
  const v = reviewView(x.state, slice);
  const fmt = (share: boolean, n: number) => (share ? pct(n) : num(n));
  const next = v.next ? `<h2>${b(S.T.thisYear)}</h2><div>${b(S.T.projected)}: ${v.next.score.toFixed(2)}</div>
      <table><tr><td></td><td class="n">${b(S.T.value)}</td><td class="n">${b(S.T.target)}</td></tr>
      ${v.next.items.map((i) => `<tr><td>${b(i.label)}${bar(i.score)}</td><td class="n">${fmt(i.share, i.value)}</td><td class="n">${fmt(i.share, i.target)}</td></tr>`).join('')}</table>`
    : `<div class="muted">${b(S.T.noReviewLeft)}</div>`;
  return next + `<h2>${b(S.T.held)}</h2>` + v.held.map((r) => `<div>${r.at}: ${r.score.toFixed(2)} ${b(r.pass ? S.T.pass : S.T.fail)}${r.vetoed ? ` · ${b(S.T.vetoed)}` : ''}</div>`).join('');
}

function targets(): { value: string; label: L }[] {
  const t = slice.tick.fiscal?.projects.find((p) => p.id === ui.project);
  if (t?.target === 'zone') {
    const ids = queuedZoneIds(x.state, x.queue);
    return [...x.state.zones.map((z) => ({ value: `zone:${z.id}`, label: zoneName(x.state, slice, z.id) })),
      ...[...ids.values()].map((id) => ({ value: `zone:${id}`, label: { zh: `${S.NEW_ZONE.zh} #${id}`, en: `${S.NEW_ZONE.en} #${id}` } }))];
  }
  return x.state.areas.filter((a) => a.access === 'playable').map((a) => ({ value: `area:${a.id}`, label: a.name }));
}

function renderBuild(): string {
  const projects = slice.tick.fiscal?.projects ?? [];
  const opts = targets();
  if (!opts.some((o) => o.value === ui.target)) ui.target = opts[0]?.value ?? '';
  const zoneCells = ui.target.startsWith('zone:') ? (() => {
    const id = Number(ui.target.slice(5)), z = x.state.zones.find((q) => q.id === id);
    const k = [...queuedZoneIds(x.state, x.queue)].find(([, v]) => v === id)?.[0];
    const a = k !== undefined ? x.queue[k] : undefined;
    const runs = z ? z.runs : a?.type === 'create_zone' ? a.runs : [];
    return siteCells(x.state, slice, runs);
  })() : 0;
  const cost = projectCost(slice, ui.project, zoneCells);
  const live = projectsView(x.state, slice);
  return `<h2>${b(S.T.commit)}</h2>
    <select data-ui="project">${projects.map((p) => `<option value="${esc(p.id)}" ${p.id === ui.project ? 'selected' : ''}>${b(p.name)}</option>`).join('')}</select>
    <select data-ui="target">${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === ui.target ? 'selected' : ''}>${b(o.label)}</option>`).join('')}</select>
    <select data-ui="priority">${PRIORITIES.map((p) => `<option value="${p}" ${p === ui.priority ? 'selected' : ''}>${b(S.PRIORITY[p]!)}</option>`).join('')}</select>
    <div class="muted">${yuan(cost.yuan)}${cost.forexUsd ? ` + $${num(cost.forexUsd)}` : ''}</div>
    <button data-act="commit" ${x.mode !== 'turn' || !ui.target ? 'disabled' : ''}>${b(S.T.commit)}</button>
    <h2>${b(S.T.projectsList)}</h2>${live.map((p) => `<div class="card"><b>#${p.id}</b> ${b(p.name)} · ${b(p.where)}
      <div class="muted">${b(p.stage)}${p.waiting ? ` · ${b(p.waiting)}` : ''} · ${yuan(p.spent)} / ${yuan(p.budget)}</div>${bar(p.progress)}
      <button data-act="cancel" data-id="${p.id}" ${x.mode !== 'turn' ? 'disabled' : ''}>${b(S.T.cancel)}</button></div>`).join('') || `<div class="muted">${b(S.T.none)}</div>`}
    <h2>${b(S.T.teams)}</h2>${teamsView(x.state, slice).map((t) => `<div class="q"><span>${b(t.name)} <span class="muted">${num(t.crew)} · ${yuan(t.costPerMonth)}/${b(S.T.months)}</span></span>
      ${t.live ? `<span class="muted">${b(S.T.live)}</span>` : `<button data-act="team" data-id="${esc(t.id)}" ${x.mode !== 'turn' ? 'disabled' : ''}>${b(S.T.contract)}</button>`}</div>`).join('')}`;
}

function renderZones(): string {
  const uses = LAND_USES.map((u) => `<button data-act="draw" data-use="${u}" class="${ui.drawUse === u ? 'sel' : ''}"
      style="border-left:6px solid rgba(${USE_COLOR[u]!.slice(0, 3).join(',')})">${b(S.LAND_USE[u]!)}</button>`).join('');
  const precedents = (slice.tick.precedents ?? []).filter((p) => p.cells.length);
  return `<div class="muted">${b(S.T.drawZone)}</div><div class="opts">${uses}<button data-act="draw" data-use="" class="${ui.drawUse ? '' : 'sel'}">${b(S.T.drawOff)}</button></div>
    <h2>${b(S.T.template)}</h2>${precedents.map((p) => `<div class="q"><span>${b(p.name)} <span class="muted">${b(S.LAND_USE[p.use]!)}</span></span>
      <button data-act="template" data-id="${esc(p.id)}" ${x.mode !== 'turn' ? 'disabled' : ''}>${b(S.T.apply)}</button></div>`).join('') || `<div class="muted">${b(S.T.none)}</div>`}
    <h2>${b(S.T.zones)}</h2>${x.state.zones.map((z) => `<div class="q"><span>${b(zoneName(x.state, slice, z.id))} <span class="muted">${z.cellCount} ${b(S.T.cells)}</span></span>
      <button data-act="rmzone" data-id="${z.id}" ${x.mode !== 'turn' ? 'disabled' : ''}>${b(S.T.removeZone)}</button></div>`).join('') || `<div class="muted">${b(S.T.none)}</div>`}`;
}

function renderPolicy(): string {
  const p = x.state.policy;
  return `<h2>${b(S.T.enforcement)}</h2><div class="opts">${ENFORCEMENT_LEVELS.map((v) => `<button data-act="enforce" data-v="${v}" class="${p.enforcement === v ? 'sel' : ''}" ${x.mode !== 'turn' ? 'disabled' : ''}>${b(S.ENFORCEMENT[v]!)}</button>`).join('')}</div>
    <h2>${b(S.T.permits)}</h2><div class="opts">${PERMIT_REGIMES.map((v) => `<button data-act="permit" data-v="${v}" class="${p.permitRegime === v ? 'sel' : ''}" ${x.mode !== 'turn' ? 'disabled' : ''}>${b(S.PERMIT[v]!)}</button>`).join('')}</div>`;
}

const PANELS: Record<string, () => string> = { ledger: renderLedger, area: renderArea, leaders: renderLeaders, review: renderReview,
  build: renderBuild, zones: renderZones, policy: renderPolicy };

function renderVerdict(): void {
  const el = $('verdict');
  if (x.mode !== 'over') { el.style.display = 'none'; return; }
  const v = verdictView(x.state, slice);
  const failed = x.state.ended?.reason === 'failure';
  $('verdictBody').innerHTML = `<h1>${b(S.T.verdict)}</h1>
    ${failed ? `<div class="err">${b(S.T.failure)}</div>` : ''}
    ${v ? `<h2>${b(S.T.growth)}</h2><table>${tr(S.T.residents, `×${v.growth.residents.toFixed(2)}`)}${tr(S.T.gdpYear, `×${v.growth.gdp.toFixed(2)}`)}
      ${tr(S.T.reserve, yuan(v.ledger.reserve))}${tr(S.T.debt, yuan(v.ledger.debtOutstanding))}${tr(S.T.arrears, yuan(v.ledger.arrears))}
      ${tr(S.T.scrutiny, num(v.scrutiny))}${tr(S.T.illegalShare, pct(v.illegalShare))}
      ${tr(S.T.fiscalTest, yuan(v.fiscalTest.balance))}</table>` : `<div class="muted">${b(S.T.ended)} · ${formatYM(x.state.date)}</div>`}
    <h2>${b(S.T.held)}</h2>${reviewView(x.state, slice).held.map((r) => `<div>${r.at}: ${r.score.toFixed(2)} ${b(r.pass ? S.T.pass : S.T.fail)}</div>`).join('')}
    <button class="go" data-act="restart">${b(S.T.restart)}</button>`;
  el.style.display = 'flex';
}

function render(): void {
  if (mappedZones !== x.state.zones) {
    frontage.clear();
    for (const z of x.state.zones) for (const [c, f] of zoneFrontage(roads, cellsOfRuns(z.runs, x.state.grid), maxFrontageDepth)) {
      frontage.set(c, f);
    }
    mappedZones = x.state.zones;
  }
  $('left').innerHTML = renderTurn();
  $('right').innerHTML = `<div class="tabs">${TABS.map(([k, l]) => `<button data-act="tab" data-tab="${k}" class="${ui.tab === k ? 'sel' : ''}">${b(l)}</button>`).join('')}</div>${PANELS[ui.tab]!()}`;
  $('overlays').innerHTML = OVERLAY_LAYERS.map((k) => `<button data-act="layer" data-layer="${k}" class="${ui.layer === k ? 'sel' : ''}">${b(S.OVERLAYS[k]!)}</button>`).join('');
  $('overlays').insertAdjacentHTML('beforeend', `<div class="route-key">临时走线 Temporary alignments${routes.map((r) =>
    `<div><i class="${r.kind}"></i>${b(r.name)}</div>`).join('')}</div>`);
  const queued = x.queue.flatMap((a) => (a.type === 'create_zone' ? [{ runs: a.runs, color: 'rgba(120,230,255,.6)' }] : []));
  const zones = ui.layer === 'land_use' ? queued : [...x.state.zones.map((z) => ({ runs: z.runs, color: 'rgba(255,255,255,.22)' })), ...queued];
  map.setState(x.state, overlayRgba(x.state, slice, ui.layer), zones);
  map.setDrawMode(ui.drawUse !== null && x.mode === 'turn');
  renderVerdict();
}

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!t) return;
  const d = t.dataset;
  switch (d.act) {
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
      } catch (err) { x = { ...x, error: err instanceof Error ? err.message : String(err) }; }
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
