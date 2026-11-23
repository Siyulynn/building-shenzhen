import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';

export interface RawRecord {
  file: string; // path relative to the repo root
  index: number; // position inside the file (files may hold a list)
  data: unknown;
}

export function listYaml(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listYaml(p));
    else if (/\.ya?ml$/.test(name)) out.push(p);
  }
  return out;
}

/** Reads every YAML file under dir. A file may hold one record or a list of records. */
export function loadRecords(root: string, dir: string): { records: RawRecord[]; parseErrors: string[] } {
  const records: RawRecord[] = [];
  const parseErrors: string[] = [];
  for (const path of listYaml(join(root, dir))) {
    const file = relative(root, path).replaceAll('\\', '/');
    let doc: unknown;
    try {
      doc = parse(readFileSync(path, 'utf8'));
    } catch (e) {
      parseErrors.push(`${file}: YAML parse error: ${(e as Error).message}`);
      continue;
    }
    if (doc == null) continue;
    const list = Array.isArray(doc) ? doc : [doc];
    list.forEach((data, index) => records.push({ file, index, data }));
  }
  return { records, parseErrors };
}
