// 0.22: 比斯基因, the carry cage, evolution by contract, wild low-tier 御獸, frenzy and combat.
import assert from 'node:assert/strict';
import { createState, breed } from '../dist/rules.js';
import { makeGenome, phenotype } from '../dist/genetics.js';
import { BS_GENES, BS_IDS, addRandomGene, inheritGenes, geneStats, canEvolve, bsOf } from '../dist/bsgenes.js';
import { WILD_BEASTS, BEAST_IDS, makeWildBeast, beastChance, beastsFor } from '../dist/beasts.js';
import {
  feed,
  contract,
  cageCreature,
  evolve,
  FRENZY,
  frenzied,
  dangerous,
  normalizeTaming,
  CAGE_TRUST
} from '../dist/taming.js';
import { attack, commandPet, normalizeExpansion } from '../dist/expansion.js';
import { normalizeCodex, recordGene, recordBeast, geneEntries, beastEntries } from '../dist/codex.js';
import { spawnWild } from '../dist/wildlife.js';
import { startEvent } from '../dist/lake-events.js';
import { CRAFTS, ITEMS } from '../dist/items.js';

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
function world() {
  const s = createState(22);
  s.secret = true;
  s.contracts = 5;
  Object.assign(s.resources, { cage: 2, food: 20, bait: 60, crystal: 10 });
  normalizeExpansion(s);
  normalizeTaming(s);
  return s;
}
const beside = (s, w) => Object.assign(s.player, { x: w.x, z: w.z, mode: 'boat' });

test('48 BS genes with marks and effects; breeding inherits and mutates them, never past the cap', () => {
  assert.equal(BS_IDS.length, 48);
  for (const id of BS_IDS) assert.ok(BS_GENES[id].name && BS_GENES[id].mark && BS_GENES[id].desc, id);
  const g = makeGenome(1, 0, 'sea');
  const added = addRandomGene(g, seq(0.2), 'sea');
  assert.ok(BS_GENES[added]);
  assert.deepEqual(bsOf(g), [added]);
  for (let i = 0; i < 10; i++) addRandomGene(g, seq(0.7, 0.3), 'sea');
  assert.ok(bsOf(g).length <= 6);
  const a = makeGenome(2, 0, 'sea'),
    b = makeGenome(3, 0, 'sea');
  a.bs = ['fire', 'lightning'];
  b.bs = ['hardbody'];
  assert.deepEqual(inheritGenes(a, b, seq(0.1)), ['fire', 'lightning', 'hardbody']);
  assert.deepEqual(inheritGenes(a, b, seq(0.9)), []);
  assert.ok(geneStats(['fire', 'hardbody']).atk > 0 && geneStats(['fire', 'hardbody']).def > 0);
  assert.ok(!canEvolve(a) && canEvolve({ bs: ['fire', 'lightning', 'hardbody'] }));
});
test('Creatures: a plain wild creature cannot be contracted, but a trusting one fits in the carry cage', () => {
  const s = world(),
    w = s.wild[0];
  beside(s, w);
  w.trust = 80;
  assert.match(contract(s, w.id).error, /外出籠/);
  w.trust = CAGE_TRUST - 1;
  assert.equal(cageCreature(s, w.id).ok, false);
  w.trust = CAGE_TRUST;
  const r = cageCreature(s, w.id);
  assert.ok(r.ok);
  assert.equal(r.tamed.kind, 'creature');
  assert.equal(s.resources.cage, 1);
  assert.ok(!s.wild.includes(w));
  // a creature cannot go out to fight
  assert.match(commandPet(s, r.tamed.id, 'follow').error, /生物/);
  s.expedition.activeId = r.tamed.id;
  r.tamed.bond = 50;
  assert.match(attack(s).error, /生物/);
});
test('Evolution: three BS genes and a contract turn a creature into a 御獸; a wild one with genes can be bound outright', () => {
  const s = world(),
    w = s.wild[1];
  beside(s, w);
  w.trust = 70;
  w.genome.bs = ['fire', 'lightning'];
  assert.match(contract(s, w.id).error, /外出籠/);
  w.genome.bs.push('hardbody');
  const r = contract(s, w.id, seq(0.1));
  assert.ok(r.ok);
  assert.equal(r.tamed.kind, 'beast');
  assert.ok(r.tamed.evolved);
  const c = {
    id: 'c1',
    genome: makeGenome(9, 1, 'land'),
    name: 'c',
    generation: 1,
    parents: [],
    bond: 40,
    stamina: 100,
    health: 100,
    kind: 'creature'
  };
  s.tamed.push(c);
  assert.match(evolve(s, 'c1').error, /比斯基因/);
  c.genome.bs = ['vinewhip', 'barkskin', 'regen'];
  const contracts = s.contracts;
  assert.equal(evolve(s, 'c1', seq(0.9)).ok, false);
  assert.equal(c.bond, 30);
  assert.ok(evolve(s, 'c1', seq(0.1)).ok);
  assert.equal(c.kind, 'beast');
  assert.equal(s.contracts, contracts - 2);
  assert.ok(commandPet(s, 'c1', 'follow').ok);
});
test('Breeding: hatchlings are creatures and can inherit or surface BS genes', () => {
  const s = world();
  s.buildings.push({ type: 'hatchery', x: 2, z: 2 });
  for (const [id, fam] of [
    ['a', 'sea'],
    ['b', 'sea']
  ])
    s.tamed.push({
      id,
      genome: makeGenome(id.length + 3, 0, fam),
      name: id,
      generation: 0,
      parents: [],
      bond: 50,
      stamina: 100,
      health: 100,
      kind: 'beast'
    });
  s.tamed[0].genome.bs = ['fire', 'bladefin', 'lure'];
  const r = breed(s, 'a', 'b', seq(0.1));
  assert.ok(r.ok, r.error);
  assert.equal(r.egg.kind, 'creature');
  assert.ok(r.egg.genome.bs.length >= 3);
});
test('Wild 御獸: twelve kinds, three friendly, each with genes and a home; the skeleton rides with the merchant', () => {
  assert.equal(BEAST_IDS.length, 12);
  assert.equal(BEAST_IDS.filter(id => WILD_BEASTS[id].friendly).length, 3);
  for (const id of BEAST_IDS)
    assert.ok(WILD_BEASTS[id].genes.length >= 2 && WILD_BEASTS[id].lore && WILD_BEASTS[id].cap <= 4, id);
  assert.ok(beastsFor('sea').length && beastsFor('land').length);
  assert.ok(!beastsFor('sea').includes('skeleton') && !beastsFor('land').includes('skeleton'));
  const w = makeWildBeast('stormray', seq(0.3));
  assert.equal(phenotype(w.genome).species, 'sea-1-3');
  assert.deepEqual(w.genome.bs, ['lightning', 'bladefin']);
  assert.ok(w.hostile);
  const s = world();
  Object.assign(s.player, { x: 0, z: 0, mode: 'boat' });
  let beasts = 0;
  for (let i = 0; i < 300; i++) {
    const x = spawnWild(s);
    if (x?.beast) beasts++;
    s.wild = s.wild.filter(v => !v.zone);
  }
  assert.ok(beasts > 0, 'beasts spawn');
  const ev = startEvent(s, 'merchant', seq(0.3, 0.6, 0.1, 0.8, 0.4));
  const skel = s.wild.find(v => v.beast === 'skeleton');
  assert.ok(skel && skel.event === ev.id);
});
test('Wild 御獸: friendly ones eat rations and bind by trust; hostile ones only after a beating; failure means frenzy', () => {
  const s = world();
  const f = { ...makeWildBeast('gillskink'), id: 'f', x: 5, z: 5, homeX: 5, homeZ: 5, phase: 0 };
  s.wild.push(f);
  beside(s, f);
  const food = s.resources.food;
  assert.ok(feed(s, 'f', seq(0.5)).beast);
  assert.equal(s.resources.food, food - 1);
  assert.ok(f.trust > 0 && f.feeds === 1);
  assert.equal(beastChance(f), Math.round(f.trust));
  const h = { ...makeWildBeast('flamemaw'), id: 'h', x: 5, z: 5, homeX: 5, homeZ: 5, phase: 0 };
  s.wild.push(h);
  assert.match(feed(s, 'h').error, /咬/);
  assert.equal(beastChance(h), 5);
  h.hp = 9;
  assert.equal(beastChance(h), 90);
  const fail = contract(s, 'h', seq(0.95));
  assert.ok(fail.frenzy && fail.seconds >= FRENZY.min && fail.seconds <= FRENZY.max);
  assert.ok(frenzied(h, s.elapsed) && dangerous(h, s.elapsed));
  assert.match(feed(s, 'h').error, /狂暴/);
  s.elapsed += 21;
  assert.ok(!frenzied(h, s.elapsed));
  const ok = contract(s, 'h', seq(0.1));
  assert.ok(ok.ok && ok.tamed.wildBeast === 'flamemaw' && ok.tamed.cap === 3 && ok.tamed.kind === 'beast');
});
test('Combat: light and heavy strikes, gene attack and defence, frenzied things are valid targets', () => {
  const s = world();
  s.tamed.push({
    id: 'p',
    genome: makeGenome(5, 0, 'sea'),
    name: 'p',
    generation: 0,
    parents: [],
    bond: 60,
    stamina: 100,
    health: 100,
    kind: 'beast',
    lastAttack: -99
  });
  s.tamed[0].genome.bs = ['fire'];
  s.expedition.activeId = 'p';
  const h = { ...makeWildBeast('stonepangolin'), id: 'h', x: 3, z: 3, homeX: 3, homeZ: 3, phase: 0, hostile: false };
  s.wild.push(h);
  Object.assign(s.player, { x: 0, z: 0, mode: 'boat' });
  assert.equal(attack(s).ok, false); // not hostile, not frenzied
  h.frenzyUntil = s.elapsed + 10;
  const light = attack(s);
  assert.ok(light.ok, light.error);
  const dl = h.maxHp - h.hp;
  assert.equal(attack(s, true).ok, false); // recovering
  s.elapsed += 3;
  h.hp = h.maxHp;
  const heavy = attack(s, true);
  assert.ok(heavy.ok);
  assert.ok(h.maxHp - h.hp > dl, 'heavy hits harder');
  assert.ok(s.expedition.lunge && s.expedition.hitAt);
  assert.ok(s.tamed[0].stamina < 100);
});
test('Codex: genes and wild beasts are recorded once; the carry cage is a crafted item', () => {
  const s = world();
  normalizeCodex(s);
  assert.ok(recordGene(s, 'fire') && !recordGene(s, 'fire') && !recordGene(s, 'nope'));
  assert.ok(recordBeast(s, 'flamemaw') && !recordBeast(s, 'flamemaw'));
  assert.equal(geneEntries(s).filter(g => g.seen).length, 1);
  assert.equal(beastEntries(s).length, 12);
  assert.ok(ITEMS.cage && CRAFTS.cage);
});
console.log(`beast tests: ${n} passed`);
