import { beforeEach, describe, expect, it } from 'vitest';
import { fromIso, mondayOf, todayE } from '../src/lib/dates';
import { applyFull, parseImport } from '../src/lib/files';
import { buildIcs } from '../src/lib/ics';
import { dayLoad, occurrences, weekIndex } from '../src/lib/logic';
import { D, normalize, setData } from '../src/lib/store';

const MON = fromIso('2026-11-16')!; // понедельник

/** Резервная копия в формате версии 2.0. */
const v2 = () => ({
  app: 'StuStu', version: 2, kind: 'full', nextId: 40,
  settings: { cycleWeeks: 2, anchorMonday: MON, weekNames: ['Числитель', 'Знаменатель'], theme: 2, attStart: MON - 7, lastBackup: 123 },
  subjects: [{ id: 1, name: 'Матанализ', teacher: 'Иванов', color: 1 }, { id: 2, name: 'ОС', teacher: '', color: 6 }],
  bells: [{ start: 540, end: 630 }, { start: 640, end: 730 }],
  lessons: [
    { id: 10, subjectId: 1, type: 'LECTURE', room: '305', teacher: '', week: -1, day: 1, bell: 1, customStart: -1, customEnd: -1, note: '' },
    { id: 11, subjectId: 2, type: 'LAB', room: '412', teacher: '', week: 1, day: 1, bell: 2, customStart: -1, customEnd: -1, note: '' },
  ],
  holidays: [{ id: 20, title: 'Каникулы', from: MON + 14, to: MON + 20 }],
  homework: [{ id: 30, subjectId: 1, text: 'Решить №3', created: MON - 1, dueDay: MON, dueBell: 1, dueLabel: 'к лекции', remindDays: 1, done: false, doneDay: 0, estMin: 60 }],
  events: [{ id: 31, kind: 'EXAM', subjectId: 2, title: '', day: MON + 9, bell: 2, time: -1, room: '412', details: 'билеты 1–30', remindDays: 3, prepGoalMin: -1 }],
  notes: [{ id: 32, text: 'Взять тетрадь', pinned: true, remind: false, attach: 'SUBJECT', day: 0, bell: -1, week: -1, weekday: 1, subjectId: 1, created: MON }],
  cancels: [{ day: MON + 7, lessonId: 10 }],
  attendance: { [`${MON - 7}:10`]: 'p', bad: 'zzz' },
  prep: [{ id: 33, subjectId: 2, eventId: 31, hwId: -1, day: MON - 1, min: 90, note: '', ts: 1 }],
  timer: null,
});

describe('совместимость с версией 2.0', () => {
  it('читает копию без потерь', () => {
    const d = normalize(v2());
    expect(d.subjects).toHaveLength(2);
    expect(d.lessons[1]).toMatchObject({ id: 11, type: 'LAB', week: 1, day: 1, bell: 2 });
    expect(d.homework[0]).toMatchObject({ text: 'Решить №3', estMin: 60, dueLabel: 'к лекции' });
    expect(d.events[0]).toMatchObject({ kind: 'EXAM', details: 'билеты 1–30' });
    expect(d.notes[0]).toMatchObject({ attach: 'SUBJECT', pinned: true });
    expect(d.settings.weekNames).toEqual(['Числитель', 'Знаменатель']);
    expect(d.attendance).toEqual({ [`${MON - 7}:10`]: 'p' });
    expect(d.nextId).toBe(40);
  });
  it('нормализация повторно ничего не меняет', () => {
    const once = normalize(v2());
    expect(normalize(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });
  it('поднимает nextId выше всех номеров', () => {
    const o = v2(); o.nextId = 3;
    expect(normalize(o).nextId).toBe(34);
  });
  it('распознаёт файлы', () => {
    expect(parseImport('не json')).toBeNull();
    expect(parseImport('{"a":1}')).toBeNull();
    expect(parseImport(JSON.stringify(v2()))?.kind).toBe('full');
    expect(parseImport(JSON.stringify({ ...v2(), kind: 'schedule' }))?.kind).toBe('schedule');
  });
  it('загрузка копии сохраняет время последней копии', () => {
    setData(normalize({ settings: { lastBackup: 999 } }));
    applyFull(v2());
    expect(D.settings.lastBackup).toBe(999);
    expect(D.lessons).toHaveLength(2);
  });
});

describe('расписание', () => {
  beforeEach(() => setData(normalize(v2())));
  it('чередует недели', () => {
    expect(weekIndex(MON)).toBe(0);
    expect(weekIndex(MON + 7)).toBe(1);
    expect(weekIndex(MON + 14)).toBe(0);
    expect(weekIndex(MON - 7)).toBe(1);
  });
  it('показывает пары по неделям', () => {
    expect(occurrences(MON).map(o => o.l.id)).toEqual([10]);
    expect(occurrences(MON + 7, true).map(o => o.l.id)).toEqual([10, 11]);
  });
  it('учитывает отмены и каникулы', () => {
    expect(occurrences(MON + 7).map(o => o.l.id)).toEqual([11]);
    expect(occurrences(MON + 7, true).find(o => o.l.id === 10)?.cancelled).toBe(true);
    expect(occurrences(MON + 14)).toEqual([]);
  });
  it('понедельник недели', () => {
    expect(mondayOf(MON + 6)).toBe(MON);
    expect(mondayOf(MON + 7)).toBe(MON + 7);
  });
  it('считает нагрузку дня с экзаменом', () => {
    const L = dayLoad(MON + 9);
    expect(L.evs).toHaveLength(1);
    expect(L.min).toBe(600 - 90);
    expect(L.lvl).toBe(3);
  });
});

describe('календарь', () => {
  it('выгружает пары, ДЗ и экзамены', () => {
    const t = todayE();
    setData(normalize({
      ...v2(), settings: { ...v2().settings, anchorMonday: mondayOf(t) },
      holidays: [], cancels: [],
      homework: [{ ...v2().homework[0], dueDay: t + 2 }],
      events: [{ ...v2().events[0], day: t + 5 }],
    }));
    const r = buildIcs({ lessons: true, until: t + 13, homework: true, events: true, remind: true, lessonRemindMin: 10 }, new Date(Date.UTC(2026, 10, 15)));
    expect(r.text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(r.text.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    // 2 недели: 2 лекции + 1 лабораторная (вторая неделя) + ДЗ + экзамен
    expect(r.count).toBe(5);
    expect(r.text).toContain('SUMMARY:Матанализ · Лекция');
    expect(r.text).toContain('TRIGGER:-PT10M');
    expect(r.text).toContain('SUMMARY:ДЗ: Матанализ');
    expect(r.text).toContain('Экзамен: ОС');
    expect(r.text).toContain('DESCRIPTION:билеты 1–30');
    for (const line of r.text.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
