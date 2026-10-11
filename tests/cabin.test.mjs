// 0.20: the warship's cabin — entering, walking with collisions, the ladder, furniture placement and pickup.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeShip, transferCargo, shipDockOption, SHIP_POINTS } from '../dist/ship.js';
import {
  enterCabin,
  leaveCabin,
  climbToBridge,
  walkable,
  moveCabin,
  useLadder,
  finishLadder,
  placeItem,
  removeItem,
  placeError,
  cabinPointsWorld,
  CABIN,
  CABIN_ITEMS,
  TANKS,
  FLOORS
} from '../dist/cabin.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
function aboard() {
  const s = createState(2020);
  s.ship = { x: 0, z: 40, heading: 0, cargo: {}, lounge: [] };
  Object.assign(s.player, { mode: 'aboard', deck: 3, lx: 0, lz: 1, level: 0 });
  normalizeShip(s);
  for (const k of Object.keys(s.resources)) s.resources[k] = 30;
  return s;
}

test('Cabin: the hatch on the main deck leads into the suite, and the stair out lands on the bridge', () => {
  const s = aboard();
  assert.ok(SHIP_POINTS.some(p => p.id === 'cabin-door' && p.deck === 3));
  assert.equal(enterCabin(s).ok, true);
  assert.equal(s.player.mode, 'cabin');
  assert.equal(s.player.floor, 2); // 0.25: the hatch comes down into 2F, the beast hall
  assert.equal(s.player.x, CABIN.x + s.player.cx);
  assert.deepEqual(shipDockOption(s).mode, 'leave-cabin');
  assert.ok(leaveCabin(s).ok);
  assert.equal(s.player.mode, 'aboard');
  assert.equal(s.player.deck, 3);
  enterCabin(s);
  assert.ok(climbToBridge(s).ok);
  assert.equal(s.player.deck, 4);
  // an old save on one of the lower decks comes back up to the main deck
  Object.assign(s.player, { mode: 'aboard', deck: 1, lx: 0, lz: 2 });
  normalizeShip(s);
  assert.equal(s.player.deck, 3);
});
test('Cabin: walls, aquariums and the stations block walking; the foyer doorway does not', () => {
  const s = aboard();
  enterCabin(s);
  assert.ok(walkable(s, 2, 0, 11)); // the doorway between foyer and hall
  assert.ok(walkable(s, 2, -8, -5)); // the open hall
  assert.ok(!walkable(s, 2, 15.9, 0), 'wall');
  assert.ok(!walkable(s, 2, 0, -10.3), 'the contract desk');
  assert.ok(!walkable(s, 1, TANKS[0].x, TANKS[0].z), 'aquarium');
  assert.ok(walkable(s, 1, 0, 0), 'the creature floor is open');
  moveCabin(s, 0, -40);
  assert.ok(s.player.cz > -10 && s.player.cz < -9, 'stopped at the desk');
  assert.ok(walkable(s, 2, s.player.cx, s.player.cz));
});
test('Cabin: ladders take you 2F → 1F → the hold and back, where the cargo station takes every kind of goods', () => {
  const s = aboard();
  enterCabin(s);
  assert.equal(useLadder(s, 'ladder2-down').ok, false); // too far away
  assert.equal(useLadder(s, 'ladder-down').ok, false); // not on this floor
  Object.assign(s.player, { cx: -12, cz: 6.4 });
  const mid = useLadder(s, 'ladder2-down');
  assert.ok(mid.ok, mid.error);
  assert.equal(mid.floor, 1);
  finishLadder(s, mid);
  assert.equal(s.player.floor, 1);
  Object.assign(s.player, { cx: 10, cz: 5.6 });
  const r = useLadder(s, 'ladder-down');
  assert.ok(r.ok);
  assert.equal(r.floor, 0);
  assert.equal(r.from, FLOORS[1].y);
  finishLadder(s, r);
  assert.equal(s.player.floor, 0);
  assert.ok(walkable(s, 0, s.player.cx, s.player.cz));
  assert.ok(cabinPointsWorld(s).some(t => t.point === 'cargo-a'));
  assert.ok(transferCargo(s, 'wood', 5).ok);
  assert.ok(transferCargo(s, 'food', 5).ok);
  assert.equal(s.ship.cargo.wood, 5);
  const up = useLadder(s, 'ladder-up');
  assert.ok(up.ok);
  finishLadder(s, up);
  assert.equal(s.player.floor, 1);
});
test('Cabin: furniture costs materials, cannot overlap walls, aquariums, stations or each other, and refunds on pickup', () => {
  const s = aboard();
  enterCabin(s);
  Object.assign(s.player, { cx: 0, cz: 6 });
  const wood = s.resources.wood;
  const r = placeItem(s, 'sofa', 0, 2, 0);
  assert.ok(r.ok);
  assert.equal(s.resources.wood, wood - CABIN_ITEMS.sofa.cost.wood);
  assert.ok(!walkable(s, 2, 0, 2), 'the sofa blocks walking');
  assert.ok(placeError(s, 'table', 2, 0, 2, 0.3), 'overlap');
  assert.ok(placeError(s, 'table', 1, TANKS[1].x, TANKS[1].z, 0), 'aquarium');
  assert.ok(placeError(s, 'table', 2, 14.8, 0, 0), 'wall');
  assert.ok(placeError(s, 'table', 2, 0, -9.6, 0), 'station');
  assert.ok(placeError(s, 'table', 2, 0, 6, 0), 'on the player');
  assert.equal(placeError(s, 'rug', 2, 0, 2, 0), null, 'rugs go under anything');
  assert.ok(placeItem(s, 'table', -3, 6, 1.2).ok);
  Object.assign(s.player, { cx: -1, cz: 4 });
  const picks = cabinPointsWorld(s).filter(t => t.point.startsWith('pick:'));
  assert.equal(picks.length, 2);
  const total = () => s.resources.wood + (s.storage?.wood || 0);
  const before = total();
  assert.ok(removeItem(s, r.item.id).ok);
  assert.equal(total(), before + CABIN_ITEMS.sofa.cost.wood);
  assert.ok(walkable(s, 2, 0, 2));
  s.resources.crystal = 0;
  assert.equal(placeItem(s, 'piano', -4, 5, 0).ok, false);
});
console.log(`cabin tests: ${n} passed`);
