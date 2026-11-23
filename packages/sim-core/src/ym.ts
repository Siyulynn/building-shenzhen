/** Absolute month index: year * 12 + (month - 1) (phase1-slice.md §5.1). Sim code compares and adds these only. */
export type YM = number;

/** Parse a content month, `YYYY-MM`. */
export function parseYM(text: string): YM {
  const m = /^(\d{4})-(\d{2})$/.exec(text);
  if (!m) throw new Error(`not a YYYY-MM month: ${text}`);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`month out of range: ${text}`);
  return Number(m[1]) * 12 + (month - 1);
}

/** For display, logs and ids only: never branch on the result (PLAN §6.2 rule 3). */
export function formatYM(t: YM): string {
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
