/// <reference types="vite/client" />
/**
 * The slice in the browser (phase1-slice.md §11.1): every SLICE_FILES path imported as raw text by Vite, then the same
 * compileSlice as the CLI and the tests, with the yaml parser and a pure-JS sha256.
 */
import { parse } from 'yaml';
import { SLICE_FILES, compileSlice, type Slice } from '@sz/sim-core';
import { sha256 } from './sha256.js';

const PREFIX = '../../../';
const globbed: Record<string, string> = {
  ...import.meta.glob('../../../content/slice/*.yaml', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../../../params/slice.yaml', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../../../data/starts/*.json', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>;

/** The repository's texts by repo-relative path, as the bundle holds them. */
export const RAW: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(
  Object.entries(globbed).map(([k, v]) => [k.startsWith(PREFIX) ? k.slice(PREFIX.length) : k, v])));

export function readBundled(path: string): string {
  const t = RAW[path];
  if (t === undefined) throw new Error(`the bundle has no ${path}`);
  return t;
}

export const loadSlice = (): Slice => compileSlice(readBundled, parse, sha256);
export const BUNDLED_FILES = Object.values(SLICE_FILES);
