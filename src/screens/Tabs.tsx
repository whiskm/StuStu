// Вкладки «Задания», «Заметки» и «Статистика».

import { LVL_TXT, TYPES } from '../lib/consts';
import { fDMShort, fDur, fFull, fLessons, fRel, fShort, todayE, ymd } from '../lib/dates';
import {
  activeHw, attPct, attStats, dayLoad, earliestAtt, goalOf, loadSummary, pastEvents, prepSum, subjName, targetLabel, upcomingEvents,
} from '../lib/logic';
import { R, goTab, push } from '../lib/nav';
import { D, commit, emit } from '../lib/store';
import type { Homework } from '../lib/types';
import { prepForm, startTimer } from '../forms/study';
import { Icon } from '../ui/icons';
import { Bar, Chip, Dot, Empty, EventCard, Hdr, HwItem, NoteItem, Sec } from '../ui/parts';
import { confirmBox } from '../ui/sheets';

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div class="seg" role="tablist">
      {options.map(([v, l]) => <button role="tab" aria-selected={value === v} class={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

/* ---------- Задания ---------- */

export function Tasks() {
  const t = todayE();
  const head = (
    <>
      <Hdr title="Задания" />
      <Seg value={R.seg} options={[['hw', 'Домашние'], ['ev', 'Экзамены']]} onChange={v => { R.seg = v; emit(); window.scrollTo(0, 0); }} />
    </>
  );
  if (R.seg === 'hw') {
    const act = activeHw(), done = D.homework.filter(x => x.done).sort((a, b) => b.doneDay - a.doneDay);
    const od = act.filter(x => x.dueDay < t);
    const byDay = new Map<number, Homework[]>();
    for (const x of act.filter(x => x.dueDay >= t)) { if (!byDay.has(x.dueDay)) byDay.set(x.dueDay, []); byDay.get(x.dueDay)!.push(x); }
    return (
      <>
        {head}
        {!act.length && <Empty title="Всё сделано">Новое ДЗ можно добавить кнопкой «+» или нажав на пару в расписании.</Empty>}
        {od.length > 0 && <><Sec><span class="danger-text">Просрочено</span></Sec>{od.map(h => <HwItem h={h} />)}</>}
        {[...byDay].map(([e, list]) => {
          const L = dayLoad(e);
          return (
            <>
              <Sec right={L.lvl >= 2 ? <Chip kind={L.lvl >= 3 ? 'danger' : 'warn'}>{LVL_TXT[L.lvl]}</Chip> : undefined}>{fFull(e)} · {fRel(e - t)}</Sec>
              {list.map(h => <HwItem h={h} />)}
            </>
          );
        })}
        {done.length > 0 && (
          <>
            <Sec right={<button class="lnk" onClick={() => { R.showDone = !R.showDone; emit(); }}>{R.showDone ? 'Скрыть' : 'Показать'}</button>}>Выполненные · {done.length}</Sec>
            {R.showDone && (
              <>
                {done.slice(0, 50).map(h => <HwItem h={h} />)}
                <button class="btn danger wide" onClick={() => confirmBox('Удалить выполненные ДЗ?', `Будет удалено заданий: ${done.length}. Статистика по ним пропадёт.`, 'Удалить',
                  () => { D.homework = D.homework.filter(x => !x.done); commit(); }, true)}>Удалить выполненные</button>
              </>
            )}
          </>
        )}
      </>
    );
  }
  const up = upcomingEvents(), past = pastEvents();
  return (
    <>
      {head}
      {!up.length
        ? <Empty title="Экзаменов не запланировано">Добавь экзамен или контрольную — StuStu поможет распределить подготовку.</Empty>
        : <><Sec>Предстоящие</Sec>{up.map(x => <EventCard x={x} />)}</>}
      {past.length > 0 && (
        <>
          <Sec right={<button class="lnk" onClick={() => { R.showPast = !R.showPast; emit(); }}>{R.showPast ? 'Скрыть' : 'Показать'}</button>}>Прошедшие · {past.length}</Sec>
          {R.showPast && (
            <>
              {past.map(x => <EventCard x={x} />)}
              <button class="btn danger wide" onClick={() => confirmBox('Удалить прошедшие события?', 'Записи подготовки останутся в статистике предметов.', 'Удалить', () => {
                const ids = new Set(pastEvents().map(x => x.id));
                D.events = D.events.filter(x => !ids.has(x.id));
                D.prep.forEach(p => { if (ids.has(p.eventId)) p.eventId = -1; });
                commit();
              }, true)}>Удалить прошедшие</button>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ---------- Заметки ---------- */

export function Notes() {
  const t = todayE();
  if (!D.notes.length) {
    return <><Hdr title="Заметки" /><Empty title="Заметок нет">Заметку можно привязать к дню, к паре, к предмету или повторять по расписанию.</Empty></>;
  }
  const pinned = D.notes.filter(n => n.pinned);
  const rec = D.notes.filter(n => !n.pinned && (n.attach === 'RECURRING' || n.attach === 'SUBJECT'));
  const dated = D.notes.filter(n => !n.pinned && (n.attach === 'DATE' || n.attach === 'LESSON')).sort((a, b) => a.day - b.day);
  const fut = dated.filter(n => n.day >= t), past = dated.filter(n => n.day < t).reverse();
  const gen = D.notes.filter(n => !n.pinned && n.attach === 'GENERAL').sort((a, b) => b.created - a.created);
  const groups: [string, typeof pinned][] = [['Важные', pinned], ['Предстоящие', fut], ['Повторяющиеся', rec], ['Без привязки', gen], ['Прошедшие', past]];
  return (
    <>
      <Hdr title="Заметки" sub={`Всего: ${D.notes.length}`} />
      <div class="cols">
        {groups.filter(([, l]) => l.length).map(([title, list]) => <div><Sec>{title}</Sec>{list.map(n => <NoteItem n={n} />)}</div>)}
      </div>
    </>
  );
}

/* ---------- Статистика ---------- */

function periodRange(): [number, number] {
  const t = todayE();
  if (R.per === 'week') return [t - 6, t];
  if (R.per === 'month') return [t - 29, t];
  let m = earliestAtt();
  for (const p of D.prep) if (p.day < m) m = p.day;
  for (const x of D.homework) if (x.created < m) m = x.created;
  return [Math.max(m, t - 365), t];
}
const pctColor = (p: number | null) => (p == null ? 'var(--muted)' : p >= 80 ? 'var(--ok)' : p >= 60 ? 'var(--warn)' : 'var(--danger)');

function StatsAtt({ from, to }: { from: number; to: number }) {
  const r = attStats(from, to), pct = attPct(r);
  const subs = Object.keys(r.by).map(Number).map(id => ({ id, b: r.by[id], p: attPct(r.by[id]) }))
    .sort((a, b) => +(a.p == null) - +(b.p == null) || (a.p ?? 0) - (b.p ?? 0));
  const low = subs.filter(x => x.p != null && x.p < 70);
  const types = Object.entries(r.byType).filter(([, b]) => b.p + b.l + b.a > 0);
  return (
    <>
      <div class="card top">
        <div class="small muted">Посещаемость</div>
        <div class="big" style={{ color: pctColor(pct) }}>{pct == null ? '—' : pct + '%'}</div>
        <div class="kv"><span>Был <b>{r.p}</b></span><span>Опоздал <b>{r.l}</b></span><span>Не был <b>{r.a}</b></span><span>Уважительная <b>{r.e}</b></span></div>
        {r.u > 0 && <button class="rowlink" onClick={() => push('attend')}><span class="grow small muted">Не отмечено: <b>{fLessons(r.u)}</b></span><span class="lnk">Отметить</span></button>}
      </div>
      {subs.length ? (
        <>
          <Sec>По предметам</Sec>
          <div class="card">
            {subs.map(x => {
              const den = x.b.p + x.b.l + x.b.a;
              return (
                <button class="srow" onClick={() => push('subject', { id: x.id })}>
                  <div class="sh1"><Dot sid={x.id} /><span class="grow">{subjName(x.id)}</span><span class="v">{x.p == null ? '—' : x.p + '%'}</span></div>
                  <Bar pct={x.p || 0} kind={x.p != null && x.p < 60 ? 'warn' : 'ok'} />
                  <div class="small muted">{den ? `${x.b.p + x.b.l} из ${den}` : 'нет отметок'}{x.b.a ? ` · пропусков ${x.b.a}` : ''}{x.b.u ? ` · не отмечено ${x.b.u}` : ''}</div>
                </button>
              );
            })}
          </div>
          {low.length > 0 && <div class="loadbadge l2"><Icon n="alert" s={18} /><div class="grow small">Мало посещений: {low.map(x => `${subjName(x.id)} (${x.p}%)`).join(', ')}</div></div>}
        </>
      ) : <Empty>Пока нет отметок. Отмечай посещение прямо на линии дня во вкладке «Сегодня».</Empty>}
      {types.length > 1 && (
        <>
          <Sec>По типам занятий</Sec>
          <div class="card">
            {types.map(([k, b]) => { const p = attPct(b) || 0; return <div class="srow"><div class="sh1"><span class="grow">{TYPES[k as keyof typeof TYPES]}</span><span class="v">{p}%</span></div><Bar pct={p} kind="ok" /></div>; })}
          </div>
        </>
      )}
    </>
  );
}

function StatsPrep({ from, to }: { from: number; to: number }) {
  const t = todayE();
  const list = D.prep.filter(p => p.day >= from && p.day <= to);
  const total = list.reduce((s, p) => s + p.min, 0), daysN = to - from + 1;
  let streak = 0;
  for (let e = t; streak <= 400; e--) { if (D.prep.some(p => p.day === e)) streak++; else if (e === t) continue; else break; }
  const cd = [...Array(14)].map((_, i) => ({ e: t - 13 + i, m: prepSum(p => p.day === t - 13 + i) }));
  const mx = Math.max(30, ...cd.map(c => c.m));
  const by: Record<number, number> = {};
  for (const p of list) by[p.subjectId] = (by[p.subjectId] || 0) + p.min;
  const subs = Object.entries(by).map(([id, m]) => ({ id: +id, m })).sort((a, b) => b.m - a.m);
  const ev = upcomingEvents().filter(x => goalOf(x) > 0);
  return (
    <>
      <div class="card top">
        <div class="small muted">Время подготовки</div>
        <div class="big">{fDur(total)}</div>
        <div class="kv"><span>В среднем <b>{fDur(total / daysN)}</b> в день</span><span>Занятий <b>{list.length}</b></span><span>Дней подряд <b>{streak}</b></span></div>
        <div class="chart" role="img" aria-label="Подготовка за последние 14 дней">
          {cd.map(c => <div class="cb" title={fDur(c.m)}><i class={c.m ? '' : 'z'} style={{ height: (c.m ? Math.max(4, Math.round((c.m / mx) * 88)) : 2) + 'px' }} /><span>{ymd(c.e)[2]}</span></div>)}
        </div>
        <div class="small muted center">последние 14 дней</div>
      </div>
      <div class="btns">
        <button class="btn pri" onClick={() => startTimer(null)}><Icon n="play" s={16} />Засечь</button>
        <button class="btn" onClick={() => prepForm(null)}><Icon n="plus" s={16} />Записать</button>
      </div>
      {subs.length ? (
        <>
          <Sec>По предметам</Sec>
          <div class="card">
            {subs.map(x => (
              <button class="srow" disabled={x.id < 0} onClick={() => push('subject', { id: x.id })}>
                <div class="sh1"><Dot sid={x.id} /><span class="grow">{x.id >= 0 ? subjName(x.id) : 'Без предмета'}</span><span class="v">{fDur(x.m)}</span></div>
                <Bar pct={Math.round((x.m / subs[0].m) * 100)} />
              </button>
            ))}
          </div>
        </>
      ) : <Empty>За этот период подготовки не записано.</Empty>}
      {ev.length > 0 && <><Sec>Готовность к экзаменам</Sec>{ev.slice(0, 6).map(x => <EventCard x={x} />)}</>}
      {list.length > 0 && (
        <>
          <Sec>Последние записи</Sec>
          <PrepList list={list.slice().sort((a, b) => b.day - a.day || b.ts - a.ts).slice(0, 15)} withTarget />
        </>
      )}
    </>
  );
}

/** Записи подготовки. Нажатие предлагает удалить запись. */
export function PrepList({ list, withTarget = false }: { list: typeof D.prep; withTarget?: boolean }) {
  return (
    <div class="list sessions">
      {list.map(p => (
        <button class="li" onClick={() => confirmBox('Удалить запись?', `${fDur(p.min)} · ${fShort(p.day)}`, 'Удалить', () => { D.prep = D.prep.filter(x => x.id !== p.id); commit(); }, true)}>
          {withTarget ? <Dot sid={p.subjectId} /> : <Icon n="clock" s={18} />}
          <span class="grow">
            {withTarget ? (p.eventId >= 0 ? targetLabel('e:' + p.eventId) : p.hwId >= 0 ? targetLabel('h:' + p.hwId) : subjName(p.subjectId) || 'Подготовка') : fShort(p.day)}
            {p.note && <div class="small muted">{p.note}</div>}
          </span>
          <span class="lv">{fDur(p.min)}{withTarget && <><br /><span class="small">{fDMShort(p.day)}</span></>}</span>
        </button>
      ))}
    </div>
  );
}

function StatsHw({ from, to }: { from: number; to: number }) {
  const t = todayE();
  const done = D.homework.filter(x => x.done && x.doneDay >= from && x.doneDay <= to);
  const ontime = done.filter(x => x.doneDay <= x.dueDay).length;
  const created = D.homework.filter(x => x.created >= from && x.created <= to);
  const od = D.homework.filter(x => !x.done && x.dueDay < t).length;
  const by: Record<number, { n: number; d: number }> = {};
  for (const x of created) { const b = by[x.subjectId] || (by[x.subjectId] = { n: 0, d: 0 }); b.n++; if (x.done) b.d++; }
  const subs = Object.entries(by).map(([id, b]) => ({ id: +id, b })).sort((a, b) => b.b.n - a.b.n);
  const heavy = [...Array(14)].map((_, i) => dayLoad(t + i)).filter(l => l.lvl >= 2);
  return (
    <>
      <div class="card top">
        <div class="small muted">Выполнено заданий</div>
        <div class="big">{done.length}</div>
        <div class="kv">
          <span>В срок <b>{done.length ? Math.round((ontime * 100) / done.length) + '%' : '—'}</b></span><span>Задано <b>{created.length}</b></span>
          <span>Активных <b>{activeHw().length}</b></span><span>Просрочено <b class={od ? 'danger-text' : ''}>{od}</b></span>
        </div>
      </div>
      {subs.length > 0 && (
        <>
          <Sec>По предметам</Sec>
          <div class="card">
            {subs.map(x => (
              <button class="srow" onClick={() => push('subject', { id: x.id })}>
                <div class="sh1"><Dot sid={x.id} /><span class="grow">{subjName(x.id)}</span><span class="v">{x.b.d} из {x.b.n}</span></div>
                <Bar pct={Math.round((x.b.d / x.b.n) * 100)} kind="ok" />
              </button>
            ))}
          </div>
        </>
      )}
      {heavy.length > 0 && (
        <>
          <Sec>Загруженные дни впереди</Sec>
          <div class="card">
            {heavy.map(l => (
              <button class="srow" onClick={() => goTab('sched', { sel: l.e })}>
                <div class="sh1"><Icon n="alert" s={16} class={l.lvl >= 3 ? 'danger-text' : 'warn-text'} /><span class="grow">{fShort(l.e)} — {LVL_TXT[l.lvl]}</span></div>
                <div class="small muted">{loadSummary(l)}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function Stats() {
  const [from, to] = periodRange();
  return (
    <>
      <Hdr title="Статистика" />
      <Seg value={R.sseg} options={[['att', 'Посещения'], ['prep', 'Подготовка'], ['hw', 'Задания']]} onChange={v => { R.sseg = v; emit(); window.scrollTo(0, 0); }} />
      <div class="pills">
        {([['week', 'Неделя'], ['month', 'Месяц'], ['all', 'Всё время']] as const).map(([v, l]) => (
          <button class={R.per === v ? 'on' : ''} aria-pressed={R.per === v} onClick={() => { R.per = v; emit(); }}>{l}</button>
        ))}
      </div>
      <div class="narrow">
        {R.sseg === 'att' ? <StatsAtt from={from} to={to} /> : R.sseg === 'prep' ? <StatsPrep from={from} to={to} /> : <StatsHw from={from} to={to} />}
      </div>
    </>
  );
}
