// Land buildings and plots drawn (0.23): a stake-marked wild plot, a cleared patch of turf, and the seven
// buildings — well, garden, shed, watchtower, campfire, stable, pier — in the raft's rough-timber style.
import * as T from './vendor/three.module.min.js';
import { groundAt } from './lake.js?v=0.49.0';

const C = {
  wood: 0x8a5a33,
  dark: 0x5a3a22,
  stone: 0x7c8488,
  straw: 0xd9b26a,
  turf: 0x6f9a4b,
  cloth: 0xe6dcc0,
  iron: 0x3a4448
};
const mats = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  return mats.get(key);
}
function box(p, c, x, y, z, sx, sy, sz, e) {
  const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), mat(c, e));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  p.add(m);
  return m;
}
function cyl(p, c, x, y, z, r, h, e, seg = 10) {
  const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg), mat(c, e));
  m.position.set(x, y, z);
  m.castShadow = true;
  p.add(m);
  return m;
}
export function makePlot(state, build) {
  const g = new T.Group();
  if (state === 'wild') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      cyl(g, C.dark, Math.sin(a) * 2.2, 0.4, Math.cos(a) * 2.2, 0.06, 0.8, undefined, 6);
    }
    for (let i = 0; i < 5; i++) {
      const b = new T.Mesh(new T.IcosahedronGeometry(0.35, 0), mat(0x4f8a3e));
      b.position.set((Math.random() - 0.5) * 3, 0.25, (Math.random() - 0.5) * 3);
      b.scale.y = 0.6;
      g.add(b);
    }
    return g;
  }
  const turf = new T.Mesh(new T.CircleGeometry(2.6, 20), mat(state === 'clearing' ? 0x8a6a3c : C.turf));
  turf.rotation.x = -Math.PI / 2;
  turf.position.y = 0.04;
  turf.receiveShadow = true;
  g.add(turf);
  if (state !== 'built' || !build) return g;
  switch (build) {
    case 'well':
      cyl(g, C.stone, 0, 0.45, 0, 0.9, 0.9, undefined, 14);
      cyl(g, 0x2d8d9c, 0, 0.86, 0, 0.72, 0.1, { emissive: 0x0b4a52, emissiveIntensity: 0.3 }, 14);
      for (const s of [-1, 1]) cyl(g, C.dark, s * 0.8, 1.3, 0, 0.06, 1.8, undefined, 6);
      box(g, C.wood, 0, 2.3, 0, 2.2, 0.12, 1.4);
      cyl(g, C.dark, 0, 1.9, 0, 0.05, 1.8, undefined, 6).rotation.z = Math.PI / 2;
      break;
    case 'garden':
      for (let r = 0; r < 3; r++) {
        box(g, 0x4a3626, 0, 0.1, -1.2 + r * 1.2, 4, 0.2, 0.7);
        for (let i = 0; i < 5; i++) {
          const p = new T.Mesh(new T.ConeGeometry(0.18, 0.7, 5), mat(0x5fa050));
          p.position.set(-1.6 + i * 0.8, 0.5, -1.2 + r * 1.2);
          g.add(p);
        }
      }
      for (const s of [-1, 1]) for (const z of [-1.8, 1.8]) cyl(g, C.dark, s * 2.1, 0.4, z, 0.05, 0.8, undefined, 6);
      break;
    case 'shed':
      box(g, C.wood, 0, 1, 0, 3, 2, 2.4);
      box(g, C.straw, 0, 2.25, 0, 3.4, 0.5, 2.8);
      box(g, C.dark, 0, 0.8, 1.21, 0.9, 1.6, 0.05);
      box(g, C.dark, 0, 0.3, 1.8, 1.2, 0.6, 1);
      break;
    case 'tower':
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, C.dark, sx * 1, 3, sz * 1, 0.1, 6, undefined, 6);
      box(g, C.wood, 0, 6.1, 0, 2.8, 0.2, 2.8);
      for (const s of [-1, 1]) {
        box(g, C.dark, s * 1.35, 6.7, 0, 0.1, 1, 2.8);
        box(g, C.dark, 0, 6.7, s * 1.35, 2.8, 1, 0.1);
      }
      box(g, C.straw, 0, 8, 0, 3.2, 0.3, 3.2);
      cyl(g, 0xffd38c, 0, 7.4, 0, 0.15, 0.3, { emissive: 0xffc06a, emissiveIntensity: 1.5 }, 8);
      for (let i = 0; i < 6; i++) box(g, C.wood, 0, 0.6 + i, 1.3 + i * 0.1, 0.8, 0.08, 0.2);
      break;
    case 'fire': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2,
          r = new T.Mesh(new T.DodecahedronGeometry(0.22, 0), mat(C.stone));
        r.position.set(Math.sin(a) * 0.8, 0.15, Math.cos(a) * 0.8);
        g.add(r);
      }
      for (let i = 0; i < 3; i++) cyl(g, C.dark, 0, 0.2, 0, 0.08, 1.2, undefined, 6).rotation.set(0.4, i * 2.1, 1.2);
      cyl(
        g,
        0xffa040,
        0,
        0.5,
        0,
        0.3,
        0.6,
        { emissive: 0xff7a1a, emissiveIntensity: 2, transparent: true, opacity: 0.85 },
        8
      );
      const l = new T.PointLight(0xffa040, 4, 9, 1.6);
      l.position.set(0, 1.2, 0);
      g.add(l);
      break;
    }
    case 'stable':
      box(g, C.wood, 0, 0.9, -1.2, 4, 1.8, 0.2);
      for (const s of [-1, 1]) box(g, C.wood, s * 1.95, 0.9, 0, 0.2, 1.8, 2.6);
      box(g, C.straw, 0, 1.95, 0, 4.4, 0.3, 3);
      for (const s of [-1, 1]) cyl(g, C.dark, s * 1.9, 1, 1.3, 0.08, 2, undefined, 6);
      box(g, 0xd9b26a, 0, 0.2, 0, 3.4, 0.3, 2.2);
      box(g, C.dark, -1, 0.5, 1.2, 1.6, 0.08, 0.1);
      break;
    case 'pier':
      for (let i = 0; i < 5; i++) {
        box(g, C.wood, 0, 0.3, 1 + i * 1.4, 2, 0.12, 1.3);
        for (const s of [-1, 1]) cyl(g, C.dark, s * 0.9, -0.3, 1 + i * 1.4, 0.08, 1.6, undefined, 6);
      }
      cyl(g, C.iron, 0.8, 0.6, 7.2, 0.08, 0.5, undefined, 8);
      break;
  }
  return g;
}
// Keep the plot meshes in step with the save; group holds Map id → mesh.
export function syncPlots(group, meshes, targets) {
  const seen = new Set();
  for (const t of targets) {
    const key = `${t.id}:${t.state}:${t.build || ''}`;
    seen.add(t.id);
    let m = meshes.get(t.id);
    if (!m || m.userData.key !== key) {
      if (m) group.remove(m);
      m = makePlot(t.state, t.build);
      m.userData.key = key;
      m.position.set(t.x, groundAt(t.x, t.z), t.z);
      meshes.set(t.id, m);
      group.add(m);
    }
  }
  for (const [id, m] of meshes)
    if (!seen.has(id)) {
      group.remove(m);
      meshes.delete(id);
    }
}
