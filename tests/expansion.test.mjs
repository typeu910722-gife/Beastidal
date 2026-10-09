import assert from 'node:assert/strict';
import { createState, feed, placeBuilding, validateSave } from '../dist/rules.js';
import { makeGenome, crossGenome, phenotype, seeded } from '../dist/genetics.js';
import {
  normalizeExpansion,
  trainPet,
  commandPet,
  toggleRide,
  toggleDive,
  tickExpansion,
  explore,
  attack,
  upgradeBoat,
  awaken,
  EXPLORE
} from '../dist/expansion.js';
import { normalizeTravel, moveTravel, canWalk, switchVessel } from '../dist/navigation.js';
import { climb, demolish, relocate } from '../dist/construction.js';
import { facilityId } from '../dist/facilities.js';
const test = (name, fn) => {
  fn();
  console.log('PASS ' + name);
};
function ready() {
  const s = normalizeTravel(createState(10));
  for (const k of Object.keys(s.resources)) s.resources[k] = 300;
  s.secret = true;
  placeBuilding(s, 'pen', -1, 0);
  s.tamed = [{ id: 'testpet', name: '測試混獸', genome: makeGenome(20, 1), generation: 0, penId: 'pen:-1:0' }];
  normalizeExpansion(s);
  return s;
}
test('Taming requires repeated contact and cooldown cannot consume bait', () => {
  const s = ready(),
    w = s.wild[0];
  s.player.x = w.x;
  s.player.z = w.z;
  assert.ok(feed(s, w.id).ok);
  assert.ok(w.trust <= 10);
  const bait = s.resources.bait;
  assert.equal(feed(s, w.id).ok, false);
  assert.equal(s.resources.bait, bait);
  for (let i = 0; i < 30 && s.wild.includes(w); i++) {
    s.elapsed += 18;
    assert.ok(feed(s, w.id).ok);
  }
  assert.ok(s.tamed.some(p => p.id === w.id));
});
test('Bond progression is gated, persisted, and cannot spam training', () => {
  const s = ready(),
    p = s.tamed[0];
  assert.equal(p.bond, 10);
  assert.equal(commandPet(s, p.id).ok, false);
  assert.ok(trainPet(s, p.id).ok);
  assert.equal(p.bond, 14);
  const food = s.resources.food;
  assert.equal(trainPet(s, p.id).ok, false);
  assert.equal(s.resources.food, food);
  s.elapsed = 90;
  assert.ok(trainPet(s, p.id).ok);
  assert.ok(commandPet(s, p.id, 'gather').ok);
  s.loot = [{ id: 'a', kind: 0, x: s.player.x, z: s.player.z }];
  s.elapsed += 45;
  assert.ok(tickExpansion(s, 1).some(t => t.includes('採集')));
  assert.equal(s.loot.length, 0);
  assert.ok(p.bond > 18);
  const loaded = normalizeExpansion(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.expedition.activeId, p.id);
  assert.equal(loaded.tamed[0].bond, p.bond);
});
test('Riding parks the boat, diving uses oxygen, and dismount requires the boat', () => {
  const s = ready(),
    p = s.tamed[0];
  p.bond = 60;
  commandPet(s, p.id);
  const boat = { ...s.boat };
  assert.ok(toggleRide(s).ok);
  moveTravel(s, 12, 0);
  normalizeTravel(s);
  assert.deepEqual(s.boat, boat);
  assert.equal(toggleRide(s).ok, false);
  assert.ok(toggleDive(s).ok);
  s.expedition.oxygen = 0.1;
  tickExpansion(s, 0.2);
  assert.equal(s.expedition.diving, false);
  s.player.x = s.boat.x;
  s.player.z = s.boat.z;
  assert.ok(toggleRide(s).ok);
  assert.equal(s.expedition.mounted, false);
});
test('The expedition visits ruins, cave and underwater relic once without reward duplication', () => {
  const s = ready();
  s.player.mode = 'foot';
  let site = EXPLORE.find(p => p.id === 'archive');
  Object.assign(s.player, { x: site.x, z: site.z });
  assert.ok(explore(s, 'archive').ok);
  const c = s.resources.crystal;
  assert.equal(explore(s, 'archive').ok, false);
  assert.equal(s.resources.crystal, c);
  site = EXPLORE.find(p => p.id === 'cave-door');
  Object.assign(s.player, { x: site.x, z: site.z });
  assert.ok(explore(s, site.id).ok);
  assert.ok(canWalk(s, s.player.x, s.player.z));
  Object.assign(s.player, { x: 120, z: -112 });
  assert.ok(explore(s, 'cave-heart').ok);
  Object.assign(s.player, { x: 120, z: -106 });
  assert.ok(explore(s, 'cave-exit').ok);
  assert.equal(s.inCave, false);
  site = EXPLORE.find(p => p.id === 'deep-memory');
  Object.assign(s.player, { x: site.x, z: site.z, mode: 'boat' });
  assert.equal(explore(s, site.id).ok, false);
  s.expedition.activeId = s.tamed[0].id;
  s.tamed[0].bond = 60;
  s.expedition.mounted = true;
  s.expedition.diving = true;
  assert.ok(explore(s, site.id).ok);
});
test('Boat upgrades reduce storm damage; boss rewards and awakening are one-time', () => {
  const s = ready(),
    p = s.tamed[0];
  assert.ok(upgradeBoat(s).ok);
  assert.equal(s.expedition.boatLevel, 1);
  s.elapsed = 310;
  s.player.x = 70;
  s.player.z = 0;
  const health = s.vitals.health;
  tickExpansion(s, 1);
  assert.equal(s.vitals.health, health - 3.5);
  p.bond = 90;
  assert.ok(commandPet(s, p.id, 'guard').ok);
  s.player.x = 100;
  s.player.z = 40;
  let hit = 0;
  while (!s.expedition.boss.defeated && hit++ < 50) {
    s.elapsed += 4;
    p.stamina = 100;
    assert.ok(attack(s).ok);
  }
  assert.ok(s.expedition.boss.defeated);
  const crystal = s.resources.crystal;
  assert.equal(attack(s).ok, false);
  assert.equal(s.resources.crystal, crystal);
  assert.equal(awaken(s, p.id).ok, false);
  s.expedition.collected = ['archive', 'cave-heart', 'deep-memory'];
  assert.ok(awaken(s, p.id).ok);
  assert.equal(awaken(s, p.id).ok, false);
});
test('Body alleles preserve visibly distinct parent families rather than averaging into a third', () => {
  const a = makeGenome(1, 0),
    b = makeGenome(2, 3),
    g = crossGenome(a, b, seeded(12), 0).genome,
    p = phenotype(g);
  assert.equal(p.body, 0);
  assert.equal(p.secondary, 3);
  assert.equal(p.fusion, 1);
});
test('Two-storey construction, furniture relocation and demolition preserve safe structure', () => {
  const s = ready();
  assert.ok(placeBuilding(s, 'upperfloor', 0, 0).ok);
  assert.ok(placeBuilding(s, 'upperfloor', 1, 0).ok);
  assert.ok(placeBuilding(s, 'stairs', 0, 0).ok);
  s.player.mode = 'foot';
  s.player.x = 0;
  s.player.z = 0;
  const stairs = s.buildings.find(b => b.type === 'stairs');
  assert.ok(climb(s, stairs).ok);
  assert.equal(s.player.level, 1);
  assert.ok(canWalk(s, s.player.x, s.player.z));
  assert.equal(switchVessel(s).ok, false);
  assert.ok(placeBuilding(s, 'chair', 1, 0, 0, 1).ok);
  const chair = s.buildings.find(b => b.type === 'chair');
  assert.equal(relocate(s, facilityId(chair), 2, 2, 1).ok, false);
  assert.equal(chair.x, 1);
  assert.ok(demolish(s, facilityId(chair)).ok);
  assert.ok(climb(s, stairs).ok);
  assert.ok(demolish(s, facilityId(s.buildings.find(b => b.type === 'upperfloor' && b.x === 1))).ok);
  assert.equal(demolish(s, facilityId(s.buildings.find(b => b.type === 'pen'))).ok, false);
  assert.ok(validateSave(s));
});
