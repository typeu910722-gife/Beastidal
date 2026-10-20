// 0.47 慈光港: the town past the mountains, drawn. Clean white streets, every window lit, shoes at the doors, a
// meal still steaming — and nobody. At the plaza's heart 慈愛組織's statue: two open hands holding up a sun.
// Layout and rules: town.js.
import * as T from './vendor/three.module.min.js';
import { TOWN, WALL, GATE_HALF, BUILDINGS, STATUE, STELE, BOARD, GUIDE_AT, LAMPS } from './town.js?v=0.67.0';
import { grainTexture } from './realism.js?v=0.67.0';
import { tr } from './i18n.js?v=0.67.0';
import { dressWithProp } from './props.js?v=0.67.0';
import { surface } from './surfaces.js?v=0.67.0';

let seed = 412;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
function add(g, geo, material, x, y, z, ry = 0) {
  const m = new T.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}
const box = (g, material, x, y, z, w, h, d, ry = 0) => add(g, new T.BoxGeometry(w, h, d), material, x, y, z, ry);
// 0.54: a painted sign board (the text is drawn on a canvas, in the player's language)
function sign(text, w, h, bg = '#f4efe2', fg = '#5a4636') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = fg;
  x.lineWidth = 10;
  x.strokeRect(12, 12, c.width - 24, c.height - 24);
  x.fillStyle = fg;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let size = c.height * 0.5;
  x.font = `600 ${size}px "Noto Serif TC", "Songti TC", serif`;
  while (x.measureText(text).width > c.width * 0.86 && size > 12) x.font = `600 ${(size -= 4)}px serif`;
  x.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new T.Mesh(new T.BoxGeometry(w, h, 0.08), [
    ...Array(4).fill(new T.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.8 })),
    new T.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
    new T.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.8 })
  ]);
  m.castShadow = true;
  return m;
}

export function makeTown() {
  seed = 412;
  const g = new T.Group();
  g.position.set(TOWN.x, 0, TOWN.z);
  const grain = grainTexture().clone();
  grain.repeat.set(40, 40);
  grain.needsUpdate = true;
  // 0.48: the land around the town is dome-models.js's (rolling country under the dome)
  // paving inside the walls, and the road out of the gate
  // 0.65: laid in stone setts (surfaces.js), the plane turned in its geometry so the pattern lies flat
  const paving = surface(mat(0xc4bdae, { roughness: 0.95 }), 'stone', { blocks: true, clean: true });
  const floor = new T.Mesh(new T.PlaneGeometry(WALL * 2, WALL * 2).rotateX(-Math.PI / 2), paving);
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  g.add(floor);
  const road = new T.Mesh(new T.PlaneGeometry(14, 90), mat(0x9c8f74, { roughness: 1, bumpMap: grain }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.03, WALL + 44);
  road.receiveShadow = true;
  g.add(road);
  // a ring of darker stone round the plaza
  const ring = new T.Mesh(new T.RingGeometry(9, 11, 48), mat(0xb8b0a0, { roughness: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  g.add(ring);
  // 0.65: the street pieces (wall, gate, statue, stele, board, lamp posts): models/props/town-street.glb replaces them
  const street = new T.Group();
  street.name = 'street';
  g.add(street);
  // the wall, with its gate on the south side
  const wallMat = mat(0xe8e2d4, { roughness: 0.9, bumpMap: grain, bumpScale: 0.4 });
  const W = WALL,
    H = 4.2;
  box(street, wallMat, 0, H / 2, -W, W * 2 + 1, H, 1);
  box(street, wallMat, -W, H / 2, 0, 1, H, W * 2 + 1);
  box(street, wallMat, W, H / 2, 0, 1, H, W * 2 + 1);
  const side = (W - GATE_HALF) / 2 + GATE_HALF;
  box(street, wallMat, -side, H / 2, W, W - GATE_HALF, H, 1);
  box(street, wallMat, side, H / 2, W, W - GATE_HALF, H, 1);
  // the gate: two pillars and a lintel carrying the sun
  const gold = mat(0xe9c46a, { metalness: 0.6, roughness: 0.35, emissive: 0x6b4a10, emissiveIntensity: 0.4 });
  for (const x of [-GATE_HALF - 0.4, GATE_HALF + 0.4]) box(street, wallMat, x, 3.6, W, 1.6, 7.2, 1.8);
  box(street, wallMat, 0, 7.6, W, GATE_HALF * 2 + 4, 1.2, 1.9);
  const gateSun = add(street, new T.CircleGeometry(1.4, 32), gold, 0, 9.4, W + 0.96);
  gateSun.castShadow = false;
  add(street, new T.TorusGeometry(1.75, 0.12, 8, 36), gold, 0, 9.4, W + 0.9);

  // buildings: plaster walls, a cornice, a roof, doors, and windows that glow at night
  const plaster = [0xf1ece0, 0xe9e3d3, 0xf4efe6, 0xe2dccb].map(c =>
    mat(c, { roughness: 0.92, bumpMap: grain, bumpScale: 0.25 })
  );
  const roofMat = mat(0x8a5a44, { roughness: 0.8, flatShading: true });
  const trim = mat(0xcfc6b2, { roughness: 0.8 });
  const doorMat = mat(0x5a4636, { roughness: 0.7 });
  const poleMat0 = mat(0x3b3d40, { metalness: 0.6, roughness: 0.4 });
  const plinth = mat(0xa79f8e, { roughness: 0.95, bumpMap: grain, bumpScale: 0.5 });
  const windowMat = new T.MeshStandardMaterial({
    color: 0x2a2c30,
    emissive: 0xffd9a0,
    emissiveIntensity: 0.15,
    roughness: 0.3,
    metalness: 0.2
  });
  const frosted = new T.MeshStandardMaterial({ color: 0xdfe6ea, emissive: 0xf2f6ff, emissiveIntensity: 0.05 });
  const windows = [],
    frost = [];
  // 0.65: the buildings' own parts, kept apart: the Blender model of the town (models/props/town.glb) replaces them
  // all when you first get there (dressTown); the signs, shoes, lights and cameras stay as they are
  const blocks = new T.Group();
  blocks.name = 'blocks';
  g.add(blocks);
  for (const b of BUILDINGS) {
    const p = plaster[Math.floor(rnd() * plaster.length)];
    box(blocks, p, b.x, b.h / 2, b.z, b.w, b.h, b.d);
    box(blocks, trim, b.x, b.h + 0.15, b.z, b.w + 0.5, 0.3, b.d + 0.5);
    // 0.54: a stone plinth, and a band of trim between the floors
    box(blocks, plinth, b.x, 0.3, b.z, b.w + 0.16, 0.6, b.d + 0.16);
    for (let f = 1; f * 3.2 < b.h - 1; f++) box(blocks, trim, b.x, f * 3.2 + 0.2, b.z, b.w + 0.14, 0.14, b.d + 0.14);
    if (b.id !== 'welcome' && b.id !== 'admin' && b.id !== 'kiosk') {
      // a pitched roof along the longer side
      const along = b.w >= b.d,
        len = (along ? b.w : b.d) + 0.6,
        span = (along ? b.d : b.w) + 0.8,
        roof = new T.CylinderGeometry(span / 2 / Math.cos(Math.PI / 6), span / 2 / Math.cos(Math.PI / 6), len, 3, 1);
      roof.rotateZ(Math.PI / 2);
      if (!along) roof.rotateY(Math.PI / 2);
      roof.scale(1, 0.55, 1);
      add(blocks, roof, roofMat, b.x, b.h + 0.3 + span * 0.14, b.z);
    }
    // windows on every face, floor by floor
    const floors = Math.max(1, Math.floor((b.h - 1) / 3.2));
    for (const [nx, nz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const face = nx ? b.d : b.w,
        count = Math.max(1, Math.floor(face / 3.2));
      for (let f = 0; f < floors; f++)
        for (let i = 0; i < count; i++) {
          const u = (i + 0.5) / count - 0.5;
          const pos = {
            x: b.x + (nx ? (nx * b.w) / 2 + nx * 0.03 : u * face),
            y: 2 + f * 3.2,
            z: b.z + (nz ? (nz * b.d) / 2 + nz * 0.03 : u * face),
            ry: nx ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : nz > 0 ? 0 : Math.PI
          };
          pos.house = b.id.startsWith('house');
          (b.id === 'admin' ? frost : windows).push(pos);
        }
    }
    // the door faces where you stand to use the building (or the plaza, for the houses)
    const d = b.door || { x: b.x - Math.sign(b.x) * 0.0001, z: b.z - Math.sign(b.z) * (b.d / 2 + 1) };
    const dx = d.x - b.x,
      dz = d.z - b.z,
      onX = Math.abs(dx) / b.w > Math.abs(dz) / b.d;
    const door = {
      x: onX ? b.x + Math.sign(dx) * (b.w / 2 + 0.04) : b.x + Math.max(-b.w / 2 + 1, Math.min(b.w / 2 - 1, dx)),
      z: onX ? b.z + Math.max(-b.d / 2 + 1, Math.min(b.d / 2 - 1, dz)) : b.z + Math.sign(dz) * (b.d / 2 + 0.04),
      ry: onX ? Math.PI / 2 : 0
    };
    box(blocks, doorMat, door.x, 1.15, door.z, onX ? 0.08 : 1.4, 2.3, onX ? 1.4 : 0.08);
    // 0.54: a door frame, a step, and a little canopy over the door
    {
      const nx = onX ? Math.sign(dx) : 0,
        nz = onX ? 0 : Math.sign(dz),
        along = (a, b) => (onX ? b : a);
      box(blocks, trim, door.x - nx * 0.02, 1.25, door.z - nz * 0.02, along(1.8, 0.1), 2.6, along(0.1, 1.8));
      box(blocks, plinth, door.x + nx * 0.35, 0.08, door.z + nz * 0.35, along(2, 0.7), 0.16, along(0.7, 2));
      if (b.id !== 'welcome') {
        const canopy = box(
          g,
          roofMat,
          door.x + nx * 0.5,
          2.85,
          door.z + nz * 0.5,
          along(2.3, 1.1),
          0.1,
          along(1.1, 2.3)
        );
        if (onX) canopy.rotation.z = -nx * 0.2;
        else canopy.rotation.x = nz * 0.2;
        for (const k of [-0.9, 0.9])
          box(
            blocks,
            doorMat,
            door.x + nx * 0.4 + (onX ? 0 : k),
            2.6,
            door.z + nz * 0.4 + (onX ? k : 0),
            0.06,
            0.4,
            0.06
          );
      }
      if (b.name && b.id !== 'welcome') {
        const admin = b.id === 'admin';
        const plate = sign(
          admin ? tr('管理區 · 非請勿入') : tr(b.name),
          admin ? 3.4 : 2.8,
          0.7,
          admin ? '#eef2f4' : '#f4efe2',
          admin ? '#43515a' : '#5a4636'
        );
        plate.position.set(door.x + nx * 0.06, b.h > 4.5 ? 3.55 : 3.1, door.z + nz * 0.06);
        plate.rotation.y = onX ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : nz > 0 ? 0 : Math.PI;
        g.add(plate);
      }
    }
    // 0.54: balconies up the residents' apartment, facing the street
    if (b.id === 'apartment') {
      const rail = new T.MeshStandardMaterial({ color: 0xdfe8ea, transparent: true, opacity: 0.45, roughness: 0.1 });
      const count = Math.floor(b.d / 3.2);
      for (let f = 1; f < Math.floor((b.h - 1) / 3.2); f++)
        for (let i = 1; i < count; i += 2) {
          const z = b.z + ((i + 0.5) / count - 0.5) * b.d,
            x = b.x - b.w / 2 - 0.6,
            y = f * 3.2 + 0.3;
          box(blocks, trim, x, y, z, 1.2, 0.16, 2.6);
          box(blocks, rail, x - 0.58, y + 0.5, z, 0.04, 0.9, 2.6);
          box(blocks, poleMat0, x - 0.58, y + 0.97, z, 0.08, 0.06, 2.65);
        }
    }
    // shoes left at the door, as if someone just went in
    if (b.id.startsWith('house') || b.id === 'apartment') {
      const out = { x: onX ? Math.sign(dx) * 0.5 : 0, z: onX ? 0 : Math.sign(dz) * 0.5 };
      const shoe = mat(rnd() < 0.5 ? 0x2f2a25 : 0x7b5b3a, { roughness: 0.6 });
      for (const k of [-0.13, 0.13])
        box(
          g,
          shoe,
          door.x + out.x + (onX ? 0 : k),
          0.05,
          door.z + out.z + (onX ? k : 0),
          onX ? 0.26 : 0.1,
          0.1,
          onX ? 0.1 : 0.26
        );
    }
    if (b.id === 'welcome') {
      // a portico of columns and the sun over the doors
      for (let i = -2; i <= 2; i++) {
        if (!i) continue;
        add(blocks, new T.CylinderGeometry(0.35, 0.4, 6, 14), wallMat, i * 3.2, 3, b.z + b.d / 2 + 2.2);
      }
      box(blocks, wallMat, 0, 6.3, b.z + b.d / 2 + 2.2, 15, 0.6, 3.2);
      add(blocks, new T.CircleGeometry(1.1, 32), gold, 0, 7.6, b.z + b.d / 2 + 0.06);
    }
  }
  // 0.54: frames and sills round every window, shutters on the houses, and instanced so they cost four draws
  const shutterMat = mat(0x6f8a94, { roughness: 0.75 });
  const instance = (geo, material, list, place) => {
    const m = new T.InstancedMesh(geo, material, list.length),
      o = new T.Object3D();
    list.forEach((w, i) => {
      o.position.set(w.x, w.y, w.z);
      o.rotation.set(0, w.ry, 0);
      place(o, w, i);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.castShadow = m.receiveShadow = true;
    blocks.add(m);
    return m;
  };
  const allWindows = [...windows, ...frost];
  instance(new T.BoxGeometry(1.62, 1.92, 0.08), trim, allWindows, o => o.translateZ(-0.03));
  instance(new T.BoxGeometry(1.8, 0.12, 0.3), trim, allWindows, o => o.translateY(-0.96).translateZ(0.1));
  const shuttered = windows.filter(w => w.house);
  instance(new T.BoxGeometry(0.6, 1.7, 0.06), shutterMat, [...shuttered, ...shuttered], (o, w, i) =>
    o.translateX(i < shuttered.length ? -1.12 : 1.12).translateZ(0.03)
  );
  // flower boxes under the houses' ground-floor windows: someone waters them every morning
  const blooms = shuttered.filter(w => w.y < 3);
  instance(new T.BoxGeometry(1.4, 0.28, 0.32), mat(0x7b5b3a), blooms, o => o.translateY(-1.15).translateZ(0.2));
  instance(
    new T.SphereGeometry(0.2, 8, 6),
    mat(0xd77a8a, { roughness: 0.9 }),
    [...blooms, ...blooms, ...blooms],
    (o, w, i) =>
      o
        .translateY(-0.92)
        .translateZ(0.22)
        .translateX(((i / blooms.length) | 0) * 0.45 - 0.45)
  );
  const quad = new T.PlaneGeometry(1.3, 1.6);
  for (const [list, material] of [
    [windows, windowMat],
    [frost, frosted]
  ]) {
    const m = new T.InstancedMesh(quad, material, list.length),
      o = new T.Object3D();
    list.forEach((w, i) => {
      o.position.set(w.x, w.y, w.z);
      o.rotation.set(0, w.ry, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    blocks.add(m);
  }
  // the admin block's door light, only at night
  const doorLight = new T.Mesh(
    new T.PlaneGeometry(0.06, 2.2),
    new T.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0 })
  );
  const admin = BUILDINGS.find(b => b.id === 'admin');
  doorLight.position.set(admin.x - admin.w / 2 - 0.06, 1.15, admin.z);
  doorLight.rotation.y = Math.PI / 2;
  g.add(doorLight);
  // 0.54: the admin block wears the sun over its door, and watches the plaza
  add(blocks, new T.CircleGeometry(0.9, 32), gold, admin.x - admin.w / 2 - 0.05, admin.h - 2, admin.z, -Math.PI / 2);
  add(
    blocks,
    new T.TorusGeometry(1.1, 0.08, 8, 32),
    gold,
    admin.x - admin.w / 2 - 0.06,
    admin.h - 2,
    admin.z,
    -Math.PI / 2
  );
  const camBody = mat(0x2a2d31, { metalness: 0.5, roughness: 0.4 }),
    camEye = new T.MeshStandardMaterial({ color: 0x300000, emissive: 0xff3030, emissiveIntensity: 1.5 });
  for (const [x, z, ry] of [
    [admin.x - admin.w / 2 - 0.4, admin.z - admin.d / 2 + 0.4, -2.2],
    [admin.x - admin.w / 2 - 0.4, admin.z + admin.d / 2 - 0.4, -1],
    [-GATE_HALF - 0.4, WALL - 1.2, Math.PI]
  ]) {
    const cam = new T.Group();
    cam.position.set(x, x < 0 ? 6.4 : admin.h - 0.8, z);
    cam.rotation.y = ry;
    const body = new T.Mesh(new T.BoxGeometry(0.28, 0.24, 0.6), camBody);
    body.rotation.x = 0.35;
    const eye = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), camEye);
    eye.position.set(0, -0.08, 0.31);
    cam.add(body, eye);
    g.add(cam);
  }

  // the statue: a pedestal, two open hands, and the sun they hold up
  const stone = mat(0xf2eee6, { roughness: 0.6, bumpMap: grain, bumpScale: 0.15 });
  add(street, new T.CylinderGeometry(STATUE.r, STATUE.r + 0.3, 1.2, 32), stone, STATUE.x, 0.6, STATUE.z);
  add(street, new T.CylinderGeometry(1.2, 1.5, 1.6, 24), stone, STATUE.x, 2, STATUE.z);
  for (const s of [-1, 1]) {
    const palm = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    palm.scale(1.1, 0.5, 1.7);
    const hand = add(street, palm, stone, STATUE.x + s * 0.9, 3.15, STATUE.z);
    hand.rotation.set(Math.PI, 0, s * 0.55);
    for (let f = 0; f < 4; f++) {
      const finger = add(
        street,
        new T.CapsuleGeometry(0.17, 0.9, 4, 8),
        stone,
        STATUE.x + s * 1.75,
        3.65,
        STATUE.z - 0.75 + f * 0.5
      );
      finger.rotation.z = s * 0.35;
    }
  }
  const sun = add(
    g,
    new T.SphereGeometry(0.9, 32, 20),
    new T.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc860, emissiveIntensity: 1.2, roughness: 0.3 }),
    STATUE.x,
    4.4,
    STATUE.z
  );
  sun.castShadow = false;
  const halo = add(g, new T.TorusGeometry(1.5, 0.07, 8, 48), gold, STATUE.x, 4.4, STATUE.z);
  // the message stele, the bulletin board
  add(
    street,
    new T.BoxGeometry(1.5, 3.2, 0.5),
    mat(0x55575c, { roughness: 0.7, bumpMap: grain }),
    STELE.x,
    1.6,
    STELE.z
  );
  box(street, doorMat, BOARD.x - 0.6, 0.9, BOARD.z, 0.12, 1.8, 0.12);
  box(street, doorMat, BOARD.x + 0.6, 0.9, BOARD.z, 0.12, 1.8, 0.12);
  box(street, mat(0xf3eedf), BOARD.x, 1.6, BOARD.z, 1.6, 1, 0.08);
  add(street, new T.CircleGeometry(0.18, 20), gold, BOARD.x + 0.55, 1.95, BOARD.z + 0.05);
  // the letter kiosk's wall of numbered mailboxes
  const kiosk = BUILDINGS.find(b => b.id === 'kiosk');
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++)
      box(blocks, gold, kiosk.x + kiosk.w / 2 + 0.06, 1 + r * 0.55, kiosk.z - 1.2 + c * 0.8, 0.06, 0.45, 0.65);
  // the diner: a table out front with a bowl that still steams
  const diner = BUILDINGS.find(b => b.id === 'diner');
  const tz = diner.z - diner.d / 2 - 1.8;
  box(g, doorMat, diner.x, 0.75, tz, 1.4, 0.08, 0.9);
  for (const [x, z] of [
    [-0.6, -0.35],
    [0.6, -0.35],
    [-0.6, 0.35],
    [0.6, 0.35]
  ])
    box(g, doorMat, diner.x + x, 0.37, tz + z, 0.06, 0.74, 0.06);
  const chair = box(g, doorMat, diner.x + 0.2, 0.45, tz + 0.95, 0.5, 0.06, 0.5);
  chair.rotation.y = 0.5; // pushed back, as if someone just stood up
  add(g, new T.CylinderGeometry(0.16, 0.1, 0.1, 16), mat(0xf4f1ea), diner.x - 0.2, 0.84, tz);
  const steam = [];
  const steamMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const p = add(g, new T.SphereGeometry(0.05, 8, 6), steamMat, diner.x - 0.2, 0.9, tz);
    p.castShadow = false;
    p.userData.phase = i / 6;
    steam.push(p);
  }
  // footprints across the plaza: people pass here, though you never see them
  const prints = [];
  for (let k = 0; k < 9; k++) {
    let x = (rnd() - 0.5) * 70,
      z = (rnd() - 0.5) * 70;
    const a = rnd() * Math.PI * 2;
    for (let i = 0; i < 14; i++) {
      x += Math.sin(a) * 0.7;
      z += Math.cos(a) * 0.7;
      if (Math.abs(x) < WALL - 1 && Math.abs(z) < WALL - 1)
        prints.push({ x: x + Math.cos(a) * (i % 2 ? 0.14 : -0.14), z: z - Math.sin(a) * (i % 2 ? 0.14 : -0.14), a });
    }
  }
  {
    const geo = new T.CircleGeometry(0.11, 10);
    geo.scale(1, 2.1, 1);
    const m = new T.InstancedMesh(
        geo,
        new T.MeshStandardMaterial({ color: 0x9a9384, transparent: true, opacity: 0.55, depthWrite: false }),
        prints.length
      ),
      o = new T.Object3D();
    prints.forEach((p, i) => {
      o.position.set(p.x, 0.02, p.z);
      o.rotation.set(-Math.PI / 2, 0, p.a);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    g.add(m);
  }
  // street lamps round the plaza and along the main street
  const lamps = [];
  const lampMat = new T.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd990, emissiveIntensity: 0.1 });
  const poleMat = mat(0x3b3d40, { metalness: 0.6, roughness: 0.4 });
  for (const { x, z } of LAMPS) {
    add(street, new T.CylinderGeometry(0.07, 0.09, 4, 8), poleMat, x, 2, z);
    lamps.push(add(g, new T.SphereGeometry(0.28, 14, 10), lampMat, x, 4.15, z));
  }
  const glow = new T.PointLight(0xffd9a0, 0, 60, 1.6);
  glow.position.set(0, 7, 0);
  g.add(glow);
  // the guide: 晴, in white, waiting in front of the welcome centre
  g.userData = { windowMat, frosted, lampMat, glow, doorLight, sun, halo, steam, blocks, street };
  return g;
}

// 0.65: the Blender town (scripts/blender/town.py): loaded the first time you get here, then it takes the place of
// the box buildings. Its window panes take the town's own glass, which lights up at night (animateTown).
export function dressTown(g) {
  const u = g.userData;
  if (u.dressed) return u.dressed;
  dressWithProp(u.street, 'town-street');
  return (u.dressed = dressWithProp(u.blocks, 'town').then(ok => {
    if (ok)
      u.blocks.traverse(o => {
        if (o.isMesh && o.material.name === 'window') o.material = u.windowMat;
        else if (o.isMesh && o.material.name === 'frosted') o.material = u.frosted;
      });
    return ok;
  }));
}

// Night lights, the sun's slow turn, the soup's steam.
export function animateTown(g, t, night) {
  const u = g.userData;
  const k = night ? 1 : 0;
  u.windowMat.emissiveIntensity += (0.15 + k * 0.75 - u.windowMat.emissiveIntensity) * 0.05;
  u.lampMat.emissiveIntensity += (0.1 + k * 1.6 - u.lampMat.emissiveIntensity) * 0.05;
  u.frosted.emissiveIntensity += (0.05 + k * 0.6 - u.frosted.emissiveIntensity) * 0.05;
  u.glow.intensity += (k * 160 - u.glow.intensity) * 0.05;
  u.doorLight.material.opacity = night ? 0.7 + Math.sin(t * 1.3) * 0.15 : 0;
  u.halo.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.1;
  u.halo.rotation.z = t * 0.2;
  for (const p of u.steam) {
    const k2 = (t * 0.35 + p.userData.phase) % 1;
    p.position.y = 0.9 + k2 * 0.7;
    p.position.x = BUILDINGS.find(b => b.id === 'diner').x - 0.2 + Math.sin(t * 2 + k2 * 6) * 0.05;
    p.scale.setScalar(1 + k2 * 2.5);
    p.material.opacity = 0.25;
  }
}
export const GUIDE_WORLD = { x: TOWN.x + GUIDE_AT.x, z: TOWN.z + GUIDE_AT.z };
