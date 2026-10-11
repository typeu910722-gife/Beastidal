// 0.26: the dark-fantasy look of 御獸 (upright land beasts, elements, adornments) and the flattened islands.
import assert from 'node:assert/strict';
import { makeGenome, phenotype } from '../dist/genetics.js';
import { makeCreature, animateCreature } from '../dist/creatures.js';
import { applyGeneMarks } from '../dist/bs-models.js';
import { lookOf, LOOKS } from '../dist/beast-look.js';
import { LAKE_ISLANDS, groundAt, walkable, ISLAND_TOP } from '../dist/lake.js';

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
console.log(`\n${n} look tests passed`);
