// The warship's interior, drawn (0.20): parquet, panelled walls with brass, portholes, chandeliers, the beast
// lounge with its pool and garden, the stair to the bridge, the ladder to the hold, the cargo stations, and the
// furniture catalogue. Everything sits in its own corner of the world at CABIN.
import * as T from './vendor/three.module.min.js';
import { CABIN, FLOORS, WALL_H, ROOMS, TANKS, CABIN_POINTS, CABIN_ITEMS } from './cabin.js?v=0.27.1';

const C = {
  wood: 0x6b4426,
  woodLight: 0xa97a4c,
  brass: 0xd6b15c,
  cream: 0xe9dcc4,
  velvet: 0x7a2f3b,
  velvetDark: 0x5a1f2b,
  teal: 0x2e7c78,
  iron: 0x3a4448,
  marble: 0xe6e1d6,
  water: 0x2d8d9c,
  grass: 0x6f9a4b,
  soil: 0x4a3626,
  glass: 0xbfe6ee
};
function canvasTex(draw, w = 256, h = 256, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function parquet(dark = false) {
  return canvasTex((g, w, h) => {
    g.fillStyle = dark ? '#4a3220' : '#8a5f3a';
    g.fillRect(0, 0, w, h);
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 64;
      for (let x = -64; x < w; x += 128) {
        const l = dark ? 22 + Math.random() * 8 : 36 + Math.random() * 12;
        g.fillStyle = `hsl(${26 + Math.random() * 6},${dark ? 38 : 46}%,${l}%)`;
        g.fillRect(x + off, r * (h / rows), 126, h / rows - 2);
        g.fillStyle = 'rgba(255,230,190,0.08)';
        g.fillRect(x + off, r * (h / rows), 126, 2);
      }
    }
  });
}
function panelling() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#ead9bd';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = x % 32 ? 'rgba(120,90,60,0.07)' : 'rgba(255,255,255,0.08)';
      g.fillRect(x, 0, 16, h * 0.6);
    }
    g.fillStyle = '#5a3a22';
    g.fillRect(0, h * 0.6, w, h * 0.4);
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = '#6e4a2c';
      g.fillRect(x + 6, h * 0.66, 52, h * 0.3);
      g.strokeStyle = '#3b2414';
      g.lineWidth = 2;
      g.strokeRect(x + 10, h * 0.69, 44, h * 0.24);
    }
    g.fillStyle = '#d6b15c';
    g.fillRect(0, h * 0.6, w, 4);
    g.fillRect(0, h - 5, w, 5);
  });
}
function marble() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#e8e3d8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,120,110,0.35)';
    for (let i = 0; i < 14; i++) {
      g.lineWidth = 1 + Math.random() * 1.5;
      g.beginPath();
      let x = Math.random() * w,
        y = 0;
      g.moveTo(x, y);
      while (y < h) {
        y += 10 + Math.random() * 20;
        x += (Math.random() - 0.5) * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}
function iron() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#3f4a50';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#35414a';
    for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2);
    g.fillStyle = '#5a666c';
    for (let y = 8; y < h; y += 64) for (let x = 8; x < w; x += 24) g.fillRect(x, y, 4, 4);
  });
}
const tankMats = {};
function tm(key, make) {
  return (tankMats[key] ??= make());
}
// An aquarium: an iron base, glass, lit water, a sandy floor and a few crystal fronds.
export function tankMesh(w, d, h) {
  const g = new T.Group(),
    m = (geo, mat, pos) => {
      const o = new T.Mesh(geo, mat);
      o.position.set(...pos);
      g.add(o);
      return o;
    };
  const iron = tm('iron', () => new T.MeshStandardMaterial({ color: C.iron, metalness: 0.5, roughness: 0.5 })),
    glass = tm(
      'glass',
      () =>
        new T.MeshStandardMaterial({
          color: C.glass,
          transparent: true,
          opacity: 0.22,
          roughness: 0.05,
          metalness: 0.2
        })
    ),
    water = tm(
      'water',
      () =>
        new T.MeshStandardMaterial({
          color: C.water,
          transparent: true,
          opacity: 0.42,
          emissive: 0x0b4a52,
          emissiveIntensity: 0.7,
          roughness: 0.1,
          depthWrite: false
        })
    ),
    sand = tm('sand', () => new T.MeshStandardMaterial({ color: 0xd8c08a, roughness: 0.95 })),
    frond = tm(
      'frond',
      () => new T.MeshStandardMaterial({ color: 0xc1b2ee, emissive: 0x9a7bff, emissiveIntensity: 1.1 })
    ),
    brass = tm('brass', () => new T.MeshStandardMaterial({ color: C.brass, metalness: 0.8, roughness: 0.3 }));
  m(new T.BoxGeometry(w, 0.5, d), iron, [0, 0.25, 0]);
  m(new T.BoxGeometry(w - 0.08, 0.08, d - 0.08), sand, [0, 0.54, 0]);
  m(new T.BoxGeometry(w - 0.1, h - 0.62, d - 0.1), water, [0, 0.5 + (h - 0.62) / 2 + 0.04, 0]).userData.tankWater =
    true;
  m(new T.BoxGeometry(w, h - 0.5, d), glass, [0, 0.5 + (h - 0.5) / 2, 0]);
  m(new T.BoxGeometry(w + 0.06, 0.06, d + 0.06), brass, [0, h, 0]);
  const n = Math.max(3, Math.round(w * 1.5));
  for (let i = 0; i < n; i++) {
    const f = m(new T.ConeGeometry(0.05, 0.25 + (i % 3) * 0.12, 5), frond, [
      -w / 2 + 0.25 + ((w - 0.5) * i) / (n - 1),
      0.7,
      ((i % 2) - 0.5) * (d * 0.4)
    ]);
    f.rotation.z = i % 2 ? 0.15 : -0.15;
  }
  g.userData.tank = { w, d, h };
  return g;
}
export function makeCabin(mat, halo) {
  const group = new T.Group();
  group.position.set(CABIN.x, 0, CABIN.z);
  const floors = FLOORS.map(f => {
    const g = new T.Group();
    g.position.y = f.y;
    group.add(g);
    return g;
  });
  const lights = [];
  const add = (p, geo, color, pos, scale = [1, 1, 1], extra) => {
    const m = new T.Mesh(geo, mat(color, extra));
    m.position.set(...pos);
    m.scale.set(...scale);
    m.receiveShadow = true;
    p.add(m);
    return m;
  };
  const box = (p, c, x, y, z, sx, sy, sz, e) => add(p, new T.BoxGeometry(1, 1, 1), c, [x, y, z], [sx, sy, sz], e);
  const cyl = (p, c, x, y, z, r, h, e, seg = 14) =>
    add(p, new T.CylinderGeometry(1, 1, 1, seg), c, [x, y, z], [r, h, r], e);
  const point = (p, color, x, y, z, i, d) => {
    const l = new T.PointLight(color, i, d, 1.4);
    l.position.set(x, y, z);
    p.add(l);
    lights.push(l);
    return l;
  };
  const texFloor = parquet(),
    texFloorDark = parquet(true),
    texWall = panelling(),
    texMarble = marble(),
    texIron = iron();
  const tex = (t, rx, ry, extra = {}) => {
    const c = t.clone();
    c.needsUpdate = true;
    c.repeat.set(rx, ry);
    return new T.MeshStandardMaterial({ map: c, roughness: 0.62, ...extra });
  };
  // walls of a room with optional openings on a side: openings = { side: [[a, b], …] } in local coords
  function roomWalls(g, r, wallMat, openings = {}, h = WALL_H) {
    const seg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 0.05) return;
      const m = new T.Mesh(new T.BoxGeometry(len, h, 0.3), wallMat);
      m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      m.receiveShadow = true;
      g.add(m);
    };
    const run = (side, a, b, fixed) => {
      let s = a;
      for (const [o0, o1] of openings[side] || []) {
        if (side === 'n' || side === 's') seg(s, fixed, o0, fixed);
        else seg(fixed, s, fixed, o0);
        s = o1;
      }
      if (side === 'n' || side === 's') seg(s, fixed, b, fixed);
      else seg(fixed, s, fixed, b);
    };
    run('s', r.x0, r.x1, r.z0 - 0.15);
    run('n', r.x0, r.x1, r.z1 + 0.15);
    run('w', r.z0, r.z1, r.x0 - 0.15);
    run('e', r.z0, r.z1, r.x1 + 0.15);
  }
  const ceiling = (g, r, color, beams = true, h = WALL_H) => {
    box(g, color, (r.x0 + r.x1) / 2, h + 0.15, (r.z0 + r.z1) / 2, r.x1 - r.x0 + 0.6, 0.3, r.z1 - r.z0 + 0.6);
    if (beams)
      for (let x = r.x0 + 2; x < r.x1; x += 4) box(g, C.wood, x, h - 0.12, (r.z0 + r.z1) / 2, 0.3, 0.24, r.z1 - r.z0);
  };
  const porthole = (g, x, y, z, rotY) => {
    const p = new T.Group();
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    g.add(p);
    add(p, new T.TorusGeometry(0.55, 0.08, 10, 28), C.brass, [0, 0, 0], [1, 1, 1], { metalness: 0.8, roughness: 0.3 });
    add(p, new T.CircleGeometry(0.5, 28), 0x9fd8ee, [0, 0, 0], [1, 1, 1], {
      emissive: 0x7ec8e8,
      emissiveIntensity: 1.3,
      side: T.DoubleSide
    });
  };
  const chandelier = (g, x, z, h = WALL_H) => {
    const c = new T.Group();
    c.position.set(x, h - 0.9, z);
    g.add(c);
    cyl(c, C.brass, 0, 0.55, 0, 0.03, 0.9, { metalness: 0.8, roughness: 0.3 });
    add(c, new T.TorusGeometry(0.75, 0.05, 8, 28), C.brass, [0, 0, 0], [1, 1, 1], {
      metalness: 0.8,
      roughness: 0.3
    }).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      cyl(c, C.cream, Math.cos(a) * 0.75, 0.16, Math.sin(a) * 0.75, 0.035, 0.3);
      add(c, new T.SphereGeometry(0.06, 8, 6), 0xfff0c0, [Math.cos(a) * 0.75, 0.36, Math.sin(a) * 0.75], [1, 1.4, 1], {
        emissive: 0xffd080,
        emissiveIntensity: 2.2
      });
    }
    halo(c, 0xffd8a0, 0, 0.3, 0, 2.6);
    point(c, 0xffd9a8, 0, 0.1, 0, 16, 18);
  };
  const sconce = (g, x, y, z, rotY) => {
    const s = new T.Group();
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    g.add(s);
    box(s, C.brass, 0, 0, 0, 0.12, 0.4, 0.08, { metalness: 0.8, roughness: 0.3 });
    add(s, new T.ConeGeometry(0.16, 0.22, 10, 1, true), C.cream, [0, 0.3, 0.14], [1, 1, 1], {
      emissive: 0xffd9a0,
      emissiveIntensity: 1.1,
      side: T.DoubleSide
    });
    halo(s, 0xffd8a0, 0, 0.3, 0.16, 0.9);
  };
  const console = (g, x, z, w = 2, rot = 0) => {
    const c = new T.Group();
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    g.add(c);
    box(c, C.wood, 0, 0.5, 0, w, 1, 0.7);
    box(c, C.brass, 0, 1.0, 0, w + 0.05, 0.04, 0.75, { metalness: 0.7, roughness: 0.3 });
    box(c, 0x9affdf, 0, 1.1, -0.1, w * 0.7, 0.05, 0.4, { emissive: 0x5fe2bd, emissiveIntensity: 0.9 });
    return c;
  };
  const ladderHatch = (g, p, up, h = WALL_H) => {
    if (up) {
      for (const sx of [-1, 1])
        cyl(g, C.brass, p.x + sx * 0.45, h / 2 + 0.3, p.z - 0.8, 0.04, h + 0.6, { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < Math.round(h / 0.38); i++)
        box(g, C.brass, p.x, 0.4 + i * 0.38, p.z - 0.8, 1, 0.05, 0.05, { metalness: 0.8, roughness: 0.3 });
      box(g, 0x120b06, p.x, h + 0.1, p.z, 1.4, 0.4, 1.8);
    } else {
      box(g, 0x120b06, p.x, -0.1, p.z, 1.4, 0.22, 1.8);
      for (const sx of [-1, 1])
        cyl(g, C.brass, p.x + sx * 0.45, 0.4, p.z - 0.8, 0.04, 1.2, { metalness: 0.8, roughness: 0.3 });
      box(g, C.brass, p.x, 1.0, p.z - 0.8, 1, 0.05, 0.05, { metalness: 0.8, roughness: 0.3 });
    }
  };
  const decorBench = (g, p) => {
    box(g, C.wood, p.x, 0.45, p.z, 0.9, 0.9, 2.4);
    box(g, C.woodLight, p.x, 0.92, p.z, 1, 0.06, 2.5);
    for (let i = 0; i < 4; i++)
      box(g, [C.brass, C.iron, C.velvet, C.teal][i], p.x, 1.0, p.z - 0.9 + i * 0.6, 0.3, 0.1, 0.3);
    box(g, 0x9affdf, p.x + (p.x < 0 ? 0.3 : -0.3), 1.3, p.z, 0.05, 0.5, 0.8, {
      emissive: 0x5fe2bd,
      emissiveIntensity: 0.9
    });
  };
  const pt = id => CABIN_POINTS.find(v => v.id === id);
  // ---------- 1F 生物艙: aquariums along the walls for water creatures, open floor for land ones ----------
  {
    const g = floors[1],
      [hall] = ROOMS.creatures,
      wall = tex(texWall, 6, 1);
    add(g, new T.BoxGeometry(hall.x1 - hall.x0, 0.2, hall.z1 - hall.z0), 0, [0, -0.1, 0]).material = tex(
      texFloor,
      7,
      5
    );
    roomWalls(g, hall, wall);
    ceiling(g, hall, 0x3b2616);
    for (const z of [-5, 1, 6]) porthole(g, hall.x0 + 0.02, 2.3, z, Math.PI / 2);
    for (const x of [-7, 0, 7]) chandelier(g, x, 0);
    for (const z of [-5, 5]) sconce(g, hall.x0 + 0.2, 2.1, z, Math.PI / 2);
    for (const tk of TANKS) {
      const m = tankMesh(tk.w, tk.d, tk.h);
      m.position.set(tk.x, 0, tk.z);
      m.rotation.y = tk.rot;
      g.add(m);
    }
    point(g, 0x7fe0f0, 0, 1.4, -7.5, 7, 16);
    point(g, 0x7fe0f0, 11.5, 1.4, -1, 5, 12);
    // a patch of turf in the middle where land creatures like to gather
    box(g, C.soil, -3, 0.04, 3, 9, 0.08, 6);
    box(g, C.grass, -3, 0.09, 3, 8.6, 0.04, 5.6, { roughness: 0.95 });
    add(g, new T.DodecahedronGeometry(0.6, 1), 0x7c8488, [-6.5, 0.45, 5], [1.3, 0.75, 1]);
    console(g, pt('creature-desk').x, pt('creature-desk').z, 2);
    decorBench(g, pt('decor1'));
    ladderHatch(g, pt('ladder-down'), false);
    ladderHatch(g, pt('ladder2-up'), true);
  }
  // ---------- 2F 御獸艙: a high hall where your beasts roam ----------
  {
    const g = floors[2],
      H = FLOORS[2].h,
      [hall, foyer] = ROOMS.beasts,
      wall = tex(texWall, 7, 1.3);
    add(g, new T.BoxGeometry(hall.x1 - hall.x0, 0.2, hall.z1 - hall.z0), 0, [0, -0.1, 0]).material = tex(
      texFloorDark,
      8,
      6
    );
    add(g, new T.BoxGeometry(foyer.x1 - foyer.x0, 0.2, foyer.z1 - foyer.z0), 0, [0, -0.1, 12.5]).material = tex(
      texFloor,
      3,
      1
    );
    roomWalls(g, hall, wall, { n: [[foyer.x0, foyer.x1]] }, H);
    roomWalls(g, foyer, wall, { s: [[foyer.x0, foyer.x1]] }, WALL_H);
    ceiling(g, hall, 0x2a1a10, true, H);
    ceiling(g, foyer, 0x3b2616, false, WALL_H);
    // the hatch door at the end of the foyer
    box(g, C.wood, 0, 1.3, 13.85, 2.2, 2.6, 0.18);
    box(g, C.brass, 0, 1.3, 13.72, 2.3, 0.08, 0.06, { metalness: 0.8, roughness: 0.3 });
    add(g, new T.TorusGeometry(0.32, 0.05, 8, 20), C.brass, [0, 1.5, 13.7], [1, 1, 1], {
      metalness: 0.8,
      roughness: 0.3
    });
    for (const x of [-12, -6, 6, 12]) porthole(g, x, 2.8, hall.z0 - 0.02, 0);
    for (const z of [-8, -3, 2]) {
      porthole(g, hall.x0 + 0.02, 2.8, z, Math.PI / 2);
      porthole(g, hall.x1 - 0.02, 2.8, z, Math.PI / 2);
    }
    for (const x of [-8, 0, 8]) chandelier(g, x, -1, H);
    for (const z of [-6, 4]) {
      sconce(g, hall.x0 + 0.2, 2.6, z, Math.PI / 2);
      sconce(g, hall.x1 - 0.2, 2.6, z, -Math.PI / 2);
    }
    // a contract sigil inlaid in the floor
    add(g, new T.RingGeometry(3.2, 3.5, 48), C.brass, [0, 0.01, -1], [1, 1, 1], {
      emissive: 0xd6b15c,
      emissiveIntensity: 0.4,
      side: T.DoubleSide
    }).rotation.x = -Math.PI / 2;
    add(g, new T.RingGeometry(2.2, 2.32, 6), C.brass, [0, 0.012, -1], [1, 1, 1], {
      emissive: 0xd6b15c,
      emissiveIntensity: 0.5,
      side: T.DoubleSide
    }).rotation.x = -Math.PI / 2;
    // the stair up to the bridge
    {
      const p = pt('bridge-stair');
      for (let i = 0; i < 14; i++) {
        const y = 0.15 + i * 0.32,
          z = p.z - 1.6 + i * 0.25;
        box(g, C.woodLight, p.x, y, z, 2.4, 0.08, 0.34);
        box(g, C.wood, p.x, y - 0.14, z - 0.1, 2.4, 0.22, 0.08);
      }
      for (const sx of [-1, 1])
        for (let i = 0; i < 7; i++)
          cyl(g, C.brass, p.x + sx * 1.25, 0.45 + i * 0.65, p.z - 1.5 + i * 0.5, 0.025, 0.9, {
            metalness: 0.8,
            roughness: 0.3
          });
      box(g, 0x120b06, p.x, H + 0.16, p.z + 1.4, 2.6, 0.34, 2.4);
    }
    console(g, pt('beast-desk').x, pt('beast-desk').z, 2.2);
    decorBench(g, pt('decor'));
    ladderHatch(g, pt('ladder2-down'), false);
  }
  // ---------- hold ----------
  {
    const g = floors[0],
      [hold] = ROOMS.hold,
      wall = tex(texIron, 6, 1);
    add(g, new T.BoxGeometry(hold.x1 - hold.x0, 0.2, hold.z1 - hold.z0), 0, [0, -0.1, 0]).material = tex(
      texFloorDark,
      6,
      4
    );
    roomWalls(g, hold, wall);
    ceiling(g, hold, 0x2b2f33, false);
    for (const x of [-8, 0, 8])
      cyl(g, C.iron, x, WALL_H - 0.35, 0, 0.18, hold.z1 - hold.z0, { metalness: 0.6, roughness: 0.5 }).rotation.x =
        Math.PI / 2;
    for (const z of [-5, 0, 5])
      cyl(g, 0x5a3f27, 0, WALL_H - 0.6, z, 0.12, hold.x1 - hold.x0, undefined, 8).rotation.z = Math.PI / 2;
    for (const x of [-6, 6]) {
      cyl(g, C.iron, x, WALL_H - 0.5, 0, 0.03, 0.8);
      add(g, new T.ConeGeometry(0.45, 0.4, 14, 1, true), C.iron, [x, WALL_H - 1, 0], [1, 1, 1], { side: T.DoubleSide });
      add(g, new T.SphereGeometry(0.12, 10, 8), 0xfff0c0, [x, WALL_H - 1.12, 0], [1, 1, 1], {
        emissive: 0xffc070,
        emissiveIntensity: 2
      });
      halo(g, 0xffd8a0, x, WALL_H - 1.1, 0, 2.2);
      point(g, 0xffd0a0, x, WALL_H - 1.2, 0, 14, 16);
    }
    for (const id of ['cargo-b', 'cargo-a']) {
      const p = CABIN_POINTS.find(v => v.id === id),
        provisions = id === 'cargo-a';
      for (let i = 0; i < 4; i++)
        box(
          g,
          provisions ? 0xa8835a : 0x6b4b2e,
          p.x - 1.1 + (i % 2) * 1.1,
          0.5 + Math.floor(i / 2) * 1,
          p.z - 0.2,
          1,
          0.95,
          1
        );
      for (let i = 0; i < 3; i++) cyl(g, provisions ? 0x2e5f7c : 0x8b5e3c, p.x + 1.2, 0.5, p.z - 0.6 + i * 0.6, 0.3, 1);
      for (let i = 0; i < 2; i++)
        box(g, C.brass, p.x - 1.1 + i * 1.1, 1.0, p.z - 0.2, 1.02, 0.06, 1.02, { metalness: 0.7, roughness: 0.3 });
      console(g, p.x, p.z + 1.4, 1.6, Math.PI);
    }
    {
      const p = CABIN_POINTS.find(v => v.id === 'ladder-up');
      for (const s of [-1, 1])
        cyl(g, C.brass, p.x + s * 0.45, WALL_H / 2 + 0.3, p.z - 0.8, 0.04, WALL_H + 0.6, {
          metalness: 0.8,
          roughness: 0.3
        });
      for (let i = 0; i < 10; i++)
        box(g, C.brass, p.x, 0.4 + i * 0.38, p.z - 0.8, 1, 0.05, 0.05, { metalness: 0.8, roughness: 0.3 });
      box(g, 0x120b06, p.x, WALL_H + 0.1, p.z, 1.4, 0.4, 1.8);
    }
    for (const z of [-6, 6]) {
      sconce(g, hold.x0 + 0.2, 2.1, z, Math.PI / 2);
      sconce(g, hold.x1 - 0.2, 2.1, z, -Math.PI / 2);
    }
    box(g, 0x5a3f27, -9, 0.4, 5, 2.4, 0.8, 1.2);
    for (let i = 0; i < 5; i++) cyl(g, 0x8b5e3c, 8.5 - i * 0.9, 0.5, -2.5 + (i % 2) * 0.9, 0.36, 1);
  }
  // ---------- furniture ----------
  const meshes = new Map();
  let ghost = null;
  function buildItem(type) {
    const g = new T.Group(),
      def = CABIN_ITEMS[type],
      [w, d, h] = def.size,
      brass = { metalness: 0.8, roughness: 0.3 };
    switch (type) {
      case 'sofa':
      case 'armchair': {
        box(g, C.velvet, 0, 0.3, 0.05, w, 0.4, d - 0.2);
        box(g, C.velvetDark, 0, 0.6, -d / 2 + 0.14, w, 0.6, 0.26);
        for (const s of [-1, 1]) box(g, C.velvetDark, (s * (w - 0.22)) / 2, 0.45, 0.05, 0.22, 0.5, d - 0.2);
        const n = type === 'sofa' ? 3 : 1;
        for (let i = 0; i < n; i++)
          box(
            g,
            0x8f3c49,
            -((n - 1) * (w - 0.5)) / (2 * n) + (i * (w - 0.5)) / n,
            0.5,
            0.1,
            (w - 0.5) / n - 0.06,
            0.16,
            d - 0.45
          );
        for (const sx of [-1, 1])
          for (const sz of [-1, 1])
            cyl(g, C.brass, (sx * (w - 0.3)) / 2, 0.06, (sz * (d - 0.3)) / 2, 0.03, 0.12, brass);
        break;
      }
      case 'table':
        cyl(g, C.woodLight, 0, h - 0.03, 0, w / 2, 0.06, undefined, 24);
        add(g, new T.TorusGeometry(w / 2, 0.025, 8, 36), C.brass, [0, h - 0.03, 0], [1, 1, 1], brass).rotation.x =
          Math.PI / 2;
        cyl(g, C.wood, 0, h / 2 - 0.05, 0, 0.09, h - 0.1);
        cyl(g, C.wood, 0, 0.04, 0, w / 3.2, 0.08, undefined, 20);
        add(g, new T.SphereGeometry(0.12, 10, 8), C.glass, [0, h + 0.1, 0], [1, 1.3, 1], {
          transparent: true,
          opacity: 0.6
        });
        break;
      case 'lamp':
        cyl(g, C.brass, 0, 0.04, 0, 0.22, 0.08, brass);
        cyl(g, C.brass, 0, h / 2, 0, 0.025, h - 0.3, brass);
        add(g, new T.ConeGeometry(0.28, 0.4, 16, 1, true), C.cream, [0, h - 0.15, 0], [1, 1, 1], {
          emissive: 0xffd9a0,
          emissiveIntensity: 1.2,
          side: T.DoubleSide
        });
        halo(g, 0xffd8a0, 0, h - 0.1, 0, 1.6);
        break;
      case 'plant':
        cyl(g, 0x8a5a3c, 0, 0.3, 0, 0.35, 0.6, undefined, 12);
        cyl(g, C.soil, 0, 0.6, 0, 0.3, 0.05, undefined, 12);
        cyl(g, 0x5a3a22, 0, 1.1, 0, 0.06, 1.1, undefined, 8);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2,
            f = add(
              g,
              new T.ConeGeometry(0.18, 1.2, 5),
              0x4f8a3e,
              [Math.cos(a) * 0.45, 1.75, Math.sin(a) * 0.45],
              [1, 1, 0.25]
            );
          f.rotation.z = Math.cos(a) * 1.15;
          f.rotation.x = -Math.sin(a) * 1.15;
        }
        break;
      case 'rug':
        box(g, 0x8a4a3c, 0, 0.02, 0, w, 0.04, d);
        box(g, 0xc99a5c, 0, 0.045, 0, w - 0.4, 0.01, d - 0.4);
        box(g, 0x8a4a3c, 0, 0.05, 0, w - 0.9, 0.01, d - 0.9);
        break;
      case 'bookcase': {
        box(g, C.wood, 0, h / 2, 0, w, h, d);
        for (let i = 0; i < 4; i++) {
          const y = 0.2 + i * ((h - 0.4) / 4);
          box(g, 0x2a1810, 0, y + (h - 0.4) / 8, d * 0.05, w - 0.16, (h - 0.4) / 4 - 0.05, d - 0.16);
          let x = -w / 2 + 0.14;
          while (x < w / 2 - 0.2) {
            const bw = 0.06 + Math.random() * 0.08,
              col = [0x9e3b32, 0x2e7c78, 0xd6b15c, 0x3f5a8a, 0x7a4a2a][Math.floor(Math.random() * 5)];
            box(g, col, x + bw / 2, y + 0.19, 0.02, bw, 0.3 + Math.random() * 0.08, d - 0.24);
            x += bw + 0.02;
          }
        }
        box(g, C.brass, 0, h + 0.02, 0, w + 0.04, 0.04, d + 0.04, brass);
        break;
      }
      case 'bed':
        box(g, C.wood, 0, 0.25, 0, w, 0.5, d);
        box(g, 0xf0e6d2, 0, 0.6, 0, w - 0.1, 0.25, d - 0.1);
        box(g, C.velvet, 0, 0.74, 0.4, w - 0.1, 0.05, d - 1.2);
        for (const s of [-1, 1]) box(g, 0xffffff, s * 0.45, 0.8, -d / 2 + 0.45, 0.7, 0.16, 0.5);
        box(g, C.wood, 0, h / 2 + 0.3, -d / 2 + 0.05, w, h + 0.6, 0.1);
        box(g, C.brass, 0, h + 0.62, -d / 2 + 0.05, w + 0.04, 0.05, 0.14, brass);
        break;
      case 'bar':
        box(g, C.wood, 0, 0.5, 0, w, 1, d);
        add(g, new T.BoxGeometry(w + 0.2, 0.08, d + 0.3), 0, [0, 1.04, 0]).material = tex(texMarble, 3, 1);
        box(g, C.brass, 0, 0.2, d / 2 + 0.1, w, 0.04, 0.04, brass);
        for (let i = 0; i < 4; i++)
          cyl(
            g,
            [0x3fbfa0, 0xd6b15c, 0x9e3b32, 0x6fd0ff][i],
            -w / 2 + 0.4 + i * ((w - 0.8) / 3),
            1.26,
            -0.15,
            0.06,
            0.36,
            {
              emissive: [0x3fbfa0, 0xd6b15c, 0x9e3b32, 0x6fd0ff][i],
              emissiveIntensity: 0.5,
              transparent: true,
              opacity: 0.85
            }
          );
        for (const x of [-w / 3, w / 3]) {
          cyl(g, C.brass, x, 0.35, d / 2 + 0.6, 0.04, 0.7, brass);
          cyl(g, C.velvet, x, 0.74, d / 2 + 0.6, 0.22, 0.1, undefined, 16);
        }
        break;
      case 'aquarium': {
        const t = tankMesh(w, d, h);
        t.children.forEach(c => g.add(c.clone()));
        break;
      }
      case 'chest':
        box(g, C.wood, 0, 0.3, 0, w, 0.6, d);
        add(g, new T.CylinderGeometry(d / 2, d / 2, w, 16, 1, false, 0, Math.PI), C.wood, [0, 0.6, 0]).rotation.z =
          Math.PI / 2;
        for (const x of [-w / 3, w / 3]) {
          box(g, C.brass, x, 0.3, 0, 0.08, 0.62, d + 0.02, brass);
          add(
            g,
            new T.TorusGeometry(d / 2 + 0.01, 0.03, 6, 20, Math.PI),
            C.brass,
            [x, 0.6, 0],
            [1, 1, 1],
            brass
          ).rotation.y = Math.PI / 2;
        }
        break;
      case 'piano':
        box(g, 0x1a1412, 0, 0.75, 0.1, w, 0.5, d - 0.4, { roughness: 0.2, metalness: 0.2 });
        box(g, 0x1a1412, 0, 0.98, 0.3, w - 0.1, 0.05, d - 0.9, { roughness: 0.2 }).rotation.x = -0.6;
        box(g, 0xf4f0e6, 0, 0.78, -d / 2 + 0.25, w - 0.2, 0.06, 0.35);
        for (let i = 0; i < 10; i++)
          box(g, 0x111111, -w / 2 + 0.2 + i * ((w - 0.4) / 9), 0.82, -d / 2 + 0.2, 0.05, 0.04, 0.2);
        for (const [x, z] of [
          [-w / 2 + 0.2, -d / 2 + 0.2],
          [w / 2 - 0.2, -d / 2 + 0.2],
          [0, d / 2 - 0.3]
        ])
          cyl(g, 0x1a1412, x, 0.25, z, 0.05, 0.5);
        cyl(g, 0x1a1412, 0, 0.5, -d / 2 - 0.3, 0.2, 0.08, undefined, 16);
        cyl(g, 0x1a1412, 0, 0.25, -d / 2 - 0.3, 0.04, 0.5);
        break;
      case 'perch':
        for (const s of [-1, 1]) cyl(g, 0x5a3a22, s * 0.5, 0.45, 0, 0.14, 0.9, undefined, 8);
        cyl(g, 0x7a5436, 0, 0.95, 0, 0.13, w, undefined, 8).rotation.z = Math.PI / 2;
        box(g, C.grass, 0, 0.05, 0, w, 0.1, d, { roughness: 0.95 });
        break;
      case 'fountain': {
        add(g, new T.CylinderGeometry(w / 2, w / 2 + 0.1, 0.5, 24), 0, [0, 0.25, 0]).material = tex(texMarble, 2, 1);
        add(g, new T.CircleGeometry(w / 2 - 0.1, 24), C.water, [0, 0.46, 0], [1, 1, 1], {
          transparent: true,
          opacity: 0.8,
          emissive: 0x0b4a52,
          emissiveIntensity: 0.6
        }).rotation.x = -Math.PI / 2;
        cyl(g, C.marble, 0, 0.8, 0, 0.1, 0.7, undefined, 12);
        add(g, new T.SphereGeometry(0.14, 12, 10), 0xbfe6ee, [0, 1.2, 0], [1, 1, 1], {
          emissive: 0x7ec8e8,
          emissiveIntensity: 1.4
        });
        halo(g, 0x9fe0f0, 0, 1.2, 0, 1.4);
        break;
      }
      default:
        box(g, C.wood, 0, h / 2, 0, w, h, d);
    }
    return g;
  }
  const ghostMats = {
    ok: new T.MeshBasicMaterial({ color: 0x7fe0a8, transparent: true, opacity: 0.45, depthWrite: false }),
    bad: new T.MeshBasicMaterial({ color: 0xff7a6e, transparent: true, opacity: 0.45, depthWrite: false })
  };
  return {
    group,
    floors,
    lights,
    // keep the furniture meshes in step with the save
    setItems(items = []) {
      const seen = new Set();
      for (const it of items) {
        seen.add(it.id);
        let m = meshes.get(it.id);
        if (!m || m.userData.type !== it.type) {
          if (m) m.parent.remove(m);
          m = buildItem(it.type);
          m.userData.type = it.type;
          meshes.set(it.id, m);
        }
        if (m.parent !== floors[it.floor]) floors[it.floor].add(m);
        m.position.set(it.x, 0, it.z);
        m.rotation.y = it.rot;
      }
      for (const [id, m] of meshes)
        if (!seen.has(id)) {
          m.parent?.remove(m);
          meshes.delete(id);
        }
    },
    // the translucent preview while placing; type null hides it
    setGhost(type, floor, x, z, rot, ok) {
      if (!type) {
        if (ghost) ghost.visible = false;
        return;
      }
      if (!ghost || ghost.userData.type !== type) {
        if (ghost) ghost.parent?.remove(ghost);
        ghost = buildItem(type);
        ghost.userData.type = type;
        ghost.traverse(o => {
          if (o.isMesh) o.userData.ghost = true;
          if (o.isPointLight) o.visible = false;
        });
      }
      ghost.traverse(o => {
        if (o.isMesh && o.userData.ghost) o.material = ok ? ghostMats.ok : ghostMats.bad;
      });
      if (ghost.parent !== floors[floor]) floors[floor].add(ghost);
      ghost.visible = true;
      ghost.position.set(x, 0.02, z);
      ghost.rotation.y = rot;
    },
    update(t, floor) {
      const wm = tankMats.water;
      if (wm) wm.emissiveIntensity = 0.65 + Math.sin(t * 1.3) * 0.1;
      floors.forEach((f, i) => (f.visible = i === floor || i === floor - 1 || i === floor + 1));
    }
  };
}
