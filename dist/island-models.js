import * as T from './vendor/three.module.min.js';
import { ISLANDS, NODES } from './islands.js?v=0.9.0';
const material = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const sand = material(0xd5c49c),
  rock = material(0x566c6a),
  trunk = material(0x8e7952),
  leaf = material(0x4c8263, { side: T.DoubleSide }),
  metal = material(0x658086, { metalness: 0.5 });
function add(g, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new T.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function palm(g, x, z, h) {
  const pts = [new T.Vector3(x, 0.4, z), new T.Vector3(x + 0.12, h * 0.5, z), new T.Vector3(x + 0.5, h, z + 0.2)];
  add(g, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 14, 0.15, 8, false), trunk);
  for (let j = 0; j < 8; j++) {
    const a = (j * Math.PI) / 4;
    const p = [],
      ix = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12,
        r = t * 2.6,
        w = Math.sin(t * Math.PI) * 0.32;
      for (const side of [-1, 1])
        p.push(
          x + 0.5 + Math.cos(a) * r - Math.sin(a) * w * side,
          h + Math.sin(t * Math.PI) * 0.55 - t * 0.85,
          z + 0.2 + Math.sin(a) * r + Math.cos(a) * w * side
        );
      if (k) {
        const q = k * 2;
        ix.push(q, q + 1, q - 1, q, q - 1, q - 2);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    add(g, geo, leaf);
  }
}
const grass = material(0x6f9a52, { side: T.DoubleSide }),
  bush = material(0x3f7350),
  flower = material(0xf0c26a, { emissive: 0x6a4a10, emissiveIntensity: 0.2 }),
  stoneMat = material(0x7d8a86),
  banner = material(0x2e7c78, { side: T.DoubleSide }),
  gold = material(0xd6b15c, { metalness: 0.4, roughness: 0.4 });
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}
function decorate(g, island) {
  const r = rnd(island.x * 31 + island.z * 7 + 999);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * 0.78,
      x = Math.sin(a) * island.rx * d,
      z = Math.cos(a) * island.rz * d;
    if (Math.hypot(x, z) < 2.6) continue;
    const tuft = new T.Group();
    tuft.position.set(x, 0.42, z);
    for (let k = 0; k < 4; k++) {
      const b = add(tuft, new T.ConeGeometry(0.06, 0.45 + r() * 0.35, 3), grass, [
        Math.sin(k * 1.7) * 0.08,
        0.22,
        Math.cos(k * 1.7) * 0.08
      ]);
      b.rotation.set((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6);
    }
    if (r() < 0.18) add(tuft, new T.SphereGeometry(0.06, 6, 5), flower, [0, 0.5, 0]);
    g.add(tuft);
  }
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2,
      d = 0.35 + r() * 0.4;
    add(
      g,
      new T.IcosahedronGeometry(0.6 + r() * 0.5, 1),
      bush,
      [Math.sin(a) * island.rx * d, 0.62, Math.cos(a) * island.rz * d],
      [1, 0.7, 1]
    );
  }
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2,
      d = 0.88 + r() * 0.14;
    const m = add(g, new T.DodecahedronGeometry(0.25 + r() * 0.45, 0), stoneMat, [
      Math.sin(a) * island.rx * d,
      0.1 + r() * 0.2,
      Math.cos(a) * island.rz * d
    ]);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
  }
  const foam = new T.Mesh(
    new T.RingGeometry(1, 1.08, 96),
    new T.MeshBasicMaterial({
      color: 0xe9f5ee,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: T.DoubleSide
    })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.06;
  foam.scale.set(island.rx * 1.06, island.rz * 1.06, 1);
  foam.renderOrder = 2;
  g.add(foam);
}
function claimMarker(island) {
  const g = new T.Group();
  g.position.set(island.x, 0.42, island.z);
  g.userData.claimId = island.id;
  const stone = new T.Group(),
    flag = new T.Group();
  g.add(stone, flag);
  add(stone, new T.CylinderGeometry(1.1, 1.3, 0.35, 8), stoneMat, [0, 0.17, 0]);
  add(stone, new T.BoxGeometry(0.7, 1.5, 0.3), stoneMat, [0, 1.05, 0]);
  add(stone, new T.TorusGeometry(0.22, 0.04, 6, 18), gold, [0, 1.4, 0.16]);
  add(flag, new T.CylinderGeometry(1.2, 1.4, 0.3, 10), stoneMat, [0, 0.15, 0]);
  add(flag, new T.CylinderGeometry(0.07, 0.08, 6, 8), gold, [0, 3.2, 0]);
  const geo = new T.PlaneGeometry(2.4, 1.4, 10, 4),
    pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 1.8) * 0.15);
  geo.computeVertexNormals();
  const cloth = add(flag, geo, banner, [1.25, 5.3, 0]);
  add(flag, new T.CircleGeometry(0.38, 20), gold, [1.25, 5.3, 0.05]);
  add(flag, new T.SphereGeometry(0.16, 10, 8), gold, [0, 6.25, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    add(flag, new T.CylinderGeometry(0.09, 0.12, 1.1, 6), material(0x6b4b2e), [
      Math.sin(a) * 1.9,
      0.55,
      Math.cos(a) * 1.9
    ]);
    add(flag, new T.SphereGeometry(0.13, 8, 6), material(0xffd38c, { emissive: 0xffc06a, emissiveIntensity: 1.3 }), [
      Math.sin(a) * 1.9,
      1.2,
      Math.cos(a) * 1.9
    ]);
  }
  g.userData.stone = stone;
  g.userData.flag = flag;
  g.userData.cloth = cloth;
  return g;
}
export function makeIslands() {
  const group = new T.Group(),
    nodes = new Map(),
    claims = new Map();
  for (const island of ISLANDS) {
    const g = new T.Group();
    g.position.set(island.x, 0, island.z);
    group.add(g);
    const p = [],
      c = [],
      ix = [],
      N = 80;
    const rings = [
      [0, 0.42],
      [0.3, 0.42],
      [0.6, 0.42],
      [0.86, 0.42],
      [0.94, 0.12],
      [1.04, -0.65],
      [1.15, -1.2]
    ];
    for (let j = 0; j < rings.length; j++) {
      const [r, y] = rings[j];
      for (let n = 0; n <= N; n++) {
        const a = (n / N) * Math.PI * 2;
        const wobble = j < 4 ? 1 : 1 + Math.sin(a * 7 + island.x) * 0.025;
        p.push(Math.sin(a) * island.rx * r * wobble, y, Math.cos(a) * island.rz * r * wobble);
        const color = new T.Color(j < 3 ? island.tint : 0xd5c49c);
        color.multiplyScalar(0.95 + 0.05 * Math.sin(a * 13 + r * 9));
        c.push(color.r, color.g, color.b);
        if (j && n) {
          const q = j * (N + 1) + n;
          ix.push(q, q - N - 1, q - N - 2, q, q - N - 2, q - 1);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    add(g, geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide }));
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      const m = add(
        g,
        new T.DodecahedronGeometry(1, 1),
        rock,
        [Math.sin(a) * island.rx * 0.94, -0.12, Math.cos(a) * island.rz * 0.94],
        [0.6, 0.55, 0.8]
      );
      m.rotation.set(j, j * 0.7, j * 0.3);
    }
    decorate(g, island);
    palm(g, 6, 3, 4.2);
    palm(g, -2, -6, 3.8);
    const cm = claimMarker(island);
    group.add(cm);
    claims.set(island.id, cm);
    if (island.id === 'palm') {
      palm(g, -5, -3, 5);
      palm(g, 4, -4, 4);
      palm(g, -5, 4, 3.5);
    } else if (island.id === 'crystal') {
      for (let n = 0; n < 7; n++) {
        const m = add(
          g,
          new T.ConeGeometry(0.4, 2 + n * 0.19, 5),
          material(0x80cddd, { emissive: 0x408595, emissiveIntensity: 0.25 }),
          [-5 + n * 0.5, 1.2, -4],
          [1, 1, 1]
        );
        m.rotation.z = (n - 3) * 0.12;
      }
    } else {
      for (const x of [-5, 5]) {
        add(g, new T.CylinderGeometry(0.43, 0.56, 3.5, 10), rock, [x, 2, -4]);
        add(g, new T.BoxGeometry(1.4, 0.35, 1.3), sand, [x, 3.85, -4]);
      }
      add(g, new T.BoxGeometry(11, 0.55, 1.2), rock, [0, 4.2, -4]);
      for (let n = 0; n < 5; n++) add(g, new T.BoxGeometry(1.5, 0.08, 1.4), sand, [-3 + n * 1.5, 0.46, -5.3]);
    }
  }
  for (const n of NODES) {
    const g = new T.Group();
    g.position.set(n.x, 0.42, n.z);
    g.userData.nodeId = n.id;
    group.add(g);
    nodes.set(n.id, g);
    if (n.kind === 'wood') {
      for (let i = 0; i < 4; i++) {
        const m = add(g, new T.CylinderGeometry(0.14, 0.18, 1.65, 10), trunk, [
          (i % 2) * 0.36 - 0.18,
          0.18 + Math.floor(i / 2) * 0.25,
          0
        ]);
        m.rotation.x = Math.PI / 2;
        m.rotation.z = i * 0.07;
      }
    } else if (n.kind === 'crystal') {
      for (let i = 0; i < 5; i++) {
        const m = add(
          g,
          new T.ConeGeometry(0.2, 0.8 + i * 0.2, 5),
          material(0x9bc8dd, { emissive: 0x6ca4dc, emissiveIntensity: 0.5 }),
          [(i - 2) * 0.24, 0.5, Math.sin(i) * 0.2]
        );
        m.rotation.z = (i - 2) * 0.14;
      }
    } else if (n.kind === 'fiber') {
      for (let i = 0; i < 9; i++) {
        const m = add(g, new T.ConeGeometry(0.14, 0.9, 4), leaf, [Math.sin(i) * 0.4, 0.45, Math.cos(i) * 0.4]);
        m.rotation.z = Math.sin(i) * 0.35;
      }
    } else if (n.kind === 'food') {
      add(g, new T.CylinderGeometry(0.5, 0.42, 0.28, 12), trunk, [0, 0.17, 0]);
      for (let i = 0; i < 5; i++)
        add(g, new T.SphereGeometry(0.18, 10, 8), material(0xb9a76d), [Math.sin(i) * 0.24, 0.4, Math.cos(i) * 0.24]);
    } else {
      for (let i = 0; i < 3; i++) {
        const m = add(g, new T.BoxGeometry(0.6, 0.23, 0.4), metal, [(i - 1) * 0.35, 0.17 + i * 0.09, 0]);
        m.rotation.y = i * 0.8;
      }
      add(g, new T.TorusGeometry(0.36, 0.055, 6, 18), metal, [0, 0.43, 0]).rotation.x = Math.PI / 2;
    }
  }
  return { group, nodes, claims };
}
