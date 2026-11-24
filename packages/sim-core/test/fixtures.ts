/** Loads the slice's content and params from the repository for the tests (sim-core itself does no file IO). */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { compileSlice, createInitialState, type GameState } from '../src/index.js';

export const ROOT = resolve(__dirname, '../../..');
export const sha256 = (t: string) => createHash('sha256').update(t.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
export const readRepo = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** The slice as the CLI and the UI load it (§5.9). */
export const slice = compileSlice(readRepo, parse, sha256);
export const areasJson = slice.init.areas;
export const scenario = slice.init.scenario;
export const start = slice.init.start;
export const params = slice.params;
export const precedents = slice.tick.precedents!;
export const investors = slice.tick.investors!;
export const buildable = slice.tick.buildable!;
export const fiscal = slice.tick.fiscal!;
export const events = slice.tick.events;
/** M5a's four events alone (§5.7): M5a's tests run on them, so M5b's beats leave their runs as they were. */
export const M5A_EVENTS = ['event.first_processing_contract', 'event.shekou_works', 'event.readiness_check', 'event.sez_established'];
export const eventsM5a = events.filter((d) => M5A_EVENTS.includes(d.id));
export const targets = slice.tick.targets!;
export const leaders = slice.init.leaders;
export const content = slice.content;
export const MONTHS = scenario.turns * scenario.months_per_turn;

export const initial = (): GameState => createInitialState({ scenario, areas: areasJson, start, params });
