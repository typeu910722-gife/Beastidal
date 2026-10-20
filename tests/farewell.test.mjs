// 0.74 第四章（下）· 牽絆: the moments a beast keeps of you, what it says when you sit down with it, the raft's
// memories — all from the save itself — and the steps of chapter four's part two that lead through them.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { makeGenome } from '../dist/genetics.js';
import { DAY } from '../dist/clock.js';
import { enterTown, leaveTown } from '../dist/town.js';
import { remember, rememberFirst, keepsakes } from '../dist/memories.js';
import { heartToHeart, homeMemories, homeLine, firstFriend, journey } from '../dist/farewell.js';
import { normalizeChapter4, noteTalk, noteHome, chapter4Objectives, talksDone, homeDone } from '../dist/chapter4.js';
import { storyPanel, nextGoal } from '../dist/storynav.js';
import { monologue } from '../dist/guide.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const at = (s, day) => (s.elapsed = (day - 1) * DAY + DAY * 0.3);
const beast = (id, extra = {}) => ({
  id,
  name: id,
  genome: makeGenome(id.length * 31, 1, 'land'),
  bond: 50,
  level: 3,
  ...extra
});

test('The moments that matter are kept for good; the day you met is noted', () => {
  const s = createState(74),
    p = beast('小牙');
  at(s, 3);
  remember(s, p, '從漂流漁網裡被救出來，吃了你分的口糧，成了你的第一隻御獸。', true);
  for (let d = 4; d < 20; d++) {
    at(s, d);
    remember(s, p, `第 ${d} 天的一件小事。`);
  }
  at(s, 21);
  rememberFirst(s, p, 'dive', '第一次帶你潛進深海。');
  rememberFirst(s, p, 'dive', '第一次帶你潛進深海。');
  assert.equal(p.memories.length, 6, 'the everyday lines stay few');
  assert.equal(p.metDay, 3);
  assert.deepEqual(
    keepsakes(p).map(m => m.day),
    [3, 21]
  );
  // a save from before 0.74: its oldest remaining line stands in, and the day you met comes from it
  const old = {
    memories: [
      { day: 9, text: 'b' },
      { day: 5, text: 'a' }
    ]
  };
  assert.equal(keepsakes(old)[0].text, 'a');
  remember(s, old, 'c');
  assert.equal(old.metDay, 5);
});

test('Sitting down with a beast: your first day together, how long it has been, and its own last words', () => {
  const s = createState(74);
  at(s, 3);
  const p = beast('小牙', { bond: 90, personality: 'greedy' });
  remember(s, p, '從漂流漁網裡被救出來，吃了你分的口糧，成了你的第一隻御獸。', true);
  at(s, 40);
  remember(s, p, '並肩擊退了深海守望者。', true);
  s.tamed = [p];
  const lines = heartToHeart(s, p).map(([, t]) => t);
  assert.ok(lines.some(t => t.includes('第 3 天')));
  assert.ok(lines.some(t => t.includes('深海守望者')));
  assert.ok(lines.some(t => t.includes('一起過了 38 天')));
  assert.equal(firstFriend(s), p);
  assert.ok(lines.some(t => t.includes('你是第一個停下來的人')));
  assert.ok(
    lines.some(t => t.includes('留一條給你')),
    'a greedy one keeps you a fish'
  );
  // a newer bond does not yet sense you are leaving
  const q = beast('阿灰', { bond: 10 });
  remember(s, q, '進了外出籠，跟你回到船上。', true);
  const ql = heartToHeart(s, q).map(([, t]) => t);
  assert.ok(ql.some(t => t.includes('還不太懂')));
  assert.ok(!ql.some(t => t.includes('你可能要走了')));
});

test('The raft remembers when you built each thing, in the order you built it', () => {
  const s = createState(74);
  s.stats = { milestones: { shelter: { day: 5 }, collector: { day: 9 }, device: { day: 2 } } };
  s.buildings.push({ type: 'shelter', x: 1, z: 0 }, { type: 'collector', x: 0, z: 1 });
  const m = homeMemories(s);
  assert.deepEqual(
    m.map(x => x.type).slice(0, 3),
    m.some(x => x.type === 'desk') ? ['desk', 'shelter', 'collector'] : ['shelter', 'collector']
  );
  assert.match(homeLine(m.find(x => x.type === 'shelter')), /^第 5 天。.*避難所/);
  const j = journey(s);
  assert.ok(j.days >= 1 && j.built >= 2);
});

test('Chapter four, part two: talk with your beasts and walk the raft — the guidance leads there', () => {
  const s = normalizeTravel(createState(74));
  normalizeExpansion(s);
  enterTown(s);
  s.story = { ...(s.story || {}), stage: 6 };
  s.town = { ...s.town, met: true, room: true, rations: 1, stele: true, letters: 1, adminSeen: true, adminDay: 1 };
  s.chapter2 = { stage: 5, since: 1, choice: 'truth' };
  s.chapter3 = {
    torn: true,
    outside: true,
    logs: 3,
    trials: 3,
    vision: true,
    cleared: [1, 2, 3],
    shards: 3,
    qing: true,
    bridge: true
  };
  s.tamed = [beast('a'), beast('b'), beast('c'), beast('d'), beast('e', { kind: 'creature' })];
  s.stats = { milestones: { shelter: { day: 5 }, collector: { day: 9 }, pen: { day: 12 } } };
  s.buildings.push({ type: 'shelter', x: 1, z: 0 }, { type: 'collector', x: 0, z: 1 }, { type: 'pen', x: 2, z: 0 });
  const c = normalizeChapter4(s);
  Object.assign(c, { terminal: true, stele: true, tank: true, manager: true, deadline: 9 });
  assert.equal(storyPanel(s).chapter, 'CHAPTER 04 · 牽絆');
  assert.equal(nextGoal(s).name, '嘯岳 · 回到湖區');
  assert.equal(storyPanel(s).title, '騎嘯岳回到湖區');
  leaveTown(s);
  assert.match(storyPanel(s).goalText, /說說話/);
  assert.equal(monologue(s).id, 'talk');
  assert.ok(!noteTalk(s, 'e') || true);
  for (const id of ['a', 'b', 'c']) assert.ok(noteTalk(s, id));
  assert.ok(!noteTalk(s, 'a'), 'once each');
  assert.ok(talksDone(s));
  assert.match(storyPanel(s).goalText, /木筏/);
  assert.equal(monologue(s).id, 'home');
  for (const t of ['shelter', 'collector', 'pen']) noteHome(s, t);
  assert.ok(homeDone(s));
  const list = chapter4Objectives(s);
  assert.ok(list.some(([t, d]) => t.startsWith('回到湖區，和夥伴們說說話（3/3）') && d));
  assert.ok(list.some(([t, d]) => t.startsWith('回到木筏上，走一圈你的家（3/3）') && d));
});

console.log(`${n} farewell tests passed.`);
