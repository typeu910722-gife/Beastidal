import assert from 'node:assert/strict';
import { tr, useLang } from '../dist/i18n.js';
import { promptText } from '../dist/prompts.js';
import EN from '../dist/i18n/en.js';
import { makeGenome, geneName, FAMILIES } from '../dist/genetics.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('Chinese is the default and passes through unchanged', () => {
  useLang('zh');
  assert.equal(tr('背包'), '背包');
});

test('dictionary entries keep their {n} placeholders', () => {
  for (const [zh, en] of Object.entries(EN)) {
    const a = (zh.match(/\{\d+\}/g) || []).sort().join(),
      b = (en.match(/\{\d+\}/g) || []).sort().join();
    assert.equal(a, b, zh);
  }
});

test('exact, padded, template and split translations', () => {
  useLang('en');
  assert.equal(tr('背包'), 'Bag');
  assert.equal(tr('  背包 '), '  Bag ');
  const tpl = Object.keys(EN).find(k => /^[^{]*\{0\}[^{]*$/.test(k) && !/\{1\}/.test(k));
  const filled = tr(tpl.replace('{0}', '背包'));
  assert.ok(!/[㐀-鿿]/.test(filled), filled);
  assert.match(filled, /Bag/);
  assert.equal(tr('背包 · 建造'), 'Bag · Build');
  assert.equal(tr('Plain English'), 'Plain English');
});

test('every generated creature name translates', () => {
  useLang('en');
  for (const f of FAMILIES)
    for (let i = 0; i < 40; i++) {
      const name = geneName(makeGenome(1000 + i * 17, i % 4, f));
      assert.ok(!/[㐀-鿿]/.test(tr(name)), `${name} → ${tr(name)}`);
    }
});

test('English key hints follow the input device', () => {
  assert.equal(promptText('Press E to salvage.', 'touch', 'en'), 'Tap the action button to salvage.');
  assert.equal(promptText('Press E to salvage.', 'gamepad', 'en'), 'Press Ⓐ to salvage.');
  assert.equal(promptText('then press Space to repel', 'touch', 'en'), 'then tap "Repel" to repel');
  assert.equal(promptText('Steer with WASD', 'touch', 'en'), 'Steer with the joystick');
  assert.equal(promptText('Hold Shift to sprint', 'gamepad', 'en'), 'Push the left stick all the way to sprint');
  assert.equal(promptText('Press RT', 'gamepad', 'en'), 'Press RT');
  assert.equal(promptText('Press E', 'keyboard', 'en'), 'Press E');
  useLang('en');
  assert.equal(
    promptText(tr('靠近物資按 E 打撈。按 B 回家建造。'), 'gamepad', 'en'),
    'Press Ⓐ near supplies to salvage. Press Ⓧ at home to build.'
  );
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    failed++;
    console.error('✗', name, '\n ', e.message);
  }
}
useLang('zh');
if (failed) process.exit(1);
console.log(`i18n tests: ${tests.length} passed`);
