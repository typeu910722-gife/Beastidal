import { stow, bagRoom, bagFullError } from './bag.js?v=0.15.0';
import {
  groundAt,
  slopeAt,
  walkable,
  LAKE_ISLANDS,
  LAKE_CENTER,
  islandOf,
  landNear,
  waterNear
} from './lake.js?v=0.15.0';
// 0.15: the world is the inland sea of 沉湖遺城. Islands are real terrain now; the old ids stay so saves carry over.
export const ISLANDS = LAKE_ISLANDS;
export const MAINLAND = { id: 'mainland', name: '環湖山麓', x: LAKE_CENTER.x, z: LAKE_CENTER.z, rx: 400, rz: 260 };
export { islandOf };
// Land or water too shallow for a hull (margin widens the berth). Returns the island, or the mainland shore.
export const islandAt = (x, z, margin = 0) =>
  groundAt(x, z) > -0.8 - margin * 0.6 ? islandOf(x, z) || MAINLAND : undefined;
// The claimable island you are standing on.
export const onIsland = (x, z) => (groundAt(x, z) > 0.35 ? islandOf(x, z) : undefined);
export const onLand = (x, z) => walkable(x, z);
// Landing spots: walk rays out from each island (and from the lake centre to the basin shore) until the
// water is deep enough for the boat; the last dry step is where you step ashore.
let docks = null;
function shoreRay(cx, cz, a, from, to) {
  const dx = Math.sin(a),
    dz = Math.cos(a);
  let foot = null;
  for (let r = from; r < to; r += 1) {
    const x = cx + dx * r,
      z = cz + dz * r;
    if (walkable(x, z)) foot = { x, z };
    else if (foot && groundAt(x, z) < -1.6) {
      if (Math.hypot(x - foot.x, z - foot.z) > 14) return null;
      return { foot, boat: { x: x + dx * 2.5, z: z + dz * 2.5, heading: a } };
    }
  }
  return null;
}
export function islandDocks() {
  if (docks) return docks;
  docks = [];
  for (const i of ISLANDS)
    for (let n = 0; n < 32; n++) {
      const s = shoreRay(i.x, i.z, (n / 32) * Math.PI * 2, 0, Math.max(i.rx, i.rz) * 1.8);
      if (s) docks.push({ island: i.id, name: i.name, ...s });
    }
  // the mountain shore all round the basin: rays from the lake centre, inward-facing landings
  for (let n = 0; n < 72; n++) {
    const a = (n / 72) * Math.PI * 2,
      dx = Math.sin(a),
      dz = Math.cos(a);
    let wet = null;
    for (let r = 20; r < 760; r += 1.5) {
      const x = LAKE_CENTER.x + dx * r,
        z = LAKE_CENTER.z + dz * r,
        h = groundAt(x, z);
      if (h < -1.6) wet = { x, z };
      else if (wet && walkable(x, z)) {
        if (islandOf(x, z) && groundAt(x, z) > 0) break; // that is an island, not the basin shore
        if (Math.hypot(x - wet.x, z - wet.z) < 14)
          docks.push({
            island: 'mainland',
            name: MAINLAND.name,
            foot: { x, z },
            boat: { ...wet, heading: a + Math.PI }
          });
        break;
      }
    }
  }
  return docks;
}
const OFFSETS = [
  ['wood', -3, 2],
  ['fiber', 3, 2],
  ['food', 0, 4],
  ['crystal', 2, -3],
  ['metal', -3, -2]
];
export const NODES = ISLANDS.flatMap((i, k) =>
  OFFSETS.map(([kind, dx, dz]) => {
    const at = landNear(i.x + dx * 9, i.z + dz * 9, { min: 1.5, max: 45, maxSlope: 0.55 });
    return {
      id: i.id + '-' + kind,
      type: 'node',
      island: i.id,
      kind,
      x: at.x,
      z: at.z,
      name: { wood: '漂木堆', fiber: '海岸纖維', food: '海椰果', crystal: '異晶礦簇', metal: '遺跡零件' }[kind],
      yield: kind === 'crystal' ? (k === 1 ? 3 : 1) : kind === 'metal' ? (k === 2 ? 5 : 2) : 4
    };
  })
);
export function harvest(s, id) {
  const n = NODES.find(n => n.id === id);
  if (!n) return { ok: false, error: '找不到採集點。' };
  if (s.player.mode !== 'foot' || Math.hypot(s.player.x - n.x, s.player.z - n.z) > 4)
    return { ok: false, error: '請登島並走近至 4 公尺內採集。' };
  s.harvested ??= {};
  const remaining = (s.harvested[id] ?? -1) - s.elapsed;
  if (remaining > 0) return { ok: false, error: `此處正在恢復，還需 ${Math.ceil(remaining)} 秒。` };
  if (!bagRoom(s)) return { ok: false, error: bagFullError, full: true };
  stow(s, { [n.kind]: n.yield });
  s.harvested[id] = s.elapsed + 120;
  return { ok: true, node: n };
}
// Drift items and sea creatures that sit on land or in the shallows move out to open water.
export function clearLand(s) {
  for (const a of [...s.loot, ...s.wild]) {
    if (a.island || a.follow || a.rescue) continue; // land beasts belong ashore; followers trail you
    if (!islandAt(a.x, a.z, 2)) continue;
    const w = waterNear(a.x, a.z, 4);
    a.x = w.x;
    a.z = w.z;
    if ('homeX' in a) {
      a.homeX = a.x;
      a.homeZ = a.z;
    }
  }
}
export { groundAt, slopeAt };
