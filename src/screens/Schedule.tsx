// Вкладка «Расписание»: неделя, выбранный день и его маршрут.

import { LVL_TXT, TYPES } from '../lib/consts';
import { DOW_ACC, DOW_FULL, DOW_SHORT, dowOf, fDM, fDMShort, fFull, fLessons, fRange, mondayOf, msAt, todayE, ymd } from '../lib/dates';
import {
  dayLoad, dayNotes, eventsFor, eventsOn, holidayOn, hwFor, kindName, loadSummary, occurrences, subjColor, subjName, visibleDays, weekIndex,
  weekLabel, weekName,
} from '../lib/logic';
import { R } from '../lib/nav';
import { D, S, emit } from '../lib/store';
import { holidayForm } from '../forms/basic';
import { occSheet } from '../forms/occ';
import { Icon } from '../ui/icons';
import { Empty, EventCard, Hdr, HwItem, NoteItem, RouteView, Sec, SettingsBtn } from '../ui/parts';

const selDay = (e: number) => { R.sel = e; emit(); };

export function Schedule() {
  const t = todayE(), days = visibleDays();
  if (R.sel == null) R.sel = t;
  if (!days.includes(dowOf(R.sel))) R.sel = mondayOf(R.sel) + 7;
  const sel = R.sel, mon = mondayOf(sel), isCur = mon === mondayOf(t);
  const wl = S().cycleWeeks > 1 ? weekName(weekIndex(mon)) : 'Каждая неделя одинаковая';
  const L = dayLoad(sel), hol = holidayOn(sel);
  const occs = occurrences(sel, true);
  const loose = eventsOn(sel).filter(x => !occs.some(o => eventsFor(o).some(y => y.id === x.id)));
  const looseHw = D.homework.filter(x => !x.done && x.dueDay === sel && !occs.some(o => hwFor(o).some(y => y.id === x.id)));
  const notes = dayNotes(sel, occs.filter(o => !o.cancelled));
  const now = Date.now();

  return (
    <>
      <Hdr eyebrow={weekLabel(sel)} title="Расписание" right={<SettingsBtn />} />

      <div class="weeknav">
        <button class="navb" aria-label="Предыдущая неделя" onClick={() => selDay(sel - 7)}><Icon n="chevL" s={22} w={2.2} /></button>
        <div class="mid"><b>{ymd(mon)[2]} – {fDMShort(mon + 6)}</b><span class={isCur ? 'cur' : ''}>{wl}{isCur ? ' · эта неделя' : ''}</span></div>
        <button class="navb" aria-label="Следующая неделя" onClick={() => selDay(sel + 7)}><Icon n="chevR" s={22} w={2.2} /></button>
      </div>

      {/* Телефон: полоска дней. Точки — пары этого дня в цветах предметов. */}
      <div class="days only-mobile" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map(dw => {
          const e = mon + dw - 1, list = occurrences(e), dl = dayLoad(e);
          return (
            <button class={`dc${e === sel ? ' sel' : ''}${e === t ? ' today' : ''}`} aria-pressed={e === sel}
              aria-label={`${DOW_FULL[dw - 1]}, ${fDM(e)}: ${fLessons(list.length)}${dl.evs.length ? ', есть экзамен или контрольная' : ''}`} onClick={() => selDay(e)}>
              <span class={dl.evs.length ? 'ev' : ''}>{DOW_SHORT[dw - 1]}{dl.evs.length ? ' !' : ''}</span>
              <b>{ymd(e)[2]}</b>
              <i>{list.slice(0, 5).map(o => <u style={{ background: subjColor(o.sid) }} />)}</i>
            </button>
          );
        })}
      </div>

      {/* Компьютер: вся неделя сразу. */}
      <div class="weekgrid only-desktop" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map(dw => {
          const e = mon + dw - 1, list = occurrences(e, true), dl = dayLoad(e), h = holidayOn(e);
          return (
            <div class={`wg-col${e === sel ? ' sel' : ''}${e === t ? ' today' : ''}`}>
              <button class="wg-head" aria-pressed={e === sel} onClick={() => selDay(e)}>
                <span>{DOW_SHORT[dw - 1]}</span><b>{ymd(e)[2]}</b>
                {dl.lvl >= 2 && <em class={dl.lvl >= 3 || dl.evs.length ? 'danger' : 'warn'}>{dl.evs.length ? kindName(dl.evs[0]).toLowerCase() : dl.hws.length + ' ДЗ'}</em>}
              </button>
              {h && <div class="wg-empty">{h.title}</div>}
              {!h && !list.length && <div class="wg-empty">Пар нет</div>}
              {list.map(o => {
                const cur = !o.cancelled && now >= msAt(o.e, o.start) && now < msAt(o.e, o.end);
                const marks = eventsFor(o).length ? 'danger' : hwFor(o).length ? 'warn' : '';
                return (
                  <button class={`wg-occ${o.cancelled ? ' canc' : ''}${cur ? ' cur' : ''}${msAt(o.e, o.end) < now ? ' past' : ''}`}
                    style={{ borderLeftColor: o.cancelled ? undefined : subjColor(o.sid) }} onClick={() => { R.sel = e; occSheet(o); emit(); }}>
                    <span class="wg-time">{fRange(o.start, o.end)}</span>
                    <b>{subjName(o.sid)}</b>
                    <span class="wg-sub">{o.cancelled ? 'Отменена' : TYPES[o.l.type]}{o.l.room ? ' · ' + o.l.room : ''}</span>
                    {marks && <span class={'wg-mark ' + marks}>{marks === 'danger' ? 'Контрольная или экзамен' : 'Сдать ДЗ'}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {(!isCur || sel !== t) && <button class="lnk back-today" onClick={() => selDay(t)}>Вернуться к сегодня</button>}

      <Sec right={<span class="sec-note">{sel === t ? 'сегодня · ' : sel === t + 1 ? 'завтра · ' : ''}{fLessons(occs.filter(o => !o.cancelled).length)}</span>}>{fFull(sel)}</Sec>

      {L.lvl >= 1 && (L.hws.length > 0 || L.evs.length > 0) && (
        <div class={`loadbadge l${L.lvl}`}>
          <Icon n={L.lvl >= 2 ? 'alert' : 'clock'} s={18} />
          <div class="grow"><b>{LVL_TXT[L.lvl][0].toUpperCase() + LVL_TXT[L.lvl].slice(1)}</b><div class="small">{loadSummary(L)}</div></div>
        </div>
      )}
      {hol && (
        <button class="item line" onClick={() => holidayForm(hol)}>
          <Icon n="sun" s={18} /><span class="grow"><b>{hol.title}</b><div class="small muted">{fDM(hol.from)} – {fDM(hol.to)}, пар нет</div></span>
        </button>
      )}
      {loose.map(x => <EventCard x={x} />)}
      {!occs.length && !hol && <Empty title="Пар нет">Нажми «+», чтобы добавить пару на {DOW_ACC[dowOf(sel) - 1]}</Empty>}

      <RouteView occs={occs} marks={sel <= t} />

      {looseHw.length > 0 && <><Sec>ДЗ к этому дню</Sec>{looseHw.map(h => <HwItem h={h} />)}</>}
      {notes.length > 0 && <><Sec>Заметки на день</Sec>{notes.map(n => <NoteItem n={n} />)}</>}
      {occs.length > 0 && <p class="hint">Нажми на пару, чтобы отметить посещение, записать ДЗ, заметку или контрольную.</p>}
    </>
  );
}
