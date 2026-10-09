import * as T from './vendor/three.module.min.js';
import { phenotype } from './genetics.js?v=0.9.0';
const V = T.Vector3;
function mesh(parent, geo, material) {
  const m = new T.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function tube(parent, pts, r, material) {
  return mesh(
    parent,
    new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new V(...p))), Math.max(12, pts.length * 5), r, 5, false),
    material
  );
}
function oval(parent, pos, scale, material) {
  const m = mesh(parent, new T.SphereGeometry(1, 16, 12), material);
  m.position.set(...pos);
  m.scale.set(...scale);
  return m;
}
// Ring loft: one continuous tapered skin instead of overlapping primitive bodies.
function skin(parent, profile, material, p) {
  const positions = [],
    cols = [],
    indices = [],
    N = 28;
  const base = new T.Color().setHSL(p.hue, 0.53, 0.43),
    light = new T.Color().setHSL((p.hue + 0.035) % 1, 0.34, 0.79),
    mark = new T.Color().setHSL((p.hue + 0.09) % 1, 0.64, 0.29);
  for (let j = 0; j < profile.length; j++) {
    const [z, rx, ry, cy = 0] = profile[j];
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * Math.PI * 2,
        x = Math.cos(a) * rx,
        y = Math.sin(a) * ry;
      positions.push(x, y + cy, z);
      const c = base.clone().lerp(light, Math.max(0, -Math.sin(a)) * 0.82);
      const pat =
        p.pattern === 0
          ? Math.sin(z * 13 + a * 5)
          : p.pattern === 1
            ? Math.sin(z * 18)
            : Math.sin(a * 11 + z * 4) * Math.cos(z * 12);
      if (pat > 0.76 && Math.sin(a) > -0.2) c.lerp(mark, 0.62);
      cols.push(c.r, c.g, c.b);
      if (j && k) {
        const q = j * (N + 1) + k;
        indices.push(q, q - 1, q - N - 2, q, q - N - 2, q - N - 1);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return mesh(parent, g, material);
}
function membrane(parent, points, material) {
  const shape = new T.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    shape.quadraticCurveTo(
      (points[i - 1][0] + points[i][0]) / 2,
      (points[i - 1][1] + points[i][1]) / 2,
      points[i][0],
      points[i][1]
    );
  shape.closePath();
  const g = new T.ShapeGeometry(shape, 12);
  g.rotateX(Math.PI / 2);
  return mesh(parent, g, material);
}
export function makeCreature(genome) {
  const p = phenotype(genome),
    group = new T.Group(),
    body = new T.Group();
  group.add(body);
  const base = new T.Color().setHSL(p.hue, 0.55, 0.44),
    accent = new T.Color().setHSL((p.hue + 0.09) % 1, 0.52, 0.7);
  const solid = new T.MeshStandardMaterial({ color: base, roughness: 0.42, metalness: 0.12 }),
    skinMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.43, metalness: 0.08, side: T.DoubleSide }),
    finMat = new T.MeshStandardMaterial({
      color: accent,
      side: T.DoubleSide,
      roughness: 0.42,
      transparent: true,
      opacity: 0.92
    }),
    lineMat = new T.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.45), roughness: 0.6 }),
    glow = new T.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: p.glow * 0.65,
      roughness: 0.3
    }),
    eyeMat = new T.MeshStandardMaterial({ color: 0x071e26, roughness: 0.13 }),
    white = new T.MeshStandardMaterial({ color: 0xe8eacc, roughness: 0.3 });
  const limbs = [];
  const length = 1 + p.tail * 0.12;
  function eyes(z, y, width) {
    for (const side of [-1, 1]) {
      oval(body, [side * width, y, z], [0.082, 0.08, 0.08], white);
      oval(body, [side * (width + 0.026), y + 0.008, z + 0.045], [0.055, 0.055, 0.045], eyeMat);
      oval(body, [side * (width + 0.04), y + 0.028, z + 0.07], [0.016, 0.018, 0.012], white);
    }
  }
  function fin(side, z, span, back) {
    const pivot = new T.Group();
    pivot.position.set(side * 0.35, -0.05, z);
    body.add(pivot);
    const points = [
      [0, 0.24],
      [side * span, -0.2],
      [side * span * 0.68, -back],
      [0, -0.5]
    ];
    membrane(pivot, points, finMat);
    for (let n = 1; n <= 4; n++)
      tube(
        pivot,
        [
          [0, 0, 0.15],
          [(side * span * n) / 5, -0.015, -0.18],
          [(side * span * n) / 5, -0.02, (-back * n) / 5]
        ],
        0.009,
        lineMat
      );
    pivot.userData.side = side;
    limbs.push(pivot);
    return pivot;
  }
  if (p.body === 0) {
    skin(
      body,
      [
        [-1.48, 0.06, 0.08],
        [-1.1, 0.15, 0.19],
        [-0.6, 0.34, 0.43],
        [0, 0.48, 0.57],
        [0.55, 0.43, 0.49],
        [1, 0.29, 0.32],
        [1.3, 0.08, 0.14],
        [1.34, 0.015, 0.07]
      ],
      skinMat,
      p
    );
    eyes(0.93, 0.2, 0.275);
    for (const side of [-1, 1]) {
      fin(side, 0.28, 0.55 + p.fin * 0.19, 0.8);
      for (let n = 0; n < 3; n++)
        tube(
          body,
          [
            [side * 0.33, 0.32, 0.66 - n * 0.085],
            [side * 0.445, 0.08, 0.53 - n * 0.085],
            [side * 0.36, -0.27, 0.47 - n * 0.085]
          ],
          0.013,
          lineMat
        );
      tube(
        body,
        [
          [side * 0.4, 0.07, 0.4],
          [side * 0.43, 0.06, 0],
          [side * 0.25, 0.03, -0.8]
        ],
        0.012,
        glow
      );
    }
    const dorsal = membrane(
      body,
      [
        [0, 0],
        [0.25, 0.8 + p.horn * 0.1],
        [0.75, 0.42],
        [1.2, 0]
      ],
      finMat
    );
    dorsal.rotation.z = Math.PI / 2;
    dorsal.position.set(0, 0.42, 0.1);
    dorsal.rotation.y = Math.PI / 2;
    const tail = new T.Group();
    tail.position.z = -1.4;
    body.add(tail);
    const f = membrane(
      tail,
      [
        [0, 0],
        [-0.65, -0.75 * length],
        [-0.22, -0.5 * length],
        [0, -0.31],
        [0.22, -0.5 * length],
        [0.65, -0.75 * length]
      ],
      finMat
    );
    f.rotation.z = Math.PI / 2;
    tail.userData.tail = true;
    limbs.push(tail);
    for (let j = 0; j < 5; j++) oval(body, [0, 0.55 - j * 0.018, 0.25 - j * 0.16], [0.025, 0.027, 0.035], glow);
  } else if (p.body === 1) {
    skin(
      body,
      [
        [-1.4, 0.08, 0.08],
        [-0.8, 0.45, 0.17],
        [0, 0.72, 0.25],
        [0.8, 0.55, 0.24],
        [1.15, 0.24, 0.15],
        [1.24, 0.1, 0.09]
      ],
      skinMat,
      p
    );
    for (const side of [-1, 1]) {
      const wing = fin(side, 0.5, 1.65 + p.fin * 0.22, 1.5);
      wing.position.x = side * 0.35;
      for (let n = 0; n < 4; n++)
        tube(
          body,
          [
            [side * 0.2, -0.21, 0.55 - n * 0.16],
            [side * 0.4, -0.23, 0.53 - n * 0.16]
          ],
          0.012,
          lineMat
        );
      tube(
        body,
        [
          [side * 0.3, 0.02, 1],
          [side * 0.35, 0.03, 1.45],
          [side * 0.17, 0.04, 1.6]
        ],
        0.065,
        solid
      );
    }
    eyes(0.77, 0.25, 0.34);
    const tail = tube(
      body,
      [
        [0, 0, -1],
        [0, -0.02, -1.7],
        [0.15, 0.03, -2.6],
        [0.25, 0.14, -3.2 - p.tail * 0.2]
      ],
      0.034,
      solid
    );
    tail.userData.tail = true;
    limbs.push(tail);
    for (let n = 0; n < 6; n++)
      oval(body, [Math.sin(n * 2.4) * 0.4, 0.24, 0.55 - n * 0.22], [0.027, 0.014, 0.035], glow);
  } else if (p.body === 2) {
    const pos = [],
      ix = [],
      N = 48,
      R = 16;
    for (let j = 0; j <= R; j++) {
      const v = (j / R) * Math.PI * 0.53;
      for (let k = 0; k <= N; k++) {
        const a = (k / N) * Math.PI * 2,
          r = Math.sin(v) * (1 + (0.045 * Math.sin(a * 12) * j) / R);
        pos.push(Math.cos(a) * r, 0.7 * Math.cos(v) + 0.38, Math.sin(a) * r);
        if (j && k) {
          const q = j * (N + 1) + k;
          ix.push(q, q - 1, q - N - 2, q, q - N - 2, q - N - 1);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    mesh(
      body,
      geo,
      new T.MeshStandardMaterial({
        color: base,
        emissive: accent,
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: 0.68,
        roughness: 0.18,
        side: T.DoubleSide,
        depthWrite: false
      })
    );
    oval(body, [0, 0.53, 0], [0.28, 0.22, 0.28], glow);
    for (let n = 0; n < 12; n++) {
      const a = (n * Math.PI) / 6,
        pts = [];
      for (let j = 0; j <= 8; j++) {
        const v = (j / 8) * Math.PI * 0.53;
        pts.push([Math.cos(a) * Math.sin(v), 0.7 * Math.cos(v) + 0.38, Math.sin(a) * Math.sin(v)]);
      }
      tube(body, pts, 0.012, glow);
      const strand = tube(
        body,
        Array.from({ length: 9 }, (_, k) => [
          Math.cos(a) * (0.84 + 0.05 * Math.sin(k + n)),
          0.29 - k * (0.19 + p.tail * 0.028),
          Math.sin(a) * 0.84 + Math.sin(k * 0.8 + n) * 0.1
        ]),
        n % 3 === 0 ? 0.04 : 0.016,
        finMat
      );
      limbs.push(strand);
    }
    for (let n = 0; n < 4; n++) {
      const a = (n * Math.PI) / 2;
      tube(
        body,
        Array.from({ length: 9 }, (_, k) => [
          Math.cos(a) * (0.16 + k * 0.028) + Math.sin(k * 1.2) * 0.07,
          0.4 - k * 0.2,
          Math.sin(a) * (0.16 + k * 0.028)
        ]),
        0.045,
        glow
      );
    }
  } else {
    skin(
      body,
      [
        [-1.1, 0.05, 0.07],
        [-0.8, 0.58, 0.23],
        [-0.3, 0.87, 0.42, 0.09],
        [0.35, 0.87, 0.43, 0.09],
        [0.88, 0.48, 0.23],
        [1, 0.06, 0.08]
      ],
      skinMat,
      p
    );
    oval(body, [0, -0.13, 0], [0.77, 0.18, 0.96], finMat);
    skin(
      body,
      [
        [0.8, 0.18, 0.13],
        [1.2, 0.19, 0.17],
        [1.5, 0.23, 0.19],
        [1.72, 0.1, 0.12],
        [1.77, 0.01, 0.04]
      ],
      skinMat,
      p
    );
    eyes(1.58, 0.12, 0.19);
    for (const side of [-1, 1]) {
      const front = fin(side, 0.62, 0.85 + p.fin * 0.14, 0.6);
      front.rotation.y = side * -0.35;
      const back = fin(side, -0.61, 0.48, 0.75);
      back.position.x = side * 0.5;
      back.rotation.y = side * 0.2;
    }
    tube(
      body,
      [
        [0, 0, -0.9],
        [0, -0.02, -1.3],
        [0.1, 0.03, -1.6 - p.tail * 0.08]
      ],
      0.06,
      solid
    );
    for (let n = 0; n < 5; n++) {
      const z = -0.68 + n * 0.33,
        w = 0.64 * Math.sqrt(Math.max(0.1, 1 - z * z));
      tube(
        body,
        [
          [-w, 0.28, z],
          [-w * 0.5, 0.45, z + 0.09],
          [0, 0.52, z - 0.05],
          [w * 0.5, 0.45, z + 0.09],
          [w, 0.28, z]
        ],
        0.014,
        lineMat
      );
    }
    for (const side of [-1, 1])
      tube(
        body,
        [
          [side * 0.33, 0.33, -0.7],
          [side * 0.39, 0.48, -0.25],
          [side * 0.39, 0.49, 0.3],
          [side * 0.26, 0.33, 0.8]
        ],
        0.016,
        lineMat
      );
  }
  if (p.body !== 2)
    for (let n = 0; n < p.horn; n++) {
      const z = 0.3 - n * 0.22;
      tube(
        body,
        [
          [0, p.body === 3 ? 0.53 : 0.38, z],
          [0, 0.65 + n * 0.055, z - 0.06],
          [0, 0.8 + n * 0.06, z - 0.22]
        ],
        0.026,
        glow
      );
    }
  // Each body allele comes from one parent. Secondary anatomy remains visibly expressed.
  if (p.fusion) {
    if (p.secondary === 3) {
      const carapace = oval(
        body,
        [0, 0.23, -0.12],
        [0.77, 0.43, 0.94],
        new T.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.65), roughness: 0.32, metalness: 0.3 })
      );
      for (let n = 0; n < 5; n++)
        tube(
          body,
          [
            [-0.56, 0.46, -0.7 + n * 0.31],
            [0, 0.67, -0.76 + n * 0.31],
            [0.56, 0.46, -0.7 + n * 0.31]
          ],
          0.021,
          glow
        );
    }
    if (p.secondary === 1)
      for (const side of [-1, 1]) {
        const wing = fin(side, -0.1, 1.4 + p.fin * 0.18, 1.55);
        wing.position.y = 0.15;
      }
    if (p.secondary === 2) {
      for (let n = 0; n < 8; n++) {
        const a = (n * Math.PI) / 4;
        const limb = tube(
          body,
          Array.from({ length: 9 }, (_, k) => [
            Math.cos(a) * (0.55 + k * 0.035),
            -0.15 - k * 0.21,
            Math.sin(a) * 0.55 + Math.sin(k * 0.9 + n) * 0.14
          ]),
          0.027,
          glow
        );
        limbs.push(limb);
      }
      const veil = oval(
        body,
        [0, 0.3, 0.05],
        [0.92, 0.56, 1.02],
        new T.MeshStandardMaterial({
          color: accent,
          transparent: true,
          opacity: 0.23,
          side: T.DoubleSide,
          depthWrite: false,
          emissive: accent,
          emissiveIntensity: 0.15
        })
      );
    }
    if (p.secondary === 0) {
      const tail = new T.Group();
      body.add(tail);
      tail.position.z = -1.05;
      tail.userData.tail = true;
      const blade = membrane(
        tail,
        [
          [0, 0],
          [-0.9, -1.1],
          [-0.26, -0.7],
          [0, -0.4],
          [0.26, -0.7],
          [0.9, -1.1]
        ],
        finMat
      );
      blade.rotation.z = Math.PI / 2;
      limbs.push(tail);
    }
  }
  // Alien anatomy is driven by allele values, including serrated fins and sensory eyes.
  for (const side of [-1, 1]) {
    for (let n = 0; n < 2 + p.horn; n++) {
      const spike = mesh(body, new T.ConeGeometry(0.055, 0.4 + n * 0.08, 5), glow);
      spike.position.set(side * (0.35 + n * 0.1), 0.35, 0.15 - n * 0.29);
      spike.rotation.z = -side * 0.8;
    }
    const horn = tube(
      body,
      [
        [side * 0.3, 0.25, 0.65],
        [side * 0.42, 0.7, 1],
        [side * 0.52, 1.05, 1.25 + genome.horn[side === 1 ? 1 : 0] / 500]
      ],
      0.038,
      glow
    );
    for (let n = 0; n < Math.max(1, p.eyes - 2); n++) {
      oval(body, [side * (0.34 + n * 0.09), 0.3 + n * 0.065, 0.7 - n * 0.19], [0.054, 0.06, 0.047], white);
      oval(body, [side * (0.35 + n * 0.09), 0.32 + n * 0.065, 0.735 - n * 0.19], [0.026, 0.036, 0.028], eyeMat);
    }
  }
  if (p.pattern >= 2) {
    for (let n = 0; n < 3; n++) {
      const a = n * 2.094;
      tube(
        body,
        [
          [Math.cos(a) * 0.25, 0.4, 0],
          [Math.cos(a) * 0.7, 0.8, -0.7],
          [Math.cos(a) * 0.5, 0.5, -1.5],
          [0, 0.1, -2]
        ],
        0.017,
        glow
      );
    }
  }
  group.scale.setScalar(p.size);
  group.userData = { body, limbs, phenotype: p };
  return group;
}
export function animateCreature(m, t) {
  const u = m.userData;
  u.body.rotation.z = Math.sin(t * 1.8) * 0.025;
  u.limbs.forEach((f, i) => {
    if (f.userData.tail) f.rotation.y = Math.sin(t * 4) * 0.13;
    else if (u.phenotype.body === 2) {
      f.rotation.x = Math.sin(t * 1.6 + i * 0.5) * 0.045;
      f.rotation.z = Math.cos(t * 1.3 + i) * 0.04;
    } else
      f.rotation.z =
        Math.sin(t * (u.phenotype.body === 1 ? 2 : 3) + i * 0.4) *
        (f.userData.side || 1) *
        (u.phenotype.body === 1 ? 0.18 : 0.1);
  });
  if (u.phenotype.body === 2)
    u.body.scale.set(1 + Math.sin(t * 2) * 0.04, 1 - Math.sin(t * 2) * 0.04, 1 + Math.sin(t * 2) * 0.04);
}
