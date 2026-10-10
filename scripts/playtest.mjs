// Playtest: plays the live (or local) build in headless Chromium and reports load cost, per-frame cost, render load,
// UI overflow and HUD overlap on desktop and phone sizes. Usage: node scripts/playtest.mjs [url] [quality]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const URL_ = process.argv[2] || 'https://beastidal.yzprojecttw.com/',
  quality = process.argv[3] || 'balanced';
mkdirSync('shots/play', { recursive: true });
const report = { url: URL_, quality, runs: [] };
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});

const SIZES = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, mobile: false },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, mobile: true },
  { name: 'phone-portrait', viewport: { width: 390, height: 844 }, mobile: true }
];
for (const size of SIZES) {
  const run = { size: size.name, errors: [], findings: [] };
  const ctx = await browser.newContext({
    viewport: size.viewport,
    hasTouch: size.mobile,
    isMobile: size.mobile,
    serviceWorkers: 'block',
    locale: 'zh-TW'
  });
  await ctx.addInitScript(q => localStorage.setItem('beastidal-settings-v1', JSON.stringify({ quality: q })), quality);
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  page.on('pageerror', e => run.errors.push(String(e).slice(0, 200)));
  page.on(
    'console',
    m => m.type() === 'error' && !/AudioContext/.test(m.text()) && run.errors.push('console: ' + m.text().slice(0, 200))
  );
  const t0 = Date.now();
  await page.goto(URL_ + '?debug', { waitUntil: 'load' });
  run.loadMs = Date.now() - t0;
  await page.waitForFunction(() => window.tidalReady, null, { timeout: 180000 });
  run.readyMs = Date.now() - t0;
  run.network = await page.evaluate(() => {
    const r = performance.getEntriesByType('resource');
    const total = r.reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0);
    const big = r
      .map(e => ({
        name: e.name.split('/').slice(-2).join('/').split('?')[0],
        kb: Math.round((e.transferSize || e.encodedBodySize || 0) / 1024)
      }))
      .sort((a, b) => b.kb - a.kb)
      .slice(0, 6);
    return { requests: r.length, totalKB: Math.round(total / 1024), big };
  });
  await page.screenshot({ path: `shots/play/${size.name}-0-title.png` });
  await page.click('#start-btn');
  await page.waitForSelector('#modal-actions button');
  await page.click('#modal-actions button:nth-child(1)');
  await page.waitForTimeout(1500);
  if (size.name === 'phone-portrait') {
    // the game pauses behind a "rotate your phone" screen by design; record that and what it says
    run.findings.push('portrait: blocked by rotate screen (by design)');
    await page.screenshot({ path: `shots/play/${size.name}-1-rotate.png` });
    report.runs.push(run);
    writeFileSync('shots/play/report.json', JSON.stringify(report, null, 2));
    await ctx.close();
    continue;
  }
  if (await page.isVisible('#skip-intro')) await page.click('#skip-intro');
  await page.waitForFunction(() => window.__beastidal && !document.getElementById('hud').hidden, null, {
    timeout: 120000
  });
  // let the first-person tutorial toast settle, then measure the sim + render cost per frame
  run.perf = await page.evaluate(() => {
    const B = window.__beastidal;
    const info = B.world.renderer.info;
    const sample = n => {
      const t = performance.now();
      B.step(1 / 30, n);
      return (performance.now() - t) / n;
    };
    sample(10);
    const ms = sample(60);
    return {
      msPerFrame: +ms.toFixed(1),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
    };
  });
  // sail a bit, then audit every panel
  await page.evaluate(() => {
    const B = window.__beastidal;
    B.keys.add('w');
    B.step(1 / 30, 120);
    B.keys.clear();
  });
  await page.screenshot({ path: `shots/play/${size.name}-1-sea.png` });
  run.hud = await page.evaluate(() => {
    const ids = [
      'resources',
      'minimap',
      'beast-bar',
      'context-action',
      'monologue',
      'dock-btn',
      'joystick',
      'repel-btn'
    ];
    const boxes = ids
      .map(id => [id, document.getElementById(id)])
      .filter(([, e]) => e && !e.hidden && e.offsetParent !== null)
      .map(([id, e]) => [id, e.getBoundingClientRect()]);
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i][1],
          b = boxes[j][1];
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
          overlaps.push(`${boxes[i][0]} × ${boxes[j][0]}`);
      }
    const off = boxes
      .filter(([, r]) => r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1)
      .map(([id]) => id);
    return { overlaps, offscreen: off };
  });
  run.panels = {};
  for (const [key, name] of [
    ['b', 'build'],
    ['i', 'bag'],
    ['j', 'journal'],
    ['k', 'adventure'],
    ['c', 'creatures']
  ]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const d = document.getElementById('drawer'),
        body = document.getElementById('drawer-body'),
        modal = !document.getElementById('modal-shade').hidden;
      if (!d || d.hidden) return { open: false, modal };
      const r = d.getBoundingClientRect();
      return {
        open: true,
        scrolls: body.scrollHeight > body.clientHeight + 4,
        scrollRatio: +(body.scrollHeight / Math.max(1, body.clientHeight)).toFixed(2),
        w: Math.round(r.width),
        h: Math.round(r.height),
        coversPct: Math.round(((r.width * r.height) / (innerWidth * innerHeight)) * 100)
      };
    });
    run.panels[name] = m;
    await page.screenshot({ path: `shots/play/${size.name}-2-${name}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  run.dom = await page.evaluate(() => ({ nodes: document.getElementsByTagName('*').length }));
  report.runs.push(run);
  writeFileSync('shots/play/report.json', JSON.stringify(report, null, 2));
  await ctx.close();
  console.log('done', size.name);
}
await browser.close();
writeFileSync('shots/play/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
