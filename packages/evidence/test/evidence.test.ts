import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadStore, compile, meetsMinimum } from '../src/index.js';

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'evidence-'));
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

const SOURCE = `id: src_a
title: A gazette page
tier: A
reuse: public_domain
url: https://example.org/a
`;
const sourced = (id: string, extra = '') => `- id: ${id}
  source: src_a
  locator: para 1
  quote: "x"
  value: 1
  status: sourced
  extracted_by: ai:test
${extra}`;

describe('minimum status', () => {
  it('ranks statuses per use', () => {
    expect(meetsMinimum('sourced', 'encyclopedia')).toBe(true);
    expect(meetsMinimum('sourced', 'calibration_target')).toBe(false);
    expect(meetsMinimum('verified', 'fiscal_rule')).toBe(true);
    expect(meetsMinimum('lead', 'encyclopedia')).toBe(false);
    expect(meetsMinimum('lead', 'design_note')).toBe(true);
    expect(meetsMinimum('rejected', 'design_note')).toBe(false);
  });
});

describe('validation', () => {
  it('accepts a well-formed sourced claim', () => {
    const root = fixture({ 'data/evidence/sources/a.yaml': SOURCE, 'data/evidence/claims/c.yaml': sourced('c.one') });
    expect(loadStore(root).errors).toEqual([]);
  });

  it('rejects a sourced claim without a quote, and an unknown source', () => {
    const root = fixture({
      'data/evidence/sources/a.yaml': SOURCE,
      'data/evidence/claims/c.yaml': `- { id: c.noquote, source: src_a, locator: p1, status: sourced }
- { id: c.badsrc, source: nope, status: lead }`,
    });
    const errs = loadStore(root).errors.join('\n');
    expect(errs).toMatch(/c\.noquote.*needs a quote/);
    expect(errs).toMatch(/c\.badsrc.*unknown source/);
  });

  it('refuses verified without a person, so AI cannot verify', () => {
    const root = fixture({
      'data/evidence/sources/a.yaml': SOURCE,
      'data/evidence/claims/c.yaml': `- id: c.v
  source: src_a
  locator: p1
  quote: "x"
  status: verified
  assessments: [{ by: "ai:checker", date: 2026-11-23, method: reread, result: pass }]`,
    });
    expect(loadStore(root).errors.join('\n')).toMatch(/AI may not verify/);
  });

  it('accepts verified with a person sign-off', () => {
    const root = fixture({
      'data/evidence/sources/a.yaml': SOURCE,
      'data/evidence/claims/c.yaml': sourced('c.v').replace('status: sourced', 'status: verified') +
        `  assessments: [{ by: "person:reviewer", date: 2026-11-23, method: reread source, result: pass }]\n`,
    });
    expect(loadStore(root).errors).toEqual([]);
  });

  it('limits tier-E and unreachable sources to leads, and flags duplicates', () => {
    const root = fixture({
      'data/evidence/sources/e.yaml': `- { id: src_e, title: search hit, tier: E, reuse: unknown }
- { id: src_w, title: walled, tier: D, reuse: unknown, access: login_wall }`,
      'data/evidence/claims/c.yaml': `- { id: c.e, source: src_e, locator: l, quote: q, status: sourced }
- { id: c.w, source: src_w, locator: l, quote: q, status: sourced }
- { id: c.e, source: src_e, status: lead }`,
    });
    const errs = loadStore(root).errors.join('\n');
    expect(errs).toMatch(/c\.e.*tier-E/);
    expect(errs).toMatch(/c\.w.*login_wall/);
    expect(errs).toMatch(/duplicate claim id "c\.e"/);
  });

  it('checks conflict references', () => {
    const root = fixture({
      'data/evidence/sources/a.yaml': SOURCE,
      'data/evidence/claims/c.yaml': sourced('c.one'),
      'data/evidence/conflicts/k.yaml': `id: k.one\nsubject: s\nclaims: [c.one, c.missing]\nstatus: open\n`,
    });
    expect(loadStore(root).errors.join('\n')).toMatch(/unknown claim "c\.missing"/);
  });
});

describe('compile', () => {
  const files = {
    'data/evidence/sources/a.yaml': SOURCE,
    'data/evidence/claims/c.yaml': sourced('c.one'),
    'content/events/e.yaml': `- id: ev.one\n  use: anchor_date\n  claims: [c.one]\n- id: ev.two\n  claims: [{ id: c.one, use: encyclopedia }]\n`,
  };

  it('draft mode tags shortfalls and still writes output', () => {
    const root = fixture(files);
    const r = compile(root, loadStore(root), 'draft');
    expect(r.errors).toEqual([]);
    expect(r.shortfalls.map((s) => s.usedBy)).toEqual(['content/events/e.yaml#ev.one']);
    const out = JSON.parse(readFileSync(join(root, 'build/evidence/claims.json'), 'utf8'));
    expect(out.mode).toBe('draft');
    expect(out.claims['c.one'].tag).toBe('[UNVERIFIED]');
  });

  it('strict mode fails on shortfalls and writes nothing', () => {
    const root = fixture(files);
    const r = compile(root, loadStore(root), 'strict');
    expect(r.shortfalls).toHaveLength(1);
    expect(existsSync(join(root, 'build/evidence/claims.json'))).toBe(false);
  });

  it('unknown claims and unknown uses are errors in both modes', () => {
    const root = fixture({
      ...files,
      'content/events/bad.yaml': `- id: ev.bad\n  claims: [c.nope, { id: c.one, use: vibes }]\n`,
    });
    const r = compile(root, loadStore(root), 'draft');
    expect(r.errors.join('\n')).toMatch(/unknown claim "c\.nope"/);
    expect(r.errors.join('\n')).toMatch(/unknown use "vibes"/);
  });
});

describe('the repository evidence store', () => {
  it('validates with no errors', () => {
    const store = loadStore(resolve(__dirname, '../../..'));
    expect(store.errors).toEqual([]);
    expect(store.claims.size).toBeGreaterThan(0);
  }, 30_000);
});
