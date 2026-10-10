// CPU-profiles the running game: which functions cost the most per frame, plus true draw-call / triangle counts.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 8092;
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore'
});
let browser;
try {
  await new Promise(r => setTimeout(r, 700));
  browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    locale: 'zh-TW'
  });
  await ctx.addInitScript(() => localStorage.setItem('beastidal-settings-v1', JSON.stringify({ quality: 'balanced' })));
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForFunction(() => window.tidalReady, null, { timeout: 240000 });
  await page.click('#start-btn');
  await page.waitForSelector('#modal-actions button');
  await page.click('#modal-actions button:nth-child(1)');
  await page.waitForTimeout(1200);
  if (await page.isVisible('#skip-intro')) await page.click('#skip-intro');
  await page.waitForFunction(() => window.__beastidal && !document.getElementById('hud').hidden, null, {
    timeout: 120000
  });
  // true render load: stop the info reset so every pass of one frame is counted
  const load = await page.evaluate(() => {
    const B = window.__beastidal,
      r = B.world.renderer;
    r.info.autoReset = false;
    r.info.reset();
    B.world.render();
    const out = {
      calls: r.info.render.calls,
      triangles: r.info.render.triangles,
      geometries: r.info.memory.geometries,
      textures: r.info.memory.textures
    };
    r.info.autoReset = true;
    return out;
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const timing = await page.evaluate(() => {
    const B = window.__beastidal;
    const t1 = performance.now();
    B.step(1 / 30, 1);
    const one = performance.now() - t1;
    const t2 = performance.now();
    B.step(1 / 30, 121);
    const many = performance.now() - t2;
    return { oneStepMs: +one.toFixed(1), updateMsPerFrame: +((many - one) / 120).toFixed(2) };
  });
  const { profile } = await cdp.send('Profiler.stop');
  const nodes = new Map(profile.nodes.map(n => [n.id, n]));
  const self = new Map();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + profile.timeDeltas[i]));
  const agg = new Map();
  for (const [id, t] of self) {
    const cf = nodes.get(id).callFrame;
    const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`;
    agg.set(k, (agg.get(k) || 0) + t);
  }
  const total = [...agg.values()].reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ load, timing }, null, 1));
  [...agg]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .forEach(([k, t]) =>
      console.log(`${(t / 1000).toFixed(0).padStart(6)} ms ${((t / total) * 100).toFixed(1).padStart(5)}%  ${k}`)
    );
} finally {
  await browser?.close();
  server.kill();
}
