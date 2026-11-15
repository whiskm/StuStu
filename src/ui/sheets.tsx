// Всплывающие окна: на телефоне выезжают снизу, на компьютере открываются по центру.

import { Fragment, type ComponentChildren, type VNode } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { setSheetCloser } from '../lib/nav';
import { useForce } from './hooks';
import { Icon, type IconName } from './icons';

interface Entry { id: number; render: (close: () => void) => VNode }
let stack: Entry[] = [];
let seq = 0;
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());

export function openSheet(render: (close: () => void) => VNode): void {
  stack = [...stack, { id: ++seq, render }];
  notify();
}
function closeId(id: number): void { stack = stack.filter(e => e.id !== id); notify(); }
export const sheetsOpen = (): boolean => stack.length > 0;

setSheetCloser(() => {
  if (!stack.length) return false;
  closeId(stack[stack.length - 1].id);
  return true;
});

export function SheetHost() {
  const force = useForce();
  useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  useEffect(() => { document.body.classList.toggle('noscroll', stack.length > 0); });
  return <>{stack.map(e => <Fragment key={e.id}>{e.render(() => closeId(e.id))}</Fragment>)}</>;
}

interface SheetProps {
  title: string;
  close: () => void;
  /** Вернуть false, чтобы окно не закрывалось (например, если поле не заполнено). */
  onSave?: () => boolean | void;
  saveText?: string;
  onDelete?: () => void;
  delText?: string;
  delAsk?: string;
  children?: ComponentChildren;
}

export function Sheet({ title, close, onSave, saveText = 'Готово', onDelete, delText = 'Удалить', delAsk = 'Удалить?', children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (onSave && onSave() !== false) close(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && onSave && t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox') { e.preventDefault(); save(); }
  };
  return (
    <div class="ov" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="sh" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onKeyDown={onKey}>
        <div class="sh-h">
          <button class="lnk" onClick={close}>{onSave ? 'Отмена' : 'Закрыть'}</button>
          <b>{title}</b>
          {onSave ? <button class="lnk strong" onClick={save}>{saveText}</button> : <span class="sp" />}
        </div>
        <div class="sh-b">
          {children}
          {onDelete && (
            <button class="btn danger wide" onClick={() => confirmBox(delAsk, 'Это действие нельзя отменить.', 'Удалить', () => { onDelete(); close(); }, true)}>
              {delText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ChooseItem { t: string; icon?: IconName; v?: string; danger?: boolean; fn: () => void }

/** Список действий на выбор. */
export function choose(title: string, sub: string | null, items: ChooseItem[]): void {
  openSheet(close => (
    <Sheet title={title} close={close}>
      {sub && <p class="ch-sub">{sub}</p>}
      <div class="list">
        {items.map(it => (
          <button class={'li' + (it.danger ? ' danger' : '')} onClick={() => { close(); it.fn(); }}>
            {it.icon && <Icon n={it.icon} />}
            <span class="grow">{it.t}</span>
            {it.v && <span class="lv">{it.v}</span>}
          </button>
        ))}
      </div>
    </Sheet>
  ));
}

/** Подтверждение действия. */
export function confirmBox(title: string, msg: string, yes: string, fn: () => void, danger = false): void {
  openSheet(close => (
    <Sheet title={title} close={close}>
      <p class="ch-sub">{msg}</p>
      <button class={'btn wide ' + (danger ? 'danger' : 'pri')} onClick={() => { close(); fn(); }}>{yes}</button>
    </Sheet>
  ));
}
