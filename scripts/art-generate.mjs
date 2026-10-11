// Generates the game's illustrations with Higgsfield (SOUL V2 text-to-image) from docs/art-prompts.md and drops
// them into dist/art/, then rebuilds the manifest. Credentials come from the environment only:
//   HF_API_KEY_ID=...  HF_API_KEY_SECRET=...   (from https://console.higgsfield.ai — never commit them)
// Usage:
//   node scripts/art-generate.mjs title intro studio          one or more keys
//   node scripts/art-generate.mjs --group beasts              a group: pages | beasts | looks | species | places
//   node scripts/art-generate.mjs --all                       everything that is still missing
//   add --force to regenerate pictures that already exist, --dry to only print what would be sent
// API: POST https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard, then poll status_url until a terminal state.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const API = 'https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard';
const ID = process.env.HF_API_KEY_ID,
  SECRET = process.env.HF_API_KEY_SECRET;
const args = process.argv.slice(2),
  flag = f => args.includes(f),
  group = args.includes('--group') ? args[args.indexOf('--group') + 1] : null,
  keysWanted = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--group');
const dir = join(process.cwd(), 'dist', 'art');

// ---- the prompt sheet: "### `key`" blocks with a "> prompt" line
const sheet = readFileSync(join(process.cwd(), 'docs', 'art-prompts.md'), 'utf8');
const prompts = [];
for (const m of sheet.matchAll(/### `([^`]+)`[\s\S]*?\n> ([^\n]+)/g)) prompts.push({ key: m[1], prompt: m[2].trim() });
const groupOf = k =>
  /^(title|intro|studio)$/.test(k)
    ? 'pages'
    : k.startsWith('beast-')
      ? 'beasts'
      : k.startsWith('look-')
        ? 'looks'
        : k.startsWith('species-')
          ? 'species'
          : 'places';
const ratioOf = k => (groupOf(k) === 'pages' || groupOf(k) === 'species' ? '16:9' : '3:2');
const have = new Set(readdirSync(dir).map(f => f.replace(/\.[a-z0-9]+$/i, '')));
let todo = prompts.filter(p =>
  keysWanted.length ? keysWanted.includes(p.key) : group ? groupOf(p.key) === group : flag('--all')
);
if (!flag('--force')) todo = todo.filter(p => !have.has(p.key));
if (!todo.length) {
  console.log('nothing to generate (use keys, --group <pages|beasts|looks|species|places> or --all; --force to redo)');
  process.exit(0);
}
console.log(`${todo.length} picture(s) to generate${flag('--dry') ? ' (dry run)' : ''}:`);
for (const p of todo) console.log(`  ${p.key} [${ratioOf(p.key)}]`);
if (flag('--dry')) process.exit(0);
if (!ID || !SECRET) {
  console.error('set HF_API_KEY_ID and HF_API_KEY_SECRET in the environment first (console.higgsfield.ai → API keys)');
  process.exit(1);
}
const headers = { Authorization: `Key ${ID}:${SECRET}`, 'Content-Type': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generate(p) {
  const body = {
    prompt: p.prompt,
    aspect_ratio: ratioOf(p.key),
    resolution: '1080p',
    enhance_prompt: false,
    batch_size: 1
  };
  const idem = createHash('sha1')
    .update(p.key + '|' + p.prompt)
    .digest('hex');
  let r = await fetch(API, {
    method: 'POST',
    headers: { ...headers, 'Idempotency-Key': idem },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`submit ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const sub = await r.json();
  const statusUrl = sub.status_url || `https://api.higgsfield.ai/requests/${sub.request_id}/status`;
  for (let i = 0; i < 120; i++) {
    await sleep(3000);
    r = await fetch(statusUrl, { headers });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const st = await r.json();
    if (st.status === 'completed') {
      const url = st.images?.[0]?.url;
      if (!url) throw new Error('completed without an image');
      const img = await fetch(url);
      const type = img.headers.get('content-type') || '',
        ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg',
        file = join(dir, `${p.key}.${ext}`);
      writeFileSync(file, Buffer.from(await img.arrayBuffer()));
      return file;
    }
    if (['failed', 'nsfw', 'canceled'].includes(st.status)) throw new Error(`request ${st.status}`);
  }
  throw new Error('timed out waiting for the image');
}

const failed = [];
let done = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try {
        const f = await generate(p);
        done++;
        console.log(`✓ ${p.key} → ${f.replace(process.cwd(), '.')}`);
      } catch (e) {
        failed.push(p.key);
        console.log(`✗ ${p.key}: ${e.message}`);
      }
    }
  })
);
if (done) execSync('node scripts/art-manifest.mjs', { stdio: 'inherit' });
console.log(`\n${done} generated, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);
if (existsSync(join(dir, 'manifest.json')))
  console.log('reload the game to see them; bump the version before deploying so the service worker picks them up');
