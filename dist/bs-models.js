// Visible marks for 比斯基因 (0.22): each gene a creature carries adds a part to its model — a glowing orb at the
// mouth for fire or frost, spikes along the back for lightning, plates for a hardened body, a long whip tail,
// claws, gill slits, bone wings, a crystal horn, or a soft aura. Wild 御獸 also get a violet halo.
import * as T from './vendor/three.module.min.js';
import { BS_GENES, bsOf } from './bsgenes.js?v=0.24.1';

const geo = {
  orb: new T.SphereGeometry(0.09, 10, 8),
  spike: new T.ConeGeometry(0.05, 0.22, 5),
  plate: new T.BoxGeometry(0.22, 0.05, 0.16),
  tail: new T.CylinderGeometry(0.035, 0.008, 1.1, 6),
  claw: new T.ConeGeometry(0.04, 0.18, 4),
  slit: new T.BoxGeometry(0.03, 0.12, 0.01),
  wing: new T.PlaneGeometry(0.6, 0.3),
  horn: new T.ConeGeometry(0.06, 0.4, 5),
  halo: new T.RingGeometry(0.55, 0.75, 32)
};
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
function part(parent, g, m, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new T.Mesh(g, m);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  mesh.userData.bsMark = true;
  parent.add(mesh);
  return mesh;
}
// Attach the marks for the genome's genes to a creature mesh made by makeCreature. Safe to call again.
export function applyGeneMarks(m, genome) {
  const ids = bsOf(genome);
  if (!ids.length || m.userData.bsMarked) return;
  m.userData.bsMarked = true;
  const u = m.userData,
    info = u.info || {},
    len = info.len || 1.4,
    top = info.top || 0.5,
    body = u.body || m,
    front = (info.mouth && info.mouth[2]) || len * 0.55,
    back = info.back ? info.back[2] : -len * 0.4;
  let slot = 0;
  for (const id of ids) {
    const g = BS_GENES[id];
    if (!g) continue;
    const c = g.color,
      k = slot++;
    switch (g.mark) {
      case 'orb':
        part(
          body,
          geo.orb,
          mat(c, 1.8),
          [(k % 2 ? 0.12 : -0.12) * (k > 1 ? 1 : 0), top * 0.45 + k * 0.05, front + 0.05],
          [0, 0, 0],
          [1.2, 1.2, 1.2]
        );
        break;
      case 'spikes':
        for (let i = 0; i < 4; i++)
          part(
            body,
            geo.spike,
            mat(c, 0.9),
            [0, top * 0.95, back + ((front - back) * (i + 1)) / 5],
            [0.3 - i * 0.15, 0, 0]
          );
        break;
      case 'plates':
        for (let i = 0; i < 4; i++)
          part(body, geo.plate, mat(c, 0.25, { metalness: 0.5, roughness: 0.4 }), [
            0,
            top * 0.9,
            back + ((front - back) * (i + 1)) / 5
          ]);
        break;
      case 'tail':
        part(body, geo.tail, mat(c, 0.3), [0, top * 0.3, back - 0.5], [Math.PI / 2 - 0.3, 0, 0]);
        break;
      case 'claws':
        for (const s of [-1, 1])
          for (let i = 0; i < 2; i++)
            part(body, geo.claw, mat(c, 0.4), [s * 0.28, top * 0.2, front * 0.4 - i * 0.3], [Math.PI / 2, 0, s * 0.4]);
        break;
      case 'fangs':
        for (const s of [-1, 1])
          part(body, geo.claw, mat(c, 0.3), [s * 0.08, top * 0.3, front + 0.02], [Math.PI, 0, 0], [1, 0.8, 1]);
        break;
      case 'slits':
        for (const s of [-1, 1])
          for (let i = 0; i < 3; i++)
            part(body, geo.slit, mat(c, 0.8), [s * 0.22, top * 0.45, front * 0.5 - i * 0.07], [0, s * 0.3, 0]);
        break;
      case 'wings':
        for (const s of [-1, 1])
          part(
            body,
            geo.wing,
            mat(c, 0.5, { side: T.DoubleSide, transparent: true, opacity: 0.8 }),
            [s * 0.45, top * 0.8, 0],
            [0.3, 0, s * 0.5]
          );
        break;
      case 'horn':
        part(body, geo.horn, mat(c, 1.2), [0, top * 1.05, front * 0.5], [0.5, 0, 0]);
        break;
      case 'aura': {
        const h = part(
          m,
          geo.halo,
          mat(c, 1.4, { side: T.DoubleSide, transparent: true, opacity: 0.35, depthWrite: false }),
          [0, 0.06 + k * 0.02, 0],
          [-Math.PI / 2, 0, 0]
        );
        h.userData.spin = 0.4 + k * 0.2;
        break;
      }
    }
  }
}
// The violet halo under a wild 御獸.
export function beastHalo(m) {
  if (m.userData.beastHalo) return m.userData.beastHalo;
  const h = part(
    m,
    geo.halo,
    mat(0xb48cff, 1.6, { side: T.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }),
    [0, 0.04, 0],
    [-Math.PI / 2, 0, 0],
    [1.6, 1.6, 1]
  );
  h.userData.spin = -0.6;
  m.userData.beastHalo = h;
  return h;
}
export function animateMarks(m, t) {
  m.traverse(o => {
    if (o.userData.spin) o.rotation.z = t * o.userData.spin;
  });
}
