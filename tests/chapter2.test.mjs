// 0.49 第二章（下）: from the admin block's light to either ending, played through the rules.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { DAY } from '../dist/clock.js';
import { enterTown, meetGuide, readLetter, lookAdmin } from '../dist/town.js';
import { stelePosts } from '../dist/comms.js';
import {
  normalizeChapter2,
  graduated,
  readNotice,
  searchDiner,
  enterAdmin,
  choose,
  guideGone,
  domeCracked,
  chapter2Objectives,
  GRADUATE
} from '../dist/chapter2.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const noon = d => (d - 1) * DAY + DAY * (5.5 / 24);
const midnight = d => (d - 1) * DAY + DAY * (17.5 / 24);
// a save that has just finished part one at midnight on day 2
function partOneDone() {
  const s = normalizeTravel(createState(4242));
  normalizeExpansion(s);
  enterTown(s);
  s.elapsed = noon(1);
  meetGuide(s);
  stelePosts(s); // read the stele on day 1
  readLetter(s);
  s.elapsed = midnight(2);
  assert.ok(lookAdmin(s).end);
  return s;
}

test('Nothing of part two before part one ends', () => {
  const s = normalizeTravel(createState(1));
  assert.equal(normalizeChapter2(s).stage, 0);
  assert.equal(chapter2Objectives(s).length, 0);
  assert.equal(searchDiner(s), null);
  assert.equal(enterAdmin(s), null);
});

test('The next day No.0156 has graduated: the notice, the stele ground smooth', () => {
  const s = partOneDone();
  assert.equal(normalizeChapter2(s).stage, 1);
  assert.equal(readNotice(s).lines, null); // not yet: the same night
  s.elapsed = noon(4);
  assert.ok(graduated(s));
  assert.ok(
    stelePosts(s)
      .filter(p => p.who === GRADUATE)
      .every(p => p.graduated && p.removed)
  );
  assert.ok(readNotice(s).first);
  assert.equal(s.chapter2.stage, 2);
});

test('The key turns up in the diner only at night; the admin block opens only at night with it', () => {
  const s = partOneDone();
  s.elapsed = noon(4);
  readNotice(s);
  assert.ok(!searchDiner(s).found);
  s.elapsed = midnight(4);
  assert.ok(searchDiner(s).found);
  assert.equal(s.chapter2.stage, 3);
  s.elapsed = noon(5);
  assert.ok(!enterAdmin(s).scenes);
  s.elapsed = midnight(5);
  assert.ok(enterAdmin(s).scenes.some(([, line]) => line.includes('0412 · 備用載體')));
});

for (const choice of ['forget', 'truth'])
  test(`Ending: ${choice}`, () => {
    const s = partOneDone();
    s.elapsed = noon(4);
    readNotice(s);
    s.elapsed = midnight(4);
    searchDiner(s);
    enterAdmin(s);
    assert.equal(choose(s, 'nonsense').ok, false);
    const r = choose(s, choice);
    assert.ok(r.ok);
    assert.equal(s.chapter2.stage, 5);
    assert.equal(s.log[0].title, r.ending.title);
    assert.equal(guideGone(s), choice === 'truth');
    assert.equal(domeCracked(s), choice === 'truth');
    assert.equal(choose(s, choice).ok, false); // once
    assert.ok(chapter2Objectives(s).every(([, done]) => done));
    assert.ok(enterAdmin(s).message); // the door stays shut afterwards
  });

console.log(`\n${n} chapter two tests passed.`);
