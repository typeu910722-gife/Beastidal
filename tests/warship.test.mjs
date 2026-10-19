import assert from 'node:assert/strict';
import { createState, validateSave } from '../dist/rules.js';
import { normalizeTravel } from '../dist/navigation.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeShip, upgradeShip, transferCargo, fireCannon, CANNON, CARGO_CAPACITY } from '../dist/ship.js';
import {
  SHIP_TIERS,
  SHIP_MAX_TIER,
  shipUpgradeCost,
  shipTier,
  cargoCapacity,
  hullDamageFactor
} from '../dist/warship.js';

const test = (name, fn) => {
  fn();
  console.log('PASS ' + name);
};

// A warship that is already afloat, without running the whole fusion first.
function warship(tier) {
  const s = normalizeTravel(createState(42));
  for (const k of Object.keys(s.resources)) s.resources[k] = 2000;
  normalizeExpansion(s);
  s.ship = { x: 40, z: 40, heading: 0, cargo: {}, lounge: [], lastCannon: -999 };
  if (tier !== undefined) s.ship.tier = tier;
  normalizeShip(s);
  s.player.mode = 'ship';
  return s;
}

test('A warship from before tiers existed is tier 1, with the numbers it always had', () => {
  const s = warship();
  assert.equal(shipTier(s), 1);
  assert.equal(s.ship.tier, 1);
  assert.equal(cargoCapacity(s), CARGO_CAPACITY);
  assert.equal(CARGO_CAPACITY, 300);
  assert.equal(hullDamageFactor(s), 0.4);
});

test('Tier numbers from a save are clamped into 1..3', () => {
  assert.equal(shipTier(warship(0)), 1);
  assert.equal(shipTier(warship(99)), SHIP_MAX_TIER);
  assert.equal(shipTier(warship('2')), 2);
});

test('Upgrading needs the crew aboard, the materials, and stops at the top tier', () => {
  const s = warship(1);
  s.player.mode = 'foot';
  assert.equal(upgradeShip(s).ok, false);
  s.player.mode = 'ship';
  const before = { ...s.resources };
  const cost = shipUpgradeCost(1);
  assert.ok(upgradeShip(s).ok);
  assert.equal(s.ship.tier, 2);
  for (const [k, v] of Object.entries(cost)) assert.equal(s.resources[k], before[k] - v, k);
  assert.ok(upgradeShip(s).ok);
  assert.equal(s.ship.tier, 3);
  const r = upgradeShip(s);
  assert.equal(r.ok, false);
  assert.equal(s.ship.tier, SHIP_MAX_TIER);

  const poor = warship(1);
  for (const k of Object.keys(poor.resources)) poor.resources[k] = 0;
  assert.equal(upgradeShip(poor).ok, false);
  assert.equal(poor.ship.tier, 1);
});

test('Each tier widens the hold and the cannon reloads sooner', () => {
  for (const tier of [1, 2, 3]) {
    const s = warship(tier);
    assert.equal(cargoCapacity(s), SHIP_TIERS[tier].cargo);
    assert.ok(hullDamageFactor(s) <= 0.4);
  }
  assert.ok(SHIP_TIERS[3].cargo > SHIP_TIERS[2].cargo && SHIP_TIERS[2].cargo > SHIP_TIERS[1].cargo);
  assert.ok(SHIP_TIERS[3].speed > SHIP_TIERS[2].speed && SHIP_TIERS[2].speed > SHIP_TIERS[1].speed);

  const s = warship(3);
  s.player.mode = 'cabin';
  s.resources.wood = 9999;
  assert.ok(transferCargo(s, 'wood', 9999).ok);
  assert.equal(s.ship.cargo.wood, SHIP_TIERS[3].cargo, 'the hold stops at tier 3 capacity');
});

test('The tier 3 cannon reloads in less time than tier 1', () => {
  const s = warship(3);
  s.player.mode = 'ship';
  s.wild = [{ id: 'target', x: s.ship.x + 5, z: s.ship.z, hostile: true, hp: 500 }];
  s.elapsed = 100;
  assert.ok(fireCannon(s).ok);
  const wait = CANNON.cooldown * SHIP_TIERS[3].cooldown;
  s.elapsed += wait - 0.1;
  assert.equal(fireCannon(s).ok, false, 'still loading just before the tier 3 reload');
  s.elapsed += 0.2;
  assert.ok(fireCannon(s).ok, 'loaded again after the tier 3 reload');
});

test('The tier survives a save round trip and the save stays valid', () => {
  const s = warship(2);
  const copy = JSON.parse(JSON.stringify(s));
  normalizeShip(copy);
  assert.equal(copy.ship.tier, 2);
  assert.equal(validateSave(s), true);
});
