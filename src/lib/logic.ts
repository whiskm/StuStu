// Вся «учебная» логика: расписание, ДЗ, события, нагрузка, посещаемость, таймер.
// Перенесена из версии 2.0 без изменения поведения.

import { COLORS, KIND, NO_SUBJECT_COLOR, TYPES } from './consts';
import {
  DOW_SHORT, cut, dowOf, fDays, fDur, fShort, fTime, mondayOf, nowMinF, todayE,
} from './dates';
import { D, S } from './store';
import type { AttMark, Holiday, Homework, Lesson, Note, Occ, StudyEvent, Subject } from './types';

/* ---------- Недели и пары ---------- */

export function weekIndex(e: number): number {
  const c = Math.max(1, S().cycleWeeks | 0);
  const w = Math.floor((mondayOf(e) - S().anchorMonday) / 7);
  return ((w % c) + c) % c;
}
export function weekName(i: number): string { const n = (S().weekNames[i] || '').trim(); return n || `Неделя ${i + 1}`; }
export function weekLabel(e: number): string {
  const s = S();
  if (s.cycleWeeks <= 1) return 'Каждая неделя одинаковая';
  const i = weekIndex(e); const n = (s.weekNames[i] || '').trim();
  return n ? `${n} · неделя ${i + 1} из ${s.cycleWeeks}` : `Неделя ${i + 1} из ${s.cycleWeeks}`;
}
export function bellTimes(b: number): [number, number] | null { const x = D.bells[b - 1]; return x ? [x.start, x.end] : null; }
export function lessonTimes(l: Lesson): [number, number] | null {
  if (l.customStart >= 0 && l.customEnd > l.customStart) return [l.customStart, l.customEnd];
  return bellTimes(l.bell);
}
export function holidayOn(e: number): Holiday | null { return D.holidays.find(h => e >= h.from && e <= h.to) || null; }
export function isCancelled(e: number, id: number): boolean { return D.cancels.some(c => c.day === e && c.lessonId === id); }

export function occurrences(e: number, incCancelled = false): Occ[] {
  if (holidayOn(e)) return [];
  const dw = dowOf(e), wi = weekIndex(e), res: Occ[] = [];
  for (const l of D.lessons) {
    if (l.day !== dw || (l.week >= 0 && l.week !== wi)) continue;
    const t = lessonTimes(l); if (!t) continue;
    const c = isCancelled(e, l.id); if (c && !incCancelled) continue;
    res.push({ e, l, start: t[0], end: t[1], cancelled: c, bell: l.bell, sid: l.subjectId, key: e + ':' + l.id });
  }
  res.sort((a, b) => a.start - b.start || a.bell - b.bell);
  return res;
}
export function findOcc(e: number, lid: number): Occ | null { return occurrences(e, true).find(o => o.l.id === lid) || null; }
export function firstOccAfter(e: number, max = 60): Occ | null {
  for (let i = 1; i <= max; i++) { const o = occurrences(e + i); if (o.length) return o[0]; }
  return null;
}

export type NowState =
  | { type: 'empty' }
  | { type: 'lesson'; occ: Occ; next: Occ | null }
  | { type: 'wait'; next: Occ; prev: Occ | null }
  | { type: 'done'; next: Occ | null }
  | { type: 'free'; next: Occ | null; holiday: Holiday | null };

export function nowState(): NowState {
  if (!D.lessons.length) return { type: 'empty' };
  const t = todayE(), n = new Date(), sec = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  const occs = occurrences(t);
  const cur = occs.find(o => o.start * 60 <= sec && sec < o.end * 60);
  if (cur) return { type: 'lesson', occ: cur, next: occs.find(o => o !== cur && o.start * 60 > sec) || null };
  const next = occs.find(o => o.start * 60 > sec);
  if (next) return { type: 'wait', next, prev: [...occs].reverse().find(o => o.end * 60 <= sec) || null };
  const after = firstOccAfter(t);
  return occs.length ? { type: 'done', next: after } : { type: 'free', next: after, holiday: holidayOn(t) };
}
/** Меняется, когда на главном экране пора показать другое состояние. */
export function homeKeyNow(): string {
  const st = nowState();
  const o = st.type === 'lesson' ? st.occ : st.type === 'empty' ? null : st.next;
  return `${todayE()}|${st.type}|${o ? o.key : ''}`;
}

export function upcoming(sid: number, types: string[] | null, limit = 10, horizon = 200): Occ[] {
  const t = todayE(), nm = nowMinF(), res: Occ[] = [];
  for (let i = 0; i < horizon && res.length < limit; i++) {
    for (const o of occurrences(t + i)) {
      if (o.sid !== sid || (types && !types.includes(o.l.type)) || (i === 0 && o.start <= nm)) continue;
      res.push(o); if (res.length >= limit) break;
    }
  }
  return res;
}
export function occAt(e: number, bell: number, sid = -1): Occ | null {
  const l = occurrences(e).filter(o => o.bell === bell);
  return l.find(o => o.sid === sid) || l[0] || null;
}

/* ---------- Предметы ---------- */

export const subj = (id: number): Subject | null => D.subjects.find(s => s.id === id) || null;
export const subjName = (id: number): string => { const s = subj(id); return s ? s.name : id < 0 ? '' : '(предмет удалён)'; };
export const colorAt = (i: number): string => COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length];
export const subjColor = (id: number): string => { const s = subj(id); return s ? colorAt(s.color) : NO_SUBJECT_COLOR; };

/* ---------- ДЗ, события, заметки ---------- */

export function hwFor(o: Occ): Homework[] {
  return D.homework.filter(h => !h.done && h.dueDay === o.e && h.subjectId === o.sid && (h.dueBell < 0 || h.dueBell === o.bell));
}
export function activeHw(): Homework[] { return D.homework.filter(h => !h.done).sort((a, b) => a.dueDay - b.dueDay || a.dueBell - b.dueBell); }
export function eventStart(x: Pick<StudyEvent, 'bell' | 'time'>): number | null {
  if (x.bell > 0) { const b = bellTimes(x.bell); if (b) return b[0]; }
  return x.time >= 0 ? x.time : null;
}
export function eventsOn(e: number): StudyEvent[] { return D.events.filter(x => x.day === e).sort((a, b) => (eventStart(a) || 0) - (eventStart(b) || 0)); }
export function eventsFor(o: Occ): StudyEvent[] {
  return D.events.filter(x => x.day === o.e && (x.bell === o.bell || (x.bell < 0 && x.time < 0 && x.subjectId === o.sid)));
}
export function upcomingEvents(): StudyEvent[] {
  const t = todayE();
  return D.events.filter(x => x.day >= t).sort((a, b) => a.day - b.day || (eventStart(a) || 0) - (eventStart(b) || 0));
}
export function pastEvents(): StudyEvent[] { const t = todayE(); return D.events.filter(x => x.day < t).sort((a, b) => b.day - a.day); }

export function noteMatchesOcc(n: Note, o: Occ): boolean {
  if (n.attach === 'LESSON') return n.day === o.e && n.bell === o.bell && (n.subjectId < 0 || n.subjectId === o.sid);
  if (n.attach === 'RECURRING') return n.bell === o.bell && n.weekday === dowOf(o.e) && (n.week < 0 || n.week === weekIndex(o.e));
  if (n.attach === 'SUBJECT') return n.subjectId === o.sid;
  return false;
}
export const notesFor = (o: Occ): Note[] => D.notes.filter(n => noteMatchesOcc(n, o));
export function dayNotes(e: number, occs?: Occ[]): Note[] {
  const list = occs || occurrences(e);
  const wi = weekIndex(e), dw = dowOf(e);
  return D.notes.filter(n => {
    if (n.attach === 'DATE') return n.day === e;
    if (n.attach === 'LESSON') return n.day === e && !list.some(o => noteMatchesOcc(n, o));
    if (n.attach === 'RECURRING') return n.weekday === dw && (n.week < 0 || n.week === wi) && (n.bell < 0 || !list.some(o => noteMatchesOcc(n, o))) && !holidayOn(e);
    return false;
  });
}
export function noteAttachText(n: Note): string {
  switch (n.attach) {
    case 'DATE': return fShort(n.day);
    case 'LESSON': return `${fShort(n.day)} · ${n.bell} пара${n.subjectId >= 0 ? ' · ' + subjName(n.subjectId) : ''}`;
    case 'RECURRING': return `${n.week < 0 || S().cycleWeeks <= 1 ? 'Каждую неделю' : weekName(n.week)} · ${DOW_SHORT[n.weekday - 1]} · ${n.bell < 0 ? 'весь день' : n.bell + ' пара'}`;
    case 'SUBJECT': return `На каждой паре: ${subjName(n.subjectId)}`;
    default: return 'Без привязки';
  }
}
export function hwDueText(h: Pick<Homework, 'dueDay' | 'dueBell' | 'dueLabel'>): string {
  let s = fShort(h.dueDay);
  if (h.dueBell > 0) { s += ` · ${h.dueBell} пара`; const b = bellTimes(h.dueBell); if (b) s += ` (${fTime(b[0])})`; }
  if (h.dueLabel) s += ' · ' + h.dueLabel;
  return s;
}
export function eventWhenText(x: StudyEvent): string {
  let s = fShort(x.day);
  if (x.bell > 0) s += ` · ${x.bell} пара`;
  const st = eventStart(x); if (st != null) s += ' · ' + fTime(st);
  if (x.room) s += ' · ауд. ' + x.room;
  return s;
}
export const kindName = (x: StudyEvent): string => (KIND[x.kind] || KIND.OTHER).t;
export function eventTitle(x: StudyEvent): string {
  const sn = subjName(x.subjectId), k = kindName(x);
  if (x.title && sn) return `${x.title} · ${sn}`;
  if (x.title) return x.title;
  if (sn) return `${k}: ${sn}`;
  return k;
}
export function occSubtitle(o: Occ): string {
  const p = [TYPES[o.l.type]];
  if (o.l.room) p.push('ауд. ' + o.l.room);
  const t = o.l.teacher || (subj(o.sid) || { teacher: '' }).teacher; if (t) p.push(t);
  return p.join(' · ');
}
export const occText = (o: Occ): string => `${fShort(o.e)} · ${o.bell} пара (${fTime(o.start)}) · ${TYPES[o.l.type]}${o.l.room ? ' · ауд. ' + o.l.room : ''}`;

/** Предмет, который скорее всего имеет в виду пользователь прямо сейчас. */
export function guessSubject(): number {
  const st = nowState(), t = todayE();
  let id = -1;
  if (st.type === 'lesson') id = st.occ.sid;
  else if (st.type === 'wait') id = (st.prev || st.next).sid;
  else if (st.type === 'done') { const o = occurrences(t); id = o.length ? o[o.length - 1].sid : -1; }
  else if (st.type === 'free' && st.next) id = st.next.sid;
  if (!subj(id)) id = D.subjects.length ? D.subjects[0].id : -1;
  return id;
}

/* ---------- Подготовка и нагрузка ---------- */

export const goalOf = (x: Pick<StudyEvent, 'prepGoalMin' | 'kind'>): number => (x.prepGoalMin >= 0 ? x.prepGoalMin : (KIND[x.kind] || KIND.OTHER).g);
export function prepSum(f: (p: (typeof D.prep)[number]) => boolean): number { let s = 0; for (const p of D.prep) if (f(p)) s += p.min; return s; }
export const evDone = (x: StudyEvent): number => prepSum(p => p.eventId === x.id);
export const evLeft = (x: StudyEvent): number => Math.max(0, goalOf(x) - evDone(x));
export const hwEst = (h: Homework): number => (h.estMin > 0 ? h.estMin : S().hwDefaultMin);
export const hwSpent = (h: Homework): number => prepSum(p => p.hwId === h.id);
export const hwLeft = (h: Homework): number => (h.done ? 0 : Math.max(0, hwEst(h) - hwSpent(h)));
/** Сколько минут в день нужно заниматься, округлено до 5 минут вверх. */
export const perDay = (left: number, days: number): number => Math.ceil(left / days / 5) * 5;

export interface DayLoad { e: number; hws: Homework[]; evs: StudyEvent[]; min: number; lvl: number; occN: number }
export function dayLoad(e: number): DayLoad {
  const t = todayE();
  const hws = D.homework.filter(h => !h.done && (h.dueDay === e || (e === t && h.dueDay < t)));
  const evs = D.events.filter(x => x.day === e);
  let min = 0;
  for (const h of hws) min += hwLeft(h);
  for (const x of evs) min += evLeft(x);
  const busy = S().busyMin;
  let lvl = 0;
  if (min > 0 || hws.length) lvl = 1;
  if (min >= busy || hws.length >= 3 || evs.length >= 1) lvl = 2;
  if (min >= busy * 2 || evs.length >= 2 || (evs.length >= 1 && hws.length >= 2)) lvl = 3;
  return { e, hws, evs, min, lvl, occN: occurrences(e).length };
}
export function loadSummary(L: DayLoad): string {
  const p: string[] = [];
  if (L.hws.length) p.push(`${L.hws.length} ДЗ`);
  for (const x of L.evs) p.push(eventTitle(x));
  if (L.min > 0) p.push(`≈ ${fDur(L.min)} работы`);
  return p.join(' · ');
}
export function loadAdvice(L: DayLoad): string {
  const t = todayE(), days = L.e - t;
  if (L.min <= 0) return L.evs.length ? 'Подготовка по плану — не забудь повторить.' : '';
  if (days <= 0) return `Сегодня нужно ≈ ${fDur(L.min)} — лучше не откладывать.`;
  return days === 1 ? `Займись сегодня: ≈ ${fDur(L.min)}.` : `Начни заранее: ≈ ${fDur(perDay(L.min, days))} в день, чтобы успеть.`;
}

/* ---------- Посещаемость ---------- */

export interface AttCount { p: number; l: number; a: number; e: number; u: number }
export interface AttStats extends AttCount { by: Record<number, AttCount>; byType: Record<string, AttCount> }
const zero = (): AttCount => ({ p: 0, l: 0, a: 0, e: 0, u: 0 });
export function attStats(from: number, to: number, sid?: number): AttStats {
  const t = todayE(), nm = nowMinF();
  const r: AttStats = { ...zero(), by: {}, byType: {} };
  for (let e = from; e <= to; e++) {
    for (const o of occurrences(e)) {
      if (e > t || (e === t && o.start > nm)) continue;
      if (sid != null && o.sid !== sid) continue;
      const v: AttMark | 'u' | null = D.attendance[o.key] || (e >= S().attStart ? 'u' : null);
      if (!v) continue;
      r[v]++;
      (r.by[o.sid] || (r.by[o.sid] = zero()))[v]++;
      (r.byType[o.l.type] || (r.byType[o.l.type] = zero()))[v]++;
    }
  }
  return r;
}
export const attPct = (b: AttCount): number | null => { const den = b.p + b.l + b.a; return den ? Math.round(((b.p + b.l) * 100) / den) : null; };
export function earliestAtt(): number {
  let m = Infinity;
  for (const k in D.attendance) { const e = +k.split(':')[0]; if (e < m) m = e; }
  return isFinite(m) ? Math.min(m, S().attStart) : S().attStart;
}
export function unmarkedPast(daysBack = 14): Occ[] {
  const t = todayE(), from = Math.max(S().attStart, t - daysBack), res: Occ[] = [];
  for (let e = from; e < t; e++) for (const o of occurrences(e)) if (!D.attendance[o.key]) res.push(o);
  return res;
}
/** Начавшиеся сегодня пары без отметки. */
export function unmarkedToday(): Occ[] { const nm = nowMinF(); return occurrences(todayE()).filter(o => o.start <= nm && !D.attendance[o.key]); }
export function setAtt(key: string, v: AttMark | ''): void {
  if (!v || D.attendance[key] === v) delete D.attendance[key]; else D.attendance[key] = v;
}

/* ---------- Таймер подготовки ---------- */

export function timerElapsed(): number { const T = D.timer; if (!T) return 0; return T.acc + (T.paused ? 0 : Date.now() - T.start); }
export function parseTarget(v: string | null | undefined): { eventId: number; hwId: number; subjectId: number } {
  const [k, id] = String(v || '').split(':'); const n = +id;
  if (k === 'e') { const x = D.events.find(e => e.id === n); return { eventId: n, hwId: -1, subjectId: x ? x.subjectId : -1 }; }
  if (k === 'h') { const h = D.homework.find(h => h.id === n); return { eventId: -1, hwId: n, subjectId: h ? h.subjectId : -1 }; }
  return { eventId: -1, hwId: -1, subjectId: isNaN(n) ? -1 : n };
}
export function targetLabel(v: string): string {
  const t = parseTarget(v);
  if (t.eventId >= 0) { const x = D.events.find(e => e.id === t.eventId); return x ? eventTitle(x) : 'Событие'; }
  if (t.hwId >= 0) { const h = D.homework.find(e => e.id === t.hwId); return h ? `ДЗ · ${subjName(h.subjectId)}` : 'ДЗ'; }
  return t.subjectId >= 0 ? subjName(t.subjectId) : 'Подготовка';
}
export function defaultTarget(): string {
  const ev = upcomingEvents()[0]; if (ev && ev.day - todayE() <= 14) return 'e:' + ev.id;
  const g = guessSubject(); return g >= 0 ? 's:' + g : ev ? 'e:' + ev.id : '';
}
export type OptGroup = { group: string; items: [string, string][] };
/** Варианты «к чему готовимся» для выпадающего списка. */
export function targetOptions(sel: string): OptGroup[] {
  const evs = upcomingEvents(), hw = activeHw(), res: OptGroup[] = [];
  const selEv = sel.startsWith('e:') && !evs.some(x => 'e:' + x.id === sel) ? D.events.find(x => 'e:' + x.id === sel) : null;
  const evItems: [string, string][] = evs.map(x => ['e:' + x.id, eventTitle(x) + ' · ' + fShort(x.day)]);
  if (selEv) evItems.unshift([sel, eventTitle(selEv) + ' · ' + fShort(selEv.day)]);
  if (evItems.length) res.push({ group: 'Экзамены и контрольные', items: evItems });
  if (hw.length) res.push({ group: 'Домашние задания', items: hw.map(x => ['h:' + x.id, subjName(x.subjectId) + ': ' + cut(x.text, 36)]) });
  if (D.subjects.length) res.push({ group: 'Предмет в целом', items: D.subjects.map(s => ['s:' + s.id, s.name]) });
  return res;
}

/* ---------- Разное ---------- */

export function visibleDays(): number[] {
  const s = S(), r: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const forced = i === 6 ? s.showSaturday : i === 7 ? s.showSunday : true;
    if (forced || D.lessons.some(l => l.day === i)) r.push(i);
  }
  return r;
}
export const fDaysAgo = (n: number) => `${fDays(n)} назад`;
