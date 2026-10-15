// Visible marks for 比斯基因 (0.22, reworked 0.25; 0.26 adds the dark-fantasy look in beast-look.js). Creatures and 御獸 must look like different things:
//   · a creature stays an ordinary animal. Its genes show only as small, dull growths — an extra feeler, a few
//     nubs, a fin a little too sharp — the kind of thing you notice on a second look.
//   · a 御獸 is bigger (FORM_SCALE), its genes grow into glowing organs (breath orbs, lightning spines, plates,
//     whip tails, claws, bone wings, crystal horns), its eyes burn, a crown of horns rises from its head and a
//     contract sigil turns beneath it — gold for yours, violet for a wild one.
import * as T from './vendor/three.module.min.js';
import { BS_GENES, bsOf } from './bsgenes.js?v=0.59.1';
import { phenotype } from './genetics.js?v=0.59.1';
import { makeCreature } from './creatures.js?v=0.59.1';
import { bodyAnchors, applyBeastLook, lookOf } from './beast-look.js?v=0.59.1';

export const FORM_SCALE = 1.5;
const geo = {
  orb: new T.SphereGeometry(0.09, 10, 8),
  nub: new T.SphereGeometry(0.05, 8, 6),
  spike: new T.ConeGeometry(0.05, 0.22, 5),
  plate: new T.BoxGeometry(0.22, 0.05, 0.16),
  tail: new T.CylinderGeometry(0.035, 0.008, 1.1, 6),
  claw: new T.ConeGeometry(0.04, 0.18, 4),
  slit: new T.BoxGeometry(0.03, 0.12, 0.01),
  wing: new T.PlaneGeometry(0.6, 0.3),
  horn: new T.ConeGeometry(0.06, 0.4, 5),
  eye: new T.SphereGeometry(0.045, 10, 8),
  halo: new T.RingGeometry(0.55, 0.75, 32),
  sigil: new T.RingGeometry(0.92, 1.0, 6)
};
// a feeler: a thin curved tentacle, the one sign a creature has started to change
const feeler = (() => {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new T.Vector3(Math.sin(t * 2.2) * 0.12, t * 0.42, Math.sin(t * 3.1) * 0.08));
  }
  return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, 0.012, 5, false);
})();
const mats = new Map();
function mat(color, glow = 1.2, extra = {}) {
  const key = color + ':' + glow + JSON.stringify(extra);
  if (!mats.has(key))
    mats.set(
      key,
      new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: 0.5, ...extra })
    );
  return mats.get(key);
}
// a dull version of a gene's colour, close to flesh, for the subtle creature marks
const dull = c => new T.Color(c).lerp(new T.Color(0x8a8178), 0.6).getHex();
function part(parent, g, m, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new T.Mesh(g, m);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  mesh.userData.bsMark = true;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const anchors = bodyAnchors;
// Creature marks: one feeler or nub per gene (up to three), dull and small.
function subtleMarks(m, ids) {
  const a = anchors(m);
  ids.slice(0, 3).forEach((id, k) => {
    const g = BS_GENES[id];
    if (!g) return;
    const c = dull(g.color),
      mt = mat(c, 0.08, { roughness: 0.8 });
    if (['spikes', 'plates', 'horn'].includes(g.mark)) {
      for (let i = 0; i < 3; i++)
        part(a.body, geo.nub, mt, [0, a.top * 0.9, a.back + ((a.front - a.back) * (i + 1)) / 5 + k * 0.05]);
    } else {
      const side = k % 2 ? 1 : -1;
      part(
        a.body,
        feeler,
        mt,
        [side * 0.12, a.mouthY + 0.05, a.front - 0.05 - k * 0.08],
        [-0.6, side * 0.4, side * 0.5]
      );
    }
  });
}
// Beast marks: the full organs, glowing.
function beastMarks(m, ids) {
  const a = anchors(m),
    { body, top, front, back } = a;
  let slot = 0;
  for (const id of ids) {
    const g = BS_GENES[id];
    if (!g) continue;
    const c = g.color,
      k = slot++;
    if (a.upright && uprightMark(a, g, c, k)) continue;
    switch (g.mark) {
      case 'orb':
        part(
          body,
          geo.orb,
          mat(c, 2.2),
          [(k % 2 ? 0.12 : -0.12) * (k > 1 ? 1 : 0), a.mouthY + 0.05 + k * 0.05, front + 0.06],
          [0, 0, 0],
          [1.4, 1.4, 1.4]
        );
        break;
      case 'spikes':
        for (let i = 0; i < 5; i++)
          part(
            body,
            geo.spike,
            mat(c, 1.2),
            [0, top * 0.95, back + ((front - back) * (i + 1)) / 6],
            [0.3 - i * 0.12, 0, 0],
            [1.2, 1.4, 1.2]
          );
        break;
      case 'plates':
        for (let i = 0; i < 5; i++)
          part(
            body,
            geo.plate,
            mat(c, 0.35, { metalness: 0.6, roughness: 0.35 }),
            [0, top * 0.92, back + ((front - back) * (i + 1)) / 6],
            [0, 0, 0],
            [1.3, 1.6, 1.2]
          );
        break;
      case 'tail':
        part(body, geo.tail, mat(c, 0.6), [0, top * 0.3, back - 0.55], [Math.PI / 2 - 0.3, 0, 0], [1.4, 1.3, 1.4]);
        break;
      case 'claws':
        for (const sd of [-1, 1])
          for (let i = 0; i < 3; i++)
            part(
              body,
              geo.claw,
              mat(c, 0.6),
              [sd * 0.3, top * 0.18, front * 0.4 - i * 0.18],
              [Math.PI / 2, 0, sd * 0.4],
              [1.3, 1.5, 1.3]
            );
        break;
      case 'fangs':
        for (const sd of [-1, 1])
          part(body, geo.claw, mat(c, 0.5), [sd * 0.09, a.mouthY, front + 0.03], [Math.PI, 0, 0], [1.3, 1.1, 1.3]);
        break;
      case 'slits':
        for (const sd of [-1, 1])
          for (let i = 0; i < 3; i++)
            part(body, geo.slit, mat(c, 1.4), [sd * 0.23, top * 0.45, front * 0.5 - i * 0.07], [0, sd * 0.3, 0]);
        break;
      case 'wings':
        for (const sd of [-1, 1])
          part(
            body,
            geo.wing,
            mat(c, 0.7, { side: T.DoubleSide, transparent: true, opacity: 0.85 }),
            [sd * 0.55, top * 0.85, 0],
            [0.3, 0, sd * 0.55],
            [1.5, 1.4, 1]
          );
        break;
      case 'horn':
        part(body, geo.horn, mat(c, 1.6), [0, top * 1.05, front * 0.5], [0.5, 0, 0], [1.4, 1.6, 1.4]);
        break;
      case 'aura': {
        const h = part(
          m,
          geo.halo,
          mat(c, 1.6, { side: T.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false }),
          [0, 0.06 + k * 0.02, 0],
          [-Math.PI / 2, 0, 0],
          [1.3, 1.3, 1]
        );
        h.userData.spin = 0.4 + k * 0.2;
        break;
      }
    }
  }
}
// Marks on a standing beast (0.26): along the spine, at the hands, on the head. Returns false for marks that sit
// the same on any body (orbs at the mouth, fangs, the ground aura).
function uprightMark(a, g, c, k) {
  const { body } = a;
  switch (g.mark) {
    case 'orb': {
      // the breath organ glows in the chest, a core under the hide
      const info = body.parent?.userData?.info || {},
        o = part(body, geo.orb, mat(c, 2.2), info.chest || [0, 1.5, 0.25], [0, 0, 0], [1.05, 1.05, 0.7]);
      o.userData.beastEye = true;
      return true;
    }
    case 'spikes':
      for (let i = 0; i < 5; i++) part(body, geo.spike, mat(c, 1.2), a.spine((i + 0.5) / 5), a.out, [1.3, 1.6, 1.3]);
      return true;
    case 'plates':
      for (let i = 0; i < 5; i++)
        part(
          body,
          geo.plate,
          mat(c, 0.35, { metalness: 0.6, roughness: 0.35 }),
          a.spine((i + 0.5) / 5),
          [Math.PI / 2 - 0.2, 0, 0],
          [1.5, 1.6, 1.3]
        );
      return true;
    case 'tail':
      return true; // a standing body grows its own tail (or none) — a rod on its back only looked like a stick
    case 'claws':
      for (const sd of [-1, 1])
        for (let i = 0; i < 3; i++)
          part(
            body,
            geo.claw,
            mat(c, 0.8),
            [sd * 0.34 + (i - 1) * 0.03, 0.92, 0.22],
            [Math.PI * 0.85, 0, 0],
            [1.4, 1.8, 1.4]
          );
      return true;
    case 'slits':
      for (const sd of [-1, 1])
        for (let i = 0; i < 3; i++)
          part(body, geo.slit, mat(c, 1.4), [sd * 0.11, 1.84 - i * 0.05, 0.14], [0, sd * 0.4, 0]);
      return true;
    case 'wings':
      return true; // the body grew a pair of its own
    case 'horn':
      part(body, geo.horn, mat(c, 1.6), [0, a.top * 0.98, a.head[2] + 0.04], [0.35, 0, 0], [1.4, 1.6, 1.4]);
      return true;
  }
  return false;
}
// The beast's own form: burning eyes and a crown of horns, plus the bigger frame.
function beastForm(m, ids) {
  const a = anchors(m),
    c = ids.length ? BS_GENES[ids[0]]?.color || 0xffd38c : 0xffd38c;
  // a standing beast already has glowing eyes of its own (beast-look lights them)
  if (!a.upright)
    for (const sd of [-1, 1]) {
      const e = part(a.body, geo.eye, mat(c, 3), [sd * 0.13, a.mouthY + 0.16, a.front - 0.12]);
      e.userData.beastEye = true;
    }
  for (let i = 0; i < 3; i++)
    part(
      a.body,
      geo.horn,
      mat(0x2a2420, 0.15, { roughness: 0.4, metalness: 0.3 }),
      a.upright
        ? [(i - 1) * 0.08, a.top * 0.97, a.head[2] - 0.06 - Math.abs(i - 1) * 0.04]
        : [(i - 1) * 0.12, a.top * 1.02, a.front * 0.55 - Math.abs(i - 1) * 0.08],
      a.upright ? [-0.5, 0, (i - 1) * 0.4] : [0.7, 0, (i - 1) * 0.35],
      [0.8, 0.9 - Math.abs(i - 1) * 0.2, 0.8]
    );
  // the frame grows; the body group carries it so world.js keeps setting the creature's own size on the group
  a.body.scale.multiplyScalar(FORM_SCALE);
  m.userData.formScale = FORM_SCALE;
}
// Attach the marks for this creature or beast. kind: 'creature' (subtle) or 'beast'. Safe to call again.
export function applyGeneMarks(m, genome, kind = 'creature') {
  if (m.userData.bsMarked) return;
  m.userData.bsMarked = kind;
  const ids = bsOf(genome);
  if (kind === 'beast') {
    const look = lookOf(genome);
    // 0.26: a land beast stands up — rebuilt as a dragon, a wraith or a dryad
    if (phenotype(genome).habitat === 'land' && !m.userData.info?.upright) {
      // a wing gene grows real wings on a standing body (not the flat sail a swimmer gets)
      const up = makeCreature(genome, {
          upright: look.plan,
          wings: look.wings || ids.some(id => BS_GENES[id]?.mark === 'wings')
        }),
        mark = m.userData.bsMarked;
      m.clear();
      for (const c of [...up.children]) m.add(c);
      m.userData = { ...up.userData, bsMarked: mark };
    }
    beastForm(m, ids);
    beastMarks(m, ids);
    applyBeastLook(m, genome, look);
  } else if (ids.length) subtleMarks(m, ids);
}
// The contract sigil beneath a beast: gold when it is yours, violet when it is wild.
export function beastHalo(m, wild = true) {
  if (m.userData.beastHalo) return m.userData.beastHalo;
  const color = wild ? 0xb48cff : 0xffd38c,
    g = new T.Group();
  g.position.y = 0.04;
  m.add(g);
  const ring = part(
    g,
    geo.halo,
    mat(color, 1.6, { side: T.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }),
    [0, 0, 0],
    [-Math.PI / 2, 0, 0],
    [1.9, 1.9, 1]
  );
  ring.userData.spin = -0.6;
  const hex = part(
    g,
    geo.sigil,
    mat(color, 2, { side: T.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false }),
    [0, 0.01, 0],
    [-Math.PI / 2, 0, 0],
    [1.3, 1.3, 1]
  );
  hex.userData.spin = 0.35;
  m.userData.beastHalo = g;
  return g;
}
export function animateMarks(m, t) {
  m.traverse(o => {
    if (o.userData.spin) o.rotation.z = t * o.userData.spin;
    if (o.userData.beastEye) o.material.emissiveIntensity = 2.4 + Math.sin(t * 3 + o.position.x * 10) * 0.6;
  });
}
// A released beast rots away: it darkens, sags and sinks over a few seconds (k: 0 → 1).
export function dissolveLook(m, k) {
  if (!m.userData.rotMats) {
    m.userData.rotMats = [];
    m.traverse(o => {
      if (o.isMesh && o.material && !o.userData.rot) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.userData.rot = true;
        m.userData.rotMats.push(o.material);
      }
    });
  }
  for (const mt of m.userData.rotMats) {
    if (mt.color) mt.color.lerp(new T.Color(0x2a3a18), Math.min(1, k * 0.08));
    if (mt.emissive) mt.emissive.lerp(new T.Color(0x3a5a10), Math.min(1, k * 0.08));
    mt.opacity = Math.max(0, 1 - k * k);
  }
  m.scale.y = m.scale.x * Math.max(0.15, 1 - k * 0.8);
}
