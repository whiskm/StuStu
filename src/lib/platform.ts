// Где запущен StuStu: сайт в браузере, приложение для Android или программа для Windows.

import { Capacitor } from '@capacitor/core';

/** Приложение для Android (собрано через Capacitor). */
export const isAndroidApp = Capacitor.isNativePlatform();

/** Программа для Windows (собрана через Tauri). */
export const isDesktopApp = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Любое установленное приложение, а не сайт. */
export const isApp = isAndroidApp || isDesktopApp;
