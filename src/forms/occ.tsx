// Меню пары: посещение и быстрые действия.

import { ATT } from '../lib/consts';
import { dowOf, fDM, fRange, fShort, nowMinF, todayE } from '../lib/dates';
import { occSubtitle, setAtt, subjName } from '../lib/logic';
import { push } from '../lib/nav';
import { D, commit } from '../lib/store';
import type { AttMark, Occ } from '../lib/types';
import { Icon } from '../ui/icons';
import { Sheet, openSheet, type ChooseItem } from '../ui/sheets';
import { toast } from '../ui/toast';
import { lessonForm } from './basic';
import { eventForm, hwForm, noteForm, startTimer } from './study';

function OccSheet({ o, close }: { o: Occ; close: () => void }) {
  const t = todayE();
  const started = o.e < t || (o.e === t && o.start <= nowMinF());
  const future = o.e > t || (o.e === t && o.start > nowMinF());
  const items: ChooseItem[] = [];
  items.push({ t: 'Задали ДЗ (сдать к следующему занятию)', icon: 'book', fn: () => hwForm(null, { sid: o.sid }) });
  if (future) items.push({ t: 'ДЗ, которое сдаём на этой паре', icon: 'book', fn: () => hwForm(null, { sid: o.sid, occ: o }) });
  items.push({ t: 'Заметка к этой паре', icon: 'note', fn: () => noteForm(null, { attach: 'LESSON', day: o.e, bell: o.bell, subjectId: o.sid }) });
  items.push({ t: 'Заметка на каждую такую пару', icon: 'repeat', fn: () => noteForm(null, { attach: 'RECURRING', bell: o.bell, weekday: dowOf(o.e), week: o.l.week >= 0 ? o.l.week : -1 }) });
  items.push({ t: 'На этой паре экзамен или контрольная', icon: 'cap', fn: () => eventForm(null, { occ: o, kind: 'TEST' }) });
  items.push({ t: 'Засечь подготовку по предмету', icon: 'timer', fn: () => startTimer('s:' + o.sid) });
  items.push(o.cancelled
    ? { t: 'Вернуть пару (не отменена)', icon: 'repeat', fn: () => { D.cancels = D.cancels.filter(c => !(c.day === o.e && c.lessonId === o.l.id)); commit(); } }
    : { t: 'Отменить пару только в этот день', icon: 'x', fn: () => { D.cancels.push({ day: o.e, lessonId: o.l.id }); commit(); toast(`Пара ${fDM(o.e)} отменена`); } });
  items.push({ t: 'Изменить пару в расписании', icon: 'edit', fn: () => lessonForm(o.l) });
  items.push({ t: 'Статистика предмета', icon: 'chart', fn: () => push('subject', { id: o.sid }) });
  const cur = D.attendance[o.key] || '';
  return (
    <Sheet title={subjName(o.sid)} close={close}>
      <p class="ch-sub">{fShort(o.e)} · {o.bell} пара · {fRange(o.start, o.end)}<br />{occSubtitle(o)}</p>
      {started && !o.cancelled && (
        <div class="card pad-s">
          <div class="small muted">Посещение</div>
          <div class="abtns wrap">
            {(Object.keys(ATT) as AttMark[]).map(v => (
              <button class={`ab ${v}${cur === v ? ' on' : ''}`} aria-pressed={cur === v} onClick={() => { setAtt(o.key, v); close(); commit(); }}>{ATT[v]}</button>
            ))}
          </div>
        </div>
      )}
      <div class="list">
        {items.map(it => (
          <button class="li" onClick={() => { close(); it.fn(); }}>
            {it.icon && <Icon n={it.icon} />}<span class="grow">{it.t}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
export function occSheet(o: Occ): void { openSheet(close => <OccSheet o={o} close={close} />); }
