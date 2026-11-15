// Вкладка «Сегодня»: табло текущей пары, маршрут дня, нагрузка, экзамены, ДЗ.

import { LVL_TXT, TYPES } from '../lib/consts';
import { DAY, DOW_FULL, DOW_SHORT, dowOf, fDayMonth, fDays, fDur, fFull, fLessons, fRel, fShort, fTime, msAt, todayE, ymd } from '../lib/dates';
import {
  activeHw, dayLoad, dayNotes, eventTitle, holidayOn, loadAdvice, loadSummary, nowState, occSubtitle, occurrences, subjColor, subjName,
  unmarkedPast, unmarkedToday, upcomingEvents, weekLabel, type NowState,
} from '../lib/logic';
import { goTab, push } from '../lib/nav';
import { D, S, commit } from '../lib/store';
import type { Occ } from '../lib/types';
import { doBackup, doImport } from '../forms/data';
import { occSheet } from '../forms/occ';
import { Icon } from '../ui/icons';
import { isStandalone } from '../lib/install';
import { AttButtons, Countdown, Dot, EventCard, Hdr, HwItem, NoteItem, OccChips, RouteView, Sec, SettingsBtn, Track } from '../ui/parts';

function NextRow({ o, label }: { o: Occ; label: string }) {
  return (
    <div class="board-next">
      <div class="bn-time"><span>{label}</span><b>{fTime(o.start)}</b></div>
      <i style={{ background: subjColor(o.sid) }} />
      <div class="grow">
        <div class="bn-title">{subjName(o.sid)}</div>
        <div class="bn-sub">{occSubtitle(o)}</div>
      </div>
    </div>
  );
}

function NextInfo({ n }: { n: Occ | null }) {
  if (!n) return <div class="board-note">Ближайших пар в расписании нет.</div>;
  const d = n.e - todayE();
  return (
    <>
      <div class="board-hr" />
      <NextRow o={n} label={d === 0 ? 'Далее' : d === 1 ? 'Завтра' : fShort(n.e)} />
      <OccChips o={n} full />
    </>
  );
}

/** Табло: что происходит прямо сейчас. */
function Board({ st }: { st: Exclude<NowState, { type: 'empty' }> }) {
  let tap: Occ | null = null;
  let body;
  if (st.type === 'lesson') {
    const o = st.occ, n = st.next; tap = o;
    const gap = n ? n.start - o.end : 0;
    body = (
      <>
        <div class="board-top"><span class="pill">Сейчас</span><span>{o.bell} пара · {TYPES[o.l.type].toLowerCase()}{o.l.room ? ' · ауд. ' + o.l.room : ''}</span></div>
        <div class="board-title">{subjName(o.sid)}</div>
        <div class="board-cd"><Countdown to={msAt(o.e, o.end)} /><span>до конца пары</span></div>
        <Track from={msAt(o.e, o.start)} to={msAt(o.e, o.end)} labels={[fTime(o.start), fTime(o.end)]} />
        <OccChips o={o} full />
        <div class="board-hr" />
        {n ? <><NextRow o={n} label="Далее" /><div class="board-note">{gap > 0 ? `Перемена ${fDur(gap)}` : ''}</div></> : <div class="board-note strong">Это последняя пара сегодня</div>}
      </>
    );
  } else if (st.type === 'wait') {
    const n = st.next, p = st.prev; tap = n;
    body = (
      <>
        <div class="board-top"><span class="pill">{p ? 'Перемена' : 'Скоро первая пара'}</span><span>{n.bell} пара · {TYPES[n.l.type].toLowerCase()}{n.l.room ? ' · ауд. ' + n.l.room : ''}</span></div>
        <div class="board-title">{subjName(n.sid)}</div>
        <div class="board-cd"><Countdown to={msAt(n.e, n.start)} /><span>до начала в {fTime(n.start)}</span></div>
        {p && <Track from={msAt(p.e, p.end)} to={msAt(n.e, n.start)} labels={[fTime(p.end), fTime(n.start)]} />}
        <OccChips o={n} full />
      </>
    );
  } else if (st.type === 'done') {
    tap = st.next;
    body = (
      <>
        <div class="board-title">Пары на сегодня закончились</div>
        <div class="board-note">Можно отдохнуть или заняться заданиями.</div>
        <NextInfo n={st.next} />
      </>
    );
  } else {
    tap = st.next;
    body = (
      <>
        <div class="board-title">{st.holiday ? st.holiday.title : 'Сегодня пар нет'}</div>
        {st.holiday && <div class="board-note">До {fDayMonth(st.holiday.to)} включительно</div>}
        <NextInfo n={st.next} />
      </>
    );
  }
  const o = tap;
  return o
    ? <button class="board" onClick={() => occSheet(o)} aria-label="Открыть меню пары">{body}</button>
    : <section class="board">{body}</section>;
}

function Welcome() {
  return (
    <div class="card welcome">
      <h2>Добро пожаловать в StuStu</h2>
      <p class="muted">Заполни расписание — и StuStu будет показывать текущую пару, напоминать о ДЗ и экзаменах, считать подготовку и посещаемость.</p>
      <button class="btn pri wide" onClick={doImport}><Icon n="up" s={18} />Загрузить резервную копию</button>
      <div class="hr" />
      <div class="small muted">Или заполнить вручную:</div>
      <div class="step"><span class="n">1</span><div class="grow"><b>Время пар</b><div class="small muted">Когда начинается и кончается каждая пара</div></div><button class="btn" onClick={() => push('bells')}>Открыть</button></div>
      <div class="step"><span class="n">2</span><div class="grow"><b>Недели</b><div class="small muted">Сколько недель в цикле и какая идёт сейчас</div></div><button class="btn" onClick={() => push('settings')}>Открыть</button></div>
      <div class="step"><span class="n">3</span><div class="grow"><b>Предметы и пары</b><div class="small muted">Добавь пары во вкладке «Расписание»</div></div><button class="btn" onClick={() => goTab('sched')}>Перейти</button></div>
    </div>
  );
}

/** Нагрузка на ближайшие семь дней. */
function WeekLoad() {
  const t = todayE();
  const loads = [...Array(7)].map((_, i) => dayLoad(t + i));
  const scale = Math.max(S().busyMin * 2, ...loads.map(l => l.min));
  const busy = loads.filter(l => l.lvl >= 2);
  const any = loads.some(l => l.lvl > 0);
  return (
    <div class="card">
      <div class="week">
        {loads.map(l => (
          <button class={`wd l${l.lvl}${l.e === t ? ' today' : ''}`} onClick={() => goTab('sched', { sel: l.e })}
            aria-label={`${DOW_FULL[dowOf(l.e) - 1]}: ${LVL_TXT[l.lvl]}`}>
            <span class="wm">{l.evs.length ? '!' : ''}</span>
            <span class="wb"><i style={{ height: (l.min > 0 ? Math.max(6, Math.round(56 * Math.min(1, l.min / scale))) : l.hws.length ? 6 : 0) + 'px' }} /></span>
            <span class="wl"><b>{DOW_SHORT[dowOf(l.e) - 1]}</b>{ymd(l.e)[2]}</span>
          </button>
        ))}
      </div>
      {busy.length ? busy.slice(0, 3).map(l => (
        <button class={`warnrow l${l.lvl}`} onClick={() => goTab('sched', { sel: l.e })}>
          <Icon n="alert" s={18} />
          <div class="grow">
            <div><b>{l.e === t ? 'Сегодня' : l.e === t + 1 ? 'Завтра' : fShort(l.e)}</b> — {LVL_TXT[l.lvl]}</div>
            <div class="small muted">{loadSummary(l)}</div>
            <div class="small">{loadAdvice(l)}</div>
          </div>
        </button>
      )) : <div class="small muted week-note">{any ? 'Неделя без перегрузок — задания распределены ровно.' : 'На неделю заданий нет.'}</div>}
    </div>
  );
}

export function Home() {
  const t = todayE(), st = nowState(), hol = holidayOn(t);
  const [wd, dm] = [DOW_FULL[dowOf(t) - 1], fDayMonth(t)];
  const head = <Hdr eyebrow={hol ? hol.title : weekLabel(t)} title={<>{wd}<br /><span>{dm}</span></>} right={<SettingsBtn />} />;
  if (st.type === 'empty') return <>{head}<Welcome /></>;

  const todays = occurrences(t, true);
  const showToday = (st.type === 'lesson' || st.type === 'wait') && todays.length > 0;
  const toMark = showToday ? [] : unmarkedToday();
  const earlier = unmarkedPast(14);
  const nextDay = !showToday && st.next ? st.next.e : null;
  const nextOccs = nextDay != null ? occurrences(nextDay, true) : [];
  const liveToday = todays.filter(o => !o.cancelled);

  const ev = upcomingEvents();
  const soon = ev.filter(x => x.day - t <= Math.max(21, x.remindDays));
  const act = activeHw();
  const urgent = act.filter(x => x.dueDay - t <= Math.max(1, x.remindDays));
  const pinned = D.notes.filter(n => n.pinned);
  const dn = dayNotes(t).filter(n => !n.pinned);
  const lb = S().lastBackup, ago = lb ? Math.floor((Date.now() - lb) / DAY) : null;

  return (
    <>
      {head}
      <div class="home-grid">
        <div class="col">
          <Board st={st} />

          {showToday && (
            <>
              <Sec right={<span class="sec-note">{fLessons(liveToday.length)} · до {fTime(liveToday[liveToday.length - 1].end)}</span>}>Маршрут дня</Sec>
              <RouteView occs={todays} marks />
            </>
          )}
          {nextDay != null && (
            <>
              <Sec right={<span class="sec-note">{fLessons(nextOccs.filter(o => !o.cancelled).length)}</span>}>{nextDay - t === 1 ? 'Завтра' : fFull(nextDay)}</Sec>
              <RouteView occs={nextOccs} />
              {dayNotes(nextDay).map(n => <NoteItem n={n} />)}
            </>
          )}

          {(toMark.length > 0 || earlier.length > 0) && (
            <>
              {toMark.length > 0 && <Sec>Отметь посещение</Sec>}
              <div class="card att-card">
                {toMark.map(o => (
                  <div class="attrow">
                    <Dot sid={o.sid} />
                    <div class="grow"><div class="att-name">{subjName(o.sid)}</div><div class="small muted">{o.bell} пара · {TYPES[o.l.type]}</div></div>
                    <AttButtons okey={o.key} />
                  </div>
                ))}
                {earlier.length > 0 && (
                  <button class="attrow link" onClick={() => push('attend')}>
                    <span class="grow small muted">Не отмечено за прошлые дни: <b>{fLessons(earlier.length)}</b></span><Icon n="chevR" s={18} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div class="col">
          <Sec>Неделя</Sec>
          <WeekLoad />

          {soon.length > 0 && (
            <>
              <Sec right={<button class="lnk" onClick={() => goTab('tasks', { seg: 'ev' })}>Все</button>}>Впереди</Sec>
              {soon.slice(0, 3).map(x => <EventCard x={x} />)}
            </>
          )}
          {!soon.length && ev.length > 0 && ev[0].day - t <= 60 && (
            <button class="item line" onClick={() => push('event', { id: ev[0].id })}>
              <Icon n="cap" s={18} /><span class="grow small">Ближайшее: <b>{eventTitle(ev[0])}</b> — {fRel(ev[0].day - t)}</span>
            </button>
          )}

          {urgent.length > 0 && (
            <>
              <Sec right={<button class="lnk" onClick={() => goTab('tasks', { seg: 'hw' })}>Все задания · {act.length}</button>}>Пора сделать</Sec>
              {urgent.slice(0, 6).map(h => <HwItem h={h} />)}
            </>
          )}
          {!urgent.length && act.length > 0 && (
            <button class="item line" onClick={() => goTab('tasks', { seg: 'hw' })}>
              <Icon n="book" s={18} /><span class="grow small">Срочных ДЗ нет. Активных: <b>{act.length}</b></span><Icon n="chevR" s={18} />
            </button>
          )}

          {(pinned.length > 0 || dn.length > 0) && (
            <>
              <Sec>Заметки</Sec>
              {pinned.concat(dn).map(n => <NoteItem n={n} />)}
            </>
          )}

          {(ago == null || ago >= 14) && (
            <div class="item line backup">
              <Icon n="down" s={18} />
              <div class="grow small"><b>Резервная копия</b><div class="muted">{ago == null ? 'Ещё ни разу не сохранялась' : 'Последняя — ' + fDays(ago) + ' назад'}. Данные хранятся только на этом устройстве.</div></div>
              <button class="btn" onClick={doBackup}>Сохранить</button>
            </div>
          )}
          {!isStandalone() && !S().installHintOff && (
            <div class="item line backup">
              <Icon n="phone" s={18} />
              <div class="grow small"><b>Поставь StuStu как приложение</b><div class="muted">Иконка на главном экране, запуск без браузера и без интернета.</div></div>
              <div class="col-btns">
                <button class="btn" onClick={() => push('install')}>Как</button>
                <button class="lnk" onClick={() => { S().installHintOff = true; commit(); }}>Скрыть</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
