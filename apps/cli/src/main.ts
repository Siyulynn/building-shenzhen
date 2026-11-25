/**
 * The slice's CLI (phase1-slice.md §5.9, §10):
 *   slice run --seed N --quarters Q --policy P [--out DIR]   play a run, write run.json and report.html
 *   slice golden [--update]                                   compare (or rewrite) the golden runs
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { POLICY_NAMES, crossRunChecks, type RunSummary } from '@sz/sim-core';
import { reportHtml } from './report.js';
import { GOLDEN_POLICIES, ROOT, analyse, goldenPath, goldenSummary, goldenText, loadSlice, runJson } from './slice.js';

function flag(args: string[], name: string, fallback?: string): string | undefined {
  const k = args.indexOf(`--${name}`);
  return k >= 0 ? args[k + 1] : fallback;
}
const whole = (v: string | undefined, name: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`--${name} must be a positive whole number`);
  return n;
};

/** The §5.9 checkpoint table by policy: population, land and floor, jobs, housing, works and the fiscal state. */
export function checkpointTable(summaries: readonly RunSummary[]): string {
  const head = ['policy', 'at', 'registered', 'resident', 'present', 'present nonlocal', 'migrants',
    'planned I/C/R', 'serviced I/C/R', 'developable I/C/R', 'industrial built/open m²', 'commercial built/occupied m²',
    'residential dormitory m²', 'village rental m²', 'firm posted', 'filled', 'vacancies', 'rental beds', 'occupants',
    'crowding', 'turned away', 'road cells', 'power/water sources', 'facilities', 'reserve', 'money for projects',
    'debt', 'arrears', 'revenue year', 'spending year', 'spending ÷ revenue', 'electricity kWh/yr'];
  const rows: string[][] = [head];
  for (const r of summaries) for (const c of r.checkpoints) rows.push([
    r.policy, c.at, String(c.population.registered), String(c.population.resident), String(c.population.present),
    String(c.population.presentNonlocal), String(c.population.migrants),
    `${c.land.plannedCells.industrial}/${c.land.plannedCells.commercial}/${c.land.plannedCells.residential}`,
    `${c.land.servicedCells.industrial}/${c.land.servicedCells.commercial}/${c.land.servicedCells.residential}`,
    `${c.land.developableCells.industrial}/${c.land.developableCells.commercial}/${c.land.developableCells.residential}`,
    `${c.floor.industrialBuiltM2}/${c.floor.industrialOpenM2}`,
    `${c.floor.commercialBuiltM2}/${c.floor.commercialOccupiedM2}`, String(c.floor.residentialM2),
    String(c.floor.villageRentalM2), String(c.jobs.firmPosted), String(c.jobs.filled), String(c.jobs.vacancies),
    String(c.housing.rentalBeds), String(c.housing.rentalOccupants), c.housing.crowding.toFixed(2),
    String(c.housing.turnedAway), String(c.works.roadCells), `${c.works.powerSources}/${c.works.waterSources}`,
    String(c.works.facilities), String(Math.round(c.fiscal.reserve)), String(Math.round(c.fiscal.moneyForProjects)),
    String(Math.round(c.fiscal.debtOutstanding)), String(Math.round(c.fiscal.arrears)),
    String(Math.round(c.fiscal.revenueYear)), String(Math.round(c.fiscal.spendingYear)),
    c.fiscal.spendingOverRevenue.toFixed(2), String(Math.round(c.energy.electricityKwhYear)),
  ]);
  const widths = head.map((_, i) => Math.max(...rows.map((r) => r[i]!.length)));
  const line = (r: string[]) => `| ${r.map((x, i) => x.padEnd(widths[i]!)).join(' | ')} |`;
  return [line(head), `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`, ...rows.slice(1).map(line)].join('\n');
}

function run(args: string[]): void {
  const slice = loadSlice();
  const policy = flag(args, 'policy', 'default')!;
  if (!(POLICY_NAMES as readonly string[]).includes(policy)) throw new Error(`--policy must be one of ${POLICY_NAMES.join(', ')}`);
  const o = { policy, seed: whole(flag(args, 'seed', '1'), 'seed'),
    quarters: whole(flag(args, 'quarters', String(slice.init.scenario.turns)), 'quarters') };
  const out = flag(args, 'out', join(ROOT, 'build', 'slice', `${o.policy}-seed${o.seed}`))!;
  const t0 = performance.now();
  const { a } = analyse(slice, o);
  const ms = performance.now() - t0;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'run.json'), runJson(a));
  writeFileSync(join(out, 'report.html'), reportHtml(a, ms));
  const c = a.checks;
  console.log(`slice run: ${o.policy}, seed ${o.seed}, ${c.c1.quarters} quarters in ${ms.toFixed(0)} ms (with the no-loan rerun)`);
  console.log(`  ended: ${a.summary.ended ?? 'not ended'}; bands: ${c.c3.passed} pass, ${c.c3.failed} fail, ${c.c3.other} other`);
  for (const b of c.c3.bands.filter((x) => x.result === 'fail')) console.log(`  FAIL ${b.id}: ${b.value ?? ''} ${b.note ?? ''}`);
  console.log(`  trade-off years ${c.c2.years.filter((y) => y.tradeoff).length}/${c.c2.years.length}; loan ${c.c2.loan.took ? (c.c2.loan.squeezed ? 'squeezes a later year' : 'no squeeze') : 'not taken'}; prologue decisions every turn: ${c.c4.everyTurn}`);
  console.log(`  wrote ${join(out, 'run.json')} and report.html`);
}

function golden(args: string[]): void {
  const slice = loadSlice();
  const update = args.includes('--update');
  let moved = 0;
  const all: RunSummary[] = [];
  for (const policy of GOLDEN_POLICIES) {
    const path = join(ROOT, goldenPath(policy));
    const summary = goldenSummary(slice, policy);
    all.push(summary);
    const text = goldenText(summary);
    const old = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : undefined;
    if (old === text) { console.log(`  same   ${goldenPath(policy)}`); continue; }
    moved++;
    if (update) {
      mkdirSync(join(ROOT, 'data', 'golden', 'slice'), { recursive: true });
      writeFileSync(path, text);
      console.log(`  wrote  ${goldenPath(policy)}${old === undefined ? ' (new)' : ''}`);
    } else console.log(`  MOVED  ${goldenPath(policy)}`);
  }
  const x = crossRunChecks(all);
  console.log(`criterion 1, response to choices: ${x.responds ? 'pass' : 'fail'} (${all.map((r) => {
    const e = r.years[r.years.length - 1]!; return `${r.policy}: ${e.residents} residents, GDP ${e.gdp}`; }).join('; ')})`);
  console.log(`readiness_moves_wave: ${x.readinessMovesWave} (${x.detail})`);
  const table = checkpointTable(all);
  mkdirSync(join(ROOT, 'build', 'slice'), { recursive: true });
  writeFileSync(join(ROOT, 'build', 'slice', 'checkpoints.md'),
    `# §9 checkpoints by policy (seed 1)\n\nGenerated by \`npm run slice -- golden\`. Values are placeholders until the claims pass verification.\n\n${table}\n`);
  console.log(`\n${table}`);
  console.log(`\nwrote ${join(ROOT, 'build', 'slice', 'checkpoints.md')}`);
  if (moved && !update) {
    console.log('golden runs moved: rerun with --update and say what moved and why in the commit (AGENTS.md)');
    process.exitCode = 1;
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'run') run(rest);
  else if (cmd === 'golden') golden(rest);
  else { console.log('usage: slice run --seed N --quarters Q --policy P [--out DIR] | slice golden [--update]'); process.exitCode = cmd ? 1 : 0; }
} catch (e) {
  console.error(`slice: ${(e as Error).message}`);
  process.exitCode = 1;
}
