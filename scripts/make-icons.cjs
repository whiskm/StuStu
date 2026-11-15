// Рисует PNG-иконки из векторного знака. Запуск: node scripts/make-icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const out = path.join(__dirname, '..', 'public');
// Знак в квадрате 64×64. scale — доля холста, которую он занимает.
const mark = `<path d="M22 16v32" stroke="#EAF3EC" stroke-width="5" stroke-linecap="round"/><circle cx="22" cy="16" r="6" fill="#0F3B2E" stroke="#EAF3EC" stroke-width="4"/><circle cx="22" cy="48" r="6" fill="#0F3B2E" stroke="#EAF3EC" stroke-width="4"/><circle cx="22" cy="33" r="7" fill="#FFC247" stroke="#0F3B2E" stroke-width="3"/><path d="M36 16h14M36 33h10M36 48h14" stroke="#EAF3EC" stroke-width="5" stroke-linecap="round"/>`;
const svg = (size, scale) => {
  const s = (size * scale) / 64, off = (size - 64 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#0F3B2E"/><g transform="translate(${off} ${off}) scale(${s})">${mark}</g></svg>`;
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  // Обычные иконки: знак крупно. Маскируемая: знак в безопасной зоне (круг 80%).
  for (const [name, size, scale] of [['icon-192.png', 192, 0.86], ['icon-512.png', 512, 0.86], ['apple-touch-icon.png', 180, 0.8], ['icon-maskable-512.png', 512, 0.62]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0">${svg(size, scale)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: false });
  }
  await b.close();
})();
