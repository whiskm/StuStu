// Рисует все иконки из одного знака. Запуск: node scripts/make-icons.cjs (нужен Playwright).
// После этого:
//   npx capacitor-assets generate --android --iconBackgroundColor '#0F3B2E' --iconBackgroundColorDark '#0F3B2E' --splashBackgroundColor '#EEF2EC' --splashBackgroundColorDark '#0B1411'
//   npx tauri icon assets/icon-only.png
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const BG = '#0F3B2E';
// Знак нарисован в квадрате 64×64: линия дня с остановками и точкой «сейчас».
const mark = `<path d="M22 16v32" stroke="#EAF3EC" stroke-width="5" stroke-linecap="round"/><circle cx="22" cy="16" r="6" fill="${BG}" stroke="#EAF3EC" stroke-width="4"/><circle cx="22" cy="48" r="6" fill="${BG}" stroke="#EAF3EC" stroke-width="4"/><circle cx="22" cy="33" r="7" fill="#FFC247" stroke="${BG}" stroke-width="3"/><path d="M36 16h14M36 33h10M36 48h14" stroke="#EAF3EC" stroke-width="5" stroke-linecap="round"/>`;
// scale — какую долю холста занимает знак; bg — фон (null — прозрачный); plate — подложка под знак на светлом фоне.
function svg(size, scale, bg, plate) {
  const s = (size * scale) / 64, off = (size - 64 * s) / 2;
  const back = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';
  const pl = plate ? `<rect x="${off}" y="${off}" width="${64 * s}" height="${64 * s}" rx="${14 * s}" fill="${BG}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${back}${pl}<g transform="translate(${off} ${off}) scale(${s})">${mark}</g></svg>`;
}
const jobs = [
  // Сайт
  ['public/icon-192.png', 192, 0.86, BG],
  ['public/icon-512.png', 512, 0.86, BG],
  ['public/apple-touch-icon.png', 180, 0.8, BG],
  ['public/icon-maskable-512.png', 512, 0.62, BG], // знак в безопасной зоне: Android обрезает края
  // Исходники для Android и Windows
  ['assets/icon-only.png', 1024, 0.86, BG],
  ['assets/icon-foreground.png', 1024, 0.5, null], // адаптивная иконка Android обрезает ещё сильнее
  ['assets/splash.png', 2732, 0.16, '#EEF2EC', true],
  ['assets/splash-dark.png', 2732, 0.16, '#0B1411', true],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [out, size, scale, bg, plate] of jobs) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(size, scale, bg, plate)}</body></html>`);
    await p.screenshot({ path: path.join(root, out), omitBackground: !bg });
    console.log(out);
  }
  await b.close();
})();
