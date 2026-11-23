import type { Store } from './store.js';
import { ClaimStatus } from './schemas.js';

export function statusReport(store: Store): string {
  const claims = [...store.claims.values()].map((c) => c.value);
  const lines: string[] = [];
  lines.push(`Sources: ${store.sources.size}   Claims: ${claims.length}   Conflicts: ${store.conflicts.size}`);
  lines.push('');
  lines.push('Claims by status:');
  for (const s of ClaimStatus.options) lines.push(`  ${s.padEnd(11)} ${claims.filter((c) => c.status === s).length}`);

  const byTier = new Map<string, number>();
  for (const { value: s } of store.sources.values()) byTier.set(s.tier, (byTier.get(s.tier) ?? 0) + 1);
  lines.push('', 'Sources by tier: ' + [...byTier].sort().map(([t, n]) => `${t}=${n}`).join('  '));
  const pending = [...store.sources.values()].filter((s) => !s.value.local_copy).length;
  lines.push(`Sources pending intake (no hashed copy): ${pending}`);

  const leads = claims.filter((c) => c.status === 'lead');
  lines.push('', `Open leads (${leads.length}):`);
  for (const c of leads) lines.push(`  ${c.id}${c.log_row ? ` [${c.log_row}]` : ''}${c.notes ? `: ${c.notes}` : ''}`);

  const awaiting = claims.filter((c) => c.status === 'sourced');
  lines.push('', `Awaiting a person's sign-off (sourced): ${awaiting.length}`);

  const open = [...store.conflicts.values()].filter((c) => c.value.status === 'open');
  lines.push('', `Open conflicts (${open.length}):`);
  for (const { value: c } of open) lines.push(`  ${c.id}: ${c.subject}`);
  return lines.join('\n');
}
