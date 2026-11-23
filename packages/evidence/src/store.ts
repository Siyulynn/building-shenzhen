// Loads and checks the whole evidence store. Errors block; warnings are reported.
import { Claim, Conflict, Source } from './schemas.js';
import { loadRecords, type RawRecord } from './load.js';
import type { ZodTypeAny, z } from 'zod';

export interface Located<T> {
  value: T;
  file: string;
}
export interface Store {
  sources: Map<string, Located<Source>>;
  claims: Map<string, Located<Claim>>;
  conflicts: Map<string, Located<Conflict>>;
  errors: string[];
  warnings: string[];
}

function parseAll<S extends ZodTypeAny>(
  schema: S,
  raw: RawRecord[],
  kind: string,
  errors: string[],
): Map<string, Located<z.infer<S>>> {
  const out = new Map<string, Located<z.infer<S>>>();
  for (const r of raw) {
    const res = schema.safeParse(r.data);
    const where = `${r.file}#${r.index}`;
    if (!res.success) {
      for (const issue of res.error.issues) errors.push(`${where}: ${kind} ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      continue;
    }
    const v = res.data as { id: string };
    const prev = out.get(v.id);
    if (prev) errors.push(`${where}: duplicate ${kind} id "${v.id}" (first in ${prev.file})`);
    else out.set(v.id, { value: res.data, file: r.file });
  }
  return out;
}

const isPerson = (by: string) => by.startsWith('person:');

export function loadStore(root: string): Store {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = loadRecords(root, 'data/evidence/sources');
  const c = loadRecords(root, 'data/evidence/claims');
  const k = loadRecords(root, 'data/evidence/conflicts');
  errors.push(...s.parseErrors, ...c.parseErrors, ...k.parseErrors);

  const sources = parseAll(Source, s.records, 'source', errors);
  const claims = parseAll(Claim, c.records, 'claim', errors);
  const conflicts = parseAll(Conflict, k.records, 'conflict', errors);

  for (const { value: src, file } of sources.values()) {
    if (!src.local_copy && src.access === 'open')
      warnings.push(`${file}: source "${src.id}" is pending intake (no hashed local copy)`);
  }

  for (const { value: cl, file } of claims.values()) {
    const at = `${file}: claim "${cl.id}"`;
    const src = cl.source ? sources.get(cl.source)?.value : undefined;
    if (cl.source && !src) errors.push(`${at}: unknown source "${cl.source}"`);
    if (!cl.source && cl.status !== 'lead') errors.push(`${at}: only a lead may have no source`);
    if (cl.status === 'lead' && !cl.source && !cl.origin) errors.push(`${at}: a lead without a source needs an origin`);

    const human = cl.assessments.filter((a) => isPerson(a.by));
    if (cl.status === 'sourced' || cl.status === 'verified') {
      if (!cl.locator) errors.push(`${at}: status ${cl.status} needs a locator`);
      if (!cl.quote) errors.push(`${at}: status ${cl.status} needs a quote`);
      if (src && src.tier === 'E') errors.push(`${at}: a tier-E source can only support a lead`);
      if (src && src.access !== 'open') errors.push(`${at}: source access is "${src.access}", so the claim can only be a lead`);
    }
    if (cl.status === 'verified' && !human.some((a) => a.result === 'pass'))
      errors.push(`${at}: verified needs a passing assessment by a person (AI may not verify)`);
    if ((cl.status === 'rejected' || cl.status === 'superseded') && human.length === 0)
      errors.push(`${at}: ${cl.status} can only be set by a person (add their assessment)`);
    if (cl.status === 'superseded') {
      if (!cl.superseded_by) errors.push(`${at}: superseded needs superseded_by`);
      else if (!claims.has(cl.superseded_by)) errors.push(`${at}: superseded_by "${cl.superseded_by}" not found`);
    }
  }

  for (const { value: cf, file } of conflicts.values()) {
    for (const id of cf.claims) if (!claims.has(id)) errors.push(`${file}: conflict "${cf.id}" lists unknown claim "${id}"`);
    if (cf.status === 'open') warnings.push(`${file}: conflict "${cf.id}" is open`);
  }

  return { sources, claims, conflicts, errors, warnings };
}
