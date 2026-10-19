// The warship's interior (0.20): below the main deck the hatch opens on a space of its own — a two-storey suite
// that is far roomier than the hull outside suggests. It lives in its own corner of the world (CABIN), the way the
// crystal cave does, and is walked in first person: the beast lounge with a dry side and a pool, a stair up to the
// bridge, a ladder down to the hold with the cargo stations, and furniture you place freely, ARK-style, with
// collisions. Pure state logic; cabin-models.js draws it.
import { spend, give } from './bag.js?v=0.61.1';
import { loungeBlocks, SLOT_HALF, FORTRESS_FLOOR } from './fortress.js?v=0.61.1';

export const CABIN = { x: -3000, z: 3000 };
// 0.25: three floors. The hatch comes down into 2F, the 御獸艙 where your beasts roam; a ladder leads down to 1F, the
// 生物艙 with its aquariums for water creatures and open floor for land ones; another down to the cargo hold.
export const FLOORS = [
  { id: 'hold', name: '物資艙', y: 0, h: 3.6 },
  { id: 'creatures', name: '1F 生物艙', y: 4.6, h: 3.6 },
  { id: 'beasts', name: '2F 御獸艙', y: 9.2, h: 4.6 }
];
export const WALL_H = 3.6;
export const floorH = f => FLOORS[f]?.h ?? WALL_H;
// Each floor is a set of rooms (local rectangles, +z towards the stern wall with the hatch). Anything outside every
// rectangle is wall.
export const ROOMS = {
  hold: [{ x0: -12, x1: 12, z0: -8, z1: 8 }],
  creatures: [{ x0: -14, x1: 14, z0: -10, z1: 10 }],
  beasts: [
    { x0: -15, x1: 15, z0: -11, z1: 11 },
    { x0: -6, x1: 6, z0: 11, z1: 14 } // the foyer by the hatch
  ]
};
// Built-in aquariums on 1F; each shows up to TANK_CAP water creatures. Placed 異晶水族箱 add more.
export const TANK_CAP = 3;
export const TANKS = [
  { id: 'tank-n1', floor: 1, x: -10, z: -9.1, w: 3.4, d: 1.3, h: 1.9, rot: 0 },
  { id: 'tank-n2', floor: 1, x: -5.4, z: -9.1, w: 3.4, d: 1.3, h: 1.9, rot: 0 },
  { id: 'tank-n3', floor: 1, x: 5.4, z: -9.1, w: 3.4, d: 1.3, h: 1.9, rot: 0 },
  { id: 'tank-n4', floor: 1, x: 10, z: -9.1, w: 3.4, d: 1.3, h: 1.9, rot: 0 },
  { id: 'tank-e1', floor: 1, x: 13.1, z: -3.2, w: 1.3, d: 3.4, h: 1.9, rot: 0 },
  { id: 'tank-e2', floor: 1, x: 13.1, z: 1.4, w: 1.3, d: 3.4, h: 1.9, rot: 0 }
];
// Interaction points (floor-local). Solid ones also block walking. `to` links a ladder to where it comes out.
export const CABIN_POINTS = [
  { id: 'exit-door', floor: 2, x: 0, z: 13.3, name: '艙門 · 回到主甲板', verb: '出去', w: 2.4, d: 0.8 },
  { id: 'bridge-stair', floor: 2, x: 11, z: 8.6, name: '樓梯 · 上駕駛室', verb: '上樓', w: 3, d: 3.4 },
  { id: 'beast-desk', floor: 2, x: 0, z: -10.3, name: '御獸契約台', verb: '管理', w: 2.2, d: 1 },
  { id: 'decor', floor: 2, x: -14.3, z: -2, name: '裝潢工作台 · 擺設家具', verb: '擺設', w: 1, d: 2.4 },
  {
    id: 'ladder2-down',
    floor: 2,
    x: -12.4,
    z: 7.6,
    name: '下層梯 → 1F 生物艙',
    verb: '下樓',
    w: 1.4,
    d: 1.8,
    to: 'ladder2-up'
  },
  {
    id: 'ladder2-up',
    floor: 1,
    x: -12.4,
    z: 7.6,
    name: '上層梯 → 2F 御獸艙',
    verb: '上樓',
    w: 1.4,
    d: 1.8,
    to: 'ladder2-down'
  },
  { id: 'creature-desk', floor: 1, x: 0, z: -9.2, name: '生物艙管理台', verb: '管理', w: 2, d: 1 },
  { id: 'decor1', floor: 1, x: -13.3, z: -2, name: '裝潢工作台 · 擺設家具', verb: '擺設', w: 1, d: 2.4 },
  {
    id: 'ladder-down',
    floor: 1,
    x: 11.4,
    z: 6.6,
    name: '下層梯 → 物資艙',
    verb: '下樓',
    w: 1.4,
    d: 1.8,
    to: 'ladder-up'
  },
  { id: 'cargo-b', floor: 0, x: -7, z: -7.2, name: '材料貨櫃', verb: '存取', w: 3.2, d: 1.4 },
  { id: 'cargo-a', floor: 0, x: 7, z: -7.2, name: '糧水貨櫃', verb: '存取', w: 3.2, d: 1.4 },
  {
    id: 'ladder-up',
    floor: 0,
    x: 11.4,
    z: 6.6,
    name: '上層梯 → 1F 生物艙',
    verb: '上樓',
    w: 1,
    d: 1.4,
    to: 'ladder-down'
  }
];
// Furniture you can place on any floor. size = [width, depth, height] in metres; cost from bag or storage box.
// The aquarium holds water creatures (TANK_CAP each); the nest is where a beast likes to lie.
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
  aquarium: {
    name: '異晶水族箱',
    icon: '🐠',
    size: [2.4, 1.1, 1.6],
    cost: { metal: 6, crystal: 4, glass: 1 },
    tank: true
  },
  chest: { name: '黃銅箱櫃', icon: '🧰', size: [1.2, 0.7, 0.8], cost: { wood: 4, metal: 3 } },
  piano: { name: '平台鋼琴', icon: '🎹', size: [1.6, 2, 1.1], cost: { wood: 14, metal: 6, crystal: 2 } },
  perch: { name: '御獸棲木', icon: '🪵', size: [1.4, 1.4, 1.2], cost: { wood: 6 } },
  nest: { name: '御獸窩', icon: '🪺', size: [2.4, 2.4, 0.5], cost: { fiber: 10, hide: 2 } },
  fountain: { name: '小噴泉', icon: '⛲', size: [1.6, 1.6, 1.3], cost: { metal: 5, crystal: 3 } }
};
export const ITEM_LIMIT = 60;
export const PLAYER_R = 0.38;
const fail = error => ({ ok: false, error });
export const inCabin = s => s.player.mode === 'cabin';
export const floorOf = s => FLOORS[s.player.floor | 0] || FLOORS[2];
export const toCabinWorld = (x, z) => ({ x: CABIN.x + x, z: CABIN.z + z });
export const toCabinLocal = (x, z) => ({ x: x - CABIN.x, z: z - CABIN.z });

export function normalizeCabin(s) {
  if (!s.ship) return s;
  s.ship.cabin ??= { items: [] };
  s.ship.cabin.items = (s.ship.cabin.items || []).filter(it => CABIN_ITEMS[it.type]).slice(0, ITEM_LIMIT);
  if (s.player.mode === 'cabin') {
    s.player.floor = [0, 1, 2].includes(s.player.floor) ? s.player.floor : 2;
    if (!Number.isFinite(s.player.cx) || !walkable(s, s.player.floor, s.player.cx, s.player.cz)) {
      s.player.floor = 2;
      s.player.cx = 0;
      s.player.cz = 11;
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
  for (const tk of TANKS) if (tk.floor === floor && inBox(x, z, tk.x, tk.z, tk.w, tk.d, tk.rot, pad)) return false;
  for (const p of CABIN_POINTS) if (p.floor === floor && p.w && inBox(x, z, p.x, p.z, p.w, p.d, 0, pad)) return false;
  // 0.36: the base's facilities stand in the lounge
  if (floor === FORTRESS_FLOOR)
    for (const sl of loungeBlocks(s)) if (inBox(x, z, sl.lx, sl.lz, SLOT_HALF * 2, SLOT_HALF * 2, 0, pad)) return false;
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
  Object.assign(s.player, { mode: 'cabin', floor: 2, cx: 0, cz: 12.2, heading: Math.PI });
  syncCabin(s);
  return { ok: true, message: '進入比斯泰德號的船艙。' };
}
export function leaveCabin(s) {
  if (s.player.mode !== 'cabin') return fail('你不在船艙裡。');
  Object.assign(s.player, { mode: 'aboard', deck: 3, lx: HATCH.lx, lz: HATCH.lz - 1.2, level: 0 });
  return { ok: true, message: '回到主甲板。' };
}
export function climbToBridge(s) {
  if (s.player.mode !== 'cabin' || s.player.floor !== 2) return fail('樓梯在 2F 御獸艙。');
  Object.assign(s.player, { mode: 'aboard', deck: 4, lx: 0, lz: -7.6, level: 0 });
  return { ok: true, message: '抵達駕駛室。' };
}
// The ladder: returns where the climb ends; game.js plays the climb and then calls finishLadder.
export function useLadder(s, id) {
  if (s.player.mode !== 'cabin') return fail('請在船艙內使用梯子。');
  const p = CABIN_POINTS.find(v => v.id === id);
  if (!p || p.floor !== s.player.floor) return fail('梯子不在這一層。');
  if (Math.hypot(s.player.cx - p.x, s.player.cz - p.z) > 2.6) return fail('走近梯子。');
  const land = CABIN_POINTS.find(v => v.id === p.to);
  if (!land) return fail('這座梯子不通。');
  const side = land.x > 0 ? -1.4 : 1.4;
  return {
    ok: true,
    floor: land.floor,
    x: land.x + side,
    z: land.z,
    from: FLOORS[s.player.floor].y,
    to: FLOORS[land.floor].y
  };
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
  for (const tk of TANKS)
    if (tk.floor === floor && corners.some(([px, pz]) => inBox(px, pz, tk.x, tk.z, tk.w, tk.d, tk.rot, 0.3)))
      return '會擋住水族缸。';
  for (const p of CABIN_POINTS)
    if (p.floor === floor && p.w && corners.some(([px, pz]) => inBox(px, pz, p.x, p.z, p.w, p.d, 0, 0.9)))
      return '會擋住' + p.name.split(' · ')[0] + '。';
  if (
    floor === FORTRESS_FLOOR &&
    loungeBlocks(s).some(
      sl =>
        corners.some(([px, pz]) => inBox(px, pz, sl.lx, sl.lz, SLOT_HALF * 2, SLOT_HALF * 2, 0, 0.4)) ||
        inBox(sl.lx, sl.lz, x, z, w, d, rot, SLOT_HALF)
    )
  )
    return '那裡擺著設施。';
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

// ---------- 0.25: where the creatures and beasts aboard are ----------
// Every aquarium on board: the built-in ones on 1F and any 異晶水族箱 placed on any floor.
export function tanksOf(s) {
  const placed = (s.ship?.cabin?.items || [])
    .filter(it => CABIN_ITEMS[it.type]?.tank)
    .map(it => {
      const sz = CABIN_ITEMS[it.type].size;
      return { id: it.id, floor: it.floor, x: it.x, z: it.z, rot: it.rot, w: sz[0], d: sz[1], h: sz[2] };
    });
  return [...TANKS, ...placed];
}
// Which tank each water creature swims in: { petId: { tank, slot } }. Beyond the tanks' room they stay in storage.
export function tankSlots(s, waterPets) {
  const tanks = tanksOf(s),
    out = {};
  let i = 0;
  for (const p of waterPets) {
    const tk = tanks[Math.floor(i / TANK_CAP)];
    if (!tk) break;
    out[p.id] = { tank: tk, slot: i % TANK_CAP };
    i++;
  }
  return out;
}
export const tankRoom = s => tanksOf(s).length * TANK_CAP;
// A wandering walker on a floor: picks a spot it can reach and ambles there; pauses now and then.
export function wanderStep(s, floor, a, dt, rng = Math.random, speed = 1.2, pad = 0.7) {
  if (!Number.isFinite(a.x)) {
    for (let k = 0; k < 30; k++) {
      const x = -10 + rng() * 20,
        z = -6 + rng() * 12;
      if (walkable(s, floor, x, z, pad)) {
        a.x = x;
        a.z = z;
        break;
      }
    }
    if (!Number.isFinite(a.x)) Object.assign(a, { x: 0, z: 0 });
    a.heading = rng() * 6.28;
  }
  if (a.wait > 0) {
    a.wait -= dt;
    a.moving = false;
    return a;
  }
  if (!Number.isFinite(a.tx) || Math.hypot(a.tx - a.x, a.tz - a.z) < 0.4) {
    if (Number.isFinite(a.tx)) a.wait = 1.5 + rng() * 4;
    a.tx = NaN;
    for (let k = 0; k < 12; k++) {
      const tx = a.x + (rng() - 0.5) * 10,
        tz = a.z + (rng() - 0.5) * 10;
      if (walkable(s, floor, tx, tz, pad)) {
        a.tx = tx;
        a.tz = tz;
        break;
      }
    }
    a.moving = false;
    return a;
  }
  const d = Math.hypot(a.tx - a.x, a.tz - a.z),
    nx = a.x + ((a.tx - a.x) / d) * speed * dt,
    nz = a.z + ((a.tz - a.z) / d) * speed * dt;
  if (walkable(s, floor, nx, nz, pad)) {
    a.x = nx;
    a.z = nz;
    a.moving = true;
    const want = Math.atan2(a.tx - a.x, a.tz - a.z),
      h = a.heading || 0;
    a.heading = h + Math.atan2(Math.sin(want - h), Math.cos(want - h)) * Math.min(1, dt * 4);
  } else {
    a.tx = NaN; // blocked: pick another spot next step
  }
  return a;
}
