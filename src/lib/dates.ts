// Даты хранятся как номер дня от 1970-01-01 (по местному календарю), время — в минутах от полуночи.

export const DAY = 864e5;
export const DOW_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const DOW_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const DOW_ACC = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];
export const MON_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MON_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const pad = (n: number) => String(n).padStart(2, '0');

export function todayE(): number { const n = new Date(); return Math.round(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / DAY); }
export function nowMinF(): number { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
export function dowOf(e: number): number { return (((e % 7) + 7 + 3) % 7) + 1; }
export function mondayOf(e: number): number { return e - dowOf(e) + 1; }
export function ymd(e: number): [number, number, number] { const d = new Date(e * DAY); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]; }
export function msAt(e: number, min: number): number { const [y, m, d] = ymd(e); return new Date(y, m, d, 0, min).getTime(); }
export function isoOf(e: number): string { const [y, m, d] = ymd(e); return `${y}-${pad(m + 1)}-${pad(d)}`; }
export function fromIso(s: string | null | undefined): number | null {
  const p = String(s || '').split('-').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / DAY);
}
export function minFromInput(s: string | null | undefined): number {
  const p = String(s || '').split(':').map(Number);
  if (p.length < 2 || p.some(isNaN)) return -1;
  return p[0] * 60 + p[1];
}
export const timeVal = (m: number) => (m >= 0 ? `${pad(Math.floor(m / 60))}:${pad(m % 60)}` : '');

export const fTime = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
export const fRange = (a: number, b: number) => `${fTime(a)}–${fTime(b)}`;
export const fDayMonth = (e: number) => { const [, m, d] = ymd(e); return `${d} ${MON_GEN[m]}`; };
export const fDMShort = (e: number) => { const [, m, d] = ymd(e); return `${d} ${MON_SHORT[m]}`; };
export const fFull = (e: number) => `${DOW_FULL[dowOf(e) - 1]}, ${fDayMonth(e)}`;
export const fShort = (e: number) => `${DOW_SHORT[dowOf(e) - 1]}, ${fDMShort(e)}`;
export const fDM = (e: number) => { const [, m, d] = ymd(e); return `${pad(d)}.${pad(m + 1)}`; };

export function plural(n: number, a: string, b: string, c: string): string {
  n = Math.abs(n) % 100; const k = n % 10;
  if (n > 10 && n < 15) return c;
  if (k === 1) return a;
  if (k > 1 && k < 5) return b;
  return c;
}
export const fDays = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
export const fLessons = (n: number) => `${n} ${plural(n, 'пара', 'пары', 'пар')}`;
export function fRel(n: number): string {
  if (n === 0) return 'сегодня';
  if (n === 1) return 'завтра';
  if (n === 2) return 'послезавтра';
  if (n === -1) return 'вчера';
  if (n < 0) return `${fDays(-n)} назад`;
  return `через ${fDays(n)}`;
}
export function fDur(min: number): string {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}
export function fCd(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
export function cut(s: string, n: number): string {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}
