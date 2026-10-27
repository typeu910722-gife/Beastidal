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

// name: [bounds min (x, y, z), bounds max, triangle budget, byte budget, named parts the game drives]. The bounds are
// those of the procedural parts the prop replaces, so one that comes out mirrored, z-up or mis-scaled fails here.
const PROPS = {
  // hull ±1.0 plus the sculling oar out to x 1.77; the oar blade's lower edge to the stem head; transom to stem (+z)
  skiff: [[-1.0, 0.07, -1.65], [1.77, 0.99, 2.01], 9000, 300 * 1024, []],
  // the canvas roof's eaves at ±1.6; the door step's legs to the ridge pole; back wall to the door step (+z)
  shelter: [[-1.6, 0.21, -1.55], [1.6, 3.18, 1.79], 12000, 350 * 1024, ['roof']],
  // tank and hoops, legs and the tarp's corners at ±1.16; tank base to the tarp's apex
  collector: [[-1.16, 0.35, -1.16], [1.16, 2.5, 1.16], 4000, 150 * 1024, []],
  // floats at ±1.87; the net down to -1.5 under the water, the post caps at 1.1
  pen: [[-1.87, -1.5, -1.87], [1.87, 1.1, 1.87], 4000, 150 * 1024, []],
  // the bench 2.5 x 1.9; legs to the upper ring
  hatchery: [[-1.25, 0.3, -0.95], [1.25, 2.4, 0.95], 4000, 150 * 1024, []],
  // the tower's foot at ±0.64; deck to the mast tip
  beacon: [[-0.64, 0.39, -0.64], [0.64, 6.25, 0.64], 4000, 150 * 1024, []],
  // a raft tile: the drums and pontoons below the waterline, the deck planks on top (3.6 m tile)
  floor: [[-1.8, -0.61, -1.73], [1.8, 0.4, 1.73], 2500, 120 * 1024, []],
  // the flight along one side of the tile, up to the floor above and its rope rail
  stairs: [[-1.43, 0.34, -1.68], [-0.27, 4.42, 1.58], 3000, 120 * 1024, []],
  chair: [[-0.43, 0.4, -0.44], [0.43, 1.7, 0.4], 1500, 60 * 1024, []],
  table: [[-0.88, 0.39, -0.53], [0.88, 1.5, 0.53], 1500, 60 * 1024, []],
  lamp: [[-0.24, 0.38, -0.24], [0.24, 2.98, 0.24], 1000, 40 * 1024, []],
  // the desk with its crate stool in front (+z)
  desk: [[-0.88, 0.39, -0.52], [0.88, 1.5, 1.22], 2000, 80 * 1024, []],
  // the landing: piles down to -1.2 in the water, the derrick up to 3.5
  dock: [[-1.7, -1.2, -1.75], [1.7, 3.5, 1.75], 3000, 120 * 1024, []],
  // 0.65 慈光港 (town-local metres): the twelve buildings from the kiosk's wall to the houses by the wall, eaves
  // included; ground to the apartment's chimneys
  town: [[-42.55, -0.05, -43.55], [39.26, 18.0, 42.05], 40000, 2400 * 1024, []],
  // the town wall (its coping out to ±46.9), ground to the sun over the gate's arch
  'town-street': [[-46.9, -0.03, -46.9], [46.9, 14.54, 47.1], 14000, 800 * 1024, []],
  // 0.78 the warship (ship-local metres): cannon muzzles out to ±5.45, the keel beam to the pennants on the main
  // mast, transom to the bowsprit's tip; seven parts the game cuts away deck by deck, a few materials each
  warship: [
    [-5.45, -2.85, -15.06],
    [5.45, 29.4, 18.07],
    40000,
    1400 * 1024,
    ['keel', 'band-0', 'band-1', 'band-2', 'band-3', 'band-4', 'cab'],
    40
  ]
};
const MATERIALS = [
  ...['wood-x', 'wood-y', 'wood-z', 'deck-x', 'deck-z', 'rope', 'cloth', 'metal', 'plain'],
  // the town (0.65): the game swaps its own night-lit glass in for 'window' and 'frosted'
  ...['plaster', 'stone', 'tile', 'gold', 'window', 'frosted', 'statue', 'carved', 'leaf']
];
const MAX_DRAWS = 12; // the procedural models these replace were 30 to 70 meshes each (the warship: hundreds)
const TOL = 0.06;

for (const [name, [min, max, maxTris, maxBytes, named, maxDraws = MAX_DRAWS]] of Object.entries(PROPS)) {
  await test(`Prop "${name}" uses byte colours and known materials, fits its footprint and stays in budget`, async () => {
    const bytes = readFileSync(new URL(`../dist/models/props/${name}.glb`, import.meta.url)).length;
    assert.ok(bytes <= maxBytes, `${bytes} bytes`);
    const gltf = await parse(name);
    const meshes = [];
    gltf.scene.traverse(o => o.isMesh && meshes.push(o));
    assert.ok(meshes.length >= 1 && meshes.length <= maxDraws, `${meshes.length} draw calls`);
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
    for (const part of named) assert.ok(gltf.scene.getObjectByName(part), `has the "${part}" part`);
    const box = new Box3().setFromObject(gltf.scene);
    for (const [i, axis] of ['x', 'y', 'z'].entries()) {
      assert.ok(Math.abs(box.min[axis] - min[i]) <= TOL, `min ${axis}: ${box.min[axis].toFixed(2)} vs ${min[i]}`);
      assert.ok(Math.abs(box.max[axis] - max[i]) <= TOL, `max ${axis}: ${box.max[axis].toFixed(2)} vs ${max[i]}`);
    }
  });
}
