// Действия с данными: резервная копия, загрузка, расписание для друга, календарь, удаление.

import { useState } from 'preact/hooks';
import { fDMShort, isoOf, todayE } from '../lib/dates';
import { applyFull, applySchedule, fullBackup, isEmptyData, parseImport, scheduleExport, shareFile } from '../lib/files';
import { buildIcs } from '../lib/ics';
import { resetNav } from '../lib/nav';
import { D, S, commit, normalize, setData } from '../lib/store';
import { DateF, FNote, SelF, Sw } from '../ui/fields';
import { Sheet, confirmBox, openSheet } from '../ui/sheets';
import { toast } from '../ui/toast';

export async function doBackup(): Promise<void> {
  const f = fullBackup();
  if (await shareFile(f.name, f.text, 'application/json')) { S().lastBackup = Date.now(); commit(); toast('Резервная копия готова'); }
}
export async function shareSchedule(): Promise<void> {
  const f = scheduleExport();
  await shareFile(f.name, f.text, 'application/json');
}

export function importText(text: string): void {
  const p = parseImport(text);
  if (!p) { toast('Это не файл StuStu'); return; }
  if (p.kind === 'schedule') {
    confirmBox('Заменить расписание?', `${p.summary}. Предметы, пары, время пар и каникулы заменятся. ДЗ, экзамены и заметки останутся.`, 'Заменить',
      () => { applySchedule(p.raw); commit(); toast('Расписание загружено'); });
    return;
  }
  const doIt = () => { applyFull(p.raw); resetNav(); commit(); toast('Данные загружены'); };
  if (isEmptyData()) doIt();
  else confirmBox('Загрузить данные из файла?', `${p.summary}. Текущие данные на этом устройстве будут заменены.`, 'Загрузить', doIt, true);
}
export function doImport(): void {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json,text/plain';
  input.onchange = () => {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importText(String(rd.result || ''));
    rd.onerror = () => toast('Не получилось прочитать файл');
    rd.readAsText(f);
  };
  input.click();
}

export function wipe(): void {
  confirmBox('Удалить все данные?', 'Расписание, ДЗ, экзамены, заметки, подготовка и посещения будут удалены с этого устройства.', 'Удалить всё', () => {
    const { theme, installHintOff } = S();
    const n = normalize({});
    n.settings.theme = theme; n.settings.installHintOff = installHintOff;
    setData(n); resetNav(); commit();
  }, true);
}

/* ---------- Календарь ---------- */

function IcsForm({ close }: { close: () => void }) {
  const t = todayE(), s = S();
  const [lessons, setLessons] = useState(D.lessons.length > 0);
  const [until, setUntil] = useState<number | null>(t + 60);
  const [homework, setHomework] = useState(true);
  const [events, setEvents] = useState(true);
  const [remind, setRemind] = useState(s.lessonRemindOn);
  const [min, setMin] = useState(s.lessonRemindMin);
  const save = () => {
    if (lessons && (until == null || until < t)) { toast('Укажи, до какой даты выгружать пары'); return false; }
    if (!lessons && !homework && !events) { toast('Выбери, что выгружать'); return false; }
    s.lessonRemindOn = remind; s.lessonRemindMin = min; commit();
    const r = buildIcs({ lessons, until: until ?? t, homework, events, remind, lessonRemindMin: min });
    if (!r.count) { toast('Выгружать нечего'); return false; }
    void shareFile(`StuStu-календарь-${isoOf(t)}.ics`, r.text, 'text/calendar').then(ok => { if (ok) toast(`В файле событий: ${r.count}`); });
  };
  return (
    <Sheet title="В календарь" close={close} onSave={save} saveText="Выгрузить">
      <p class="ch-sub">Получится файл, который открывается в календаре телефона или компьютера. Напоминать будет сам календарь, даже когда StuStu закрыт.</p>
      <Sw label="Пары" checked={lessons} onChange={setLessons} />
      {lessons && <DateF label="По какую дату (включительно)" value={until} onChange={setUntil} />}
      <Sw label="Домашние задания" checked={homework} onChange={setHomework} />
      <Sw label="Экзамены и контрольные" checked={events} onChange={setEvents} />
      <Sw label="С напоминаниями" checked={remind} onChange={setRemind} />
      {remind && lessons && (
        <SelF label="О паре напоминать" value={min} onChange={v => setMin(+v)}
          options={[[5, 'за 5 минут'], [10, 'за 10 минут'], [15, 'за 15 минут'], [30, 'за 30 минут'], [60, 'за час']]} />
      )}
      <FNote>О ДЗ и экзаменах календарь напомнит заранее, за столько дней, сколько указано в самом задании.</FNote>
      <FNote>Если расписание изменится{until != null ? ` или закончится ${fDMShort(until)}` : ''}, выгрузи файл ещё раз: в большинстве календарей события обновятся, а не задвоятся.</FNote>
    </Sheet>
  );
}
export function icsForm(): void { openSheet(close => <IcsForm close={close} />); }
