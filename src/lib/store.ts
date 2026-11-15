import { ATT, ATTACH, KIND, TYPES, UNI_BELLS } from './consts';
import { mondayOf, todayE } from './dates';
import type { AttMark, Data, Settings } from './types';

export const LS_KEY = 'stustu_data_v2';

export function defSettings(): Settings {
  return {
    cycleWeeks: 2, anchorMonday: mondayOf(todayE()), weekNames: [], showSaturday: true, showSunday: false,
    digestOn: true, digestTime: 1140, lessonRemindOn: true, lessonRemindMin: 10, hwRemindDays: 1, examRemindDays: 3,
    theme: 0, hwDefaultMin: 30, busyMin: 120, attStart: todayE(), lastBackup: 0, installHintOff: false,
  };
}

const num = (v: unknown, d: number): number =>
  typeof v === 'number' && isFinite(v) ? v : v != null && v !== '' && isFinite(+(v as string)) ? +(v as string) : d;
const str = (v: unknown): string => (v == null ? '' : String(v));

/** Приводит любые входные данные (в том числе копию из версии 2.0) к правильному виду. */
export function normalize(input: unknown): Data {
  const o: any = input && typeof input === 'object' ? input : {};
  const s: Settings = Object.assign(defSettings(), o.settings || {});
  s.cycleWeeks = Math.min(4, Math.max(1, num(s.cycleWeeks, 2)));
  s.weekNames = Array.isArray(s.weekNames) ? s.weekNames.map(str) : [];
  s.installHintOff = !!s.installHintOff;
  const arr = (k: string): any[] => (Array.isArray(o[k]) ? o[k].filter((x: unknown) => x && typeof x === 'object') : []);
  const d: Data = {
    app: 'StuStu', version: 2, nextId: num(o.nextId, 1), settings: s,
    subjects: arr('subjects').map(x => ({ id: num(x.id, 0), name: str(x.name), teacher: str(x.teacher), color: num(x.color, 0) })),
    bells: arr('bells').map(x => ({ start: num(x.start, 0), end: num(x.end, 0) })),
    lessons: arr('lessons').map(x => ({
      id: num(x.id, 0), subjectId: num(x.subjectId, -1), type: x.type in TYPES ? x.type : 'OTHER', room: str(x.room), teacher: str(x.teacher),
      week: num(x.week, -1), day: Math.min(7, Math.max(1, num(x.day, 1))), bell: num(x.bell, 1),
      customStart: num(x.customStart, -1), customEnd: num(x.customEnd, -1), note: str(x.note),
    })),
    holidays: arr('holidays').map(x => ({ id: num(x.id, 0), title: str(x.title), from: num(x.from, 0), to: num(x.to, 0) })),
    homework: arr('homework').map(x => ({
      id: num(x.id, 0), subjectId: num(x.subjectId, -1), text: str(x.text), created: num(x.created, todayE()), dueDay: num(x.dueDay, todayE()),
      dueBell: num(x.dueBell, -1), dueLabel: str(x.dueLabel), remindDays: num(x.remindDays, 1), done: !!x.done, doneDay: num(x.doneDay, 0),
      estMin: num(x.estMin, 0),
    })),
    events: arr('events').map(x => ({
      id: num(x.id, 0), kind: x.kind in KIND ? x.kind : 'OTHER', subjectId: num(x.subjectId, -1), title: str(x.title), day: num(x.day, todayE()),
      bell: num(x.bell, -1), time: num(x.time, -1), room: str(x.room), details: str(x.details), remindDays: num(x.remindDays, 3),
      prepGoalMin: num(x.prepGoalMin, -1),
    })),
    notes: arr('notes').map(x => ({
      id: num(x.id, 0), text: str(x.text), pinned: !!x.pinned, remind: !!x.remind, attach: x.attach in ATTACH ? x.attach : 'GENERAL',
      day: num(x.day, 0), bell: num(x.bell, -1), week: num(x.week, -1), weekday: Math.min(7, Math.max(1, num(x.weekday, 1))),
      subjectId: num(x.subjectId, -1), created: num(x.created, 0),
    })),
    cancels: arr('cancels').map(x => ({ day: num(x.day, 0), lessonId: num(x.lessonId, 0) })),
    attendance: o.attendance && typeof o.attendance === 'object' && !Array.isArray(o.attendance)
      ? (Object.fromEntries(Object.entries(o.attendance).filter(([, v]) => (v as string) in ATT)) as Record<string, AttMark>)
      : {},
    prep: arr('prep').map(x => ({
      id: num(x.id, 0), subjectId: num(x.subjectId, -1), eventId: num(x.eventId, -1), hwId: num(x.hwId, -1),
      day: num(x.day, todayE()), min: Math.max(1, num(x.min, 1)), note: str(x.note), ts: num(x.ts, 0),
    })),
    timer: o.timer && typeof o.timer === 'object' && o.timer.target
      ? { target: str(o.timer.target), start: num(o.timer.start, Date.now()), acc: num(o.timer.acc, 0), paused: !!o.timer.paused }
      : null,
  };
  if (!d.bells.length && !d.lessons.length) d.bells = UNI_BELLS();
  let max = 0;
  for (const k of ['subjects', 'lessons', 'homework', 'events', 'notes', 'holidays', 'prep'] as const) for (const x of d[k]) if (x.id > max) max = x.id;
  if (d.nextId <= max) d.nextId = max + 1;
  return d;
}

/** Текущие данные. Меняются на месте, после изменений нужно вызвать commit(). */
export let D: Data = normalize({});
export const S = (): Settings => D.settings;
export const newId = (): number => D.nextId++;

const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function emit(): void { listeners.forEach(f => f()); }

let saveError: ((msg: string) => void) | null = null;
export function onSaveError(fn: (msg: string) => void): void { saveError = fn; }

const hasLS = () => typeof localStorage !== 'undefined';

export function setData(d: Data): void { D = d; }
export function load(): void {
  try {
    const s = hasLS() ? localStorage.getItem(LS_KEY) : null;
    if (s) { D = normalize(JSON.parse(s)); return; }
  } catch { /* повреждённые данные — начинаем с чистого листа */ }
  D = normalize({});
}
/** Перечитывает данные, если их изменила другая вкладка. */
export function reload(): void {
  try {
    const s = hasLS() ? localStorage.getItem(LS_KEY) : null;
    if (s) D = normalize(JSON.parse(s));
  } catch { /* оставляем то, что есть */ }
}
export function save(): void {
  if (!hasLS()) return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(D)); }
  catch { saveError?.('Не удалось сохранить: память браузера недоступна'); }
}
export function commit(): void { save(); emit(); }
