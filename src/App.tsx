import { useEffect } from 'preact/hooks';
import { DOW_ACC, dowOf, fCd, fFull, todayE } from './lib/dates';
import { guessSubject, homeKeyNow, targetLabel, timerElapsed, weekIndex } from './lib/logic';
import { R, goTab, push, type Tab } from './lib/nav';
import { applyUpdate, dismissUpdate, updateReady } from './lib/pwa';
import { D, S, subscribe } from './lib/store';
import { holidayForm, lessonForm } from './forms/basic';
import { eventForm, hwForm, noteForm, pauseTimer, prepForm, resumeTimer, startTimer, stopTimer } from './forms/study';
import { Home } from './screens/Home';
import { PageView } from './screens/Pages';
import { Schedule } from './screens/Schedule';
import { Notes, Stats, Tasks } from './screens/Tabs';
import { Icon, type IconName } from './ui/icons';
import { useForce, useNow } from './ui/hooks';
import { SheetHost, choose } from './ui/sheets';

const TABS: [Tab, IconName, string][] = [
  ['home', 'route', 'Сегодня'], ['sched', 'cal', 'Расписание'], ['tasks', 'tasks', 'Задания'], ['notes', 'note', 'Заметки'], ['stats', 'chart', 'Статистика'],
];

function applyTheme(): void {
  const th = S().theme;
  const dark = th === 2 || (th === 0 && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', dark ? '#0B1411' : '#EEF2EC');
}

function quickAdd(): void {
  choose('Добавить', null, [
    { t: 'Домашнее задание', icon: 'book', fn: () => hwForm(null) },
    { t: 'Экзамен или контрольная', icon: 'cap', fn: () => eventForm(null, { sid: guessSubject() }) },
    { t: 'Заметка', icon: 'note', fn: () => noteForm(null) },
    { t: 'Засечь время подготовки', icon: 'timer', fn: () => startTimer(null) },
    { t: 'Записать время подготовки', icon: 'clock', fn: () => prepForm(null) },
    { t: 'Пара в расписание', icon: 'cal', fn: () => lessonForm(null, { day: dowOf(todayE()) }) },
  ]);
}
function dayAdd(): void {
  const e = R.sel != null ? R.sel : todayE(), dw = dowOf(e);
  choose(fFull(e), null, [
    { t: `Пара на ${DOW_ACC[dw - 1]}`, icon: 'cal', fn: () => lessonForm(null, { day: dw, week: S().cycleWeeks > 1 ? weekIndex(e) : -1 }) },
    { t: 'Заметка на этот день', icon: 'note', fn: () => noteForm(null, { attach: 'DATE', day: e }) },
    { t: `Заметка на каждый ${DOW_ACC[dw - 1]}`, icon: 'repeat', fn: () => noteForm(null, { attach: 'RECURRING', weekday: dw, bell: -1 }) },
    { t: 'Экзамен или зачёт в этот день', icon: 'cap', fn: () => eventForm(null, { day: e }) },
    { t: 'Каникулы или выходной', icon: 'sun', fn: () => holidayForm(null) },
  ]);
}
function fabAction(): (() => void) | null {
  if (R.stack.length) return null;
  switch (R.tab) {
    case 'home': return quickAdd;
    case 'sched': return dayAdd;
    case 'tasks': return R.seg === 'hw' ? () => hwForm(null) : () => eventForm(null, { sid: guessSubject() });
    case 'notes': return () => noteForm(null);
    default: return null;
  }
}

function TimerPill() {
  useNow(1000);
  const T = D.timer;
  if (!T) return null;
  return (
    <div class={'tpill' + (T.paused ? ' paused' : '')}>
      <div class="tt"><small><span class="rec" />{targetLabel(T.target)}</small><b>{fCd(timerElapsed() / 1000)}</b></div>
      <button class="tb" aria-label={T.paused ? 'Продолжить' : 'Пауза'} onClick={T.paused ? resumeTimer : pauseTimer}><Icon n={T.paused ? 'play' : 'pause'} s={18} /></button>
      <button class="tb" aria-label="Остановить и записать" onClick={stopTimer}><Icon n="stop" s={18} /></button>
    </div>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0F3B2E" />
      <path d="M22 16v32" stroke="#EAF3EC" stroke-width="5" stroke-linecap="round" />
      <circle cx="22" cy="16" r="6" fill="#0F3B2E" stroke="#EAF3EC" stroke-width="4" />
      <circle cx="22" cy="48" r="6" fill="#0F3B2E" stroke="#EAF3EC" stroke-width="4" />
      <circle cx="22" cy="33" r="7" fill="#FFC247" stroke="#0F3B2E" stroke-width="3" />
      <path d="M36 16h14M36 33h10M36 48h14" stroke="#EAF3EC" stroke-width="5" stroke-linecap="round" />
    </svg>
  );
}

export function App() {
  const force = useForce();
  useEffect(() => subscribe(force), []);
  // Перерисовка, когда началась или закончилась пара и раз в минуту
  useEffect(() => {
    let key = '';
    const id = setInterval(() => {
      const k = homeKeyNow() + ':' + Math.floor(Date.now() / 60000);
      if (k !== key) { key = k; force(); }
    }, 1000);
    return () => clearInterval(id);
  }, []);
  applyTheme();
  useEffect(() => { document.body.classList.toggle('has-timer', !!D.timer); });

  const top = R.stack[R.stack.length - 1];
  const fab = fabAction();
  const inSettings = R.stack.length > 0 && R.stack[0].name !== 'event' && R.stack[0].name !== 'subject' && R.stack[0].name !== 'attend';
  return (
    <>
      <nav class="nav" aria-label="Разделы">
        <div class="brand only-desktop"><Logo /><span>StuStu</span></div>
        {TABS.map(([k, ic, l]) => {
          const on = R.tab === k && !R.stack.length;
          return <button class={'tab' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined} onClick={() => goTab(k)}><Icon n={ic} s={22} /><span>{l}</span></button>;
        })}
        <div class="nav-grow only-desktop" />
        <button class={'tab only-desktop' + (inSettings ? ' on' : '')} onClick={() => { if (!inSettings) push('settings'); }}><Icon n="sliders" s={22} /><span>Настройки</span></button>
      </nav>
      <main class={'page' + (top ? ' inner' : ' tab-' + R.tab)}>
        {updateReady() && (
          <div class="update">
            <Icon n="refresh" s={18} /><span class="grow">Вышла новая версия StuStu</span>
            <button class="btn pri" onClick={applyUpdate}>Обновить</button>
            <button class="lnk" aria-label="Позже" onClick={dismissUpdate}><Icon n="x" s={18} /></button>
          </div>
        )}
        {top ? <PageView page={top} key={top.name + ':' + (top.p.id ?? '')} />
          : R.tab === 'home' ? <Home /> : R.tab === 'sched' ? <Schedule /> : R.tab === 'tasks' ? <Tasks /> : R.tab === 'notes' ? <Notes /> : <Stats />}
      </main>
      {fab && <button class="fab" aria-label="Добавить" onClick={fab}><Icon n="plus" s={26} w={2.6} /></button>}
      <TimerPill />
      <SheetHost />
    </>
  );
}
