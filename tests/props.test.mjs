// The Blender props (scripts/blender/) as the game loads them: parsed with the game's own GLTFLoader, each must use
// byte vertex colours and only the materials the game knows how to surface, fit the footprint of the procedural
// model it replaces, and stay within its draw-call, triangle and download budgets.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../dist/vendor/addons/loaders/GLTFLoader.js';
import { Box3 } from '../dist/vendor/three.module.min.js';

const test = async (name, fn) => {
  await fn();
  console.log('PASS ' + name);
};

function parse(name) {
  const buf = readFileSync(new URL(`../dist/models/props/${name}.glb`, import.meta.url));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(ab, '', resolve, reject));
}

// name: [bounds min (x, y, z), bounds max, triangle budget, byte budget]. The bounds are those of the procedural
// parts the prop replaces, so a prop that comes out mirrored, z-up or at the wrong scale fails here.
const PROPS = {
  // hull ±1.0 plus the sculling oar out to x 1.77; blade tip below the keel to the stem head; transom to stem (+z)
  skiff: [[-1.0, -0.04, -1.65], [1.77, 0.99, 2.01], 9000, 300 * 1024]
};
const MATERIALS = ['wood-x', 'wood-y', 'wood-z', 'rope', 'cloth', 'metal', 'plain'];
const MAX_DRAWS = 8;
const TOL = 0.06;

for (const [name, [min, max, maxTris, maxBytes]] of Object.entries(PROPS)) {
  await test(`Prop "${name}" uses byte colours and known materials, fits its footprint and stays in budget`, async () => {
    const bytes = readFileSync(new URL(`../dist/models/props/${name}.glb`, import.meta.url)).length;
    assert.ok(bytes <= maxBytes, `${bytes} bytes`);
    const gltf = await parse(name);
    const meshes = [];
    gltf.scene.traverse(o => o.isMesh && meshes.push(o));
    assert.ok(meshes.length >= 1 && meshes.length <= MAX_DRAWS, `${meshes.length} draw calls`);
    let tris = 0;
    for (const m of meshes) {
      const color = m.geometry.getAttribute('color');
      assert.ok(color, 'has vertex colours');
      assert.ok(color.normalized && color.array instanceof Uint8Array, 'colours stored as bytes');
      assert.ok(m.material.vertexColors, 'material uses them');
      assert.ok(MATERIALS.includes(m.material.name), `known material: ${m.material.name}`);
      tris += (m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count) / 3;
    }
    assert.ok(tris <= maxTris, `${tris} triangles`);
    const box = new Box3().setFromObject(gltf.scene);
    for (const [i, axis] of ['x', 'y', 'z'].entries()) {
      assert.ok(Math.abs(box.min[axis] - min[i]) <= TOL, `min ${axis}: ${box.min[axis].toFixed(2)} vs ${min[i]}`);
      assert.ok(Math.abs(box.max[axis] - max[i]) <= TOL, `max ${axis}: ${box.max[axis].toFixed(2)} vs ${max[i]}`);
    }
  });
}
