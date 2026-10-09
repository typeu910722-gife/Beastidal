// Beastidal warship: island claims, dock station, shelter + boat fusion, multi-deck interior.
import { ISLANDS, onIsland, islandAt, islandDocks } from './islands.js?v=0.9.0';
export const LIMITS = { floor: 20, pen: 5, dock: 1 };
export const LIMIT_NAMES = { floor: '浮動地基', pen: '海洋展示池', dock: '船隻停靠站' };
export const CLAIM_COST = { wood: 20, metal: 12, fiber: 8, crystal: 5 };
export const FUSION_COST = { wood: 160, metal: 120, fiber: 60, crystal: 45, food: 25, water: 25 };
export const FUSION_TIME = 120;
export const LOUNGE_CAPACITY = 6;
export const CARGO_CAPACITY = 300;
export const CANNON = { damage: 34, cooldown: 5, range: 32, ammo: { metal: 1 } };
export const SHIP_LEN = 30,
  SHIP_BEAM = 5;
// Deck 0 is the lowest hold, deck 4 the bridge. Heights are relative to the waterline.
export const DECKS = [
  { id: 'hold-b', name: '物資艙 B · 材料艙', short: '材料艙', y: 0.4, cargo: ['wood', 'metal', 'fiber', 'crystal'] },
  { id: 'hold-a', name: '物資艙 A · 糧水艙', short: '糧水艙', y: 3, cargo: ['food', 'water', 'bait'] },
  { id: 'lounge', name: '御獸休息室', short: '休息室', y: 5.6 },
  { id: 'main', name: '主甲板 · 砲列', short: '主甲板', y: 8.2 },
  { id: 'bridge', name: '駕駛室', short: '駕駛室', y: 11 }
];
export const BAND_HEIGHT = 2.6;
// Interaction points in ship-local coordinates (+z is the bow).
export const SHIP_POINTS = [
  { id: 'cargo-b', deck: 0, lx: 0, lz: 6.5, name: '材料貨櫃', verb: '存取' },
  { id: 'cargo-a', deck: 1, lx: 0, lz: 6.5, name: '糧水貨櫃', verb: '存取' },
  { id: 'lounge', deck: 2, lx: 0, lz: 7, name: '御獸休息室管理台', verb: '管理' },
  { id: 'gangway', deck: 3, lx: 3.7, lz: 1, name: '舷梯 · 上下船', verb: '下船' },
  { id: 'to-bridge', deck: 3, lx: 0, lz: -4.6, name: '駕駛室樓梯', verb: '上樓' },
  { id: 'helm', deck: 4, lx: 0, lz: -10.6, name: '舵輪 · 掌舵', verb: '掌舵' },
  { id: 'chart', deck: 4, lx: 2, lz: -8.4, name: '航海圖桌', verb: '查看' },
  { id: 'from-bridge', deck: 4, lx: 0, lz: -6.6, name: '下樓梯 · 主甲板', verb: '下樓' },
  ...[0, 1, 2].map(d => ({
    id: 'up-' + d,
    deck: d,
    lx: 1.1,
    lz: 2,
    name: '上層梯 → ' + DECKS[d + 1].short,
    verb: '上樓'
  })),
  ...[1, 2, 3].map(d => ({
    id: 'down-' + d,
    deck: d,
    lx: -1.1,
    lz: 2,
    name: '下層梯 → ' + DECKS[d - 1].short,
    verb: '下樓'
  }))
];
const fail = error => ({ ok: false, error });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const HOME = { x: 1.8, z: 1.8 };
const pay = (s, cost) => {
  if (Object.entries(cost).some(([k, v]) => (s.resources[k] || 0) < v)) return false;
  for (const [k, v] of Object.entries(cost)) s.resources[k] -= v;
  return true;
};
const count = (s, t) => s.buildings.filter(b => b.type === t).length;
export function hullHalfBeam(z) {
  if (z > 4) return SHIP_BEAM * Math.cos((Math.min(1, (z - 4) / 11) * Math.PI) / 2);
  if (z < -11) return SHIP_BEAM * (1 - 0.25 * ((-11 - z) / 4) ** 2);
  return SHIP_BEAM;
}
export const hullFlare = y => 0.62 + 0.38 * Math.min(1, Math.max(0, (y + 2) / 9));
export function deckWalk(deck, lx, lz) {
  if (deck === 4) return Math.abs(lx) < 3.3 && lz > -12.8 && lz < -6.2;
  if (lz < -14.3 || lz > 14.6) return false;
  const y = DECKS[deck]?.y ?? 0;
  return Math.abs(lx) < hullHalfBeam(lz) * hullFlare(y) - 0.75;
}
export function toWorld(ship, lx, lz) {
  const c = Math.cos(ship.heading),
    n = Math.sin(ship.heading);
  return { x: ship.x + lx * c + lz * n, z: ship.z - lx * n + lz * c };
}
export function toLocal(ship, x, z) {
  const dx = x - ship.x,
    dz = z - ship.z,
    c = Math.cos(ship.heading),
    n = Math.sin(ship.heading);
  return { lx: dx * c - dz * n, lz: dx * n + dz * c };
}
export const hasShip = s => !!s.ship;
export function normalizeShip(s) {
  s.occupied = Array.isArray(s.occupied) ? s.occupied.filter(id => ISLANDS.some(i => i.id === id)) : [];
  if (s.ship) {
    const p = s.ship;
    p.heading ??= 0;
    p.cargo ??= {};
    for (const k of ['wood', 'metal', 'fiber', 'crystal', 'food', 'water', 'bait'])
      p.cargo[k] = Math.max(0, Math.floor(p.cargo[k] || 0));
    p.lounge = (p.lounge || []).filter(id => s.tamed.some(t => t.id === id)).slice(0, LOUNGE_CAPACITY);
    p.lastCannon ??= -999;
    s.boat = { x: p.x, z: p.z, heading: p.heading };
    if (!['ship', 'aboard', 'foot'].includes(s.player.mode)) s.player.mode = 'ship';
    if (s.player.mode === 'aboard') {
      s.player.deck = Math.max(0, Math.min(4, s.player.deck | 0));
      if (!deckWalk(s.player.deck, s.player.lx, s.player.lz)) {
        s.player.deck = 3;
        s.player.lx = 2.6;
        s.player.lz = 1;
      }
      syncAboard(s);
    }
    if (s.player.mode === 'ship' && !s.expedition?.mounted)
      Object.assign(s.player, { x: p.x, z: p.z, heading: p.heading });
  } else if (['ship', 'aboard'].includes(s.player.mode)) s.player.mode = 'boat';
  return s;
}
export function syncAboard(s) {
  if (s.player.mode !== 'aboard' || !s.ship) return;
  const w = toWorld(s.ship, s.player.lx, s.player.lz);
  s.player.x = w.x;
  s.player.z = w.z;
  s.player.level = 0;
}
export function deckY(s) {
  return s.player.mode === 'aboard' ? DECKS[s.player.deck].y : 0;
}
// ---------- island claims ----------
export function claimIsland(s, id, pet) {
  normalizeShip(s);
  const i = ISLANDS.find(v => v.id === id);
  if (!i) return fail('找不到島嶼。');
  if (s.occupied.includes(id)) return fail(i.name + ' 已經是你的領地。');
  if (s.player.mode !== 'foot' || onIsland(s.player.x, s.player.z)?.id !== id)
    return fail('請登上' + i.name + '並走到島中央的無主石碑。');
  if (dist(s.player, i) > 5) return fail('走近島中央石碑 5 公尺內才能插旗。');
  if (!pet || pet.bond < 30) return fail('占領需要羈絆 30 以上的出戰夥伴守護領地。');
  if (!pay(s, CLAIM_COST)) return fail('插旗需要 木材 20 / 金屬 12 / 纖維 8 / 異晶 5。');
  s.occupied.push(id);
  return { ok: true, message: i.name + ' 已占領！御獸平時會在這座島上休息恢復。' };
}
// Idle beasts rest on the first claimed island; lounge beasts travel with the ship.
export function restIsland(s) {
  return ISLANDS.find(i => i.id === s.occupied?.[0]);
}
export function restPlace(s, pet) {
  if (s.ship?.lounge.includes(pet.id)) return 'lounge';
  return restIsland(s) ? 'island' : 'pen';
}
// ---------- build menu helpers ----------
export function limitError(s, type) {
  if (LIMITS[type] && count(s, type) >= LIMITS[type])
    return `避難所上限：${LIMIT_NAMES[type]}最多 ${LIMITS[type]} 座。`;
  if (type === 'dock' && !(s.occupied || []).length) return '先占領至少一座島嶼，才能建造停靠站。';
  return null;
}
export function fusionChecks(s) {
  const e = s.expedition || {};
  return [
    ['地基達上限 ' + Math.min(count(s, 'floor'), 20) + ' / 20', count(s, 'floor') >= LIMITS.floor],
    ['展示池達上限 ' + Math.min(count(s, 'pen'), 5) + ' / 5', count(s, 'pen') >= LIMITS.pen],
    ['占領島嶼 ' + (s.occupied || []).length + ' / 1', (s.occupied || []).length >= 1],
    ['建造船隻停靠站', count(s, 'dock') >= 1],
    ['帆布避難所', count(s, 'shelter') >= 1],
    ['小艇升至 LV 3（目前 LV ' + (e.boatLevel || 0) + '）', (e.boatLevel || 0) >= 3]
  ];
}
export const warshipRevealed = s => (s.occupied || []).length > 0 || count(s, 'dock') > 0 || !!s.ship || !!s.shipFusion;
export function dockMoor(s) {
  const d = s.buildings.find(b => b.type === 'dock');
  if (!d) return null;
  const cx = d.x * 3.6,
    cz = d.z * 3.6;
  let dx = cx - HOME.x,
    dz = cz - HOME.z;
  const L = Math.hypot(dx, dz) || 1;
  dx /= L;
  dz /= L;
  const heading = Math.atan2(dx, dz) + Math.PI / 2;
  for (let r = 7; r < 60; r += 1) {
    const x = cx + dx * r,
      z = cz + dz * r;
    if (!shipBlocked(s, x, z, heading)) return { x, z, heading, dockX: cx, dockZ: cz };
  }
  return { x: cx + dx * 30, z: cz + dz * 30, heading: Math.atan2(dx, dz) + Math.PI / 2, dockX: cx, dockZ: cz };
}
export function startFusion(s) {
  normalizeShip(s);
  if (s.ship) return fail('戰艦已經完成。');
  if (s.shipFusion) return fail('融合工程進行中。');
  const missing = fusionChecks(s).filter(([, ok]) => !ok);
  if (missing.length) return fail('尚未達成：' + missing.map(([n]) => n).join('、'));
  if (s.player.mode !== 'foot' || dist(s.player, HOME) > 27)
    return fail('請登上避難所，讓小艇停泊在木筏旁再開始融合。');
  if (!pay(s, FUSION_COST)) return fail('融合材料不足。');
  s.shipFusion = { readyAt: s.elapsed + FUSION_TIME, duration: FUSION_TIME };
  return { ok: true, message: '避難所與小艇開始融合！工程需要 ' + FUSION_TIME + ' 秒，期間小艇無法出航。' };
}
export function tickShip(s) {
  normalizeShip(s);
  const events = [];
  if (s.shipFusion && s.elapsed >= s.shipFusion.readyAt) {
    const m = dockMoor(s) || { x: s.boat.x + 8, z: s.boat.z, heading: 0 };
    s.ship = { x: m.x, z: m.z, heading: m.heading, cargo: {}, lounge: [], lastCannon: -999 };
    delete s.shipFusion;
    if (s.player.mode === 'boat') {
      Object.assign(s.player, { mode: 'aboard', deck: 3, lx: 2.6, lz: 1 });
    }
    normalizeShip(s);
    events.push('fusion');
  }
  if (s.ship) {
    if (s.player.mode === 'aboard') syncAboard(s);
    if (!s.expedition?.mounted || s.player.mode !== 'ship')
      s.boat = { x: s.ship.x, z: s.ship.z, heading: s.ship.heading };
  }
  return events;
}
// ---------- movement ----------
function pointBlocked(s, x, z, r) {
  if (islandAt(x, z, r * 0.6)) return true;
  return s.buildings.some(
    b => ['floor', 'pen', 'dock'].includes(b.type) && Math.hypot(x - b.x * 3.6, z - b.z * 3.6) < r + 2.2
  );
}
// The hull is checked at bow, midship and stern so a 30 m ship cannot plough into land.
export function shipBlocked(s, x, z, heading = s.ship?.heading) {
  if (pointBlocked(s, x, z, 4)) return true;
  if (heading === undefined) return false;
  const fx = Math.sin(heading),
    fz = Math.cos(heading);
  return pointBlocked(s, x + fx * 11, z + fz * 11, 2.2) || pointBlocked(s, x - fx * 11, z - fz * 11, 2.6);
}
export function moveAboard(s, dx, dz) {
  const c = Math.cos(s.ship.heading),
    n = Math.sin(s.ship.heading),
    ldx = dx * c - dz * n,
    ldz = dx * n + dz * c,
    steps = Math.max(1, Math.ceil(Math.hypot(ldx, ldz) / 0.15));
  for (let i = 0; i < steps; i++) {
    if (deckWalk(s.player.deck, s.player.lx + ldx / steps, s.player.lz)) s.player.lx += ldx / steps;
    if (deckWalk(s.player.deck, s.player.lx, s.player.lz + ldz / steps)) s.player.lz += ldz / steps;
  }
  syncAboard(s);
}
export function moveShip(s, dx, dz) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  for (let i = 0; i < steps; i++) {
    const nx = s.ship.x + dx / steps,
      nz = s.ship.z + dz / steps;
    const blockedNow = shipBlocked(s, s.ship.x, s.ship.z);
    if (
      !shipBlocked(s, nx, s.ship.z) ||
      (blockedNow && nearestGap(s, nx, s.ship.z) > nearestGap(s, s.ship.x, s.ship.z))
    )
      s.ship.x = nx;
    if (
      !shipBlocked(s, s.ship.x, nz) ||
      (blockedNow && nearestGap(s, s.ship.x, nz) > nearestGap(s, s.ship.x, s.ship.z))
    )
      s.ship.z = nz;
  }
  Object.assign(s.player, { x: s.ship.x, z: s.ship.z });
  s.boat = { x: s.ship.x, z: s.ship.z, heading: s.ship.heading };
}
function nearestGap(s, x, z) {
  let d = 1e9;
  const h = s.ship.heading,
    pts = [
      [x, z],
      [x + Math.sin(h) * 11, z + Math.cos(h) * 11],
      [x - Math.sin(h) * 11, z - Math.cos(h) * 11]
    ];
  for (const [px, pz] of pts) {
    for (const b of s.buildings)
      if (['floor', 'pen', 'dock'].includes(b.type)) d = Math.min(d, Math.hypot(px - b.x * 3.6, pz - b.z * 3.6));
  }
  return d;
}
// ---------- boarding ----------
export function nearShip(s, pad = 5) {
  if (!s.ship) return false;
  const l = toLocal(s.ship, s.player.x, s.player.z);
  return Math.abs(l.lz) < SHIP_LEN / 2 + pad && Math.abs(l.lx) < hullHalfBeam(Math.max(-15, Math.min(15, l.lz))) + pad;
}
export function shoreSpot(s) {
  if (!s.ship) return null;
  const moor = dockMoor(s);
  if (moor && dist(moor, s.ship) < 16) {
    const floors = s.buildings
      .filter(b => b.type === 'floor')
      .map(b => ({ x: b.x * 3.6, z: b.z * 3.6 }))
      .sort((a, b) => Math.hypot(a.x - moor.dockX, a.z - moor.dockZ) - Math.hypot(b.x - moor.dockX, b.z - moor.dockZ));
    if (floors[0]) return { foot: floors[0], name: '避難所停靠站' };
  }
  const near = islandDocks()
    .map(d => ({ ...d, d: dist(d.boat, s.ship) }))
    .sort((a, b) => a.d - b.d)[0];
  if (near && near.d < 19) return { foot: near.foot, name: near.name, island: near.island };
  return null;
}
export function shipDockOption(s) {
  if (!s.ship) return null;
  const m = s.player.mode;
  if (m === 'foot') {
    const near = !s.player.level && !s.inCave && nearShip(s, 6);
    return {
      mode: 'board-ship',
      near,
      label: near ? '登上戰艦' : '返回戰艦',
      detail: near ? '從舷梯進入主甲板' : '戰艦停在遠處'
    };
  }
  if (m === 'ship') return { mode: 'leave-helm', near: true, label: '離開舵輪', detail: '在駕駛室內自由走動' };
  if (m === 'aboard') {
    const g = SHIP_POINTS.find(p => p.id === 'gangway');
    const atGang = s.player.deck === 3 && Math.hypot(s.player.lx - g.lx, s.player.lz - g.lz) < 3;
    const spot = shoreSpot(s);
    return {
      mode: 'disembark',
      near: atGang && !!spot,
      label: spot ? '下船 · ' + spot.name : '無法下船',
      detail: atGang ? (spot ? '走下舷梯' : '先駕駛靠近停靠站或島岸') : '到主甲板舷梯處下船'
    };
  }
  return null;
}
export function boardShip(s) {
  if (!s.ship) return fail('尚未擁有戰艦。');
  if (s.player.mode !== 'foot' || !nearShip(s, 6)) return fail('請走近停泊的戰艦。');
  Object.assign(s.player, { mode: 'aboard', deck: 3, lx: 2.6, lz: 1, level: 0 });
  syncAboard(s);
  return { ok: true, message: '已登上戰艦主甲板。前往船尾駕駛室才可以掌舵。' };
}
export function disembark(s) {
  const o = shipDockOption(s);
  if (!o || o.mode !== 'disembark') return fail('請在船上使用。');
  if (!o.near) return fail(o.detail);
  const spot = shoreSpot(s);
  Object.assign(s.player, { mode: 'foot', x: spot.foot.x, z: spot.foot.z, level: 0 });
  return { ok: true, message: '已下船：' + spot.name + '。', island: spot.island };
}
export function takeHelm(s) {
  if (s.player.mode !== 'aboard' || s.player.deck !== 4) return fail('必須在駕駛室才能駕駛戰艦。');
  const h = SHIP_POINTS.find(p => p.id === 'helm');
  if (Math.hypot(s.player.lx - h.lx, s.player.lz - h.lz) > 2.5) return fail('走到舵輪前才能掌舵。');
  Object.assign(s.player, { mode: 'ship', x: s.ship.x, z: s.ship.z, heading: s.ship.heading });
  return { ok: true, message: '掌舵中：WASD 航行，按空白鍵發射艦砲，按 Q 離開舵輪。' };
}
export function leaveHelm(s) {
  if (s.player.mode !== 'ship') return fail('目前沒有掌舵。');
  if (s.expedition?.mounted) return fail('請先解除騎乘。');
  Object.assign(s.player, { mode: 'aboard', deck: 4, lx: 0, lz: -9.4 });
  syncAboard(s);
  return { ok: true, message: '已離開舵輪。' };
}
export function climbShip(s, id) {
  if (s.player.mode !== 'aboard') return fail('請在船內使用樓梯。');
  const p = SHIP_POINTS.find(v => v.id === id);
  if (!p || p.deck !== s.player.deck) return fail('樓梯不在這一層。');
  if (Math.hypot(s.player.lx - p.lx, s.player.lz - p.lz) > 2.6) return fail('走近樓梯。');
  let deck, lx, lz;
  if (id === 'to-bridge') {
    deck = 4;
    lx = 0;
    lz = -7.6;
  } else if (id === 'from-bridge') {
    deck = 3;
    lx = 0;
    lz = -3.4;
  } else if (id.startsWith('up-')) {
    deck = p.deck + 1;
    lx = 1.1;
    lz = 3.4;
  } else {
    deck = p.deck - 1;
    lx = -1.1;
    lz = 3.4;
  }
  Object.assign(s.player, { deck, lx, lz });
  syncAboard(s);
  return { ok: true, message: '抵達 ' + DECKS[deck].name + '。' };
}
// ---------- cargo & lounge ----------
export function cargoTotal(s) {
  return Object.values(s.ship?.cargo || {}).reduce((a, b) => a + b, 0);
}
export function transferCargo(s, kind, amount) {
  if (!s.ship) return fail('沒有戰艦。');
  if (s.player.mode !== 'aboard') return fail('請在貨艙內操作。');
  const deck = DECKS[s.player.deck];
  if (!deck.cargo?.includes(kind)) return fail('這項物資存放在另一層貨艙。');
  const c = s.ship.cargo;
  if (amount > 0) {
    const n = Math.min(amount, s.resources[kind], CARGO_CAPACITY - cargoTotal(s));
    if (n <= 0)
      return fail(cargoTotal(s) >= CARGO_CAPACITY ? '貨艙已滿（上限 ' + CARGO_CAPACITY + '）。' : '背包沒有這項物資。');
    s.resources[kind] -= n;
    c[kind] += n;
    return { ok: true, message: '存入 ' + n + '。' };
  }
  const n = Math.min(-amount, c[kind]);
  if (n <= 0) return fail('貨艙沒有這項物資。');
  c[kind] -= n;
  s.resources[kind] += n;
  return { ok: true, message: '取出 ' + n + '。' };
}
export function nearBeastHome(s) {
  if (!s.ship) return false;
  if (dist(s.ship, HOME) < 45) return true;
  return (s.occupied || []).some(id => {
    const i = ISLANDS.find(v => v.id === id);
    return i && dist(s.ship, i) < i.rx + 30;
  });
}
export function toggleLounge(s, petId) {
  if (!s.ship) return fail('沒有戰艦。');
  const p = s.tamed.find(t => t.id === petId);
  if (!p) return fail('找不到夥伴。');
  if (!nearBeastHome(s)) return fail('戰艦需停靠在占領島嶼或避難所附近，御獸才能上下船。');
  const L = s.ship.lounge;
  if (L.includes(petId)) {
    if (s.expedition?.activeId === petId && s.player.mode !== 'foot') return fail('出戰中的夥伴請先召回。');
    L.splice(L.indexOf(petId), 1);
    return { ok: true, message: p.name + ' 回到領地島嶼休息。' };
  }
  if (L.length >= LOUNGE_CAPACITY) return fail('休息室最多 ' + LOUNGE_CAPACITY + ' 隻。');
  L.push(petId);
  return { ok: true, message: p.name + ' 登船，進入御獸休息室。' };
}
export function canDeploy(s, pet) {
  if (!s.ship || !s.occupied?.length) return null;
  if (s.ship.lounge.includes(pet.id)) return null;
  if (nearBeastHome(s) || (s.player.mode === 'foot' && dist(s.player, HOME) < 40)) return null;
  const i = restIsland(s);
  if (i && dist(s.player, i) < i.rx + 40) return null;
  return pet.name + ' 正在' + (i?.name || '領地') + '休息；請讓牠登上戰艦休息室，或回到領地附近。';
}
// ---------- cannon ----------
export function fireCannon(s) {
  if (!s.ship || s.player.mode !== 'ship') return fail('需在駕駛室掌舵才能指揮艦砲。');
  const left = s.ship.lastCannon + CANNON.cooldown - s.elapsed;
  if (left > 0) return fail('艦砲裝填中 ' + Math.ceil(left) + ' 秒。');
  const b = s.expedition.boss;
  const target =
    !b.defeated && dist(s.ship, b) < CANNON.range
      ? b
      : s.wild
          .filter(w => w.hostile && dist(w, s.ship) < CANNON.range)
          .sort((a, c) => dist(a, s.ship) - dist(c, s.ship))[0];
  if (!target) return fail('射程 ' + CANNON.range + ' 公尺內沒有敵人。');
  if (!pay(s, CANNON.ammo)) return fail('砲彈需要 1 廢金屬。');
  s.ship.lastCannon = s.elapsed;
  s.ship.cannonFx = { x: target.x, z: target.z, at: s.elapsed };
  target.hp = (target.hp ?? 60) - CANNON.damage;
  if (target.hp <= 0) {
    if (target === b) {
      b.defeated = true;
      for (const [k, v] of Object.entries({ crystal: 12, metal: 15, food: 5 })) s.resources[k] += v;
      s.log.unshift({
        day: 1 + Math.floor(s.elapsed / 480),
        title: '深海守望者沉入海溝',
        text: '比斯泰德號的砲火與夥伴的勇氣，一同擊退了守望者。'
      });
      return { ok: true, message: '艦砲擊退深海守望者！異晶 +12、金屬 +15、口糧 +5。' };
    }
    s.wild = s.wild.filter(w => w !== target);
    s.resources.crystal += 1;
    s.resources.food += 2;
    return { ok: true, message: '艦砲擊退敵對生物。' };
  }
  return { ok: true, message: '命中！造成 ' + CANNON.damage + ' 傷害，敵人剩餘 ' + Math.ceil(target.hp) + '。' };
}
export function shipPointsWorld(s) {
  if (!s.ship || s.player.mode !== 'aboard') return [];
  return SHIP_POINTS.filter(p => p.deck === s.player.deck).map(p => ({
    ...toWorld(s.ship, p.lx, p.lz),
    id: 'ship:' + p.id,
    point: p.id,
    type: 'shippoint',
    name: p.name,
    verb: p.verb
  }));
}
