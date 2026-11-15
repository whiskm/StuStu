// Работа без интернета и обновление приложения.

import { registerSW } from 'virtual:pwa-register';
import { emit } from './store';

let needRefresh = false;
let update: ((reload?: boolean) => Promise<void>) | null = null;
let onReady: (() => void) | null = null;

export const updateReady = (): boolean => needRefresh;
export function applyUpdate(): void { needRefresh = false; emit(); void update?.(true); }
export function dismissUpdate(): void { needRefresh = false; emit(); }

export function initPwa(offlineReady: () => void): void {
  onReady = offlineReady;
  if (!('serviceWorker' in navigator)) return;
  update = registerSW({
    onNeedRefresh() { needRefresh = true; emit(); },
    onOfflineReady() { onReady?.(); },
    onRegisteredSW(_url, reg) {
      // Проверяем обновления раз в час и при возвращении в приложение
      if (!reg) return;
      setInterval(() => { void reg.update(); }, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update(); });
    },
  });
}
