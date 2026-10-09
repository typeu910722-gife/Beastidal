// Browser smoke test: boots the real game in headless Chromium, plays a few seconds through the debug stepper
// and fails on any page error. Desktop runs in Chinese, mobile in English. Run with `npm run smoke` (CI installs Chromium first).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 8090;
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
  for (const mobile of [false, true]) {
    const ctx = await browser.newContext(
      mobile
        ? {
            viewport: { width: 844, height: 390 },
            hasTouch: true,
            isMobile: true,
            serviceWorkers: 'block',
            locale: 'en-US'
          }
        : { viewport: { width: 1280, height: 720 }, serviceWorkers: 'block', locale: 'zh-TW' }
    );
    await ctx.addInitScript(() => localStorage.setItem('beastidal-settings-v1', JSON.stringify({ quality: 'low' })));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${mobile ? 'mobile' : 'desktop'}: ${e}`));
    await page.goto(`http://localhost:${PORT}/?debug`);
    await page.waitForFunction(() => window.tidalReady, null, { timeout: 60000 });
    await page.click('#start-btn');
    await page.waitForTimeout(1200);
    if (await page.isVisible('#skip-intro')) await page.click('#skip-intro');
    await page.waitForFunction(() => window.__beastidal && !document.getElementById('hud').hidden, null, {
      timeout: 30000
    });
    await page.evaluate(() => {
      const B = window.__beastidal;
      B.keys.add('w');
      B.step(1 / 30, 60);
      B.keys.clear();
      B.repel();
      B.step(1 / 30, 30);
    });
    await page.screenshot({ path: `smoke-${mobile ? 'mobile' : 'desktop'}.png` });
    await ctx.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Smoke test passed (desktop + mobile).');
