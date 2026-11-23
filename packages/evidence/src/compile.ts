// evidence:compile. Draft mode (Phases 0–2) tags shortfalls [UNVERIFIED]; strict mode fails on them (protocol §4, §9).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRecords } from './load.js';
import { MIN_STATUS, USES, meetsMinimum, type Use } from './schemas.js';
import type { Store } from './store.js';

export type Mode = 'draft' | 'strict';

export interface UsageLink {
  claim: string;
  use: Use;
  usedBy: string; // file#record-id
  status: string | null;
  meetsMinimum: boolean;
}
export interface CompileResult {
  mode: Mode;
  links: UsageLink[];
  errors: string[]; // block in both modes
  shortfalls: UsageLink[]; // block only in strict mode
}

/**
 * Content cites claims as `claims: [<id> | { id, use }]` on any record with an `id`.
 * A bare id takes the record's `use` field, or `encyclopedia` when there is none.
 */
export function collectUsages(root: string, contentDir = 'content'): { links: Omit<UsageLink, 'status' | 'meetsMinimum'>[]; errors: string[] } {
  const { records, parseErrors } = loadRecords(root, contentDir);
  const errors = [...parseErrors];
  const links: Omit<UsageLink, 'status' | 'meetsMinimum'>[] = [];
  for (const r of records) {
    const rec = r.data as Record<string, unknown> | null;
    if (!rec || typeof rec !== 'object' || !('claims' in rec)) continue;
    const usedBy = `${r.file}#${String(rec.id ?? r.index)}`;
    const defaultUse = (rec.use as string | undefined) ?? 'encyclopedia';
    const cited = rec.claims;
    if (!Array.isArray(cited)) {
      errors.push(`${usedBy}: claims must be a list`);
      continue;
    }
    for (const c of cited) {
      const claim = typeof c === 'string' ? c : (c as { id?: string })?.id;
      const use = (typeof c === 'string' ? defaultUse : ((c as { use?: string }).use ?? defaultUse)) as Use;
      if (!claim) errors.push(`${usedBy}: a claims entry has no id`);
      else if (!USES.includes(use)) errors.push(`${usedBy}: unknown use "${use}" (known: ${USES.join(', ')})`);
      else links.push({ claim, use, usedBy });
    }
  }
  return { links, errors };
}

export function compile(root: string, store: Store, mode: Mode, outDir = 'build/evidence'): CompileResult {
  const errors = [...store.errors];
  const usage = collectUsages(root);
  errors.push(...usage.errors);

  const links: UsageLink[] = usage.links.map((l) => {
    const cl = store.claims.get(l.claim)?.value;
    if (!cl) {
      errors.push(`${l.usedBy}: cites unknown claim "${l.claim}"`);
      return { ...l, status: null, meetsMinimum: false };
    }
    if (cl.status === 'rejected' || cl.status === 'superseded')
      errors.push(`${l.usedBy}: cites ${cl.status} claim "${l.claim}"`);
    return { ...l, status: cl.status, meetsMinimum: meetsMinimum(cl.status, l.use) };
  });
  const shortfalls = links.filter((l) => l.status !== null && !l.meetsMinimum);

  if (errors.length === 0 && (mode === 'draft' || shortfalls.length === 0)) {
    const claims = Object.fromEntries(
      [...store.claims.values()].map(({ value: c }) => {
        const uses = links.filter((l) => l.claim === c.id);
        const unverified = c.status !== 'verified';
        return [
          c.id,
          {
            value: c.value ?? null,
            unit: c.unit ?? null,
            date: c.date ?? null,
            status: c.status,
            tag: unverified ? '[UNVERIFIED]' : null,
            source: c.source ?? null,
            uses: uses.map((u) => ({ use: u.use, usedBy: u.usedBy, meetsMinimum: u.meetsMinimum })),
          },
        ];
      }),
    );
    const dir = join(root, outDir);
    mkdirSync(dir, { recursive: true });
    // Build mode is recorded so Historical mode, calibration and release builds can refuse draft output.
    writeFileSync(join(dir, 'claims.json'), JSON.stringify({ mode, minStatus: MIN_STATUS, claims }, null, 2));
    writeFileSync(join(dir, 'usage-links.json'), JSON.stringify(links, null, 2));
  }
  return { mode, links, errors, shortfalls };
}
