// Резервная копия, обмен расписанием и загрузка из файла.

import { isoOf, todayE } from './dates';
import { D, S, normalize, setData } from './store';
import type { Data } from './types';

/** Отдаёт файл пользователю: через системное «Поделиться», а где его нет — обычной загрузкой. */
export async function shareFile(name: string, text: string, type: string): Promise<boolean> {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return true;
    }
  } catch (e) {
    if (e && (e as Error).name === 'AbortError') return false;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return true;
}

export function fullBackup(): { name: string; text: string } {
  const copy = Object.assign({}, D, { kind: 'full', settings: Object.assign({}, D.settings) });
  return { name: `StuStu-копия-${isoOf(todayE())}.json`, text: JSON.stringify(copy, null, 1) };
}
export function scheduleExport(): { name: string; text: string } {
  const s = S();
  const o = {
    app: 'StuStu', version: 2, kind: 'schedule',
    settings: { cycleWeeks: s.cycleWeeks, anchorMonday: s.anchorMonday, weekNames: s.weekNames, showSaturday: s.showSaturday, showSunday: s.showSunday },
    subjects: D.subjects, bells: D.bells, lessons: D.lessons, holidays: D.holidays,
  };
  return { name: `StuStu-расписание-${isoOf(todayE())}.json`, text: JSON.stringify(o, null, 1) };
}

export interface Parsed { kind: 'schedule' | 'full'; raw: any; summary: string }
/** Разбирает файл. Возвращает null, если это не файл StuStu. */
export function parseImport(text: string): Parsed | null {
  let o: any;
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || typeof o !== 'object' || (o.app !== 'StuStu' && !Array.isArray(o.lessons))) return null;
  const n = (k: string) => (Array.isArray(o[k]) ? o[k].length : 0);
  const kind = o.kind === 'schedule' ? 'schedule' : 'full';
  const summary = `Предметов: ${n('subjects')}, пар: ${n('lessons')}` +
    (kind === 'schedule' ? '' : `, ДЗ: ${n('homework')}, событий: ${n('events')}, заметок: ${n('notes')}`);
  return { kind, raw: o, summary };
}
export const isEmptyData = (): boolean => !D.lessons.length && !D.homework.length && !D.events.length;

/** Заменяет только расписание: предметы, пары, звонки и каникулы. ДЗ, экзамены и заметки остаются. */
export function applySchedule(o: any): void {
  const n = normalize(Object.assign({}, o, { settings: Object.assign({}, D.settings, o.settings || {}) }));
  Object.assign(D, { subjects: n.subjects, bells: n.bells, lessons: n.lessons, holidays: n.holidays, cancels: [] });
  Object.assign(D.settings, {
    cycleWeeks: n.settings.cycleWeeks, anchorMonday: n.settings.anchorMonday, weekNames: n.settings.weekNames,
    showSaturday: n.settings.showSaturday, showSunday: n.settings.showSunday,
  });
  D.nextId = Math.max(D.nextId, n.nextId);
}
/** Заменяет все данные содержимым файла. */
export function applyFull(o: any): Data {
  const prev = D.settings;
  const n = normalize(o);
  if (!o.settings || o.settings.attStart == null) n.settings.attStart = todayE();
  if (!o.settings || o.settings.hwDefaultMin == null) { n.settings.hwDefaultMin = prev.hwDefaultMin; n.settings.busyMin = prev.busyMin; }
  if (!o.settings || o.settings.theme == null) n.settings.theme = prev.theme;
  n.settings.lastBackup = Math.max(prev.lastBackup || 0, n.settings.lastBackup || 0);
  n.settings.installHintOff = prev.installHintOff || n.settings.installHintOff;
  setData(n);
  return n;
}
