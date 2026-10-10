// 0.21: 64 base species, zone spawns with regional rarities, kill drops, 48 items and the work table.
import assert from 'node:assert/strict';
import { createState, craftItem, validateSave, RESOURCE_NAMES } from '../dist/rules.js';
import { makeGenome, phenotype, allSpecies, geneName, normalizeGenome, crossGenome } from '../dist/genetics.js';
import { LORE, ZONES, pickSpecies, rollDrops, habitatsOf, allSpeciesInfo } from '../dist/species.js';
import { spawnWild, normalizeWildlife, WILD_CAP, seaGenome } from '../dist/wildlife.js';
import { ITEMS, ITEM_KEYS, CRAFTS, CARRYABLE } from '../dist/items.js';
import { normalizeCodex, codexEntries, recordCreature, codexProgress, CODEX_REWARDS } from '../dist/codex.js';
import { normalizeBag, bagUsed } from '../dist/bag.js';
import { rarityOf } from '../dist/taming.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const seq = (...v) => {
  let i = 0;
  return () => v[i++ % v.length];
};

test('64 species: 32 in the water, 32 ashore, each with a name, lore and a home', () => {
  const all = allSpecies();
  assert.equal(all.length, 64);
  assert.equal(new Set(all.map(x => x.name)).size, 64);
  assert.equal(all.filter(x => ['sea', 'deep'].includes(x.family)).length, 32);
  for (const x of all) {
    assert.ok(LORE[x.id], 'lore ' + x.id);
    assert.ok(habitatsOf(x.id).length, 'home ' + x.id);
  }
  assert.equal(allSpeciesInfo().filter(x => x.rare).length, 16);
});
test('The genome picks the species: strain, habitat and colour band; old genomes stay the first strain', () => {
  const g = makeGenome(5, 2, 'deep', 3),
    p = phenotype(g);
  assert.equal(p.species, 'deep-2-3');
  assert.equal(p.strain, 3);
  assert.ok(geneName(g).includes('幽光蟹獸'));
  assert.equal(phenotype(makeGenome(1, 0, 'flora')).habitat, 'land');
  assert.equal(phenotype(makeGenome(1, 0, 'sea')).habitat, 'sea');
  const old = makeGenome(9, 1, 'land');
  delete old.strain;
  normalizeGenome(old);
  assert.equal(phenotype(old).species, 'land-1-0');
  const child = crossGenome(makeGenome(1, 0, 'sea', 1), makeGenome(2, 0, 'sea', 1), seq(0.3, 0.9)).genome;
  assert.ok(Array.isArray(child.strain));
  assert.ok(rarityOf(makeGenome(3, 0, 'sea', 3)) > rarityOf(makeGenome(3, 0, 'sea', 0)));
});
test('Zones: every zone has a pool, rares only roll in their own waters, and the lake fills up as you travel', () => {
  for (const z of ZONES) {
    assert.ok(z.pool.length && z.cap > 0, z.id);
    const sp = pickSpecies(z, seq(0.99, 0.5));
    assert.ok(z.pool.some(p => p.family === sp.family && p.form === sp.form && p.strain === sp.strain));
    if (z.rare.length) assert.ok(pickSpecies(z, seq(0.001)).rare);
  }
  const s = createState(21);
  Object.assign(s.player, { x: 0, z: 0, mode: 'boat' });
  let added = 0;
  for (let i = 0; i < 60; i++) if (spawnWild(s)) added++;
  assert.ok(added >= 5, 'spawned ' + added);
  assert.ok(s.wild.length <= WILD_CAP);
  assert.ok(s.wild.some(w => w.zone === 'shallows'));
  const shallows = ZONES.find(z => z.id === 'shallows');
  assert.ok(s.wild.filter(w => w.zone === 'shallows').length <= shallows.cap);
  // far away the shallows thin out and new zones fill
  Object.assign(s.player, { x: 420, z: 60 });
  for (let i = 0; i < 40; i++) spawnWild(s);
  assert.ok(!s.wild.some(w => w.zone === 'shallows' && !w.trust));
  // ashore on the mountain foot: plant mutants and land beasts
  Object.assign(s.player, { x: -230, z: 40, mode: 'foot' });
  for (let i = 0; i < 40; i++) spawnWild(s);
  const land = s.wild.filter(w => w.land);
  assert.ok(land.length, 'foothill beasts');
  assert.ok(land.every(w => phenotype(w.genome).habitat === 'land'));
});
test('Old saves: plant mutants at sea walk ashore', () => {
  const s = createState(3);
  s.wild = [{ id: 'old-flora', x: 20, z: 20, homeX: 20, homeZ: 20, genome: makeGenome(1, 0, 'flora'), trust: 0 }];
  normalizeWildlife(s);
  assert.ok(s.wild[0].land || s.wild[0].island);
  assert.ok(Array.isArray(seaGenome(0, 0).strain));
});
test('Drops: each species leaves its family materials, rares add crystal', () => {
  const d = rollDrops(phenotype(makeGenome(1, 0, 'sea', 0)), seq(0.1));
  assert.ok(d.finblade >= 1 && d.silverscale === 1 && d.food === 1);
  const r = rollDrops(phenotype(makeGenome(1, 3, 'deep', 3)), seq(0.9));
  assert.ok(r.spiralshell === 1 && r.crystal === 2);
  for (const fam of ['sea', 'deep', 'land', 'flora'])
    for (let f = 0; f < 4; f++)
      for (const k of Object.keys(rollDrops(phenotype(makeGenome(1, f, fam, 1)), seq(0.1)))) assert.ok(ITEMS[k], k);
});
test('48 items with names and glyphs; the bag holds them all; the work table makes thirteen of them', () => {
  assert.equal(ITEM_KEYS.length, 48);
  assert.equal(Object.keys(CRAFTS).length, 13);
  for (const k of ITEM_KEYS) assert.ok(RESOURCE_NAMES[k] && ITEMS[k].glyph, k);
  assert.ok(!CARRYABLE.includes('contract'));
  const s = normalizeBag(createState(4));
  assert.ok(validateSave(s));
  s.resources.fiber = 6;
  const used = bagUsed(s);
  assert.ok(craftItem(s, 'rope').ok);
  assert.equal(s.resources.rope, 1);
  assert.equal(s.resources.fiber, 3);
  assert.equal(bagUsed(s), used - 2);
  assert.equal(craftItem(s, 'lantern').ok, false);
  assert.equal(craftItem(s, 'nothing').ok, false);
});
test('Codex: old entries migrate to the first strain, rewards scale to 64 species', () => {
  const s = createState(5);
  normalizeCodex(s);
  s.codex.seen['sea-0'] = { day: 1, count: 2 };
  normalizeCodex(s);
  assert.ok(s.codex.seen['sea-0-0'] && !s.codex.seen['sea-0']);
  assert.ok(recordCreature(s, makeGenome(7, 1, 'land', 2)));
  assert.equal(codexProgress(s).total, 64);
  assert.equal(codexEntries(s).length, 64);
  assert.ok(codexEntries(s).find(e => e.id === 'land-1-2').seen);
  assert.ok(CODEX_REWARDS.find(r => r.id === 'all').need.includes('64'));
});
console.log(`species tests: ${n} passed`);
