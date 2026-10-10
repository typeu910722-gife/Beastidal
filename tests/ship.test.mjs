import assert from 'node:assert/strict';
import {
  createState,
  placeBuilding,
  buildError,
  count,
  validateSave,
  tickSystems,
  placeOnShip
} from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel, moveTravel } from '../dist/navigation.js';
import { ISLANDS, islandDocks } from '../dist/islands.js';
import { homePos, pendingFacilities, installFacility, stowFacility, SHIP_SLOTS } from '../dist/fortress.js';
import { atHome, deposit } from '../dist/bag.js';
import { facilityId, findFacility } from '../dist/facilities.js';
import { normalizeHousing, penId, penLabel } from '../dist/housing.js';
import {
  normalizeShip,
  claimIsland,
  startFusion,
  tickShip,
  fusionChecks,
  boardShip,
  takeHelm,
  leaveHelm,
  climbShip,
  disembark,
  transferCargo,
  toggleLounge,
  fireCannon,
  deckWalk,
  shipDockOption,
  launchSkiff,
  stowSkiff,
  restPlace,
  syncAboard,
  LIMITS,
  FUSION_COST,
  SHIP_POINTS,
  DECKS
} from '../dist/ship.js';
import { monologue } from '../dist/guide.js';
import { makeWarship } from '../dist/ship-models.js';
import { MeshStandardMaterial } from '../dist/vendor/three.module.min.js';
const test = (name, fn) => {
  fn();
  console.log('PASS ' + name);
};
const rich = s => {
  for (const k of Object.keys(s.resources)) s.resources[k] = 2000;
  return s;
};
function base() {
  const s = rich(normalizeTravel(createState(42)));
  s.secret = true;
  normalizeExpansion(s);
  s.tamed = [
    {
      id: 'p1',
      name: '夥伴',
      genome: makeGenome(7, 0),
      generation: 0,
      bond: 40,
      stamina: 100,
      health: 100,
      penId: null
    }
  ];
  return s;
}
function maxed() {
  const s = base();
  for (let x = 0; x < 4; x++)
    for (let z = 0; z < 5; z++)
      if (!s.buildings.some(b => b.type === 'floor' && b.x === x && b.z === z))
        assert.ok(placeBuilding(s, 'floor', x, z).ok, `floor ${x},${z}`);
  for (let z = 0; z < 5; z++) assert.ok(placeBuilding(s, 'pen', -1, z).ok);
  normalizeHousing(s);
  normalizeExpansion(s);
  return s;
}
function claimPalm(s) {
  const i = ISLANDS.find(v => v.id === 'palm');
  Object.assign(s.player, { mode: 'foot', x: i.x, z: i.z, level: 0 });
  s.expedition.activeId = 'p1';
  return claimIsland(s, 'palm', s.tamed[0]);
}
test('Shelter caps foundations at 20 and pens at 5', () => {
  const s = maxed();
  assert.equal(count(s, 'floor'), LIMITS.floor);
  assert.equal(count(s, 'pen'), LIMITS.pen);
  assert.match(buildError(s, 'floor', 4, 0), /上限/);
  assert.match(buildError(s, 'pen', -1, 5) || buildError(s, 'pen', 4, 4), /上限/);
});
test('Island claim needs landing, a bonded guardian and materials; dock needs a claim', () => {
  const s = maxed();
  assert.match(buildError(s, 'dock', 4, 2), /占領/);
  s.tamed[0].bond = 20;
  assert.equal(claimPalm(s).ok, false);
  s.tamed[0].bond = 40;
  const wood = s.resources.wood;
  assert.ok(claimPalm(s).ok);
  assert.equal(s.resources.wood, wood - 20);
  assert.equal(claimPalm(s).ok, false);
  // beasts outside the display pens roam the claimed island; those in a pen stay on show there
  assert.equal(restPlace(s, { ...s.tamed[0], penId: null }), 'island');
  assert.equal(restPlace(s, s.tamed[0]), s.tamed[0].penId ? 'pen' : 'island');
  Object.assign(s.player, { mode: 'foot', x: 3, z: 3 });
  assert.equal(buildError(s, 'dock', 4, 2), null);
  assert.ok(placeBuilding(s, 'dock', 4, 2).ok);
  assert.match(buildError(s, 'dock', 4, 3), /上限/);
});
test('Fusion is gated by every requirement, costs materials, takes time, and yields a docked warship', () => {
  const s = maxed();
  claimPalm(s);
  Object.assign(s.player, { mode: 'foot', x: 3.6, z: 3.6, level: 0 });
  placeBuilding(s, 'dock', 4, 2);
  assert.ok(placeBuilding(s, 'shelter', 1, 2).ok); // (1, 1) holds the drift desk
  assert.equal(startFusion(s).ok, false);
  assert.ok(fusionChecks(s).some(([n, ok]) => !ok && n.includes('LV')));
  s.expedition.boatLevel = 3;
  const metal = s.resources.metal;
  assert.ok(startFusion(s).ok, JSON.stringify(fusionChecks(s)));
  assert.equal(s.resources.metal, metal - FUSION_COST.metal);
  assert.equal(startFusion(s).ok, false);
  s.elapsed += 60;
  tickShip(s);
  assert.equal(s.ship, undefined);
  s.elapsed += 61;
  tickShip(s);
  assert.ok(s.ship);
  assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
  const loaded = normalizeShip(JSON.parse(JSON.stringify(s)));
  assert.ok(loaded.ship.cargo);
});
function shipState() {
  const s = maxed();
  claimPalm(s);
  Object.assign(s.player, { mode: 'foot', x: 3.6, z: 3.6, level: 0 });
  placeBuilding(s, 'dock', 4, 2);
  assert.ok(placeBuilding(s, 'shelter', 1, 2).ok); // (1, 1) holds the drift desk
  s.expedition.boatLevel = 3;
  startFusion(s);
  s.elapsed += 200;
  tickShip(s);
  return s;
}
test('Boarding lands on the main deck and only the bridge helm can steer', () => {
  const s = shipState();
  Object.assign(s.player, { x: s.ship.x, z: s.ship.z });
  assert.equal(shipDockOption(s).mode, 'board-ship');
  assert.ok(boardShip(s).ok);
  assert.equal(s.player.mode, 'aboard');
  assert.equal(s.player.deck, 3);
  assert.equal(takeHelm(s).ok, false);
  const st = SHIP_POINTS.find(p => p.id === 'to-bridge');
  Object.assign(s.player, { lx: st.lx, lz: st.lz });
  assert.ok(climbShip(s, 'to-bridge').ok);
  assert.equal(s.player.deck, 4);
  const h = SHIP_POINTS.find(p => p.id === 'helm');
  Object.assign(s.player, { lx: h.lx, lz: h.lz });
  assert.ok(takeHelm(s).ok);
  assert.equal(s.player.mode, 'ship');
  const x = s.ship.x,
    z = s.ship.z;
  s.player.heading = s.ship.heading;
  moveTravel(s, Math.sin(s.ship.heading) * -3, Math.cos(s.ship.heading) * -3);
  moveTravel(s, 0, -6);
  assert.ok(Math.hypot(s.ship.x - x, s.ship.z - z) > 0.5, 'ship moved');
  assert.ok(leaveHelm(s).ok);
  assert.equal(s.player.deck, 4);
});
test('Five decks connect by ladders; cargo holds and lounge enforce their rules', () => {
  const s = shipState();
  Object.assign(s.player, { x: s.ship.x, z: s.ship.z });
  boardShip(s);
  const go = id => {
    const p = SHIP_POINTS.find(v => v.id === id);
    Object.assign(s.player, { lx: p.lx, lz: p.lz });
    return climbShip(s, id);
  };
  assert.ok(go('down-3').ok);
  assert.equal(DECKS[s.player.deck].id, 'lounge');
  assert.ok(go('down-2').ok);
  assert.ok(go('down-1').ok);
  assert.equal(s.player.deck, 0);
  assert.equal(transferCargo(s, 'food', 10).ok, false);
  const wood = s.resources.wood;
  assert.ok(transferCargo(s, 'wood', 50).ok);
  assert.equal(s.ship.cargo.wood, 50);
  assert.equal(s.resources.wood, wood - 50);
  // taking cargo out needs room in the bag
  for (const k of Object.keys(s.resources)) s.resources[k] = 0;
  assert.ok(transferCargo(s, 'wood', -20).ok);
  assert.equal(s.ship.cargo.wood, 30);
  assert.equal(go('down-1').ok, false);
  for (const d of [0, 1, 2, 3]) assert.ok(deckWalk(d, 0, 0));
  assert.equal(deckWalk(0, 6, 0), false);
  assert.ok(toggleLounge(s, 'p1').ok);
  assert.equal(restPlace(s, s.tamed[0]), 'lounge');
  // the fortress carries the whole base, so beasts can leave the lounge far out at sea too
  s.ship.x += 500;
  s.expedition.activeId = null;
  assert.ok(toggleLounge(s, 'p1').ok);
});
test('Disembark requires the gangway near a shore; cannon needs the helm and ammo', () => {
  const s = shipState();
  Object.assign(s.player, { x: s.ship.x, z: s.ship.z });
  boardShip(s);
  const g = SHIP_POINTS.find(p => p.id === 'gangway');
  Object.assign(s.player, { lx: g.lx, lz: g.lz });
  // the raft and its dock became the fortress, so there is no shore at the old home any more
  assert.equal(disembark(s).ok, false);
  // anchored off an island, the gangway leads ashore
  Object.assign(s.ship, islandDocks()[0].boat);
  assert.ok(disembark(s).ok);
  assert.equal(s.player.mode, 'foot');
  boardShip(s);
  Object.assign(s.player, { mode: 'ship' });
  s.wild.push({ id: 'h', x: s.ship.x + 10, z: s.ship.z, hostile: true, genome: makeGenome(1, 0), hp: 30 });
  s.resources.metal = 0;
  assert.equal(fireCannon(s).ok, false);
  s.resources.metal = 5;
  assert.ok(fireCannon(s).ok);
  assert.equal(s.resources.metal, 4);
  assert.equal(fireCannon(s).ok, false);
});
test('Monologue guide always names a next step and advances with progress', () => {
  const s = normalizeTravel(createState(3));
  assert.equal(monologue(s).id, 'salvage');
  s.salvaged = 3;
  assert.equal(monologue(s).id, 'device');
  s.device.owned = true;
  assert.equal(monologue(s).id, 'floor');
  const t = shipState();
  assert.equal(monologue(t).id, 'helm');
});
test('Warship model builds five cut-away deck bands', () => {
  const g = makeWarship(
    (c, e = {}) => new MeshStandardMaterial({ color: c, ...e }),
    () => {}
  );
  assert.equal(g.userData.bands.length, 5);
  assert.ok(g.userData.bands.every(b => b.children.length > 5));
});
test('After the fusion the skiff can still be lowered to explore alone and hauled back aboard', () => {
  const s = shipState();
  Object.assign(s.player, { x: s.ship.x, z: s.ship.z });
  assert.ok(boardShip(s).ok);
  // away from the gangway, the main deck offers the skiff
  Object.assign(s.player, { lx: 0, lz: 8 });
  assert.equal(shipDockOption(s).mode, 'launch-skiff');
  assert.ok(launchSkiff(s).ok);
  assert.equal(s.player.mode, 'boat');
  assert.ok(s.skiff);
  // the skiff stays a skiff across a save and reload
  const loaded = normalizeTravel(normalizeShip(JSON.parse(JSON.stringify(s))));
  assert.equal(loaded.player.mode, 'boat');
  // it sails on its own while the warship waits at anchor
  const ship = { ...s.ship };
  moveTravel(s, 30, 0);
  assert.ok(Math.hypot(s.player.x - ship.x, s.player.z - ship.z) > 20);
  assert.deepEqual({ x: s.ship.x, z: s.ship.z }, { x: ship.x, z: ship.z });
  assert.equal(stowSkiff(s).ok, false, 'too far from the warship');
  Object.assign(s.player, { x: ship.x + 8, z: ship.z });
  assert.equal(shipDockOption(s).mode, 'stow-skiff');
  assert.ok(stowSkiff(s).ok);
  assert.equal(s.player.mode, 'aboard');
  assert.equal(s.skiff, false);
});
test('Fortress: the base goes aboard, works far from the spawn, and survives save and reload', () => {
  const s = rich(maxed());
  claimPalm(s);
  Object.assign(s.player, { mode: 'foot', x: 3.6, z: 3.6, level: 0 });
  placeBuilding(s, 'dock', 4, 2);
  assert.ok(placeBuilding(s, 'shelter', 1, 2).ok);
  assert.ok(placeBuilding(s, 'collector', 2, 2).ok);
  assert.ok(placeBuilding(s, 'hatchery', 2, 3).ok);
  // an egg in progress and a named pen must come through untouched
  s.tamed.push({
    id: 'p2',
    name: '阿浪',
    genome: makeGenome(77, 1),
    generation: 1,
    bond: 50,
    stamina: 100,
    health: 100
  });
  normalizeHousing(s);
  const pen = s.buildings.find(b => b.type === 'pen');
  pen.name = '星光水母館';
  s.eggs.push({
    id: 'egg1',
    name: '卵',
    genome: makeGenome(5, 0),
    generation: 2,
    readyAt: s.elapsed + 500,
    duration: 30,
    penId: null
  });
  const before = {
    pets: s.tamed.map(p => [p.id, p.name, p.bond, JSON.stringify(p.genome)]),
    facilities: s.buildings.filter(b => !['floor', 'upperfloor', 'stairs', 'dock'].includes(b.type)).length
  };
  s.expedition.boatLevel = 3;
  assert.ok(startFusion(s).ok);
  s.elapsed += 200;
  tickShip(s);
  assert.ok(s.ship);
  // the raft is used up; every facility is aboard or waiting, none lost or doubled
  assert.equal(count(s, 'floor'), 0);
  assert.equal(count(s, 'dock'), 0);
  const aboard = s.buildings.filter(b => b.ship),
    waiting = pendingFacilities(s);
  assert.equal(aboard.length + waiting.length, before.facilities);
  assert.equal(new Set(aboard.map(b => b.ship.slot)).size, aboard.length);
  assert.ok(['desk', 'shelter', 'collector', 'hatchery'].every(t => aboard.some(b => b.type === t)));
  assert.deepEqual(
    s.tamed.map(p => [p.id, p.name, p.bond, JSON.stringify(p.genome)]),
    before.pets
  );
  assert.equal(s.eggs[0].id, 'egg1');
  assert.ok(penLabel(s, penId(pen)) === '星光水母館' || pen.stowed);
  // sail far away from the spawn and anchor by an island
  Object.assign(
    s.ship,
    islandDocks().sort((a, b) => Math.hypot(b.boat.x, b.boat.z) - Math.hypot(a.boat.x, a.boat.z))[0].boat
  );
  assert.ok(Math.hypot(s.ship.x, s.ship.z) > 60);
  const homeNow = homePos(s);
  assert.deepEqual(homeNow, { x: s.ship.x, z: s.ship.z });
  // ashore, then back aboard: the base works here
  const g = SHIP_POINTS.find(p => p.id === 'gangway');
  Object.assign(s.player, { mode: 'aboard', deck: 3, lx: g.lx, lz: g.lz });
  assert.ok(disembark(s).ok);
  assert.ok(boardShip(s).ok);
  const desk = aboard.find(b => b.type === 'desk'),
    deskAt = SHIP_SLOTS[desk.ship.slot];
  Object.assign(s.player, { mode: 'aboard', deck: 3, lx: deskAt.lx + 1, lz: deskAt.lz });
  syncAboard(s);
  assert.ok(atHome(s));
  s.resources.wood = 5;
  assert.ok(deposit(s).ok, 'the desk storage works aboard');
  assert.equal(s.resources.wood, 0);
  // building aboard fills a free slot (or says the deck is full)
  const free = SHIP_SLOTS.length - aboard.length;
  const built = placeOnShip(s, 'lamp');
  assert.equal(built.ok, free > 0, built.error);
  // the collector still fills, the shelter still heals
  const tank = s.buildings.find(b => b.type === 'collector' && b.ship);
  tank.waterStored = 0;
  s.lastSupply = s.elapsed - 40;
  s.vitals.health = 50;
  const shelter = s.buildings.find(b => b.type === 'shelter' && b.ship),
    bed = SHIP_SLOTS[shelter.ship.slot];
  Object.assign(s.player, { lx: bed.lx + 1, lz: bed.lz });
  syncAboard(s);
  tickSystems(s, 1, true);
  assert.equal(tank.waterStored, 2);
  assert.ok(s.vitals.health > 50);
  // save and reload: still aboard, still home here, still valid
  const loaded = normalizeShip(JSON.parse(JSON.stringify(s)));
  assert.ok(validateSave(loaded));
  assert.deepEqual(homePos(loaded), homeNow);
  assert.equal(loaded.buildings.filter(b => b.ship).length, s.buildings.filter(b => b.ship).length);
});
test('Fortress: a save from before the base went aboard is converted, overflow waits, nothing is lost', () => {
  const s = rich(maxed());
  for (const [t, x, z] of [
    ['shelter', 1, 2],
    ['collector', 2, 2],
    ['hatchery', 2, 3],
    ['table', 3, 3],
    ['beacon', 3, 4],
    ['lamp', 0, 4],
    ['chair', 1, 4]
  ])
    assert.ok(placeBuilding(s, t, x, z).ok, t);
  const facilities = s.buildings.filter(b => b.type !== 'floor').length;
  // an old save: the ship exists but the facilities still sit on the raft grid
  s.ship = { x: 40, z: 40, heading: 0, cargo: {}, lounge: [], lastCannon: -999 };
  const loaded = normalizeShip(JSON.parse(JSON.stringify(s)));
  assert.equal(count(loaded, 'floor'), 0);
  const aboard = loaded.buildings.filter(b => b.ship),
    waiting = pendingFacilities(loaded);
  assert.equal(aboard.length, SHIP_SLOTS.length);
  assert.equal(aboard.length + waiting.length, facilities);
  assert.ok(aboard.some(b => b.type === 'desk') && aboard.some(b => b.type === 'shelter'));
  // a waiting facility can take a slot once one frees up
  const out = aboard.find(b => b.type === 'pen');
  assert.ok(stowFacility(loaded, facilityId(out), findFacility).ok);
  assert.ok(installFacility(loaded, facilityId(waiting[0]), findFacility).ok);
  assert.equal(installFacility(loaded, facilityId(out), findFacility).ok, false, 'the deck is full again');
  assert.ok(validateSave(loaded));
  // the pens' residents are never dropped: those whose pen waits are kept in the beast storage
  normalizeHousing(loaded);
  assert.equal(loaded.tamed.length, s.tamed.length);
});
