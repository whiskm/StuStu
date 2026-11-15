// Поля форм.

import type { ComponentChildren } from 'preact';
import { fromIso, isoOf, minFromInput, timeVal } from '../lib/dates';
import { colorAt, subj } from '../lib/logic';
import { D, newId } from '../lib/store';
import { COLORS } from '../lib/consts';
import { toast } from './toast';

export type Opt = [string | number, string];
export type OptOrGroup = Opt | { group: string; items: Opt[] };

const isGroup = (o: OptOrGroup): o is { group: string; items: Opt[] } => !Array.isArray(o);
const option = ([v, t]: Opt) => <option value={String(v)}>{t}</option>;

export function Fld({ label, children }: { label?: string; children: ComponentChildren }) {
  return <label class="fld">{label && <span>{label}</span>}{children}</label>;
}

export function TextF(p: { label: string; value: string; onInput: (v: string) => void; placeholder?: string; type?: string; min?: number; max?: number; inputMode?: string; autoFocus?: boolean }) {
  return (
    <Fld label={p.label}>
      <input type={(p.type || 'text') as any} value={p.value} placeholder={p.placeholder} min={p.min} max={p.max} inputMode={p.inputMode as any}
        autoFocus={p.autoFocus} onInput={e => p.onInput((e.target as HTMLInputElement).value)} />
    </Fld>
  );
}
export function AreaF(p: { label: string; value: string; onInput: (v: string) => void; placeholder?: string }) {
  return (
    <Fld label={p.label}>
      <textarea rows={3} value={p.value} placeholder={p.placeholder} onInput={e => p.onInput((e.target as HTMLTextAreaElement).value)} />
    </Fld>
  );
}
export function SelF(p: { label?: string; value: string | number; options: OptOrGroup[]; onChange: (v: string) => void }) {
  return (
    <Fld label={p.label}>
      <select value={String(p.value)} onChange={e => p.onChange((e.target as HTMLSelectElement).value)}>
        {p.options.map(o => (isGroup(o) ? <optgroup label={o.group}>{o.items.map(option)}</optgroup> : option(o)))}
      </select>
    </Fld>
  );
}
/** Дата. Значение — номер дня; null, пока поле пустое. */
export function DateF(p: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Fld label={p.label}>
      <input type="date" value={p.value == null ? '' : isoOf(p.value)} onInput={e => p.onChange(fromIso((e.target as HTMLInputElement).value))} />
    </Fld>
  );
}
/** Время. Значение — минуты от полуночи, -1 — не задано. */
export function TimeF(p: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Fld label={p.label}>
      <input type="time" value={timeVal(p.value)} onInput={e => p.onChange(minFromInput((e.target as HTMLInputElement).value))} />
    </Fld>
  );
}
export function Sw(p: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="swr">
      <span>{p.label}</span>
      <input type="checkbox" checked={p.checked} onChange={e => p.onChange((e.target as HTMLInputElement).checked)} />
      <i />
    </label>
  );
}
export function FNote({ children, cls = '' }: { children: ComponentChildren; cls?: string }) {
  return <p class={'fnote ' + cls}>{children}</p>;
}
export function Two({ children }: { children: ComponentChildren }) { return <div class="two">{children}</div>; }

/** Выбор предмета с возможностью тут же завести новый. */
export interface SubjValue { sid: number | 'new'; name: string }
export function initSubj(sel: number, allowNone: boolean): SubjValue {
  if (subj(sel)) return { sid: sel, name: '' };
  if (allowNone) return { sid: -1, name: '' };
  return { sid: D.subjects.length ? D.subjects[0].id : 'new', name: '' };
}
export function SubjSel(p: { value: SubjValue; onChange: (v: SubjValue) => void; allowNone?: boolean; label?: string }) {
  const opts: Opt[] = [];
  if (p.allowNone) opts.push([-1, 'Без предмета']);
  for (const s of D.subjects) opts.push([s.id, s.name]);
  opts.push(['new', '＋ Новый предмет…']);
  return (
    <>
      <SelF label={p.label || 'Предмет'} value={p.value.sid} options={opts}
        onChange={v => p.onChange({ sid: v === 'new' ? 'new' : +v, name: p.value.name })} />
      {p.value.sid === 'new' && (
        <Fld>
          <input value={p.value.name} placeholder="Название нового предмета" autoFocus
            onInput={e => p.onChange({ sid: 'new', name: (e.target as HTMLInputElement).value })} />
        </Fld>
      )}
    </>
  );
}
/** Возвращает номер предмета, при необходимости создаёт новый. null — название не введено. */
export function resolveSubj(v: SubjValue): number | null {
  if (v.sid !== 'new') return v.sid;
  const n = v.name.trim();
  if (!n) { toast('Введи название нового предмета'); return null; }
  const ex = D.subjects.find(s => s.name.toLowerCase() === n.toLowerCase());
  if (ex) return ex.id;
  const s = { id: newId(), name: n, teacher: '', color: D.subjects.length % COLORS.length };
  D.subjects.push(s);
  return s.id;
}

export function ColorPick({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div class="fld">
      <span>Цвет</span>
      <div class="colors" role="radiogroup" aria-label="Цвет">
        {COLORS.map((_, i) => (
          <button type="button" role="radio" aria-checked={i === value} aria-label={`Цвет ${i + 1}`} class={i === value ? 'on' : ''}
            style={{ background: colorAt(i) }} onClick={() => onChange(i)} />
        ))}
      </div>
    </div>
  );
}
