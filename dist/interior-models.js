// 0.71: the rooms of 慈光港 drawn — room 0412, the empty diner and the admin block (rules: interiors.js). Walls are
// built where a room's edge has no room beyond it, so the admin block's corridor opens into both halls.
import * as T from './vendor/three.module.min.js';
import { INTERIORS, INTERIOR_Y, interiorWorld } from './interiors.js?v=0.73.0';

const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const TONES = {
  warm: { floor: 0x8b6a4a, wall: 0xd8cab0, ceil: 0xe8e0d0, light: 0xffd6a0, trim: 0x6b4f35 },
  cold: { floor: 0xc9d1d6, wall: 0xe4eaed, ceil: 0xf2f5f6, light: 0xe2f4ff, trim: 0x9aa5ab }
};
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
const inAny = (def, x, z) => def.rects.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
// wall segments along the rooms' edges where nothing walkable lies beyond
function wallSegments(def) {
  const out = [],
    step = 0.25;
  for (const r of def.rects)
    for (const [ax, az, bx, bz, nx, nz] of [
      [r.x0, r.z0, r.x1, r.z0, 0, -1],
      [r.x0, r.z1, r.x1, r.z1, 0, 1],
      [r.x0, r.z0, r.x0, r.z1, -1, 0],
      [r.x1, r.z0, r.x1, r.z1, 1, 0]
    ]) {
      const len = Math.hypot(bx - ax, bz - az),
        n = Math.round(len / step);
      let start = null;
      for (let i = 0; i <= n; i++) {
        const t = Math.min(1, (i + 0.5) / n),
          x = ax + (bx - ax) * t,
          z = az + (bz - az) * t,
          open = i < n && inAny(def, x + nx * 0.2, z + nz * 0.2);
        if (!open && i < n && start === null) start = i;
        if ((open || i === n) && start !== null) {
          const t0 = start / n,
            t1 = i / n;
          out.push({
            x0: ax + (bx - ax) * t0,
            z0: az + (bz - az) * t0,
            x1: ax + (bx - ax) * t1,
            z1: az + (bz - az) * t1,
            nx,
            nz
          });
          start = null;
        }
      }
    }
  return out;
}
function shell(def) {
  const g = new T.Group(),
    tone = TONES[def.tone],
    floorM = mat(tone.floor, { roughness: 0.7 }),
    ceilM = mat(tone.ceil),
    wallM = mat(tone.wall, { roughness: 0.95 }),
    trimM = mat(tone.trim);
  for (const r of def.rects) {
    const w = r.x1 - r.x0,
      d = r.z1 - r.z0,
      cx = (r.x0 + r.x1) / 2,
      cz = (r.z0 + r.z1) / 2;
    const floor = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), floorM);
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    g.add(floor);
    const ceil = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(Math.PI / 2), ceilM);
    ceil.position.set(cx, def.h, cz);
    g.add(ceil);
    // a lamp in the middle of each room
    const lamp = new T.Mesh(
      new T.CylinderGeometry(0.35, 0.35, 0.06, 16),
      mat(0xffffff, { emissive: tone.light, emissiveIntensity: 2 })
    );
    lamp.position.set(cx, def.h - 0.04, cz);
    g.add(lamp);
    const light = new T.PointLight(tone.light, def.tone === 'cold' ? 22 : 16, Math.max(w, d) * 1.6, 1.6);
    light.position.set(cx, def.h - 0.3, cz);
    g.add(light);
  }
  for (const s of wallSegments(def)) {
    const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
    if (len < 0.05) continue;
    const along = s.nz !== 0,
      wall = new T.Mesh(new T.BoxGeometry(along ? len : 0.15, def.h, along ? 0.15 : len), wallM);
    wall.position.set((s.x0 + s.x1) / 2 + s.nx * 0.075, def.h / 2, (s.z0 + s.z1) / 2 + s.nz * 0.075);
    wall.receiveShadow = true;
    g.add(wall);
    const skirt = new T.Mesh(new T.BoxGeometry(along ? len : 0.04, 0.14, along ? 0.04 : len), trimM);
    skirt.position.set((s.x0 + s.x1) / 2 - s.nx * 0.01, 0.07, (s.z0 + s.z1) / 2 - s.nz * 0.01);
    g.add(skirt);
  }
  return g;
}
const box = (g, w, h, d, color, x, y, z, extra) => {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), color.isMaterial ? color : mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
};
function door(g, p, wallZ) {
  const m = box(g, 1, 2.1, 0.08, 0x4a3426, p.x, 1.05, wallZ);
  box(g, 0.08, 0.08, 0.06, 0xc9a35a, p.x + 0.35, 1.0, wallZ + (wallZ > 0 ? -0.06 : 0.06), { metalness: 0.7 });
  return m;
}
function room0412(g, def) {
  const P = id => def.points.find(q => q.id === id);
  door(g, P('door'), 3.95);
  const bed = P('bed');
  box(g, bed.w, 0.35, bed.d, 0x6b4f35, bed.x, 0.2, bed.z);
  box(g, bed.w - 0.1, 0.18, bed.d - 0.1, 0xf4f1ea, bed.x, 0.46, bed.z);
  box(g, 0.9, 0.12, 0.4, 0xffffff, bed.x, 0.62, bed.z - bed.d / 2 + 0.3);
  box(g, bed.w - 0.06, 0.05, bed.d * 0.55, 0x9fb7c9, bed.x, 0.57, bed.z + bed.d * 0.2);
  const desk = P('desk');
  box(g, desk.w, 0.06, desk.d, 0x7a5a3c, desk.x, 0.76, desk.z);
  for (const sx of [-1, 1])
    box(g, 0.06, 0.74, desk.d - 0.06, 0x6b4f35, desk.x + sx * (desk.w / 2 - 0.05), 0.37, desk.z);
  box(g, 0.32, 0.04, 0.24, 0xe9e1cc, desk.x - 0.2, 0.81, desk.z + 0.05);
  box(g, 0.45, 0.45, 0.45, 0x6b4f35, desk.x, 0.25, desk.z + 0.75);
  // the window: the plaza, painted — its statue's shadow falling the wrong way
  const view = canvasTex(256, 160, (x, w, h) => {
    const sky = x.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#9fc6dc');
    sky.addColorStop(1, '#e8eef0');
    x.fillStyle = sky;
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#c4bdae';
    x.fillRect(0, h * 0.62, w, h);
    x.fillStyle = '#7d766a';
    x.fillRect(w * 0.47, h * 0.36, w * 0.06, h * 0.28);
    x.beginPath();
    x.arc(w * 0.5, h * 0.33, w * 0.06, 0, Math.PI * 2);
    x.fillStyle = '#e9c66a';
    x.fill();
    x.fillStyle = '#00000044';
    x.beginPath();
    x.moveTo(w * 0.47, h * 0.64);
    x.lineTo(w * 0.53, h * 0.64);
    x.lineTo(w * 0.15, h * 0.9);
    x.lineTo(w * 0.02, h * 0.9);
    x.fill();
  });
  const win = new T.Mesh(new T.PlaneGeometry(1.6, 1), new T.MeshBasicMaterial({ map: view, toneMapped: false }));
  win.position.set(0, 1.5, -3.92);
  g.add(win);
  box(g, 1.75, 0.08, 0.12, 0xf3efe6, 0, 0.96, -3.9);
  const wr = P('wardrobe');
  box(g, wr.w, 2, wr.d, 0x8d6a47, wr.x, 1, wr.z);
  const leaf = box(g, 0.04, 1.9, wr.d / 2, 0x7a5a3c, wr.x - wr.w / 2 - 0.12, 1, wr.z - wr.d / 4);
  leaf.rotation.y = 0.5;
}
function diner(g, def) {
  const P = id => def.points.find(q => q.id === id);
  door(g, P('door'), -3.95);
  const wood = mat(0x7a5a3c),
    bowl = mat(0xf2ede2, { roughness: 0.4 }),
    soup = mat(0xc98a3e, { roughness: 0.3, emissive: 0x3a2008, emissiveIntensity: 0.4 });
  const table = (x, z) => {
    box(g, 1.2, 0.06, 1.2, wood, x, 0.74, z);
    box(g, 0.1, 0.72, 0.1, wood, x, 0.36, z);
    for (const [dx, dz] of [
      [0.75, 0],
      [-0.75, 0]
    ])
      box(g, 0.42, 0.45, 0.42, 0x5b3a2a, x + dx, 0.23, z + dz);
    const b = new T.Mesh(new T.CylinderGeometry(0.14, 0.09, 0.08, 14), bowl);
    b.position.set(x, 0.81, z);
    g.add(b);
    const s = new T.Mesh(new T.CircleGeometry(0.12, 14).rotateX(-Math.PI / 2), soup);
    s.position.set(x, 0.84, z);
    g.add(s);
    box(g, 0.02, 0.01, 0.16, 0xcfd2d4, x + 0.22, 0.78, z, { metalness: 0.8 });
  };
  for (const [x, z] of [
    [-3.4, -1.6],
    [-0.8, -1.6],
    [3.4, -1.6],
    [-4.2, 1]
  ])
    table(x, z);
  const till = P('till');
  box(g, till.w, 1, till.d, 0x6b4f35, till.x, 0.5, till.z);
  box(g, 0.45, 0.3, 0.4, 0x2c2f33, till.x + 0.6, 1.15, till.z, { metalness: 0.4 });
  const st = P('stove');
  box(g, st.w, 0.9, st.d, 0x9aa1a6, st.x, 0.45, st.z, { metalness: 0.5 });
  const pot = new T.Mesh(new T.CylinderGeometry(0.22, 0.2, 0.25, 14), mat(0x5a5f63, { metalness: 0.7 }));
  pot.position.set(st.x - 0.3, 1.03, st.z);
  g.add(pot);
  g.userData.steam = [];
  // steam over every bowl and the pot (it rises, and never stops)
  const puff = canvasTex(64, 64, (x, w, h) => {
    const r = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    r.addColorStop(0, '#ffffffaa');
    r.addColorStop(1, '#ffffff00');
    x.fillStyle = r;
    x.fillRect(0, 0, w, h);
  });
  for (const [x, z, y] of [
    [-3.4, -1.6, 0.9],
    [-0.8, -1.6, 0.9],
    [3.4, -1.6, 0.9],
    [-4.2, 1, 0.9],
    [st.x - 0.3, st.z, 1.2]
  ])
    for (let i = 0; i < 3; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0.5 }));
      sp.position.set(x, y, z);
      sp.scale.setScalar(0.25);
      sp.userData = { x, z, y, phase: i / 3 };
      g.add(sp);
      g.userData.steam.push(sp);
    }
}
function admin(g, def) {
  const P = id => def.points.find(q => q.id === id);
  door(g, P('door'), 5.95);
  // the monitor wall: every square a room, one bed with someone lying still
  const scr = P('screens'),
    grid = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#0b1418';
      x.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 8; c++) {
          const px = 6 + c * 63,
            py = 6 + r * 63;
          x.fillStyle = '#1d3a44';
          x.fillRect(px, py, 57, 57);
          x.fillStyle = '#9cc7d4';
          x.fillRect(px + 8, py + 34, 26, 12);
          x.fillStyle = r === 2 && c === 5 ? '#e9d2b4' : '#4b6e7a';
          x.fillRect(px + 10, py + 30, 10, 6);
        }
    });
  const wall = new T.Mesh(
    new T.PlaneGeometry(6, 3),
    new T.MeshStandardMaterial({ map: grid, emissive: 0xffffff, emissiveMap: grid, emissiveIntensity: 0.9 })
  );
  wall.position.set(scr.x - 0.33, 1.7, scr.z);
  wall.rotation.y = Math.PI / 2;
  g.add(wall);
  const terminal = q => {
    box(g, q.w, 0.95, q.d, 0x8b969c, q.x, 0.48, q.z, { metalness: 0.4 });
    const s = new T.Mesh(
      new T.PlaneGeometry(0.7, 0.45),
      new T.MeshStandardMaterial({ color: 0x0a2a24, emissive: 0x3ee0b0, emissiveIntensity: 0.6 })
    );
    s.position.set(q.x, 1.25, q.z);
    s.lookAt(q.x - (q.x > 0 ? 1 : -1), 1.25, q.z);
    g.add(s);
  };
  for (const id of ['terminal-a', 'terminal-b', 'terminal-c']) terminal(P(id));
  // the hall of tanks: glass full of pale green, a body floating in each
  const glass = new T.MeshStandardMaterial({
      color: 0x9ff5d0,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      emissive: 0x3aa880,
      emissiveIntensity: 0.5,
      depthWrite: false
    }),
    body = mat(0xd8c3ad, { roughness: 0.6 });
  g.userData.bodies = [];
  for (let i = 0; i < 5; i++) {
    const x = -5 + i * 2.5,
      z = -21.5;
    const tank = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 2.6, 20, 1, true), glass);
    tank.position.set(x, 1.4, z);
    g.add(tank);
    box(g, 1.6, 0.2, 1.6, 0x7e888d, x, 0.1, z, { metalness: 0.5 });
    box(g, 1.6, 0.2, 1.6, 0x7e888d, x, 2.8, z, { metalness: 0.5 });
    const b = new T.Mesh(new T.CapsuleGeometry(0.2, 1, 4, 10), body);
    b.position.set(x, 1.4, z);
    b.userData.phase = i;
    g.add(b);
    g.userData.bodies.push(b);
    // B-12, the middle one: a label with your number
    if (i === 2) {
      const label = canvasTex(128, 48, (x2, w, h) => {
        x2.fillStyle = '#f1f4f2';
        x2.fillRect(0, 0, w, h);
        x2.fillStyle = '#222';
        x2.font = 'bold 18px sans-serif';
        x2.textAlign = 'center';
        x2.fillText('B-12 · 0412', w / 2, 30);
      });
      const tag = new T.Mesh(new T.PlaneGeometry(0.5, 0.19), new T.MeshBasicMaterial({ map: label }));
      tag.position.set(x, 0.55, z + 0.82);
      g.add(tag);
    }
  }
  // 0.73: B-01, at the far left — shown in chapter four (with 晴 in it, or empty and waiting)
  {
    const q = P('tank-b01'),
      b01 = new T.Group();
    b01.position.set(q.x, 0, q.z);
    const tank = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 2.6, 20, 1, true), glass);
    tank.position.y = 1.4;
    b01.add(tank);
    box(b01, 1.6, 0.2, 1.6, 0x7e888d, 0, 0.1, 0, { metalness: 0.5 });
    box(b01, 1.6, 0.2, 1.6, 0x7e888d, 0, 2.8, 0, { metalness: 0.5 });
    const body = new T.Mesh(new T.CapsuleGeometry(0.2, 1, 4, 10), mat(0xe2cdb6, { roughness: 0.6 }));
    body.position.y = 1.4;
    body.userData.phase = 9;
    b01.add(body);
    const label = canvasTex(128, 48, (x2, w, h) => {
      x2.fillStyle = '#f1f4f2';
      x2.fillRect(0, 0, w, h);
      x2.fillStyle = '#222';
      x2.font = 'bold 18px sans-serif';
      x2.textAlign = 'center';
      x2.fillText('B-01 · 0001', w / 2, 30);
    });
    const tag = new T.Mesh(new T.PlaneGeometry(0.5, 0.19), new T.MeshBasicMaterial({ map: label }));
    tag.position.set(0.82, 0.55, 0);
    tag.rotation.y = Math.PI / 2;
    b01.add(tag);
    b01.visible = false;
    g.add(b01);
    g.userData.b01 = { group: b01, body };
  }
  const tl = new T.PointLight(0x7dffc8, 10, 12, 1.6);
  tl.position.set(0, 1.4, -20);
  g.add(tl);
}
// Every room, each in its pocket under its building. `{ groups: { room, diner, admin } }`
export function makeInteriors() {
  const groups = {};
  for (const [id, def] of Object.entries(INTERIORS)) {
    const g = new T.Group(),
      at = interiorWorld(id, { x: 0, z: 0 });
    g.position.set(at.x, INTERIOR_Y, at.z);
    g.add(shell(def));
    (id === 'room' ? room0412 : id === 'diner' ? diner : admin)(g, def);
    g.visible = false;
    groups[id] = g;
  }
  return { groups };
}
export function animateInteriors(it, inside, t, flags = {}) {
  for (const [id, g] of Object.entries(it.groups)) g.visible = id === inside;
  const g = it.groups[inside];
  if (!g) return;
  if (g.userData.b01) {
    g.userData.b01.group.visible = !!flags.b01;
    g.userData.b01.body.visible = !!flags.b01Body;
    g.userData.b01.body.position.y = 1.4 + Math.sin(t * 0.5) * 0.04;
  }
  for (const sp of g.userData.steam || []) {
    const k = (t * 0.25 + sp.userData.phase) % 1;
    sp.position.set(sp.userData.x + Math.sin(t + k * 6) * 0.04, sp.userData.y + k * 0.6, sp.userData.z);
    sp.material.opacity = 0.45 * Math.sin(k * Math.PI);
    sp.scale.setScalar(0.18 + k * 0.3);
  }
  for (const b of g.userData.bodies || []) b.position.y = 1.4 + Math.sin(t * 0.6 + b.userData.phase) * 0.05;
}
