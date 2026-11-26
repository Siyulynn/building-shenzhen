/**
 * R12: the main menu (New game, Continue, Load) and the in-game Game menu (Save, Load, Main menu). Pure renderers:
 * HTML strings from the slots and a message; main.ts wires the buttons (data-act) and the storage.
 */
import { formatYM } from '@sz/sim-core';
import type { Session } from './controller.js';
import { pick, type Lang } from './lang.js';
import { esc, renderLangSwitch } from './render.js';
import { canSave, SLOTS, type SlotId, type SlotInfo } from './saves.js';
import { MENU, type L } from './strings.js';

/** A message under the menu: the string, an optional detail (a file name or an error), and whether it is a warning. */
export interface MenuNote { readonly what: L; readonly detail?: string; readonly warn?: boolean }
export type MenuPage = 'home' | 'load';

const tx = (lang: Lang) => (l: L) => esc(pick(l, lang));

function note(lang: Lang, n?: MenuNote): string {
  if (!n) return '';
  return `<div class="${n.warn ? 'err' : 'muted'} menu-note">${tx(lang)(n.what)}${n.detail ? ` · ${esc(n.detail)}` : ''}</div>`;
}

const slotName = (lang: Lang, slot: SlotId) => (slot === 'auto' ? tx(lang)(MENU.auto) : `${tx(lang)(MENU.slot)} ${slot}`);
const slotWhen = (lang: Lang, s: SlotInfo) => `${formatYM(s.date)} · ${tx(lang)(MENU.turnShort)}${s.turn + 1}${tx(lang)(MENU.turnSuffix)}`;

/** One row per slot: its game date, a Load button, and (in game) a Save button. */
function slotRows(lang: Lang, slots: readonly SlotInfo[], saving: boolean, allowSave: boolean): string {
  const t = tx(lang);
  return `<table class="slots">${SLOTS.map((slot) => {
    const s = slots.find((x) => x.slot === slot);
    const save = saving && slot !== 'auto'
      ? `<button data-act="menuSave" data-slot="${slot}" ${allowSave ? '' : 'disabled'}>${t(MENU.save)}</button>` : '';
    const load = s ? `<button data-act="menuLoad" data-slot="${slot}">${t(MENU.load)}</button>` : '';
    const del = s && slot !== 'auto' ? `<button class="minor" data-act="menuDelete" data-slot="${slot}" title="${t(MENU.delete)}">×</button>` : '';
    const when = s ? `${slotWhen(lang, s)}${s.contentMatches ? '' : ' <span class="err">*</span>'}` : `<span class="muted">${t(MENU.empty)}</span>`;
    return `<tr><th>${slotName(lang, slot)}</th><td>${when}</td><td class="slot-acts">${save}${load}${del}</td></tr>`;
  }).join('')}</table>`;
}

const fileRow = (lang: Lang, exporting: boolean, allowSave: boolean) => `<div class="menu-files">
  ${exporting ? `<button data-act="menuExport" ${allowSave ? '' : 'disabled'}>${tx(lang)(MENU.exportFile)}</button>` : ''}
  <button data-act="menuImport">${tx(lang)(MENU.importFile)}</button></div>`;

/** The title screen. */
export function renderMainMenu(lang: Lang, page: MenuPage, slots: readonly SlotInfo[], latest?: SlotInfo, n?: MenuNote): string {
  const t = tx(lang);
  if (page === 'load') {
    return `${renderLangSwitch(lang)}<h1>${t(MENU.load)}</h1>${slotRows(lang, slots, false, false)}
      ${fileRow(lang, false, false)}${note(lang, n)}
      <button class="menu-back" data-act="menuHome">${t(MENU.back)}</button>`;
  }
  return `${renderLangSwitch(lang)}<h1 class="menu-title">${t(MENU.title)}</h1><div class="menu-sub">${t(MENU.subtitle)}</div>
    <div class="menu-buttons">
      <button class="go" data-act="menuNew">${t(MENU.newGame)}</button>
      ${latest ? `<button data-act="menuLoad" data-slot="${latest.slot}">${t(MENU.continue)} · ${slotName(lang, latest.slot)} · ${slotWhen(lang, latest)}</button>` : ''}
      <button data-act="menuLoadPage">${t(MENU.load)}</button>
    </div>${note(lang, n)}`;
}

/** The in-game Game menu: save to a slot or a file, load, or leave for the title screen. */
export function renderGameMenu(lang: Lang, x: Session, slots: readonly SlotInfo[], n?: MenuNote): string {
  const t = tx(lang), ok = canSave(x);
  return `<h1>${t(MENU.game)}</h1>
    ${ok ? '' : `<div class="muted">${t(MENU.saveOnlyAtTurnStart)}</div>`}
    ${slotRows(lang, slots, true, ok)}${fileRow(lang, true, ok)}
    <div class="muted">${t(MENU.autosaveNote)}</div>${note(lang, n)}
    <div class="menu-foot"><button class="go" data-act="gameMenuClose">${t(MENU.resume)}</button>
    <button data-act="menuHome" title="${t(MENU.leaveWarning)}">${t(MENU.mainMenu)}</button></div>`;
}
