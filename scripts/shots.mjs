// Visual check: boots the game headless and photographs named spots of the lake map.
// Usage: node scripts/shots.mjs [quality]   -> shots/*.png
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 8091,
  quality = process.argv[2] || 'high';
mkdirSync('shots', { recursive: true });
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore'
});
const errors = [];
let browser;
// [name, setup run in the page with B = window.__beastidal]
const SPOTS = [
  ['01-raft', `s.player.mode='boat';Object.assign(s.player,{x:9,z:12});w.distance=40;w.pitch=.42;w.yaw=2.4;`],
  ['02-overview', `s.player.mode='boat';Object.assign(s.player,{x:60,z:20});w.distance=75;w.pitch=1.0;w.yaw=3.0;`],
  [
    '03-ruins-island',
    `const d=I.islandDocks().find(k=>k.island==='ruins');Object.assign(s.player,d.foot,{mode:'foot'});w.distance=30;w.pitch=.35;w.yaw=d.boat.heading;`
  ],
  [
    '04-boathouse',
    `const d=I.islandDocks().find(k=>k.island==='palm');Object.assign(s.player,d.foot,{mode:'foot'});w.distance=36;w.pitch=.4;w.yaw=d.boat.heading+.6;`
  ],
  [
    '05-peninsula',
    `const d=I.islandDocks().find(k=>k.island==='crystal');Object.assign(s.player,d.boat,{mode:'boat'});w.distance=60;w.pitch=.3;w.yaw=d.boat.heading;`
  ],
  [
    '06-dive-city',
    `const p=L.LANDMARKS.plaza;Object.assign(s.player,{x:p.x+40,z:p.z+40,mode:'boat'});const pet={id:'shot-pet',name:'shot',genome:G.makeGenome(5,1,'sea'),generation:0,parents:[],bond:70,stamina:100,health:100,penId:null};s.tamed.push(pet);s.expedition.activeId=pet.id;s.expedition.mounted=true;s.expedition.diving=true;s.expedition.oxygen=90;w.distance=30;w.pitch=.3;w.yaw=.8;`
  ],
  [
    '07-coral',
    `const c=L.LANDMARKS.coral;Object.assign(s.player,{x:c.x-60,z:c.z+40,mode:'boat'});s.expedition.mounted=false;s.expedition.diving=false;w.distance=55;w.pitch=.45;w.yaw=2.2;`
  ]
];
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
  await ctx.addInitScript(q => localStorage.setItem('beastidal-settings-v1', JSON.stringify({ quality: q })), quality);
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push('console: ' + m.text()));
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForFunction(() => window.tidalReady, null, { timeout: 120000 });
  await page.click('#start-btn');
  await page.waitForSelector('#modal-actions button');
  await page.click('#modal-actions button:nth-child(1)');
  await page.waitForTimeout(1200);
  if (await page.isVisible('#skip-intro')) await page.click('#skip-intro');
  await page.waitForFunction(() => window.__beastidal && !document.getElementById('hud').hidden, null, {
    timeout: 60000
  });
  for (const [name, setup] of SPOTS) {
    await page.evaluate(async code => {
      const B = window.__beastidal,
        s = B.state,
        w = B.world;
      const I = await import('/islands.js?v=0.15.0'),
        L = await import('/lake.js?v=0.15.0'),
        G = await import('/genetics.js?v=0.15.0');
      document.querySelectorAll('#monologue,#discovery,.toast').forEach(e => (e.hidden = true));
      new Function('B', 's', 'w', 'I', 'L', 'G', code)(B, s, w, I, L, G);
      B.step(1 / 30, 240);
    }, setup);
    await page.screenshot({ path: `shots/${name}.png` });
    console.log('shot', name);
  }
} finally {
  await browser?.close();
  server.kill();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
