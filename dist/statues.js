// Three mythic 御獸 turned to stone (0.31): a land beast on the central ruins island, a plant beast at the old water
// gate, a water beast among the sunken ruins. Built from the same bodies the living beasts use, then given weathered
// stone — moss for the plant one, silt and barnacle-green for the drowned one — on a carved plinth. Their eyes keep
// the faintest glow. Not interactive yet; a later chapter can wake them (see STATUES for their ids).
import { surface } from './surfaces.js?v=0.64.0';
import * as T from './vendor/three.module.min.js';
import { makeCreature } from './creatures.js?v=0.64.0';
import { makeGenome } from './genetics.js?v=0.64.0';
import { applyGeneMarks } from './bs-models.js?v=0.64.0';
import { LANDMARKS, landNear, groundAt } from './lake.js?v=0.64.0';
import { grainTexture } from './realism.js?v=0.64.0';
import { bakeStatic } from './bake.js?v=0.64.0';

const place = (lm, dx, dz, opts) => landNear(lm.x + dx, lm.z + dz, opts);
export const STATUES = [
  {
    id: 'statue-land',
    name: '岳脊之王',
    kind: 'land',
    at: place(LANDMARKS.centralRuins, 14, -10, { min: 1, max: 30, maxSlope: 0.45, radius: 40 }),
    genes: ['fire', 'boneplates', 'greatjaw'],
    family: 'land',
    scale: 2.1,
    stone: 0x8d8b86,
    eye: 0xffb060,
    face: Math.PI * 0.85
  },
  {
    id: 'statue-flora',
    name: '千根之母',
    kind: 'flora',
    at: place(LANDMARKS.waterGate, 6, 4, { min: 0.6, max: 30, maxSlope: 0.5, radius: 40 }),
    genes: ['vinewhip', 'barkskin', 'photoskin'],
    family: 'flora',
    scale: 2.6,
    stone: 0x7b8a72,
    eye: 0xb0ff9a,
    face: -Math.PI * 0.4
  },
  {
    id: 'statue-sea',
    name: '淵潮之主',
    kind: 'sea',
    at: { x: LANDMARKS.eastTemple.x + 6, z: LANDMARKS.eastTemple.z - 4 },
    genes: ['lightning', 'whiptail', 'electricgill'],
    family: 'deep',
    form: 0,
    scale: 2.4,
    stone: 0x6f8584,
    eye: 0x8fe0ff,
    face: Math.PI * 0.2,
    under: true
  }
];
let grain = null;
function stoneMat(color) {
  if (!grain) {
    grain = grainTexture().clone();
    grain.repeat.set(3, 3);
    grain.needsUpdate = true;
  }
  return surface(
    new T.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, bumpMap: grain, bumpScale: 1.6 }),
    'stone'
  );
}
function statue(def) {
  const genome = makeGenome(9000 + def.id.length * 131, def.form ?? 0, def.family);
  genome.bs = def.genes;
  genome.temper = [200, 200];
  const m = makeCreature(genome);
  applyGeneMarks(m, genome, 'beast');
  const stone = stoneMat(def.stone),
    eye = new T.MeshStandardMaterial({ color: 0x222222, emissive: def.eye, emissiveIntensity: 0.35, roughness: 0.4 });
  m.traverse(o => {
    // no living light on a statue: no aura, no smoke, no glow organs — only the eyes, faintly
    if (o.isPoints || (o.isMesh && o.material?.transparent && !o.userData.eye)) {
      o.visible = false;
      return;
    }
    if (!o.isMesh) return;
    o.material = o.userData.eye || o.userData.beastEye ? eye : stone;
    o.castShadow = o.receiveShadow = true;
  });
  if (m.userData.perch) m.userData.perch.visible = false;
  m.userData.beastLook = null; // frozen: nothing animates
  const g = new T.Group(),
    base = groundAt(def.at.x, def.at.z),
    plinthMat = stoneMat(0x6c6862);
  // a carved, cracked plinth
  const plinth = new T.Mesh(new T.CylinderGeometry(2.6, 3.1, 1.1, 8), plinthMat);
  plinth.position.y = 0.55;
  const step = new T.Mesh(new T.CylinderGeometry(3.4, 3.7, 0.4, 8), plinthMat);
  step.position.y = 0.2;
  for (const p of [plinth, step]) {
    p.castShadow = p.receiveShadow = true;
    g.add(p);
  }
  m.scale.multiplyScalar(def.scale);
  m.position.y = 1.1 + (def.under ? 0.4 : 0);
  m.rotation.y = def.face;
  g.add(m);
  g.position.set(def.at.x, base, def.at.z);
  g.userData.statue = def.id;
  // stone does not move: a couple of hundred parts drawn as a handful of meshes
  bakeStatic(g);
  return g;
}
export function makeStatues() {
  const group = new T.Group();
  for (const def of STATUES) group.add(statue(def));
  return group;
}
