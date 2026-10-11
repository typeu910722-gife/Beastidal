// Lists the pictures in dist/art/ into dist/art/manifest.json, which art.js reads at start-up.
//   node scripts/art-manifest.mjs
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = join(process.cwd(), 'dist', 'art');
const files = readdirSync(dir)
  .filter(f => /\.(webp|jpe?g|png|avif)$/i.test(f))
  .sort();
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
console.log(`${files.length} picture(s) listed in dist/art/manifest.json`);
