// The expensive, deterministic part of building the lake — vertex colours, the grain texture and where every tree,
// rock, reed and kelp stand — as plain arrays. Runs in a Web Worker (lake-worker.js) so start-up never freezes;
// falls back to the main thread where workers are unavailable. Same sketch noise and colour rules as before,
// computed in three.js's linear working colour space so the result matches what the renderer used to build.
import { HS, ORIGIN, groundAt } from './lake.js?v=0.19.0';
import { FINE, COARSE, Q } from './lake-data.js?v=0.19.0';

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
const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// ---------- colour in three.js's linear working space ----------
const lin = c => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));
const hex = h => [lin(((h >> 16) & 255) / 255), lin(((h >> 8) & 255) / 255), lin((h & 255) / 255)];
const lerp = (c, d, t) => {
  c[0] += (d[0] - c[0]) * t;
  c[1] += (d[1] - c[1]) * t;
  c[2] += (d[2] - c[2]) * t;
  return c;
};
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}
function setHSL(c, h, s, l) {
  h = ((h % 1) + 1) % 1;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  if (s === 0) c[0] = c[1] = c[2] = l;
  else {
    const p = l <= 0.5 ? l * (1 + s) : l + s - l * s,
      q = 2 * l - p;
    c[0] = hue2rgb(q, p, h + 1 / 3);
    c[1] = hue2rgb(q, p, h);
    c[2] = hue2rgb(q, p, h - 1 / 3);
  }
  return c;
}
function offsetL(c, dl) {
  const [r, g, b] = c,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (min + max) / 2;
  if (min !== max) {
    const d = max - min;
    s = l <= 0.5 ? d / (max + min) : d / (2 - max - min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return setHSL(c, h, s, l + dl);
}
const P = {
  sand: hex(0xc9b58d),
  wet: hex(0x8d7d5c),
  pebble: hex(0x9a9484),
  mud: hex(0x2f3d3a),
  silt: hex(0x7f7c60),
  grass: hex(0x6a9140),
  meadow: hex(0x98a548),
  forest: hex(0x2d552a),
  rock: hex(0x7a7268),
  cliff: hex(0x5a5450),
  scree: hex(0x9a948a),
  snow: hex(0xf2f5f7),
  moss: hex(0x4e6a30)
};
const set = (c, d) => ((c[0] = d[0]), (c[1] = d[1]), (c[2] = d[2]), c);
// The sketch's colour rule, map units (h) with slope = 1 - normal.y.
function terrainColor(c, mx, mz, h, slope) {
  const n = fbm(mx * 0.3, mz * 0.3, 4) - 0.5,
    moist = fbm(mx * 0.04 + 11, mz * 0.04, 3);
  if (h < -1.2) lerp(lerp(set(c, P.silt), P.mud, ss(-3, -32, h)), P.rock, ss(0.3, 0.5, slope) * 0.7);
  else if (h < 1.0) lerp(set(c, P.wet), P.pebble, ss(0.3, 0.9, hash(mx * 3, mz * 3)));
  else if (h < 2.1) lerp(set(c, P.sand), P.pebble, ss(0.2, 0.6, n + 0.5));
  else {
    set(c, P.grass);
    lerp(c, P.meadow, ss(0.6, 0.35, moist) * ss(8, 2, h));
    lerp(c, P.forest, ss(4, 20, h) + n * 0.5);
    lerp(c, P.moss, ss(0.55, 0.7, moist) * 0.4);
    const rock = Math.min(1, ss(0.26, 0.42, slope) + ss(32, 42, h));
    lerp(c, P.rock, rock);
    lerp(c, P.cliff, ss(0.42, 0.6, slope));
    lerp(c, P.scree, rock * ss(0.2, 0.0, slope) * ss(28, 40, h) * 0.6);
    if (h > 50) lerp(c, P.snow, ss(50, 60, h) * (1 - ss(0.45, 0.7, slope)));
  }
  return offsetL(c, n * 0.14);
}
function gridColors(g) {
  const { nx, nz, data, step } = g,
    out = new Float32Array(nx * nz * 3),
    cell = step * HS,
    c = [0, 0, 0];
  const at = (i, j) => data[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))] / Q;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      // grid normal from central differences (what computeVertexNormals averages to on a regular grid)
      const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * cell),
        dz = (at(i, j + 1) - at(i, j - 1)) / (2 * cell),
        ny = 1 / Math.hypot(dx, 1, dz),
        v = j * nx + i;
      terrainColor(c, g.x0 + i * step, g.z0 + j * step, data[v] / Q / HS, 1 - ny);
      out[v * 3] = c[0];
      out[v * 3 + 1] = c[1];
      out[v * 3 + 2] = c[2];
    }
  return out;
}
function grain(size = 512) {
  const d = new Uint8Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      let s = 0,
        a = 0.5,
        f = 8;
      for (let i = 0; i < 5; i++) {
        s += a * vn(u * f + i * 3, v * f + i * 7);
        f *= 2;
        a *= 0.5;
      }
      d[y * size + x] = Math.max(0, Math.min(255, 150 + 120 * (s - 0.5) * 1.5));
    }
  return d;
}
const Hm = (mx, mz) => groundAt((mx - ORIGIN.x) * HS, (mz - ORIGIN.z) * HS) / HS;
const slopeM = (mx, mz) => {
  const e = 0.7;
  return Math.hypot(Hm(mx + e, mz) - Hm(mx - e, mz), Hm(mx, mz + e) - Hm(mx, mz - e)) / (2 * e);
};
const gx = mx => (mx - ORIGIN.x) * HS,
  gz = mz => (mz - ORIGIN.z) * HS;
// Sizes relative to the sketch's units (see lake-models.js).
export const VEG = {
  conifers: { variants: 3, cap: 3000, k: 2.6 },
  leafs: { variants: 3, cap: 2000, k: 2.6 },
  deads: { variants: 2, cap: 300, k: 2.6 },
  rocks: { variants: 4, cap: 900, k: 3 },
  reeds: { variants: 1, cap: 1500, k: 1.4 },
  kelps: { variants: 1, cap: 500, k: 3 }
};
const STRIDE = 13; // variant, x, y, z, sx, sy, sz, rx, ry, rz, r, g, b
function vegetation(clearings) {
  const lists = Object.fromEntries(Object.keys(VEG).map(k => [k, []])),
    counts = Object.fromEntries(Object.keys(VEG).map(k => [k, new Array(VEG[k].variants).fill(0)]));
  const cleared = (x, z) => clearings.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < r * r);
  const col = [0, 0, 0];
  function add(fam, mx, h, mz, sx, sy, sz, ry, tx, tz) {
    const v = VEG[fam],
      variant = Math.floor(hash(mx * 1.7, mz * 2.3) * v.variants);
    if (counts[fam][variant] >= v.cap) return;
    counts[fam][variant]++;
    lists[fam].push(variant, gx(mx), h * HS, gz(mz), sx * v.k, sy * v.k, sz * v.k, tx, ry, tz, col[0], col[1], col[2]);
  }
  const SX = 240,
    SZ = 150;
  for (let k = 0; k < 90000; k++) {
    const mx = (hash(k, 1.3) - 0.5) * SX,
      mz = (hash(k, 7.9) - 0.5) * SZ,
      h = Hm(mx, mz);
    const r1 = hash(k, 3.1),
      r2 = hash(k, 5.5),
      r3 = hash(k, 9.2);
    const sl = slopeM(mx, mz),
      moist = fbm(mx * 0.04 + 11, mz * 0.04, 3),
      cluster = fbm(mx * 0.07 + 4, mz * 0.07 + 1, 3);
    if (h < -3) {
      if (h < -10 && r1 < 0.012 && sl < 0.6) {
        setHSL(col, 0.33 + r2 * 0.06, 0.35, 0.14 + r3 * 0.08);
        add(
          'kelps',
          mx,
          h - 0.3 / HS,
          mz,
          0.8 + r2 * 0.6,
          0.7 + r3 * 0.8,
          0.8 + r2 * 0.6,
          r3 * 6.28,
          (r1 - 0.5) * 0.3,
          (r2 - 0.5) * 0.3
        );
        continue;
      }
      if (r1 < 0.004) {
        const s = 0.6 + r2 * 2.2;
        setHSL(col, 0.45, 0.12, 0.18 + r2 * 0.1);
        add(
          'rocks',
          mx,
          h - (s * 0.3 * VEG.rocks.k) / HS,
          mz,
          s * (0.7 + r3 * 0.6),
          s * (0.5 + r1 * 0.8),
          s,
          r3 * 6.28,
          0,
          0
        );
      }
      continue;
    }
    if (h > 0.6 && h < 2.0 && sl < 0.35 && r1 < 0.09) {
      setHSL(col, 0.2 + r2 * 0.05, 0.45, 0.28 + r3 * 0.1);
      add('reeds', mx, h - 0.1 / HS, mz, 0.7 + r2 * 0.5, 0.8 + r3 * 0.6, 0.7 + r2 * 0.5, r3 * 6.28, 0, 0);
      continue;
    }
    if (h > -1 && (sl > 0.55 || (h > 28 && r2 < 0.5) || (h < 2.4 && r2 < 0.25)) && r1 < 0.02) {
      const s = 0.4 + r3 * r3 * 2.6;
      setHSL(col, 0.08, 0.05 + r2 * 0.06, 0.3 + r3 * 0.18);
      lerp(col, P.moss, moist > 0.55 && h < 25 ? 0.35 : 0);
      add(
        'rocks',
        mx,
        h - (s * 0.25 * VEG.rocks.k) / HS,
        mz,
        s * (0.7 + r2 * 0.7),
        s * (0.5 + r1 * 0.9),
        s * (0.7 + r3 * 0.7),
        r3 * 6.28,
        (r1 - 0.5) * 0.4,
        (r2 - 0.5) * 0.4
      );
      continue;
    }
    if (h < 2.3 || h > 44 || sl > 0.85 || cleared(gx(mx), gz(mz))) continue;
    const density = ss(0.85, 0.3, sl) * (0.25 + 0.9 * cluster) * (h < 30 ? 1 : ss(44, 30, h));
    if (r1 > density * 0.28) continue;
    const tilt = sl * 0.25 * (r2 - 0.5);
    if (h > 36 || (h > 26 && r3 < 0.2 && sl > 0.5)) {
      if (r2 < 0.5) {
        setHSL(col, 0.08, 0.1, 0.3 + r3 * 0.15);
        add('deads', mx, h - 0.1 / HS, mz, 0.8 + r3 * 0.6, 0.7 + r2 * 0.9, 0.8 + r3 * 0.6, r3 * 6.28, tilt, tilt * 0.7);
      }
      continue;
    }
    const broad = (moist > 0.5 && h < 14 && r3 < 0.75) || (h < 6 && r3 < 0.55);
    if (broad) {
      const s = 0.7 + r2 * r2 * 1.3;
      setHSL(col, 0.22 + r2 * 0.09, 0.45 + r3 * 0.2, 0.22 + r1 * 0.14);
      add(
        'leafs',
        mx,
        h - 0.15 / HS,
        mz,
        s * (0.85 + r3 * 0.3),
        s * (0.8 + r1 * 0.5),
        s * (0.85 + r2 * 0.3),
        r3 * 6.28,
        tilt,
        tilt
      );
    } else {
      const s = 0.55 + r2 * r2 * 1.6;
      setHSL(col, 0.3 + r2 * 0.1, 0.32 + r3 * 0.2, 0.14 + r1 * 0.1);
      add(
        'conifers',
        mx,
        h - 0.15 / HS,
        mz,
        s * (0.8 + r3 * 0.4),
        s * (0.9 + r1 * 0.7),
        s * (0.8 + r3 * 0.4),
        r3 * 6.28,
        tilt,
        tilt
      );
    }
  }
  return Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, new Float32Array(v)]));
}
export { STRIDE };
// clearings: [[x, z, radius], ...] in game coordinates (open ground around landmarks)
export function generateLake(clearings = []) {
  return {
    fineColors: gridColors(FINE),
    coarseColors: gridColors(COARSE),
    grain: grain(512),
    veg: vegetation(clearings)
  };
}
