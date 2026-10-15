// 0.50 第三章（上）: the tear, the wasteland outside the dome, K.'s recordings, the rift trial and the core.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel, canWalk } from '../dist/navigation.js';
import { makeGenome } from '../dist/genetics.js';
import { enterTown, toWorld } from '../dist/town.js';
import { DOME_R, countryWalkable, nearShell } from '../dist/dome.js';
import { domeCracked } from '../dist/chapter2.js';
import {
  normalizeChapter3,
  tearShell,
  tornOpen,
  noteOutside,
  readK,
  K_LOGS,
  pickTeam,
  startTrial,
  trialRound,
  finishTrial,
  canSeal,
  seeCore,
  outsidePoints,
  chapter3Objectives,
  TEAM_MAX,
  layerOpen,
  qingConfession,
  bridgeReady,
  crossBridge,
  QING_CARD,
  K_END,
  BRIDGE_SCENE
} from '../dist/chapter3.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const beast = (i, extra = {}) => ({
  id: 'p' + i,
  name: 'B' + i,
  genome: makeGenome(100 + i, i % 4, 'land'),
  bond: 40 + i,
  health: 100,
  ...extra
});
function after(choice) {
  const s = normalizeTravel(createState(4242));
  normalizeExpansion(s);
  enterTown(s);
  s.chapter2 = { stage: 5, since: 1, choice };
  s.tamed = [beast(1), beast(2), beast(3), beast(4), beast(5, { kind: 'creature' })];
  return s;
}
// a sensible player: brace when someone is hurt, save the 契印技 for a crowd
const smart = b =>
  b.members.some(m => m.hp > 0 && m.hp < m.maxHp * 0.35)
    ? 'guard'
    : canSeal(b) && b.foes.filter(f => f.hp > 0).length > 1
      ? 'seal'
      : 'strike';

test('The shell is closed until it is torn; then only its tear lets you through', () => {
  assert.ok(!countryWalkable(0, DOME_R + 20));
  assert.ok(countryWalkable(0, DOME_R + 20, 0.35, true));
  assert.ok(countryWalkable(0, DOME_R, 0.35, true)); // in the tear
  assert.ok(!countryWalkable(100, Math.sqrt(DOME_R ** 2 - 100 ** 2), 0.35, true)); // the shell elsewhere
  assert.ok(!nearShell(0, DOME_R, 3.5, true)); // no ripple in the tear
  const s = after('truth');
  assert.ok(tornOpen(s) && domeCracked(s));
  const out = toWorld({ x: 0, z: DOME_R + 30 });
  assert.ok(canWalk(s, out.x, out.z));
});

test('In the forget branch 嘯岳 tears it when asked; nothing outside until then', () => {
  const s = after('forget');
  assert.ok(!tornOpen(s));
  assert.equal(outsidePoints(s).length, 0);
  assert.ok(tearShell(s).script.length);
  assert.ok(tornOpen(s) && domeCracked(s));
  assert.equal(tearShell(s).ok, false);
  assert.equal(outsidePoints(s).length, 3);
});

test("Stepping outside is noted once; K.'s three recordings in order", () => {
  const s = after('truth');
  assert.equal(noteOutside(s), null); // still in town
  Object.assign(s.player, toWorld({ x: 0, z: DOME_R + 10 }));
  assert.ok(noteOutside(s));
  assert.equal(noteOutside(s), null);
  for (let i = 1; i <= K_LOGS.length; i++) assert.equal(readK(s).n, i);
  assert.ok(readK(s).again);
});

test('The team: the partner first, then the closest bonds, never creatures, at most three', () => {
  const s = after('truth');
  s.expedition.activeId = 'p1';
  const team = pickTeam(s);
  assert.equal(team.length, TEAM_MAX);
  assert.equal(team[0].id, 'p1');
  assert.deepEqual(
    team.slice(1).map(p => p.id),
    ['p4', 'p3']
  );
  assert.ok(!team.some(p => p.kind === 'creature'));
});

test('The trial needs the recordings and a beast; tactics matter', () => {
  const s = after('truth');
  assert.equal(startTrial(s).ok, false); // K.'s recordings first
  normalizeChapter3(s).logs = K_LOGS.length;
  let wins = 0,
    strikeWins = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const a = startTrial(s, seed).battle;
    while (!a.over) trialRound(a, smart(a));
    if (a.over === 'won') wins++;
    const b = startTrial(s, seed).battle;
    while (!b.over) trialRound(b, 'strike');
    if (b.over === 'won') strikeWins++;
  }
  assert.ok(wins >= 36, `smart play wins (${wins}/40)`);
  assert.ok(strikeWins < wins, 'pure 猛攻 does worse');
  const none = after('truth');
  none.tamed = [];
  normalizeChapter3(none).logs = K_LOGS.length;
  assert.equal(startTrial(none).ok, false);
});

test('Winning gives a shard, xp and loot once; losing only tires the beasts; then the core ends part one', () => {
  const s = after('truth');
  Object.assign(s.player, toWorld({ x: 0, z: DOME_R + 10 }));
  noteOutside(s);
  normalizeChapter3(s).logs = K_LOGS.length;
  const lose = startTrial(s, 5).battle;
  lose.over = 'lost';
  assert.equal(finishTrial(s, lose).won, false);
  assert.ok(s.tamed.slice(0, 3).every(p => p.health >= 10));
  assert.equal(seeCore(s), null); // not before a win
  for (const p of s.tamed) p.health = 100;
  const b = startTrial(s, 9).battle;
  while (!b.over) trialRound(b, smart(b));
  assert.equal(b.over, 'won');
  const crystal = s.resources.crystal;
  const r = finishTrial(s, b);
  assert.ok(r.won && r.first);
  assert.ok(s.resources.crystal > crystal || s.storage);
  assert.equal(s.chapter3.shards, 1);
  assert.ok(seeCore(s).script.length);
  assert.ok(seeCore(s).again);
  assert.equal(s.log[0].title.startsWith('第三章（上）完'), true);
  const partOne = chapter3Objectives(s);
  assert.ok(partOne.slice(0, partOne.findIndex(([text]) => text.startsWith('第三章（上）')) + 1).every(([, d]) => d));
});

test("Part two: the second layer after the vision, 晴's card, the third layer, K., the bridge", () => {
  const s = after('forget');
  tearShell(s);
  Object.assign(s.player, toWorld({ x: 0, z: DOME_R + 10 }));
  noteOutside(s);
  const c = normalizeChapter3(s);
  c.logs = K_LOGS.length;
  assert.ok(layerOpen(s, 1) && !layerOpen(s, 2) && !layerOpen(s, 3));
  assert.equal(startTrial(s, 1, 2).ok, false);
  // like a player: try again (rested) until the layer falls
  const win = layer => {
    for (let seed = 1; seed < 30; seed++) {
      for (const p of s.tamed) p.health = 100;
      const b = startTrial(s, seed * 31 + layer, layer).battle;
      while (!b.over) trialRound(b, smart(b));
      const r = finishTrial(s, b);
      if (r.won) return r;
    }
    assert.fail('layer ' + layer + ' never fell');
  };
  win(1);
  seeCore(s);
  assert.ok(layerOpen(s, 2) && !layerOpen(s, 3));
  const r2 = win(2);
  assert.ok(r2.first && r2.script === QING_CARD && c.qing);
  assert.ok(layerOpen(s, 3));
  // in the forget branch 晴 tells you herself, once
  assert.ok(qingConfession(s));
  assert.equal(qingConfession(s), null);
  assert.ok(!bridgeReady(s));
  const r3 = win(3);
  assert.equal(r3.script, K_END);
  assert.equal(c.shards, 3);
  assert.ok(bridgeReady(s));
  assert.ok(crossBridge(s).script === BRIDGE_SCENE);
  assert.ok(crossBridge(s).again);
  assert.equal(s.log[0].title, '第三章 完 · 橋的兩端');
  assert.ok(chapter3Objectives(s).every(([, d]) => d));
  // a second clear of a layer gives loot but no new shard
  assert.equal(win(1).first, false);
  assert.equal(c.shards, 3);
});

test('Saves from 0.50 that had won the first layer keep it', () => {
  const s = after('truth');
  s.chapter3 = { torn: false, outside: true, logs: 3, trials: 2, vision: true, shards: 1 };
  assert.deepEqual(normalizeChapter3(s).cleared, [1]);
  assert.ok(layerOpen(s, 2));
});

console.log(`\n${n} chapter three tests passed.`);
