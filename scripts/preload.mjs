// Writes <link rel="modulepreload"> for every module game.js pulls in (directly or through other modules) into
// dist/index.html, so the browser fetches them all at once instead of discovering them one import at a time.
// Usage: node scripts/preload.mjs        (rewrite)    node scripts/preload.mjs --check   (exit 1 if stale)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const DIST = 'dist';
const START = '<!-- modulepreload:start -->',
  END = '<!-- modulepreload:end -->';
const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

export function moduleGraph(entry = 'game.js') {
  const seen = new Map(); // path (relative to dist, no query) -> the query it is imported with
  const walk = (file, query) => {
    if (seen.has(file)) return;
    seen.set(file, query);
    const src = readFileSync(join(DIST, file), 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      const [path, q = ''] = (m[1] || m[2]).split('?');
      walk(
        normalize(join(dirname(file), path))
          .split('\\')
          .join('/'),
        q ? '?' + q : ''
      );
    }
  };
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  walk(entry, html.match(/src="\.\/game\.js(\?[^"]*)"/)?.[1] || '');
  seen.delete(entry);
  return [...seen].map(([f, q]) => `./${f}${q}`).sort();
}
export function preloadBlock() {
  return [START, ...moduleGraph().map(h => `    <link rel="modulepreload" href="${h}" />`), `    ${END}`].join('\n');
}
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const block = preloadBlock();
const at = html.indexOf(START),
  end = html.indexOf(END);
const next =
  at >= 0 && end > at
    ? html.slice(0, at) + block + html.slice(end + END.length)
    : html.replace('  </head>', `    ${block}\n  </head>`);
if (process.argv.includes('--check')) {
  if (next !== html) {
    console.error('index.html modulepreload list is stale: run node scripts/preload.mjs');
    process.exit(1);
  }
  console.log('modulepreload list is current.');
} else {
  writeFileSync(join(DIST, 'index.html'), next);
  console.log(`modulepreload: ${moduleGraph().length} modules.`);
}
