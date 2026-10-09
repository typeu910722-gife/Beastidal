import { normalizeHousing, penId, pens, used, movePet } from '../dist/housing.js';
import { facilityId, useFacility } from '../dist/facilities.js';
import { ISLANDS, NODES, islandDocks, islandAt, harvest } from '../dist/islands.js';
import assert from 'node:assert/strict';
import { contract } from '../dist/taming.js';
import { makeGenome, phenotype, crossGenome, genomeValid, seeded, LOCI, dnaCode } from '../dist/genetics.js';
import {
  createState,
  placeBuilding,
  salvage,
  craftBait,
  feed,
  breed,
  tickSystems,
  validateSave,
  useSupply
} from '../dist/rules.js';
import { makeCreature, IntroFilm } from '../dist/world.js';
import { Box3 } from '../dist/vendor/three.module.min.js';
import {
  normalizeTravel,
  canWalk,
  dockOption,
  switchVessel,
  moveTravel,
  boatBlocked,
  dockingSpots
} from '../dist/navigation.js';

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log('PASS', name);
};
test('A new world is valid and preserves its exact state through save / reload', () => {
  const s = createState(111);
  assert.ok(validateSave(s));
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
});
test('Salvage requires proximity, cannot be duplicated, and grants the documented materials', () => {
  const s = createState(111),
    l = s.loot[0];
  s.player.x = 1000;
  assert.equal(salvage(s, l.id).ok, false);
  s.player.x = l.x;
  s.player.z = l.z;
  const wood = s.resources.wood;
  assert.equal(salvage(s, l.id).ok, true);
  assert.equal(s.resources.wood, wood + 5);
  assert.equal(salvage(s, l.id).ok, false);
  assert.equal(s.salvaged, 1);
});
test('Buildings require connected foundations, enough resources, and unlocked research', () => {
  const s = createState(3);
  assert.equal(placeBuilding(s, 'floor', 2, 1).ok, false);
  Object.keys(s.resources).forEach(k => (s.resources[k] = 100));
  assert.equal(placeBuilding(s, 'floor', 5, 5).ok, false);
  assert.equal(placeBuilding(s, 'shelter', 5, 5).ok, false);
  assert.equal(placeBuilding(s, 'pen', 2, 1).ok, false);
  assert.equal(placeBuilding(s, 'floor', 2, 1).ok, true);
  assert.equal(placeBuilding(s, 'shelter', 2, 1).ok, true);
  assert.equal(placeBuilding(s, 'shelter', 2, 1).ok, false);
  assert.equal(placeBuilding(s, 'floor', 2.5, 1).ok, false);
});
test('Whole main quest is completable, consumes materials, and produces fresh water', () => {
  const s = createState(72);
  Object.keys(s.resources).forEach(k => (s.resources[k] = 100));
  for (const t of [
    ['floor', 2, 1],
    ['floor', 2, 0],
    ['shelter', 0, 0],
    ['collector', 1, 0],
    ['beacon', 2, 0]
  ])
    assert.equal(placeBuilding(s, ...t).ok, true);
  const before = s.resources.water;
  assert.ok(tickSystems(s, 36).some(e => e.type === 'chapter'));
  assert.equal(s.completed, true);
  assert.equal(s.resources.water, before);
  const tank = s.buildings.find(b => b.type === 'collector');
  assert.equal(tank.waterStored, 2);
  s.player.x = tank.x * 3.6;
  s.player.z = tank.z * 3.6;
  assert.ok(useFacility(s, facilityId(tank), 'collect').ok);
  assert.equal(s.resources.water, before + 2);
  assert.equal(useFacility(s, facilityId(tank), 'collect').ok, false);
  assert.equal(
    tickSystems(s, 1).some(e => e.type === 'chapter'),
    false
  );
});
test('Hidden branch can tame two founders, breed a hatchling, and breed a next generation', () => {
  const s = createState(42);
  s.secret = true;
  Object.keys(s.resources).forEach(k => (s.resources[k] = 100));
  assert.ok(placeBuilding(s, 'pen', -1, 0).ok);
  assert.ok(placeBuilding(s, 'hatchery', 0, 0).ok);
  assert.ok(placeBuilding(s, 'table', 1, 0).ok);
  const table = s.buildings.find(b => b.type === 'table');
  const founders = [s.wild[0].id, s.wild[1].id];
  for (const id of founders) {
    const w = s.wild.find(w => w.id === id);
    while (!w.follow) {
      s.player.x = w.x;
      s.player.z = w.z;
      assert.ok(feed(s, id).ok);
    }
    Object.assign(s.player, { mode: 'foot', x: 3.4, z: 0.4, level: 0 });
    assert.ok(contract(s, id, table, () => 0.5).ok);
  }
  assert.equal(s.tamed.length, 2);
  s.tamed.forEach(p => (p.bond = 35));
  const old = JSON.stringify(s.tamed.map(p => p.genome));
  assert.equal(breed(s, founders[0], founders[0]).ok, false);
  const r = breed(s, ...founders, seeded(711));
  assert.ok(r.ok);
  assert.equal(r.egg.generation, 1);
  assert.equal(JSON.stringify(s.tamed.map(p => p.genome)), old);
  assert.equal(tickSystems(s, 29).filter(e => e.type === 'hatch').length, 0);
  assert.equal(tickSystems(s, 1).filter(e => e.type === 'hatch').length, 1);
  assert.equal(s.tamed.length, 3);
  s.player.x = 0;
  s.player.z = 0;
  s.tamed[2].bond = 35;
  assert.ok(placeBuilding(s, 'pen', 0, -1).ok);
  assert.equal(breed(s, s.tamed[2].id, s.tamed[0].id, seeded(512)).egg.generation, 2);
  assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
});
test('Pool and hatchery capacity include unborn creatures and cannot overspend', () => {
  const s = createState(15);
  s.secret = true;
  Object.keys(s.resources).forEach(k => (s.resources[k] = 100));
  placeBuilding(s, 'pen', -1, 0);
  placeBuilding(s, 'hatchery', 0, 0);
  s.tamed = Array.from({ length: 2 }, (_, i) => ({
    id: 'c' + i,
    genome: makeGenome(i),
    generation: 0,
    bond: 35,
    name: 'test'
  }));
  assert.ok(breed(s, 'c0', 'c1').ok);
  assert.equal(breed(s, 'c0', 'c1').ok, false);
  assert.equal(s.eggs.length, 1);
  s.resources.food = 0;
  assert.equal(breed(s, 'c0', 'c1').ok, false);
  assert.equal(s.resources.food, 0);
});
test('All 32 alleles inherit from the selected parents when mutation is disabled', () => {
  const a = makeGenome(1),
    b = makeGenome(2),
    r = crossGenome(a, b, seeded(101), 0);
  for (const k of LOCI) {
    assert.ok(a[k].includes(r.genome[k][0]));
    assert.ok(b[k].includes(r.genome[k][1]));
  }
  assert.equal(r.mutations, 0);
});
test('Mutation always changes the affected allele and keeps genes and phenotypes valid', () => {
  const a = makeGenome(1),
    b = makeGenome(2),
    seen = new Set();
  for (let n = 0; n < 600; n++) {
    const r = crossGenome(a, b, seeded(n), 0.045);
    assert.ok(genomeValid(r.genome));
    seen.add(dnaCode(r.genome));
    const p = phenotype(r.genome);
    assert.ok(Object.values(p).every(v => typeof v === 'string' || Number.isFinite(v)));
    assert.ok(p.body >= 0 && p.body <= 3);
  }
  assert.ok(seen.size > 590);
  const all = crossGenome(a, b, seeded(33), 1);
  assert.equal(all.mutations, 34); // 17 loci × 2 alleles (lineage added in 0.10)
  assert.ok(genomeValid(all.genome));
});
test('Supplies restore vitals without spending supplies at full health', () => {
  const s = createState();
  assert.equal(useSupply(s, 'water').ok, false);
  s.vitals.water = 70;
  assert.ok(useSupply(s, 'water').ok);
  assert.equal(s.vitals.water, 100);
  assert.equal(s.resources.water, 4);
  assert.equal(craftBait(s).ok, false);
  s.secret = true;
  assert.ok(craftBait(s).ok);
  assert.equal(s.resources.bait, 3);
});
test('Invalid or partial saves are rejected', () => {
  for (const s of [
    null,
    {},
    { ...createState(), elapsed: NaN },
    { ...createState(), tamed: [{ id: 'bad', genome: {} }] },
    { ...createState(), buildings: [{ type: 'unknown', x: 0, z: 0 }] }
  ])
    assert.equal(validateSave(s), false);
});
test('All 16 species, plant mutants and cross-family hybrids produce finite 3D meshes', () => {
  const families = ['sea', 'deep', 'land', 'flora'];
  for (let i = 0; i < 96; i++) {
    const g = makeGenome(i, i % 4, families[Math.floor(i / 4) % 4]);
    if (i % 3 === 0) g.lineage[1] = (g.lineage[1] + 70 * (1 + (i % 4))) % 256; // second lineage → fusion traits
    if (i % 5 === 0) g.body[1] = (g.body[1] + 64) % 256;
    const m = makeCreature(g),
      bounds = new Box3().setFromObject(m);
    assert.ok(!bounds.isEmpty());
    for (const v of [...bounds.min.toArray(), ...bounds.max.toArray()]) assert.ok(Number.isFinite(v));
    let meshCount = 0;
    m.traverse(n => {
      if (n.isMesh) {
        meshCount++;
        const a = n.geometry.attributes.position.array;
        assert.ok(a.every(Number.isFinite));
      }
    });
    assert.ok(meshCount > 8);
  }
});
test('The complete prologue advances through the commute, collision and rebirth', () => {
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 720;
  let finished = false,
    rendered = 0;
  const film = new IntroFilm(
    {
      render() {
        rendered++;
      }
    },
    () => {
      finished = true;
    }
  );
  let captions = [];
  for (let i = 0; i < 500 && !finished; i++) captions.push(film.update(0.05).caption);
  assert.ok(finished);
  assert.ok(rendered > 250);
  assert.ok(captions.some(s => s.includes('砂石車') || s.includes('喇叭')));
  assert.ok(captions.some(s => s.includes('聽得見海')));
});
test('Existing saves gain travel state without losing buildings, pets, or resources', () => {
  const s = createState(17),
    before = JSON.stringify([s.buildings, s.resources, s.wild]);
  normalizeTravel(s);
  assert.equal(s.player.mode, 'boat');
  assert.deepEqual(s.boat, { x: 7, z: 10, heading: 0 });
  assert.equal(JSON.stringify([s.buildings, s.resources, s.wild]), before);
});
test('Landing parks the boat, places the character on deck, and allows boarding again', () => {
  const s = normalizeTravel(createState(1));
  assert.ok(dockOption(s).near);
  assert.ok(switchVessel(s).ok);
  assert.equal(s.player.mode, 'foot');
  assert.ok(canWalk(s, s.player.x, s.player.z));
  assert.ok(!boatBlocked(s, s.boat.x, s.boat.z));
  const parked = { ...s.boat };
  moveTravel(s, -0.1, -0.2);
  assert.deepEqual(s.boat, parked);
  assert.ok(switchVessel(s).ok);
  assert.equal(s.player.mode, 'boat');
  assert.ok(!boatBlocked(s, s.player.x, s.player.z));
});
test('Walking crosses joined floor seams but cannot leave the deck or tunnel through water', () => {
  const s = normalizeTravel(createState(2));
  s.player.mode = 'foot';
  s.player.x = 0;
  s.player.z = 0;
  moveTravel(s, 3.6, 0);
  assert.ok(Math.abs(s.player.x - 3.6) < 0.01);
  moveTravel(s, 100, 0);
  assert.ok(s.player.x < 5.4);
  assert.ok(canWalk(s, s.player.x, s.player.z));
  assert.equal(canWalk(s, 12, 12), false);
});
test('Distant vessels cannot teleport to the shelter', () => {
  const s = normalizeTravel(createState(5));
  s.player.x = 60;
  s.player.z = 60;
  assert.equal(switchVessel(s).ok, false);
  assert.equal(s.player.mode, 'boat');
});
test('Walking state and the moored boat survive a complete save / reload', () => {
  const s = normalizeTravel(createState(4));
  switchVessel(s);
  const reloaded = normalizeTravel(JSON.parse(JSON.stringify(s)));
  assert.equal(reloaded.player.mode, 'foot');
  assert.deepEqual(reloaded.player, s.player);
  assert.deepEqual(reloaded.boat, s.boat);
  assert.ok(validateSave(reloaded));
});
test('Expanding over a moored boat relocates it to safe water and preserves a way off the raft', () => {
  const s = normalizeTravel(createState(6));
  Object.keys(s.resources).forEach(k => (s.resources[k] = 100));
  switchVessel(s);
  const before = { ...s.boat };
  const gx = Math.round(before.x / 3.6),
    gz = Math.round(before.z / 3.6);
  assert.ok(placeBuilding(s, 'floor', gx, gz).ok);
  normalizeTravel(s);
  assert.ok(!boatBlocked(s, s.boat.x, s.boat.z));
  assert.ok(dockingSpots(s).length);
});
test('All islands support landing, walking, saving, harvesting and boarding', () => {
  for (const island of ISLANDS) {
    const s = normalizeTravel(createState(90));
    const spot = islandDocks().find(d => d.island === island.id);
    Object.assign(s.player, spot.boat);
    assert.ok(switchVessel(s).ok);
    assert.ok(canWalk(s, s.player.x, s.player.z));
    assert.ok(islandAt(s.player.x, s.player.z));
    const parked = { ...s.boat };
    const n = NODES.find(n => n.island === island.id);
    s.player.x = n.x;
    s.player.z = n.z;
    const before = s.resources[n.kind];
    assert.ok(harvest(s, n.id).ok);
    assert.equal(s.resources[n.kind], before + n.yield);
    assert.equal(harvest(s, n.id).ok, false);
    s.elapsed += 120;
    assert.ok(harvest(s, n.id).ok);
    const reloaded = normalizeTravel(JSON.parse(JSON.stringify(s)));
    assert.equal(reloaded.player.mode, 'foot');
    assert.deepEqual(reloaded.boat, parked);
    Object.assign(s.player, spot.foot);
    assert.ok(switchVessel(s).ok);
    assert.equal(s.player.mode, 'boat');
    assert.ok(!boatBlocked(s, s.player.x, s.player.z));
  }
});
test('Boats cannot sail through land and remote harvesting cannot award resources', () => {
  const s = normalizeTravel(createState(91));
  const i = ISLANDS[0];
  s.player.x = i.x;
  s.player.z = i.z + i.rz + 5;
  moveTravel(s, 0, -30);
  assert.ok(s.player.z > i.z + i.rz);
  assert.equal(harvest(s, NODES[0].id).ok, false);
});
test('Facilities enforce proximity, costs, reservoir capacity and old-save defaults', () => {
  const s = normalizeTravel(createState(92));
  s.buildings.push({ type: 'shelter', x: 0, z: 0 }, { type: 'collector', x: 1, z: 0 }, { type: 'beacon', x: 0, z: 1 });
  const shelter = s.buildings.find(b => b.type === 'shelter'),
    tank = s.buildings.find(b => b.type === 'collector');
  s.player.x = 0;
  s.player.z = 0;
  s.vitals.health = 40;
  assert.ok(useFacility(s, facilityId(shelter), 'rest').ok);
  assert.equal(s.vitals.health, 85);
  assert.equal(s.resources.food, 3);
  for (let n = 0; n < 20; n++) tickSystems(s, 35, true);
  assert.equal(tank.waterStored, 20);
  s.player.x = 100;
  assert.equal(useFacility(s, facilityId(tank), 'collect').ok, false);
  assert.equal(tank.waterStored, 20);
  s.player.x = 0;
  assert.ok(useFacility(s, facilityId(s.buildings.find(b => b.type === 'beacon')), 'signal').ok);
  assert.ok(s.islandsRevealed);
});
test('Legacy overfull pools preserve every genome and migrate to three occupants', () => {
  const s = createState(3);
  s.buildings.push({ type: 'pen', x: -1, z: 0 });
  s.tamed = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, genome: makeGenome(i) }));
  const genes = JSON.stringify(s.tamed.map(p => p.genome));
  normalizeHousing(s);
  assert.equal(s.tamed.filter(p => p.penId).length, 3);
  assert.equal(s.tamed.filter(p => !p.penId).length, 3);
  assert.equal(JSON.stringify(s.tamed.map(p => p.genome)), genes);
  s.buildings.push({ type: 'pen', x: 0, z: -1 });
  normalizeHousing(s);
  assert.ok(pens(s).every(b => used(s, penId(b)) === 3));
  const saved = normalizeHousing(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(saved.tamed, s.tamed);
});
test('Housing transfer, explicit swaps and egg reservations cannot exceed capacity', () => {
  const s = createState(4);
  s.buildings.push({ type: 'pen', x: -1, z: 0 }, { type: 'pen', x: 0, z: -1 });
  s.tamed = Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, genome: makeGenome(i) }));
  normalizeHousing(s);
  const [a, b] = pens(s).map(penId);
  assert.ok(movePet(s, 'p0', b).ok);
  assert.equal(s.tamed[0].penId, b);
  s.eggs.push({ id: 'egg', genome: makeGenome(7), penId: b, readyAt: 30, duration: 30 });
  assert.equal(movePet(s, 'p1', b).ok, false);
  assert.ok(movePet(s, 'p1', b, 'p0').ok);
  assert.equal(s.tamed[0].penId, a);
  assert.equal(s.tamed[1].penId, b);
  assert.equal(s.eggs[0].penId, b);
  assert.equal(movePet(s, 'p1', 'bad').ok, false);
  tickSystems(s, 31, true);
  assert.equal(s.tamed.find(p => p.id === 'egg').penId, b);
  assert.equal(used(s, b), 3);
});
console.log(`\n${checks} meaningful checks passed.`);
