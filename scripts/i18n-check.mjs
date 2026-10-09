// Lists user-facing Chinese strings that have no English translation yet (exit code 1 if any).
// Usage: npm run i18n:check   (add the printed keys to dist/i18n/en.js)
import { readFileSync, readdirSync } from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import EN from '../dist/i18n/en.js';

const CJK = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;
const found = new Map();
const add = (raw, file) => {
  for (let part of raw.split(/<[^>]*>/)) {
    part = part.replace(/\s+/g, ' ').trim();
    if (!CJK.test(part)) continue;
    let n = 0;
    part = part.replace(/\{\d+\}/g, () => `{${n++}}`);
    found.set(part, file);
  }
};
// i18n.js is the translator itself (language names, name-matching regex)
for (const f of readdirSync('dist').filter(f => f.endsWith('.js') && f !== 'i18n.js')) {
  const ast = acorn.parse(readFileSync('dist/' + f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  walk.full(ast, node => {
    if (node.type === 'Literal' && typeof node.value === 'string' && CJK.test(node.value)) add(node.value, f);
    if (node.type === 'TemplateLiteral') {
      const text = node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? `{${i}}` : '')).join('');
      if (CJK.test(text)) add(text, f);
    }
  });
}
const html = readFileSync('dist/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
for (const m of html.matchAll(/>([^<]+)</g)) add(m[1], 'index.html');
for (const m of html.matchAll(/(?:aria-label|title|alt|content|placeholder)="([^"]+)"/g)) add(m[1], 'index.html');
const missing = [...found].filter(([k]) => !(k in EN));
if (missing.length) {
  console.log(`${missing.length} untranslated string(s):`);
  for (const [k, f] of missing) console.log(`  [${f}] ${JSON.stringify(k)}`);
  process.exit(1);
}
console.log(`All ${found.size} user-facing strings have English translations.`);
