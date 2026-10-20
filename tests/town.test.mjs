// 0.47 抵達新生之界: 慈光港 — the walls, the way in and out, and chapter two part one played through the rules.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel, canWalk } from '../dist/navigation.js';
import { spawnWild } from '../dist/wildlife.js';
import { DAY } from '../dist/clock.js';
import { PASS } from '../dist/dome.js';
import {
  TOWN,
  BUILDINGS,
  STATUE,
  ARRIVE_AT,
  LETTERS,
  townWalkable,
  toWorld,
  enterTown,
  leaveTown,
  meetGuide,
  useRoom,
  takeRation,
  readStele,
  readLetter,
  lookAdmin,
  townPoints,
  townObjectives
} from '../dist/town.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const fresh = () => {
  const s = normalizeTravel(createState(4242));
  normalizeExpansion(s);
  Object.assign(s.player, { x: 40, z: -20, mode: 'foot' });
  return s;
};
const W = p => toWorld(p);
// noon and midnight on a given day (a day starts at 06:30)
const noon = d => (d - 1) * DAY + DAY * (5.5 / 24);
const midnight = d => (d - 1) * DAY + DAY * (17.5 / 24);

test('Walls, gate and buildings: the plaza is open, buildings and walls are solid', () => {
  const at = p => townWalkable(W(p).x, W(p).z);
  assert.ok(at({ x: 0, z: 10 }));
  assert.ok(at(ARRIVE_AT)); // outside the gate
  assert.ok(at({ x: 0, z: 46 })); // through the gate
  assert.ok(!at({ x: 20, z: 46 })); // the wall beside it
  assert.ok(at({ x: 0, z: 70 })); // 0.48: out of the gate the open country goes on
  assert.ok(!at({ x: -46, z: 0 }) && !at({ x: 0, z: -46 })); // the wall all round
  assert.ok(!at({ x: STATUE.x, z: STATUE.z }));
  for (const b of BUILDINGS) {
    assert.ok(!at(b), b.id);
    if (b.door) assert.ok(at(b.door), b.id + ' door');
  }
  for (const p of townPoints({ town: {} })) assert.ok(townWalkable(p.x, p.z), p.id);
});

test('Into town and back: first on the pass above it, then at the gate; you return where you left', () => {
  const s = fresh();
  s.expedition.mounted = true;
  const r = enterTown(s);
  assert.ok(r.ok && r.first);
  assert.ok(s.inTown && s.player.mode === 'foot' && !s.expedition.mounted);
  // 0.70: the first time 嘯岳 sets you down on the pass, looking at the town
  assert.deepEqual([s.player.x - TOWN.x, s.player.z - TOWN.z], [PASS.x, PASS.z]);
  assert.ok(Math.abs(r.yaw - Math.atan2(PASS.x, PASS.z)) < 1e-9);
  assert.ok(canWalk(s, s.player.x, s.player.z));
  leaveTown(s);
  enterTown(s);
  assert.equal(Math.round(s.player.x - TOWN.x), ARRIVE_AT.x);
  assert.ok(canWalk(s, s.player.x, s.player.z - 10)); // navigation walks the town's streets
  assert.equal(
    spawnWild(s, () => 0.1),
    null
  ); // nothing wild in town
  assert.equal(enterTown(fresh()).first, true);
  assert.ok(leaveTown(s).ok);
  assert.ok(!s.inTown);
  assert.deepEqual([s.player.x, s.player.z], [40, -20]);
  assert.equal(enterTown(s).first, false);
});

test('Nothing opens until you have met the guide; then the room, a ration a day', () => {
  const s = fresh();
  enterTown(s);
  s.elapsed = noon(1);
  assert.equal(useRoom(s).ok, false);
  assert.equal(takeRation(s).ok, false);
  assert.equal(readLetter(s).ok, false);
  assert.equal(meetGuide(s).script, 'first');
  assert.ok(meetGuide(s).lines.length); // after that, a line of small talk
  assert.ok(useRoom(s).first);
  const food = s.resources.food;
  assert.ok(takeRation(s).ok);
  assert.equal(s.resources.food, food + 3);
  assert.equal(takeRation(s).ok, false);
  s.elapsed = noon(2);
  assert.ok(takeRation(s).ok);
});

test('One letter a week from the day you met the guide', () => {
  const s = fresh();
  enterTown(s);
  s.elapsed = noon(3);
  meetGuide(s);
  assert.equal(readLetter(s).n, 1);
  assert.equal(readLetter(s).ok, false);
  s.elapsed = noon(10);
  assert.equal(readLetter(s).n, 2);
  s.elapsed = noon(40);
  assert.equal(readLetter(s).n, 3);
  assert.equal(readLetter(s).ok, false);
  assert.equal(s.town.letters, LETTERS.length);
});

test('Part one ends at night at the admin block, after the first letter', () => {
  const s = fresh();
  enterTown(s);
  s.elapsed = noon(1);
  meetGuide(s);
  assert.equal(townObjectives(s).filter(([, d]) => d).length, 2);
  useRoom(s);
  takeRation(s);
  readStele(s);
  s.elapsed = midnight(1);
  assert.ok(!lookAdmin(s).end); // no letter read yet
  readLetter(s);
  s.elapsed = noon(2);
  assert.ok(!lookAdmin(s).end); // by day it is just a locked door
  s.elapsed = midnight(2);
  assert.ok(lookAdmin(s).end);
  assert.ok(!lookAdmin(s).end); // only once
  assert.ok(townObjectives(s).every(([, d]) => d));
  assert.equal(s.log[0].title, '第二章（上）完 · 慈光');
});

console.log(`\n${n} town tests passed.`);
