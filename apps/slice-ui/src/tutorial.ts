/**
 * The guided opening (R11.1 playtest revision): a small, deterministic set of UI-only steps. It never
 * changes the session; main.ts advances it when the player actually does the step. The suggested
 * block is beside the temporary Guangshen road in the market town (cells 386,376 and 387,376):
 * buildable, in area 1, and fronting the road as a one-cell zone.
 */
import type { Session } from './controller.js';
import type { UiState } from './render.js';
import * as S from './strings.js';
import type { L } from './strings.js';

export const STARTER_CELLS: readonly (readonly [number, number])[] = [[386, 376], [387, 376]];
export const STARTER_FROM: readonly [number, number] = [386, 376];
export const STARTER_TO: readonly [number, number] = [387, 376];

export interface Tutorial {
  step: number;
  title: L;
  body: L;
  target?: string;
  waiting: boolean;
  cells?: readonly (readonly [number, number])[];
  action?: 'start' | 'block' | 'done';
}

const CONTENT: readonly { title: L; body: L }[] = [
  { title: S.T.tut0Title, body: S.T.tut0Body },
  { title: S.T.tut1Title, body: S.T.tut1Body },
  { title: S.T.tut2Title, body: S.T.tut2Body },
  { title: S.T.tut3Title, body: S.T.tut3Body },
  { title: S.T.tut4Title, body: S.T.tut4Body },
  { title: S.T.tut5Title, body: S.T.tut5Body },
];

/** The step shown now. Action steps advance when the state shows the player did them. */
export function tutorialView(x: Session, ui: UiState): Tutorial | undefined {
  if (!ui.tutorial) return undefined;
  let step = ui.tutorialStep;
  const firstPending = x.state.pendingCards.some((c) => c.card === 'event.first_project' && x.answers[c.id] === undefined);
  if (step === 1 && !firstPending) step = 2;                                     // the opening card is answered or gone
  if (step === 2 && ui.tool === 'zone') step = 3;                                // Zones is open
  if (step === 3 && x.queue.some((a) => a.type === 'create_zone')) step = 4;     // a zone is queued
  if (step === 4 && (x.state.turn > 0 || x.mode === 'paused')) step = 5;         // the quarter ended
  const c = CONTENT[Math.min(step, CONTENT.length - 1)]!;
  if (step === 0) return { step, ...c, waiting: false, action: 'start' };
  if (step === 1) return { step, ...c, waiting: true, target: '[data-act=decisions]' };
  if (step === 2) return { step, ...c, waiting: true, target: '[data-tool=zone]' };
  if (step === 3) return { step, ...c, waiting: true, cells: STARTER_CELLS, action: 'block' };
  if (step === 4) return { step, ...c, waiting: true, target: '[data-act=submit]' };
  return { step, ...c, waiting: false, target: '[data-drawer=readiness]', action: 'done' };
}
