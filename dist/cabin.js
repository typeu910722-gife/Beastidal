// The warship's interior (0.20): below the main deck the hatch opens on a space of its own — a two-storey suite
// that is far roomier than the hull outside suggests. It lives in its own corner of the world (CABIN), the way the
// crystal cave does, and is walked in first person: the beast lounge with a dry side and a pool, a stair up to the
// bridge, a ladder down to the hold with the cargo stations, and furniture you place freely, ARK-style, with
// collisions. Pure state logic; cabin-models.js draws it.
import { spend, give } from './bag.js?v=0.23.0';

export const CABIN = { x: -3000, z: 3000 };
export const FLOORS = [
  { id: 'hold', name: '物資艙', y: 0 },
  { id: 'suite', name: '御獸休息室', y: 4.6 }
];
export const WALL_H = 3.6;
// Each floor is a set of rooms (local rectangles, +z towards the stern wall with the hatch). Anything outside every
// rectangle is wall.
export const ROOMS = {
  hold: [{ x0: -12, x1: 12, z0: -8, z1: 8 }],
  suite: [
    { x0: -14, x1: 14, z0: -10, z1: 10 },
    { x0: -6, x1: 6, z0: 10, z1: 13 } // the foyer by the hatch
  ]
};
// The lounge pool (sea beasts) and the dry garden (land beasts) on the suite floor.
export const POOL = { x0: 3, x1: 12.5, z0: -8, z1: 6 };
export const GARDEN = { x0: -13, x1: -4, z0: -9, z1: -1 };
export const POOL_SLOTS = [
  [5.5, -5.5],
  [10, -5],
  [5, 0.5],
  [10.5, 1],
  [7.5, 4],
  [7.8, -2]
];
export const GARDEN_SLOTS = [
  [-11, -7],
  [-6.5, -7],
  [-11.5, -3],
  [-6, -3.5],
  [-8.5, -5.2],
  [-8.8, -1.8]
];
// Interaction points (floor-local). Solid ones also block walking.
export const CABIN_POINTS = [
  { id: 'exit-door', floor: 1, x: 0, z: 12.3, name: '艙門 · 回到主甲板', verb: '出去', w: 2.4, d: 0.8 },
  { id: 'bridge-stair', floor: 1, x: -10.5, z: 8.8, name: '樓梯 · 上駕駛室', verb: '上樓', w: 3, d: 3.4 },
  { id: 'lounge', floor: 1, x: -1.5, z: -9.2, name: '御獸休息室管理台', verb: '管理', w: 2, d: 1 },
  { id: 'ladder-down', floor: 1, x: 11.4, z: 6.6, name: '下層梯 → 物資艙', verb: '下樓', w: 1.4, d: 1.8 },
  { id: 'decor', floor: 1, x: -13.3, z: 3, name: '裝潢工作台 · 擺設家具', verb: '擺設', w: 1, d: 2.4 },
  { id: 'cargo-b', floor: 0, x: -7, z: -7.2, name: '材料貨櫃', verb: '存取', w: 3.2, d: 1.4 },
  { id: 'cargo-a', floor: 0, x: 7, z: -7.2, name: '糧水貨櫃', verb: '存取', w: 3.2, d: 1.4 },
  { id: 'ladder-up', floor: 0, x: 11.4, z: 6.6, name: '上層梯 → 御獸休息室', verb: '上樓', w: 1, d: 1.4 }
];
// Furniture you can place. size = [width, depth, height] in metres; cost from bag or storage box.
export const CABIN_ITEMS = {
  sofa: { name: '絨布沙發', icon: '🛋', size: [2.4, 1, 0.9], cost: { wood: 6, fiber: 8 } },
  armchair: { name: '單人扶手椅', icon: '💺', size: [1.1, 1.1, 1], cost: { wood: 3, fiber: 4 } },
  table: { name: '黃銅邊圓桌', icon: '🫖', size: [1.4, 1.4, 0.8], cost: { wood: 4, metal: 2 } },
  lamp: { name: '落地燈', icon: '🪔', size: [0.5, 0.5, 1.8], cost: { metal: 3, crystal: 1 } },
  plant: { name: '盆栽棕櫚', icon: '🪴', size: [0.9, 0.9, 2], cost: { fiber: 5, wood: 1 } },
  rug: { name: '織紋地毯', icon: '🧶', size: [3, 2, 0.04], cost: { fiber: 10 } },
  bookcase: { name: '航海書櫃', icon: '📚', size: [1.8, 0.5, 2.2], cost: { wood: 8 } },
  bed: { name: '船長大床', icon: '🛏', size: [2, 2.4, 0.9], cost: { wood: 10, fiber: 12 } },
  bar: { name: '吧檯', icon: '🍸', size: [3, 0.8, 1.1], cost: { wood: 8, metal: 4, crystal: 1 } },
  aquarium: { name: '異晶水族箱', icon: '🐠', size: [1.6, 0.7, 1.5], cost: { metal: 6, crystal: 4 } },
  chest: { name: '黃銅箱櫃', icon: '🧰', size: [1.2, 0.7, 0.8], cost: { wood: 4, metal: 3 } },
  piano: { name: '平台鋼琴', icon: '🎹', size: [1.6, 2, 1.1], cost: { wood: 14, metal: 6, crystal: 2 } },
  perch: { name: '御獸棲木', icon: '🪵', size: [1.4, 1.4, 1.2], cost: { wood: 6 } },
  fountain: { name: '小噴泉', icon: '⛲', size: [1.6, 1.6, 1.3], cost: { metal: 5, crystal: 3 } }
};
export const ITEM_LIMIT = 60;
export const PLAYER_R = 0.38;
const fail = error => ({ ok: false, error });
export const inCabin = s => s.player.mode === 'cabin';
export const floorOf = s => FLOORS[s.player.floor | 0] || FLOORS[1];
export const toCabinWorld = (x, z) => ({ x: CABIN.x + x, z: CABIN.z + z });
export const toCabinLocal = (x, z) => ({ x: x - CABIN.x, z: z - CABIN.z });

export function normalizeCabin(s) {
  if (!s.ship) return s;
  s.ship.cabin ??= { items: [] };
  s.ship.cabin.items = (s.ship.cabin.items || []).filter(it => CABIN_ITEMS[it.type]).slice(0, ITEM_LIMIT);
  if (s.player.mode === 'cabin') {
    s.player.floor = s.player.floor === 0 ? 0 : 1;
    if (!Number.isFinite(s.player.cx) || !walkable(s, s.player.floor, s.player.cx, s.player.cz)) {
      s.player.floor = 1;
      s.player.cx = 0;
      s.player.cz = 9;
    }
    syncCabin(s);
  }
  return s;
}
export function syncCabin(s) {
  if (s.player.mode !== 'cabin') return;
  s.player.x = CABIN.x + s.player.cx;
  s.player.z = CABIN.z + s.player.cz;
  s.player.level = 0;
}
const inRect = (r, x, z, pad = 0) => x >= r.x0 + pad && x <= r.x1 - pad && z >= r.z0 + pad && z <= r.z1 - pad;
// point (x,z) against a box of w×d centred at (bx,bz) turned by rot, grown by pad
export function inBox(x, z, bx, bz, w, d, rot = 0, pad = 0) {
  const c = Math.cos(rot),
    n = Math.sin(rot),
    dx = x - bx,
    dz = z - bz,
    lx = dx * c + dz * n,
    lz = -dx * n + dz * c;
  return Math.abs(lx) < w / 2 + pad && Math.abs(lz) < d / 2 + pad;
}
export const itemsOn = (s, floor) => (s.ship?.cabin?.items || []).filter(it => it.floor === floor);
// Can a person stand here? Inside a room, not in the pool, not inside furniture or a station.
export function walkable(s, floor, x, z, pad = PLAYER_R) {
  // the player's circle must stay inside the union of the rooms (so doorways between rooms work)
  const rooms = ROOMS[FLOORS[floor].id],
    inRooms = (px, pz) => rooms.some(r => inRect(r, px, pz, 0));
  if (!inRooms(x, z) || !inRooms(x + pad, z) || !inRooms(x - pad, z) || !inRooms(x, z + pad) || !inRooms(x, z - pad))
    return false;
  if (floor === 1 && inRect(POOL, x, z, -pad)) return false;
  for (const p of CABIN_POINTS) if (p.floor === floor && p.w && inBox(x, z, p.x, p.z, p.w, p.d, 0, pad)) return false;
  for (const it of itemsOn(s, floor)) {
    const sz = CABIN_ITEMS[it.type].size;
    if (sz[2] > 0.3 && inBox(x, z, it.x, it.z, sz[0], sz[1], it.rot, pad)) return false; // rugs are walked over
  }
  return true;
}
export function moveCabin(s, dx, dz) {
  const f = s.player.floor,
    steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (walkable(s, f, s.player.cx + dx / steps, s.player.cz)) s.player.cx += dx / steps;
    if (walkable(s, f, s.player.cx, s.player.cz + dz / steps)) s.player.cz += dz / steps;
  }
  syncCabin(s);
}
// ---------- going in and out ----------
export const HATCH = { lx: 0, lz: 2.2 }; // on the main deck (ship-local), where the companionway goes down
export function enterCabin(s) {
  if (!s.ship) return fail('沒有戰艦。');
  if (s.player.mode !== 'aboard' || s.player.deck !== 3) return fail('艙門在主甲板上。');
  if (Math.hypot(s.player.lx - HATCH.lx, s.player.lz - HATCH.lz) > 3) return fail('走到艙門前。');
  normalizeCabin(s);
  Object.assign(s.player, { mode: 'cabin', floor: 1, cx: 0, cz: 10.4, heading: Math.PI });
  syncCabin(s);
  return { ok: true, message: '進入比斯泰德號的船艙。' };
}
export function leaveCabin(s) {
  if (s.player.mode !== 'cabin') return fail('你不在船艙裡。');
  Object.assign(s.player, { mode: 'aboard', deck: 3, lx: HATCH.lx, lz: HATCH.lz - 1.2, level: 0 });
  return { ok: true, message: '回到主甲板。' };
}
export function climbToBridge(s) {
  if (s.player.mode !== 'cabin' || s.player.floor !== 1) return fail('樓梯在休息室那一層。');
  Object.assign(s.player, { mode: 'aboard', deck: 4, lx: 0, lz: -7.6, level: 0 });
  return { ok: true, message: '抵達駕駛室。' };
}
// The ladder: returns where the climb ends; game.js plays the climb and then calls finishLadder.
export function useLadder(s, id) {
  if (s.player.mode !== 'cabin') return fail('請在船艙內使用梯子。');
  const p = CABIN_POINTS.find(v => v.id === id);
  if (!p || p.floor !== s.player.floor) return fail('梯子不在這一層。');
  if (Math.hypot(s.player.cx - p.x, s.player.cz - p.z) > 2.6) return fail('走近梯子。');
  const to = id === 'ladder-up' ? 1 : 0,
    land = CABIN_POINTS.find(v => v.id === (to === 1 ? 'ladder-down' : 'ladder-up'));
  return { ok: true, floor: to, x: land.x - 1.4, z: land.z, from: FLOORS[s.player.floor].y, to: FLOORS[to].y };
}
export function finishLadder(s, r) {
  Object.assign(s.player, { floor: r.floor, cx: r.x, cz: r.z });
  syncCabin(s);
  return { ok: true, message: '抵達' + FLOORS[r.floor].name + '。' };
}
// ---------- furniture ----------
export function itemCount(s) {
  return s.ship?.cabin?.items.length || 0;
}
// Does this footprint fit: inside a room, off the pool and the garden stations, clear of other furniture (rugs
// may overlap anything flat).
export function placeError(s, type, floor, x, z, rot, ignoreId = null) {
  const def = CABIN_ITEMS[type];
  if (!def) return '沒有這種家具。';
  const [w, d, h] = def.size,
    rooms = ROOMS[FLOORS[floor].id],
    c = Math.cos(rot),
    n = Math.sin(rot),
    corners = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2]
    ].map(([lx, lz]) => [x + lx * c - lz * n, z + lx * n + lz * c]);
  if (!corners.every(([px, pz]) => rooms.some(r => inRect(r, px, pz, 0.1)))) return '太靠近牆壁了。';
  if (floor === 1 && corners.some(([px, pz]) => inRect(POOL, px, pz, -0.2))) return '那是御獸的水池。';
  for (const p of CABIN_POINTS)
    if (p.floor === floor && p.w && corners.some(([px, pz]) => inBox(px, pz, p.x, p.z, p.w, p.d, 0, 0.9)))
      return '會擋住' + p.name.split(' · ')[0] + '。';
  if (h > 0.3)
    for (const it of itemsOn(s, floor)) {
      if (it.id === ignoreId) continue;
      const sz = CABIN_ITEMS[it.type].size;
      if (sz[2] <= 0.3) continue;
      // overlap test both ways on the two boxes' corners (good enough for furniture)
      const oc = Math.cos(it.rot),
        on = Math.sin(it.rot),
        theirs = [
          [-sz[0] / 2, -sz[1] / 2],
          [sz[0] / 2, -sz[1] / 2],
          [sz[0] / 2, sz[1] / 2],
          [-sz[0] / 2, sz[1] / 2]
        ].map(([lx, lz]) => [it.x + lx * oc - lz * on, it.z + lx * on + lz * oc]);
      if (
        corners.some(([px, pz]) => inBox(px, pz, it.x, it.z, sz[0], sz[1], it.rot, 0.05)) ||
        theirs.some(([px, pz]) => inBox(px, pz, x, z, w, d, rot, 0.05)) ||
        inBox(it.x, it.z, x, z, w, d, rot, 0)
      )
        return '和' + CABIN_ITEMS[it.type].name + '重疊了。';
    }
  // never box the player in
  if (
    s.player.mode === 'cabin' &&
    s.player.floor === floor &&
    h > 0.3 &&
    inBox(s.player.cx, s.player.cz, x, z, w, d, rot, PLAYER_R)
  )
    return '你站在那裡。';
  return null;
}
export function placeItem(s, type, x, z, rot = 0) {
  if (s.player.mode !== 'cabin') return fail('請在船艙內擺設。');
  normalizeCabin(s);
  const def = CABIN_ITEMS[type];
  if (!def) return fail('沒有這種家具。');
  if (itemCount(s) >= ITEM_LIMIT) return fail(`船艙最多擺 ${ITEM_LIMIT} 件家具。`);
  const floor = s.player.floor,
    err = placeError(s, type, floor, x, z, rot);
  if (err) return fail(err);
  if (!spend(s, def.cost)) return fail('材料不夠：' + costText(def.cost));
  const item = { id: 'it-' + Math.floor(Math.random() * 1e9).toString(36), type, floor, x, z, rot };
  s.ship.cabin.items.push(item);
  return { ok: true, item, message: `擺好了${def.name}。` };
}
// Picking a piece up returns its materials in full, so rearranging never costs anything.
export function removeItem(s, id) {
  if (s.player.mode !== 'cabin') return fail('請在船艙內操作。');
  const items = s.ship?.cabin?.items || [],
    it = items.find(v => v.id === id);
  if (!it) return fail('找不到這件家具。');
  if (Math.hypot(it.x - s.player.cx, it.z - s.player.cz) > 4) return fail('走近一點再收起來。');
  items.splice(items.indexOf(it), 1);
  give(s, CABIN_ITEMS[it.type].cost);
  return { ok: true, type: it.type, message: `收起${CABIN_ITEMS[it.type].name}，材料已退回。` };
}
export const costText = cost =>
  Object.entries(cost)
    .map(
      ([k, v]) =>
        `${{ wood: '漂流木', metal: '廢金屬', fiber: '纖維', crystal: '異晶', food: '口糧', water: '淡水', bait: '誘餌' }[k]} ${v}`
    )
    .join('、');
// Targets for the HUD: stations on this floor and the furniture within reach (to pick up).
export function cabinPointsWorld(s) {
  if (s.player.mode !== 'cabin') return [];
  const f = s.player.floor,
    out = CABIN_POINTS.filter(p => p.floor === f).map(p => {
      // the spot to stand at: just outside the station, on the side facing the middle of the room
      const L = Math.hypot(p.x, p.z) || 1,
        r = Math.max(p.w || 0, p.d || 0) / 2 + 0.5;
      return {
        ...toCabinWorld(p.x - (p.x / L) * r, p.z - (p.z / L) * r),
        id: 'ship:' + p.id,
        point: p.id,
        type: 'shippoint',
        name: p.name,
        verb: p.verb
      };
    });
  for (const it of itemsOn(s, f))
    if (Math.hypot(it.x - s.player.cx, it.z - s.player.cz) < 4)
      out.push({
        ...toCabinWorld(it.x, it.z),
        id: 'decor:' + it.id,
        point: 'pick:' + it.id,
        type: 'shippoint',
        name: CABIN_ITEMS[it.type].name,
        verb: '收起'
      });
  return out;
}
