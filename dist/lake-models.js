// 沉湖遺城 rendered at the sketch's full resolution: terrain, vegetation, the sunken city and lake-side structures.
// Ported from the author's map; positions are scaled by HS, structures by their own factors so they read at
// human scale next to the raft.
import * as T from './vendor/three.module.min.js';
import { HS, ORIGIN, groundAt } from './lake.js?v=0.15.0';
import { FINE, COARSE, Q } from './lake-data.js?v=0.15.0';

// ---------- the sketch's noise (map units) ----------
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
// map-unit height and slope from the baked grid
const Hm = (mx, mz) => groundAt((mx - ORIGIN.x) * HS, (mz - ORIGIN.z) * HS) / HS;
const slopeM = (mx, mz) => {
  const e = 0.7;
  return Math.hypot(Hm(mx + e, mz) - Hm(mx - e, mz), Hm(mx, mz + e) - Hm(mx, mz - e)) / (2 * e);
};
const gx = mx => (mx - ORIGIN.x) * HS,
  gz = mz => (mz - ORIGIN.z) * HS;

function noiseTex(size, fn) {
  const d = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        v = fn(x / size, y / size);
      d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v));
      d[i + 3] = 255;
    }
  const t = new T.DataTexture(d, size, size, T.RGBAFormat);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = T.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const C = h => new T.Color(h);
const cSand = C(0xc9b58d),
  cWet = C(0x8d7d5c),
  cPebble = C(0x9a9484),
  cMud = C(0x2f3d3a),
  cSilt = C(0x7f7c60),
  cGrass = C(0x6a9140),
  cMeadow = C(0x98a548),
  cForest = C(0x2d552a),
  cRock = C(0x7a7268),
  cCliff = C(0x5a5450),
  cScree = C(0x9a948a),
  cSnow = C(0xf2f5f7),
  cMoss = C(0x4e6a30);
// Colour rule from the sketch, in map units (h) with slope = 1 - normal.y.
function terrainColor(c, mx, mz, h, slope) {
  const n = fbm(mx * 0.3, mz * 0.3, 4) - 0.5,
    moist = fbm(mx * 0.04 + 11, mz * 0.04, 3);
  if (h < -1.2)
    c.copy(cSilt)
      .lerp(cMud, ss(-3, -32, h))
      .lerp(cRock, ss(0.3, 0.5, slope) * 0.7);
  else if (h < 1.0) c.copy(cWet).lerp(cPebble, ss(0.3, 0.9, hash(mx * 3, mz * 3)));
  else if (h < 2.1) c.copy(cSand).lerp(cPebble, ss(0.2, 0.6, n + 0.5));
  else {
    c.copy(cGrass)
      .lerp(cMeadow, ss(0.6, 0.35, moist) * ss(8, 2, h))
      .lerp(cForest, ss(4, 20, h) + n * 0.5)
      .lerp(cMoss, ss(0.55, 0.7, moist) * 0.4);
    const rock = Math.min(1, ss(0.26, 0.42, slope) + ss(32, 42, h));
    c.lerp(cRock, rock);
    c.lerp(cCliff, ss(0.42, 0.6, slope));
    c.lerp(cScree, rock * ss(0.2, 0.0, slope) * ss(28, 40, h) * 0.6);
    if (h > 50) c.lerp(cSnow, ss(50, 60, h) * (1 - ss(0.45, 0.7, slope)));
  }
  c.offsetHSL(0, 0, n * 0.14);
  return c;
}
function gridMesh(g, material, sink) {
  const decode = () => {
    if (g.data) return g.data;
    throw new Error('lake grid not decoded');
  };
  const data = decode(),
    nx = g.nx,
    nz = g.nz,
    pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const mx = g.x0 + i * g.step,
        mz = g.z0 + j * g.step,
        k = (j * nx + i) * 3;
      let y = data[j * nx + i] / Q;
      if (sink && sink(mx, mz)) y -= 18;
      pos[k] = gx(mx);
      pos[k + 1] = y;
      pos[k + 2] = gz(mz);
    }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let q = 0;
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i,
        b = a + 1,
        c = a + nx,
        d = c + 1;
      idx[q++] = a;
      idx[q++] = c;
      idx[q++] = b;
      idx[q++] = b;
      idx[q++] = c;
      idx[q++] = d;
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setIndex(new T.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal,
    col = new Float32Array(nx * nz * 3),
    uv = new Float32Array(nx * nz * 2),
    c = new T.Color();
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const v = j * nx + i,
        mx = g.x0 + i * g.step,
        mz = g.z0 + j * g.step;
      terrainColor(c, mx, mz, data[v] / Q / HS, 1 - nrm.getY(v));
      col[v * 3] = c.r;
      col[v * 3 + 1] = c.g;
      col[v * 3 + 2] = c.b;
      uv[v * 2] = (mx + 120) / 4; // the sketch's grain repeat: 60 x 38 over 240 x 150 units
      uv[v * 2 + 1] = (mz + 75) / 4;
    }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  const m = new T.Mesh(geo, material);
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

// ---------- vegetation geometry (merged, vertex-coloured) ----------
function merge(parts) {
  const pos = [],
    norm = [],
    col = [];
  for (const [g, c] of parts) {
    const ng = g.index ? g.toNonIndexed() : g,
      p = ng.attributes.position.array,
      n = ng.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      norm.push(n[i], n[i + 1], n[i + 2]);
      col.push(c.r, c.g, c.b);
    }
  }
  const b = new T.BufferGeometry();
  b.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  b.setAttribute('normal', new T.Float32BufferAttribute(norm, 3));
  b.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  return b;
}
function jitter(g, amt, seed) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = hash(i + seed, seed);
    p.setXYZ(
      i,
      p.getX(i) * (1 + (k - 0.5) * amt),
      p.getY(i) * (1 + (hash(i, k) - 0.5) * amt),
      p.getZ(i) * (1 + (hash(k, i) - 0.5) * amt)
    );
  }
  g.computeVertexNormals();
  return g;
}
const W = new T.Color(1, 1, 1),
  BARK = new T.Color(0.48, 0.36, 0.26),
  BARK2 = new T.Color(0.62, 0.52, 0.42);
function conifer(v) {
  const t = new T.CylinderGeometry(0.12, 0.22, 1.6, 5);
  t.translate(0, 0.8, 0);
  const parts = [[t, BARK]],
    n = 3 + v;
  for (let i = 0; i < n; i++) {
    const y = 1.2 + i * 1.15,
      r = 1.15 - i * 0.22,
      c = new T.ConeGeometry(r, 1.9, 7 + v);
    c.translate(0, y + 0.9, 0);
    jitter(c, 0.18, i + v * 9);
    parts.push([c, new T.Color(1 - i * 0.06, 1 - i * 0.03, 1)]);
  }
  return merge(parts);
}
function broadleaf(v) {
  const t = new T.CylinderGeometry(0.14, 0.3, 1.9, 6);
  t.translate(0, 0.95, 0);
  const parts = [[t, BARK2]],
    lobes = 3 + v;
  for (let i = 0; i < lobes; i++) {
    const k = hash(i, v),
      c = new T.IcosahedronGeometry(1.1 + k * 0.5, 1);
    jitter(c, 0.35, i * 3 + v);
    c.translate((hash(i, v + 3) - 0.5) * 1.4, 2.2 + hash(v, i) * 0.9, (hash(i + 2, v) - 0.5) * 1.4);
    parts.push([c, new T.Color(0.9 + k * 0.2, 1, 0.85)]);
  }
  return merge(parts);
}
function deadTree(v) {
  const t = new T.CylinderGeometry(0.08, 0.26, 3.2, 5);
  t.translate(0, 1.6, 0);
  const parts = [[t, W]];
  for (let i = 0; i < 3 + v; i++) {
    const b = new T.CylinderGeometry(0.03, 0.09, 1.4, 4);
    b.translate(0, 0.7, 0);
    b.rotateZ(0.7 + hash(i, v) * 0.6);
    b.rotateY(hash(v, i) * 6.28);
    b.translate(0, 1.4 + i * 0.5, 0);
    parts.push([b, W]);
  }
  return merge(parts);
}
// rocks carry a white colour attribute so the instance colour shows (no attribute reads as black)
const rockGeo = v => merge([[jitter(new T.IcosahedronGeometry(1, 1), 0.55, v * 17), W]]);
function reedGeo() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const b = new T.CylinderGeometry(0.02, 0.05, 1.8 + hash(i, 2) * 0.8, 3);
    b.translate(0, 1, 0);
    b.rotateZ((hash(i, 5) - 0.5) * 0.5);
    b.rotateY(i * 1.3);
    b.translate((hash(i, 9) - 0.5) * 0.5, 0, (hash(9, i) - 0.5) * 0.5);
    parts.push([b, W]);
  }
  return merge(parts);
}
function kelpGeo() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const b = new T.ConeGeometry(0.25, 6 + hash(i, 4) * 4, 4);
    b.translate(0, 3.5, 0);
    b.rotateZ((hash(i, 7) - 0.5) * 0.5);
    b.rotateY(i * 2.1);
    parts.push([b, W]);
  }
  return merge(parts);
}

// Size of things relative to the sketch's units: trees and rocks read as old-growth at this scale,
// sunken monuments as colossal, lake-side buildings as halls a person can walk around.
const TREE = 2.6,
  STONE = 3,
  REED = 1.4,
  KELP = 3,
  SUNK = 2.4,
  BUILD = 1.6;

export function makeLake() {
  const group = new T.Group();
  group.name = 'lake';
  const grain = noiseTex(512, (u, v) => {
    let s = 0,
      a = 0.5,
      f = 8;
    for (let i = 0; i < 5; i++) {
      s += a * vn(u * f + i * 3, v * f + i * 7);
      f *= 2;
      a *= 0.5;
    }
    return 150 + 120 * (s - 0.5) * 1.5;
  });
  grain.anisotropy = 8;
  const terrainMat = new T.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 0.96, metalness: 0 });
  const fineMesh = gridMesh(FINE, terrainMat);
  fineMesh.name = 'terrain';
  group.add(fineMesh);
  // the surrounding ranges beyond the sketch, sunk under the detailed basin where the two overlap
  const inFine = (mx, mz) =>
    mx > FINE.x0 + 1 &&
    mx < FINE.x0 + (FINE.nx - 1) * FINE.step - 1 &&
    mz > FINE.z0 + 1 &&
    mz < FINE.z0 + (FINE.nz - 1) * FINE.step - 1;
  const ranges = gridMesh(COARSE, terrainMat, inFine);
  ranges.castShadow = false;
  group.add(ranges);

  // ---------- vegetation & rocks (instanced, same sampling as the sketch) ----------
  const vegMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const dm = new T.Object3D();
  const makeInst = (geos, count) =>
    geos.map(g => {
      const m = new T.InstancedMesh(g, vegMat, count);
      m.castShadow = m.receiveShadow = true;
      m.count = 0;
      group.add(m);
      return m;
    });
  const conifers = makeInst([conifer(0), conifer(1), conifer(2)], 3000),
    leafs = makeInst([broadleaf(0), broadleaf(1), broadleaf(2)], 2000),
    deads = makeInst([deadTree(0), deadTree(1)], 300);
  const rocks = makeInst([rockGeo(1), rockGeo(2), rockGeo(3), rockGeo(4)], 900),
    reeds = makeInst([reedGeo()], 1500),
    kelps = makeInst([kelpGeo()], 500);
  const tmpC = new T.Color();
  function addInst(list, mx, h, mz, k, sx, sy, sz, ry, tiltX, tiltZ, color) {
    const m = list[Math.floor(hash(mx * 1.7, mz * 2.3) * list.length)];
    if (m.count >= m.instanceMatrix.count) return;
    dm.position.set(gx(mx), h * HS, gz(mz));
    dm.scale.set(sx * k, sy * k, sz * k);
    dm.rotation.set(tiltX, ry, tiltZ);
    dm.updateMatrix();
    m.setMatrixAt(m.count, dm.matrix);
    m.setColorAt(m.count, color);
    m.count++;
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
        addInst(
          kelps,
          mx,
          h - 0.3 / HS,
          mz,
          KELP,
          0.8 + r2 * 0.6,
          0.7 + r3 * 0.8,
          0.8 + r2 * 0.6,
          r3 * 6.28,
          (r1 - 0.5) * 0.3,
          (r2 - 0.5) * 0.3,
          tmpC.setHSL(0.33 + r2 * 0.06, 0.35, 0.14 + r3 * 0.08)
        );
        continue;
      }
      if (r1 < 0.004) {
        const s = 0.6 + r2 * 2.2;
        addInst(
          rocks,
          mx,
          h - (s * 0.3 * STONE) / HS,
          mz,
          STONE,
          s * (0.7 + r3 * 0.6),
          s * (0.5 + r1 * 0.8),
          s,
          r3 * 6.28,
          0,
          0,
          tmpC.setHSL(0.45, 0.12, 0.18 + r2 * 0.1)
        );
      }
      continue;
    }
    if (h > 0.6 && h < 2.0 && sl < 0.35 && r1 < 0.09) {
      addInst(
        reeds,
        mx,
        h - 0.1 / HS,
        mz,
        REED,
        0.7 + r2 * 0.5,
        0.8 + r3 * 0.6,
        0.7 + r2 * 0.5,
        r3 * 6.28,
        0,
        0,
        tmpC.setHSL(0.2 + r2 * 0.05, 0.45, 0.28 + r3 * 0.1)
      );
      continue;
    }
    if (h > -1 && (sl > 0.55 || (h > 28 && r2 < 0.5) || (h < 2.4 && r2 < 0.25)) && r1 < 0.02) {
      const s = 0.4 + r3 * r3 * 2.6;
      addInst(
        rocks,
        mx,
        h - (s * 0.25 * STONE) / HS,
        mz,
        STONE,
        s * (0.7 + r2 * 0.7),
        s * (0.5 + r1 * 0.9),
        s * (0.7 + r3 * 0.7),
        r3 * 6.28,
        (r1 - 0.5) * 0.4,
        (r2 - 0.5) * 0.4,
        tmpC.setHSL(0.08, 0.05 + r2 * 0.06, 0.3 + r3 * 0.18).lerp(cMoss, moist > 0.55 && h < 25 ? 0.35 : 0)
      );
      continue;
    }
    if (h < 2.3 || h > 44 || sl > 0.85) continue;
    const density = ss(0.85, 0.3, sl) * (0.25 + 0.9 * cluster) * (h < 30 ? 1 : ss(44, 30, h));
    if (r1 > density * 0.28) continue;
    const tilt = sl * 0.25 * (r2 - 0.5);
    if (h > 36 || (h > 26 && r3 < 0.2 && sl > 0.5)) {
      if (r2 < 0.5)
        addInst(
          deads,
          mx,
          h - 0.1 / HS,
          mz,
          TREE,
          0.8 + r3 * 0.6,
          0.7 + r2 * 0.9,
          0.8 + r3 * 0.6,
          r3 * 6.28,
          tilt,
          tilt * 0.7,
          tmpC.setHSL(0.08, 0.1, 0.3 + r3 * 0.15)
        );
      continue;
    }
    const broad = (moist > 0.5 && h < 14 && r3 < 0.75) || (h < 6 && r3 < 0.55);
    if (broad) {
      const s = 0.7 + r2 * r2 * 1.3;
      addInst(
        leafs,
        mx,
        h - 0.15 / HS,
        mz,
        TREE,
        s * (0.85 + r3 * 0.3),
        s * (0.8 + r1 * 0.5),
        s * (0.85 + r2 * 0.3),
        r3 * 6.28,
        tilt,
        tilt,
        tmpC.setHSL(0.22 + r2 * 0.09, 0.45 + r3 * 0.2, 0.22 + r1 * 0.14)
      );
    } else {
      const s = 0.55 + r2 * r2 * 1.6;
      addInst(
        conifers,
        mx,
        h - 0.15 / HS,
        mz,
        TREE,
        s * (0.8 + r3 * 0.4),
        s * (0.9 + r1 * 0.7),
        s * (0.8 + r3 * 0.4),
        r3 * 6.28,
        tilt,
        tilt,
        tmpC.setHSL(0.3 + r2 * 0.1, 0.32 + r3 * 0.2, 0.14 + r1 * 0.1)
      );
    }
  }
  for (const m of [...conifers, ...leafs, ...deads, ...rocks, ...reeds, ...kelps]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }

  // ---------- monuments ----------
  const std = (c, r = 0.9) => new T.MeshStandardMaterial({ color: c, roughness: r, map: grain });
  const M = {
    stone: std(0xa39e8c),
    sunk: std(0x6b9e94, 0.95),
    sunkDark: std(0x4a7a74, 0.95),
    wood: std(0x7a5534),
    woodDark: std(0x4b3320),
    roof: std(0x5e6e3d, 1)
  };
  const box = (w, h, d, m) => {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.castShadow = o.receiveShadow = true;
    return o;
  };
  const column = (r, h, m) => {
    const g = new T.CylinderGeometry(r * 0.9, r, h, 10);
    g.translate(0, h / 2, 0);
    const o = new T.Mesh(g, m);
    o.castShadow = o.receiveShadow = true;
    return o;
  };
  // place a sketch object at map (mx,mz): sits on the ground, scaled by `k`
  const put = (o, mx, mz, ry = 0, k = SUNK, dy = 0) => {
    o.position.set(gx(mx), groundAt(gx(mx), gz(mz)) + dy * k, gz(mz));
    o.rotation.y = ry;
    o.scale.setScalar(k);
    group.add(o);
    return o;
  };
  function arch(m, w = 6, h = 6, t = 1.2, arc = Math.PI) {
    const g = new T.Group();
    [-1, 1].forEach(sd => {
      const p = box(t, h, t, m);
      p.position.set((sd * w) / 2, h / 2, 0);
      g.add(p);
    });
    const a = new T.Mesh(new T.TorusGeometry(w / 2, t / 2, 8, 18, arc), m);
    a.castShadow = true;
    a.position.y = h;
    g.add(a);
    return g;
  }
  function temple(m, seed) {
    const g = new T.Group();
    const s1 = box(16, 1, 11, m);
    s1.position.y = 0.5;
    g.add(s1);
    const s2 = box(14, 1, 9, m);
    s2.position.y = 1.5;
    g.add(s2);
    for (let i = 0; i < 6; i++)
      [-3.8, 3.8].forEach((z, j) => {
        const broken = hash(i + seed, j) > 0.75,
          c = column(0.55, broken ? 2 + hash(i, seed) * 3 : 6, m);
        c.position.set(-6 + i * 2.4, 2, z);
        g.add(c);
      });
    const cella = box(9, 5.5, 5, m);
    cella.position.y = 4.75;
    g.add(cella);
    const ent = box(14.4, 1, 8.8, m);
    ent.position.y = 8.5;
    g.add(ent);
    const sh = new T.Shape();
    sh.moveTo(-7.4, 0);
    sh.lineTo(7.4, 0);
    sh.lineTo(0, 2.6);
    sh.lineTo(-7.4, 0);
    const pg = new T.ExtrudeGeometry(sh, { depth: 8.6, bevelEnabled: false });
    pg.translate(0, 9, -4.3);
    const ped = new T.Mesh(pg, m);
    ped.castShadow = true;
    g.add(ped);
    return g;
  }
  function bigGate(m) {
    const g = new T.Group();
    [-1, 1].forEach(sd => {
      const p = box(3.4, 9, 3.8, m);
      p.position.set(sd * 5.7, 4.5, 0);
      g.add(p);
    });
    const a = new T.Mesh(new T.TorusGeometry(5.7, 1.7, 8, 22, Math.PI), m);
    a.castShadow = true;
    a.position.y = 9;
    a.scale.z = 1.1;
    g.add(a);
    const capb = box(15.6, 2.2, 4, m);
    capb.position.y = 16.3;
    g.add(capb);
    const sill = box(16, 1, 5, M.sunkDark);
    sill.position.y = 0.5;
    g.add(sill);
    return g;
  }
  function obelisk(m) {
    const g = new T.Group();
    const b = box(1.7, 8, 1.7, m);
    b.position.y = 4;
    g.add(b);
    const c = new T.Mesh(new T.ConeGeometry(1.25, 1.8, 4), m);
    c.position.y = 8.9;
    c.rotation.y = Math.PI / 4;
    g.add(c);
    const base = box(3, 1, 3, m);
    base.position.y = 0.5;
    g.add(base);
    return g;
  }
  // 水下遺城
  put(box(34, 0.5, 14, M.sunkDark), 0, 17, 0, SUNK, 0.1);
  put(temple(M.sunk, 1), -24, 12, 0.12);
  put(temple(M.sunk, 5), 27, 9, -0.1);
  const gate = put(bigGate(M.sunk), 0, 27, 0, SUNK, -0.2);
  put(obelisk(M.sunk), -8, 12);
  put(obelisk(M.sunk), 9, 13);
  put(arch(M.sunk, 6, 6, 1.3), -34, 25, 0.4, SUNK, -0.2);
  put(arch(M.sunk, 5, 5, 1.1, Math.PI * 0.6), -14, 31, -0.3, SUNK, -0.2);
  const aq = new T.Group();
  for (let i = 0; i < 3; i++) {
    const a = arch(M.sunk, 5, 6, 1.4);
    a.position.x = i * 6.4;
    aq.add(a);
  }
  const aqTop = box(19.6, 1.4, 1.6, M.sunk);
  aqTop.position.set(6.4, 9.2, 0);
  aq.add(aqTop);
  put(aq, 22, 27, -0.25, SUNK, -0.2);
  for (let k = 0; k < 70; k++) {
    const mx = (hash(k, 11) - 0.5) * 90,
      mz = 4 + hash(k, 13) * 32;
    if (Hm(mx, mz) > -14) continue;
    if (
      [
        [-24, 12],
        [27, 9],
        [0, 27],
        [-8, 12],
        [9, 13],
        [28, 27]
      ].some(([a, b]) => Math.hypot(mx - a, mz - b) < 9)
    )
      continue;
    const fallen = hash(k, 17) > 0.7,
      h = fallen ? 5 : 1.5 + hash(k, 19) * 6;
    const c = column(0.55, h, hash(k, 23) > 0.5 ? M.sunk : M.sunkDark);
    if (fallen) {
      c.rotation.z = Math.PI / 2;
      const w = new T.Group();
      w.add(c);
      put(w, mx, mz, hash(k, 29) * 6, SUNK, 0.4);
    } else put(c, mx, mz, 0, SUNK, -0.2);
  }
  // god-rays through the lake, visible on a dive
  const shaftMat = new T.MeshBasicMaterial({
    color: 0xbff3ea,
    transparent: true,
    opacity: 0.06,
    blending: T.AdditiveBlending,
    depthWrite: false,
    side: T.DoubleSide,
    fog: false
  });
  const shafts = [];
  const DEEP = 46 * HS;
  for (let i = 0; i < 7; i++) {
    const g = new T.CylinderGeometry(1.2 * SUNK * 2, 4.5 * SUNK * 2, DEEP, 10, 1, true);
    g.translate(0, -DEEP / 2, 0);
    const s = new T.Mesh(g, shaftMat.clone());
    s.position.set(gx(-30 + i * 10), -0.6, gz(8 + hash(i, 3) * 20));
    s.rotation.z = 0.18;
    s.renderOrder = 3;
    group.add(s);
    shafts.push(s);
  }
  // 中央遺跡島
  put(arch(M.stone, 6, 7, 1.3), 12, -21, -0.35, BUILD);
  put(arch(M.stone, 5, 5, 1.2, Math.PI * 0.55), -7, -19, 0.5, BUILD);
  [
    [-13, -13, 6, 3],
    [-10, -22, 4, 2.2],
    [5, -11, 3, 1.6]
  ].forEach(([mx, mz, w, h]) => {
    const b = box(w, h, 1.2, M.stone);
    b.position.y = h / 2;
    const g = new T.Group();
    g.add(b);
    put(g, mx, mz, hash(mx, mz) * 2, BUILD);
  });
  [
    [2, -14, 4],
    [5, -15, 2.4],
    [-3, -25, 3.5],
    [16, -13, 2]
  ].forEach(([mx, mz, h]) => put(column(0.6, h, M.stone), mx, mz, 0, BUILD));
  // 船屋島: the boathouse and its old hull
  const bh = new T.Group();
  const deck = box(15, 0.5, 9, M.wood);
  deck.position.y = 0.4;
  bh.add(deck);
  [
    [-7, -4],
    [7, -4],
    [-7, 4],
    [7, 4],
    [0, -4],
    [0, 4]
  ].forEach(([x, z]) => {
    const p = column(0.35, 6.5, M.woodDark);
    p.position.set(x, 0.5, z);
    bh.add(p);
  });
  [-1, 1].forEach(sd => {
    const r = box(16, 0.4, 5.6, M.roof);
    r.position.set(0, 8, sd * 2.3);
    r.rotation.x = sd * 0.62;
    bh.add(r);
  });
  const hull = new T.Mesh(new T.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.wood);
  hull.castShadow = true;
  hull.scale.set(6, 1.6, 1.9);
  hull.position.y = 1.6;
  bh.add(hull);
  const rail = box(11, 0.3, 0.3, M.woodDark);
  rail.position.set(0, 1.7, 1.8);
  bh.add(rail);
  put(bh, -50, -4, 0.15, BUILD);
  // 左岸水門與碼頭
  const wgx = gx(-75),
    wgz = gz(10),
    wgh = Math.max(groundAt(wgx, wgz), 0.6);
  const wg = new T.Group();
  [-1, 1].forEach(sd => {
    const p = box(1.5, 8, 1.5, M.woodDark);
    p.position.set(0, 4, sd * 3.2);
    wg.add(p);
  });
  const lint = box(1.8, 1.2, 8.6, M.woodDark);
  lint.position.y = 8.2;
  wg.add(lint);
  const door = box(0.5, 6.2, 5, M.wood);
  door.position.y = 3.2;
  wg.add(door);
  const wall = box(3, 2, 14, M.stone);
  wall.position.set(-0.8, 0.6, 0);
  wg.add(wall);
  wg.position.set(wgx, wgh - 0.4 * BUILD, wgz);
  wg.scale.setScalar(BUILD);
  group.add(wg);
  for (let i = 0; i < 5; i++) {
    const pl = box(2.6, 0.3, 6, M.wood);
    pl.scale.setScalar(BUILD);
    pl.position.set(wgx + (3 + i * 2.7) * BUILD, 0.5, wgz - BUILD);
    group.add(pl);
  }
  // 珊瑚灘
  const coralCols = [0xe0697a, 0xd94a4a, 0x5aa9e6, 0xf08a5d, 0xc56fd1];
  for (let k = 0; k < 22; k++) {
    // the sketch's reef sits in the peninsula's shallows; find the nearest real shallow water for each colony
    let cx = gx(56 + (hash(k, 41) - 0.3) * 16),
      cz = gz(9 + hash(k, 43) * 5);
    search: for (let r = 0; r < 180; r += 3)
      for (let a = 0; a < 6.28; a += 0.5) {
        const px = cx + Math.sin(a + k) * r,
          pz = cz + Math.cos(a + k) * r,
          h = groundAt(px, pz);
        if (h < -0.8 && h > -5) {
          cx = px;
          cz = pz;
          break search;
        }
      }
    const y = groundAt(cx, cz);
    const m = new T.MeshStandardMaterial({ color: coralCols[k % 5], roughness: 0.7 });
    const g = new T.Group();
    for (let b = 0; b < 4; b++) {
      const br = column(0.18, 1.4 + hash(k, b) * 1.4, m);
      br.rotation.set((hash(k, b + 9) - 0.5) * 1.1, 0, (hash(b, k) - 0.5) * 1.1);
      g.add(br);
    }
    g.position.set(cx, y - 0.1, cz);
    g.scale.setScalar((0.9 + hash(k, 47) * 0.6) * BUILD);
    group.add(g);
  }
  return {
    group,
    shafts,
    gate,
    update(t, diving) {
      for (const s of shafts) s.visible = diving;
      for (let i = 0; i < shafts.length; i++) shafts[i].material.opacity = 0.045 + 0.03 * Math.sin(t * 0.8 + i * 1.7);
    }
  };
}
// The heightmap as a half-float texture for the water shader (shore foam, shallow colour, wave damping).
export function groundTexture() {
  const nx = FINE.nx,
    nz = FINE.nz,
    d = new Uint16Array(nx * nz);
  for (let i = 0; i < d.length; i++) d[i] = T.DataUtils.toHalfFloat(FINE.data[i] / Q);
  const t = new T.DataTexture(d, nx, nz, T.RedFormat, T.HalfFloatType);
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearFilter;
  t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
  t.needsUpdate = true;
  const cell = FINE.step * HS;
  // uv = (world - xy) * zw, with texel centres aligned to the grid samples
  const box = new T.Vector4(gx(FINE.x0) - cell / 2, gz(FINE.z0) - cell / 2, 1 / (nx * cell), 1 / (nz * cell));
  return { texture: t, box };
}
