/** Loads the slice's content and params from the repository for the tests (sim-core itself does no file IO). */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import {
  compileBuildable, compileEvents, compileFiscal, compileInvestors, compileLeaders, compilePrecedents, compileTargets, createInitialState,
  validateParams,
  type AreasContent, type GameState, type ScenarioContent,
  type StartContent,
} from '../src/index.js';

export const ROOT = resolve(__dirname, '../../..');
const text = (p: string) => readFileSync(join(ROOT, p), 'utf8');
export const sha256 = (t: string) => createHash('sha256').update(t.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

export const areasJson = JSON.parse(text('data/starts/slice_areas.json')) as AreasContent;
export const scenario = parse(text('content/slice/scenario.yaml')) as ScenarioContent;
export const start = parse(text('content/slice/start_1979.yaml')) as StartContent;
const paramsText = text('params/slice.yaml');
export const params = validateParams(parse(paramsText));
const precedentsText = text('content/slice/precedents.yaml');
export const precedents = compilePrecedents(parse(precedentsText), areasJson);
const investorsText = text('content/slice/investors.yaml');
export const investors = compileInvestors(parse(investorsText), params);
const buildableText = text('data/starts/slice_buildable.json');
export const buildable = compileBuildable(JSON.parse(buildableText), areasJson);
const fiscalTexts = ['fiscal_regimes', 'projects', 'teams'].map((f) => text(`content/slice/${f}.yaml`));
export const fiscal = compileFiscal({ regimes: parse(fiscalTexts[0]!), projects: parse(fiscalTexts[1]!), teams: parse(fiscalTexts[2]!) }, params);
const eventsText = text('content/slice/events.yaml');
export const events = compileEvents(parse(eventsText), params, investors, fiscal);
/** M5a's four events alone (§5.7): M5a's tests run on them, so M5b's beats leave their runs as they were. */
export const M5A_EVENTS = ['event.first_processing_contract', 'event.shekou_works', 'event.readiness_check', 'event.sez_established'];
export const eventsM5a = events.filter((d) => M5A_EVENTS.includes(d.id));
const targetsText = text('content/slice/targets.yaml');
export const targets = compileTargets(parse(targetsText));
const leadersText = text('content/slice/leaders.yaml');
export const leaders = compileLeaders(parse(leadersText));
export const content = { areas_sha256: areasJson.areas_sha256, params_sha256: sha256(paramsText),
  precedents_sha256: sha256(precedentsText), investors_sha256: sha256(investorsText), buildable_sha256: sha256(buildableText),
  fiscal_sha256: sha256(fiscalTexts.join('\n---\n')), events_sha256: sha256(eventsText), leaders_sha256: sha256(leadersText),
  targets_sha256: sha256(targetsText) };
export const MONTHS = scenario.turns * scenario.months_per_turn;

export const initial = (): GameState => createInitialState({ scenario, areas: areasJson, start, params });
