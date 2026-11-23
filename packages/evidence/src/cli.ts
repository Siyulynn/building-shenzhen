import { resolve } from 'node:path';
import { loadStore } from './store.js';
import { compile } from './compile.js';
import { statusReport } from './status.js';

const root = resolve(process.env.EVIDENCE_ROOT ?? process.cwd());
const [cmd, ...flags] = process.argv.slice(2);
const store = loadStore(root);

function printList(title: string, items: string[]) {
  if (items.length === 0) return;
  console.log(`${title} (${items.length}):`);
  for (const i of items) console.log(`  ${i}`);
}

switch (cmd) {
  case 'validate': {
    printList('Errors', store.errors);
    printList('Warnings', store.warnings);
    console.log(store.errors.length ? 'evidence:validate FAILED' : `evidence:validate ok (${store.claims.size} claims, ${store.sources.size} sources)`);
    process.exitCode = store.errors.length ? 1 : 0;
    break;
  }
  case 'status':
    console.log(statusReport(store));
    break;
  case 'compile': {
    const mode = flags.includes('--strict') ? 'strict' : 'draft';
    const r = compile(root, store, mode);
    printList('Errors', r.errors);
    printList(
      mode === 'strict' ? 'Below minimum status' : 'Tagged [UNVERIFIED] (below minimum status)',
      r.shortfalls.map((s) => `${s.usedBy} → ${s.claim} (${s.status}, ${s.use} needs more)`),
    );
    const failed = r.errors.length > 0 || (mode === 'strict' && r.shortfalls.length > 0);
    console.log(failed ? `evidence:compile (${mode}) FAILED` : `evidence:compile (${mode}) ok: ${r.links.length} usage links → build/evidence/`);
    process.exitCode = failed ? 1 : 0;
    break;
  }
  default:
    console.log('usage: cli.ts validate | status | compile [--draft|--strict]');
    process.exitCode = 2;
}
