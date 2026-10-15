// The mobile fortress. When the shelter and the boat fuse into the warship, the whole base goes to sea with it:
// the raft's facilities move into fixed slots in the cabin's 2F lounge (0.36: the main deck keeps only the wheel)
// and keep working there (storage, water, crafting, beds, pens, the hatchery), and the raft itself (its floors,
// stairs and the dock) is used up in the fusion.
// A facility keeps its record (and so its id, a pen's residents and name) and only gains `ship: { slot }`.
// What does not fit waits in the pending list (`stowed`) until a slot frees up.
// Everything that asks "where is home?" goes through homePos(), so it follows the ship.

import { CABIN } from './cabin.js?v=0.61.11';

export const TILE = 3.6;
export const RAFT_HOME = { x: 1.8, z: 1.8 };
// 0.36: slots in the cabin's 2F lounge (cabin-local x, z), along the walls, clear of the hatch (0, 13.3), the stair
// to the bridge (11, 8.6), the contract desk (0, -10.3), the decor bench (-14.3, -2) and the ladder (-12.4, 7.6).
// The names stay (lx / lz) so old saves' slot numbers keep their meaning. Each holds a facility at FORTRESS_SCALE.
export const SHIP_SLOTS = [
  { lx: -11.2, lz: -8.4 },
  { lx: -5.6, lz: -8.4 },
  { lx: 5.6, lz: -8.4 },
  { lx: 11.2, lz: -8.4 },
  { lx: 12.4, lz: -3.2 },
  { lx: 12.4, lz: 2.2 },
  { lx: -11.6, lz: 2.6 },
  { lx: -5.6, lz: 8.6 },
  { lx: 5.6, lz: 8.6 }
];
export const FORTRESS_FLOOR = 2; // the cabin floor that holds them (2F 御獸艙)
export const FORTRESS_DECK = FORTRESS_FLOOR;
export const FORTRESS_DECK_Y = 0; // (inside the lounge group, which sits at that floor's height)
export const FORTRESS_SCALE = 0.85;
export const SLOT_HALF = 3.6 * FORTRESS_SCALE * 0.5; // half a facility's footprint, for walking around it
// the raft's structure becomes the hull; these never go aboard
const STRUCTURE = ['floor', 'upperfloor', 'stairs', 'dock'];
// who gets a slot first when there are more facilities than slots
const PRIORITY = ['desk', 'shelter', 'collector', 'hatchery', 'table', 'pen', 'beacon', 'chair', 'lamp'];
const rank = b => {
  const i = PRIORITY.indexOf(b.type);
  return i < 0 ? PRIORITY.length : i;
};

export const isStructure = type => STRUCTURE.includes(type);
export const homePos = s => (s.ship ? { x: s.ship.x, z: s.ship.z } : RAFT_HOME);
// Facilities that exist and work right now (not waiting in the pending list).
export const placed = b => !b.stowed;
export const pendingFacilities = s => s.buildings.filter(b => b.stowed);
export const usedSlots = s => new Set(s.buildings.filter(b => b.ship && !b.stowed).map(b => b.ship.slot));
export const freeSlot = s => {
  const used = usedSlots(s);
  const i = SHIP_SLOTS.findIndex((_, i) => !used.has(i));
  return i < 0 ? null : i;
};

// Where a facility stands in the world now (on the raft grid, or in its lounge slot in the cabin).
export function facilityPos(s, b) {
  if (b.ship && s.ship) {
    const slot = SHIP_SLOTS[b.ship.slot] || SHIP_SLOTS[0];
    return { x: CABIN.x + slot.lx, z: CABIN.z + slot.lz };
  }
  return { x: b.x * TILE, z: b.z * TILE };
}
// the occupied lounge slots, for walking around them in the cabin
export const loungeBlocks = s =>
  (s.buildings || []).filter(b => b.ship && !b.stowed && SHIP_SLOTS[b.ship.slot]).map(b => SHIP_SLOTS[b.ship.slot]);
// Close enough to use a facility: beside it on the raft, or in the lounge beside its slot.
export function nearFacility(s, b, r = 5.5) {
  if (!b || b.stowed) return false;
  if (b.ship && (s.player.mode !== 'cabin' || s.player.floor !== FORTRESS_FLOOR)) return false;
  const p = facilityPos(s, b);
  return Math.hypot(s.player.x - p.x, s.player.z - p.z) <= (b.ship ? Math.min(r, 3.4) : r);
}

// The fusion (and loading a save made before facilities went aboard): structure is used up, facilities take
// slots in priority order, the rest go to the pending list. Safe to run again; it only touches what is unsettled.
export function moveBaseAboard(s) {
  if (!s.ship) return s;
  s.buildings = s.buildings.filter(b => !isStructure(b.type));
  // a broken save: two facilities on one slot, or a slot number out of range, loses the slot and is re-seated
  const taken = new Set();
  for (const b of s.buildings)
    if (b.ship && !b.stowed) {
      if (taken.has(b.ship.slot) || !SHIP_SLOTS[b.ship.slot]) delete b.ship;
      else taken.add(b.ship.slot);
    }
  const waiting = s.buildings.filter(b => !b.ship && !b.stowed).sort((a, b) => rank(a) - rank(b));
  for (const b of waiting) {
    const slot = SHIP_SLOTS.findIndex((_, i) => !taken.has(i));
    b.level = 0;
    if (slot < 0) {
      b.stowed = true;
      continue;
    }
    taken.add(slot);
    b.ship = { slot };
    b.rot = 0;
  }
  return s;
}

// Pending list <-> deck slots
export function installFacility(s, id, findFacility) {
  const b = findFacility(s, id);
  if (!b || !b.stowed) return { ok: false, error: '這座設施不在待安置清單上。' };
  const slot = freeSlot(s);
  if (slot === null) return { ok: false, error: '休息室已經沒有空位。先把一座設施收進待安置。' };
  delete b.stowed;
  b.ship = { slot };
  return { ok: true, message: '設施已安置到船艙休息室。' };
}
export function stowFacility(s, id, findFacility) {
  const b = findFacility(s, id);
  if (!b || !b.ship || b.stowed) return { ok: false, error: '只有戰艦上的設施可以收起。' };
  if (b.type === 'desk') return { ok: false, error: '書桌連著儲物箱，不能收起。' };
  b.stowed = true;
  delete b.ship;
  return { ok: true, message: '設施已收進待安置清單。' };
}
