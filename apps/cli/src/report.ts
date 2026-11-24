/**
 * The plausibility report (phase1-slice.md §5.9): one self-contained HTML page with inline SVG charts, the bands with
 * their [UNVERIFIED] tags, and the exit-criteria table. A failing band is shown as a finding, never hidden.
 */
import { formatYM, type BandResult } from '@sz/sim-core';
import type { Analysis } from './slice.js';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (t: unknown) => String(t).replace(/[&<>"]/g, (c) => ESC[c]!);
const num = (x: number | undefined) => x === undefined ? '–' : !Number.isFinite(x) ? (x > 0 ? '∞' : '−∞')
  : Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('en-US') : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(3);

interface Line { name: string; values: readonly number[]; color: string }
/** A small line chart: months on x, one or more series on a shared y from 0 (or the minimum, if negative). */
function chart(title: string, months: readonly string[], lines: Line[], w = 460, h = 180): string {
  const pad = { l: 64, r: 10, t: 22, b: 22 };
  const all = lines.flatMap((l) => l.values);
  const hi = Math.max(1, ...all), lo = Math.min(0, ...all);
  const x = (i: number) => pad.l + (i / Math.max(1, months.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const path = (l: Line) => l.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const years = months.map((m, i) => [m, i] as const).filter(([m]) => m.endsWith('-01'));
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
  <text x="${pad.l}" y="14" class="t">${esc(title)}</text>
  <line x1="${pad.l}" y1="${y(lo)}" x2="${w - pad.r}" y2="${y(lo)}" class="ax"/>
  ${lo < 0 ? `<line x1="${pad.l}" y1="${y(0)}" x2="${w - pad.r}" y2="${y(0)}" class="zero"/>` : ''}
  <text x="${pad.l - 4}" y="${y(hi) + 4}" class="yl">${num(hi)}</text>
  <text x="${pad.l - 4}" y="${y(lo) + 4}" class="yl">${num(lo)}</text>
  ${years.map(([m, i]) => `<line x1="${x(i)}" y1="${pad.t}" x2="${x(i)}" y2="${h - pad.b}" class="grid"/><text x="${x(i)}" y="${h - 6}" class="xl">${esc(m.slice(0, 4))}</text>`).join('')}
  ${lines.map((l) => `<path d="${path(l)}" fill="none" stroke="${l.color}" stroke-width="1.6"/>`).join('')}
  ${lines.map((l, k) => `<text x="${w - pad.r - 4}" y="${pad.t + 12 + 12 * k}" class="lg" fill="${l.color}">${esc(l.name)}</text>`).join('')}
</svg>`;
}

const mark = (r: BandResult['result'] | boolean) => {
  const k = r === true ? 'pass' : r === false ? 'fail' : r;
  return `<span class="${k}">${esc(k.replace('_', ' '))}</span>`;
};
const range = (b: BandResult) => b.range ? `${num(b.range[0])} … ${num(b.range[1])}` : '';

function bandRows(bands: readonly BandResult[]): string {
  return bands.map((b) => `<tr><td><code>${esc(b.id)}</code></td><td>${esc(b.kind)}</td><td>${esc(b.measure ?? '')}</td>
    <td class="n">${num(b.value)}${b.base !== undefined ? ` <small>(base ${num(b.base)})</small>` : ''}</td><td class="n">${range(b)}</td>
    <td>${mark(b.result)}</td><td>${b.claims.map((c) => `<code>${esc(c.id)}</code> ${esc(c.status)}${c.unverified ? ' <b class="unv">[UNVERIFIED]</b>' : ''}`).join('<br>')}
    ${b.note ? `<div class="note">${esc(b.note)}</div>` : ''}</td></tr>`).join('\n');
}

export function reportHtml(a: Analysis, wallMs: number): string {
  const { checks: c, series: s, summary } = a;
  const m = s.months;
  const due = s.obligationsDue;
  const criteria: [string, string, boolean | 'n/a', string][] = [
    ['1', 'Play all 21 quarters; the town grows plausibly · 玩完21个季度，城市增长合理', c.c1.reachedVisit && c.c1.growthBands.every((b) => b.result === 'pass'),
      `reached the visit: ${c.c1.reachedVisit} (${c.c1.quarters} quarters); growth bands passed ${c.c1.growthBands.filter((b) => b.result === 'pass').length} of ${c.c1.growthBands.length}. Response to choices is compared across the golden set.`],
    ['2', 'A hard trade-off every year; a loan squeezes a later year · 每年的取舍；贷款挤压后续年份', c.c2.everyYear && (c.c2.loan.took ? c.c2.loan.squeezed : true),
      `trade-off years ${c.c2.years.filter((y) => y.tradeoff).length} of ${c.c2.years.length}; loan ${c.c2.loan.took ? (c.c2.loan.squeezed ? 'taken, squeezes a later year' : 'taken, no squeeze found') : 'not taken by this policy'}`],
    ['3', 'Plausibility bands at 1980-Q2 and end-1983 · 1980年二季度与1983年末的合理性区间', c.c3.failed === 0,
      `${c.c3.passed} pass, ${c.c3.failed} fail, ${c.c3.other} cross-run or not checkable`],
    ['4', 'No empty quarters in the prologue · 序章没有空季度', c.c4.everyTurn,
      c.c4.turns.map((t) => `turn ${t.turn}: ${t.cards.join(', ') || 'none'}`).join('; ')],
    ['5', 'A headless run takes seconds; invariants pass · 无界面运行数秒；不变量成立', wallMs < 5000,
      `this run and its no-loan counterfactual: ${wallMs.toFixed(0)} ms. Invariants: the property tests in npm test.`],
  ];
  const v = summary.verdict;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Slice report: ${esc(a.options.policy)}, seed ${a.options.seed}</title>
<style>
  :root { --bg:#fbfaf7; --fg:#1d232a; --muted:#66707a; --line:#d8d4cc; --pass:#2f7d4f; --fail:#b3362b; --other:#8a6d1f; }
  @media (prefers-color-scheme: dark) { :root { --bg:#14191e; --fg:#e6e2d9; --muted:#9aa4ad; --line:#2c343c; --pass:#5cbf84; --fail:#ef6b5e; --other:#d6b25c; } }
  body { background:var(--bg); color:var(--fg); font:14px/1.45 system-ui, sans-serif; margin:0 auto; padding:16px; max-width:1100px; }
  h1 { font-size:20px; margin:4px 0 2px; } h2 { font-size:16px; margin:22px 0 8px; border-bottom:1px solid var(--line); padding-bottom:4px; }
  .muted, small, .note { color:var(--muted); } .note { font-size:12px; }
  table { border-collapse:collapse; width:100%; font-size:13px; } td, th { border-bottom:1px solid var(--line); padding:4px 6px; vertical-align:top; text-align:left; }
  td.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .pass { color:var(--pass); font-weight:600; } .fail { color:var(--fail); font-weight:600; } .cross_run, .not_checkable, .n\\/a { color:var(--other); font-weight:600; }
  .unv { color:var(--other); font-weight:600; font-size:11px; }
  .charts { display:flex; flex-wrap:wrap; gap:8px; } svg { max-width:100%; height:auto; background:transparent; }
  svg .t { font-size:12px; fill:var(--fg); font-weight:600; } svg .yl { font-size:10px; fill:var(--muted); text-anchor:end; }
  svg .xl { font-size:10px; fill:var(--muted); text-anchor:middle; } svg .lg { font-size:10px; text-anchor:end; }
  svg .ax { stroke:var(--line); } svg .grid { stroke:var(--line); stroke-dasharray:2 3; } svg .zero { stroke:var(--muted); stroke-dasharray:4 2; }
  code { font-size:12px; }
</style></head><body>
<h1>Slice report · 切片报告: <code>${esc(a.options.policy)}</code>, seed ${a.options.seed}</h1>
<div class="muted">${a.options.quarters} quarters requested · ended ${esc(summary.ended ?? 'not ended')} · wall time ${wallMs.toFixed(0)} ms ·
claims below <code>verified</code> are tagged [UNVERIFIED] (draft mode). All numbers are placeholders until M6b's balance pass.</div>

<h2>Exit criteria · 退出标准</h2>
<table><tr><th>#</th><th>Criterion</th><th>Result</th><th>Detail</th></tr>
${criteria.map(([k, name, ok, d]) => `<tr><td>${k}</td><td>${esc(name)}</td><td>${mark(ok === 'n/a' ? 'not_checkable' : ok)}</td><td>${esc(d)}</td></tr>`).join('\n')}
<tr><td>6</td><td>You want to play it again · 想再玩一次</td><td>${mark('not_checkable')}</td><td>Judged by playtests (§12), not tests.</td></tr>
</table>

<h2>Charts · 图表</h2>
<div class="charts">
${chart('People: usual residents, present, migrants', m, [
  { name: 'residents', values: s.resident, color: '#3b6fb6' }, { name: 'present', values: s.present, color: '#8a6d1f' },
  { name: 'migrants', values: s.migrants, color: '#b3362b' }])}
${chart('GDP and exports (¥ and US$ a month)', m, [
  { name: 'GDP ¥', values: s.gdp, color: '#2f7d4f' }, { name: 'exports US$', values: s.exportsUsd, color: '#7b4fb3' }])}
${chart('Revenue against obligations due (¥ a month)', m, [
  { name: 'revenue', values: s.revenue, color: '#2f7d4f' }, { name: 'due', values: due, color: '#b3362b' }])}
${chart('Reserve and debt outstanding (¥)', m, [
  { name: 'reserve', values: s.reserve, color: '#3b6fb6' }, { name: 'debt', values: s.debtOutstanding, color: '#b3362b' }])}
${chart('Firm jobs posted', m, [{ name: 'firm jobs', values: s.firmJobs, color: '#7b4fb3' }])}
${chart('Real illegal-floor share', m, [{ name: 'illegal share', values: s.illegalShare, color: '#8a6d1f' }])}
</div>

<h2>Plausibility bands · 合理性区间 (§9)</h2>
<table><tr><th>Band</th><th>Kind</th><th>Measure</th><th>Value</th><th>Range</th><th>Result</th><th>Claims</th></tr>
${bandRows(c.c3.bands)}
</table>

<h2>Trade-offs by year · 年度取舍 (criterion 2)</h2>
<table><tr><th>Review</th><th>Score</th><th>Close</th><th>Deficit cards</th><th>Austerity months</th><th>Arrears created</th><th>Lowest money for projects</th><th>Trade-off</th></tr>
${c.c2.years.map((y) => `<tr><td>${y.review} (${esc(formatYM(y.date))})</td><td class="n">${y.score.toFixed(2)} ${mark(y.pass)}</td><td>${y.close}</td>
  <td class="n">${y.deficitCards}</td><td class="n">${y.austerityMonths}</td><td class="n">${y.arrearsCreated}</td><td class="n">${num(y.minMoneyForProjects)}</td><td>${mark(y.tradeoff)}</td></tr>`).join('\n')}
</table>
<h3>The loan · 贷款</h3>
<table><tr><th>Year</th><th>Debt service</th><th>Recurring balance</th><th>Without the loan</th></tr>
${c.c2.loan.years.map((y) => `<tr><td>${esc(m[y.year * 12]?.slice(0, 4) ?? y.year)}</td><td class="n">${num(y.debtService)}</td><td class="n">${num(y.balance)}</td><td class="n">${num(y.balanceWithoutLoan)}</td></tr>`).join('\n')}
</table>

<h2>The visit's verdict · 视察时的评价</h2>
${v ? `<table>
<tr><td>Growth (residents, GDP) over the first year</td><td class="n">${num(v.growth.residents)} · ${num(v.growth.gdp)}</td></tr>
<tr><td>Reserve · debt outstanding · arrears</td><td class="n">${num(v.ledger.reserve)} · ${num(v.ledger.debtOutstanding)} · ${num(v.ledger.arrears)}</td></tr>
<tr><td>Last review</td><td class="n">${v.lastReview ? `${v.lastReview.score.toFixed(2)} ${v.lastReview.pass ? 'pass' : 'fail'}` : '–'}</td></tr>
<tr><td>Scrutiny · illegal-floor share</td><td class="n">${num(v.scrutiny)} · ${num(v.illegalShare)}</td></tr>
<tr><td>1984 fiscal test: revenue a year − dues over 12 months (grant ${v.fiscalTest.grantFactor})</td><td class="n">${num(v.fiscalTest.revenuePerYear)} − ${num(v.fiscalTest.dueNext12)} = <b>${num(v.fiscalTest.balance)}</b></td></tr>
</table>` : '<p class="muted">The run did not reach the visit.</p>'}

<h2>Reviews · 年度考核</h2>
<table><tr><th>#</th><th>Held</th><th>Score</th><th>Result</th></tr>
${summary.reviews.map((r) => `<tr><td>${r.index}</td><td>${esc(r.at)}</td><td class="n">${r.score.toFixed(2)}</td><td>${mark(r.pass)}${r.vetoed ? ` (veto: ${esc(r.vetoed)})` : ''}</td></tr>`).join('\n')}
</table>
</body></html>
`;
}
