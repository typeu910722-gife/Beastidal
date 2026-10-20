// Browser check of the warship upgrade: boots the real build, puts a warship afloat in the live state, opens
// the 航務與遺跡 panel and presses the upgrade button. Run with `node tests/ui-warship.mjs` (after `npm run smoke`
// has installed Chromium; CI installs it before the smoke step).
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 8091;
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore'
});
const errors = [];
let browser;
try {
  await new Promise(r => setTimeout(r, 600));
  browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    locale: 'zh-TW'
  });
  await ctx.addInitScript(() => localStorage.setItem('beastidal-settings-v1', JSON.stringify({ quality: 'low' })));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForFunction(() => window.tidalReady, null, { timeout: 60000 });
  // (clicks are dispatched on the element: software rendering can keep the page busy longer than Playwright waits)
  await page.$eval('#start-btn', el => el.click());
  await page.waitForSelector('#modal-actions button');
  await page.$eval('#modal-actions button:nth-child(1)', el => el.click());
  await page.waitForTimeout(1200);
  if (await page.isVisible('#skip-intro')) await page.$eval('#skip-intro', el => el.click());
  await page.waitForFunction(() => window.__beastidal && !document.getElementById('hud').hidden, null, {
    timeout: 30000
  });

  // a warship afloat, the crew aboard, and materials to spare
  const before = await page.evaluate(async () => {
    const B = window.__beastidal;
    const S = await import('./ship.js?v=0.76.0');
    const s = B.state;
    for (const k of Object.keys(s.resources)) s.resources[k] = 2000;
    s.ship = { x: 40, z: 40, heading: 0, cargo: {}, lounge: [], lastCannon: -999 };
    S.normalizeShip(s);
    s.player.mode = 'ship';
    B.world.sync(s);
    B.openPanel('adventure');
    return s.ship.tier;
  });
  assert.equal(before, 1);

  // the warship row lives on the 航務與遺跡 tab
  await page.$eval('[data-exp-tab="voyage"]', el => el.click());
  await page.waitForSelector('#upgrade-ship', { timeout: 60000 });
  const label = await page.textContent('#upgrade-ship');
  assert.match(label, /升級/);
  await page.$eval('#upgrade-ship', el => el.click());
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__beastidal.state.ship.tier);
  assert.equal(after, 2, 'the button raised the warship to tier 2');

  await page.screenshot({ path: 'smoke-warship-upgrade.png', timeout: 90000 }).catch(() => {});
  await ctx.close();
} finally {
  await browser?.close();
  server.kill();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Warship upgrade UI check passed.');
