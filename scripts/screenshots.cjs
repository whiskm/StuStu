// Снимает скриншоты для README на демонстрационных данных.
// Запуск: npm run dev -- --port 5199 (в другом окне), затем node scripts/screenshots.cjs
// Нужны Playwright и sharp (sharp ставится вместе с @capacitor/assets).
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const out = path.join(__dirname, '..', 'docs', 'screenshots');
const URL = process.env.STUSTU_URL || 'http://localhost:5199/';

// «Сейчас» для скриншотов: понедельник, идёт вторая пара.
const NOW = new Date(2026, 10, 16, 11, 22, 0);
const MON = Math.round(Date.UTC(2026, 10, 16) / 864e5);
const L = (id, sid, type, day, bell, room) => ({ id, subjectId: sid, type, day, bell, room, week: -1, teacher: '', customStart: -1, customEnd: -1, note: '' });
const att = {};
for (const [d, marks] of [[-7, 'pppl'], [-6, 'ppp'], [-5, 'ppa'], [-4, 'ppp'], [-3, 'plpp']]) {
  const ids = { '-7': [1, 2, 3, 4], '-6': [5, 6, 7], '-5': [9, 10, 11], '-4': [12, 13, 14], '-3': [15, 16, 17, 18] }[d];
  ids.forEach((id, i) => { att[`${MON + d}:${id}`] = marks[i]; });
}
att[`${MON}:1`] = 'p';
const data = {
  app: 'StuStu', version: 2, nextId: 200,
  settings: { cycleWeeks: 2, anchorMonday: MON, weekNames: ['Числитель', 'Знаменатель'], attStart: MON - 7, lastBackup: NOW.getTime(), installHintOff: true },
  subjects: [
    { id: 1, name: 'Английский язык', teacher: '', color: 7 }, { id: 2, name: 'Операционные системы', teacher: 'Петров А. В.', color: 6 },
    { id: 3, name: 'Математический анализ', teacher: '', color: 1 }, { id: 4, name: 'Физика', teacher: '', color: 3 },
  ],
  bells: [[540, 630], [640, 730], [760, 850], [860, 950], [960, 1050]].map(([start, end]) => ({ start, end })),
  lessons: [
    L(1, 1, 'PRACTICE', 1, 1, '101'), L(2, 2, 'LAB', 1, 2, '412'), L(3, 3, 'LECTURE', 1, 3, '305'), L(4, 4, 'SEMINAR', 1, 4, '214'),
    L(5, 3, 'SEMINAR', 2, 1, '318'), L(6, 4, 'LECTURE', 2, 2, '201'), L(7, 1, 'PRACTICE', 2, 3, '101'),
    L(9, 2, 'LECTURE', 3, 1, '120'), L(10, 2, 'LAB', 3, 2, '412'), L(11, 1, 'PRACTICE', 3, 3, '101'),
    L(12, 3, 'LECTURE', 4, 1, '305'), L(13, 4, 'LAB', 4, 2, '214'), L(14, 4, 'SEMINAR', 4, 3, '214'),
    L(15, 3, 'PRACTICE', 5, 1, '318'), L(16, 3, 'LECTURE', 5, 2, '305'), L(17, 2, 'LECTURE', 5, 3, '120'), L(18, 1, 'PRACTICE', 5, 4, '101'),
    L(19, 4, 'LAB', 6, 1, '214'),
  ],
  holidays: [],
  homework: [
    { id: 50, subjectId: 2, text: 'Отчёт по лабораторной №3', created: MON - 5, dueDay: MON, dueBell: 2, dueLabel: 'к лабораторной', remindDays: 1, estMin: 30 },
    { id: 51, subjectId: 3, text: 'Решить №3 и №4', created: MON - 2, dueDay: MON + 1, dueBell: 1, dueLabel: 'к семинару', remindDays: 1, estMin: 60 },
    { id: 52, subjectId: 1, text: 'Эссе на 300 слов', created: MON - 2, dueDay: MON + 2, dueBell: 3, dueLabel: 'к практике', remindDays: 1, estMin: 90 },
    { id: 53, subjectId: 3, text: 'Типовой расчёт, часть 1', created: MON - 2, dueDay: MON + 4, dueBell: 1, dueLabel: 'к практике', remindDays: 2, estMin: 120 },
    { id: 54, subjectId: 4, text: 'Задачи 1.1–1.5', created: MON - 6, dueDay: MON - 4, dueBell: -1, dueLabel: '', remindDays: 1, estMin: 30, done: true, doneDay: MON - 5 },
    { id: 55, subjectId: 1, text: 'Выучить слова, модуль 4', created: MON - 6, dueDay: MON - 5, dueBell: -1, dueLabel: '', remindDays: 1, estMin: 30, done: true, doneDay: MON - 5 },
  ],
  events: [
    { id: 60, kind: 'EXAM', subjectId: 2, title: '', day: MON + 8, bell: 2, time: -1, room: '412', details: 'Билеты 1–30. Взять зачётку.', remindDays: 3, prepGoalMin: -1 },
    { id: 62, kind: 'COLLOQ', subjectId: 3, title: '', day: MON + 4, bell: 2, time: -1, room: '305', details: '', remindDays: 3, prepGoalMin: -1 },
  ],
  notes: [{ id: 70, text: 'Взять ноутбук на лабораторную', pinned: false, attach: 'DATE', day: MON + 2, bell: -1, week: -1, weekday: 3, subjectId: -1, created: MON - 1 }],
  cancels: [],
  attendance: att,
  prep: [
    { id: 80, subjectId: 2, eventId: 60, hwId: -1, day: MON - 1, min: 90, note: 'билеты 1–10', ts: 5 },
    { id: 81, subjectId: 3, eventId: 62, hwId: -1, day: MON - 1, min: 45, note: '', ts: 4 },
    { id: 82, subjectId: 2, eventId: 60, hwId: -1, day: MON - 2, min: 60, note: '', ts: 3 },
    { id: 83, subjectId: 3, eventId: 62, hwId: -1, day: MON - 3, min: 75, note: 'пределы', ts: 2 },
    { id: 84, subjectId: 1, eventId: -1, hwId: -1, day: MON - 4, min: 30, note: '', ts: 1 },
    { id: 85, subjectId: 4, eventId: -1, hwId: -1, day: MON - 6, min: 50, note: '', ts: 0 },
  ],
  timer: null,
};

const tab = name => p => p.click(`.tab:has-text("${name}")`);
const shots = [
  ['home', 'phone', 'light', null],
  ['schedule', 'phone', 'light', tab('Расписание')],
  ['exams', 'phone', 'light', async p => { await tab('Задания')(p); await p.click('.seg button:has-text("Экзамены")'); }],
  ['stats', 'phone', 'light', async p => { await tab('Статистика')(p); await p.click('.seg button:has-text("Подготовка")'); }],
  ['dark', 'phone', 'dark', null],
  ['dark-schedule', 'phone', 'dark', tab('Расписание')],
  ['desktop', 'desktop', 'light', tab('Расписание')],
];

(async () => {
  const b = await chromium.launch();
  for (const [name, device, theme, steps] of shots) {
    const ctx = await b.newContext({
      viewport: device === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      deviceScaleFactor: 2, isMobile: device === 'phone', hasTouch: device === 'phone', colorScheme: theme, serviceWorkers: 'block', locale: 'ru-RU',
    });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(NOW);
    await p.addInitScript(d => { localStorage.setItem('stustu_data_v2', d); }, JSON.stringify(data));
    await p.goto(URL);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    if (steps) { await steps(p); await p.waitForTimeout(300); }
    const png = await p.screenshot();
    await sharp(png).webp({ quality: 86 }).toFile(path.join(out, name + '.webp'));
    console.log(name);
    await ctx.close();
  }
  await b.close();
})();
