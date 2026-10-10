// Bakes the 沉湖遺城 (Sunken Lake City) terrain into dist/lake-data.js.
// The height function is a verbatim port of the author's map sketch (1 map unit = 10 m in the sketch);
// the game uses it at HS metres per unit. Baking keeps the full resolution while sparing every device
// from re-evaluating several hundred thousand noise samples at start-up.
import { writeFileSync } from 'node:fs';

function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vn(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz,
    ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz),
    b = hash(ix + 1, iz),
    c = hash(ix, iz + 1),
    d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x, z, o = 6) {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let i = 0; i < o; i++) {
    s += a * vn(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
function ridge(x, z, o = 5) {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let i = 0; i < o; i++) {
    s += a * (1 - Math.abs(vn(x * f, z * f) * 2 - 1));
    f *= 2.1;
    a *= 0.5;
  }
  return s;
}
const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const DEPTH = 46;
export const MAP_ISLANDS = [
  { cx: 0, cz: -16, rx: 22, rz: 13, top: 2.4, hill: 3.2, seed: 1 },
  { cx: -50, cz: -4, rx: 15, rz: 10, top: 2.0, hill: 1.2, seed: 2 },
  { cx: 60, cz: 3, rx: 23, rz: 11, top: 1.9, hill: 6.0, seed: 3 },
  { cx: 24, cz: -30, rx: 5, rz: 3.4, top: 1.6, hill: 0.9, seed: 4 },
  { cx: -20, cz: -31, rx: 4, rz: 2.8, top: 1.5, hill: 0.6, seed: 5 },
  { cx: -36, cz: -19, rx: 3.2, rz: 2.4, top: 1.3, hill: 0.4, seed: 6 },
  { cx: 14, cz: -4, rx: 3, rz: 2, top: 1.2, hill: 0.3, seed: 7 }
];
function islandField(x, z, I) {
  const wx = x + (fbm(x * 0.05 + I.seed * 13, z * 0.05) - 0.5) * I.rx * 0.9,
    wz = z + (fbm(x * 0.05, z * 0.05 + I.seed * 7) - 0.5) * I.rz * 0.9;
  let d = Math.hypot((wx - I.cx) / I.rx, (wz - I.cz) / I.rz);
  d *= 1 + 0.5 * (fbm(x * 0.11 + I.seed, z * 0.11 + I.seed * 3, 4) - 0.5) + 0.25 * (ridge(x * 0.3, z * 0.3, 3) - 0.5);
  return d;
}
export function H(x, z) {
  const wx = x + (fbm(x * 0.022, z * 0.022 + 5) - 0.5) * 28,
    wz = z + (fbm(x * 0.022 + 9, z * 0.022) - 0.5) * 22;
  const r = Math.hypot(wx / 80, wz / 46) * (1 + 0.12 * (fbm(x * 0.06, z * 0.06, 4) - 0.5));
  let h;
  if (r < 1) {
    const inner = 0.6 + 0.22 * fbm(x * 0.03 + 2, z * 0.03, 3);
    const t = ss(1, inner, r);
    h =
      1.2 -
      (DEPTH + 1.2) * t +
      (fbm(x * 0.08, z * 0.08) - 0.5) * 3 * t +
      (ridge(x * 0.05, z * 0.05, 3) - 0.5) * 4 * t * t;
  } else {
    const m = ss(1, 1.5, r);
    h =
      1.2 +
      2.4 * ss(1, 1.05, r) +
      m * (22 + 36 * fbm(x * 0.018 + 3, z * 0.018)) +
      m * m * 22 * ridge(x * 0.03, z * 0.03) +
      m * 5 * ridge(x * 0.09, z * 0.09, 4) +
      m * 1.2 * fbm(x * 0.3, z * 0.3, 3);
  }
  for (const I of MAP_ISLANDS) {
    const d = islandField(x, z, I),
      t = ss(1, 0.55, d);
    if (t <= 0) continue;
    const target =
      I.top +
      (fbm(x * 0.25 + I.seed, z * 0.25) - 0.5) * 1.4 +
      I.hill * ss(0.6, 0, d) * (0.6 + 0.8 * ridge(x * 0.07 + I.seed, z * 0.07, 3)) +
      (ridge(x * 0.4, z * 0.4, 2) - 0.5) * 0.6;
    h += (target - h) * t;
  }
  return h;
}

const HS = 5; // metres per map unit in the game (sketch: 10 m) -> ~1.2 x 0.75 km basin
const Q = 20; // int16 = metres * Q (5 cm steps)
function grid(x0, z0, step, nx, nz) {
  const a = new Int16Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) a[j * nx + i] = Math.round(H(x0 + i * step, z0 + j * step) * HS * Q);
  return a;
}
const fine = { x0: -120, z0: -75, step: 0.5, nx: 481, nz: 301 };
const coarse = { x0: -220, z0: -150, step: 2, nx: 221, nz: 151 };
const t0 = Date.now();
fine.data = grid(fine.x0, fine.z0, fine.step, fine.nx, fine.nz);
coarse.data = grid(coarse.x0, coarse.z0, coarse.step, coarse.nx, coarse.nz);

// Raft origin: open, deep water between the boathouse island and the central ruins, clear for ~45 m.
function clearRadius(mx, mz) {
  for (let r = 0.5; r < 14; r += 0.5)
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      if (H(mx + Math.sin(a) * r, mz + Math.cos(a) * r) > -2) return r;
    }
  return 14;
}
let best = null;
for (let mx = -40; mx <= -14; mx += 1)
  for (let mz = -12; mz <= 10; mz += 1) {
    if (H(mx, mz) > -12) continue;
    const r = clearRadius(mx, mz);
    if (r < 9) continue;
    const score = Math.hypot(mx + 28, mz + 2) - r * 0.4;
    if (!best || score < best.score) best = { mx, mz, r, score };
  }
// Watcher's lair: the deepest open water east of the ruins.
let lair = null;
for (let mx = 10; mx <= 40; mx += 1)
  for (let mz = -10; mz <= 20; mz += 1) {
    const h = H(mx, mz),
      r = clearRadius(mx, mz);
    if (r < 8) continue;
    if (!lair || h < lair.h) lair = { mx, mz, h };
  }
const enc = a => Buffer.from(a.buffer).toString('base64');
const out = `// Generated by scripts/bake-lake.mjs — do not edit by hand.
export const HS = ${HS}, Q = ${Q};
export const ORIGIN = { x: ${best.mx}, z: ${best.mz} }; // map point under the raft (game 0,0)
export const LAIR = { x: ${lair.mx}, z: ${lair.mz} };
export const FINE = { x0: ${fine.x0}, z0: ${fine.z0}, step: ${fine.step}, nx: ${fine.nx}, nz: ${fine.nz}, b64: '${enc(fine.data)}' };
export const COARSE = { x0: ${coarse.x0}, z0: ${coarse.z0}, step: ${coarse.step}, nx: ${coarse.nx}, nz: ${coarse.nz}, b64: '${enc(coarse.data)}' };
`;
writeFileSync(new URL('../dist/lake-data.js', import.meta.url), out);
console.log(
  'baked in',
  Date.now() - t0,
  'ms; origin',
  best,
  'lair',
  lair,
  'size',
  (out.length / 1024).toFixed(0),
  'KB'
);
