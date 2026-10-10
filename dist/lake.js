// The inland sea of 沉湖遺城: baked terrain lookups shared by rules, navigation and rendering.
// Game coordinates are metres with the raft at (0,0); map coordinates are the sketch's units.
import { HS, Q, ORIGIN, LAIR, FINE, COARSE } from './lake-data.js?v=0.17.0';
export { HS, ORIGIN };

function decode(g) {
  if (typeof atob === 'function') {
    const bin = atob(g.b64),
      bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Int16Array(bytes.buffer);
  }
  const buf = globalThis.Buffer.from(g.b64, 'base64');
  return new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
}
FINE.data = decode(FINE);
COARSE.data = decode(COARSE);

export const toGame = (mx, mz) => ({ x: (mx - ORIGIN.x) * HS, z: (mz - ORIGIN.z) * HS });
export const toMap = (x, z) => ({ mx: x / HS + ORIGIN.x, mz: z / HS + ORIGIN.z });
function sample(g, mx, mz) {
  const fx = (mx - g.x0) / g.step,
    fz = (mz - g.z0) / g.step;
  if (fx < 0 || fz < 0 || fx > g.nx - 1 || fz > g.nz - 1) return null;
  const ix = Math.min(g.nx - 2, Math.floor(fx)),
    iz = Math.min(g.nz - 2, Math.floor(fz)),
    tx = fx - ix,
    tz = fz - iz,
    d = g.data,
    i = iz * g.nx + ix;
  const a = d[i] + (d[i + 1] - d[i]) * tx,
    b = d[i + g.nx] + (d[i + g.nx + 1] - d[i + g.nx]) * tx;
  return (a + (b - a) * tz) / Q;
}
// Ground height in metres (water surface = 0). Beyond the baked basin the mountains simply continue.
export function groundAt(x, z) {
  const { mx, mz } = toMap(x, z);
  return sample(FINE, mx, mz) ?? sample(COARSE, mx, mz) ?? 400;
}
export function slopeAt(x, z, e = 1.5) {
  return Math.hypot(groundAt(x + e, z) - groundAt(x - e, z), groundAt(x, z + e) - groundAt(x, z - e)) / (2 * e);
}
export const isLand = (x, z, above = 0.4) => groundAt(x, z) > above;
// Walkable ground: dry, not a sheer cliff, and below the snowline ridges that wall the basin in.
export const walkable = (x, z) => {
  const h = groundAt(x, z);
  return h > 0.35 && h < 90 && slopeAt(x, z) < 1.6;
};

// The three claimable islands keep their old ids so saves (claims, harvests, visits) carry over.
const DEF = [
  { id: 'palm', name: '船屋島', mx: -50, mz: -4, rx: 15, rz: 10, tint: 0x749b67 },
  { id: 'crystal', name: '右岸半島', mx: 60, mz: 3, rx: 23, rz: 11, tint: 0x739da0 },
  { id: 'ruins', name: '中央遺跡島', mx: 0, mz: -16, rx: 22, rz: 13, tint: 0x839176 }
];
// Each island's anchor (claim stone, rest area) is snapped to a flat, dry spot near its sketch centre.
export const LAKE_ISLANDS = DEF.map(d => ({
  ...landNear(toGame(d.mx, d.mz).x, toGame(d.mx, d.mz).z, { min: 2, max: 60, maxSlope: 0.35, radius: 50 }),
  id: d.id,
  name: d.name,
  rx: d.rx * HS * 0.85,
  rz: d.rz * HS * 0.85,
  tint: d.tint
}));
export const REEFS = [
  [24, -30, 5, 3.4],
  [-20, -31, 4, 2.8],
  [-36, -19, 3.2, 2.4],
  [14, -4, 3, 2]
].map(([mx, mz, rx, rz]) => ({ ...toGame(mx, mz), rx: rx * HS, rz: rz * HS }));
// Nearest claimable island whose land you are standing on (undefined on the mainland, reefs or water).
export function islandOf(x, z) {
  let best,
    bd = 1.7;
  for (const i of LAKE_ISLANDS) {
    const d = Math.hypot((x - i.x) / i.rx, (z - i.z) / i.rz);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}
// Find dry land near a map point (for placing sites and nodes on real ground).
export function landNear(x, z, { min = 1, max = 40, maxSlope = 0.7, radius = 60 } = {}) {
  for (let r = 0; r <= radius; r += 1.5)
    for (let k = 0; k < Math.max(1, Math.round(r * 1.2)); k++) {
      const a = (k / Math.max(1, Math.round(r * 1.2))) * Math.PI * 2 + r,
        px = x + Math.sin(a) * r,
        pz = z + Math.cos(a) * r,
        h = groundAt(px, pz);
      if (h >= min && h <= max && slopeAt(px, pz) <= maxSlope) return { x: px, z: pz };
    }
  return { x, z };
}
export function waterNear(x, z, depth = 4, radius = 160) {
  for (let r = 0; r <= radius; r += 2)
    for (let k = 0; k < Math.max(1, Math.round(r * 0.8)); k++) {
      const a = (k / Math.max(1, Math.round(r * 0.8))) * Math.PI * 2,
        px = x + Math.sin(a) * r,
        pz = z + Math.cos(a) * r;
      if (groundAt(px, pz) < -depth) return { x: px, z: pz };
    }
  return { x: 0, z: 0 };
}
export const mapPoint = (mx, mz) => toGame(mx, mz);
export const LAKE_CENTER = toGame(0, 2);
export const BOSS_HOME = toGame(LAIR.x, LAIR.z);
// Landmarks of the sketch, in game coordinates (labels, story and sites hang off these).
export const LANDMARKS = {
  sunkTemple: { ...toGame(-24, 12), name: '沉沒神殿', under: true },
  eastTemple: { ...toGame(27, 9), name: '東神殿', under: true },
  greatGate: { ...toGame(0, 27), name: '大拱門', under: true },
  aqueduct: { ...toGame(28, 27), name: '水道拱橋', under: true },
  plaza: { ...toGame(0, 17), name: '沉城廣場', under: true },
  boathouse: { ...toGame(-50, -4), name: '船屋與舊船' },
  waterGate: { ...toGame(-75, 10), name: '舊水門' },
  coral: { ...toGame(62, 10), name: '珊瑚灘' },
  centralRuins: { ...toGame(0, -17), name: '中央遺跡' }
};
