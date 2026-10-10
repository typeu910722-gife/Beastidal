// Visual check: boots the game headless and photographs named spots of the lake map.
// Usage: node scripts/shots.mjs [quality] [name-filter | story]   -> shots/*.png
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 8091,
  quality = process.argv[2] || 'high',
  only = process.argv[3] || '';
mkdirSync('shots', { recursive: true });
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore'
});
const errors = [];
let browser;
// [name, setup run in the page (B = window.__beastidal, s = state, w = world, I/L/G/S = modules), key to press]
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
    '06-dive-city',
    `const p=L.LANDMARKS.plaza;Object.assign(s.player,{x:p.x+40,z:p.z+40,mode:'boat'});s.tamed.push({id:'shot-pet',name:'shot',genome:G.makeGenome(5,1,'sea'),generation:0,parents:[],bond:70,stamina:100,health:100,penId:null});s.expedition.activeId='shot-pet';s.expedition.mounted=true;s.expedition.diving=true;s.expedition.oxygen=90;w.distance=30;w.pitch=.3;w.yaw=.8;`
  ],
  [
    '08-statue',
    `if(!s.tamed.length)s.tamed.push({id:'shot-pet',name:'shot',genome:G.makeGenome(5,1,'sea'),generation:0,parents:[],bond:70,stamina:100,health:100,penId:null});s.expedition.activeId=s.tamed[0].id;const g=L.LANDMARKS.greatGate;Object.assign(s.player,{x:g.x+12,z:g.z-40,mode:'boat'});s.expedition.mounted=true;s.expedition.diving=true;s.expedition.oxygen=90;w.distance=34;w.pitch=.22;w.yaw=3.4;`
  ],
  [
    '09-beast',
    `s.expedition.diving=false;s.expedition.mounted=false;S.normalizeStory(s);Object.assign(s.story,{stage:3,keys:['tide','stone','bone'],beast:{x:S.BEAST_HOME.x,z:S.BEAST_HOME.z,hp:900,maxHp:900}});Object.assign(s.player,{x:S.BEAST_HOME.x+7,z:S.BEAST_HOME.z+5,mode:'foot'});w.distance=24;w.pitch=.32;w.yaw=.6;`
  ],
  ['10-dialogue', `B.keys.clear();`, 'e'],
  [
    '11-hud',
    `document.querySelectorAll('#modal-shade').forEach(e=>e.hidden=true);s.player.mode='boat';Object.assign(s.player,{x:9,z:12});s.expedition.diving=false;s.expedition.mounted=false;w.distance=40;w.pitch=.5;w.yaw=2.4;`
  ],
  [
    '12-bag',
    `s.device&&(s.device.owned=true);s.resources.wood=23;s.resources.food=4;s.contracts=2;B.openPanel('bag');`
  ],
  [
    '13-locker',
    `B.openPanel('bag');const d=s.buildings.find(b=>b.type==='desk');s.storage.wood=37;s.storage.metal=12;s.storage.crystal=5;s.storage.food=8;Object.assign(s.player,{mode:'foot',level:0,x:d.x*3.6+1.6,z:d.z*3.6});B.openPanel('locker');`
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
  page.on(
    'console',
    m => m.type() === 'error' && !/AudioContext/.test(m.text()) && errors.push('console: ' + m.text())
  );
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
  for (const [name, setup, key, click] of SPOTS) {
    if (
      only &&
      !name.includes(only) &&
      !(only === 'story' && name >= '08' && name < '11') &&
      !(only === 'ui' && name >= '11')
    )
      continue;
    await page.evaluate(async code => {
      const B = window.__beastidal,
        s = B.state,
        w = B.world;
      const v = '?v=0.17.0',
        I = await import('/islands.js' + v),
        L = await import('/lake.js' + v),
        G = await import('/genetics.js' + v),
        S = await import('/story.js' + v);
      document.querySelectorAll('#monologue,#discovery,.toast').forEach(e => (e.hidden = true));
      const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
      await new AsyncFn('B', 's', 'w', 'I', 'L', 'G', 'S', code)(B, s, w, I, L, G, S);
      B.step(1 / 30, 150);
    }, setup);
    if (key) {
      await page.keyboard.press(key);
      await page.waitForTimeout(800);
      await page.evaluate(() => window.__beastidal.step(1 / 30, 20));
    }
    if (click) {
      await page.click(`text=${click}`);
      await page.waitForTimeout(600);
    }
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
