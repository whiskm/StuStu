// Формы расписания: предмет, пара, каникулы, время пар, названия недель.

import { useState } from 'preact/hooks';
import { COLORS, TYPES } from '../lib/consts';
import { DOW_FULL, fRange, todayE } from '../lib/dates';
import { bellTimes, subj, weekName } from '../lib/logic';
import { D, S, commit, newId } from '../lib/store';
import type { Holiday, Lesson, LessonType, Subject } from '../lib/types';
import { ColorPick, DateF, FNote, SelF, SubjSel, Sw, TextF, TimeF, Two, initSubj, resolveSubj, type Opt } from '../ui/fields';
import { Sheet, openSheet } from '../ui/sheets';
import { toast } from '../ui/toast';

export const bellOpts = (withNone: boolean, noneText = 'Без привязки к паре'): Opt[] =>
  (withNone ? [[-1, noneText] as Opt] : []).concat(D.bells.map((b, i) => [i + 1, `${i + 1} пара · ${fRange(b.start, b.end)}`] as Opt));
export const weekOpts = (): Opt[] =>
  [[-1, 'Каждую неделю'] as Opt].concat([...Array(S().cycleWeeks)].map((_, i) => [i, 'Только: ' + weekName(i)] as Opt));
export const dowOpts = (): Opt[] => DOW_FULL.map((d, i) => [i + 1, d] as Opt);

/* ---------- Предмет ---------- */

function SubjectForm({ s, after, close }: { s: Subject | null; after?: (x: Subject) => void; close: () => void }) {
  const [name, setName] = useState(s ? s.name : '');
  const [teacher, setTeacher] = useState(s ? s.teacher : '');
  const [color, setColor] = useState(s ? s.color : D.subjects.length % COLORS.length);
  const save = () => {
    const n = name.trim();
    if (!n) { toast('Введи название предмета'); return false; }
    if (s) { s.name = n; s.teacher = teacher.trim(); s.color = color; commit(); }
    else { const x = { id: newId(), name: n, teacher: teacher.trim(), color }; D.subjects.push(x); commit(); after?.(x); }
  };
  const del = s ? () => {
    const ids = new Set(D.lessons.filter(l => l.subjectId === s.id).map(l => l.id));
    D.subjects = D.subjects.filter(x => x.id !== s.id);
    D.lessons = D.lessons.filter(l => l.subjectId !== s.id);
    D.cancels = D.cancels.filter(c => !ids.has(c.lessonId));
    commit();
  } : undefined;
  return (
    <Sheet title={s ? 'Предмет' : 'Новый предмет'} close={close} onSave={save} saveText="Сохранить" onDelete={del} delAsk="Удалить предмет и все его пары?">
      <TextF label="Название" value={name} onInput={setName} placeholder="например, Физика" autoFocus={!s} />
      <TextF label="Преподаватель (необязательно)" value={teacher} onInput={setTeacher} placeholder="Фамилия И. О." />
      <ColorPick value={color} onChange={setColor} />
    </Sheet>
  );
}
export function subjectForm(s: Subject | null, after?: (x: Subject) => void): void {
  openSheet(close => <SubjectForm s={s} after={after} close={close} />);
}

/* ---------- Пара ---------- */

function LessonForm({ l, preset, close }: { l: Lesson | null; preset: Partial<Lesson>; close: () => void }) {
  const s = S();
  const init: Omit<Lesson, 'id'> = l ? { ...l } : {
    subjectId: D.subjects.length ? D.subjects[0].id : -1, type: 'LECTURE', room: '', teacher: '', week: preset.week ?? -1,
    day: preset.day || 1, bell: preset.bell || 1, customStart: -1, customEnd: -1, note: '',
  };
  if (init.week >= s.cycleWeeks) init.week = -1;
  const isCustom = init.customStart >= 0 && init.customEnd > init.customStart;
  const bt = bellTimes(init.bell) || [540, 630];
  const [sv, setSv] = useState(() => initSubj(init.subjectId, false));
  const [type, setType] = useState<LessonType>(init.type);
  const [week, setWeek] = useState(init.week);
  const [day, setDay] = useState(init.day);
  const [bell, setBell] = useState(init.bell);
  const [custom, setCustom] = useState(isCustom);
  const [cs, setCs] = useState(isCustom ? init.customStart : bt[0]);
  const [ce, setCe] = useState(isCustom ? init.customEnd : bt[1]);
  const [room, setRoom] = useState(init.room);
  const [teacher, setTeacher] = useState(init.teacher);
  const [note, setNote] = useState(init.note);
  const save = () => {
    if (!D.bells.length) { toast('Сначала задай время пар в настройках'); return false; }
    if (custom && (cs < 0 || ce <= cs)) { toast('Конец пары должен быть позже начала'); return false; }
    const sid = resolveSubj(sv);
    if (sid == null) return false;
    if (!subj(sid)) { toast('Выбери предмет'); return false; }
    const x = {
      subjectId: sid, type, week: s.cycleWeeks > 1 ? week : -1, day, bell,
      customStart: custom ? cs : -1, customEnd: custom ? ce : -1, room: room.trim(), teacher: teacher.trim(), note: note.trim(),
    };
    if (l) Object.assign(l, x); else D.lessons.push({ id: newId(), ...x });
    commit(); toast('Пара сохранена');
  };
  const del = l ? () => { D.lessons = D.lessons.filter(x => x.id !== l.id); D.cancels = D.cancels.filter(c => c.lessonId !== l.id); commit(); } : undefined;
  return (
    <Sheet title={l ? 'Пара в расписании' : 'Новая пара'} close={close} onSave={save} saveText="Сохранить" onDelete={del}>
      <SubjSel value={sv} onChange={setSv} />
      <SelF label="Тип занятия" value={type} options={Object.entries(TYPES)} onChange={v => setType(v as LessonType)} />
      {s.cycleWeeks > 1 && <SelF label="Неделя" value={week} options={weekOpts()} onChange={v => setWeek(+v)} />}
      <Two>
        <SelF label="День недели" value={day} options={dowOpts()} onChange={v => setDay(+v)} />
        <SelF label="Номер пары" value={bell} options={bellOpts(false)} onChange={v => setBell(+v)} />
      </Two>
      <Sw label="Своё время (не по звонкам)" checked={custom} onChange={setCustom} />
      {custom && <Two><TimeF label="Начало" value={cs} onChange={setCs} /><TimeF label="Конец" value={ce} onChange={setCe} /></Two>}
      <TextF label="Аудитория" value={room} onInput={setRoom} placeholder="например, 305" />
      <TextF label="Преподаватель (если не такой, как у предмета)" value={teacher} onInput={setTeacher} placeholder="необязательно" />
      <TextF label="Примечание к паре" value={note} onInput={setNote} placeholder="необязательно" />
    </Sheet>
  );
}
export function lessonForm(l: Lesson | null, preset: Partial<Lesson> = {}): void {
  openSheet(close => <LessonForm l={l} preset={preset} close={close} />);
}

/* ---------- Каникулы ---------- */

function HolidayForm({ h, close }: { h: Holiday | null; close: () => void }) {
  const t = todayE();
  const [title, setTitle] = useState(h ? h.title : '');
  const [from, setFrom] = useState<number | null>(h ? h.from : t);
  const [to, setTo] = useState<number | null>(h ? h.to : t + 6);
  const save = () => {
    if (from == null || to == null) { toast('Укажи даты'); return false; }
    if (to < from) { toast('Дата окончания раньше начала'); return false; }
    const y = { title: title.trim() || 'Выходные', from, to };
    if (h) Object.assign(h, y); else D.holidays.push({ id: newId(), ...y });
    commit();
  };
  const del = h ? () => { D.holidays = D.holidays.filter(x => x.id !== h.id); commit(); } : undefined;
  return (
    <Sheet title={h ? 'Изменить' : 'Каникулы или выходные'} close={close} onSave={save} saveText="Сохранить" onDelete={del}>
      <TextF label="Название" value={title} onInput={setTitle} placeholder="например, Зимние каникулы" />
      <Two><DateF label="С" value={from} onChange={setFrom} /><DateF label="По (включительно)" value={to} onChange={setTo} /></Two>
      <FNote>В эти дни пары не показываются.</FNote>
    </Sheet>
  );
}
export function holidayForm(h: Holiday | null): void { openSheet(close => <HolidayForm h={h} close={close} />); }

/* ---------- Время пары ---------- */

function BellForm({ i, close }: { i: number; close: () => void }) {
  const isNew = i >= D.bells.length; const last = D.bells[D.bells.length - 1];
  const b = !isNew ? D.bells[i] : (() => { const len = last ? last.end - last.start : 90; const st = last ? last.end + 10 : 540; return { start: st, end: st + len }; })();
  const [s, setS] = useState(b.start);
  const [e, setE] = useState(b.end);
  const save = () => {
    if (s < 0 || e <= s) { toast('Конец должен быть позже начала'); return false; }
    if (isNew) D.bells.push({ start: s, end: e }); else { D.bells[i].start = s; D.bells[i].end = e; }
    commit();
  };
  const del = !isNew && i === D.bells.length - 1 ? () => { D.bells.pop(); commit(); } : undefined;
  return (
    <Sheet title={`${i + 1} пара`} close={close} onSave={save} saveText="Сохранить" onDelete={del}>
      <Two><TimeF label="Начало" value={s} onChange={setS} /><TimeF label="Конец" value={e} onChange={setE} /></Two>
    </Sheet>
  );
}
export function bellForm(i: number): void { openSheet(close => <BellForm i={i} close={close} />); }

/* ---------- Названия недель ---------- */

function WeekNamesForm({ close }: { close: () => void }) {
  const s = S();
  const [names, setNames] = useState(() => [...Array(s.cycleWeeks)].map((_, i) => s.weekNames[i] || ''));
  const save = () => { s.weekNames = names.map(n => n.trim()); commit(); };
  return (
    <Sheet title="Названия недель" close={close} onSave={save} saveText="Сохранить">
      {names.map((n, i) => (
        <TextF label={`Неделя ${i + 1}`} value={n} placeholder={i === 0 ? 'например, Числитель' : i === 1 ? 'например, Знаменатель' : ''}
          onInput={v => setNames(names.map((x, k) => (k === i ? v : x)))} />
      ))}
    </Sheet>
  );
}
export function weekNamesForm(): void { openSheet(close => <WeekNamesForm close={close} />); }
