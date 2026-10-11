// Renders key-art portraits of the 御獸 with the game's own engine (dist/dev/keyart.html) into dist/art/, then
// rebuilds the manifest. Needs the local server on :8080 (the preview's "beastidal" config).
//   node scripts/render-keyart.mjs                 every wild beast and every element
//   node scripts/render-keyart.mjs beast-flamemaw  only these keys
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { BEAST_IDS } from '../dist/beasts.js';
import { LOOKS } from '../dist/beast-look.js';

const keys = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [...BEAST_IDS.map(id => 'beast-' + id), ...Object.entries(LOOKS).map(([id, l]) => `look-${id}-${l.plan}`)];
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let done = 0;
for (const key of keys) {
  const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  try {
    await p.goto(`http://localhost:8080/dev/keyart.html?key=${key}&nc=${Date.now()}`, { timeout: 120000 });
    await p.waitForFunction(() => window.keyartReady, null, { timeout: 300000 });
    const url = await p.evaluate(() => window.keyart);
    const ext = url.startsWith('data:image/webp') ? 'webp' : 'png';
    writeFileSync(`dist/art/${key}.${ext}`, Buffer.from(url.split(',')[1], 'base64'));
    done++;
    console.log(`✓ ${key}.${ext}`);
  } catch (e) {
    console.log(`✗ ${key}: ${String(e).slice(0, 160)} ${errs.join(' | ')}`);
  }
  await p.close();
}
await b.close();
if (done) execSync('node scripts/art-manifest.mjs', { stdio: 'inherit' });
