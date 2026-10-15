// The corrupted garden (0.31): what the crystal cave has grown into. Thorn hedges three and a half metres tall laid
// out by cave-maze.js, rotten blooms drooping off their tops, sick fungus glowing at their feet, splinters of
// violet crystal pushing up through the soil, dead trees, drifting spores — and at the heart, a stone dais ringed
// by broken pillars and roots, where 嘯岳 sleeps. Instanced wherever things repeat.
import * as T from './vendor/three.module.min.js';
import { CAVE, MAZE_N, MAZE_CELL, MAZE_HALF, MAZE_WALLS, HALL, HALL_COVER, ENTRANCE } from './cave-maze.js?v=0.59.1';
import { grainTexture } from './realism.js?v=0.59.1';

let seed = 77;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
function instanced(geo, material, list, place) {
  const m = new T.InstancedMesh(geo, material, list.length),
    o = new T.Object3D(),
    c = new T.Color();
  list.forEach((item, i) => {
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    const color = place(o, item, i);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (color !== undefined) m.setColorAt(i, c.set(color));
  });
  m.castShadow = m.receiveShadow = true;
  return m;
}
export function makeGarden() {
  seed = 77;
  const g = new T.Group();
  g.position.set(CAVE.x, 0, CAVE.z);
  const grain = grainTexture().clone();
  grain.repeat.set(26, 26);
  grain.needsUpdate = true;
  // soil
  const floor = new T.Mesh(
    new T.PlaneGeometry(MAZE_HALF * 2 + 8, MAZE_HALF * 2 + 14),
    mat(0x3a2e40, { bumpMap: grain, bumpScale: 0.6, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 3);
  floor.receiveShadow = true;
  g.add(floor);
  // hedges: one box per wall segment, roughened with clumps of foliage
  const segs = [],
    { h, v } = MAZE_WALLS;
  for (let j = 0; j <= MAZE_N; j++)
    for (let i = 0; i < MAZE_N; i++)
      if (h[j][i]) segs.push({ x: -MAZE_HALF + (i + 0.5) * MAZE_CELL, z: -MAZE_HALF + j * MAZE_CELL, along: 'x' });
  for (let j = 0; j < MAZE_N; j++)
    for (let i = 0; i <= MAZE_N; i++)
      if (v[j][i]) segs.push({ x: -MAZE_HALF + i * MAZE_CELL, z: -MAZE_HALF + (j + 0.5) * MAZE_CELL, along: 'z' });
  const hedgeMat = mat(0x3d2f4a, { bumpMap: grain, bumpScale: 1.4, emissive: 0x120a1a, emissiveIntensity: 1 });
  g.add(
    instanced(new T.BoxGeometry(1, 1, 1), hedgeMat, segs, (o, s) => {
      o.position.set(s.x, 1.7, s.z);
      o.scale.set(s.along === 'x' ? MAZE_CELL + 0.9 : 0.9, 3.4, s.along === 'x' ? 0.9 : MAZE_CELL + 0.9);
    })
  );
  const clumps = [],
    thorns = [],
    fungi = [],
    blooms = [];
  for (const s of segs)
    for (let k = 0; k < 4; k++) {
      const t = (k + 0.2 + rnd() * 0.6) / 4 - 0.5,
        x = s.x + (s.along === 'x' ? t * MAZE_CELL : (rnd() - 0.5) * 0.5),
        z = s.z + (s.along === 'z' ? t * MAZE_CELL : (rnd() - 0.5) * 0.5);
      clumps.push({ x, z, y: 0.6 + rnd() * 3, r: 0.5 + rnd() * 0.45 });
      for (let n = 0; n < 3; n++)
        thorns.push({ x, z, y: 0.4 + rnd() * 3.1, a: rnd() * 6.28, tilt: 0.8 + rnd() * 0.8, l: 0.3 + rnd() * 0.45 });
      if (rnd() < 0.7)
        fungi.push({
          x: x + (rnd() - 0.5) * 1.6,
          z: z + (rnd() - 0.5) * 1.6,
          s: 0.08 + rnd() * 0.16,
          green: rnd() < 0.45
        });
      if (rnd() < 0.55) blooms.push({ x, z, y: 3.35 + rnd() * 0.15, s: 0.3 + rnd() * 0.3, a: rnd() * 6.28 });
    }
  g.add(
    instanced(new T.IcosahedronGeometry(1, 1), mat(0xffffff, { bumpMap: grain, bumpScale: 1.2 }), clumps, (o, c) => {
      o.position.set(c.x, c.y, c.z);
      o.scale.set(c.r * 1.2, c.r, c.r * 1.1);
      o.rotation.set(rnd() * 3, rnd() * 3, 0);
      return rnd() < 0.5 ? 0x4a3260 : 0x34503a;
    })
  );
  g.add(
    instanced(new T.ConeGeometry(0.05, 1, 4), mat(0x3a3028, { roughness: 0.5 }), thorns, (o, t) => {
      o.position.set(t.x + Math.sin(t.a) * 0.5, t.y, t.z + Math.cos(t.a) * 0.5);
      o.rotation.set(Math.cos(t.a) * t.tilt, 0, -Math.sin(t.a) * t.tilt);
      o.scale.set(1, t.l, 1);
    })
  );
  // fungus glows on its own (unlit, so bloom picks it up)
  const glow = new T.MeshBasicMaterial({ color: 0xffffff });
  g.add(
    instanced(new T.SphereGeometry(1, 8, 6), glow, fungi, (o, f) => {
      o.position.set(f.x, f.s * 0.6, f.z);
      o.scale.set(f.s, f.s * 0.7, f.s);
      return f.green ? 0x9be36a : 0xb47cff;
    })
  );
  // rotten blooms: drooping, bruised petals on the hedge tops
  const bloom = mat(0xffffff, { emissive: 0x3a0a2a, emissiveIntensity: 0.6, roughness: 0.6, side: T.DoubleSide });
  g.add(
    instanced(new T.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), bloom, blooms, (o, b) => {
      o.position.set(b.x, b.y, b.z);
      o.rotation.set(Math.PI + 0.4 * Math.sin(b.a), b.a, 0.4 * Math.cos(b.a));
      o.scale.set(b.s, b.s * 0.8, b.s);
      return rnd() < 0.5 ? 0x6a1840 : 0x4a1a5a;
    })
  );
  // violet crystal splinters in the corners of the cells
  const shards = [];
  for (let j = 0; j < MAZE_N; j++)
    for (let i = 0; i < MAZE_N; i++) {
      if (rnd() > 0.35) continue;
      const cx = -MAZE_HALF + (i + 0.5) * MAZE_CELL + (rnd() - 0.5) * 3.2,
        cz = -MAZE_HALF + (j + 0.5) * MAZE_CELL + (rnd() - 0.5) * 3.2;
      if (Math.hypot(cx, cz) < HALL.r) continue;
      for (let n = 0; n < 3 + Math.floor(rnd() * 3); n++)
        shards.push({ x: cx + (rnd() - 0.5) * 0.8, z: cz + (rnd() - 0.5) * 0.8, s: 0.2 + rnd() * 0.35 });
    }
  g.add(
    instanced(
      new T.OctahedronGeometry(1, 0),
      mat(0x6a3a9a, { emissive: 0x7a2ad0, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1 }),
      shards,
      (o, c) => {
        o.position.set(c.x, c.s * 1.4, c.z);
        o.scale.set(c.s * 0.5, c.s * 2.2, c.s * 0.5);
        o.rotation.set((rnd() - 0.5) * 0.6, rnd() * 3, (rnd() - 0.5) * 0.6);
      }
    )
  );
  // a few dead trees
  const bark = mat(0x241b17, { bumpMap: grain, bumpScale: 1.5 });
  for (let k = 0; k < 6; k++) {
    const i = Math.floor(rnd() * MAZE_N),
      j = Math.floor(rnd() * MAZE_N);
    if (i >= HALL.i0 - 1 && i <= HALL.i1 + 1 && j >= HALL.j0 - 1 && j <= HALL.j1 + 1) continue;
    const x = -MAZE_HALF + (i + 0.5) * MAZE_CELL,
      z = -MAZE_HALF + (j + 0.5) * MAZE_CELL,
      tree = new T.Group();
    tree.position.set(x + (rnd() - 0.5) * 2, 0, z + (rnd() - 0.5) * 2);
    const trunk = new T.Mesh(new T.CylinderGeometry(0.12, 0.3, 4.2, 7), bark);
    trunk.position.y = 2.1;
    trunk.rotation.z = (rnd() - 0.5) * 0.3;
    tree.add(trunk);
    for (let n = 0; n < 5; n++) {
      const br = new T.Mesh(new T.ConeGeometry(0.07, 1.6 + rnd(), 5), bark);
      br.position.set(0, 2.6 + rnd() * 1.4, 0);
      br.rotation.set(0.9 + rnd() * 0.6, rnd() * 6.28, 0);
      br.translateY(0.7);
      tree.add(br);
    }
    tree.traverse(o => o.isMesh && (o.castShadow = true));
    g.add(tree);
  }
  // the heart: a dais with a ring of runes, broken pillars, roots and crystal spires
  const stone = mat(0x3a3442, { bumpMap: grain, bumpScale: 1.2 });
  const dais = new T.Mesh(new T.CylinderGeometry(2.4, 2.8, 0.5, 40), stone);
  dais.position.y = 0.25;
  dais.receiveShadow = dais.castShadow = true;
  g.add(dais);
  const rune = new T.Mesh(
    new T.RingGeometry(2.9, 3.3, 48),
    new T.MeshBasicMaterial({ color: 0xb06cff, transparent: true, opacity: 0.55, side: T.DoubleSide })
  );
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.03;
  rune.userData.spin = 0.08;
  g.add(rune);
  // 0.36: the cover in the great hall — broken pillars on the inner ring, toppled wall pieces on the outer
  for (const c of HALL_COVER) {
    if (c.kind === 'pillar') {
      const hgt = 4.5 + rnd() * 2.5,
        p = new T.Mesh(new T.CylinderGeometry(c.r * 0.85, c.r, hgt, 12), stone);
      p.position.set(c.x, hgt / 2, c.z);
      p.rotation.z = (rnd() - 0.5) * 0.12;
      p.castShadow = p.receiveShadow = true;
      g.add(p);
      const cap = new T.Mesh(new T.CylinderGeometry(c.r * 1.15, c.r * 1.05, 0.5, 12), stone);
      cap.position.set(c.x, hgt + 0.1, c.z);
      cap.rotation.set((rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4);
      g.add(cap);
    } else {
      const w = new T.Mesh(new T.BoxGeometry(c.r * 2.4, 2.4 + rnd() * 0.8, 1.1), stone);
      w.position.set(c.x, 1.2, c.z);
      w.rotation.set(0, c.a + Math.PI / 2 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.12);
      w.castShadow = w.receiveShadow = true;
      g.add(w);
      const rubble = new T.Mesh(new T.DodecahedronGeometry(0.6, 0), stone);
      rubble.position.set(c.x + (rnd() - 0.5) * 2, 0.35, c.z + (rnd() - 0.5) * 2);
      g.add(rubble);
    }
  }
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.5,
      far = 16 + rnd() * 9,
      pts = [
        new T.Vector3(Math.sin(a) * far, 0.2, Math.cos(a) * far),
        new T.Vector3(Math.sin(a + 0.15) * (far * 0.55), 0.6, Math.cos(a + 0.15) * (far * 0.55)),
        new T.Vector3(Math.sin(a + 0.05) * 2.9, 0.3, Math.cos(a + 0.05) * 2.9)
      ],
      root = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, 0.22, 7), bark);
    root.castShadow = true;
    g.add(root);
  }
  for (const [x, z] of [
    [-17, -17],
    [17, -17],
    [-17.5, 16],
    [17.5, 16],
    [0, -25],
    [-25, 0],
    [25, 0]
  ]) {
    const spire = new T.Mesh(
      new T.OctahedronGeometry(1, 0),
      mat(0x8a4ac0, { emissive: 0x9a3ad0, emissiveIntensity: 1.3, roughness: 0.15, transparent: true, opacity: 0.9 })
    );
    spire.position.set(x, 2.2, z);
    spire.scale.set(0.6, 2.4, 0.6);
    g.add(spire);
  }
  // the way in: an arch of roots over the entrance
  const arch = new T.Mesh(new T.TorusGeometry(2.6, 0.32, 8, 24, Math.PI), bark);
  arch.position.set(ENTRANCE.x, 0.1, MAZE_HALF + 0.4);
  g.add(arch);
  // spores drifting through the murk
  const N = 700,
    pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rnd() - 0.5) * MAZE_HALF * 2;
    pos[i * 3 + 1] = 0.3 + rnd() * 5;
    pos[i * 3 + 2] = (rnd() - 0.5) * MAZE_HALF * 2;
  }
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const spores = new T.Points(
    sg,
    new T.PointsMaterial({
      color: 0xd8a8ff,
      size: 0.09,
      transparent: true,
      opacity: 0.7,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  spores.userData.drift = true;
  g.add(spores);
  // two lights: violet over the heart, a sick green at the way in
  const heart = new T.PointLight(0xa060ff, 260, 40, 1.4);
  heart.position.set(0, 4.5, 0);
  g.add(heart);
  const door = new T.PointLight(0x7fe0a0, 120, 22, 1.4);
  door.position.set(0, 3, MAZE_HALF - 1);
  g.add(door);
  return g;
}
// small motions: the rune ring turns, the spores drift
export function animateGarden(g, t) {
  for (const c of g.children) {
    if (c.userData.spin) c.rotation.z = t * c.userData.spin;
    if (c.userData.drift) {
      c.position.y = Math.sin(t * 0.2) * 0.4;
      c.rotation.y = t * 0.01;
    }
  }
}
