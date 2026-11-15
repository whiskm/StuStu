// Установка на главный экран: определение платформы и системная кнопка «Установить».

import { emit } from './store';

export type Platform = 'ios' | 'android' | 'desktop';

export function platform(): Platform {
  const ua = navigator.userAgent;
  // iPad с iPadOS представляется как Mac, отличаем по сенсорному экрану
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}
export function isStandalone(): boolean {
  return (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
}
/** В iOS ставить на главный экран умеет только Safari (и браузеры на его основе через «Поделиться»). */
export const isIosSafari = (): boolean => platform() === 'ios' && !/CriOS|FxiOS|EdgiOS|YaBrowser/.test(navigator.userAgent);

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null;
export const canPromptInstall = (): boolean => !!deferred;
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred; deferred = null;
  await ev.prompt();
  const r = await ev.userChoice;
  emit();
  return r.outcome === 'accepted';
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
}
