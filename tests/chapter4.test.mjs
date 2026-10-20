// 0.73 第四章（上）· 第二份文件: K.'s terminal, No.0388 on the stele, tank B-01, the manager at the bridge — and the
// guidance that leads there, in the New World and back on the lake.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { DAY } from '../dist/clock.js';
import { enterTown, leaveTown } from '../dist/town.js';
import { nextGoal, storyPanel } from '../dist/storynav.js';
import {
  normalizeChapter4,
  readTerminal,
  read0388,
  seeTankB01,
  managerSpeaks,
  chapter4Objectives,
  tickChapter4,
  daysLeft,
  DEADLINE_DAYS,
  TANK_B01
} from '../dist/chapter4.js';
import { enterInterior, interiorPoints, useInterior, masterOpen, qingWaits } from '../dist/interiors.js';
import { monologue } from '../dist/guide.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const afterBridge = (choice = 'truth') => {
  const s = normalizeTravel(createState(73));
  normalizeExpansion(s);
  enterTown(s);
  s.story = { ...(s.story || {}), stage: 6 };
  s.elapsed = DAY * 3 + DAY * (6 / 24);
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
    bridge: true
  };
  return s;
};

test('After the bridge the next step is K.’s terminal; nothing of chapter four opens before it', () => {
  const s = afterBridge();
  assert.equal(nextGoal(s).name, '研究員 K. 的前哨站 · 終端機');
  assert.equal(storyPanel(s).chapter, 'CHAPTER 04 · 第二份文件');
  assert.equal(read0388(s), null);
  assert.equal(seeTankB01(s), null);
  assert.equal(managerSpeaks(s), null);
  assert.ok(!masterOpen(s));
});

test('The terminal shows the second document and starts the seven days; the steps then lead on in order', () => {
  const s = afterBridge();
  const t = readTerminal(s);
  assert.ok(t.first && t.lines.some(([, l]) => l.includes('原體維持終止同意書')));
  assert.equal(daysLeft(s), DEADLINE_DAYS);
  assert.ok(masterOpen(s));
  assert.equal(nextGoal(s).name, '留言碑');
  assert.ok(read0388(s).lines.length > 2);
  assert.equal(read0388(s), null, 'once');
  assert.equal(nextGoal(s).name, '管理區 · 玻璃槽大廳');
  // inside the admin block: B-01 is there now, and the goal points at it; 晴 does not wait in the corridor
  enterInterior(s, 'admin');
  s.town.insideSeen.admin = ['screens', 'terminal-a', 'terminal-b', 'tanks', 'terminal-c'];
  assert.ok(!qingWaits(s));
  assert.ok(interiorPoints(s).some(p => p.id === 'i:tank-b01'));
  assert.ok(!interiorPoints(s).some(p => p.id === 'i:qing'));
  assert.equal(nextGoal(s).name, '玻璃槽 B-01');
  const r = useInterior(s, 'i:tank-b01');
  assert.ok(r.ok && r.chapter4);
  assert.deepEqual(r.lines, TANK_B01.truth);
  s.town.inside = null;
  assert.equal(nextGoal(s).name, '裂縫的核心 · 橋');
  const m = managerSpeaks(s);
  assert.ok(m.lines.some(([, l]) => l.includes('是誰的解脫')));
  assert.ok(managerSpeaks(s).again);
  assert.equal(nextGoal(s), null);
  const list = chapter4Objectives(s);
  assert.ok(
    list.every(([, done], i) => done || i === 1),
    JSON.stringify(list)
  ); // all but the countdown done
  assert.equal(list[list.length - 1][0], '第四章（上）完 · 第二份文件');
});

test('In the forget branch B-01 stands empty, waiting for 晴', () => {
  const s = afterBridge('forget');
  readTerminal(s);
  assert.deepEqual(seeTankB01(s).lines, TANK_B01.forget);
  assert.ok(s.log.some(l => l.title === '玻璃槽 B-01' && l.text.includes('備用')));
});

test('When the document’s date passes, nothing ends — the manager has them wait (noted once)', () => {
  const s = afterBridge();
  readTerminal(s);
  assert.equal(tickChapter4(s), null);
  s.elapsed += DAY * (DEADLINE_DAYS + 1);
  assert.match(tickChapter4(s), /管理者/);
  assert.equal(tickChapter4(s), null);
  assert.ok(normalizeChapter4(s).extended);
  assert.match(chapter4Objectives(s)[1][0], /延後/);
});

test('Back on the lake, the panel and the monologue lead back over the mountains', () => {
  const s = afterBridge();
  leaveTown(s);
  const p = storyPanel(s);
  assert.equal(p.chapter, 'CHAPTER 04 · 第二份文件');
  assert.equal(p.title, '騎嘯岳翻過群山，回到新生之界');
  assert.match(p.goalText, /環湖的山腳/);
  assert.equal(monologue(s).id, 'newworld');
});

console.log(`${n} chapter-four tests passed.`);
