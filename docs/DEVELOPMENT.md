# Для разработчиков

Как устроен проект, как собрать его самому и как выпускать новые версии. Описание приложения для пользователей — в [README](../README.md).

- [Сайт на Cloudflare](#сайт-на-cloudflare)
- [Выпуск новой версии](#выпуск-новой-версии)
- [Ключ подписи Android](#ключ-подписи-android-один-раз)
- [Разработка](#разработка)
- [Стек и структура](#стек)
- [Формат данных](#формат-данных)

## Сайт на Cloudflare

Приложение статическое: после сборки это просто файлы из папки `dist`. Настройки лежат в `wrangler.jsonc`: имя `stustu` и папка `dist`. Из имени получается адрес `https://stustu.<поддомен аккаунта>.workers.dev`.

Подключить один раз:

1. В панели Cloudflare: **Workers & Pages → Create → Import a repository** и выбрать этот репозиторий.
2. Настройки сборки:
   - Project name: `stustu` (должно совпадать с `name` в `wrangler.jsonc`)
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
3. **Save and Deploy.**

Дальше каждый push в `main` собирается и выкладывается сам. У тех, кто уже открыл приложение, появится плашка «Вышла новая версия StuStu → Обновить».

Версию Node.js для сборки задают файлы `.nvmrc` и `.node-version`.

Если адрес сайта будет другим, поменяйте его в `README.md` и в тексте релиза в `.github/workflows/release.yml`.

## Выпуск новой версии

Все приложения собирает GitHub Actions:

| Workflow | Когда | Что получается |
|---|---|---|
| `ci.yml` | каждый push | проверка типов, тесты, сборка сайта |
| `android.yml` | каждый push | `StuStu.apk` в артефактах запуска |
| `desktop.yml` | каждый push | установщик Windows (`.exe`) в артефактах запуска |
| `release.yml` | тег вида `v1.2.3` | APK и установщик, опубликованные одним релизом на странице **Releases** |

```bash
npm version patch          # 3.0.0 → 3.0.1: версия попадёт в сайт, Android и Windows
git push --follow-tags     # запускает release.yml
```

Тег можно создать и в браузере: **Releases → Draft a new release → Choose a tag → `v1.2.3` → Create new tag on publish → Publish release**. Если сборка или публикация не удалась, исправьте причину и запустите **Actions → Release → Run workflow** с этим тегом: файлы прикрепятся к уже созданному релизу.

Версия в `package.json` — единственная: из неё берутся `versionName` и `versionCode` Android, версия установщика Windows и строка «версия» в настройках приложения. Версию в `src-tauri/Cargo.toml` менять не обязательно.

### Ключ подписи Android (один раз)

Android устанавливает обновление поверх старой версии, только если обе подписаны одним ключом. Пока ключа в секретах нет, собирается отладочный APK: он работает, но каждый раз подписан новым временным ключом, поэтому следующая версия поверх него не встанет.

Создайте ключ один раз и сохраните в секретах репозитория (**Settings → Secrets and variables → Actions**):

```bash
keytool -genkeypair -v -keystore release.jks -alias stustu \
  -keyalg RSA -keysize 4096 -validity 10000

base64 -w0 release.jks > release.jks.base64   # на macOS: base64 -i release.jks
```

| Секрет | Значение |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | содержимое `release.jks.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | пароль хранилища |
| `ANDROID_KEY_ALIAS` | `stustu` |
| `ANDROID_KEY_PASSWORD` | пароль ключа |

Подойдёт и ключ от другого вашего приложения: одним ключом можно подписывать несколько приложений.

Храните `release.jks` и пароли в надёжном месте: без них нельзя выпустить обновление, которое встанет поверх установленного.

## Разработка

Нужен Node.js 22.

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # тесты: формат данных, расписание, календарь
npm run typecheck
npm run build        # сайт в dist/
```

Android (нужны Android Studio и JDK 21):

```bash
npm run android:sync # сборка для приложения и копирование в android/
npx cap open android # открыть в Android Studio
```

Windows (нужен [Rust](https://rustup.rs)):

```bash
npm run desktop:dev    # окно приложения с горячей перезагрузкой
npm run desktop:build  # установщик в src-tauri/target/release/bundle/
```

Служебные скрипты (нужен Playwright):

```bash
node scripts/make-icons.cjs      # перерисовать иконки из одного знака
npx capacitor-assets generate --android --iconBackgroundColor '#0F3B2E' --iconBackgroundColorDark '#0F3B2E' --splashBackgroundColor '#EEF2EC' --splashBackgroundColorDark '#0B1411'
npx tauri icon assets/icon-only.png
node scripts/screenshots.cjs     # переснять скриншоты для README (при запущенном npm run dev -- --port 5199)
```

### Стек

Preact · TypeScript · Vite · vite-plugin-pwa (Workbox) · Capacitor 8 для Android · [Tauri 2](https://tauri.app) для Windows (используется встроенный в систему браузерный движок, поэтому установщик маленький). Интерфейс свой, без готовых UI-китов. Шрифты лежат вместе с приложением.

Сайт, Android и Windows — один и тот же код. Различия собраны в двух местах:

- `src/lib/platform.ts` — где запущено приложение;
- `src/lib/files.ts` — как отдать файл пользователю: «Поделиться» на телефоне, окно «Сохранить как» в Windows, обычная загрузка в браузере.

### Структура

```
src/
  lib/          логика без интерфейса: данные, даты, расписание, файлы, календарь (.ics)
  ui/           общие элементы: окна, поля форм, иконки, линия «Маршрут дня»
  forms/        окна редактирования: пара, ДЗ, экзамен, заметка, подготовка, данные
  screens/      экраны: Сегодня, Расписание, Задания, Заметки, Статистика, внутренние страницы
  styles/       оформление и шрифты
tests/          тесты (Vitest)
android/        проект Capacitor
src-tauri/      оболочка для Windows: одно окно на запуск и сохранение файлов (Rust)
assets/         исходники иконок
public/         иконки сайта и заголовки для Cloudflare
legacy/v2.0/    старая версия, только для сравнения
docs/TZ.md      техническое задание
```

### Формат данных

Данные лежат в `localStorage` под ключом `stustu_data_v2`. Резервная копия — тот же объект в файле `.json`, формат совпадает с версией 2.0:

```jsonc
{
  "app": "StuStu",
  "version": 2,
  "kind": "full",            // "schedule" — только расписание, для одногруппников
  "nextId": 200,
  "settings": { /* недели, темы, пороги нагрузки… */ },
  "subjects": [ /* предметы */ ],
  "bells": [ /* время пар, минуты от полуночи */ ],
  "lessons": [ /* пары по дням недели и неделям цикла */ ],
  "holidays": [], "cancels": [],
  "homework": [], "events": [], "notes": [],
  "attendance": { "20773:12": "p" },   // "день:пара" → был / опоздал / не был / уважительная
  "prep": [ /* записи подготовки */ ],
  "timer": null
}
```

Даты хранятся как номер дня от 1970-01-01. При загрузке каждое поле проверяется и приводится к правильному типу (`normalize` в `src/lib/store.ts`), неизвестные значения отбрасываются.
