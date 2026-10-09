import * as T from './vendor/three.module.min.js';
import { EXPLORE, CAVE } from './expansion.js?v=0.11.0';
import { makeCreature } from './creatures.js?v=0.11.0';
import { makeGenome } from './genetics.js?v=0.11.0';
const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
function m(g, geo, c, x, y, z, s = [1, 1, 1], extra = {}) {
  const mesh = new T.Mesh(geo, mat(c, extra));
  mesh.position.set(x, y, z);
  mesh.scale.set(...s);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
export function expansionModels(scene) {
  const group = new T.Group(),
    sites = new Map();
  scene.add(group);
  for (const p of EXPLORE) {
    const g = new T.Group();
    g.position.set(p.x, p.deep ? -8 : 0.42, p.z);
    g.userData.siteId = p.id;
    group.add(g);
    sites.set(p.id, g);
    if (p.kind === 'entrance' || p.kind === 'exit') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 8) * Math.PI;
        m(g, new T.DodecahedronGeometry(0.7, 1), 0x536778, Math.cos(a) * 1.3, 0.2 + Math.sin(a) * 2.1, 0, [0.8, 1, 1]);
      }
      m(g, new T.CircleGeometry(1, 32), 0x102739, 0, 1.2, 0.1, [1.1, 1.4, 1], {
        side: T.DoubleSide,
        emissive: 0x174451,
        emissiveIntensity: 0.6
      });
    } else if (p.kind === 'ruin') {
      m(g, new T.BoxGeometry(1.3, 2.5, 0.4), 0x5d7c79, 0, 1.25, 0);
      for (let n = 0; n < 6; n++)
        m(g, new T.BoxGeometry(0.5 + (n % 2) * 0.25, 0.035, 0.035), 0x9edde0, 0, 0.6 + n * 0.28, 0.22, [1, 1, 1], {
          emissive: 0x6fbab1,
          emissiveIntensity: 0.9
        });
    } else {
      m(g, new T.BoxGeometry(1.1, 0.65, 0.8), p.deep ? 0x516f91 : 0x8c7156, 0, 0.34, 0);
      for (const x of [-0.39, 0.39]) m(g, new T.BoxGeometry(0.08, 0.72, 0.86), 0xc6b78c, x, 0.36, 0);
      m(g, new T.OctahedronGeometry(0.18), 0x99e7dc, 0, 0.84, 0, [1, 1, 1], {
        emissive: 0x7adbc9,
        emissiveIntensity: 1
      });
    }
  }
  const cave = new T.Group();
  cave.position.set(CAVE.x, 0, CAVE.z);
  group.add(cave);
  m(cave, new T.CylinderGeometry(6.5, 6.5, 0.4, 40), 0x364956, 0, 0.21, 0);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    if (Math.abs(a) < 0.4 || Math.abs(a - Math.PI * 2) < 0.4) continue;
    m(cave, new T.DodecahedronGeometry(1, 1), 0x33434f, Math.sin(a) * 6.5, 1.7, Math.cos(a) * 6.5, [1.2, 2.5, 1]);
    if (i % 3 === 0)
      m(cave, new T.ConeGeometry(0.25, 2.3, 5), 0x79b9bf, Math.sin(a) * 5.6, 1.1, Math.cos(a) * 5.6, [1, 1, 1], {
        emissive: 0x427d91,
        emissiveIntensity: 0.8
      });
  }
  const light = new T.PointLight(0x76bfd6, 40, 22);
  light.position.set(0, 3, 0);
  cave.add(light);
  const seabed = new T.Group();
  scene.add(seabed);
  m(seabed, new T.PlaneGeometry(800, 800), 0x16445a, 0, -12, 0).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 35; i++) {
    const x = Math.sin(i * 42) * 85,
      z = Math.cos(i * 17) * 85;
    m(seabed, new T.DodecahedronGeometry(1, 0), 0x315365, x, -11.5, z, [1.5, 1 + (i % 3), 2]);
    m(seabed, new T.ConeGeometry(0.15, 2, 5), 0x4bbaa6, x + 0.7, -10, z, [1, 1, 1], {
      emissive: 0x27685d,
      emissiveIntensity: 0.4
    });
  }
  // The deep-sea guardian: an abyssal sea serpent with a turtle's armour and maximum horns.
  const genome = makeGenome(8924, 0, 'deep');
  genome.body = [20, 210];
  genome.horn = [255, 255];
  genome.hue = [4, 20];
  genome.glow = [250, 250];
  const boss = makeCreature(genome);
  boss.scale.setScalar(3.2);
  scene.add(boss);
  const coords = new Float32Array(360 * 3);
  for (let i = 0; i < coords.length; i += 3) {
    coords[i] = Math.sin(i * 33) * 30;
    coords[i + 1] = i % 19;
    coords[i + 2] = Math.cos(i * 7) * 30;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(coords, 3));
  const rain = new T.Points(
    geo,
    new T.PointsMaterial({ color: 0xb3d3dc, size: 0.09, transparent: true, opacity: 0.7 })
  );
  scene.add(rain);
  return { group, sites, cave, seabed, boss, rain };
}
