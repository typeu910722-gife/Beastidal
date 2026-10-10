// 沉湖遺城 rendered at the sketch's full resolution: terrain, vegetation, the sunken city and lake-side structures.
// Ported from the author's map; positions are scaled by HS, structures by their own factors so they read at
// human scale next to the raft.
import * as T from './vendor/three.module.min.js';
import { HS, ORIGIN, groundAt } from './lake.js?v=0.17.0';
import { FINE, COARSE, Q } from './lake-data.js?v=0.17.0';
import { ISLANDS, NODES } from './islands.js?v=0.17.0';
import { EXPLORE } from './expansion.js?v=0.17.0';
import { BEAST_HOME } from './story.js?v=0.17.0';
import { generateLake, VEG, STRIDE } from './lake-gen.js?v=0.17.0';

// ---------- the sketch's noise (map units) ----------
function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
const Hm = (mx, mz) => groundAt((mx - ORIGIN.x) * HS, (mz - ORIGIN.z) * HS) / HS;
const gx = mx => (mx - ORIGIN.x) * HS,
  gz = mz => (mz - ORIGIN.z) * HS;

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
  // a muted earth tone until the worker's colours arrive (a fraction of a second on most devices)
  const col = new Float32Array(nx * nz * 3).fill(0.1),
    uv = new Float32Array(nx * nz * 2);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const v = j * nx + i;
      uv[v * 2] = (g.x0 + i * g.step + 120) / 4; // the sketch's grain repeat: 60 x 38 over 240 x 150 units
      uv[v * 2 + 1] = (g.z0 + j * g.step + 75) / 4;
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
const SUNK = 2.4,
  BUILD = 1.6;

export function makeLake() {
  const group = new T.Group();
  group.name = 'lake';
  const grainData = new Uint8Array(512 * 512 * 4).fill(200),
    grain = new T.DataTexture(grainData, 512, 512, T.RGBAFormat);
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.magFilter = T.LinearFilter;
  grain.minFilter = T.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.colorSpace = T.SRGBColorSpace;
  grain.needsUpdate = true;
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
  const conifers = makeInst([conifer(0), conifer(1), conifer(2)], VEG.conifers.cap),
    leafs = makeInst([broadleaf(0), broadleaf(1), broadleaf(2)], VEG.leafs.cap),
    deads = makeInst([deadTree(0), deadTree(1)], VEG.deads.cap);
  const rocks = makeInst([rockGeo(1), rockGeo(2), rockGeo(3), rockGeo(4)], VEG.rocks.cap),
    reeds = makeInst([reedGeo()], VEG.reeds.cap),
    kelps = makeInst([kelpGeo()], VEG.kelps.cap);
  const families = { conifers, leafs, deads, rocks, reeds, kelps };
  // open ground around places people walk to: no tree grows through a ruin, a claim stone or a harvest spot
  const clearings = [
    ...ISLANDS.map(i => [i.x, i.z, 14]),
    ...NODES.map(n => [n.x, n.z, 5]),
    ...EXPLORE.filter(e => !e.cave && !e.deep).map(e => [e.x, e.z, 6]),
    [BEAST_HOME.x, BEAST_HOME.z, 20],
    ...[
      [12, -21],
      [-7, -19],
      [-13, -13],
      [-10, -22],
      [5, -11],
      [2, -14],
      [5, -15],
      [-3, -25],
      [16, -13]
    ].map(([mx, mz]) => [gx(mx), gz(mz), 9]),
    [gx(-50), gz(-4), 34]
  ];
  const tmpC = new T.Color();
  function apply(data) {
    fineMesh.geometry.attributes.color.array.set(data.fineColors);
    fineMesh.geometry.attributes.color.needsUpdate = true;
    ranges.geometry.attributes.color.array.set(data.coarseColors);
    ranges.geometry.attributes.color.needsUpdate = true;
    for (let i = 0, n = 512 * 512; i < n; i++)
      grainData[i * 4] = grainData[i * 4 + 1] = grainData[i * 4 + 2] = data.grain[i];
    grain.needsUpdate = true;
    for (const [fam, list] of Object.entries(data.veg)) {
      const meshes = families[fam];
      for (let i = 0; i < list.length; i += STRIDE) {
        const m = meshes[list[i]];
        if (m.count >= m.instanceMatrix.count) continue;
        dm.position.set(list[i + 1], list[i + 2], list[i + 3]);
        dm.scale.set(list[i + 4], list[i + 5], list[i + 6]);
        dm.rotation.set(list[i + 7], list[i + 8], list[i + 9]);
        dm.updateMatrix();
        m.setMatrixAt(m.count, dm.matrix);
        m.setColorAt(m.count, tmpC.setRGB(list[i + 10], list[i + 11], list[i + 12]));
        m.count++;
      }
      for (const m of meshes) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        m.computeBoundingSphere();
      }
    }
  }
  // the heavy part runs in a worker; without one (tests, very old browsers) it runs right here
  const ready = new Promise(resolve => {
    const local = () => {
      apply(generateLake(clearings));
      resolve();
    };
    if (typeof Worker === 'undefined' || typeof window === 'undefined') return local();
    try {
      const worker = new Worker(new URL('./lake-worker.js?v=0.17.0', import.meta.url), { type: 'module' });
      worker.onmessage = e => {
        apply(e.data);
        worker.terminate();
        resolve();
      };
      worker.onerror = () => {
        worker.terminate();
        local();
      };
      worker.postMessage({ clearings });
    } catch {
      local();
    }
  });

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
    ready,
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
