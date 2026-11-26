/**
 * Saving and loading a session (R12). A save is taken at a turn's start: the sim's own save (sim-core saveGame, the
 * state and the run's Rng) plus the UI-side choices not yet sent (card answers and queued turn actions). Loading
 * rebuilds the session from it, so End turn after a load gives exactly what it would have given before the save.
 *
 * Slots live in the browser's localStorage (three slots and an autosave); a save can also be exported to and
 * imported from a file. The wall-clock time on a slot is a label for the player only; the sim never reads it.
 */
import {
  createTickSteps, isFinished, loadGame, saveFromJson, saveGame, saveToJson,
  type GameState, type PlayerAction, type SaveContent, type Slice,
} from '@sz/sim-core';
import type { Session } from './controller.js';

export const UI_SAVE_FORMAT = 'sz-slice-ui-save';
export const UI_SAVE_VERSION = 1;
export const SLOTS = ['auto', '1', '2', '3'] as const;
export type SlotId = (typeof SLOTS)[number];
const KEY = 'sz-slice-saves-v1';

/** The file and slot body: the sim save as its canonical JSON text, and the unsent choices. */
interface UiSave {
  format: typeof UI_SAVE_FORMAT; version: number;
  seed: number;
  sim: string;                                        // saveToJson(saveGame(state, rng, content))
  answers: Record<string, string>;
  queue: PlayerAction[];
}

/** What a slot list shows: no state, just enough to choose. */
export interface SlotInfo { slot: SlotId; date: number; turn: number; savedAt: string; contentMatches: boolean }

/** Saving is possible only at a turn's start: mid-quarter the state is not a turn boundary, and a finished run has no next turn. */
export const canSave = (x: Session): boolean => x.mode === 'turn';

export function sessionToSave(x: Session): string {
  if (!canSave(x)) throw new Error('a game can be saved only at the start of a turn');
  const body: UiSave = {
    format: UI_SAVE_FORMAT, version: UI_SAVE_VERSION, seed: x.seed,
    sim: saveToJson(saveGame(x.state, x.rng, x.slice.content)),
    answers: { ...x.answers }, queue: [...x.queue],
  };
  return JSON.stringify(body);
}

const sameContent = (a: SaveContent, b: SaveContent) =>
  (Object.keys(b) as (keyof SaveContent)[]).every((k) => a[k] === b[k]);

/**
 * Rebuild a session. Throws on a file that is not a slice save. A save made with other content still loads (the
 * migration handles older save versions); `contentMatches` says so, and the caller warns the player.
 */
export function sessionFromSave(slice: Slice, text: string): { session: Session; contentMatches: boolean } {
  let d: UiSave;
  try { d = JSON.parse(text) as UiSave; } catch { throw new Error('not a save file'); }
  if (d?.format !== UI_SAVE_FORMAT) throw new Error('not a save file');
  if (d.version > UI_SAVE_VERSION) throw new Error(`save file version ${d.version} is newer than ${UI_SAVE_VERSION}`);
  const sim = saveFromJson(d.sim);
  const { state, rng } = loadGame(sim, { events: slice.tick.events });
  const known = new Set(state.pendingCards.map((c) => c.id));
  const answers = Object.fromEntries(Object.entries(d.answers ?? {}).filter(([id]) => known.has(id)));
  const mode = isFinished(state) && !state.pendingCards.some((c) => c.interrupting) ? 'over' : 'turn';
  const session: Session = { slice, steps: createTickSteps(slice.params, slice.tick), seed: d.seed, rng, state, mode,
    turnStart: state, answers, queue: d.queue ?? [] };
  return { session, contentMatches: sameContent(sim.header.content, slice.content) };
}

/** The slot table in storage. Every access is guarded: storage can be missing, full or blocked. */
interface StoredSlot { savedAt: string; date: number; turn: number; content: SaveContent; text: string }
type Table = Partial<Record<SlotId, StoredSlot>>;

function readTable(storage: () => Storage): Table {
  try { return JSON.parse(storage().getItem(KEY) ?? '{}') as Table; } catch { return {}; }
}

export function listSlots(slice: Slice, storage: () => Storage = () => localStorage): SlotInfo[] {
  const t = readTable(storage);
  return SLOTS.flatMap((slot) => {
    const s = t[slot];
    return s ? [{ slot, date: s.date, turn: s.turn, savedAt: s.savedAt, contentMatches: sameContent(s.content, slice.content) }] : [];
  });
}

/** Write a slot. Returns false when storage refused it (full, blocked, private mode). */
export function writeSlot(x: Session, slot: SlotId, savedAt: string, storage: () => Storage = () => localStorage): boolean {
  const text = sessionToSave(x);
  const t = readTable(storage);
  t[slot] = { savedAt, date: x.state.date, turn: x.state.turn, content: { ...x.slice.content }, text };
  try { storage().setItem(KEY, JSON.stringify(t)); return true; } catch { return false; }
}

export function readSlot(slot: SlotId, storage: () => Storage = () => localStorage): string | undefined {
  return readTable(storage)[slot]?.text;
}

export function deleteSlot(slot: SlotId, storage: () => Storage = () => localStorage): void {
  const t = readTable(storage);
  delete t[slot];
  try { storage().setItem(KEY, JSON.stringify(t)); } catch { /* nothing to do */ }
}

/** The most recent slot, for Continue. */
export function latestSlot(slice: Slice, storage: () => Storage = () => localStorage): SlotInfo | undefined {
  return [...listSlots(slice, storage)].sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0))[0];
}

/** A file name for an export: the game date and turn, never the wall clock. */
export const exportName = (s: GameState) => `shenzhen-${Math.floor(s.date / 12)}-${String((s.date % 12) + 1).padStart(2, '0')}-turn${s.turn + 1}.json`;

