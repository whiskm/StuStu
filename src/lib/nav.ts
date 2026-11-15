// Навигация: пять вкладок и стопка внутренних страниц поверх них.
// Внутренние страницы записываются в историю браузера, чтобы работала кнопка «Назад».

import { todayE } from './dates';
import { emit } from './store';

export type Tab = 'home' | 'sched' | 'tasks' | 'notes' | 'stats';
export type PageName = 'event' | 'subject' | 'attend' | 'settings' | 'bells' | 'subjects' | 'holidays' | 'install';
export interface Page { name: PageName; p: { id?: number } }

export const R = {
  tab: 'home' as Tab,
  stack: [] as Page[],
  /** Выбранный день в расписании. */
  sel: null as number | null,
  seg: 'hw' as 'hw' | 'ev',
  sseg: 'att' as 'att' | 'prep' | 'hw',
  per: 'month' as 'week' | 'month' | 'all',
  showDone: false,
  showPast: false,
};

let ignorePop = 0;
/** Вызывается при нажатии «Назад», если открыто окно: вернуть true, если окно закрыто. */
let sheetCloser: (() => boolean) | null = null;
export function setSheetCloser(fn: () => boolean): void { sheetCloser = fn; }

const toTop = () => { if (typeof window !== 'undefined') window.scrollTo(0, 0); };

export function push(name: PageName, p: Page['p'] = {}): void {
  R.stack.push({ name, p });
  history.pushState({ depth: R.stack.length }, '');
  emit(); toTop();
}
export function back(): void { if (R.stack.length) history.back(); }
function dropStack(): void {
  const n = R.stack.length;
  R.stack = [];
  if (n) { ignorePop++; history.go(-n); }
}
export function goTab(t: Tab, o: { seg?: 'hw' | 'ev'; sel?: number } = {}): void {
  const same = R.tab === t && !R.stack.length;
  dropStack();
  R.tab = t;
  if (o.seg) R.seg = o.seg;
  if (o.sel != null) R.sel = o.sel;
  else if (t === 'sched' && same) R.sel = todayE();
  emit(); toTop();
}
/** Сброс навигации после замены всех данных. */
export function resetNav(): void { dropStack(); R.tab = 'home'; R.sel = null; }
/** Убирает из стопки страницы удалённого объекта. */
export function dropPages(name: PageName, id: number): void {
  const n = R.stack.length;
  R.stack = R.stack.filter(s => !(s.name === name && s.p.id === id));
  const removed = n - R.stack.length;
  if (removed) { ignorePop++; history.go(-removed); }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePop) { ignorePop--; return; }
    if (sheetCloser && sheetCloser()) { history.pushState({ depth: R.stack.length }, ''); return; }
    if (R.stack.length) { R.stack.pop(); emit(); toTop(); }
  });
}
