// Внутренние страницы: событие, предмет, посещения, настройки и их разделы.

import type { ComponentChildren } from 'preact';
import { APP_VERSION, SCHOOL_BELLS, TYPES, UNI_BELLS } from '../lib/consts';
import { DAY, fDM, fDayMonth, fDays, fDur, fFull, fLessons, fRange, fRel, fShort, mondayOf, nowMinF, todayE } from '../lib/dates';
import { canPromptInstall, isIosSafari, isStandalone, platform, promptInstall } from '../lib/install';
import { isAndroidApp, isApp } from '../lib/platform';
import {
  activeHw, attPct, attStats, earliestAtt, evDone, eventTitle, eventWhenText, goalOf, kindName, occurrences, perDay, prepSum, subj, subjName,
  unmarkedPast, unmarkedToday, upcoming, upcomingEvents, weekIndex, weekName,
} from '../lib/logic';
import { back, push, type Page } from '../lib/nav';
import { D, S, commit } from '../lib/store';
import { bellForm, holidayForm, subjectForm, weekNamesForm } from '../forms/basic';
import { doBackup, doImport, icsForm, shareSchedule, wipe } from '../forms/data';
import { eventForm, prepForm, startTimer } from '../forms/study';
import type { Opt } from '../ui/fields';
import { Icon, type IconName } from '../ui/icons';
import { AttButtons, BackBtn, Bar, Dot, Empty, EventCard, Hdr, HwItem, NoteItem, RouteView, Sec } from '../ui/parts';
import { confirmBox } from '../ui/sheets';
import { toast } from '../ui/toast';
import { PrepList } from './Tabs';

/* ---------- Событие ---------- */

function EventPage({ id }: { id: number }) {
  const x = D.events.find(y => y.id === id);
  if (!x) return <><BackBtn /><Empty>Событие удалено.</Empty></>;
  const t = todayE(), days = x.day - t, g = goalOf(x), d = evDone(x), left = Math.max(0, g - d);
  const pct = g > 0 ? Math.min(100, Math.round((d * 100) / g)) : 0;
  const ses = D.prep.filter(q => q.eventId === x.id).sort((a, b) => b.day - a.day || b.ts - a.ts);
  const tg = 'e:' + x.id;
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title={eventTitle(x)} sub={`${kindName(x)} · ${eventWhenText(x)} · ${fRel(days)}`}
        right={<button class="ibtn" aria-label="Изменить" onClick={() => eventForm(x)}><Icon n="edit" /></button>} />
      {x.details && <div class="card pre">{x.details}</div>}
      <Sec>Подготовка</Sec>
      <div class="card">
        <div class="row">
          <div class="grow"><div class="big mid">{fDur(d)}</div><div class="small muted">{g > 0 ? `из ${fDur(g)} по плану` : 'цель не задана'}</div></div>
          {g > 0 && <div class="pct" style={{ color: d >= g ? 'var(--ok)' : 'var(--link)' }}>{pct}%</div>}
        </div>
        {g > 0 && <Bar pct={pct} kind={d >= g ? 'ok' : ''} />}
        <div class="small prep-advice">
          {g <= 0 ? 'Задай цель в настройках события, чтобы видеть план.'
            : left <= 0 ? 'Цель достигнута. Можно повторить самое сложное.'
            : days > 0 ? <>Осталось {fDur(left)} — это ≈ <b>{fDur(perDay(left, days))} в день</b> до {days === 1 ? 'завтра' : fShort(x.day)}.</>
            : days === 0 ? `Сегодня день сдачи. Не хватает ${fDur(left)} до цели.` : 'Событие прошло.'}
        </div>
        {days >= 0 && (
          <div class="btns">
            <button class="btn pri" onClick={() => startTimer(tg)}><Icon n="play" s={16} />Засечь время</button>
            <button class="btn" onClick={() => prepForm(tg)}><Icon n="plus" s={16} />Записать</button>
          </div>
        )}
      </div>
      {ses.length > 0 && <><Sec>Записи подготовки</Sec><PrepList list={ses} /><p class="hint">Нажми на запись, чтобы удалить её.</p></>}
      {x.subjectId >= 0 && subj(x.subjectId) && (
        <button class="btn wide" onClick={() => push('subject', { id: x.subjectId })}><Icon n="chart" s={18} />Статистика предмета</button>
      )}
    </div>
  );
}

/* ---------- Предмет ---------- */

function SubjectPage({ id }: { id: number }) {
  const s = subj(id);
  if (!s) return <><BackBtn /><Empty>Предмет удалён.</Empty></>;
  const t = todayE();
  const r = attStats(earliestAtt(), t, s.id), pct = attPct(r);
  const prepAll = prepSum(q => q.subjectId === s.id), prepW = prepSum(q => q.subjectId === s.id && q.day > t - 7);
  const ev = upcomingEvents().filter(x => x.subjectId === s.id);
  const hw = activeHw().filter(x => x.subjectId === s.id);
  const nx = upcoming(s.id, null, 4);
  const notes = D.notes.filter(n => n.subjectId === s.id && (n.attach === 'SUBJECT' || n.attach === 'LESSON'));
  const tg = 's:' + s.id;
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title={s.name} sub={s.teacher} right={<button class="ibtn" aria-label="Изменить" onClick={() => subjectForm(s)}><Icon n="edit" /></button>} />
      <div class="card">
        <div class="row">
          <div class="grow"><div class="small muted">Посещаемость</div><div class="big mid">{pct == null ? '—' : pct + '%'}</div></div>
          <div class="grow"><div class="small muted">Подготовка</div><div class="big mid">{fDur(prepAll)}</div></div>
        </div>
        <div class="kv">
          <span>Был <b>{r.p}</b></span><span>Опоздал <b>{r.l}</b></span><span>Не был <b>{r.a}</b></span>
          {r.u > 0 && <span>Не отмечено <b>{r.u}</b></span>}<span>За 7 дней <b>{fDur(prepW)}</b></span>
        </div>
        <div class="btns">
          <button class="btn pri" onClick={() => startTimer(tg)}><Icon n="play" s={16} />Засечь</button>
          <button class="btn" onClick={() => prepForm(tg)}><Icon n="plus" s={16} />Записать</button>
        </div>
      </div>
      {ev.length > 0 && <><Sec>Экзамены и контрольные</Sec>{ev.map(x => <EventCard x={x} />)}</>}
      {hw.length > 0 && <><Sec>Домашние задания</Sec>{hw.map(h => <HwItem h={h} />)}</>}
      {nx.length > 0 && <><Sec>Ближайшие пары</Sec>{nx.map(o => <><div class="small muted day-cap">{fShort(o.e)}</div><RouteView occs={[o]} compact /></>)}</>}
      {notes.length > 0 && <><Sec>Заметки</Sec>{notes.map(n => <NoteItem n={n} />)}</>}
    </div>
  );
}

/* ---------- Посещения ---------- */

function AttendPage() {
  const t = todayE(), from = Math.max(S().attStart, t - 20), nm = nowMinF();
  const un = unmarkedPast(20).length + unmarkedToday().length;
  const days: ComponentChildren[] = [];
  for (let e = t; e >= from; e--) {
    const occs = occurrences(e).filter(o => e < t || o.start <= nm);
    if (!occs.length) continue;
    days.push(
      <>
        <Sec>{fFull(e)}{e === t ? ' · сегодня' : ''}</Sec>
        <div class="card att-card">
          {occs.map(o => (
            <div class="attrow">
              <Dot sid={o.sid} />
              <div class="grow"><div class="att-name">{subjName(o.sid)}</div><div class="small muted">{o.bell} пара · {TYPES[o.l.type]}</div></div>
              <AttButtons okey={o.key} cur={D.attendance[o.key] || ''} />
            </div>
          ))}
        </div>
      </>,
    );
  }
  const markAll = () => {
    let n = 0;
    for (const o of [...unmarkedPast(20), ...unmarkedToday()]) { D.attendance[o.key] = 'p'; n++; }
    commit(); toast(`Отмечено: ${fLessons(n)}`);
  };
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title="Посещения" sub="Отметь, был ли ты на парах" />
      {un > 0 && <button class="btn pri wide first" onClick={markAll}><Icon n="check" s={18} />Все неотмеченные — «Был»</button>}
      {days.length ? days : <Empty>Прошедших пар пока нет.</Empty>}
      <p class="hint">Отметки учитываются с {fDayMonth(S().attStart)}. «Уважительная» — в меню пары в расписании.</p>
    </div>
  );
}

/* ---------- Настройки ---------- */

function Li({ icon, label, value, onClick, danger }: { icon: IconName; label: string; value?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button class={'li' + (danger ? ' danger' : '')} onClick={onClick}>
      <Icon n={icon} /><span class="grow">{label}</span>{value != null && <span class="lv">{value}</span>}{!danger && <Icon n="chevR" s={18} class="chev" />}
    </button>
  );
}
function SelRow({ icon, label, value, options, onChange }: { icon: IconName; label: string; value: number; options: Opt[]; onChange: (v: number) => void }) {
  return (
    <label class="li">
      <Icon n={icon} /><span class="grow">{label}</span>
      <select value={String(value)} onChange={e => onChange(+(e.target as HTMLSelectElement).value)}>
        {options.map(([v, t]) => <option value={String(v)}>{t}</option>)}
      </select>
    </label>
  );
}
function SwRow({ icon, label, checked, onChange }: { icon: IconName; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="li">
      <Icon n={icon} /><span class="grow">{label}</span>
      <input type="checkbox" class="swc" checked={checked} onChange={e => onChange((e.target as HTMLInputElement).checked)} /><i class="swi" />
    </label>
  );
}
const dOpts = (a: number, b: number): Opt[] => { const r: Opt[] = []; for (let i = a; i <= b; i++) r.push([i, fDays(i)]); return r; };

function SettingsPage() {
  const s = S(), t = todayE();
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => { s[k] = v; commit(); };
  const setCycle = (n: number) => { s.cycleWeeks = n; const cur = Math.min(weekIndex(t), n - 1); s.anchorMonday = mondayOf(t) - 7 * cur; commit(); };
  const lb = s.lastBackup ? fShort(Math.floor((s.lastBackup - new Date().getTimezoneOffset() * 60000) / DAY)) : 'никогда';
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title="Настройки" />
      <Sec>Расписание</Sec>
      <div class="list">
        <SelRow icon="repeat" label="Недель в цикле" value={s.cycleWeeks} options={[[1, 'Одна'], [2, 'Две'], [3, 'Три'], [4, 'Четыре']]} onChange={setCycle} />
        {s.cycleWeeks > 1 && (
          <>
            <SelRow icon="cal" label="Сейчас идёт" value={weekIndex(t)} options={[...Array(s.cycleWeeks)].map((_, i) => [i, weekName(i)] as Opt)}
              onChange={v => set('anchorMonday', mondayOf(t) - 7 * v)} />
            <Li icon="edit" label="Названия недель" value={s.weekNames.filter(Boolean).length ? 'заданы' : 'нет'} onClick={weekNamesForm} />
          </>
        )}
        <Li icon="clock" label="Время пар" value={fLessons(D.bells.length)} onClick={() => push('bells')} />
        <Li icon="layers" label="Предметы" value={String(D.subjects.length)} onClick={() => push('subjects')} />
        <Li icon="sun" label="Каникулы и выходные" value={String(D.holidays.length)} onClick={() => push('holidays')} />
        <SwRow icon="cal" label="Показывать субботу" checked={s.showSaturday} onChange={v => set('showSaturday', v)} />
        <SwRow icon="cal" label="Показывать воскресенье" checked={s.showSunday} onChange={v => set('showSunday', v)} />
      </div>
      <Sec>Нагрузка и подготовка</Sec>
      <div class="list">
        <SelRow icon="alert" label="Загруженный день от" value={s.busyMin} onChange={v => set('busyMin', v)}
          options={[[60, '1 ч работы'], [90, '1,5 ч'], [120, '2 ч'], [150, '2,5 ч'], [180, '3 ч'], [240, '4 ч']]} />
        <SelRow icon="book" label="ДЗ обычно занимает" value={s.hwDefaultMin} onChange={v => set('hwDefaultMin', v)}
          options={[[15, '15 мин'], [20, '20 мин'], [30, '30 мин'], [45, '45 мин'], [60, '1 ч'], [90, '1,5 ч'], [120, '2 ч']]} />
        <SelRow icon="bell" label="ДЗ срочное за" value={s.hwRemindDays} options={dOpts(1, 7)} onChange={v => set('hwRemindDays', v)} />
        <SelRow icon="cap" label="Экзамен срочный за" value={s.examRemindDays} options={dOpts(1, 14)} onChange={v => set('examRemindDays', v)} />
      </div>
      <Sec>Оформление</Sec>
      <div class="list">
        <SelRow icon="sun" label="Тема" value={s.theme} options={[[0, 'Как в системе'], [1, 'Светлая'], [2, 'Тёмная']]} onChange={v => set('theme', v)} />
      </div>
      <Sec>Приложение</Sec>
      <div class="list">
        {!isApp && <Li icon="phone" label="Установить на главный экран" value={isStandalone() ? 'установлено' : undefined} onClick={() => push('install')} />}
        <Li icon="cal" label="Выгрузить в календарь" value="с напоминаниями" onClick={icsForm} />
      </div>
      <Sec>Данные</Sec>
      <div class="list">
        <Li icon="down" label="Сохранить резервную копию" value={lb} onClick={doBackup} />
        <Li icon="up" label="Загрузить из файла" onClick={doImport} />
        <Li icon="share" label="Поделиться расписанием" onClick={shareSchedule} />
        <Li icon="trash" label="Удалить все данные" onClick={wipe} danger />
      </div>
      <p class="hint">StuStu · версия {APP_VERSION}{isAndroidApp ? ' · Android' : isApp ? ' · Windows' : ''}<br />Все данные хранятся только на этом устройстве{isApp ? '' : ', в браузере'}. Регулярно сохраняй резервную копию — её можно загрузить на любом устройстве.</p>
    </div>
  );
}

function BellsPage() {
  const tpl = (uni: boolean) => confirmBox('Заменить время пар?', uni ? 'Будет 6 пар по 90 минут.' : 'Будет 7 уроков по 45 минут.', 'Заменить',
    () => { D.bells = uni ? UNI_BELLS() : SCHOOL_BELLS(); commit(); });
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title="Время пар" sub="Звонки общие для всех дней" />
      <div class="list">
        {D.bells.map((b, i) => <button class="li" onClick={() => bellForm(i)}><span class="grow">{i + 1} пара</span><span class="lv">{fRange(b.start, b.end)}</span><Icon n="chevR" s={18} class="chev" /></button>)}
      </div>
      <button class="btn wide" onClick={() => bellForm(D.bells.length)}><Icon n="plus" s={18} />Добавить пару</button>
      <Sec>Шаблоны</Sec>
      <div class="list">
        <button class="li" onClick={() => tpl(true)}><span class="grow">Вуз: 6 пар по 1,5 часа (9:00–19:10)</span></button>
        <button class="li" onClick={() => tpl(false)}><span class="grow">Школа: 7 уроков по 45 минут</span></button>
      </div>
    </div>
  );
}

function SubjectsPage() {
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title="Предметы" sub="Нажми на предмет, чтобы изменить" />
      {D.subjects.length ? (
        <div class="list">
          {D.subjects.map(s => (
            <button class="li" onClick={() => subjectForm(s)}>
              <Dot sid={s.id} size={12} /><span class="grow">{s.name}{s.teacher && <div class="small muted">{s.teacher}</div>}</span>
              <span class="lv">{fLessons(D.lessons.filter(l => l.subjectId === s.id).length)}</span>
            </button>
          ))}
        </div>
      ) : <Empty>Предметов пока нет.</Empty>}
      <button class="btn wide" onClick={() => subjectForm(null)}><Icon n="plus" s={18} />Новый предмет</button>
    </div>
  );
}

function HolidaysPage() {
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title="Каникулы и выходные" sub="В эти дни пары не показываются" />
      {D.holidays.length ? (
        <div class="list">
          {D.holidays.slice().sort((a, b) => a.from - b.from).map(x => (
            <button class="li" onClick={() => holidayForm(x)}><Icon n="sun" /><span class="grow">{x.title}</span><span class="lv">{fDM(x.from)} – {fDM(x.to)}</span></button>
          ))}
        </div>
      ) : <Empty>Каникул не добавлено.</Empty>}
      <button class="btn wide" onClick={() => holidayForm(null)}><Icon n="plus" s={18} />Добавить</button>
    </div>
  );
}

/* ---------- Установка ---------- */

function Steps({ items }: { items: ComponentChildren[] }) {
  return <div class="card">{items.map((x, i) => <div class="step"><span class="n">{i + 1}</span><div class="grow">{x}</div></div>)}</div>;
}
function InstallPage() {
  const p = platform(), done = isStandalone();
  const ask = async () => { if (await promptInstall()) toast('StuStu установлен'); };
  return (
    <div class="narrow">
      <BackBtn />
      <Hdr title="Установка" sub="StuStu ставится прямо из браузера, без магазина приложений" />
      {done && <div class="loadbadge ok"><Icon n="check" s={18} /><div class="grow"><b>Уже установлено</b><div class="small">Ты открыл StuStu как приложение.</div></div></div>}
      {!done && canPromptInstall() && <button class="btn pri wide first" onClick={ask}><Icon n="down" s={18} />Установить StuStu</button>}

      <Sec>iPhone и iPad{p === 'ios' ? ' · твоё устройство' : ''}</Sec>
      {p === 'ios' && !isIosSafari() && <div class="loadbadge l2"><Icon n="alert" s={18} /><div class="grow small">Открой эту страницу в Safari: в других браузерах на iPhone установка может быть недоступна.</div></div>}
      <Steps items={[
        <>Открой StuStu в <b>Safari</b>.</>,
        <>Нажми кнопку <b>«Поделиться»</b> <Icon n="share" s={16} class="inline" /> внизу экрана.</>,
        <>Выбери <b>«На экран „Домой“»</b> и нажми «Добавить».</>,
      ]} />
      <div class="loadbadge l1"><Icon n="alert" s={18} /><div class="grow small">На iPhone у приложения с иконки своя память. Если ты уже вводил данные в Safari, сначала сохрани резервную копию, а в установленном приложении загрузи её.</div></div>

      <Sec>Android{p === 'android' ? ' · твоё устройство' : ''}</Sec>
      <Steps items={[
        <>Открой StuStu в <b>Chrome</b>.</>,
        <>Нажми меню <b>⋮</b> вверху справа.</>,
        <>Выбери <b>«Установить приложение»</b> или «Добавить на главный экран».</>,
      ]} />

      <Sec>Windows{p === 'desktop' ? ' · компьютер' : ''}</Sec>
      <Steps items={[
        <>Открой StuStu в <b>Edge</b> или <b>Chrome</b>.</>,
        <>В адресной строке справа нажми значок установки <Icon n="down" s={16} class="inline" />. В Edge: меню «…» → «Приложения» → «Установить этот сайт как приложение».</>,
        <>StuStu появится в меню «Пуск», его можно закрепить на панели задач.</>,
      ]} />
      <p class="hint">После установки StuStu открывается и без интернета.</p>
    </div>
  );
}

export function PageView({ page }: { page: Page }) {
  const id = page.p.id ?? -1;
  switch (page.name) {
    case 'event': return <EventPage id={id} />;
    case 'subject': return <SubjectPage id={id} />;
    case 'attend': return <AttendPage />;
    case 'settings': return <SettingsPage />;
    case 'bells': return <BellsPage />;
    case 'subjects': return <SubjectsPage />;
    case 'holidays': return <HolidaysPage />;
    case 'install': return <InstallPage />;
    default: back(); return null;
  }
}
