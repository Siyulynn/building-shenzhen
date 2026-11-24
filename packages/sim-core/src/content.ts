/**
 * One way to load the slice (phase1-slice.md §5.9): the tests, the CLI and the UI compose the same content.
 * Pure: the caller reads the files, parses YAML and hashes; sim-core does no IO and imports no parser or hash.
 */
import { compileEvents, type EventContent } from './events.js';
import { compileFiscal } from './fiscal.js';
import { compileBuildable, compileInvestors, type BuildableContent } from './investors.js';
import { validateParams, type SliceParams } from './params.js';
import type { SaveContent } from './save.js';
import { compileLeaders, type AreasContent, type LeaderContent, type ScenarioContent, type StartContent } from './state.js';
import { compileTargets } from './systems/reviews.js';
import type { TickContent } from './ticks.js';
import { compilePrecedents } from './zones.js';

/** The repo-relative path of every file the slice reads. */
export const SLICE_FILES = Object.freeze({
  areas: 'data/starts/slice_areas.json',
  buildable: 'data/starts/slice_buildable.json',
  scenario: 'content/slice/scenario.yaml',
  start: 'content/slice/start_1979.yaml',
  params: 'params/slice.yaml',
  precedents: 'content/slice/precedents.yaml',
  investors: 'content/slice/investors.yaml',
  regimes: 'content/slice/fiscal_regimes.yaml',
  projects: 'content/slice/projects.yaml',
  teams: 'content/slice/teams.yaml',
  events: 'content/slice/events.yaml',
  targets: 'content/slice/targets.yaml',
  leaders: 'content/slice/leaders.yaml',
});
export type SliceFile = keyof typeof SLICE_FILES;

export interface InitialContent {
  scenario: ScenarioContent; areas: AreasContent; start: StartContent; params: SliceParams; leaders: readonly LeaderContent[];
}
export interface Slice {
  init: InitialContent;                  // createInitialState's input
  tick: TickContent & { events: EventContent };   // createTickSteps' content, all of it
  params: SliceParams;
  content: SaveContent;                  // the save header's hashes (§5.1)
}

/**
 * Compile the whole slice. `read(path)` gives a file's text, `parse` is a YAML parser, and `hash(text)` a sha256 hex
 * digest; texts are hashed with LF line endings, so a checkout's line endings never change a hash.
 */
export function compileSlice(read: (path: string) => string, parse: (text: string) => unknown,
  hash: (text: string) => string): Slice {
  const text: Record<SliceFile, string> = Object.fromEntries(
    Object.entries(SLICE_FILES).map(([k, path]) => [k, read(path).replace(/\r\n/g, '\n')])) as Record<SliceFile, string>;
  const areas = JSON.parse(text.areas) as AreasContent;
  const params = validateParams(parse(text.params));
  const precedents = compilePrecedents(parse(text.precedents), areas);
  const investors = compileInvestors(parse(text.investors), params);
  const buildable = compileBuildable(JSON.parse(text.buildable) as BuildableContent, areas);
  const fiscal = compileFiscal({ regimes: parse(text.regimes), projects: parse(text.projects), teams: parse(text.teams) }, params);
  const events = compileEvents(parse(text.events), params, investors, fiscal);
  const targets = compileTargets(parse(text.targets));
  const leaders = compileLeaders(parse(text.leaders));
  return {
    init: { scenario: parse(text.scenario) as ScenarioContent, areas, start: parse(text.start) as StartContent, params, leaders },
    tick: { precedents, investors, buildable, fiscal, events, targets },
    params,
    content: {
      areas_sha256: areas.areas_sha256, params_sha256: hash(text.params), precedents_sha256: hash(text.precedents),
      investors_sha256: hash(text.investors), buildable_sha256: hash(text.buildable),
      fiscal_sha256: hash([text.regimes, text.projects, text.teams].join('\n---\n')),
      events_sha256: hash(text.events), leaders_sha256: hash(text.leaders), targets_sha256: hash(text.targets),
    },
  };
}
