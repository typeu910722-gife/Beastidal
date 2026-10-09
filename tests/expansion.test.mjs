import assert from 'node:assert/strict';
import { contract, craftContract, feedsNeeded, frenzied, rollTame } from '../dist/taming.js';
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
test('Taming: feedings cost 1, 3, 5 … bait, add 8–30 % trust, and are certain by the rarity limit', () => {
  const s = ready(),
    w = s.wild[0],
    need = feedsNeeded(w.genome);
  s.player.x = w.x;
  s.player.z = w.z;
  w.tame = false;
  let bait = s.resources.bait,
    k = 0;
  const rolls = seeded(4);
  while (!w.follow) {
    const before = w.trust,
      r = feed(s, w.id, rolls);
    k++;
    assert.ok(r.ok, r.error);
    assert.equal(bait - s.resources.bait, 2 * k - 1, 'feeding ' + k + ' costs ' + (2 * k - 1));
    bait = s.resources.bait;
    if (!w.follow) assert.ok(r.gain >= 8 && r.gain <= 30, 'gain ' + r.gain);
    assert.ok(w.trust > before);
  }
  assert.ok(k <= need && need >= 6 && need <= 10);
  assert.equal(feed(s, w.id).ok, false, 'nothing left to gain');
  // the guarantee: even with the smallest gains, the rarity limit reaches 100 %
  const v = s.wild[3];
  s.player.x = v.x;
  s.player.z = v.z;
  v.tame = false;
  for (let i = 0; i < feedsNeeded(v.genome); i++) assert.ok(feed(s, v.id, () => 0).ok);
  assert.ok(v.follow && v.trust === 100);
  // an unusually tame beast: one feeding gives +90 %
  const t = s.wild[4];
  s.player.x = t.x;
  s.player.z = t.z;
  t.tame = true;
  assert.equal(feed(s, t.id, () => 0).gain, 90);
  assert.ok(feed(s, t.id, () => 0.99).follow, 'a second feeding finishes it');
  assert.ok(rollTame(() => 0.0089) && !rollTame(() => 0.009));
  // contract scrolls are made at the work table, carried in the bag and used anywhere
  Object.assign(s.player, { mode: 'foot', x: 0.5, z: 0.5, level: 0 });
  assert.ok(placeBuilding(s, 'table', 0, 0).ok);
  const table = s.buildings.find(b => b.type === 'table');
  assert.equal(contract(s, w.id).ok, false, 'no scroll yet');
  const fiber = s.resources.fiber;
  assert.ok(craftContract(s, table).ok);
  assert.equal(s.contracts, 1);
  assert.equal(s.resources.fiber, fiber - 2);
  Object.assign(s.player, { mode: 'boat', x: w.x + 3, z: w.z });
  assert.equal(craftContract(s, table).ok, false, 'only at the table');
  const r = contract(s, w.id, () => 0.999);
  assert.ok(r.ok, r.error);
  assert.equal(s.contracts, 0);
  assert.ok(s.tamed.some(p => p.id === w.id) && !s.wild.includes(w));
});
test('Forcing a low-trust contract can send the beast into a frenzy for 6–17 s', () => {
  const s = ready(),
    w = s.wild[1];
  s.player.x = w.x;
  s.player.z = w.z;
  w.tame = false;
  assert.ok(feed(s, w.id, () => 0).ok);
  assert.ok(feed(s, w.id, () => 0).ok);
  assert.ok(w.trust < 60);
  s.contracts = 2;
  const rolls = [0.99, 0.5];
  const r = contract(s, w.id, () => rolls.shift());
  assert.equal(r.ok, false);
  assert.equal(s.contracts, 1, 'a failed attempt still uses the scroll');
  assert.ok(r.frenzy && r.seconds >= 6 && r.seconds <= 17);
  assert.ok(frenzied(w, s.elapsed) && !frenzied(w, s.elapsed + 18));
  assert.equal(feed(s, w.id).ok, false, 'no feeding a frenzied beast');
  assert.equal(contract(s, w.id).ok, false, 'no contract with a frenzied beast');
  // above 60 % a failure only costs trust
  const v = s.wild[2];
  v.trust = 70;
  s.player.x = v.x;
  s.player.z = v.z;
  const q = contract(s, v.id, () => 0.99);
  assert.equal(q.ok, false);
  assert.ok(!q.frenzy && v.trust === 55);
});
test('Rarity sets how many feedings full trust takes: 6 for common, up to 10 for the rarest', () => {
  assert.equal(feedsNeeded(makeGenome(5, 0, 'sea')) >= 6, true);
  const all = Array.from({ length: 80 }, (_, i) =>
    feedsNeeded(makeGenome(100 + i, i % 4, ['sea', 'land', 'deep', 'flora'][i % 4]))
  );
  assert.ok(Math.min(...all) === 6 && Math.max(...all) <= 10 && Math.max(...all) >= 9);
});
test('Bond progression is gated and persisted; training has no cooldown', () => {
  const s = ready(),
    p = s.tamed[0];
  assert.equal(p.bond, 10);
  assert.equal(commandPet(s, p.id).ok, false);
  assert.ok(trainPet(s, p.id).ok);
  assert.equal(p.bond, 14);
  const food = s.resources.food;
  assert.ok(trainPet(s, p.id).ok);
  assert.equal(p.bond, 18);
  assert.equal(s.resources.food, food - 2);
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
  s.elapsed = 0.65 * 1200; // inside the storm window
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
