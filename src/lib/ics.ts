// Выгрузка в календарь телефона или компьютера (формат iCalendar, .ics).
// Напоминания после этого присылает сам календарь.

import { TYPES } from './consts';
import { isoOf, pad, todayE, ymd } from './dates';
import { bellTimes, eventStart, eventTitle, occurrences, subj, subjName } from './logic';
import { D } from './store';

export interface IcsOptions {
  lessons: boolean;
  /** Последний день, до которого выгружать пары (включительно). */
  until: number;
  homework: boolean;
  events: boolean;
  /** Добавлять ли напоминания. */
  remind: boolean;
  /** За сколько минут до пары напоминать. */
  lessonRemindMin: number;
}

const esc = (s: string) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dateOnly = (e: number) => { const [y, m, d] = ymd(e); return `${y}${pad(m + 1)}${pad(d)}`; };
const dateTime = (e: number, min: number) => `${dateOnly(e + Math.floor(min / 1440))}T${pad(Math.floor((min % 1440) / 60))}${pad(min % 60)}00`;

/** Строки длиннее 75 байт по стандарту переносятся с пробелом в начале продолжения. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '', bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

interface Ev {
  uid: string; summary: string; location?: string; description?: string;
  /** Событие на весь день (без времени). */
  allDay?: number;
  start?: [number, number]; end?: [number, number];
  /** Напоминание: значение TRIGGER, например -PT10M. */
  alarm?: string;
}

function vevent(x: Ev, stamp: string): string[] {
  const l = ['BEGIN:VEVENT', `UID:${x.uid}@stustu`, `DTSTAMP:${stamp}`];
  if (x.allDay != null) { l.push(`DTSTART;VALUE=DATE:${dateOnly(x.allDay)}`, `DTEND;VALUE=DATE:${dateOnly(x.allDay + 1)}`); }
  else if (x.start && x.end) { l.push(`DTSTART:${dateTime(x.start[0], x.start[1])}`, `DTEND:${dateTime(x.end[0], x.end[1])}`); }
  l.push(`SUMMARY:${esc(x.summary)}`);
  if (x.location) l.push(`LOCATION:${esc(x.location)}`);
  if (x.description) l.push(`DESCRIPTION:${esc(x.description)}`);
  if (x.alarm) l.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(x.summary)}`, `TRIGGER:${x.alarm}`, 'END:VALARM');
  l.push('END:VEVENT');
  return l;
}

/** Напоминание в 18:00 за n дней до события на весь день. */
const eveAlarm = (n: number) => `-PT${Math.max(1, n) * 24 - 18}H`;

export function buildIcs(o: IcsOptions, now = new Date()): { text: string; count: number } {
  const t = todayE();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const evs: Ev[] = [];

  if (o.lessons) {
    for (let e = t; e <= o.until; e++) {
      for (const occ of occurrences(e)) {
        const s = subj(occ.sid);
        const desc = [occ.l.teacher || (s ? s.teacher : ''), occ.l.note].filter(Boolean).join('\n');
        evs.push({
          uid: `lesson-${occ.l.id}-${isoOf(e)}`,
          summary: `${subjName(occ.sid) || 'Пара'} · ${TYPES[occ.l.type]}`,
          location: occ.l.room ? `ауд. ${occ.l.room}` : undefined,
          description: desc || undefined,
          start: [e, occ.start], end: [e, occ.end],
          alarm: o.remind && o.lessonRemindMin > 0 ? `-PT${o.lessonRemindMin}M` : undefined,
        });
      }
    }
  }
  if (o.homework) {
    for (const h of D.homework) {
      if (h.done || h.dueDay < t) continue;
      const sn = subjName(h.subjectId);
      evs.push({
        uid: `hw-${h.id}`,
        summary: `ДЗ${sn ? ': ' + sn : ''}`,
        description: h.text,
        allDay: h.dueDay,
        alarm: o.remind ? eveAlarm(h.remindDays) : undefined,
      });
    }
  }
  if (o.events) {
    for (const x of D.events) {
      if (x.day < t) continue;
      const st = eventStart(x);
      const base: Ev = {
        uid: `event-${x.id}`,
        summary: eventTitle(x),
        location: x.room ? `ауд. ${x.room}` : undefined,
        description: x.details || undefined,
      };
      if (st == null) evs.push({ ...base, allDay: x.day, alarm: o.remind ? eveAlarm(x.remindDays) : undefined });
      else {
        const b = x.bell > 0 ? bellTimes(x.bell) : null;
        evs.push({ ...base, start: [x.day, st], end: [x.day, b ? b[1] : st + 90], alarm: o.remind ? `-P${Math.max(1, x.remindDays)}D` : undefined });
      }
    }
  }

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StuStu//StuStu 3//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:StuStu'];
  for (const x of evs) lines.push(...vevent(x, stamp));
  lines.push('END:VCALENDAR');
  return { text: lines.map(fold).join('\r\n') + '\r\n', count: evs.length };
}
