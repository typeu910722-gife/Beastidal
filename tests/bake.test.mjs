// Optimisation round 1: static batching merges unmoving meshes per material without moving anything.
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import { bakeStatic } from '../dist/bake.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const box = (g, mat, x, y, z) => {
  const m = new T.Mesh(new T.BoxGeometry(1, 1, 1), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
};
const bounds = g => new T.Box3().setFromObject(g);

test('Meshes sharing a material become one, and the group keeps its shape and place', () => {
  const g = new T.Group(),
    a = new T.MeshStandardMaterial(),
    b = new T.MeshStandardMaterial();
  g.position.set(10, 0, -5);
  g.rotation.y = 0.7;
  const inner = new T.Group();
  inner.position.set(2, 1, 0);
  g.add(inner);
  for (let i = 0; i < 5; i++) box(inner, a, i, 0, 0);
  for (let i = 0; i < 3; i++) box(g, b, 0, i, 3);
  const before = bounds(g);
  assert.equal(bakeStatic(g), 4 + 2);
  const meshes = [];
  g.traverse(o => o.isMesh && meshes.push(o));
  assert.equal(meshes.length, 2);
  const after = bounds(g);
  for (const k of ['min', 'max'])
    for (const ax of ['x', 'y', 'z']) assert.ok(Math.abs(before[k][ax] - after[k][ax]) < 1e-4);
});

test('Skipped parts, lone meshes and hidden parts are handled', () => {
  const g = new T.Group(),
    a = new T.MeshStandardMaterial(),
    lone = new T.MeshStandardMaterial();
  const keep = box(g, a, 0, 0, 0);
  box(g, a, 1, 0, 0);
  box(g, a, 2, 0, 0);
  const hidden = box(g, a, 3, 0, 0);
  hidden.visible = false;
  box(g, lone, 5, 0, 0);
  bakeStatic(g, { skip: new Set([keep]) });
  const meshes = [];
  g.traverse(o => o.isMesh && meshes.push(o));
  assert.ok(meshes.includes(keep)); // left alone
  assert.ok(!meshes.includes(hidden)); // dropped
  assert.equal(meshes.filter(m => m.material === lone).length, 1);
  assert.equal(meshes.find(m => m.userData.baked)?.userData.baked, 2);
});

console.log(`\n${n} bake tests passed.`);
