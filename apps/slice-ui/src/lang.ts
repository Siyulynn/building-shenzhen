/**
 * The UI's language (phase1-slice.md §11.1): English or Simplified Chinese, a display choice only. Content and the
 * views keep both; the renderers pick one. The URL's ?lang wins, then the viewer's stored choice, then English.
 */
import type { LocalizedString } from '@sz/sim-core';

export type Lang = 'en' | 'zh';
export const LANGS: readonly Lang[] = ['en', 'zh'];
export const DEFAULT_LANG: Lang = 'en';
export const STORAGE_KEY = 'sz.slice-ui.lang';
/** Each language named in its own script, for the switch. */
export const LANG_NAME: Readonly<Record<Lang, string>> = { en: 'English', zh: '中文' };
/** The `<html lang>` value. */
export const HTML_LANG: Readonly<Record<Lang, string>> = { en: 'en', zh: 'zh-Hans' };

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'zh';

/** The language to show: `?lang=` in the URL's query, else the stored choice, else English. */
export function resolveLang(search: string, stored: string | null | undefined): Lang {
  const q = new URLSearchParams(search).get('lang');
  if (isLang(q)) return q;
  return isLang(stored) ? stored : DEFAULT_LANG;
}

/** One language of a localized string. */
export const pick = (l: LocalizedString, lang: Lang): string => l[lang];

/** The viewer's stored choice, or null when there is none or storage is unavailable. */
export function readStoredLang(storage: () => Storage = () => localStorage): string | null {
  try { return storage().getItem(STORAGE_KEY); } catch { return null; }
}
export function storeLang(lang: Lang, storage: () => Storage = () => localStorage): void {
  try { storage().setItem(STORAGE_KEY, lang); } catch { /* storage blocked: the choice lasts this page only */ }
}

/** The query with ?lang set, other parameters (?seed) kept. */
export function withLang(search: string, lang: Lang): string {
  const q = new URLSearchParams(search);
  q.set('lang', lang);
  return `?${q.toString()}`;
}
