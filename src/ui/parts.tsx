// Общие блоки интерфейса.

import type { ComponentChildren } from 'preact';
import { ATT } from '../lib/consts';
import { cut, fCd, fDM, fDur, fRel, fTime, msAt, plural, todayE } from '../lib/dates';
import {
  evDone, eventTitle, eventWhenText, eventsFor, goalOf, hwDueText, hwEst, hwFor, kindName, noteAttachText, notesFor, occSubtitle,
  perDay, setAtt, subjColor, subjName,
} from '../lib/logic';
import { back, push } from '../lib/nav';
import { D, S, commit } from '../lib/store';
import type { AttMark, Homework, Note, Occ, StudyEvent } from '../lib/types';
import { occSheet } from '../forms/occ';
import { hwForm, noteForm, startTimer } from '../forms/study';
import { Icon, type IconName } from './icons';
import { useNow } from './hooks';
import { toast } from './toast';

export { useNow };

export function Hdr({ title, sub, eyebrow, right }: { title: ComponentChildren; sub?: ComponentChildren; eyebrow?: string; right?: ComponentChildren }) {
  return (
    <header class="hdr">
      <div class="ht">
        {eyebrow && <div class="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div class="sub">{sub}</div>}
      </div>
      {right}
    </header>
  );
}
export const SettingsBtn = () => (
  <button class="ibtn only-mobile" aria-label="Настройки" onClick={() => push('settings')}><Icon n="sliders" /></button>
);
export const BackBtn = ({ label = 'Назад' }: { label?: string }) => (
  <button class="backbtn" onClick={back}><Icon n="chevL" s={22} />{label}</button>
);
export function Sec({ children, right }: { children: ComponentChildren; right?: ComponentChildren }) {
  return <div class="sec"><h2>{children}</h2>{right}</div>;
}
export const Dot = ({ sid, size = 10 }: { sid: number; size?: number }) => (
  <i class="dot" style={{ background: subjColor(sid), width: size + 'px', height: size + 'px' }} />
);
export function Chip({ kind = '', icon, children }: { kind?: string; icon?: IconName; children: ComponentChildren }) {
  return <span class={'chip ' + kind}>{icon && <Icon n={icon} s={13} w={2.4} />}<span>{children}</span></span>;
}
export const Empty = ({ title, children }: { title?: string; children?: ComponentChildren }) => (
  <div class="empty">{title && <b>{title}</b>}{children}</div>
);
export function Bar({ pct, kind = '' }: { pct: number; kind?: string }) {
  return <div class={'pb ' + kind}><i style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} /></div>;
}

/* ---------- Отсчёт и шкала времени ---------- */

export function Countdown({ to }: { to: number }) {
  const now = useNow(1000);
  return <span class="cd">{fCd((to - now) / 1000)}</span>;
}
/** Шкала «от — до» с точкой текущего момента. */
export function Track({ from, to, labels }: { from: number; to: number; labels: [string, string] }) {
  const now = useNow(5000);
  const p = Math.min(1, Math.max(0, (now - from) / (to - from))) * 100;
  return (
    <div class="track">
      <span>{labels[0]}</span>
      <div class="track-line"><i style={{ width: p + '%' }} /><b style={{ left: p + '%' }} /></div>
      <span>{labels[1]}</span>
    </div>
  );
}

/* ---------- Посещение ---------- */

export function AttButtons({ okey, cur = '', all = false }: { okey: string; cur?: string; all?: boolean }) {
  const marks: AttMark[] = all ? ['p', 'l', 'a', 'e'] : ['p', 'l', 'a'];
  return (
    <div class="abtns">
      {marks.map(v => (
        <button class={`ab ${v}${cur === v ? ' on' : ''}`} aria-pressed={cur === v} onClick={() => { setAtt(okey, v); commit(); }}>{ATT[v]}</button>
      ))}
    </div>
  );
}
const ATT_CHIP: Record<AttMark, string> = { p: 'ok', l: 'warn', a: 'danger', e: '' };

/* ---------- Пара: метки и линия маршрута ---------- */

/** ДЗ, экзамены и заметки, привязанные к паре. */
export function OccChips({ o, full = false }: { o: Occ; full?: boolean }) {
  const n = full ? 200 : 40;
  const a = D.attendance[o.key];
  const items = [
    ...eventsFor(o).map(x => <Chip kind="danger" icon="cap">{kindName(x)}{x.title ? ': ' + x.title : ''}</Chip>),
    ...hwFor(o).map(h => <Chip kind="warn" icon="book">{full ? 'Сдаёшь ДЗ: ' : 'ДЗ: '}{cut(h.text, n)}</Chip>),
    ...notesFor(o).map(x => <Chip kind="acc" icon="note">{cut(x.text, n)}</Chip>),
  ];
  if (o.l.note) items.push(<Chip icon="note">{cut(o.l.note, n)}</Chip>);
  if (a && !full) items.push(<Chip kind={ATT_CHIP[a]} icon={a === 'a' ? 'x' : 'check'}>{ATT[a]}</Chip>);
  if (!items.length) return null;
  return <div class="chips">{items}</div>;
}

const gapText = (min: number) => (min >= 60 ? `окно ${fDur(min)}` : `перемена ${fDur(min)}`);

/**
 * Линия дня: пары — остановки, длина отрезка — пара, пунктир — перемена.
 * marks — показывать ли кнопки посещения у начавшихся пар без отметки.
 */
export function RouteView({ occs, marks = false, compact = false }: { occs: Occ[]; marks?: boolean; compact?: boolean }) {
  const now = useNow(20000);
  if (!occs.length) return null;
  const rows: ComponentChildren[] = [];
  const live = occs.filter(o => !o.cancelled);
  occs.forEach((o, i) => {
    const s = msAt(o.e, o.start), e = msAt(o.e, o.end);
    const state = o.cancelled ? 'canc' : now >= e ? 'past' : now >= s ? 'cur' : 'next';
    const color = subjColor(o.sid);
    const marked = D.attendance[o.key];
    const ask = marks && !o.cancelled && now >= s && !marked && o.e >= S().attStart;
    rows.push(
      <div class={`rt rt-${state}`} key={o.key}>
        <div class="rt-time"><b>{fTime(o.start)}</b><span>{fTime(o.end)}</span></div>
        <div class="rt-rail">
          <div class="rt-node" style={o.cancelled ? undefined : { borderColor: color, background: state === 'past' ? color : undefined }}>
            {state === 'past' && <Icon n="check" s={12} w={3.5} />}
            {state === 'canc' && <Icon n="x" s={10} w={3.5} />}
          </div>
          <div class="rt-bar" style={o.cancelled ? undefined : { background: color }}>
            {state === 'cur' && <i class="rt-here" style={{ top: Math.min(96, Math.max(4, ((now - s) / (e - s)) * 100)) + '%' }} />}
          </div>
        </div>
        <div class="rt-body">
          <button class="rt-main" onClick={() => occSheet(o)}>
            <div class="rt-title">{subjName(o.sid)}</div>
            <div class="rt-sub">{o.cancelled ? 'Отменена · ' : ''}{occSubtitle(o)}</div>
            {!compact && <OccChips o={o} />}
          </button>
          {ask && (
            <div class="rt-ask">
              <div class="small muted">{state === 'cur' ? 'Ты на паре?' : 'Был на паре?'}</div>
              <AttButtons okey={o.key} />
            </div>
          )}
        </div>
      </div>,
    );
    const next = occs[i + 1];
    if (next) {
      const gap = next.start - o.end;
      rows.push(
        <div class="rt-gap" key={o.key + 'g'}>
          <div class="rt-time" /><div class="rt-rail"><i /></div>
          <div class="rt-gaptext">{gap > 0 && !o.cancelled && !next.cancelled ? gapText(gap) : ''}</div>
        </div>,
      );
    }
  });
  const last = live[live.length - 1];
  if (last && !compact) {
    rows.push(
      <div class="rt-end" key="end">
        <div class="rt-time"><span>{fTime(last.end)}</span></div>
        <div class="rt-rail"><i /></div>
        <div class="rt-gaptext">Свободен</div>
      </div>,
    );
  }
  return <div class={'route' + (compact ? ' compact' : '')}>{rows}</div>;
}

/* ---------- ДЗ, экзамен, заметка ---------- */

export function HwItem({ h }: { h: Homework }) {
  const t = todayE(), od = !h.done && h.dueDay < t;
  const toggle = () => { h.done = !h.done; h.doneDay = h.done ? todayE() : 0; commit(); if (h.done) toast('Готово!'); };
  return (
    <div class={`item hw${od ? ' od' : ''}${h.done ? ' done' : ''}`}>
      <button class="chk-btn" role="checkbox" aria-checked={h.done} aria-label="Выполнено" onClick={toggle}>
        <span class={'chk' + (h.done ? ' on' : '')}>{h.done && <Icon n="check" s={16} w={3} />}</span>
      </button>
      <button class="item-main" onClick={() => hwForm(h)}>
        <div class="it-t"><Dot sid={h.subjectId} size={8} />{subjName(h.subjectId)}</div>
        <div class="it-x">{h.text}</div>
        <div class="it-s">{od ? 'Просрочено · ' : ''}{hwDueText(h)}{h.done ? '' : ' · ' + fRel(h.dueDay - t)}{h.done ? '' : ` · ≈ ${fDur(hwEst(h))}`}</div>
      </button>
    </div>
  );
}

export function PrepBar({ x }: { x: StudyEvent }) {
  const g = goalOf(x), d = evDone(x);
  if (g <= 0) return d > 0 ? <div class="small muted">Подготовка: {fDur(d)}</div> : null;
  const p = Math.min(100, Math.round((d * 100) / g)), days = x.day - todayE(), left = Math.max(0, g - d);
  return (
    <>
      <Bar pct={p} kind={p >= 100 ? 'ok' : ''} />
      <div class="small muted">
        Готово {fDur(d)} из {fDur(g)}{p >= 100 ? ' — цель достигнута' : days > 0 && left > 0 ? ` · ещё ≈ ${fDur(perDay(left, days))} в день` : ''}
      </div>
    </>
  );
}

/** Экзамен в виде билета: слева — сколько дней осталось. */
export function EventCard({ x }: { x: StudyEvent }) {
  const days = x.day - todayE();
  const urgent = days >= 0 && days <= Math.max(1, x.remindDays);
  return (
    <div class={'ticket' + (days < 0 ? ' past' : '')}>
      <button class="ticket-main" onClick={() => push('event', { id: x.id })}>
        <div class="ticket-stub">
          {days > 0 && <><span>через</span><b>{days}</b><span>{plural(days, 'день', 'дня', 'дней')}</span></>}
          {days === 0 && <><b class="sm">уже</b><span>сегодня</span></>}
          {days < 0 && <><b class="sm">{fDM(x.day)}</b><span>прошло</span></>}
        </div>
        <div class="ticket-info">
          <div class={'ticket-kind' + (urgent ? ' urgent' : '')}>{kindName(x)}</div>
          <div class="ticket-title">{eventTitle(x)}</div>
          <div class="small muted">{eventWhenText(x)}</div>
          <PrepBar x={x} />
        </div>
      </button>
      {days >= 0 && (
        <button class="play" aria-label="Засечь подготовку" onClick={() => startTimer('e:' + x.id)}><Icon n="play" s={16} /></button>
      )}
    </div>
  );
}

export function NoteItem({ n }: { n: Note }) {
  return (
    <button class="item note" onClick={() => noteForm(n)}>
      <div class="it-x">{n.text}</div>
      <div class="it-s row">
        {n.pinned && <Icon n="pin" s={13} />}
        {(n.attach === 'RECURRING' || n.attach === 'SUBJECT') && <Icon n="repeat" s={13} />}
        <span>{noteAttachText(n)}</span>
      </div>
    </button>
  );
}
