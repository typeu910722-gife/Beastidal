// 嘯岳 (Xiaoyue), the ancient sabre-toothed beast of the sealed pact: a procedural, rigged-by-groups model with
// quiet idle life (breathing, tail, ears, a slow look around) rather than any in-your-face animation.
import * as T from './vendor/three.module.min.js';

const V = T.Vector3;
function mesh(parent, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot) {
  const m = new T.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function tube(parent, pts, r, mat, seg = 16) {
  const curve = new T.CatmullRomCurve3(pts.map(p => new V(...p)));
  return mesh(parent, new T.TubeGeometry(curve, seg, r, 8, false), mat);
}
// stone = the sealed statue under the Great Gate; otherwise the living, glowing beast
export function makeSabertooth({ stone = false } = {}) {
  const g = new T.Group(),
    rig = new T.Group();
  g.add(rig);
  const fur = stone
    ? new T.MeshStandardMaterial({ color: 0x6b8a86, roughness: 0.95 })
    : new T.MeshStandardMaterial({ color: 0xc89b5e, roughness: 0.78 });
  const belly = stone ? fur : new T.MeshStandardMaterial({ color: 0xead6b0, roughness: 0.82 });
  const dark = stone ? fur : new T.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.7 });
  const ivory = new T.MeshStandardMaterial({ color: stone ? 0x8aa7a2 : 0xf3ead4, roughness: 0.35 });
  const glow = new T.MeshStandardMaterial({
    color: stone ? 0x6fd0c0 : 0xffd27a,
    emissive: stone ? 0x2f8f80 : 0xffb347,
    emissiveIntensity: stone ? 0.5 : 1.6,
    roughness: 0.3
  });
  const sphere = new T.SphereGeometry(1, 24, 16);
  // torso: a deep chest tapering to the haunches
  const body = new T.Group();
  body.position.y = 1.55;
  rig.add(body);
  mesh(body, sphere, fur, [0, 0.05, 0.35], [0.82, 0.78, 1.15]);
  mesh(body, sphere, fur, [0, -0.02, -0.75], [0.7, 0.68, 0.9]);
  mesh(body, sphere, belly, [0, -0.38, 0.15], [0.62, 0.42, 1.2]);
  // shoulder ruff
  mesh(body, sphere, fur, [0, 0.35, 0.95], [0.78, 0.6, 0.55]);
  // stripes that glow faintly along the back (the mark of the pact)
  for (let i = 0; i < 7; i++) {
    const z = 0.95 - i * 0.32;
    tube(
      body,
      [
        [-0.62, 0.15, z],
        [-0.2, 0.74, z - 0.05],
        [0.2, 0.74, z - 0.05],
        [0.62, 0.15, z]
      ],
      0.035,
      i % 2 ? dark : glow,
      10
    );
  }
  // legs: shoulder/hip pivots so the gait can swing them
  const legs = [];
  for (const [x, z, front] of [
    [-0.5, 0.95, 1],
    [0.5, 0.95, 1],
    [-0.46, -1.05, 0],
    [0.46, -1.05, 0]
  ]) {
    const hip = new T.Group();
    hip.position.set(x, 1.55, z);
    rig.add(hip);
    mesh(hip, sphere, fur, [0, -0.25, 0], [0.3, 0.45, 0.34]);
    mesh(hip, new T.CylinderGeometry(0.17, 0.14, 0.9, 10), fur, [0, -0.85, front ? 0.05 : -0.08]);
    mesh(hip, sphere, belly, [0, -1.38, front ? 0.12 : 0.02], [0.22, 0.12, 0.3]);
    for (let t = -1; t <= 1; t++)
      mesh(
        hip,
        new T.ConeGeometry(0.035, 0.12, 6),
        ivory,
        [t * 0.09, -1.45, front ? 0.36 : 0.26],
        [1, 1, 1],
        [Math.PI / 2, 0, 0]
      );
    hip.userData.front = front;
    legs.push(hip);
  }
  // neck + head on their own pivots for the look-around idle
  const neck = new T.Group();
  neck.position.set(0, 1.95, 1.25);
  rig.add(neck);
  mesh(neck, sphere, fur, [0, 0.12, 0.25], [0.45, 0.48, 0.55]);
  const head = new T.Group();
  head.position.set(0, 0.35, 0.65);
  neck.add(head);
  mesh(head, sphere, fur, [0, 0, 0], [0.48, 0.42, 0.55]);
  mesh(head, sphere, belly, [0, -0.12, 0.42], [0.3, 0.22, 0.32]); // muzzle
  mesh(head, sphere, dark, [0, 0.02, 0.66], [0.09, 0.07, 0.06]); // nose
  const jaw = new T.Group();
  jaw.position.set(0, -0.2, 0.15);
  head.add(jaw);
  mesh(jaw, sphere, belly, [0, -0.05, 0.25], [0.24, 0.1, 0.3]);
  // the sabres: long curved upper canines
  for (const s of [-1, 1]) {
    tube(
      head,
      [
        [s * 0.12, -0.18, 0.5],
        [s * 0.13, -0.42, 0.52],
        [s * 0.11, -0.66, 0.44],
        [s * 0.08, -0.82, 0.32]
      ],
      0.045,
      ivory,
      12
    );
    mesh(head, sphere, glow, [s * 0.2, 0.12, 0.4], [0.07, 0.05, 0.04]); // eyes
    mesh(head, sphere, dark, [s * 0.25, 0.14, 0.38], [0.05, 0.035, 0.03]);
    const ear = mesh(
      head,
      new T.ConeGeometry(0.11, 0.24, 8),
      fur,
      [s * 0.3, 0.38, -0.08],
      [1, 1, 0.6],
      [0, 0, -s * 0.35]
    );
    ear.userData.side = s;
  }
  // brow ridge and a crest of glowing whisker-runes
  mesh(head, sphere, fur, [0, 0.2, 0.18], [0.42, 0.12, 0.3]);
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      tube(
        head,
        [
          [s * 0.25, -0.08 - i * 0.04, 0.48],
          [s * 0.6, -0.04 - i * 0.07, 0.5],
          [s * 0.85, -0.02 - i * 0.12, 0.4]
        ],
        0.006,
        glow,
        6
      );
  // tail on a pivot, two segments for a lazy S-curve
  const tail = new T.Group();
  tail.position.set(0, 1.75, -1.55);
  rig.add(tail);
  const tail2 = new T.Group();
  tube(
    tail,
    [
      [0, 0, 0],
      [0, -0.2, -0.45],
      [0, -0.45, -0.85]
    ],
    0.1,
    fur,
    10
  );
  tail2.position.set(0, -0.45, -0.85);
  tail.add(tail2);
  tube(
    tail2,
    [
      [0, 0, 0],
      [0, -0.2, -0.35],
      [0, -0.15, -0.7]
    ],
    0.08,
    fur,
    10
  );
  mesh(tail2, sphere, dark, [0, -0.15, -0.72], [0.12, 0.12, 0.18]);
  let aura = null;
  if (!stone) {
    aura = new T.Mesh(
      new T.TorusGeometry(2.4, 0.03, 6, 80),
      new T.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.45, depthWrite: false })
    );
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.05;
    g.add(aura);
  }
  g.userData = {
    rig,
    body,
    legs,
    neck,
    head,
    jaw,
    tail,
    tail2,
    aura,
    stone,
    ears: head.children.filter(c => c.userData.side)
  };
  return g;
}
// Idle life. look: angle (radians) toward something of interest; gait 0..1 while walking; roar 0..1 when it speaks.
export function animateSabertooth(m, t, { look = 0, gait = 0, roar = 0 } = {}) {
  const u = m.userData;
  if (u.stone) return;
  const breathe = Math.sin(t * 1.1);
  u.body.scale.set(1 + breathe * 0.012, 1 + breathe * 0.018, 1);
  u.body.position.y = 1.55 + breathe * 0.01;
  // the head drifts toward what interests it, with small idle glances
  const glance = Math.sin(t * 0.23) * 0.35 + Math.sin(t * 0.61) * 0.12;
  u.neck.rotation.y += (look * 0.7 + glance * (1 - Math.min(1, Math.abs(look))) - u.neck.rotation.y) * 0.04;
  u.neck.rotation.x = Math.sin(t * 0.4) * 0.05 - roar * 0.35;
  u.jaw.rotation.x = roar * 0.55 + Math.max(0, Math.sin(t * 0.13 - 1.2)) ** 30 * 0.4; // the occasional slow yawn
  for (const e of u.ears) e.rotation.x = Math.max(0, Math.sin(t * 1.7 + e.userData.side * 2)) ** 40 * -0.6; // ear flicks
  u.tail.rotation.y = Math.sin(t * 0.8) * 0.35;
  u.tail2.rotation.y = Math.sin(t * 0.8 - 0.9) * 0.45;
  u.tail.rotation.x = -0.15 + Math.sin(t * 0.5) * 0.08;
  u.legs.forEach((leg, i) => {
    const phase = (i === 0 || i === 3 ? 0 : Math.PI) + t * 4.5;
    leg.rotation.x = Math.sin(phase) * 0.45 * gait;
  });
  if (u.aura) {
    u.aura.rotation.z = t * 0.2;
    u.aura.material.opacity = 0.3 + Math.sin(t * 1.4) * 0.12;
  }
}
