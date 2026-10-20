// 0.71 the town's rooms: room 0412, the empty diner and the admin block, walked into.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeTravel, canWalk } from '../dist/navigation.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { DAY } from '../dist/clock.js';
import { enterTown, BUILDINGS } from '../dist/town.js';
import { toWorld } from '../dist/dome.js';
import { ADMIN_SCENES } from '../dist/chapter2.js';
import { nextGoal } from '../dist/storynav.js';
import {
  INTERIORS,
  ADMIN_PARTS,
  interiorWorld,
  interiorWalkable,
  interiorCameraBlocked,
  INTERIOR_Y,
  enterInterior,
  leaveInterior,
  interiorPoints,
  useInterior,
  adminReady,
  adminOpen
} from '../dist/interiors.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('PASS', name);
};
const fresh = () => {
  const s = normalizeTravel(createState(71));
  normalizeExpansion(s);
  enterTown(s);
  s.elapsed = DAY * (6 / 24);
  return s;
};
const night = s => (s.elapsed = Math.floor(s.elapsed / DAY) * DAY + DAY * (22 / 24));

test('Every room: you come in standing free, reach everything inside, and the walls hold', () => {
  for (const [id, def] of Object.entries(INTERIORS)) {
    const e = interiorWorld(id, def.entry);
    assert.ok(interiorWalkable(id, e.x, e.z), `${id}: entry`);
    for (const q of def.points) {
      const p = interiorWorld(id, q);
      // every point is within reach of somewhere you can stand
      let near = false;
      for (let a = 0; a < 16 && !near; a++)
        for (const r of [0.6, 1, 1.4])
          if (interiorWalkable(id, p.x + Math.sin(a) * r, p.z + Math.cos(a) * r)) near = true;
      assert.ok(near, `${id}: ${q.id} out of reach`);
    }
    // well outside every room is wall
    const out = interiorWorld(id, { x: 40, z: 40 });
    assert.ok(!interiorWalkable(id, out.x, out.z));
    assert.ok(interiorCameraBlocked(id, e.x, INTERIOR_Y + def.h + 1, e.z), `${id}: ceiling`);
    assert.ok(!interiorCameraBlocked(id, e.x, INTERIOR_Y + 1.7, e.z), `${id}: eye height`);
  }
  // the admin block's corridor joins both halls: walk from the door to the tanks
  for (let z = 5; z > -22; z -= 0.5) {
    const p = interiorWorld('admin', { x: 0, z });
    assert.ok(interiorWalkable('admin', p.x, p.z), `admin blocked at z ${z}`);
  }
});

test('In through the door and out again: walking follows the room, and you come out at the building', () => {
  const s = fresh();
  const r = enterInterior(s, 'room');
  assert.ok(r.ok && s.town.inside === 'room');
  assert.ok(canWalk(s, s.player.x, s.player.z));
  const outside = toWorld({ x: 0, z: 30 }); // the plaza is not walkable from inside the room
  assert.ok(!canWalk(s, outside.x, outside.z));
  assert.ok(interiorPoints(s).every(p => p.id.startsWith('i:')));
  assert.ok(useInterior(s, 'i:door').leave);
  assert.ok(leaveInterior(s).ok && !s.town.inside);
  const door = toWorld(BUILDINGS.find(b => b.id === 'apartment').door);
  assert.deepEqual([s.player.x, s.player.z], [door.x, door.z]);
  assert.ok(canWalk(s, s.player.x, s.player.z));
});

test('Room 0412: things tell their story once; the bed only takes you at night', () => {
  const s = fresh();
  enterInterior(s, 'room');
  const a = useInterior(s, 'i:wardrobe'),
    b = useInterior(s, 'i:wardrobe');
  assert.ok(a.text.includes('0411') && a.text !== b.text);
  assert.ok(!useInterior(s, 'i:bed').sleep);
  night(s);
  assert.ok(useInterior(s, 'i:bed').sleep);
});

test('The diner: a sip of soup once a day, and the table to search', () => {
  const s = fresh();
  enterInterior(s, 'diner');
  const water = s.resources.water;
  assert.equal(useInterior(s, 'i:soup').got.water, 2);
  assert.ok(!Object.keys(useInterior(s, 'i:soup').got).length);
  assert.ok(s.resources.water + (s.storage?.water || 0) >= water + 2);
  assert.ok(useInterior(s, 'i:table').search);
});

test('The admin block: its scenes spread over the rooms, 晴 waits once all are seen, every line shown once', () => {
  const s = fresh();
  s.chapter2 = { stage: 3 };
  assert.ok(!adminOpen(s), 'not by day');
  night(s);
  assert.ok(adminOpen(s));
  s.chapter2.stage = 4;
  enterInterior(s, 'admin');
  const order = ['screens', 'terminal-a', 'terminal-b', 'tanks', 'terminal-c'],
    shown = [...ADMIN_PARTS.enter];
  for (const id of order) {
    assert.ok(!adminReady(s));
    assert.equal(nextGoal(s).name, INTERIORS.admin.points.find(p => p.id === id).name);
    const r = useInterior(s, 'i:' + id);
    shown.push(...ADMIN_PARTS[id]);
    assert.deepEqual(
      r.lines,
      ADMIN_PARTS[id].map(i => ADMIN_SCENES[i])
    );
  }
  assert.ok(adminReady(s));
  assert.equal(nextGoal(s).name, '晴');
  assert.ok(interiorPoints(s).some(p => p.id === 'i:qing'));
  const q = useInterior(s, 'i:qing');
  assert.equal(q.then, 'choice');
  shown.push(...ADMIN_PARTS.qing);
  assert.deepEqual(
    shown.sort((a, b) => a - b),
    ADMIN_SCENES.map((_, i) => i)
  );
});

console.log(`${passed} interior tests passed.`);
