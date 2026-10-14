// 0.26: the dark-fantasy look of 御獸 (upright land beasts, elements, adornments) and the flattened islands.
import assert from 'node:assert/strict';
import { makeGenome, phenotype } from '../dist/genetics.js';
import { makeCreature, animateCreature } from '../dist/creatures.js';
import { applyGeneMarks } from '../dist/bs-models.js';
import { lookOf, LOOKS } from '../dist/beast-look.js';
import { LAKE_ISLANDS, groundAt, walkable, ISLAND_TOP } from '../dist/lake.js';
import { uprightPrims, setSculpt, SCULPT_BONES } from '../dist/creatures.js';
import { sculpt } from '../dist/sculpt.js';
import { decodeSculpt, decodePart } from '../dist/sculpt-assets.js';
import { setXiaoyueSculpt, makeSabertooth, animateSabertooth } from '../dist/story-models.js';
import { readFileSync, existsSync } from 'node:fs';
import { GrassField, grassy, dressTerrain } from '../dist/terrain-look.js';
import * as T from '../dist/vendor/three.module.min.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const finite = m => {
  let ok = true,
    meshes = 0;
  m.traverse(o => {
    if (!o.geometry) return;
    meshes++;
    for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) ok = false;
  });
  return ok && meshes > 0;
};

test('Every element has a look; genes decide it, the family is the fallback', () => {
  for (const [id, l] of Object.entries(LOOKS)) assert.ok(l.plan && l.rim && l.vein && l.aura && l.adorn.length, id);
  const g = makeGenome(3, 0, 'land');
  g.bs = ['fire', 'hardbody'];
  assert.equal(lookOf(g).id, 'ember');
  g.bs = ['regen'];
  assert.equal(lookOf(g).id, 'bone');
  g.bs = ['ghosteyes'];
  assert.equal(lookOf(g).plan, 'wraith');
});
test('Three upright body plans stand on their feet and animate', () => {
  for (const plan of ['dragon', 'wraith', 'dryad']) {
    const m = makeCreature(makeGenome(11, 0, 'land'), { upright: plan });
    assert.equal(m.userData.info.upright, plan);
    assert.ok(finite(m), plan);
    assert.ok(m.userData.limbs.some(l => l.userData.arm) && m.userData.limbs.some(l => l.userData.leg !== undefined));
    for (let i = 0; i < 4; i++) animateCreature(m, i * 0.2);
  }
});
test('Beasts get their look (land dwellers, plants included, stand up); creatures stay animals', () => {
  for (const [fam, genes] of [
    ['land', ['fire']],
    ['land', ['vinewhip']],
    ['land', ['ghosteyes']],
    ['sea', ['lightning']],
    ['deep', ['whiptail']],
    ['flora', ['photoskin']]
  ]) {
    const g = makeGenome(21, 0, fam);
    g.bs = genes;
    const m = makeCreature(g);
    applyGeneMarks(m, g, 'beast');
    assert.ok(m.userData.beastLook, fam + genes);
    if (genes[0] === 'fire')
      assert.ok(
        m.userData.limbs.some(l => l.userData.wing),
        'an ember dragon has wings'
      );
    assert.equal(!!m.userData.info.upright, phenotype(g).habitat === 'land', fam);
    assert.ok(finite(m));
    animateCreature(m, 1);
  }
  const g = makeGenome(22, 0, 'land');
  g.bs = ['fire'];
  const c = makeCreature(g);
  applyGeneMarks(c, g, 'creature');
  assert.ok(!c.userData.beastLook && !c.userData.info.upright);
});
test('The islands lie low and walkable; the basin walls keep their height', () => {
  for (const i of LAKE_ISLANDS) {
    let top = 0,
      walk = 0,
      land = 0;
    for (let a = 0; a < 40; a++)
      for (let r = 0; r <= 0.6; r += 0.1) {
        const x = i.x + Math.cos(a) * i.rx * r,
          z = i.z + Math.sin(a) * i.rz * r,
          h = groundAt(x, z);
        if (h > 0.4) {
          land++;
          top = Math.max(top, h);
          if (walkable(x, z)) walk++;
        }
      }
    assert.ok(top <= ISLAND_TOP + 0.5, `${i.id} top ${top}`);
    assert.ok(walk / land > 0.9, i.id);
  }
  assert.ok(groundAt(0, -340) > 60 || groundAt(0, 340) > 60 || groundAt(-560, 0) > 60, 'the walls still stand');
});
test('Sculpted bodies (0.30): one seamless skinned mesh, bones in place of limb pivots, and it still walks', () => {
  for (const plan of ['dragon', 'wraith', 'dryad']) {
    // the shipped bake when present, else a quick coarse one
    const file = `dist/models/sculpt-${plan}.json`,
      geo = existsSync(file)
        ? decodeSculpt(JSON.parse(readFileSync(file, 'utf8')))
        : sculpt(uprightPrims(plan), { cell: 0.06, boneCount: SCULPT_BONES.length });
    assert.ok(geo.attributes.position.count > 500 && geo.attributes.skinIndex && geo.attributes.skinWeight, plan);
    setSculpt(plan, geo);
    const m = makeCreature(makeGenome(31, 0, 'land'), { upright: plan });
    let skinned = null;
    m.traverse(o => o.isSkinnedMesh && (skinned = o));
    assert.ok(skinned, plan + ' has a skinned body');
    assert.equal(skinned.skeleton.bones.length, SCULPT_BONES.length);
    assert.ok(m.userData.limbs.some(l => l.isBone && l.userData.leg !== undefined));
    assert.ok(finite(m));
    for (let i = 0; i < 4; i++) animateCreature(m, i * 0.25);
    setSculpt(plan, null);
  }
});
test('嘯岳 (0.37): a sculpted, muscled body on the same rig — it still breathes, looks, walks and roars', () => {
  const d = JSON.parse(readFileSync('dist/models/sculpt-xiaoyue.json', 'utf8'));
  const parts = Object.fromEntries(Object.entries(d.parts).map(([k, v]) => [k, decodePart(v)]));
  for (const k of ['body', 'fore', 'hind', 'neck', 'head', 'jaw', 'tail', 'tail2'])
    assert.ok(parts[k]?.attributes.position.count > 200, k);
  setXiaoyueSculpt(parts);
  const m = makeSabertooth();
  assert.ok(m.userData.sculpted && m.userData.legs.length === 4 && m.userData.jaw && m.userData.tail2);
  for (let i = 0; i < 6; i++) animateSabertooth(m, i * 0.3, { gait: 0.6, roar: i % 2 });
  assert.ok(finite(m));
  const stone = makeSabertooth({ stone: true });
  assert.ok(stone.userData.sculpted && finite(stone));
  setXiaoyueSculpt(null);
});
test('0.43: a meadow grows on the dry islands around you, never on the water, and is fixed to the world', () => {
  const isl = LAKE_ISLANDS.find(i => i.id === 'ruins');
  assert.ok(grassy(isl.x, isl.z) !== null);
  assert.equal(grassy(0, 0), null, 'no grass on the open water');
  const field = new GrassField(new T.Scene(), 1),
    at = new T.Vector3(isl.x, 2, isl.z);
  for (let i = 0; i < 60; i++) field.update(1 / 60, at, i / 60, 0.3);
  assert.ok(field.count > 5000, String(field.count));
  const a = field.buildTile(3, -4).children.map(m => m.count),
    b = field.buildTile(3, -4).children.map(m => m.count);
  assert.deepEqual(a, b, 'the same tile grows the same grass every time');
  field.update(1 / 60, at, 1, 0.3, false);
  assert.equal(field.group.visible, false);
  assert.equal(new GrassField(new T.Scene(), 0).count, 0, 'off on request');
  const m = dressTerrain(new T.MeshStandardMaterial({ vertexColors: true }), 3);
  assert.equal(typeof m.onBeforeCompile, 'function');
});
console.log(`\n${n} look tests passed`);
