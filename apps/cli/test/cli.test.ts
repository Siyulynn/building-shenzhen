/**
 * The CLI's tests (phase1-slice.md §5.9): the golden runs match their files, the same arguments give the same
 * run.json bytes, and the report names every band.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { crossRunChecks, isBand } from '@sz/sim-core';
import { reportHtml } from '../src/report.js';
import {
  GOLDEN_POLICIES, ROOT, analyse, goldenPath, goldenSummary, goldenText, loadBands, loadClaims, loadSlice, runJson,
} from '../src/slice.js';

const slice = loadSlice();

describe('M6a: the golden runs', () => {
  const summaries = GOLDEN_POLICIES.map((p) => goldenSummary(slice, p));
  it.each(GOLDEN_POLICIES.map((p, k) => [p, k] as const))('%s, seed 1 matches its file', (policy, k) => {
    const file = readFileSync(join(ROOT, goldenPath(policy)), 'utf8').replace(/\r\n/g, '\n');
    // on a mismatch: npm run golden:update, and say what moved and why in the commit (AGENTS.md)
    expect(goldenText(summaries[k]!)).toBe(file);
  });
  it('the policies end differently (criterion 1), and the cross-run readiness check is decided', () => {
    const x = crossRunChecks(summaries);
    expect(x.responds).toBe(true);
    expect(['pass', 'fail', 'not_checkable']).toContain(x.readinessMovesWave);
  });
});

describe('M6a: the CLI', () => {
  const claims = loadClaims(), bands = loadBands();
  const o = { policy: 'aggressive', seed: 1, quarters: slice.init.scenario.turns };
  const first = analyse(slice, o, claims, bands).a;
  it('the same arguments give a byte-identical run.json', () => {
    expect(runJson(analyse(slice, o, claims, bands).a)).toBe(runJson(first));
  });
  it('checks criteria 1–5 and the report names every band', () => {
    const c = first.checks;
    expect(c.c1.reachedVisit).toBe(true);
    expect(c.c4.turns.length).toBe(6);
    expect(c.c2.years.length).toBe(4);
    const ids = [...bands.snapshot, ...bands.checkpoint].filter(isBand).map((b) => b.id);
    expect(c.c3.bands.map((b) => b.id)).toEqual(ids);
    const html = reportHtml(first, 123);
    for (const id of ids) expect(html).toContain(id);
    expect(html).toContain('[UNVERIFIED]');
  });
});
