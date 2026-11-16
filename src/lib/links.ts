// Внешние ссылки.

import { isDesktopApp } from './platform';

/** Страница проекта: новые версии, инструкции, исходный код. */
export const GITHUB_URL = 'https://github.com/whiskm/StuStu';

/**
 * Обработчик нажатия для ссылки <a target="_blank">.
 * В браузере и на Android ссылка открывается сама (на Android — в браузере телефона),
 * а в программе для Windows её нужно передать системе, иначе ничего не произойдёт.
 */
export function onExternalClick(e: MouseEvent): void {
  if (!isDesktopApp) return;
  const a = e.currentTarget as HTMLAnchorElement;
  e.preventDefault();
  void import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(a.href)).catch(() => {});
}
