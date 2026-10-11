// 0.32: moving things take up room.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { separateBodies, bodyRadius } from '../dist/bodies.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
function world() {
  const s = createState(32);
  normalizeExpansion(s);
  s.wild = [];
  s.tamed = [];
  Object.assign(s.player, { x: 0, z: 0, mode: 'boat' });
  s.expedition.boss.defeated = true;
  return s;
}
const critter = (id, x, z, extra = {}) => ({ id, x, z, genome: makeGenome(id.length * 7, 0, 'sea'), ...extra });

test('A creature on top of you is pushed out; you are not shoved', () => {
  const s = world(),
    w = critter('a', 0.2, 0.1);
  s.wild.push(w);
  separateBodies(s);
  assert.equal(s.player.x, 0);
  assert.ok(Math.hypot(w.x, w.z) >= 1.4 + bodyRadius(w) - 1e-6);
});
test('Two creatures part evenly; a beast is heavier than a creature', () => {
  const s = world(),
    a = critter('a', 10, 0),
    b = critter('bb', 10.1, 0);
  s.wild.push(a, b);
  separateBodies(s, {}, 4);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= bodyRadius(a) + bodyRadius(b) - 1e-3);
  const s2 = world(),
    c = critter('c', 10, 0),
    big = critter('dd', 10.1, 0, { beast: 'flamemaw' });
  s2.wild.push(c, big);
  separateBodies(s2, {}, 4);
  assert.ok(Math.abs(c.x - 10) > Math.abs(big.x - 10.1), 'the light one gives way more');
});
test('Nothing passes through the warship hull, and a push never lands where it may not stand', () => {
  const s = world();
  s.ship = { x: 50, z: 0, heading: 0 };
  const w = critter('w', 50.5, 0);
  s.wild.push(w);
  separateBodies(s, {}, 4);
  assert.ok(Math.hypot(w.x - 50, w.z) >= 3.8 + bodyRadius(w) - 1e-3);
  // a push onto forbidden ground is refused
  const t = world(),
    v = critter('v', 0.2, 0);
  t.wild.push(v);
  separateBodies(t, { canMove: () => false });
  assert.equal(v.x, 0.2);
});
test('Your partner in a fight keeps out of the foe it fights', () => {
  const s = world();
  const p = { id: 'p', genome: makeGenome(3, 0, 'sea'), kind: 'beast', name: 'p' },
    foe = critter('f', 6, 0, { hostile: true });
  s.tamed.push(p);
  s.expedition.activeId = 'p';
  s.wild.push(foe);
  s.combat = { engaged: true, ax: 6.1, az: 0 };
  separateBodies(s, {}, 4);
  assert.ok(Math.hypot(s.combat.ax - foe.x, s.combat.az - foe.z) >= bodyRadius(p) + bodyRadius(foe) - 1e-3);
});
console.log(`\n${n} bodies tests passed`);
