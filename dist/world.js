import { expansionModels } from './expansion-models.js?v=0.13.0';
import { normalizeExpansion, EXPLORE } from './expansion.js?v=0.13.0';
import { normalizeHousing, penId } from './housing.js?v=0.13.0';
import { makeCreature, animateCreature, setCreatureDetail } from './creatures.js?v=0.13.0';
export { makeCreature } from './creatures.js?v=0.13.0';
import { makeIslands } from './island-models.js?v=0.13.0';
import { facilityId } from './facilities.js?v=0.13.0';
import * as T from './vendor/three.module.min.js';
import { phenotype, seeded } from './genetics.js?v=0.13.0';
import { QUALITY, loadSettings, saveSettings, makeSky, makeWater, Atmosphere, SPLASHES } from './realism.js?v=0.13.0';
import { PostFX } from './postfx.js?v=0.13.0';
import { makeHuman, animateHuman } from './human.js?v=0.13.0';
import { loadProtagonist, dressHuman } from './protagonist.js?v=0.13.0';
import { waveHeight, floatPose, WakeTrail } from './physics.js?v=0.13.0';
import { buildError } from './rules.js?v=0.13.0';
import { makeWarship, dockMesh, LOUNGE_SLOTS } from './ship-models.js?v=0.13.0';
import { DECKS, toWorld, restPlace, restIsland, dockMoor } from './ship.js?v=0.13.0';
import { SHIP_SLOTS, FORTRESS_DECK_Y, FORTRESS_SCALE, facilityPos } from './fortress.js?v=0.13.0';
import { dayPhase } from './clock.js?v=0.13.0';
const V = T.Vector3;
const ISLAND_GROUND = 0.42; // top of the island terrain where land beasts stand
const colors = {
  wood: 0x7a6049,
  plank: 0x9a8a71,
  darkWood: 0x3b342c,
  rope: 0xa8957a,
  teal: 0x2f6b6a,
  cloth: 0xa49d86,
  metal: 0x4b5150,
  glow: 0x9affdf
};
const boxG = new T.BoxGeometry(1, 1, 1),
  sphereG = new T.SphereGeometry(1, 16, 12),
  coneG = new T.ConeGeometry(1, 1, 8),
  cylG = new T.CylinderGeometry(1, 1, 1, 12);
const mats = new Map();
function mat(color, extra = {}) {
  const key = JSON.stringify([color, extra]);
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({ color, roughness: 0.72, ...extra }));
  return mats.get(key);
}
function piece(parent, geometry, color, pos = [0, 0, 0], scale = [1, 1, 1], extra) {
  const m = new T.Mesh(geometry, mat(color, extra));
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(p, c, x, y, z, sx, sy, sz, extra) {
  return piece(p, boxG, c, [x, y, z], [sx, sy, sz], extra);
}
function ball(p, c, x, y, z, sx, sy = sx, sz = sx, extra) {
  return piece(p, sphereG, c, [x, y, z], [sx, sy, sz], extra);
}
function pole(p, c, x, y, z, r, h) {
  return piece(p, cylG, c, [x, y, z], [r, h, r]);
}
function rod(p, a, b, r, color) {
  const start = new V(...a),
    end = new V(...b),
    m = piece(p, cylG, color, start.clone().add(end).multiplyScalar(0.5).toArray(), [r, start.distanceTo(end), r]);
  m.quaternion.setFromUnitVectors(new V(0, 1, 0), end.sub(start).normalize());
  return m;
}
function fin(parent, color, side = 1, length = 1, type = 0) {
  const g = new T.BufferGeometry();
  const pts =
    type === 1
      ? [0, 0, 0, side * length, 0.1, -0.1, side * length * 0.8, 0.04, -1.6, 0, 0, -0.9]
      : [0, 0, 0.5, side * length, 0.08, -0.55, side * length * 0.4, 0, -1.2, 0, 0, -0.6];
  g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const mesh = new T.Mesh(g, mat(color, { side: T.DoubleSide, roughness: 0.45 }));
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

let woodTex, glowTex;
function woodTexture() {
  if (woodTex) return woodTex;
  const size = 128,
    data = new Uint8Array(size * size * 4),
    r = seeded(3982);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const grain = Math.sin(x * 0.42 + Math.sin(y * 0.055) * 1.8) + Math.sin(x * 1.6 + y * 0.014) * 0.25;
      const knot =
        Math.sin(Math.hypot((x - 63) * 1.1, (y - 51) * 0.34) * 0.8) *
        Math.exp(-Math.hypot(x - 63, (y - 51) * 0.5) * 0.09);
      const stain = Math.sin(x * 0.05 + y * 0.09) * Math.sin(y * 0.031 - x * 0.02),
        crack = Math.pow(Math.abs(Math.sin(x * 0.42 + Math.sin(y * 0.055) * 1.8)), 18),
        algae = Math.max(0, Math.sin(x * 0.07 + 1.3) * Math.sin(y * 0.045 + 0.4) - 0.55) * 2.2;
      const value = 200 + grain * 13 + knot * 18 + r() * 16 - Math.max(0, stain) * 34 - crack * 70;
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, value - algae * 40);
      data[i + 1] = Math.max(0, value - 8 - algae * 10);
      data[i + 2] = Math.max(0, value - 18 - algae * 45);
      data[i + 3] = 255;
    }
  woodTex = new T.DataTexture(data, size, size, T.RGBAFormat);
  woodTex.colorSpace = T.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = T.RepeatWrapping;
  woodTex.magFilter = T.LinearFilter;
  woodTex.minFilter = T.LinearMipmapLinearFilter;
  woodTex.generateMipmaps = true;
  woodTex.needsUpdate = true;
  woodTex.anisotropy = 4;
  return woodTex;
}
function halo(parent, color, x, y, z, size) {
  if (!glowTex) {
    const n = 64,
      d = new Uint8Array(n * n * 4);
    for (let yy = 0; yy < n; yy++)
      for (let xx = 0; xx < n; xx++) {
        let a = Math.max(0, 1 - Math.hypot(xx - n / 2, yy - n / 2) / (n / 2));
        a = Math.pow(a, 3);
        const i = (yy * n + xx) * 4;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = a * 200;
      }
    glowTex = new T.DataTexture(d, n, n, T.RGBAFormat);
    glowTex.magFilter = T.LinearFilter;
    glowTex.needsUpdate = true;
  }
  const sp = new T.Sprite(
    new T.SpriteMaterial({
      map: glowTex,
      color,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6
    })
  );
  sp.position.set(x, y, z);
  sp.scale.set(size, size, 1);
  parent.add(sp);
  return sp;
}

function floorMesh() {
  const g = new T.Group();
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const f = pole(g, 0x6e4a2f, x * 0.95, -0.12, z * 0.95, 0.42, 0.95);
      f.rotation.x = Math.PI / 2;
      for (const k of [-0.3, 0.3])
        piece(g, new T.TorusGeometry(0.43, 0.03, 5, 18), 0x2f3a3d, [x * 0.95, -0.12, z * 0.95 + k]);
    }
  for (const z of [-1.05, 0, 1.05])
    for (const x of [-1.45, 1.45])
      piece(g, new T.TorusGeometry(0.12, 0.03, 5, 10), colors.rope, [x, 0.3, z]).rotation.y = Math.PI / 2;
  for (let i = 0; i < 7; i++) box(g, i % 3 === 0 ? 0x9a8668 : colors.plank, (i - 3) * 0.49, 0.29, 0, 0.45, 0.2, 3.45);
  for (const x of [-1.45, 1.45]) {
    box(g, colors.darkWood, x, 0.06, 0, 0.17, 0.27, 3.4);
    for (const z of [-1.2, 1.2]) pole(g, 0x283e44, x, -0.21, z, 0.4, 0.7).rotation.z = Math.PI / 2;
  }
  for (const x of [-1.46, 1.46]) for (const z of [-1.44, 1.44]) ball(g, 0x695f4d, x, 0.405, z, 0.038, 0.018, 0.038);
  return g;
}
// Screens for the wreck desk: a cracked laptop stuck on a boot error and the handheld's dim lock screen.
const screenTex = {};
function screenTexture(kind) {
  if (screenTex[kind]) return screenTex[kind];
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = kind === 'laptop' ? 256 : 96;
  c.height = kind === 'laptop' ? 160 : 192;
  const x = c.getContext('2d'),
    w = c.width,
    h = c.height;
  x.fillStyle = kind === 'laptop' ? '#06131a' : '#041018';
  x.fillRect(0, 0, w, h);
  if (kind === 'laptop') {
    x.fillStyle = '#6fd8d0';
    x.font = 'bold 13px monospace';
    ['SYSTEM RECOVERY', '', 'DISK  ERR 0x5EA', 'CLOCK ????-??-??', 'NET   NO CARRIER', '', '> _'].forEach((l, i) =>
      x.fillText(l, 14, 24 + i * 18)
    );
    // dead pixel columns
    x.fillStyle = 'rgba(190,80,255,.45)';
    for (const cx of [61, 62, 170]) x.fillRect(cx, 0, 1, h);
  } else {
    x.fillStyle = '#9fe3d7';
    x.font = 'bold 22px monospace';
    x.fillText('03:17', 18, 70);
    x.font = '11px monospace';
    x.fillText('NO SIGNAL', 20, 92);
    x.fillStyle = '#e8a35a';
    x.fillRect(20, 150, 14, 6);
    x.strokeStyle = '#9fe3d7';
    x.strokeRect(19, 149, 40, 8);
  }
  // spider-web crack from one corner
  x.strokeStyle = 'rgba(230,245,245,.55)';
  x.lineWidth = 1;
  const ox = w * 0.82,
    oy = h * 0.18;
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + 0.3;
    x.beginPath();
    x.moveTo(ox, oy);
    let px = ox,
      py = oy;
    for (let k = 0; k < 4; k++) {
      px += Math.cos(a + Math.sin(k * 3 + i) * 0.4) * w * 0.12;
      py += Math.sin(a + Math.sin(k * 3 + i) * 0.4) * w * 0.12;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return (screenTex[kind] = t);
}
// The desk the protagonist woke up next to: warped planks, a dead laptop and the rugged handheld (until picked up).
function deskMesh(g) {
  const legs = [
    [-0.75, -0.4],
    [0.75, -0.4],
    [-0.75, 0.4],
    [0.72, 0.42]
  ];
  legs.forEach(([x, z], i) => pole(g, colors.darkWood, x, 0.83, z, 0.055, i === 3 ? 0.84 : 0.88));
  const top = box(g, colors.plank, 0, 1.3, 0, 1.75, 0.09, 1.0);
  top.rotation.z = -0.015;
  box(g, colors.darkWood, 0, 1.2, 0.47, 1.6, 0.14, 0.05);
  // laptop: scuffed base, lid tipped back, cracked screen glowing faintly
  const lap = new T.Group();
  lap.position.set(-0.25, 1.36, -0.05);
  lap.rotation.y = 0.22;
  box(lap, 0x2b2f31, 0, 0, 0, 0.62, 0.035, 0.42, { roughness: 0.55, metalness: 0.4 });
  box(lap, 0x45494a, 0, 0.02, 0.06, 0.52, 0.006, 0.2, { roughness: 0.8 });
  const lid = new T.Group();
  lid.position.set(0, 0.02, -0.2);
  lid.rotation.x = -1.85;
  box(lid, 0x2b2f31, 0, 0, 0.2, 0.62, 0.025, 0.4, { roughness: 0.55, metalness: 0.4 });
  const scr = new T.Mesh(
    new T.PlaneGeometry(0.56, 0.35),
    new T.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: screenTexture('laptop'),
      emissiveIntensity: 0.7,
      roughness: 0.2
    })
  );
  // the screen is the lid's underside when closed, so it faces the user once the lid is up
  scr.position.set(0, -0.014, 0.2);
  scr.rotation.x = Math.PI / 2;
  lid.add(scr);
  lap.add(lid);
  g.add(lap);
  // handheld device, face up, its screen breathing a little light
  const dev = new T.Group();
  dev.position.set(0.45, 1.36, 0.12);
  dev.rotation.y = -0.5;
  box(dev, 0x1e2426, 0, 0, 0, 0.17, 0.03, 0.32, { roughness: 0.7 });
  for (const z of [-0.155, 0.155]) box(dev, 0xb4762f, 0, 0, z, 0.18, 0.04, 0.03, { roughness: 0.85 });
  const face = new T.Mesh(
    new T.PlaneGeometry(0.13, 0.25),
    new T.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: screenTexture('device'),
      emissiveIntensity: 0.9,
      roughness: 0.15
    })
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.017;
  dev.add(face);
  halo(dev, 0x7fe0d0, 0, 0.1, 0, 0.6);
  dev.userData.handheld = true;
  g.add(dev);
  // salvage clutter: a dented can, a coil of wire, a crate stool
  pole(g, 0x6c6f6a, 0.65, 1.42, -0.3, 0.06, 0.16);
  piece(g, new T.TorusGeometry(0.1, 0.012, 5, 14), 0x8a5a33, [0.1, 1.36, 0.3], [1, 1, 1]).rotation.x = Math.PI / 2;
  box(g, colors.wood, 0.1, 0.72, 0.95, 0.6, 0.62, 0.5);
}
function buildingMesh(b) {
  const g = new T.Group();
  if (b.type === 'floor' || b.type === 'upperfloor') g.add(floorMesh());
  if (b.type === 'upperfloor') {
    for (const x of [-1.55, 1.55]) for (const z of [-1.55, 1.55]) pole(g, colors.darkWood, x, -1.4, z, 0.085, 3.3);
  }
  if (b.type === 'stairs') {
    for (let n = 0; n < 11; n++) box(g, colors.plank, -0.85, 0.45 + n * 0.3, -1.45 + n * 0.27, 1, 0.13, 0.34);
    for (const x of [-1.4, -0.3]) {
      rod(g, [x, 0.7, -1.5], [x, 3.7, 1.45], 0.06, colors.darkWood);
      rod(g, [x, 1.45, -1.5], [x, 4.4, 1.45], 0.04, colors.rope);
    }
  }
  if (b.type === 'chair') {
    for (const x of [-0.35, 0.35]) for (const z of [-0.35, 0.35]) pole(g, colors.wood, x, 0.67, z, 0.05, 0.55);
    box(g, colors.plank, 0, 0.98, 0, 0.85, 0.12, 0.8);
    box(g, colors.plank, 0, 1.35, -0.36, 0.85, 0.65, 0.1);
  }
  if (b.type === 'desk') deskMesh(g);
  if (b.type === 'table') {
    for (const x of [-0.7, 0.7]) for (const z of [-0.4, 0.4]) pole(g, colors.wood, x, 0.84, z, 0.06, 0.9);
    box(g, colors.plank, 0, 1.3, 0, 1.7, 0.15, 1.05);
  }
  if (b.type === 'lamp') {
    pole(g, colors.metal, 0, 1.5, 0, 0.05, 2.1);
    ball(g, colors.glow, 0, 2.6, 0, 0.17, 0.3, 0.17, { emissive: colors.glow, emissiveIntensity: b.off ? 0 : 1.5 });
    if (!b.off) {
      const light = new T.PointLight(0xc2f5d9, 10, 8);
      light.position.set(0, 2.6, 0);
      g.add(light);
      halo(g, 0xbbffcc, 0, 2.6, 0, 1.5);
    }
  }
  if (b.type === 'shelter') {
    // the roof (canvas, ridge, the lantern hung from it) lifts off while you are inside in third person
    const roof = (g.userData.roof = []);
    for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) pole(g, colors.darkWood, x, 1.3, z, 0.09, 2);
    for (const z of [-1.3, 1.3]) {
      roof.push(rod(g, [-1.45, 2.1, z], [0, 3.1, z], 0.06, colors.rope));
      roof.push(rod(g, [0, 3.1, z], [1.45, 2.1, z], 0.06, colors.rope));
    }
    roof.push(rod(g, [0, 3.1, -1.5], [0, 3.1, 1.5], 0.085, colors.wood));
    for (const side of [-1, 1]) {
      const pos = [],
        ix = [];
      for (let j = 0; j <= 12; j++)
        for (let k = 0; k <= 12; k++) {
          const u = j / 12,
            v = k / 12;
          pos.push(
            side * u * 1.6,
            3.1 - u * 0.95 - Math.sin(u * Math.PI) * 0.14 - Math.sin(v * Math.PI) * 0.08,
            -1.5 + v * 3
          );
          if (j && k) {
            const q = j * 13 + k;
            ix.push(q, q - 1, q - 14, q, q - 14, q - 13);
          }
        }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setIndex(ix);
      geo.computeVertexNormals();
      roof.push(piece(g, geo, side === 1 ? 0xccb885 : 0x42948d, [0, 0, 0], [1, 1, 1], { side: T.DoubleSide }));
    }
    box(g, colors.cloth, 0, 1.23, -1.19, 2.35, 1.74, 0.08);
    box(g, 0x546b58, 0, 0.55, -0.25, 1.2, 0.22, 1.6);
    box(g, colors.cloth, 0, 0.71, -0.75, 1, 0.18, 0.35);
    pole(g, colors.darkWood, 1.24, 2.15, 1.22, 0.075, 1.3);
    ball(g, 0xffc875, 1.24, 1.8, 1.22, 0.15, 0.23, 0.15, { emissive: 0xffbd6b, emissiveIntensity: 1.2 });
    const l = new T.PointLight(0xffd499, 6, 8);
    l.position.set(1.2, 1.8, 1.2);
    g.add(l);
  }
  if (b.type === 'dock') g.add(dockMesh(mat));
  if (b.type === 'shelter') {
    for (const s of [-1, 1])
      for (let k = 0; k < 5; k++) box(g, k % 2 ? 0xa98257 : 0xb8915f, s * 1.32, 0.62 + k * 0.3, -0.15, 0.08, 0.28, 2.3);
    for (let k = 0; k < 6; k++) box(g, k % 2 ? 0xa98257 : 0xb8915f, 0, 0.62 + k * 0.3, -1.32, 2.6, 0.28, 0.08);
    box(g, 0x7a5a3a, 0, 0.48, 0, 2.8, 0.14, 2.9);
    for (const s of [-1, 1]) box(g, 0x6b4b2e, s * 0.9, 0.5, 1.62, 0.12, 0.14, 0.5);
    box(g, 0x2e7c78, 0, 2.62, 1.36, 1.1, 0.32, 0.05);
    box(g, 0xd6b15c, 0, 2.62, 1.39, 0.8, 0.06, 0.02, { emissive: 0xb08a3a, emissiveIntensity: 0.5 });
    for (let k = 0; k < 3; k++) pole(g, 0x8b5e3c, -1.05 + k * 0.32, 0.75, -0.95, 0.13, 0.5);
    box(g, 0xd9cfaa, 0.7, 0.8, -0.9, 0.7, 0.12, 1);
  }
  if (b.type === 'collector') {
    pole(g, 0x3c747b, 0, 0.9, 0, 0.76, 1.1);
    for (const x of [-1.1, 1.1]) for (const z of [-1.1, 1.1]) pole(g, colors.wood, x, 1.48, z, 0.065, 2.2);
    const tarp = piece(g, new T.ConeGeometry(1.6, 0.65, 4, 1, true), 0x779f9b, [0, 2.15, 0], [1, 1, 1], {
      side: T.DoubleSide
    });
    tarp.rotation.y = Math.PI / 4;
    rod(g, [0, 1.85, 0], [0, 1.1, 0], 0.065, 0xc8d0b6);
    // sight glass on the tank: the blue column is the water you can draw
    pole(g, 0xcfe3e0, 0.78, 0.9, 0, 0.07, 1.0).material = new T.MeshStandardMaterial({
      color: 0xcfe3e0,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1
    });
    const water = pole(g, 0x3f8fc0, 0.78, 0.4, 0, 0.055, 1);
    water.material = new T.MeshStandardMaterial({ color: 0x3f8fc0, emissive: 0x174a66, emissiveIntensity: 0.4 });
    g.userData.gauge = water;
    g.userData.gaugeBase = 0.42;
    g.userData.gaugeH = 0.94;
  }
  if (b.type === 'pen') {
    for (const x of [-1.6, 1.6])
      for (const z of [-1.6, 1.6]) {
        pole(g, colors.wood, x, 0.5, z, 0.1, 1.5);
        ball(g, 0xd5b887, x, 0.99, z, 0.13);
      }
    for (const s of [-1, 1]) {
      rod(g, [-1.6, 0.6, s * 1.6], [1.6, 0.6, s * 1.6], 0.035, colors.rope);
      rod(g, [s * 1.6, 0.6, -1.6], [s * 1.6, 0.6, 1.6], 0.035, colors.rope);
      for (let j = -3; j <= 3; j++) {
        rod(g, [j * 0.48, 0.5, s * 1.6], [j * 0.48, -1.5, s * 1.6], 0.013, 0x8fc3b2);
        rod(g, [s * 1.6, 0.5, j * 0.48], [s * 1.6, -1.5, j * 0.48], 0.013, 0x8fc3b2);
      }
    }
    for (const x of [-1.75, 1.75]) box(g, colors.plank, x, 0.25, 0, 0.23, 0.17, 3.6);
  }
  if (b.type === 'hatchery') {
    for (const x of [-1, 1]) for (const z of [-0.65, 0.65]) pole(g, colors.metal, x, 0.8, z, 0.08, 1);
    box(g, 0x566d72, 0, 1.25, 0, 2.5, 0.18, 1.9);
    piece(g, cylG, 0x4c827f, [0, 1.44, 0], [0.65, 0.2, 0.65]);
    const dome = ball(g, 0xa8e8df, 0, 1.85, 0, 0.62, 0.7, 0.62, {
      transparent: true,
      opacity: 0.4,
      metalness: 0.3,
      roughness: 0.1
    });
    // the egg only sits in the dome while something is incubating; it glows brighter as it nears hatching
    const egg = ball(g, 0xbcffe0, 0, 1.8, 0, 0.23, 0.37, 0.23, { emissive: 0x98ffd9, emissiveIntensity: 1.1 });
    egg.material = egg.material.clone();
    egg.visible = false;
    g.userData.egg = egg;
    box(g, 0x25464d, 1.02, 1.43, 0.43, 0.36, 0.3, 0.5);
    box(g, 0xabdfb3, 1.02, 1.6, 0.43, 0.27, 0.035, 0.33, { emissive: 0x88ddb6, emissiveIntensity: 0.6 });
  }
  if (b.type === 'beacon') {
    for (const x of [-0.55, 0.55])
      for (const z of [-0.55, 0.55]) {
        rod(g, [x, 0.4, z], [x * 0.5, 4.6, z * 0.5], 0.1, colors.metal);
      }
    for (let j = 1; j < 5; j++) {
      rod(g, [-0.55, j, -0.55], [0.55, j, 0.55], 0.06, colors.metal);
      rod(g, [0.55, j, -0.55], [-0.55, j, 0.55], 0.06, colors.metal);
    }
    pole(g, colors.metal, 0, 4.8, 0, 0.49, 0.4);
    ball(g, 0xc0ffe3, 0, 5.3, 0, 0.35, 0.45, 0.35, { emissive: 0xb6ffdc, emissiveIntensity: 1.8 });
    pole(g, colors.metal, 0, 5.9, 0, 0.06, 0.7);
    const beam = piece(g, new T.CylinderGeometry(0.1, 1.3, 75, 12, 1, true), 0xa2ffcc, [0, 43, 0], [1, 1, 1], {
      transparent: true,
      opacity: 0.12,
      emissive: 0x70eeba,
      emissiveIntensity: 0.8,
      depthWrite: false,
      side: T.DoubleSide
    });
    beam.raycast = () => {};
  }
  if (b.type === 'collector') {
    for (const y of [0.46, 0.91, 1.39])
      piece(g, new T.TorusGeometry(0.77, 0.035, 6, 28), 0xc1b58f, [0, y, 0]).rotation.x = Math.PI / 2;
    rod(g, [0.7, 0.66, 0], [1, 0.66, 0], 0.06, colors.metal);
    pole(g, colors.metal, 1, 0.57, 0, 0.06, 0.19);
    box(g, 0xcadace, 0.3, 0.93, 0.72, 0.16, 0.67, 0.045);
    for (let y = 0.7; y < 1.2; y += 0.12) box(g, 0x466673, 0.3, y, 0.75, 0.13, 0.018, 0.02);
  }
  if (b.type === 'pen') {
    for (const z of [-1.75, 1.75]) box(g, colors.plank, 0, 0.25, z, 3.5, 0.17, 0.23);
    for (const side of [-1, 1])
      for (const y of [-1, -0.5, 0]) {
        rod(g, [-1.6, y, side * 1.6], [1.6, y, side * 1.6], 0.013, 0x8fc3b2);
        rod(g, [side * 1.6, y, -1.6], [side * 1.6, y, 1.6], 0.013, 0x8fc3b2);
      }
  }
  if (b.type === 'hatchery') {
    for (const y of [1.5, 2.35])
      piece(g, new T.TorusGeometry(0.63, 0.05, 8, 28), colors.metal, [0, y, 0]).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) rod(g, [side * 0.6, 1.48, 0], [side * 0.6, 2.3, 0], 0.035, colors.metal);
    for (let n = 0; n < 3; n++) pole(g, 0x9cdfd5, -0.92, 1.51, -0.5 + n * 0.3, 0.055, 0.4);
  }
  if (b.type === 'beacon') {
    for (const side of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const a = 0.55 - j * 0.06,
          b = 0.55 - (j + 1) * 0.06;
        rod(g, [-a, 0.5 + j, side * a], [b, 1.5 + j, side * b], 0.033, colors.metal);
      }
    for (const x of [-0.36, 0.36])
      for (const z of [-0.36, 0.36]) rod(g, [x, 4.94, z], [x, 5.7, z], 0.028, colors.metal);
    piece(g, new T.ConeGeometry(0.63, 0.3, 8), colors.metal, [0, 5.84, 0]);
  }
  if (b.type === 'shelter') {
    for (const side of [-1, 1]) {
      rod(g, [side * 1.25, 2.2, 1.28], [side * 1.5, 0.47, 1.5], 0.023, colors.rope);
      const curtain = box(g, 0xd4c195, side * 1.03, 1.42, 1.2, 0.3, 1.23, 0.07);
      curtain.rotation.z = side * 0.08;
    }
    box(g, 0x8c714c, -1.1, 0.64, -0.9, 0.46, 0.4, 0.42);
    halo(g, 0xffce85, 1.24, 1.8, 1.22, 1.2);
    // inside: a lantern hanging from the ridge, a rumpled blanket, a water jug and a few salvaged things
    g.userData.roof.push(
      rod(g, [0, 3.05, -0.2], [0, 2.45, -0.2], 0.01, colors.rope),
      ball(g, 0xffc27a, 0, 2.32, -0.2, 0.11, 0.15, 0.11, { emissive: 0xffa94d, emissiveIntensity: 1.6 })
    );
    const glow = new T.PointLight(0xffb36b, 5, 4.5, 1.6);
    glow.position.set(0, 2.25, -0.2);
    g.add(glow);
    box(g, 0x6e5a48, 0.12, 0.69, 0.05, 1.05, 0.06, 0.7).rotation.y = 0.12;
    box(g, 0x4c5e52, -0.2, 0.71, 0.35, 0.6, 0.05, 0.3).rotation.y = -0.3;
    pole(g, 0x7c8f93, 0.82, 0.78, 0.35, 0.11, 0.42);
    pole(g, 0x2d3638, 0.82, 1.02, 0.35, 0.05, 0.08);
    box(g, 0x9a8668, -0.85, 0.62, 0.55, 0.42, 0.3, 0.32);
    box(g, 0xcfc6ad, -0.86, 0.79, 0.55, 0.24, 0.02, 0.17).rotation.y = 0.4;
  }
  if (b.type === 'beacon') halo(g, 0xaeffdb, 0, 5.3, 0, 2.6);
  if (b.type === 'hatchery') halo(g, 0x9cebd6, 0, 1.85, 0, 1.8);
  g.userData.facilityId = b.type === 'floor' || b.type === 'upperfloor' ? null : facilityId(b);
  g.position.set(b.x * 3.6, (b.level || 0) * 3.3, b.z * 3.6);
  g.rotation.y = b.rot || 0;
  return g;
}
// The protagonist (see human.js): jointed, with a face, hands and procedural walk / idle / sit poses.
// dressed: swap in the rigged character model once it has loaded (the intro film keeps the procedural figure,
// whose limbs it poses directly)
export function character(dressed = true, look = 'male') {
  const h = makeHuman();
  return dressed ? dressHuman(h, look) : h;
}
function makeBoat() {
  const g = new T.Group();
  const outline = new T.Shape();
  outline.moveTo(0, 1.95);
  outline.bezierCurveTo(0.72, 1.55, 1, 0.7, 0.89, -1.22);
  outline.quadraticCurveTo(0, -1.65, -0.89, -1.22);
  outline.bezierCurveTo(-1, 0.7, -0.72, 1.55, 0, 1.95);
  const inner = new T.Path();
  inner.moveTo(0, 1.62);
  inner.bezierCurveTo(-0.57, 1.3, -0.74, 0.5, -0.69, -1.12);
  inner.quadraticCurveTo(0, -1.42, 0.69, -1.12);
  inner.bezierCurveTo(0.74, 0.5, 0.57, 1.3, 0, 1.62);
  outline.holes.push(inner);
  const hullGeo = new T.ExtrudeGeometry(outline, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 16
  });
  hullGeo.rotateX(Math.PI / 2);
  piece(g, hullGeo, 0x427c80, [0, 0.68, 0]);
  for (let j = -2; j <= 2; j++) box(g, j % 2 ? 0xbe9866 : 0x9f8a6a, j * 0.25, 0.29, 0, 0.23, 0.09, 2.3);
  for (const z of [-0.9, 0.8]) box(g, 0xb99868, 0, 0.62, z, 1.36, 0.11, 0.32);
  const pts = outline.getPoints(70).map(p => new V(p.x, 0.72, p.y));
  piece(g, new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 100, 0.045, 6, true), 0xd5b783);
  for (const side of [-1, 1])
    for (const z of [-0.7, 0, 0.65]) {
      const rib = rod(g, [side * 0.65, 0.32, z], [side * 0.79, 0.65, z], 0.035, 0x72583b);
    }
  const human = character();
  human.position.set(0, 0.5, -0.85);
  g.add(human);
  rod(g, [0.6, 0.85, -0.45], [1.7, 0.15, 0.7], 0.045, colors.wood);
  box(g, colors.wood, 1.63, 0.16, 0.68, 0.27, 0.09, 0.64).rotation.y = -0.65;
  pole(g, colors.wood, -0.65, 1.5, -1, 0.055, 2.1);
  const pennant = box(g, 0xd9bd79, -0.32, 2.26, -1, 0.62, 0.36, 0.045);
  for (const x of [-0.75, 0.75]) box(g, 0x427c80, x, 0.46, 0, 0.1, 0.1, 2.3);
  const coil = piece(g, new T.TorusGeometry(0.22, 0.035, 5, 18), 0xcbb894, [0.43, 0.56, -0.77], [1, 1, 1]);
  coil.rotation.x = Math.PI / 2;
  ball(g, 0xffd5a2, -0.66, 1.08, -1.05, 0.09, 0.13, 0.09, { emissive: 0xffbd6b, emissiveIntensity: 0.8 });
  halo(g, 0xffd499, -0.66, 1.08, -1.05, 0.6);
  g.userData.human = human;
  g.userData.flag = pennant;
  return g;
}
function lootMesh(kind) {
  const g = new T.Group();
  if (kind === 0) {
    for (let i = -1; i <= 1; i++) {
      const l = pole(g, 0x8f6c4c, i * 0.32, 0.1, i * 0.12, 0.17, 1.6);
      l.rotation.x = Math.PI / 2;
    }
    box(g, 0xc6b58c, 0, 0.1, 0, 1.2, 0.08, 0.13);
  } else if (kind === 2) {
    pole(g, 0x717d64, 0, 0.17, 0, 0.44, 0.9);
    for (const y of [-0.1, 0.42])
      piece(g, new T.TorusGeometry(0.45, 0.025, 6, 16), 0xccb797, [0, y, 0], [1, 1, 1]).rotation.x = Math.PI / 2;
  } else {
    box(g, kind === 3 ? 0x556773 : 0x987a51, 0, 0.25, 0, 1, 0.75, 1);
    for (const z of [-0.38, 0.38]) box(g, 0xc7ac7e, 0, 0.26, z, 1.05, 0.8, 0.1);
    if (kind === 3) ball(g, 0xb5bfef, 0, 0.7, 0, 0.2, 0.2, 0.2, { emissive: 0xa69beb, emissiveIntensity: 0.8 });
  }
  return g;
}
export class OceanWorld {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x6b9ba8);
    this.scene.fog = new T.FogExp2(0x6b9ba8, 0.0045);
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.mobile = !!(navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer:coarse)').matches);
    this.settings = loadSettings(this.mobile);
    this.quality = QUALITY[this.settings.quality];
    setCreatureDetail(this.settings.quality);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality.pixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.quality.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.post = new PostFX(this.renderer, this.settings.quality);
    loadProtagonist();
    this.camera = new T.PerspectiveCamera(44, 1, 0.1, 1800);
    this.yaw = 0.63;
    this.pitch = 0.64;
    this.distance = 42;
    // The facility the player is using (game.js enterFocus); in third person the shelter's roof lifts off.
    this.inside = null;
    this.look = new V(2, 0, 2);
    this.follow = new V(2, 0, 2);
    this.time = 0;
    this.ray = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.plane = new T.Plane(new V(0, 1, 0), 0);
    this.objMeshes = new Map();
    this.wildMeshes = new Map();
    this.petMeshes = new Map();
    this.lastBuildings = '';
    this.placement = null;
    this.ghostCell = { x: 0, z: 0 };
    this.target = null;
    this.previewCache = new Map();
    this.ambient = new T.HemisphereLight(0xc5e9e5, 0x376778, 2.3);
    this.scene.add(this.ambient);
    this.sun = new T.DirectionalLight(0xffe1b0, 3);
    this.sun.position.set(-26, 48, -22);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.quality.shadow, this.quality.shadow);
    Object.assign(this.sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
    this.scene.add(this.sun.target);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    for (const c of [colors.wood, colors.plank, colors.darkWood, 0x9a8668, 0x7d654b, 0x9f8a6a]) {
      const m = mat(c);
      m.map = m.bumpMap = woodTexture();
      m.bumpScale = 2.2;
      m.roughness = 0.88;
      m.needsUpdate = true;
    }
    this.sky = makeSky(this.quality);
    this.scene.add(this.sky);
    this.sunDisk = ball(this.scene, 0xffeed0, -125, 60, -225, 15, 15, 15, {
      emissive: 0xffedbd,
      emissiveIntensity: 1.2,
      fog: false
    });
    this.sunDisk.visible = false;
    this.water = makeWater(this.quality);
    this.scene.add(this.water);
    this.atmos = new Atmosphere(this, this.quality);
    this.trail = new WakeTrail();
    this.splashIndex = 0;
    this.stormLevel = 0;
    this.hullSpeed = 0;
    this.lastHull = null;
    this.boatHeave = 0;
    this.makeSpray();
    this.islandModels = makeIslands();
    this.scene.add(this.islandModels.group);
    this.home = new T.Group();
    this.scene.add(this.home);
    this.boat = makeBoat();
    this.scene.add(this.boat);
    this.walker = character();
    this.walker.visible = false;
    this.scene.add(this.walker);
    this.walkPhase = 0;
    this.moveSpeed = 0;
    this.playerAnchor = new V();
    this.buoy = new T.Group();
    pole(this.buoy, 0x91bbaf, 0, 0.2, 0, 0.85, 0.35);
    pole(this.buoy, 0x526b69, 0, 1, 0, 0.12, 1.7);
    ball(this.buoy, 0xa6eff2, 0, 2, 0, 0.25, 0.35, 0.25, { emissive: 0x7ad7e9, emissiveIntensity: 1.6 });
    const beaconRing = piece(this.buoy, new T.TorusGeometry(1.2, 0.025, 6, 36), 0x8ebce7, [0, 0.1, 0], [1, 1, 1], {
      emissive: 0x769ade,
      emissiveIntensity: 1
    });
    beaconRing.rotation.x = Math.PI / 2;
    halo(this.buoy, 0x9dccff, 0, 2, 0, 1.8);
    this.buoy.position.set(17, 0, -13);
    this.scene.add(this.buoy);
    this.targetRing = new T.Mesh(
      new T.RingGeometry(1.5, 1.57, 48),
      new T.MeshBasicMaterial({
        color: 0xc9eecb,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false
      })
    );
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = 0.4;
    this.targetRing.renderOrder = 4;
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
    this.navMarker = new T.Mesh(
      new T.RingGeometry(0.4, 0.55, 32),
      new T.MeshBasicMaterial({
        color: 0xdbeac6,
        transparent: true,
        opacity: 0.6,
        side: T.DoubleSide,
        depthWrite: false
      })
    );
    this.navMarker.rotation.x = -Math.PI / 2;
    this.navMarker.position.y = 0.35;
    this.navMarker.renderOrder = 4;
    this.navMarker.visible = false;
    this.scene.add(this.navMarker);
    this.gridGroup = new T.Group();
    this.scene.add(this.gridGroup);
    this.ghost = new T.Mesh(
      new T.BoxGeometry(3.42, 0.08, 3.42),
      new T.MeshBasicMaterial({ color: 0xaaf2b2, transparent: true, opacity: 0.45, depthWrite: false })
    );
    this.ghost.position.y = 0.55;
    this.ghost.visible = false;
    this.ghost.renderOrder = 6;
    this.scene.add(this.ghost);
    this.lineGeo = new T.BufferGeometry().setFromPoints([new V(), new V()]);
    this.rope = new T.Line(this.lineGeo, new T.LineBasicMaterial({ color: 0xe4d8ab }));
    this.rope.visible = false;
    this.scene.add(this.rope);
    const r = seeded(993);
    this.motes = new T.Group();
    for (let i = 0; i < 35; i++) {
      const m = ball(this.motes, 0xb6ffe2, (r() - 0.5) * 140, -0.05, (r() - 0.5) * 140, 0.035, 0.035, 0.035, {
        emissive: 0x83ffdc,
        emissiveIntensity: 1
      });
      m.userData.phase = r() * 6;
    }
    this.scene.add(this.motes);
    this.extra = expansionModels(this.scene);
    this.ship = makeWarship(mat, halo);
    this.ship.visible = false;
    // the base's facilities once it has gone to sea, on the main deck (shown and hidden with that deck)
    this.fortress = new T.Group();
    this.ship.userData.bands[3].add(this.fortress);
    this.scene.add(this.ship);
    this.cannonFx = ball(this.scene, 0xffc27a, 0, 0, 0, 1, 1, 1, {
      emissive: 0xff9a40,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    this.cannonFx.visible = false;
    this.resize();
    this.sync(state);
    this.update(0, state, { title: true });
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || innerWidth;
    this.height = rect.height || innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.post?.setSize(this.width, this.height);
  }
  rotate(yawDelta, pitchDelta) {
    const k = this.settings.camSens ?? 1;
    yawDelta *= k;
    pitchDelta *= k * (this.settings.invertY ? -1 : 1);
    this.yaw += yawDelta;
    if (this.firstPerson && !this.placement)
      this.firstPitch = Math.max(-1.15, Math.min(1.15, (this.firstPitch || 0) + pitchDelta));
    else this.pitch = Math.max(0.3, Math.min(1.2, this.pitch + pitchDelta));
  }
  toggleView() {
    this.firstPerson = !this.firstPerson;
    this.firstPitch = 0;
    return this.firstPerson;
  }
  // The protagonist's look ('male' / 'female'), on foot and in the boat.
  setHero(look = 'male') {
    if (this.hero === look) return;
    this.hero = look;
    dressHuman(this.walker, look);
    dressHuman(this.boat.userData.human, look);
  }
  sync(s) {
    this.setHero(s.hero);
    normalizeHousing(s);
    normalizeExpansion(s);
    const key = JSON.stringify(
      s.buildings.map(({ type, x, z, rot, level, off, ship, stowed }) => ({
        type,
        x,
        z,
        rot,
        level,
        off,
        ship,
        stowed
      }))
    );
    if (key !== this.lastBuildings) {
      this.lastBuildings = key;
      while (this.home.children.length) this.home.remove(this.home.children[0]);
      while (this.fortress.children.length) this.fortress.remove(this.fortress.children[0]);
      for (const b of s.buildings) {
        if (b.stowed) continue;
        const g = buildingMesh(b);
        if (b.ship) {
          // aboard the fortress: on its deck slot, a little smaller, moving with the ship
          const slot = SHIP_SLOTS[b.ship.slot];
          g.position.set(slot.lx, FORTRESS_DECK_Y - 0.45 * FORTRESS_SCALE, slot.lz);
          g.rotation.y = 0;
          g.scale.setScalar(FORTRESS_SCALE);
          this.fortress.add(g);
        } else this.home.add(g);
      }
      this.deviceShown = null;
      const floors = s.buildings.filter(b => b.type === 'floor');
      // the calm water around the raft (none once the raft has become the fortress)
      if (!floors.length) floors.push({ x: 9999, z: 9999 });
      const minX = Math.min(...floors.map(b => b.x * 3.6)) - 1.8,
        maxX = Math.max(...floors.map(b => b.x * 3.6)) + 1.8,
        minZ = Math.min(...floors.map(b => b.z * 3.6)) - 1.8,
        maxZ = Math.max(...floors.map(b => b.z * 3.6)) + 1.8;
      this.water.material.uniforms.uHome.value.set(
        (minX + maxX) / 2,
        (minZ + maxZ) / 2,
        (maxX - minX) / 2,
        (maxZ - minZ) / 2
      );
    }
    const carried = !!s.device?.owned;
    if (this.deviceShown !== carried) {
      this.deviceShown = carried;
      for (const g of this.facilityGroups()) g.traverse(o => o.userData.handheld && (o.visible = !carried));
    }
    const syncMap = (items, map, make) => {
      const ids = new Set(items.map(x => x.id));
      for (const [id, m] of map)
        if (!ids.has(id)) {
          this.scene.remove(m);
          map.delete(id);
        }
      for (const v of items)
        if (!map.has(v.id)) {
          const m = make(v);
          map.set(v.id, m);
          this.scene.add(m);
        }
    };
    syncMap(s.loot, this.objMeshes, l => {
      const m = lootMesh(l.kind);
      m.position.set(l.x, 0, l.z);
      m.rotation.y = l.spin;
      return m;
    });
    syncMap(s.wild, this.wildMeshes, c => makeCreature(c.genome));
    syncMap(s.tamed, this.petMeshes, c => {
      const m = makeCreature(c.genome);
      m.userData.petId = c.id;
      m.scale.multiplyScalar(0.22);
      return m;
    });
    this.buoy.visible = !s.buoyFound;
    for (const c of s.tamed) {
      const m = this.petMeshes.get(c.id);
      if (c.awakened && m && !m.userData.aura) {
        const ring = piece(m, new T.TorusGeometry(1.4, 0.025, 6, 60), 0xf4dfa4, [0, 0.3, 0], [1, 1, 1], {
          emissive: 0xedc67f,
          emissiveIntensity: 1.5
        });
        ring.rotation.x = Math.PI / 2;
        m.userData.aura = ring;
      }
    }
  }
  pickObject(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, (-(clientY - rect.top) / rect.height) * 2 + 1);
    this.scene.updateMatrixWorld(true);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects([this.home, this.fortress, this.islandModels.group, this.extra.group], true);
    for (const hit of hits) {
      let o = hit.object;
      while (o) {
        if (o.userData.facilityId) return { type: 'facility', id: o.userData.facilityId };
        if (o.userData.siteId) return { type: 'site', id: o.userData.siteId };
        if (o.userData.nodeId) return { type: 'node', id: o.userData.nodeId };
        if (o.userData.claimId) return { type: 'claim', id: o.userData.claimId };
        o = o.parent;
      }
      if (hit.distance > 0) return null;
    }
    return null;
  }
  screenPoint(x, y, z) {
    const v = new V(x, y, z).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.width,
      y: (-0.5 * v.y + 0.5) * this.height,
      visible: v.z < 1 && v.z > 0 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2
    };
  }
  seaPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, (-(clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const v = new V();
    return this.ray.ray.intersectPlane(this.plane, v) ? v : null;
  }
  // s: the state the free cells are judged against (when moving a building, one without that building)
  setPlacement(type, s, level = 0) {
    this.buildLevel = type === 'upperfloor' ? 1 : level;
    this.placement = type;
    this.placementState = type ? s : null;
    this.gridGroup.clear();
    if (type) {
      for (let x = -7; x <= 7; x++)
        for (let z = -7; z <= 7; z++) {
          const bad = buildError(s, type, x, z, this.buildLevel);
          if (!bad) {
            const cell = new T.Mesh(
              new T.PlaneGeometry(3.35, 3.35),
              new T.MeshBasicMaterial({
                color: 0x97e4b9,
                transparent: true,
                opacity: 0.18,
                side: T.DoubleSide,
                depthWrite: false
              })
            );
            cell.rotation.x = -Math.PI / 2;
            cell.position.set(x * 3.6, 0.45 + this.buildLevel * 3.3, z * 3.6);
            cell.renderOrder = 5;
            this.gridGroup.add(cell);
            if (this.gridGroup.children.length === 1) this.ghostCell = { x, z };
          }
        }
      this.distance = Math.max(this.distance, 35);
    }
    this.ghost.visible = !!type;
  }
  updateGhost(s) {
    this.ghost.position.set(this.ghostCell.x * 3.6, 0.52 + (this.buildLevel || 0) * 3.3, this.ghostCell.z * 3.6);
    this.ghost.material.color.set(
      buildError(this.placementState || s, this.placement, this.ghostCell.x, this.ghostCell.z, this.buildLevel)
        ? 0xed8b6c
        : 0xace4bd
    );
  }
  update(dt, s, opts = {}) {
    this.time += dt;
    // Harvested spots regrow piece by piece over 120 s (logs wash back ashore, crystals and fruit grow back);
    // the last piece popping into place is the cue that the spot can be harvested again.
    for (const [id, m] of this.islandModels.nodes) {
      const left = (s.harvested?.[id] || 0) - s.elapsed,
        f = left > 0 ? Math.max(0, 1 - left / 120) : 1,
        parts = m.children;
      if (m.userData.grow === undefined) parts.forEach(c => (c.userData.base = c.scale.clone()));
      if (f >= 1 && m.userData.grow < 1) m.userData.pop = 1;
      m.userData.grow = f;
      m.userData.pop = Math.max(0, (m.userData.pop || 0) - dt * 2.5);
      parts.forEach((c, i) => {
        const start = (i / parts.length) * 0.85,
          k = Math.min(1, Math.max(0, (f - start) / (1 - start) / 0.35)),
          e = k * k * (3 - 2 * k);
        c.scale
          .copy(c.userData.base)
          .multiplyScalar(Math.max(0.001, e) * (1 + Math.sin(m.userData.pop * Math.PI) * 0.18));
        c.visible = e > 0.01;
      });
    }
    // facilities that show their state in the world: the collector's gauge, eggs glowing in the hatchery dome
    for (const g of this.facilityGroups()) {
      const id = g.userData.facilityId;
      if (!id) continue;
      if (g.userData.gauge) {
        const b = s.buildings.find(b => facilityId(b) === id),
          v = Math.min(1, (b?.waterStored || 0) / 20);
        g.userData.gauge.scale.y = Math.max(0.001, v);
        g.userData.gauge.position.y = g.userData.gaugeBase + (v * g.userData.gaugeH) / 2;
      }
      if (g.userData.egg) {
        const egg = s.eggs.find(e => e.readyAt > s.elapsed),
          k = egg ? Math.min(1, 1 - (egg.readyAt - s.elapsed) / (egg.duration || 30)) : 0;
        g.userData.egg.visible = !!egg;
        g.userData.egg.material.emissiveIntensity = 0.2 + k * 1.4 + Math.sin(this.time * (2 + k * 6)) * 0.15 * k;
        g.userData.egg.scale.setScalar(0.7 + k * 0.3);
      }
    }
    const t = this.time;
    const phase = dayPhase(s);
    const night = ((Math.cos(phase * Math.PI * 2 + Math.PI * 0.65) + 1) / 2) * 0.85;
    const stormTarget = phase > 0.6 && phase < 0.76 ? 0.7 : 0;
    this.stormLevel += (stormTarget - this.stormLevel) * Math.min(1, dt * 0.12);
    const storm = this.stormLevel;
    this.water.material.uniforms.uTime.value = t;
    this.water.material.uniforms.uNight.value = night;
    this.water.material.uniforms.uStorm.value = storm;
    this.sky.material.uniforms.uNight.value = night;
    this.sky.material.uniforms.uTime.value = t;
    const atm = this.atmos.update(dt, phase, storm, this.playerAnchor, !s.inCave && !s.expedition?.diving);
    this.scene.fog.color.copy(atm.fog);
    const foot = s.player.mode === 'foot',
      riding = !!s.expedition?.mounted,
      diving = !!s.expedition?.diving,
      aboard = s.player.mode === 'aboard',
      helm = s.player.mode === 'ship' && !riding,
      boat = foot || riding || aboard ? s.boat : s.player;
    this.onRiding = riding;
    this.baseY = diving
      ? -8
      : aboard
        ? DECKS[s.player.deck].y
        : helm
          ? DECKS[4].y
          : foot
            ? (s.player.level || 0) * 3.3
            : riding
              ? 0.7
              : 0;
    const helmPos = s.ship ? toWorld(s.ship, 0, -9.9) : null;
    this.plane.constant = this.placement ? -(this.buildLevel || 0) * 3.3 : -this.baseY;
    this.onFoot = foot || aboard || helm;
    this.playerAnchor.set(helm ? helmPos.x : s.player.x, this.baseY, helm ? helmPos.z : s.player.z);
    this.updateShip(s, t, aboard, helm);
    const home = this.homeRect(),
      pose = floatPose(boat.x, boat.z, boat.heading, t, storm, home, 3.6, 1.6, 1);
    this.boat.rotation.order = 'YXZ';
    this.boat.position.set(boat.x, pose.y, boat.z);
    this.boat.rotation.set(pose.pitch, boat.heading, pose.roll);
    this.boatHeave = pose.y;
    this.boat.visible = !s.ship || !!s.skiff;
    this.boat.userData.human.visible = !foot && !riding && !s.ship;
    this.walker.visible = this.onFoot || riding;
    this.walker.position.set(
      helm ? helmPos.x : s.player.x,
      this.baseY + (riding ? 0.65 : 0.42),
      helm ? helmPos.z : s.player.z
    );
    this.boat.scale.x = 1 + (s.expedition?.boatLevel || 0) * 0.07;
    this.walker.rotation.y = helm ? s.ship.heading : s.player.heading;
    this.walkPhase += dt * this.moveSpeed * 3.2;
    animateHuman(this.walker, dt, { speed: riding ? 0 : this.moveSpeed, mode: riding ? 'ride' : 'walk' });
    // in the boat: seated on the stern thwart, paddling while under way
    animateHuman(this.boat.userData.human, dt, { speed: this.hullSpeed || 0, mode: 'row' });
    this.boat.userData.flag.rotation.y = Math.sin(t * 2.4) * 0.13;
    {
      const u = this.water.material.uniforms,
        hx = s.ship ? s.ship.x : this.boat.position.x,
        hz = s.ship ? s.ship.z : this.boat.position.z,
        hh = s.ship ? s.ship.heading : boat.heading;
      if (this.lastHull && dt > 0) {
        const v = Math.hypot(hx - this.lastHull.x, hz - this.lastHull.z) / dt;
        this.hullSpeed += (Math.min(v, 20) - this.hullSpeed) * Math.min(1, dt * 6);
      }
      this.lastHull = { x: hx, z: hz };
      u.uBoat.value.set(hx, 0, hz);
      u.uHeading.value = hh;
      u.uSpeed.value = this.hullSpeed;
      u.uHull.value.set(s.ship ? 11 : 1.9, s.ship ? 2.6 : 0.9);
      u.uTrail.value = this.trail.record(hx, hz, this.hullSpeed, t);
      if (this.hullSpeed > 3.2 && !s.inCave && !diving) {
        this.sprayTimer = (this.sprayTimer || 0) - dt;
        if (this.sprayTimer <= 0) {
          this.sprayTimer = 0.05;
          const f = s.ship ? 11 : 1.9;
          for (const side of [-1, 1])
            this.emitSpray(
              hx + Math.sin(hh) * f + Math.cos(hh) * side * 0.5,
              hz + Math.cos(hh) * f - Math.sin(hh) * side * 0.5,
              Math.sin(hh) * this.hullSpeed * 0.25 + Math.cos(hh) * side * 1.4,
              Math.cos(hh) * this.hullSpeed * 0.25 - Math.sin(hh) * side * 1.4,
              1.6 + Math.random(),
              1
            );
        }
      }
    }
    this.updateSpray(dt);
    this.buoy.position.y = waveHeight(17, -13, t, storm, home) * 0.9;
    this.buoy.rotation.z = Math.sin(t * 0.8) * 0.05;
    for (const l of s.loot) {
      const m = this.objMeshes.get(l.id);
      if (m) {
        const ly = waveHeight(l.x, l.z, t, storm, home),
          slope = waveHeight(l.x + 0.6, l.z, t, storm, home) - ly;
        m.position.set(l.x, ly + 0.02, l.z);
        m.rotation.z = Math.atan2(slope, 0.6) * 0.8;
        m.rotation.x = Math.sin(t * 0.9 + l.spin) * 0.05;
      }
    }
    for (const c of s.wild) {
      const m = this.wildMeshes.get(c.id);
      if (m) {
        const ud = m.userData,
          mv = ud.lx === undefined || !dt ? 0 : Math.hypot(c.x - ud.lx, c.z - ud.lz) / dt;
        ud.lx = c.x;
        ud.lz = c.z;
        ud.swim = (ud.swim || c.phase) + dt * (1 + Math.min(mv, 8) * 0.55);
        ud.dip = (ud.dip || 0) + ((c.diving || 0) - (ud.dip || 0)) * Math.min(1, dt * 3);
        // a frenzied beast (failed forced contract) burns with a red aura
        const rage = (c.frenzyUntil || 0) > s.elapsed;
        if (rage && !ud.rage) ud.rage = halo(m, 0xff3b2a, 0, 0.6, 0, 4.5);
        if (ud.rage) {
          ud.rage.visible = rage;
          ud.rage.material.opacity = 0.45 + Math.sin(t * 9) * 0.25;
        }
        // the rare, unusually tame individual gives off a faint warm shimmer
        if (c.tame && !ud.kind) ud.kind = halo(m, 0xffd98a, 0, 0.7, 0, 2.2);
        if (ud.kind) {
          ud.kind.visible = !!c.tame && !rage;
          ud.kind.material.opacity = 0.18 + Math.sin(t * 2.2 + c.phase) * 0.1;
        }
        if (c.riding) {
          // a land beast that trusts you rides along on the boat's bow
          const h = s.boat.heading;
          m.position.set(
            this.boat.position.x + Math.sin(h) * 1.15,
            this.boat.position.y + 0.38,
            this.boat.position.z + Math.cos(h) * 1.15
          );
          m.rotation.y = h;
          m.scale.setScalar(ud.phenotype.size * 0.32);
          this.animateCreature(m, t);
          continue;
        }
        if (m.scale.x !== ud.phenotype.size) m.scale.setScalar(ud.phenotype.size);
        if (ud.phenotype.habitat === 'land') {
          // land beasts walk on the island surface (and on the raft when they follow you home)
          m.position.set(c.x, ISLAND_GROUND, c.z);
          m.rotation.x = 0;
        } else {
          m.position.set(c.x, 0.03 + waveHeight(c.x, c.z, t, storm, home) - ud.dip * 1.1, c.z);
          m.rotation.x = ud.dip * 0.35;
        }
        m.rotation.y = c.heading || 0;
        this.animateCreature(m, ud.swim);
      }
    }
    const pools = new Map(s.buildings.filter(b => b.type === 'pen' && !b.stowed).map(b => [penId(b), b])),
      slots = new Map();
    let i = 0;
    for (const c of s.tamed) {
      const m = this.petMeshes.get(c.id);
      if (!m) continue;
      const pen = pools.get(c.penId);
      m.visible = true;
      const landPet = m.userData.phenotype.habitat === 'land';
      if (m.userData.perch) m.userData.perch.visible = false;
      if (c.id === s.expedition?.activeId) {
        // Land beasts can't swim: at sea they ride along on the bow of the boat.
        if (landPet && !foot && !aboard) {
          const h = helm ? s.ship.heading : s.boat.heading,
            bx = helm ? helmPos.x : this.boat.position.x,
            bz = helm ? helmPos.z : this.boat.position.z;
          m.scale.setScalar(phenotype(c.genome).size * 0.32);
          m.position.set(
            bx + Math.sin(h) * 1.15,
            (helm ? DECKS[4].y : this.boat.position.y) + 0.38,
            bz + Math.cos(h) * 1.15
          );
          m.rotation.y = h;
          this.animateCreature(m, t);
          continue;
        }
        m.scale.setScalar(phenotype(c.genome).size * (riding ? 1 : 0.75));
        const target = new V(
          s.player.x + (riding ? 0 : Math.cos(t * 0.4) * 2.5),
          this.baseY + (foot ? (landPet ? 0.42 : 0.8) : 0),
          s.player.z + (riding ? 0 : Math.sin(t * 0.4) * 2.5)
        );
        m.position.lerp(target, 1 - Math.exp(-dt * 3));
        if (m.position.distanceTo(target) > 15) m.position.copy(target);
        m.rotation.y = s.player.heading;
        this.animateCreature(m, t);
        if (m.userData.aura) m.userData.aura.rotation.z = t;
        continue;
      }
      const rest = restPlace(s, c);
      if (rest === 'lounge' && s.ship) {
        const k = s.ship.lounge.indexOf(c.id),
          [lx, lz] = LOUNGE_SLOTS[k] || [0, 0],
          w = toWorld(s.ship, lx, lz);
        m.visible = this.ship.userData.bands[2].visible;
        m.scale.setScalar(phenotype(c.genome).size * 0.42);
        m.position.set(w.x, DECKS[2].y + 0.55 + Math.sin(t * 1.5 + k) * 0.05, w.z);
        m.rotation.y = s.ship.heading + Math.sin(t * 0.3 + k) * 0.4;
        this.animateCreature(m, t * 0.4 + k);
        continue;
      }
      if (rest === 'island') {
        const isl = restIsland(s),
          a = i * 2.1 + t * 0.05,
          r = 3.6 + (i % 3) * 1.4;
        m.scale.setScalar(phenotype(c.genome).size * 0.5);
        m.position.set(
          isl.x + Math.sin(a) * r,
          landPet ? ISLAND_GROUND : 0.75 + Math.sin(t * 1.2 + i) * 0.08,
          isl.z + Math.cos(a) * r * 0.8
        );
        m.rotation.y = a + Math.PI / 2;
        this.animateCreature(m, t * 0.5 + i);
        i++;
        continue;
      }
      // kept in the beast storage: not shown until called out
      if (rest !== 'pen' || !pen) {
        m.visible = false;
        continue;
      }
      // a pen on the raft, or one aboard the fortress (smaller, on the main deck)
      const aboardPen = !!(pen.ship && s.ship),
        k = aboardPen ? FORTRESS_SCALE : 1,
        at = facilityPos(s, pen),
        floorY = aboardPen ? FORTRESS_DECK_Y - 0.45 * FORTRESS_SCALE : 0;
      m.scale.setScalar(phenotype(c.genome).size * 0.22 * k);
      const slot = slots.get(c.penId) || 0;
      slots.set(c.penId, slot + 1);
      const a = t * 0.45 + i * 1.7;
      const positions = [
        [-0.8, 0.55],
        [0.8, 0.55],
        [0, -0.65]
      ];
      const [x, z] = positions[slot] || [0, 0];
      // land beasts rest on a rock perch in the pen instead of swimming
      if (m.userData.perch) m.userData.perch.visible = true;
      m.position.set(
        at.x + (x + (landPet ? 0 : Math.cos(a) * 0.12)) * k,
        floorY + (landPet ? 0.32 : 0.08 + Math.sin(a * 2) * 0.04) * k + (aboardPen ? 0.35 : 0),
        at.z + (z + (landPet ? 0 : Math.sin(a) * 0.13)) * k
      );
      m.rotation.y = Math.sin(a) * 0.3;
      this.animateCreature(m, t + i);
      i++;
    }

    this.motes.children.forEach((m, i) => {
      m.position.y = 0.1 + Math.sin(t + m.userData.phase) * 0.06;
      m.scale.setScalar(0.035 * (0.6 + Math.sin(t * 2 + i) * 0.4)); // twinkling specks, not metre-wide domes
    });
    if (opts.title) {
      this.follow.set(3, 0, 1);
      this.yaw = 0.55 + Math.sin(t * 0.07) * 0.1;
      this.distance = innerWidth < 760 ? 36 : 43;
    } else if (this.placement) this.follow.set(1.8, 0, 1.8);
    else if (helm) this.follow.set(s.ship.x, 7, s.ship.z);
    else this.follow.set(s.player.x, this.baseY + (foot || aboard ? 0.8 : 0), s.player.z);
    this.look.lerp(this.follow, 1 - Math.exp(-dt * 3.5) || 1);
    const dist = s.inCave
      ? 12
      : diving
        ? Math.min(14, this.distance)
        : aboard && !opts.title
          ? Math.min(20, this.distance * 0.55)
          : helm && !opts.title
            ? Math.max(44, this.distance * 1.2)
            : this.distance * (foot && !this.placement && !opts.title ? 0.7 : 1);
    const yaw = this.yaw,
      pitch = this.pitch,
      camDist = dist,
      look = this.look;
    this.camera.position.set(
      look.x + Math.sin(yaw) * Math.cos(pitch) * camDist,
      look.y + Math.sin(pitch) * camDist,
      look.z + Math.cos(yaw) * Math.cos(pitch) * camDist
    );
    this.camera.lookAt(look);
    this.water.material.uniforms.uCamera.value.copy(this.camera.position);
    if (this.placement) this.updateGhost(s);
    if (this.target) {
      this.targetRing.visible = true;
      this.targetRing.position.set(this.target.x, this.baseY + 0.43, this.target.z);
      this.targetRing.scale.setScalar(this.target.type === 'wild' ? 1.7 : 1);
      this.targetRing.material.opacity = 0.55 + Math.sin(t * 3) * 0.2;
    } else this.targetRing.visible = false;
    if (opts.destination) {
      this.navMarker.visible = true;
      this.navMarker.position.set(opts.destination.x, this.baseY + 0.38, opts.destination.z);
      this.navMarker.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    } else this.navMarker.visible = false;
    this.extra.cave.visible = !!s.inCave;
    this.extra.seabed.visible = diving;
    this.sky.visible = !diving && !s.inCave;
    this.water.visible = !diving && !s.inCave;
    this.islandModels.group.visible = !s.inCave;
    for (const site of EXPLORE) {
      const m = this.extra.sites.get(site.id);
      m.visible = !!site.cave === !!s.inCave && (!site.deep || diving);
      m.scale.setScalar(s.expedition.collected.includes(site.id) ? 0.65 : 1);
    }
    const boss = s.expedition.boss;
    this.extra.boss.visible = !boss.defeated && !s.inCave;
    this.extra.boss.position.set(boss.x, diving ? -4 : 0, boss.z);
    this.extra.boss.rotation.y = Math.atan2(s.player.x - boss.x, s.player.z - boss.z);
    this.animateCreature(this.extra.boss, t);
    this.extra.rain.visible = !!storm && !diving && !s.inCave;
    this.extra.rain.position.set(s.player.x, 0, s.player.z);
    const rain = this.extra.rain.geometry.attributes.position;
    for (let i = 0; i < rain.count; i++) {
      rain.setY(i, (rain.getY(i) - dt * 20 + 20) % 20);
    }
    rain.needsUpdate = true;
    this.scene.fog.density = diving ? 0.035 : s.inCave ? 0.045 : 0.0036 + storm * 0.007;
    if (diving || s.inCave) {
      this.scene.background.set(diving ? 0x062738 : 0x081720);
      this.scene.fog.color.copy(this.scene.background);
      this.ambient.color.set(diving ? 0x2a7a8a : 0x5a6a80);
      this.ambient.intensity = diving ? 1.2 : 0.7;
      this.sun.intensity = diving ? 0.5 : 0.1;
      this.scene.environmentIntensity = 0.15;
    } else {
      this.scene.background.copy(atm.fog);
    }
    this.water.material.uniforms.uFogDensity.value = this.scene.fog.density;
    if (opts.salvaging) {
      const p = opts.salvaging;
      this.rope.visible = true;
      this.lineGeo.setFromPoints([new V(s.player.x, 0.8, s.player.z), new V(p.x, 0.5, p.z)]);
    } else this.rope.visible = false;
  }
  updateShip(s, t, aboard, helm) {
    const ship = this.ship,
      bands = ship.userData.bands;
    this.hasShip = !!s.ship && !s.skiff;
    const fusing = s.shipFusion;
    ship.visible = !!s.ship || !!fusing;
    for (const [id, c] of this.islandModels.claims) {
      const own = (s.occupied || []).includes(id);
      c.userData.flag.visible = own;
      c.userData.stone.visible = !own;
      c.userData.cloth.rotation.y = Math.sin(t * 1.7 + c.position.x) * 0.12;
    }
    if (!ship.visible) return;
    const pose = s.ship || dockMoor(s) || { x: 0, z: 30, heading: 0 };
    ship.position.set(pose.x, Math.sin(t * 0.8) * 0.08, pose.z);
    ship.rotation.set(Math.sin(t * 0.6) * 0.008, pose.heading, Math.sin(t * 0.7) * 0.012);
    if (fusing) {
      const p = Math.min(1, 1 - (fusing.readyAt - s.elapsed) / fusing.duration);
      ship.userData.keel.visible = true;
      bands.forEach((b, i) => (b.visible = p > (i + 1) / 6));
      return;
    }
    const cut = aboard && !this.firstPerson;
    bands.forEach((b, i) => (b.visible = !cut || i <= s.player.deck));
    ship.userData.keel.visible = true;
    ship.userData.wheel.rotation.z = helm ? Math.sin(t * 0.5) * 0.6 : 0;
    const fx = s.ship.cannonFx;
    if (fx && s.elapsed - fx.at < 0.7) {
      this.cannonFx.visible = true;
      const k = (s.elapsed - fx.at) / 0.7;
      this.cannonFx.position.set(fx.x, 1 + k * 2, fx.z);
      this.cannonFx.scale.setScalar(1 + k * 4);
      this.cannonFx.material.opacity = 0.85 * (1 - k);
    } else this.cannonFx.visible = false;
  }
  animateCreature(m, t) {
    animateCreature(m, t);
  }

  // Every facility's model: those on the raft and those aboard the fortress.
  facilityGroups() {
    return [...this.home.children, ...this.fortress.children];
  }
  // Where a point given in a facility's own coordinates is in the world right now.
  facilityPoint(b, local) {
    const g = this.facilityGroups().find(g => g.userData.facilityId === facilityId(b));
    if (!g) return null;
    g.updateWorldMatrix(true, false);
    return g.localToWorld(new V(...local));
  }
  // Just above a resting beast (for the marker and card that go with it).
  petPoint(id) {
    const m = this.petMeshes.get(id);
    if (!m?.visible) return null;
    m.updateWorldMatrix(true, false);
    const v = m.getWorldPosition(new V());
    v.y += 0.6 * (m.userData.phenotype?.size || 1);
    return v;
  }
  // The point of one facility under the pointer, if any.
  pickFacilityPoint(b, clientX, clientY) {
    const g = this.facilityGroups().find(g => g.userData.facilityId === facilityId(b));
    if (!g) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, (-(clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObject(g, true).find(h => h.object.visible);
    return hit ? hit.point : null;
  }
  // A beast under the pointer (only the ones resting in pens are pickable).
  pickPet(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, (-(clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.petMeshes.values()].filter(m => m.visible);
    const hit = this.ray.intersectObjects(meshes, true)[0];
    let o = hit?.object;
    while (o && !o.userData.petId) o = o.parent;
    return o?.userData.petId || null;
  }
  render() {
    // inside the shelter in third person, lift its roof so the camera can see in
    for (const g of this.facilityGroups())
      if (g.userData.roof) {
        const open = g.userData.facilityId === this.inside && !this.firstPerson;
        for (const m of g.userData.roof) m.visible = !open;
      }
    if (this.firstPerson && !this.placement && !this.titleMode) {
      const x = this.playerAnchor.x,
        z = this.playerAnchor.z,
        p = this.firstPitch || 0,
        y =
          this.baseY +
          (this.onFoot
            ? 1.96 + Math.sin(this.walkPhase * 2) * Math.min(0.018, this.moveSpeed * 0.008)
            : 2.13 + this.boatHeave);
      this.camera.position.set(x, y, z);
      this.camera.lookAt(
        x - Math.sin(this.yaw) * Math.cos(p) * 10,
        y - Math.sin(p) * 10,
        z - Math.cos(this.yaw) * Math.cos(p) * 10
      );
      this.camera.fov = 70;
      this.boat.userData.human.visible = false;
      this.walker.visible = false;
      this.water.material.uniforms.uCamera.value.copy(this.camera.position);
    } else {
      this.camera.fov = 44;
      this.boat.userData.human.visible = !this.onFoot && !this.onRiding && !this.hasShip;
      this.walker.visible = this.onFoot || this.onRiding;
    }
    this.camera.updateProjectionMatrix();
    this.sky.position.copy(this.camera.position);
    this.water.position.set(Math.round(this.camera.position.x / 4) * 4, 0, Math.round(this.camera.position.z / 4) * 4);
    const now = performance.now();
    this.post.storm = this.stormLevel;
    this.post.render(this.scene, this.camera, Math.min(0.1, (now - (this.lastRender || now)) / 1000));
    this.lastRender = now;
  }
  homeRect() {
    const h = this.water.material.uniforms.uHome.value;
    return { x: h.x, z: h.y, hx: h.z, hz: h.w };
  }
  // A splash: expanding rings in the water shader plus a burst of droplets.
  splash(x, z, strength = 1) {
    const u = this.water.material.uniforms.uSplash.value,
      i = this.splashIndex++ % SPLASHES;
    u.set([x, z, this.time, strength], i * 4);
    for (let k = 0; k < Math.round(26 * strength); k++) {
      const a = Math.random() * Math.PI * 2,
        r = Math.random() * 0.6,
        out = 1 + Math.random() * 2.6;
      this.emitSpray(
        x + Math.cos(a) * r,
        z + Math.sin(a) * r,
        Math.cos(a) * out,
        Math.sin(a) * out,
        3 + Math.random() * 3.5 * strength,
        1.2
      );
    }
  }
  makeSpray() {
    const n = 220,
      g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
    this.spray = {
      points: new T.Points(
        g,
        new T.PointsMaterial({ color: 0xf2fbfa, size: 0.3, transparent: true, opacity: 0.9, depthWrite: false })
      ),
      vel: new Float32Array(n * 3),
      life: new Float32Array(n),
      next: 0,
      n
    };
    this.spray.points.frustumCulled = false;
    this.scene.add(this.spray.points);
  }
  emitSpray(x, z, vx, vz, vy, life) {
    const sp = this.spray,
      i = sp.next++ % sp.n,
      pos = sp.points.geometry.attributes.position;
    pos.setXYZ(i, x, waveHeight(x, z, this.time, this.stormLevel, this.homeRect()) + 0.1, z);
    sp.vel.set([vx, vy, vz], i * 3);
    sp.life[i] = life;
  }
  updateSpray(dt) {
    const sp = this.spray,
      pos = sp.points.geometry.attributes.position;
    let any = false;
    for (let i = 0; i < sp.n; i++) {
      if (sp.life[i] <= 0) continue;
      any = true;
      sp.life[i] -= dt;
      sp.vel[i * 3 + 1] -= 9.8 * dt;
      const x = pos.getX(i) + sp.vel[i * 3] * dt,
        y = pos.getY(i) + sp.vel[i * 3 + 1] * dt,
        z = pos.getZ(i) + sp.vel[i * 3 + 2] * dt;
      if (sp.life[i] <= 0 || y < -0.3) {
        sp.life[i] = 0;
        pos.setXYZ(i, 0, -999, 0);
      } else pos.setXYZ(i, x, y, z);
    }
    if (any || sp.dirty) {
      pos.needsUpdate = true;
      sp.dirty = any;
    }
  }
  saveSettings() {
    saveSettings(this.settings);
  }
  setQuality(name) {
    if (!QUALITY[name] || name === this.settings.quality) return false;
    this.settings.quality = name;
    saveSettings(this.settings);
    return true;
  }
  thumbnail(genome, key) {
    if (this.previewCache.has(key)) return this.previewCache.get(key);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x407886, 2.8));
    const sun = new T.DirectionalLight(0xffe5ba, 3);
    sun.position.set(-3, 5, 4);
    scene.add(sun);
    scene.environment = this.scene.environment;
    scene.environmentIntensity = 0.7;
    const m = makeCreature(genome);
    m.rotation.y = -0.65;
    scene.add(m);
    // frame the creature: species range from a 1.5 m nautilus to a 6 m sea serpent
    const box = new T.Box3().setFromObject(m),
      centre = box.getCenter(new V()),
      size = box.getSize(new V()).length();
    const cam = new T.PerspectiveCamera(32, 2.2, 0.05, size * 6);
    cam.position.set(centre.x + size * 0.5, centre.y + size * 0.32, centre.z + size * 0.85);
    cam.lookAt(centre);
    const w = 440,
      h = 200,
      rt = new T.WebGLRenderTarget(w, h, { colorSpace: T.SRGBColorSpace }),
      old = this.renderer.getRenderTarget(),
      oldColor = this.renderer.getClearColor(new T.Color()).clone(),
      oldAlpha = this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(rt);
    this.renderer.setClearColor(0x0c2935, 0);
    this.renderer.clear();
    this.renderer.render(scene, cam);
    const pixels = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
    this.renderer.setRenderTarget(old);
    this.renderer.setClearColor(oldColor, oldAlpha);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d'),
      im = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) im.data.set(pixels.subarray((h - y - 1) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(im, 0, 0);
    const url = c.toDataURL();
    this.previewCache.set(key, url);
    return url;
  }
}
export class IntroFilm {
  constructor(renderer, onFinish) {
    this.renderer = renderer;
    this.onFinish = onFinish;
    this.t = 0;
    this.done = false;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x9cacac);
    this.scene.fog = new T.Fog(0x9cacac, 25, 95);
    this.camera = new T.PerspectiveCamera(47, innerWidth / innerHeight, 0.1, 220);
    this.scene.add(new T.HemisphereLight(0xd5e3ef, 0x485250, 2.6));
    const light = new T.DirectionalLight(0xffdabc, 3);
    light.position.set(-12, 25, 8);
    this.scene.add(light);
    box(this.scene, 0x40525b, 0, -0.19, 0, 12, 0.3, 180);
    for (let z = -70; z < 70; z += 6) box(this.scene, 0xe2ce9e, 0, -0.02, z, 0.16, 0.015, 3);
    for (const x of [-6.5, 6.5]) box(this.scene, 0xa7a899, x, 0, 0, 1, 0.3, 180);
    const r = seeded(91);
    for (let z = -65; z < 65; z += 9)
      for (const sign of [-1, 1]) {
        const h = 4 + r() * 13,
          x = sign * (11 + r() * 2);
        box(this.scene, [0x879899, 0x728b91, 0xb7b5a5][Math.floor(r() * 3)], x, h / 2, z, 6, h, 6);
        for (let yy = 2; yy < h - 1; yy += 2.6)
          for (let xx = -1; xx <= 1; xx++) {
            box(this.scene, 0x607d86, x + xx * 1.4, yy, z + 3.02, 0.8, 1.2, 0.04);
          }
      }
    for (let z = -45; z < 50; z += 15) {
      pole(this.scene, 0x4b6269, 5.8, 3.5, z, 0.09, 7);
      rod(this.scene, [5.8, 7, z], [3.5, 7, z], 0.07, 0x4b6269);
      box(this.scene, 0xffe6b0, 3.5, 6.9, z, 0.65, 0.14, 0.35, { emissive: 0xffce82, emissiveIntensity: 0.6 });
    }
    this.bike = new T.Group();
    for (const z of [-0.65, 0.65]) {
      const wheel = piece(this.bike, new T.TorusGeometry(0.33, 0.095, 8, 18), 0x1e3036, [0, 0.32, z], [1, 1, 1]);
      wheel.rotation.y = Math.PI / 2;
      pole(this.bike, 0x7d979c, 0, 0.32, z, 0.13, 0.13).rotation.z = Math.PI / 2;
    }
    box(this.bike, 0x3a6f7a, 0, 0.76, -0.1, 0.44, 0.7, 0.8);
    box(this.bike, 0x2a3b44, 0, 1, -0.28, 0.47, 0.17, 0.7);
    box(this.bike, 0x527f84, 0, 0.83, 0.66, 0.48, 0.85, 0.3);
    rod(this.bike, [-0.35, 1.25, 0.55], [0.35, 1.25, 0.55], 0.035, 0x223941);
    const person = character(false);
    person.position.set(0, 0.55, -0.22);
    this.bike.add(person);
    ball(person, 0xe2d2b1, 0, 1.7, -0.01, 0.3, 0.31, 0.3);
    box(person, 0x44616c, 0, 1.7, 0.26, 0.39, 0.21, 0.05);
    this.rider = person;
    this.bike.position.set(-2, 0, -15);
    this.scene.add(this.bike);
    this.truck = new T.Group();
    box(this.truck, 0xb4b09b, 0, 1.5, 1.8, 2.8, 2.8, 2.4);
    box(this.truck, 0x536d78, 0, 2.1, 3.025, 2.38, 1.1, 0.06);
    box(this.truck, 0x91856a, 0, 1.8, -1.25, 2.95, 2.7, 4);
    box(this.truck, 0x373c3b, 0, 0.7, 0, 2.6, 0.4, 6.5);
    for (const x of [-1.4, 1.4])
      for (const z of [-2.5, -1.15, 2]) {
        const w = piece(this.truck, cylG, 0x243439, [x, 0.56, z], [0.55, 0.35, 0.55]);
        w.rotation.z = Math.PI / 2;
      }
    for (let i = 0; i < 22; i++)
      ball(
        this.truck,
        0x9a968b,
        (r() - 0.5) * 2.6,
        3.15 + r() * 0.25,
        -1.4 + (r() - 0.5) * 3.6,
        0.3 + r() * 0.3,
        0.3,
        0.4
      );
    this.truck.position.set(-25, 0, 7.4);
    this.truck.rotation.y = Math.PI / 2;
    this.scene.add(this.truck);
    this.portal = new T.Scene();
    this.portal.background = new T.Color(0x051722);
    this.portal.add(new T.HemisphereLight(0x9cedda, 0x133757, 3));
    this.soul = character(false);
    this.portal.add(this.soul);
    this.rings = [];
    for (let i = 0; i < 18; i++) {
      const m = new T.Mesh(
        new T.TorusGeometry(3 + i * 0.2, 0.017, 5, 80),
        new T.MeshBasicMaterial({
          color: new T.Color().setHSL(0.46 + i * 0.005, 0.65, 0.5),
          transparent: true,
          opacity: 0.5
        })
      );
      m.position.z = -i * 3;
      this.portal.add(m);
      this.rings.push(m);
    }
    this.portalCamera = new T.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 180);
    this.portalCamera.position.set(0, 2.2, 7);
    this.portalCamera.lookAt(0, 1, 0);
  }
  resize() {
    for (const c of [this.camera, this.portalCamera]) {
      c.aspect = innerWidth / innerHeight;
      c.updateProjectionMatrix();
    }
  }
  update(dt) {
    const slow = this.t > 6.8 && this.t < 7.75 ? 0.3 : 1;
    this.t += dt * slow;
    const t = this.t,
      step = dt * slow;
    let caption = '',
      chapter = '',
      fade = 0,
      blur = 0,
      flash = 0,
      dim = 0,
      fadeColor = '';
    if (t < 6.8) {
      this.bike.position.z = -15 + t * 3.3;
      this.bike.rotation.z = Math.sin(t * 5) * 0.012;
      this.camera.position.set(4.6, 3.6, this.bike.position.z + 7);
      this.camera.lookAt(-1, 1, this.bike.position.z + 0.5);
      chapter = '前世 · 08:47';
      caption =
        t < 3.4
          ? '大學畢業後第 37 天。又是一個快遲到的早晨。'
          : t < 4.9
            ? '只要趕上前面的綠燈，今天就能準時打卡。'
            : '……喇叭聲？';
      this.truck.position.x = -25 + Math.max(0, t - 3.6) * 7.6;
      if (t > 4.9) {
        this.camera.position.x += (Math.random() - 0.5) * 0.03 * (t - 4.9);
        this.camera.lookAt(-3, 1, this.bike.position.z + 0.5);
      }
      this.renderer.render(this.scene, this.camera);
    } else if (t < 11) {
      if (!this.crash) this.startCrash();
      this.stepCrash(step, t);
      chapter = '前世 · 08:48';
      const k = t - 6.8;
      flash = Math.max(0, 1 - k * 3.2);
      const r = this.rider.position;
      if (t < 8.6) {
        caption = '砰——身體被拋上了半空。';
        const shake = Math.max(0, 0.5 - k * 0.35);
        this.camTarget ??= new V(r.x + 2, 4, r.z + 10);
        this.camTarget.lerp(new V(r.x + 1.2, Math.max(3.4, r.y + 3), r.z + 8.5), 1 - Math.exp(-step * 6));
        this.camera.position
          .copy(this.camTarget)
          .add(new V((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
        this.camera.lookAt(r.x, r.y + 0.5, r.z);
      } else {
        caption = t < 9.7 ? '一聲喇叭，世界失去了聲音。' : '……好冷。視線，越來越模糊。';
        const head = this.rider.localToWorld(new V(0, 1.6, 0.1)),
          sway = Math.sin(t * 1.7) * 0.25;
        this.camera.position.set(head.x, head.y + 0.28, head.z);
        const tr = this.truck.position,
          drift = Math.min(1, (t - 8.6) / 2.2);
        this.camera.lookAt(
          head.x + (tr.x + 1 - head.x) * (1 - drift * 0.5) + sway,
          2.8 + drift * 5,
          head.z + (tr.z - head.z) * (1 - drift * 0.5) + Math.cos(t * 1.3) * 0.3
        );
        blur = Math.min(16, (t - 8.6) * 6.5);
        dim = Math.min(1, Math.max(0, (t - 9.4) / 1.4));
        fade = Math.max(0, (t - 10.3) / 0.7);
        fadeColor = '#000';
      }
      this.renderer.render(this.scene, this.camera);
    } else if (t < 17) {
      chapter = '世界的另一側';
      caption = t < 13.8 ? '原來人生，真的可以沒有明天。' : '可是……為什麼，我還聽得見海？';
      this.soul.position.y = 0.2 + Math.sin(t) * 0.3;
      this.soul.rotation.z = Math.sin(t * 0.5) * 0.3;
      this.soul.rotation.y = t * 0.3;
      for (let i = 0; i < this.rings.length; i++) {
        const m = this.rings[i];
        m.position.z = ((t * 5 + i * 3) % 60) - 50;
        m.rotation.z = t * 0.2 + i * 0.1;
      }
      fade = t < 11.6 ? 1 - (t - 11) / 0.6 : Math.max(0, (t - 16.2) / 0.8);
      fadeColor = t < 11.6 ? '#000' : '';
      this.renderer.render(this.portal, this.portalCamera);
    } else {
      this.done = true;
      this.onFinish();
      return { caption: '', chapter: '', fade: 0, blur: 0, flash: 0, dim: 0 };
    }
    return { caption, chapter, fade, blur, flash, dim, fadeColor };
  }
  // Impact: the rider is detached from the bike and follows a ballistic tumble with bounces.
  startCrash() {
    this.crash = true;
    this.scene.attach(this.rider);
    this.vel = new V(6.8, 6.6, 7.2);
    this.spin = new V(6.2, 1.8, 7.5);
    this.rest = false;
    this.bikeVel = new V(5.5, 0, 1.6);
    this.truckV = 7.6;
    this.debris = [];
    const r = seeded(7);
    for (let i = 0; i < 14; i++) {
      const d = box(
        this.scene,
        [0x3a6f7a, 0x2a3b44, 0xd8e6ea, 0x7d979c][i % 4],
        this.bike.position.x,
        0.9,
        this.bike.position.z,
        0.12 + r() * 0.18,
        0.05 + r() * 0.1,
        0.1 + r() * 0.2
      );
      d.userData.v = new V(2 + r() * 7, 2 + r() * 6, (r() - 0.3) * 6);
      d.userData.s = new V(r() * 12, r() * 12, r() * 12);
      this.debris.push(d);
    }
    const glass = new T.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 24; i++) {
      const g = new T.Mesh(new T.TetrahedronGeometry(0.05 + r() * 0.06), glass);
      g.position.set(this.truck.position.x + 1.4, 1.9, this.truck.position.z + 1);
      g.userData.v = new V(3 + r() * 5, 1 + r() * 5, (r() - 0.5) * 7);
      g.userData.s = new V(r() * 15, r() * 15, r() * 15);
      this.scene.add(g);
      this.debris.push(g);
    }
  }
  stepCrash(dt, t) {
    const p = this.rider,
      u = p.userData;
    if (!this.rest) {
      this.vel.y -= 13 * dt;
      p.position.addScaledVector(this.vel, dt);
      p.rotation.x += this.spin.x * dt;
      p.rotation.y += this.spin.y * dt;
      p.rotation.z += this.spin.z * dt;
      u.arms.forEach((m, i) => {
        m.rotation.x = Math.sin(t * 22 + i * 2) * 1.6;
        m.rotation.z = (i ? 1 : -1) * (0.8 + Math.sin(t * 17) * 0.5);
      });
      u.legs.forEach((m, i) => (m.rotation.x = Math.sin(t * 19 + i * 2.5) * 1.1));
      if (p.position.y < 0.2 && this.vel.y < 0) {
        if (Math.abs(this.vel.y) > 3.2) {
          this.vel.y *= -0.32;
          this.vel.x *= 0.45;
          this.vel.z *= 0.45;
          this.spin.multiplyScalar(0.35);
        } else {
          this.rest = true;
          p.position.y = 0.13;
          p.rotation.set(-Math.PI / 2, 0.5, 0.25);
          u.arms.forEach((m, i) => {
            m.rotation.set(-0.3, 0, (i ? 1 : -1) * 1.25);
          });
          u.legs.forEach((m, i) => m.rotation.set(i ? 0.15 : -0.1, 0, (i ? 1 : -1) * 0.2));
        }
      }
    }
    this.bike.position.addScaledVector(this.bikeVel, dt);
    this.bikeVel.multiplyScalar(Math.exp(-dt * 1.6));
    this.bike.rotation.z += (-Math.PI * 0.47 - this.bike.rotation.z) * Math.min(1, dt * 7);
    this.bike.rotation.y += this.bikeVel.length() * dt * 0.5;
    this.truckV = Math.max(0, this.truckV - dt * 6.5);
    this.truck.position.x += this.truckV * dt;
    this.truck.rotation.z = Math.sin(t * 30) * 0.004 * this.truckV;
    for (const d of this.debris) {
      const v = d.userData.v;
      if (d.position.y <= 0.03 && v.y <= 0) {
        d.position.y = 0.03;
        v.multiplyScalar(Math.exp(-dt * 6));
        continue;
      }
      v.y -= 13 * dt;
      d.position.addScaledVector(v, dt);
      d.rotation.x += d.userData.s.x * dt;
      d.rotation.y += d.userData.s.y * dt;
    }
  }
}
