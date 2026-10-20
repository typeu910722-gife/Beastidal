// 0.76 第四章（下）· 橋前的選擇: after the last day the bridge asks you to choose — walk across, stay as the next 晴, or
// the third way (wake No.0388, free 晴, carve the truth, shut 「畢業」 off) — and each ending closes on an epilogue
// written from the save: the journey, the last day, and what each beast does after you, by its bond.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { makeGenome } from '../dist/genetics.js';
import { DAY } from '../dist/clock.js';
import { enterTown, leaveTown } from '../dist/town.js';
import { remember } from '../dist/memories.js';
import { PACT_ID } from '../dist/story.js';
import { normalizeChapter4, chapter4Objectives, choiceOpen, thirdNext } from '../dist/chapter4.js';
import { choose, doThird, epilogue, thirdLeft, ENDING_SCRIPTS } from '../dist/endings.js';
import { enterInterior, useInterior } from '../dist/interiors.js';
import { storyPanel, nextGoal } from '../dist/storynav.js';
import { monologue } from '../dist/guide.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const beast = (id, bond, extra = {}) => ({
  id,
  name: id,
  genome: makeGenome(id.length * 31, 1, 'land'),
  bond,
  level: 3,
  ...extra
});
// a save whose last day is over, standing in 慈光港
const afterLastDay = (choice = 'truth') => {
  const s = normalizeTravel(createState(76));
  normalizeExpansion(s);
  enterTown(s);
  s.story = { ...(s.story || {}), stage: 6 };
  s.elapsed = DAY * 3 + DAY * 0.3;
  s.town = { ...s.town, met: true, room: true, rations: 1, stele: true, letters: 1, adminSeen: true, adminDay: 1 };
  s.chapter2 = { stage: 5, since: 1, choice };
  s.chapter3 = {
    torn: true,
    outside: true,
    logs: 3,
    trials: 3,
    vision: true,
    cleared: [1, 2, 3],
    shards: 3,
    qing: true,
    qingTalk: true,
    bridge: true
  };
  const first = beast('小牙', 90);
  s.elapsed = DAY * 2 + DAY * 0.3;
  remember(s, first, '從漂流漁網裡被救出來，吃了你分的口糧，成了你的第一隻御獸。', true);
  s.elapsed = DAY * 30 + DAY * 0.3;
  s.tamed = [first, beast('阿灰', 50), beast('小石', 10), beast(PACT_ID, 99, { name: '嘯岳' })];
  const c = normalizeChapter4(s);
  Object.assign(c, {
    terminal: true,
    stele: true,
    tank: true,
    manager: true,
    deadline: 9,
    talked: ['小牙', '阿灰', '小石'],
    homeSeen: ['shelter', 'collector', 'pen'],
    xiaoyue: true,
    lastDay: 29,
    lastDone: true,
    lastMemories: [{ id: 'sunset', text: '最後一天的夕陽，你坐在木筏的邊上看完了。' }]
  });
  return s;
};

test('After the last day, the way leads back over the mountains to the bridge, to choose', () => {
  const s = afterLastDay();
  assert.ok(choiceOpen(s));
  assert.equal(nextGoal(s).name, '裂縫的核心 · 橋前的選擇');
  assert.equal(storyPanel(s).chapter, '終章 · 橋前的選擇');
  leaveTown(s);
  assert.equal(storyPanel(s).title, '騎嘯岳翻過群山，回到新生之界');
  assert.equal(monologue(s).id, 'choose');
  assert.ok(chapter4Objectives(s).some(([t, d]) => t === '回到橋前，做出選擇' && !d));
});

test('Walking across: the ending, and an epilogue from the save — each beast after you, by its bond', () => {
  const s = afterLastDay();
  const r = choose(s, 'cross');
  assert.equal(r.ending, 'cross');
  assert.deepEqual(r.lines, ENDING_SCRIPTS.cross);
  assert.ok(r.lines.some(([, l]) => l.includes('這次換我送你')));
  const ep = r.epilogue.map(([, t]) => t);
  assert.ok(ep[0].startsWith('第 31 天'));
  assert.ok(
    ep.some(t => t.includes('夕陽')),
    'the last day is remembered'
  );
  assert.ok(ep.some(t => t.startsWith('小牙每天傍晚都會回到木筏上') && t.includes('第一個')));
  assert.ok(
    r.epilogue.some(([who, t]) => who === '小牙' && t.includes('第 3 天')),
    'its keepsake'
  );
  assert.ok(ep.some(t => t.startsWith('阿灰偶爾會游到停靠站')));
  assert.ok(ep.some(t => t.startsWith('小石回到了湖裡')));
  assert.ok(ep.some(t => t.startsWith('嘯岳回到了山腳')));
  assert.ok(!ep.some(t => t.startsWith('嘯岳每天')), '嘯岳 has its own line');
  assert.equal(ep[ep.length - 1], '結局 · 橋的另一頭');
  assert.ok(!choiceOpen(s));
  assert.equal(choose(s, 'stay').ok, false, 'chosen once');
  assert.equal(nextGoal(s), null);
  assert.equal(storyPanel(s).chapter, '終章 · 橋的另一頭');
  assert.ok(s.log.some(l => l.title === '結局 · 橋的另一頭'));
  leaveTown(s);
  assert.notEqual(storyPanel(s).title, '騎嘯岳翻過群山，回到新生之界', 'no more way back once it has ended');
});

test('Staying: Mum talks to the photo; the beasts stay by you', () => {
  const s = afterLastDay();
  const r = choose(s, 'stay');
  assert.ok(r.lines.some(([who, l]) => who === '媽媽' && l.includes('照片')));
  assert.ok(r.epilogue.some(([, t]) => t.startsWith('小牙一直在你身邊')));
  assert.equal(r.name, '湖邊的微笑');
  assert.equal(normalizeChapter4(s).ending, 'stay');
});

test('An empty last day, and no 嘯岳, still make an epilogue', () => {
  const s = afterLastDay();
  normalizeChapter4(s).lastMemories = [];
  s.tamed = s.tamed.filter(p => p.id !== PACT_ID);
  const ep = epilogue(s, 'cross').map(([, t]) => t);
  assert.ok(ep.includes('最後一天，你只是一直看著湖。'));
  assert.ok(!ep.some(t => t.startsWith('嘯岳')));
});

test('The third way: four steps in order, where each happens — then Mum tears the document', () => {
  const s = afterLastDay('forget');
  const r = choose(s, 'third');
  assert.ok(r.lines.some(([, l]) => l.includes('汐')));
  assert.equal(r.next, 'k0388');
  assert.ok(choose(s, 'third').again, 'set out once');
  assert.ok(choiceOpen(s), 'the bridge still waits');
  assert.equal(nextGoal(s).name, '研究員 K. 的前哨站 · 叫醒 0388');
  assert.equal(doThird(s, 'stele'), null, 'in order');
  assert.equal(doThird(s, 'k0388').step, 1);
  assert.equal(doThird(s, 'k0388'), null, 'once');
  assert.equal(nextGoal(s).name, '管理區 · 玻璃槽 B-01');
  // B-01, inside the admin block: in the forget branch, the spare order is deleted
  enterInterior(s, 'admin');
  assert.equal(nextGoal(s).name, '玻璃槽 B-01');
  const q = useInterior(s, 'i:tank-b01');
  assert.equal(q.third, 2);
  assert.ok(q.lines.some(([, l]) => l.includes('備用')));
  s.town.inside = null;
  assert.equal(nextGoal(s).name, '留言碑 · 刻下真相');
  assert.equal(doThird(s, 'stele').step, 3);
  assert.deepEqual(thirdLeft(s), ['裂縫最深處 · 關掉「畢業」']);
  assert.equal(nextGoal(s).name, '裂縫最深處 · 關掉「畢業」');
  const list = chapter4Objectives(s);
  assert.ok(list.some(([t, d]) => t === '留言碑 · 把真相刻上去' && d));
  const g = doThird(s, 'graduation');
  assert.equal(g.ending, 'third');
  assert.ok(g.lines.some(([, l]) => l.includes('關掉')));
  assert.ok(g.lines.some(([, l]) => l.includes('撕開')));
  assert.ok(g.epilogue.some(([, t]) => t.startsWith('小牙每天傍晚都回到木筏上。你回來的那天')));
  assert.equal(thirdNext(s), null);
  assert.ok(!choiceOpen(s));
  assert.equal(chapter4Objectives(s).at(-1)[0], '結局 · 撕開的文件');
});

test('In the truth branch, B-01 opens and 晴 wakes', () => {
  const s = afterLastDay('truth');
  choose(s, 'third');
  doThird(s, 'k0388');
  enterInterior(s, 'admin');
  const q = useInterior(s, 'i:tank-b01');
  assert.ok(q.lines.some(([who, l]) => who === '晴' && l.includes('睡了多久')));
});

test('Nothing of this opens before the last day is over', () => {
  const s = afterLastDay();
  normalizeChapter4(s).lastDone = false;
  assert.equal(choose(s, 'cross').ok, false);
  assert.equal(doThird(s, 'k0388'), null);
});

console.log(`${n} ending tests passed.`);
