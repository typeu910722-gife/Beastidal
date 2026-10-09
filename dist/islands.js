import { stow, bagRoom, bagFullError } from './bag.js?v=0.13.0';
// Stable coordinates keep existing saves compatible with the new archipelago.
export const ISLANDS = [
  { id: 'palm', name: '棕櫚環礁', x: 53, z: 32, rx: 11, rz: 9, tint: 0x749b67 },
  { id: 'crystal', name: '異晶礁島', x: -61, z: -38, rx: 10, rz: 12, tint: 0x739da0 },
  { id: 'ruins', name: '沉城遺島', x: 34, z: -79, rx: 13, rz: 10, tint: 0x839176 }
];
export const islandAt = (x, z, margin = 0) =>
  ISLANDS.find(i => Math.hypot((x - i.x) / (i.rx + margin), (z - i.z) / (i.rz + margin)) < 1);
export const onIsland = (x, z) => ISLANDS.find(i => Math.hypot((x - i.x) / i.rx, (z - i.z) / i.rz) < 0.83);
export function islandDocks() {
  return ISLANDS.flatMap(i =>
    Array.from({ length: 16 }, (_, n) => {
      const a = (n * Math.PI) / 8;
      return {
        island: i.id,
        name: i.name,
        foot: { x: i.x + Math.sin(a) * i.rx * 0.76, z: i.z + Math.cos(a) * i.rz * 0.76 },
        boat: { x: i.x + Math.sin(a) * (i.rx + 3), z: i.z + Math.cos(a) * (i.rz + 3), heading: a }
      };
    })
  );
}
export const NODES = ISLANDS.flatMap((i, k) =>
  [
    ['wood', -3, 2],
    ['fiber', 3, 2],
    ['food', 0, 4],
    ['crystal', 2, -3],
    ['metal', -3, -2]
  ].map(([kind, dx, dz], n) => ({
    id: i.id + '-' + kind,
    type: 'node',
    island: i.id,
    kind,
    x: i.x + dx,
    z: i.z + dz,
    name: { wood: '漂木堆', fiber: '海岸纖維', food: '海椰果', crystal: '異晶礦簇', metal: '遺跡零件' }[kind],
    yield: kind === 'crystal' ? (k === 1 ? 3 : 1) : kind === 'metal' ? (k === 2 ? 5 : 2) : 4
  }))
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
// Relocate pre-existing drift items that would otherwise be buried beneath new land.
export function clearLand(s) {
  for (const a of [...s.loot, ...s.wild]) {
    if (a.island) continue; // land beasts belong on their island
    const i = islandAt(a.x, a.z, 2);
    if (!i) continue;
    const theta = Math.atan2(a.x - i.x, a.z - i.z);
    a.x = i.x + Math.sin(theta) * (i.rx + 5);
    a.z = i.z + Math.cos(theta) * (i.rz + 5);
    if ('homeX' in a) {
      a.homeX = a.x;
      a.homeZ = a.z;
    }
  }
}
