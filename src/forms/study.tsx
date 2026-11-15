// Формы учёбы: ДЗ, экзамен, заметка, подготовка и таймер.

import { useState } from 'preact/hooks';
import { ATTACH, KIND, TO_TYPE, TYPES } from '../lib/consts';
import { dowOf, fDays, fDur, fRel, fShort, todayE } from '../lib/dates';
import {
  defaultTarget, goalOf, guessSubject, hwDueText, occAt, occText, occurrences, parseTarget, subj, subjName, targetOptions, timerElapsed, upcoming,
} from '../lib/logic';
import { dropPages } from '../lib/nav';
import { D, S, commit, newId } from '../lib/store';
import type { Attach, EventKind, Homework, Note, Occ, StudyEvent } from '../lib/types';
import { AreaF, DateF, FNote, SelF, SubjSel, Sw, TextF, TimeF, Two, initSubj, resolveSubj, type Opt, type OptOrGroup } from '../ui/fields';
import { Sheet, openSheet } from '../ui/sheets';
import { toast } from '../ui/toast';
import { bellOpts, dowOpts, weekOpts } from './basic';

const daysOpts = (a: number, b: number, pre = 'за '): Opt[] => { const r: Opt[] = []; for (let i = a; i <= b; i++) r.push([i, pre + fDays(i)]); return r; };
export const remindOpts = daysOpts;

/* ---------- Домашнее задание ---------- */

const occVal = (o: Occ) => `o|${o.e}|${o.bell}|${TO_TYPE[o.l.type]}`;
const estOpts = (): Opt[] => [[0, `Обычно (${fDur(S().hwDefaultMin)})`], [10, '10 мин'], [15, '15 мин'], [20, '20 мин'], [30, '30 мин'], [45, '45 мин'],
  [60, '1 ч'], [90, '1 ч 30 мин'], [120, '2 ч'], [180, '3 ч'], [240, '4 ч'], [360, '6 ч'], [480, '8 ч']];

export interface HwPreset { sid?: number; occ?: Occ }

/** Варианты срока сдачи для выбранного предмета и вариант, выбранный по умолчанию. */
function dueChoices(sid: number, h: Homework | null, preset: HwPreset, keep: boolean): { opts: OptOrGroup[]; def: string } {
  const main: Opt[] = []; let group: Opt[] = []; let idx: number | null = null;
  if (keep && h) { main.push([`o|${h.dueDay}|${h.dueBell}|${h.dueLabel}`, 'Как сейчас: ' + hwDueText(h)]); idx = 0; }
  if (keep && preset.occ) { main.push([occVal(preset.occ), 'На этой паре: ' + occText(preset.occ)]); if (idx == null) idx = main.length - 1; }
  if (sid >= 0 && subj(sid)) {
    const autos: [string[] | null, string][] = [[null, 'К следующему занятию'], [['SEMINAR', 'PRACTICE', 'LESSON'], 'К следующему семинару'], [['LAB'], 'К следующей лабораторной']];
    const ai: (number | undefined)[] = [];
    autos.forEach(([types, lab], i) => {
      const o = upcoming(sid, types, 1)[0];
      if (o) { main.push([occVal(o), `${lab} — ${fShort(o.e)}, ${o.bell} пара`]); ai[i] = main.length - 1; }
    });
    if (idx == null) idx = ai[1] != null ? ai[1] : ai[0] != null ? ai[0] : null;
    group = upcoming(sid, null, 12).map(o => [occVal(o), occText(o)] as Opt);
  }
  const opts: OptOrGroup[] = [...main];
  if (group.length) opts.push({ group: 'Выбрать занятие', items: group });
  opts.push(['manual', 'Другая дата…']);
  return { opts, def: idx != null ? String(main[idx][0]) : 'manual' };
}

function HwForm({ h, preset, close }: { h: Homework | null; preset: HwPreset; close: () => void }) {
  const t = todayE();
  const [sv, setSv] = useState(() => initSubj(h ? h.subjectId : preset.sid != null ? preset.sid : guessSubject(), false));
  const [keep, setKeep] = useState(true);
  const sid = sv.sid === 'new' ? -1 : sv.sid;
  const choices = dueChoices(sid, h, preset, keep);
  const [due, setDue] = useState(choices.def);
  const [text, setText] = useState(h ? h.text : '');
  const [dday, setDday] = useState<number | null>(h ? h.dueDay : t + 1);
  const [dbell, setDbell] = useState(h ? h.dueBell : -1);
  const [est, setEst] = useState(h ? h.estMin || 0 : 0);
  const [remind, setRemind] = useState(h ? h.remindDays : S().hwRemindDays);
  const [done, setDone] = useState(h ? h.done : false);

  const readDue = (): Pick<Homework, 'dueDay' | 'dueBell' | 'dueLabel'> | null => {
    if (due === 'manual') {
      if (dday == null) return null;
      const o = dbell > 0 ? occAt(dday, dbell, sid) : occurrences(dday).find(x => x.sid === sid);
      const bell = dbell > 0 ? dbell : o ? o.bell : -1;
      return { dueDay: dday, dueBell: bell, dueLabel: o && o.sid === sid ? TO_TYPE[o.l.type] : '' };
    }
    const [, e, b, lab] = due.split('|');
    return { dueDay: +e, dueBell: +b, dueLabel: lab || '' };
  };
  const d = readDue();
  const save = () => {
    const tx = text.trim();
    if (!tx) { toast('Напиши, что задали'); return false; }
    const dd = readDue();
    if (!dd) { toast('Укажи дату сдачи'); return false; }
    const id = resolveSubj(sv);
    if (id == null) return false;
    if (!subj(id)) { toast('Выбери предмет'); return false; }
    const x = { subjectId: id, text: tx, estMin: est, remindDays: remind, ...dd };
    if (h) Object.assign(h, x, { done, doneDay: done ? h.doneDay || t : 0 });
    else D.homework.push({ id: newId(), created: t, done: false, doneDay: 0, ...x });
    commit(); toast(h ? 'Сохранено' : 'ДЗ сохранено');
  };
  const del = h ? () => { D.homework = D.homework.filter(x => x.id !== h.id); commit(); } : undefined;
  return (
    <Sheet title={h ? 'Изменить ДЗ' : 'Домашнее задание'} close={close} onSave={save} saveText="Сохранить" onDelete={del}>
      <SubjSel value={sv} onChange={v => {
        setSv(v);
        if (v.sid !== sv.sid) { setKeep(false); setDue(dueChoices(v.sid === 'new' ? -1 : v.sid, h, preset, false).def); }
      }} />
      <AreaF label="Что задали" value={text} onInput={setText} placeholder="например, решить №3 и №4" />
      <SelF label="Когда сдавать" value={due} options={choices.opts} onChange={setDue} />
      {due === 'manual' && (
        <Two>
          <DateF label="Дата" value={dday} onChange={setDday} />
          <SelF label="Пара" value={dbell} options={bellOpts(true, 'Любая')} onChange={v => setDbell(+v)} />
        </Two>
      )}
      {d ? <FNote cls="acc">Сдать: {hwDueText(d)} ({fRel(d.dueDay - t)})</FNote> : <FNote cls="warn">Укажи дату сдачи</FNote>}
      <SelF label="Сколько времени займёт" value={est} options={estOpts()} onChange={v => setEst(+v)} />
      <FNote>Нужно для подсказок о загруженных днях.</FNote>
      <SelF label="Показывать как срочное" value={remind} options={daysOpts(1, 7)} onChange={v => setRemind(+v)} />
      {h && <Sw label="Выполнено" checked={done} onChange={setDone} />}
    </Sheet>
  );
}
export function hwForm(h: Homework | null, preset: HwPreset = {}): void {
  openSheet(close => <HwForm h={h} preset={preset} close={close} />);
}

/* ---------- Экзамен, зачёт, контрольная ---------- */

const GOALS = [0, 30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720, 900, 1200, 1500, 1800];
export interface EventPreset { occ?: Occ; kind?: EventKind; sid?: number; day?: number }

function EventForm({ x, preset, close }: { x: StudyEvent | null; preset: EventPreset; close: () => void }) {
  const t = todayE(), occ = preset.occ;
  const init: Omit<StudyEvent, 'id'> = x ? { ...x } : {
    kind: preset.kind || 'EXAM', subjectId: occ ? occ.sid : preset.sid != null ? preset.sid : -1, title: '',
    day: occ ? occ.e : preset.day != null ? preset.day : t + 7, bell: occ ? occ.bell : -1, time: -1, room: occ ? occ.l.room : '',
    details: '', remindDays: S().examRemindDays, prepGoalMin: -1,
  };
  const [kind, setKind] = useState<EventKind>(init.kind);
  const [sv, setSv] = useState(() => initSubj(init.subjectId, true));
  const [title, setTitle] = useState(init.title);
  const [day, setDay] = useState<number | null>(init.day);
  const [bell, setBell] = useState(init.bell);
  const [time, setTime] = useState(init.time);
  const [room, setRoom] = useState(init.room);
  const [details, setDetails] = useState(init.details);
  const [goal, setGoal] = useState(goalOf(init));
  const [touched, setTouched] = useState(false);
  const [remind, setRemind] = useState(init.remindDays);

  const sid = sv.sid === 'new' ? -1 : sv.sid;
  const lessons = sid >= 0 ? upcoming(sid, null, 20) : [];
  const fromOpts: Opt[] = [['', lessons.length ? 'Выбрать занятие…' : 'Нет занятий по предмету'] as Opt]
    .concat(lessons.map((o, i) => [String(i), occText(o)] as Opt));
  const goalOpts: Opt[] = (GOALS.includes(goal) ? GOALS : [...GOALS, goal].sort((a, b) => a - b)).map(g => [g, g ? fDur(g) : 'Не нужна'] as Opt);

  const save = () => {
    if (day == null) { toast('Укажи дату'); return false; }
    const tt = title.trim();
    if (sv.sid === -1 && !tt) { toast('Выбери предмет или напиши название'); return false; }
    const id = sv.sid === -1 ? -1 : resolveSubj(sv);
    if (id == null) return false;
    const y = {
      kind, subjectId: id, title: tt, day, bell, time: bell > 0 ? -1 : time, room: room.trim(), details: details.trim(), remindDays: remind,
      // -1 означает «цель по умолчанию для этого вида события»
      prepGoalMin: !x && !touched && goal === KIND[kind].g ? -1 : goal,
    };
    if (x) Object.assign(x, y); else D.events.push({ id: newId(), ...y });
    commit(); toast('Сохранено');
  };
  const del = x ? () => {
    D.events = D.events.filter(y => y.id !== x.id);
    D.prep.forEach(p => { if (p.eventId === x.id) p.eventId = -1; });
    dropPages('event', x.id);
    commit();
  } : undefined;
  return (
    <Sheet title={x ? 'Изменить событие' : 'Экзамен, зачёт, контрольная'} close={close} onSave={save} saveText="Сохранить" onDelete={del}>
      <SelF label="Что это" value={kind} options={Object.entries(KIND).map(([k, v]) => [k, v.t] as Opt)}
        onChange={v => { setKind(v as EventKind); if (!x && !touched) setGoal(KIND[v as EventKind].g); }} />
      <SubjSel value={sv} onChange={setSv} allowNone />
      <TextF label="Название (необязательно)" value={title} onInput={setTitle} placeholder="например, ПК1 или Коллоквиум №2" />
      <SelF label="Взять из расписания" value="" options={fromOpts} onChange={v => {
        const o = lessons[+v]; if (v === '' || !o) return;
        setDay(o.e); setBell(o.bell); if (o.l.room) setRoom(o.l.room);
      }} />
      <Two>
        <DateF label="Дата" value={day} onChange={setDay} />
        <SelF label="Пара" value={bell} options={bellOpts(true, 'Без пары')} onChange={v => setBell(+v)} />
      </Two>
      {bell <= 0 && <TimeF label="Время начала" value={time} onChange={setTime} />}
      <TextF label="Аудитория" value={room} onInput={setRoom} placeholder="необязательно" />
      <AreaF label="Что повторить / заметки" value={details} onInput={setDetails} placeholder="темы, билеты, что взять с собой" />
      <SelF label="Сколько готовиться всего" value={goal} options={goalOpts} onChange={v => { setGoal(+v); setTouched(true); }} />
      <FNote>Цель подготовки: StuStu посчитает, сколько нужно заниматься в день.</FNote>
      <SelF label="Показывать как срочное" value={remind} options={daysOpts(1, 14)} onChange={v => setRemind(+v)} />
    </Sheet>
  );
}
export function eventForm(x: StudyEvent | null, preset: EventPreset = {}): void {
  openSheet(close => <EventForm x={x} preset={preset} close={close} />);
}

/* ---------- Заметка ---------- */

function NoteForm({ n, preset, close }: { n: Note | null; preset: Partial<Note>; close: () => void }) {
  const t = todayE(), s = S();
  const N: Omit<Note, 'id'> = n ? { ...n } : {
    text: '', pinned: false, remind: false, attach: 'GENERAL', day: t, bell: -1, week: -1, weekday: dowOf(t), subjectId: -1, created: t, ...preset,
  };
  if (!N.day) N.day = t;
  const [text, setText] = useState(N.text);
  const [attach, setAttach] = useState<Attach>(N.attach);
  const [dday, setDday] = useState<number | null>(N.day);
  const [lday, setLday] = useState<number | null>(N.day);
  const [lbell, setLbell] = useState(N.bell > 0 ? N.bell : 1);
  const [rweek, setRweek] = useState(N.week);
  const [rday, setRday] = useState(N.weekday);
  const [rbell, setRbell] = useState(N.bell);
  const [nsv, setNsv] = useState(() => initSubj(N.subjectId, false));
  const [pinned, setPinned] = useState(N.pinned);

  const lo = lday != null && lbell > 0 ? occAt(lday, lbell) : null;
  const save = () => {
    const tx = text.trim();
    if (!tx) { toast('Напиши текст заметки'); return false; }
    const y: Partial<Note> = { text: tx, attach, pinned };
    if (attach === 'DATE') { if (dday == null) { toast('Укажи день'); return false; } y.day = dday; }
    if (attach === 'LESSON') { if (lday == null) { toast('Укажи день'); return false; } y.day = lday; y.bell = lbell; y.subjectId = lo ? lo.sid : -1; }
    if (attach === 'RECURRING') { y.week = s.cycleWeeks > 1 ? rweek : -1; y.weekday = rday; y.bell = rbell; }
    if (attach === 'SUBJECT') { const sid = resolveSubj(nsv); if (sid == null) return false; y.subjectId = sid; }
    if (n) Object.assign(n, y); else D.notes.push({ ...N, ...y, id: newId(), created: t });
    commit();
  };
  const del = n ? () => { D.notes = D.notes.filter(x => x.id !== n.id); commit(); } : undefined;
  return (
    <Sheet title={n ? 'Изменить заметку' : 'Заметка'} close={close} onSave={save} saveText="Сохранить" onDelete={del}>
      <AreaF label="Текст" value={text} onInput={setText} placeholder="что важно не забыть" />
      <SelF label="Привязка" value={attach} options={Object.entries(ATTACH)} onChange={v => setAttach(v as Attach)} />
      {attach === 'DATE' && <DateF label="День" value={dday} onChange={setDday} />}
      {attach === 'LESSON' && (
        <>
          <Two>
            <DateF label="День" value={lday} onChange={setLday} />
            <SelF label="Пара" value={lbell} options={bellOpts(false)} onChange={v => setLbell(+v)} />
          </Two>
          <FNote>{lo ? `Пара: ${subjName(lo.sid)} (${TYPES[lo.l.type]})` : 'В этот день на этой паре занятий нет'}</FNote>
        </>
      )}
      {attach === 'RECURRING' && (
        <>
          {s.cycleWeeks > 1 && <SelF label="Неделя" value={rweek} options={weekOpts()} onChange={v => setRweek(+v)} />}
          <Two>
            <SelF label="День недели" value={rday} options={dowOpts()} onChange={v => setRday(+v)} />
            <SelF label="Пара" value={rbell} options={bellOpts(true, 'Весь день')} onChange={v => setRbell(+v)} />
          </Two>
          <FNote>Повторяющаяся заметка не удаляется сама.</FNote>
        </>
      )}
      {attach === 'SUBJECT' && (
        <>
          <SubjSel value={nsv} onChange={setNsv} />
          <FNote>Заметка будет показываться на каждой паре этого предмета.</FNote>
        </>
      )}
      <Sw label="Важная — показывать на главном экране" checked={pinned} onChange={setPinned} />
    </Sheet>
  );
}
export function noteForm(n: Note | null, preset: Partial<Note> = {}): void {
  openSheet(close => <NoteForm n={n} preset={preset} close={close} />);
}

/* ---------- Подготовка и таймер ---------- */

function TargetSel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <SelF label="Подготовка к" value={value} options={targetOptions(value)} onChange={onChange} />;
}

function PrepForm({ target, minutes, fromTimer, close }: { target: string | null; minutes: number; fromTimer: boolean; close: () => void }) {
  const t = todayE();
  const [tg, setTg] = useState(target || defaultTarget());
  const [h, setH] = useState(String(minutes ? Math.floor(minutes / 60) : 0));
  const [m, setM] = useState(String(minutes ? minutes % 60 : 30));
  const [day, setDay] = useState<number | null>(t);
  const [note, setNote] = useState('');
  const save = () => {
    const min = (+h || 0) * 60 + (+m || 0);
    if (min < 1) { toast('Укажи время подготовки'); return false; }
    if (!tg) { toast('Выбери, к чему готовился'); return false; }
    D.prep.push({ id: newId(), day: day ?? t, min, note: note.trim(), ts: Date.now(), ...parseTarget(tg) });
    if (fromTimer) D.timer = null;
    commit(); toast(`Записано: ${fDur(min)}`);
  };
  const del = fromTimer ? () => { D.timer = null; commit(); toast('Замер удалён'); } : undefined;
  return (
    <Sheet title={fromTimer ? 'Сохранить подготовку' : 'Записать подготовку'} close={close} onSave={save} saveText="Сохранить"
      onDelete={del} delText="Не сохранять замер" delAsk="Удалить замер?">
      <TargetSel value={tg} onChange={setTg} />
      <Two>
        <TextF label="Часы" value={h} onInput={setH} type="number" min={0} max={24} inputMode="numeric" placeholder="0" />
        <TextF label="Минуты" value={m} onInput={setM} type="number" min={0} max={59} inputMode="numeric" placeholder="0" />
      </Two>
      <DateF label="Дата" value={day} onChange={setDay} />
      <TextF label="Что сделал (необязательно)" value={note} onInput={setNote} placeholder="например, билеты 1–10" />
    </Sheet>
  );
}
export function prepForm(target: string | null, minutes = 0, fromTimer = false): void {
  openSheet(close => <PrepForm target={target} minutes={minutes} fromTimer={fromTimer} close={close} />);
}

function PickTarget({ onPick, close }: { onPick: (v: string) => void; close: () => void }) {
  const [tg, setTg] = useState(defaultTarget());
  return (
    <Sheet title="Что готовим?" close={close} onSave={() => { onPick(tg); }} saveText="Начать">
      <TargetSel value={tg} onChange={setTg} />
    </Sheet>
  );
}

export function startTimer(target: string | null): void {
  if (D.timer) { toast('Таймер уже идёт — сначала останови его'); return; }
  if (!target) {
    if (!D.subjects.length && !D.events.length) { toast('Сначала добавь предметы'); return; }
    openSheet(close => <PickTarget onPick={v => startTimer(v)} close={close} />);
    return;
  }
  D.timer = { target, start: Date.now(), acc: 0, paused: false };
  commit(); toast('Таймер запущен');
}
export function pauseTimer(): void { const T = D.timer; if (!T || T.paused) return; T.acc += Date.now() - T.start; T.paused = true; commit(); }
export function resumeTimer(): void { const T = D.timer; if (!T || !T.paused) return; T.start = Date.now(); T.paused = false; commit(); }
export function stopTimer(): void {
  if (!D.timer) return;
  prepForm(D.timer.target, Math.max(1, Math.round(timerElapsed() / 60000)), true);
}
