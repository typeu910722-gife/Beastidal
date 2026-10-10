// The protagonist: a jointed, anatomically proportioned human built from lofted surfaces (no external assets).
// Rig (all joints are Groups, +z is forward, heights in metres from the soles):
//   root ─ hips 0.95 ─ spine 1.05 ─ chest 1.25 ─ neck 1.50 ─ head 1.62
//                   │                        └ shoulder L/R 1.43 ─ elbow ─ wrist ─ hand
//                   └ hip L/R 0.91 ─ knee 0.49 ─ ankle 0.07 ─ foot
// animateHuman() drives walk / run / idle / sit / ride poses procedurally, with breathing and blinking.
import * as T from './vendor/three.module.min.js';
import { animateModel } from './protagonist.js?v=0.15.0';

const V = T.Vector3;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));

/* ---------------------------------------------------------------- materials */
const canPaint = typeof document !== 'undefined';
function fabric(base, grime = 0.25, weave = 3) {
  if (!canPaint) return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  const img = x.getImageData(0, 0, 128, 128),
    d = img.data;
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 128; y++)
    for (let i = 0; i < 128; i++) {
      const k = (y * 128 + i) * 4,
        w = ((i % weave) + (y % weave)) % 2 ? 0.94 : 1.04,
        stain = 1 - grime * Math.max(0, Math.sin(i * 0.05 + 1) * Math.sin(y * 0.04 + 2)) * 0.6,
        n = w * stain * (0.95 + r() * 0.1);
      d[k] *= n;
      d[k + 1] *= n;
      d[k + 2] *= n;
    }
  x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}
function eyeTexture() {
  if (!canPaint) return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#e9e4dc';
  x.fillRect(0, 0, 128, 64);
  // the iris sits at the texture centre, which SphereGeometry maps to +x; the mesh is turned to face forward
  const g = x.createRadialGradient(64, 32, 1, 64, 32, 13);
  g.addColorStop(0, '#120c08');
  g.addColorStop(0.32, '#120c08');
  g.addColorStop(0.36, '#5a3a22');
  g.addColorStop(0.8, '#3b2414');
  g.addColorStop(1, '#1a120c');
  x.fillStyle = g;
  x.beginPath();
  x.arc(64, 32, 13, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = 'rgba(255,255,255,.85)';
  x.beginPath();
  x.arc(60, 28, 2, 0, Math.PI * 2);
  x.fill();
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

/* ---------------------------------------------------------------- geometry */
// A closed tube through rings [{ y, rx, rz, z }] (bottom to top), with rounded caps. Cross-sections are
// super-ellipses (p > 2 squares them off a little, as clothing and torsos are).
function loft(rings, seg = 20, p = 2.2, uv = true) {
  const pos = [],
    uvs = [],
    idx = [];
  const all = [
    { ...rings[0], rx: 0.001, rz: 0.001, y: rings[0].y - Math.min(rings[0].rx, 0.02) * 0.5 },
    ...rings,
    { ...rings.at(-1), rx: 0.001, rz: 0.001, y: rings.at(-1).y + Math.min(rings.at(-1).rx, 0.02) * 0.5 }
  ];
  all.forEach((r, i) => {
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2,
        c = Math.cos(a),
        s = Math.sin(a),
        k = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);
      pos.push(c * k * r.rx + (r.x || 0), r.y, s * k * r.rz + (r.z || 0));
      if (uv) uvs.push(j / seg, i / (all.length - 1));
    }
  });
  for (let i = 0; i < all.length - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j,
        b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// A limb hanging down from its joint: radius r0 → r1 over len, with a muscle belly (peak at `at`, pushed
// toward z by `back` for calves and forearms).
function limb(len, r0, r1, belly = 0, at = 0.3, back = 0, n = 12) {
  const rings = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      m = belly * gauss(t - at, 0.22),
      r = r0 + (r1 - r0) * t + m;
    rings.push({ y: -t * len, rx: r, rz: r * 0.96 + m * 0.2, z: back * m * 4 });
  }
  return loft(rings.reverse(), 16, 2);
}
function mesh(parent, geo, mat, pos, rot, scale) {
  const m = new T.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function joint(parent, x, y, z) {
  const g = new T.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// Sculpted head: a unit sphere pushed into a skull, jaw, brow, cheekbones, eye sockets, nose and lips.
function shapeHead(x, y, z) {
  const front = Math.max(0, z);
  x *= 0.88 * (1 - 0.17 * smooth(-0.2, -0.95, y) * (0.5 + 0.5 * front));
  z *= z < 0 ? 1.05 : 0.98;
  if (y < -0.25) z += 0.05 * smooth(-0.5, -0.9, y) * front; // chin
  if (y < -0.3 && z < 0) z *= 1 - 0.3 * smooth(-0.3, -0.9, y); // the jaw tucks into the neck at the back
  z += 0.045 * gauss(y - 0.27, 0.07) * smooth(0.4, 0.8, front) * gauss(x, 0.45); // brow ridge
  for (const s of [-1, 1]) {
    z -= 0.07 * gauss(x - s * 0.34, 0.11) * gauss(y - 0.12, 0.08) * smooth(0.5, 0.85, front); // eye sockets
    const ck = gauss(x - s * 0.5, 0.16) * gauss(y + 0.08, 0.12) * front;
    z += 0.04 * ck;
    x += s * 0.02 * ck;
  }
  const nx = gauss(x, 0.055 + 0.06 * smooth(0.05, -0.28, y));
  // nose: a straight bridge from between the eyes down to a rounded tip, wings either side
  z +=
    nx *
    smooth(0.6, 0.85, front) *
    (0.075 * smooth(0.22, 0.05, y) * smooth(-0.3, -0.12, y) + 0.06 * gauss(y + 0.2, 0.085));
  for (const s of [-1, 1]) z += 0.025 * gauss(x - s * 0.1, 0.05) * gauss(y + 0.25, 0.05) * front;
  const lipZone = gauss(x, 0.19) * smooth(0.7, 0.9, front);
  z += lipZone * (0.03 * gauss(y + 0.45, 0.035) + 0.035 * gauss(y + 0.54, 0.04) - 0.012 * gauss(y + 0.495, 0.012));
  z += 0.035 * gauss(x, 0.2) * gauss(y + 0.8, 0.09) * front;
  return [x, y, z, lipZone];
}
// Vertex colours add lips, a little flush on the cheeks and two days of stubble.
function headGeometry(skin) {
  const g = new T.SphereGeometry(1, 56, 44),
    p = g.attributes.position,
    col = [],
    base = new T.Color(skin),
    lip = new T.Color(skin).lerp(new T.Color(0xa65a50), 0.5),
    stub = new T.Color(skin).lerp(new T.Color(0x4a443e), 0.22),
    flush = new T.Color(skin).lerp(new T.Color(0xc0705a), 0.15),
    c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const y0 = p.getY(i),
      [x, y, z, lipZone] = shapeHead(p.getX(i), y0, p.getZ(i));
    p.setXYZ(i, x, y, z);
    const front = Math.max(0, z),
      lips = lipZone * gauss(y + 0.495, 0.06) * gauss(x, 0.17);
    c.copy(base).lerp(lip, Math.min(1, lips * 1.4));
    c.multiplyScalar(1 - 0.35 * lipZone * gauss(y + 0.495, 0.012) * gauss(x, 0.13));
    c.lerp(flush, 0.6 * (gauss(x - 0.5, 0.15) + gauss(x + 0.5, 0.15)) * gauss(y + 0.12, 0.12) * front);
    c.lerp(stub, smooth(-0.4, -0.75, y) * (0.3 + 0.7 * front) * (1 - Math.min(1, lips * 3)));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
// Short, messy hair: the same skull shape, grown outward where hair grows and sunk inside the head elsewhere,
// so the hairline is a soft edge rather than a seam.
function hairGeometry() {
  const g = new T.SphereGeometry(1, 48, 36),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i),
      uy = p.getY(i),
      uz = p.getZ(i);
    // hairline: high at the forehead, receding a touch at the temples, down to the nape at the back
    const line =
      (uz > 0 ? 0.4 + 0.14 * Math.abs(ux) * smooth(0.2, 0.9, uz) - 0.5 * smooth(0.6, 0.0, uz) : -0.08 + 0.5 * uz) +
      0.05 * Math.sin(ux * 17 + 1) * smooth(0.3, 0.8, uz); // ragged fringe
    const w = smooth(line - 0.04, line + 0.08, uy) * (Math.abs(ux) > 0.82 && uy < 0.1 ? 0 : 1),
      clump = 0.05 * Math.sin(ux * 11 + uz * 6) * Math.sin(uy * 9 + ux * 4) + 0.025 * Math.sin(uz * 19 + uy * 13),
      grow = 0.93 + w * (0.14 + clump + 0.06 * Math.max(0, uy));
    const [x, y, z] = shapeHead(ux, uy, uz);
    p.setXYZ(i, x * grow, y * grow + w * 0.02, z * grow);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- the body */
export function makeHuman(opts = {}) {
  const skin = opts.skin ?? 0xc99a7c,
    M = {
      skin: new T.MeshPhysicalMaterial({
        vertexColors: false,
        color: skin,
        roughness: 0.52,
        sheen: 0.35,
        sheenColor: new T.Color(0xd08060),
        sheenRoughness: 0.5
      }),
      face: new T.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.5,
        sheen: 0.35,
        sheenColor: new T.Color(0xd08060),
        sheenRoughness: 0.5
      }),
      shirt: new T.MeshStandardMaterial({ color: 0xffffff, map: fabric('#cfc9bb', 0.35, 2), roughness: 0.85 }),
      pants: new T.MeshStandardMaterial({ color: 0xffffff, map: fabric('#33383b', 0.2, 2), roughness: 0.8 }),
      shoe: new T.MeshStandardMaterial({ color: 0x2b221b, roughness: 0.45, metalness: 0.05 }),
      sole: new T.MeshStandardMaterial({ color: 0x141210, roughness: 0.9 }),
      hair: new T.MeshPhysicalMaterial({
        color: 0x1d1714,
        roughness: 0.62,
        sheen: 0.6,
        sheenColor: new T.Color(0x5a4a40)
      }),
      brow: new T.MeshStandardMaterial({ color: 0x1a1411, roughness: 0.9 }),
      tie: new T.MeshStandardMaterial({ color: 0x24324a, roughness: 0.6 }),
      belt: new T.MeshStandardMaterial({ color: 0x1e1916, roughness: 0.4 }),
      metal: new T.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.3, metalness: 0.9 }),
      eye: new T.MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
      badge: new T.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.5 })
    };
  const root = new T.Group(),
    J = {};
  J.hips = joint(root, 0, 0.95, 0);
  // pelvis and trousers' seat
  mesh(
    J.hips,
    loft(
      [
        { y: -0.17, rx: 0.12, rz: 0.1, z: -0.005 },
        { y: -0.1, rx: 0.165, rz: 0.115, z: -0.01 },
        { y: 0.0, rx: 0.172, rz: 0.118, z: -0.008 },
        { y: 0.09, rx: 0.155, rz: 0.11 },
        { y: 0.13, rx: 0.15, rz: 0.106 }
      ],
      22,
      2.3
    ),
    M.pants
  );
  mesh(
    J.hips,
    loft(
      [
        { y: 0.075, rx: 0.157, rz: 0.112 },
        { y: 0.115, rx: 0.157, rz: 0.112 }
      ],
      22,
      2.3
    ),
    M.belt
  );
  mesh(J.hips, new T.BoxGeometry(0.05, 0.034, 0.012), M.metal, [0, 0.095, 0.113]);
  // torso: waist, ribcage, chest and shoulders under a shirt
  J.spine = joint(J.hips, 0, 0.1, 0);
  mesh(
    J.spine,
    loft(
      [
        { y: -0.03, rx: 0.15, rz: 0.106 },
        { y: 0.06, rx: 0.145, rz: 0.104 },
        { y: 0.18, rx: 0.158, rz: 0.11, z: 0.004 },
        { y: 0.29, rx: 0.175, rz: 0.118, z: 0.012 },
        { y: 0.35, rx: 0.185, rz: 0.12, z: 0.012 },
        { y: 0.4, rx: 0.19, rz: 0.11, z: 0.002 },
        { y: 0.43, rx: 0.15, rz: 0.085 },
        { y: 0.455, rx: 0.075, rz: 0.065 }
      ],
      24,
      2.4
    ),
    M.shirt
  );
  // collar, open at the throat, and a loosened tie
  for (const s of [-1, 1]) {
    const flap = mesh(J.spine, new T.BoxGeometry(0.07, 0.045, 0.008), M.shirt, [s * 0.045, 0.425, 0.068]);
    flap.rotation.set(-0.5, s * 0.5, s * 0.5);
  }
  const tie = mesh(J.spine, new T.BoxGeometry(0.05, 0.3, 0.008), M.tie, [0.012, 0.25, 0.122]);
  tie.rotation.set(-0.08, 0, 0.06);
  mesh(J.spine, new T.BoxGeometry(0.045, 0.04, 0.02), M.tie, [0.004, 0.395, 0.1]).rotation.x = -0.3;
  // company ID badge on its lanyard
  for (const s of [-1, 1])
    mesh(J.spine, new T.CylinderGeometry(0.004, 0.004, 0.24, 4), M.tie, [s * 0.05, 0.3, 0.11], [0.15, 0, s * 0.18]);
  mesh(J.spine, new T.BoxGeometry(0.06, 0.08, 0.004), M.badge, [0, 0.17, 0.124]).rotation.x = -0.1;

  J.chest = joint(J.spine, 0, 0.2, 0);
  J.neck = joint(J.chest, 0, 0.25, -0.01);
  mesh(J.neck, limb(0.12, 0.05, 0.056, 0, 0.5).translate(0, 0.1, 0), M.skin, [0, 0, 0.005]);
  J.head = joint(J.neck, 0, 0.12, 0.01);
  const head = mesh(J.head, headGeometry(skin), M.face, [0, 0, 0], null, [0.097, 0.118, 0.112]);
  head.castShadow = true;
  mesh(J.head, hairGeometry(), M.hair, [0, 0, 0], null, [0.097, 0.118, 0.112]);
  // ears
  for (const s of [-1, 1]) {
    const ear = mesh(
      J.head,
      new T.SphereGeometry(1, 12, 10),
      M.skin,
      [s * 0.086, -0.005, -0.01],
      null,
      [0.012, 0.03, 0.02]
    );
    ear.rotation.y = s * 0.35;
  }
  // eyes under lids, brows
  J.lids = [];
  for (const s of [-1, 1]) {
    const at = [s * 0.033, 0.014, 0.085];
    const eye = mesh(J.head, new T.SphereGeometry(0.0138, 16, 12), M.eye, at);
    eye.rotation.y = -Math.PI / 2;
    const lid = mesh(J.head, new T.SphereGeometry(0.0146, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), M.skin, at);
    lid.rotation.x = -0.65;
    J.lids.push(lid);
    const brow = new T.CatmullRomCurve3([
      new V(s * 0.013, 0.033, 0.094),
      new V(s * 0.031, 0.038, 0.095),
      new V(s * 0.052, 0.033, 0.084)
    ]);
    mesh(J.head, new T.TubeGeometry(brow, 8, 0.0032, 5), M.brow, null, null, [1, 0.6, 1]).position.y = 0.014;
  }
  // arms: shirt over the upper arm, sleeves rolled to the elbow, bare forearms, hands with fingers
  J.arms = [];
  J.elbows = [];
  J.wrists = [];
  for (const s of [-1, 1]) {
    const sh = joint(J.chest, s * 0.19, 0.18, -0.01);
    mesh(sh, new T.SphereGeometry(0.06, 14, 10), M.shirt, [0, -0.01, 0], null, [1, 0.95, 1]);
    mesh(sh, limb(0.3, 0.058, 0.044, 0.008, 0.35), M.shirt);
    mesh(
      sh,
      loft(
        [
          { y: -0.29, rx: 0.05, rz: 0.048 },
          { y: -0.245, rx: 0.052, rz: 0.05 }
        ],
        14,
        2
      ),
      M.shirt
    );
    const el = joint(sh, 0, -0.3, 0);
    mesh(el, new T.SphereGeometry(0.039, 12, 10), M.skin);
    mesh(el, limb(0.25, 0.04, 0.028, 0.008, 0.25, 0.002), M.skin);
    const wr = joint(el, 0, -0.25, 0);
    if (s < 0)
      mesh(
        wr,
        loft(
          [
            { y: 0.01, rx: 0.031, rz: 0.029 },
            { y: 0.035, rx: 0.031, rz: 0.029 }
          ],
          14,
          2
        ),
        M.belt
      );
    // palm, four fingers in two segments, thumb
    mesh(
      wr,
      loft(
        [
          { y: -0.005, rx: 0.027, rz: 0.014 },
          { y: -0.05, rx: 0.038, rz: 0.015 },
          { y: -0.09, rx: 0.037, rz: 0.012 }
        ],
        12,
        2.6
      ),
      M.skin
    );
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.018,
        len = [0.05, 0.058, 0.055, 0.042][f],
        k1 = joint(wr, fx, -0.088, 0.002);
      k1.rotation.x = -0.25;
      mesh(k1, limb(len * 0.55, 0.0085, 0.0075), M.skin);
      const k2 = joint(k1, 0, -len * 0.55, 0);
      k2.rotation.x = -0.35;
      mesh(k2, limb(len * 0.45, 0.0075, 0.0062), M.skin);
    }
    const th = joint(wr, s * -0.022, -0.03, 0.012);
    th.rotation.set(-0.5, 0, s * 0.6);
    mesh(th, limb(0.05, 0.01, 0.0075), M.skin);
    J.arms.push(sh);
    J.elbows.push(el);
    J.wrists.push(wr);
  }
  // legs: trousers to the ankle, leather shoes
  J.legs = [];
  J.knees = [];
  J.ankles = [];
  for (const s of [-1, 1]) {
    const hp = joint(J.hips, s * 0.092, -0.04, 0);
    mesh(hp, limb(0.43, 0.09, 0.058, 0.012, 0.25), M.pants);
    const kn = joint(hp, 0, -0.42, 0);
    mesh(kn, new T.SphereGeometry(0.058, 12, 10), M.pants);
    mesh(kn, limb(0.42, 0.058, 0.042, 0.012, 0.28, -0.004), M.pants);
    const an = joint(kn, 0, -0.42, 0);
    // shoe: a lofted last from heel to toe
    const shoe = loft(
      [
        { y: -0.06, rx: 0.042, rz: 0.04 },
        { y: 0.0, rx: 0.046, rz: 0.042 },
        { y: 0.07, rx: 0.05, rz: 0.04 },
        { y: 0.15, rx: 0.048, rz: 0.03 },
        { y: 0.19, rx: 0.036, rz: 0.022 }
      ],
      14,
      2.6
    );
    shoe.rotateX(Math.PI / 2);
    mesh(an, shoe, M.shoe, [0, -0.035, 0.0]);
    mesh(an, new T.BoxGeometry(0.095, 0.014, 0.26), M.sole, [0, -0.07, 0.065]);
    J.legs.push(hp);
    J.knees.push(kn);
    J.ankles.push(an);
  }
  root.userData = {
    J,
    legs: J.legs,
    arms: J.arms,
    phase: 0,
    blink: 2 + Math.random() * 3,
    t: Math.random() * 10
  };
  return root;
}

/* ---------------------------------------------------------------- animation */
const lerp = (a, b, k) => a + (b - a) * k;
// mode: 'walk' (speed in m/s; idle when ~0, runs above ~4), 'sit', 'ride', 'row'.
export function animateHuman(h, dt, { speed = 0, mode = 'walk' } = {}) {
  // once the rigged model has dressed this figure, its clips drive the body
  if (animateModel(h, dt, { speed, mode })) return;
  const u = h.userData,
    J = u.J;
  u.t += dt;
  const t = u.t;
  // blink every few seconds
  u.blink -= dt;
  const lidClose = u.blink < 0.12 ? 1 - Math.abs(u.blink - 0.06) / 0.06 : 0;
  if (u.blink < 0) u.blink = 2.5 + Math.random() * 4;
  for (const lid of J.lids) lid.rotation.x = lerp(-0.65, 1.0, Math.max(0, lidClose));
  const breathe = Math.sin(t * 1.6);
  J.chest.scale.set(1 + breathe * 0.008, 1, 1 + breathe * 0.012);

  if (mode === 'sit' || mode === 'ride' || mode === 'row') {
    const ride = mode === 'ride',
      row = mode === 'row' ? Math.sin(t * 2.2) * Math.min(1, speed * 0.4) : 0;
    J.hips.position.y = ride ? 0.95 : 0.2;
    J.hips.rotation.set(0, 0, 0);
    J.spine.rotation.set(0.12 + row * 0.25, 0, 0);
    J.chest.rotation.set(0.05, 0, 0);
    J.head.rotation.set(-0.12 - row * 0.15, Math.sin(t * 0.3) * 0.25, 0);
    J.neck.rotation.set(0, 0, 0);
    J.legs.forEach((l, i) => {
      const s = i ? 1 : -1;
      l.rotation.set(ride ? -1.25 : -1.45, 0, s * (ride ? 0.45 : 0.12));
      J.knees[i].rotation.x = ride ? 1.5 : 1.95;
      J.ankles[i].rotation.x = ride ? -0.2 : -0.45;
    });
    J.arms.forEach((a, i) => {
      const s = i ? 1 : -1;
      a.rotation.set(-0.55 - row * 0.5, 0, s * 0.12);
      J.elbows[i].rotation.x = -0.9 + row * 0.4;
      J.wrists[i].rotation.x = 0.1;
    });
    return;
  }
  // walking / running / idle
  const run = smooth(3.4, 4.4, speed),
    a = Math.min(1, speed / 2.6);
  u.phase += dt * (speed / (1.35 + run * 0.9)) * Math.PI * 2;
  const p = u.phase,
    s = Math.sin(p),
    c = Math.cos(p);
  const stride = lerp(0.42, 0.7, run) * a;
  J.hips.position.y = 0.95 - 0.012 * a + Math.abs(c) * 0.03 * a - 0.04 * run;
  J.hips.rotation.set(0, s * 0.1 * a, s * 0.04 * a);
  J.spine.rotation.set(0.03 + run * 0.14, -s * 0.14 * a, -s * 0.02 * a);
  J.chest.rotation.set(0, -s * 0.05 * a, 0);
  J.neck.rotation.set(0, s * 0.08 * a, 0);
  // idle: weight shifts, the head looks around a little
  const idle = 1 - a;
  J.head.rotation.set(
    -0.05 * run + idle * Math.sin(t * 0.37) * 0.06,
    idle * Math.sin(t * 0.23) * 0.35 + s * 0.06 * a,
    idle * Math.sin(t * 0.5) * 0.03
  );
  J.hips.position.x = idle * Math.sin(t * 0.45) * 0.015;
  J.hips.rotation.z += idle * Math.sin(t * 0.45) * 0.025;
  J.legs.forEach((l, i) => {
    const q = i ? p + Math.PI : p,
      ls = Math.sin(q),
      lc = Math.cos(q);
    // thigh swings forward (negative x) and back; the knee folds in the swing phase and straightens to land
    l.rotation.set(-ls * stride, 0, (i ? 1 : -1) * 0.02);
    J.knees[i].rotation.x = Math.max(0, -lc) * lerp(0.75, 1.5, run) * a + 0.06 * a + 0.02;
    J.ankles[i].rotation.x = lerp(0, 0.35 * ls - 0.25 * Math.max(0, lc), a);
  });
  J.arms.forEach((ar, i) => {
    const q = i ? p : p + Math.PI,
      as = Math.sin(q);
    ar.rotation.set(
      -as * lerp(0.35, 0.6, run) * a + idle * Math.sin(t * 0.8 + i) * 0.02,
      0,
      (i ? 1 : -1) * (0.08 + idle * 0.02)
    );
    J.elbows[i].rotation.x = -(0.18 + run * 1.1 + Math.max(0, -as) * 0.35 * a);
    J.wrists[i].rotation.x = -0.1;
  });
}
