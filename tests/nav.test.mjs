// 0.19: route guidance over the lake and free diving depth.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion, toggleDive, toggleRide } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { findRoute, routeLength, clearLine, DRAFT } from '../dist/route.js';
import { LAKE_ISLANDS, LANDMARKS, groundAt } from '../dist/lake.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
function base() {
  const s = normalizeTravel(createState(1919));
  s.secret = true;
  s.tamed = [
    {
      id: 'sea1',
      name: '海',
      genome: makeGenome(4, 0, 'sea'),
      generation: 0,
      parents: [],
      bond: 80,
      stamina: 100,
      health: 100
    }
  ];
  normalizeExpansion(s);
  return s;
}

test('Route: a water route from the raft to the peninsula stays on water and ends at the marker', () => {
  const c = LAKE_ISLANDS.find(i => i.id === 'crystal'),
    r = findRoute(0, 0, c.x - 40, c.z + 10);
  assert.ok(r && r.length >= 2);
  assert.deepEqual(r[0], { x: 0, z: 0 });
  const end = r[r.length - 1];
  assert.ok(Math.hypot(end.x - (c.x - 40), end.z - (c.z + 10)) < 65, 'ends beside the marker');
  for (let i = 2; i < r.length; i++)
    assert.ok(clearLine(r[i - 1].x, r[i - 1].z, r[i].x, r[i].z), `leg ${i} crosses land`);
  assert.ok(routeLength(r) >= Math.hypot(end.x, end.z) - 1e-6);
});
test('Route: the warship needs deeper water than the skiff, and nothing leads off the map', () => {
  const p = LANDMARKS.coral;
  const skiff = findRoute(0, 0, p.x, p.z, DRAFT.boat),
    ship = findRoute(0, 0, p.x, p.z, DRAFT.ship);
  assert.ok(skiff && ship);
  for (const q of ship.slice(1, -1)) assert.ok(groundAt(q.x, q.z) < -DRAFT.ship);
  assert.equal(findRoute(0, 0, 9000, 9000), null);
});
test('Diving: the dive starts just under the surface and surfacing resets the depth', () => {
  const s = base();
  s.expedition.activeId = 'sea1';
  assert.ok(toggleRide(s).ok);
  assert.ok(toggleDive(s).ok);
  assert.ok(s.expedition.diving);
  assert.equal(s.expedition.depth, -2.5);
  s.expedition.depth = -40;
  assert.ok(toggleDive(s).ok);
  assert.equal(s.expedition.depth, 0);
  s.expedition.diving = true;
  s.expedition.depth = 0;
  normalizeExpansion(s); // an older save that was under water keeps a sensible depth
  assert.equal(s.expedition.depth, -3);
});
console.log(`nav tests: ${n} passed`);
