// 0.70 the country under the dome: the trail from the pass, and the places along the way.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeTravel, canWalk } from '../dist/navigation.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { DAY } from '../dist/clock.js';
import { enterTown } from '../dist/town.js';
import { TRAIL, PASS, countryWalkable, treeAt, toWorld } from '../dist/dome.js';
import { SPOTS, countryPoints, visitSpot } from '../dist/countryside.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('PASS', name);
};
const fresh = () => {
  const s = normalizeTravel(createState(70));
  normalizeExpansion(s);
  enterTown(s);
  s.elapsed = DAY * (6 / 24); // morning of day 1
  return s;
};

test('The trail from the pass to the road is walkable all the way, with no tree on it', () => {
  assert.deepEqual(TRAIL[0], PASS);
  for (let i = 1; i < TRAIL.length; i++) {
    const a = TRAIL[i - 1],
      b = TRAIL[i];
    for (let t = 0; t <= 1; t += 0.05) {
      const x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t;
      assert.ok(countryWalkable(x, z, 0.5), `trail blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(!treeAt(x, z, 1.5));
    }
  }
  // and the trail ends on the road outside the gate
  const end = TRAIL[TRAIL.length - 1];
  assert.ok(Math.abs(end.x) < 7 && end.z > 46 && end.z < 140);
});

test('Every place in the country can be walked up to', () => {
  const s = fresh();
  assert.equal(countryPoints(s).length, SPOTS.length);
  for (const p of countryPoints(s)) assert.ok(canWalk(s, p.x, p.z), p.id);
  for (const p of SPOTS)
    assert.deepEqual(toWorld(p), {
      x: countryPoints(s).find(q => q.id === 'c:' + p.id).x,
      z: countryPoints(s).find(q => q.id === 'c:' + p.id).z
    });
});

test('A place tells its story once and gives its keepsake once; the orchard gives fruit once a day', () => {
  const s = fresh(),
    food = s.resources.food + (s.storage?.food || 0);
  const a = visitSpot(s, 'c:shed');
  assert.ok(a.ok && a.first && a.got.metal === 3);
  const b = visitSpot(s, 'c:shed');
  assert.ok(b.ok && !b.first && !b.got.metal);
  assert.notEqual(a.text, b.text);
  const o1 = visitSpot(s, 'c:orchard');
  assert.equal(o1.got.food, 4);
  const o2 = visitSpot(s, 'c:orchard');
  assert.ok(!o2.got.food, 'the same day, nothing more');
  s.elapsed += DAY;
  assert.equal(visitSpot(s, 'c:orchard').got.food, 4);
  assert.equal(s.resources.food + (s.storage?.food || 0), food + 8);
  assert.ok(s.log.some(l => l.title === '原野 · 山坡上的牧舍'));
});

test('The stargazing stone only shows its secret at night', () => {
  const s = fresh();
  const day = visitSpot(s, 'c:stars');
  assert.ok(day.ok && !day.first && !Object.keys(day.got).length);
  s.elapsed = DAY * (22 / 24);
  const night = visitSpot(s, 'c:stars');
  assert.ok(night.first && night.got.crystal === 2);
});

test('Seeing every place is noted once, with a reward', () => {
  const s = fresh();
  s.elapsed = DAY * (22 / 24); // night, so the stone counts
  const results = SPOTS.map(p => visitSpot(s, p.id));
  assert.equal(results.filter(r => r.all).length, 1);
  assert.ok(results[results.length - 1].all);
  assert.ok(s.log.some(l => l.title === '原野 · 走遍了'));
});

console.log(`${passed} countryside tests passed.`);
