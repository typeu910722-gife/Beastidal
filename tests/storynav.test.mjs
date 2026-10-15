// Optimisation round 2: the New World's quest panel and next-goal marker follow the story.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { DAY } from '../dist/clock.js';
import { enterTown, meetGuide, useRoom, takeRation, readStele, readLetter, toWorld } from '../dist/town.js';
import { nextGoal, storyPanel, bearing } from '../dist/storynav.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const noon = d => (d - 1) * DAY + DAY * (5.5 / 24);

test('Chapter two, step by step: guide → room → ration → stele → letter → admin block at night', () => {
  const s = normalizeTravel(createState(7));
  normalizeExpansion(s);
  enterTown(s);
  s.elapsed = noon(1);
  const names = [];
  const step = fn => {
    names.push(nextGoal(s).name);
    fn();
  };
  step(() => meetGuide(s));
  step(() => useRoom(s));
  step(() => takeRation(s));
  step(() => readStele(s));
  step(() => readLetter(s));
  names.push(nextGoal(s).name);
  assert.deepEqual(names, ['引路人 · 晴', '居民公寓', '配給站', '留言碑', '家書亭', '管理區']);
  const panel = storyPanel(s);
  assert.equal(panel.chapter, 'CHAPTER 02 · 新生之界');
  assert.match(panel.goalText, /^下一步：管理區 · .+ \d+ m（夜裡）$/);
  assert.ok(panel.quests.length <= 3);
});

test('Chapter three points outside the dome, and the panel switches chapter', () => {
  const s = normalizeTravel(createState(7));
  normalizeExpansion(s);
  enterTown(s);
  s.town = { ...s.town, met: true, room: true, rations: 1, stele: true, letters: 1, adminSeen: true, adminDay: 1 };
  s.chapter2 = { stage: 5, since: 1, choice: 'forget' };
  assert.equal(nextGoal(s).name, '嘯岳');
  s.chapter3 = { torn: true };
  assert.equal(nextGoal(s).name, '穹頂的裂口');
  s.chapter3.outside = true;
  assert.equal(nextGoal(s).name, '研究員 K. 的前哨站');
  s.chapter3.logs = 3;
  assert.equal(nextGoal(s).name, '裂縫');
  assert.equal(storyPanel(s).chapter, 'CHAPTER 03 · 裂縫之外');
});

test('Bearings read like a compass (+z is south)', () => {
  const s = { player: { x: 0, z: 0 } };
  assert.equal(bearing(s, { x: 0, z: -10 }), '北');
  assert.equal(bearing(s, { x: 10, z: 0 }), '東');
  assert.equal(bearing(s, { x: 0, z: 10 }), '南');
  assert.equal(bearing(s, { x: -10, z: -10 }), '西北');
  assert.ok(toWorld);
});

console.log(`\n${n} story-nav tests passed.`);
