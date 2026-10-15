// 0.48 穹頂: the open country under the New World's dome, drawn — rolling ground, woods, the river and its footbridge,
// deer on their circles, the flock on its figure of eight, far hills that never come nearer, and the shell itself:
// invisible, except for a ripple of hexagons where you touch it and its seams at sunset. Rules: dome.js.
import * as T from './vendor/three.module.min.js';
import { TOWN, DOME_R, domeHeight, riverX, RIVER_HALF, BRIDGE, TREES, DEER, birdAt, deerAt } from './dome.js?v=0.48.0';
import { grainTexture } from './realism.js?v=0.48.0';

const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const SIZE = 640,
  SEGS = 160;

function terrain() {
  const geo = new T.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position,
    col = new Float32Array(pos.count * 3),
    c = new T.Color(),
    grass = new T.Color(0x5f7a45),
    dry = new T.Color(0x8a8a55),
    dark = new T.Color(0x3f5a34),
    bank = new T.Color(0x8b7d5c);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      h = domeHeight(x, z);
    pos.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * Math.cos(z * 0.09);
    c.copy(grass)
      .lerp(dry, Math.max(0, Math.min(1, (h - 3) / 6)) * 0.6)
      .lerp(dark, n * 0.35);
    if (Math.abs(x - riverX(z)) < RIVER_HALF + 4) c.lerp(bank, 0.6);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const grain = grainTexture().clone();
  grain.repeat.set(90, 90);
  grain.needsUpdate = true;
  const m = new T.Mesh(geo, mat(0xffffff, { vertexColors: true, roughness: 1, bumpMap: grain, bumpScale: 0.5 }));
  m.receiveShadow = true;
  return m;
}
function river() {
  const pts = [];
  for (let z = -DOME_R; z <= DOME_R; z += 6) pts.push(z);
  const geo = new T.BufferGeometry(),
    v = [],
    idx = [];
  pts.forEach((z, i) => {
    const x = riverX(z);
    v.push(x - RIVER_HALF - 0.6, -0.55, z, x + RIVER_HALF + 0.6, -0.55, z);
    if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  });
  geo.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      color: 0x3d6f7c,
      roughness: 0.15,
      metalness: 0.3,
      transparent: true,
      opacity: 0.88,
      side: T.DoubleSide
    })
  );
}
function bridge() {
  const g = new T.Group(),
    wood = mat(0x7a5a3c, { roughness: 0.8 }),
    x = riverX(BRIDGE.z),
    len = RIVER_HALF * 2 + 6;
  const deck = new T.Mesh(new T.BoxGeometry(len, 0.25, BRIDGE.half * 2), wood);
  deck.position.set(x, 0.55, BRIDGE.z);
  g.add(deck);
  for (const s of [-1, 1]) {
    const rail = new T.Mesh(new T.BoxGeometry(len, 0.1, 0.1), wood);
    rail.position.set(x, 1.4, BRIDGE.z + s * (BRIDGE.half - 0.1));
    g.add(rail);
    for (let k = -2; k <= 2; k++) {
      const post = new T.Mesh(new T.BoxGeometry(0.14, 0.9, 0.14), wood);
      post.position.set(x + (k * len) / 5, 0.95, BRIDGE.z + s * (BRIDGE.half - 0.1));
      g.add(post);
    }
  }
  g.traverse(o => o.isMesh && (o.castShadow = o.receiveShadow = true));
  return g;
}
function woods() {
  const g = new T.Group(),
    o = new T.Object3D(),
    pines = TREES.filter(t => t.kind === 'pine'),
    broads = TREES.filter(t => t.kind !== 'pine');
  const trunk = new T.InstancedMesh(new T.CylinderGeometry(0.28, 0.42, 1, 7), mat(0x5a4330), TREES.length),
    pine = new T.InstancedMesh(new T.ConeGeometry(2.6, 7, 8), mat(0x2f4f30, { flatShading: true }), pines.length),
    broad = new T.InstancedMesh(new T.IcosahedronGeometry(3, 1), mat(0x4a6b36, { flatShading: true }), broads.length);
  TREES.forEach((t, i) => {
    const y = domeHeight(t.x, t.z);
    o.position.set(t.x, y + 1.6 * t.s, t.z);
    o.scale.set(t.s, 3.2 * t.s, t.s);
    o.rotation.set(0, 0, 0);
    o.updateMatrix();
    trunk.setMatrixAt(i, o.matrix);
  });
  pines.forEach((t, i) => {
    o.position.set(t.x, domeHeight(t.x, t.z) + 3.2 * t.s + 3.5 * t.s, t.z);
    o.scale.setScalar(t.s);
    o.rotation.set(0, t.x, 0);
    o.updateMatrix();
    pine.setMatrixAt(i, o.matrix);
  });
  broads.forEach((t, i) => {
    o.position.set(t.x, domeHeight(t.x, t.z) + 3.2 * t.s + 2.2 * t.s, t.z);
    o.scale.set(t.s * 1.1, t.s * 0.9, t.s * 1.1);
    o.rotation.set(0, t.z, 0);
    o.updateMatrix();
    broad.setMatrixAt(i, o.matrix);
  });
  for (const m of [trunk, pine, broad]) {
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
function deerModel() {
  const g = new T.Group(),
    hide = mat(0x8a6240, { roughness: 0.8 }),
    pale = mat(0xd8c7a8);
  const body = new T.Mesh(new T.SphereGeometry(0.5, 14, 10), hide);
  body.scale.set(0.75, 0.8, 1.6);
  body.position.y = 1.15;
  g.add(body);
  const neck = new T.Mesh(new T.CylinderGeometry(0.13, 0.2, 0.8, 8), hide);
  neck.position.set(0, 1.55, 0.7);
  neck.rotation.x = -0.5;
  g.add(neck);
  const head = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), hide);
  head.scale.set(0.8, 0.8, 1.4);
  head.position.set(0, 1.9, 0.95);
  g.add(head);
  for (const s of [-1, 1]) {
    const antler = new T.Mesh(new T.CylinderGeometry(0.02, 0.03, 0.5, 5), pale);
    antler.position.set(s * 0.1, 2.2, 0.9);
    antler.rotation.z = -s * 0.5;
    g.add(antler);
  }
  const legs = [];
  for (const [x, z] of [
    [-0.22, 0.55],
    [0.22, 0.55],
    [-0.22, -0.55],
    [0.22, -0.55]
  ]) {
    const hip = new T.Group();
    hip.position.set(x, 1.0, z);
    const leg = new T.Mesh(new T.CylinderGeometry(0.06, 0.04, 1, 6), hide);
    leg.position.y = -0.5;
    hip.add(leg);
    g.add(hip);
    legs.push(hip);
  }
  g.traverse(o => o.isMesh && (o.castShadow = true));
  g.userData.legs = legs;
  return g;
}
function birdModel() {
  const g = new T.Group(),
    m = new T.MeshBasicMaterial({ color: 0x23262a, side: T.DoubleSide });
  for (const s of [-1, 1]) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.15, s * 0.9, 0, -0.1, 0, 0, -0.25], 3));
    const wing = new T.Mesh(geo, m);
    g.add(wing);
  }
  return g;
}
// The shell: a hemisphere with a hexagon grid that only shows at sunset and where you touch it.
function shell() {
  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    uniforms: {
      uSeams: { value: 0 },
      uTime: { value: 0 },
      uRipple: { value: new T.Vector3(0, -999, 0) },
      uRippleT: { value: -99 }
    },
    vertexShader: `varying vec3 vP;varying vec3 vL;
void main(){vL=position;vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uSeams;uniform float uTime;uniform vec3 uRipple;uniform float uRippleT;
varying vec3 vP;varying vec3 vL;
float hexEdge(vec2 p){vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(p,r)-h,b=mod(p-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
 g=abs(g);return .5-max(dot(g,normalize(r)),g.x);}
void main(){vec3 d=normalize(vL);vec2 uv=vec2(atan(d.x,d.z)*24.,asin(clamp(d.y,0.,1.))*24.);
 float line=1.-smoothstep(.0,.035,hexEdge(uv));
 float age=uTime-uRippleT;float rip=exp(-length(vP-uRipple)/9.)*clamp(1.-age/1.8,0.,1.)*(.6+.4*sin(age*14.));
 float a=line*(uSeams*.4*smoothstep(0.,.12,d.y)+rip*.95);
 if(a<.003)discard;gl_FragColor=vec4(mix(vec3(1.,.86,.6),vec3(.75,.95,1.),rip),a);}`
  });
  const m = new T.Mesh(new T.SphereGeometry(DOME_R, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2), material);
  m.renderOrder = 4;
  m.frustumCulled = false;
  return m;
}
// Far hills: a ring that is carried along with you, so however far you walk they never come nearer.
function farHills() {
  const g = new T.Group(),
    hill = mat(0x55684d, { roughness: 1, flatShading: true, fog: false });
  let seed = 77;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + rnd() * 0.15,
      r = 900 + rnd() * 250,
      h = 60 + rnd() * 120;
    const m = new T.Mesh(new T.ConeGeometry(160 + rnd() * 160, h, 7), hill);
    m.position.set(Math.sin(a) * r, h / 2 - 8, Math.cos(a) * r);
    g.add(m);
  }
  return g;
}
// Ghost traces: a few trails of faint glowing footprints, reused.
function traces() {
  const g = new T.Group(),
    geo = new T.CircleGeometry(0.12, 10);
  geo.scale(1, 2.1, 1);
  const trails = [];
  for (let k = 0; k < 3; k++) {
    const material = new T.MeshBasicMaterial({
      color: 0x9ff0ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending
    });
    const steps = [];
    for (let i = 0; i < 14; i++) {
      const m = new T.Mesh(geo, material);
      m.rotation.x = -Math.PI / 2;
      g.add(m);
      steps.push(m);
    }
    trails.push({ material, steps, life: 0, x: 0, z: 0 });
  }
  return { group: g, trails };
}

export function makeDome() {
  const group = new T.Group();
  group.position.set(TOWN.x, 0, TOWN.z);
  // beyond the shell the meadow runs on to the horizon (out of reach)
  const outside = new T.Mesh(new T.RingGeometry(DOME_R + 20, 1700, 64), mat(0x5a7044, { roughness: 1 }));
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.4;
  group.add(outside);
  group.add(terrain(), river(), bridge(), woods());
  const deer = DEER.map(() => {
    const d = deerModel();
    group.add(d);
    return d;
  });
  const birds = Array.from({ length: 9 }, () => {
    const b = birdModel();
    group.add(b);
    return b;
  });
  const dome = shell();
  group.add(dome);
  const tr = traces();
  group.add(tr.group);
  const hills = farHills();
  return { group, hills, deer, birds, dome, traces: tr.trails };
}
// A trail of footprints, local coordinates, walking along `heading`.
export function showTrace(d, x, z, heading) {
  const tr = d.traces.find(t => t.life <= 0) || d.traces[0];
  tr.life = 40;
  tr.x = x;
  tr.z = z;
  tr.steps.forEach((m, i) => {
    const px = x + Math.sin(heading) * i * 0.7 + Math.cos(heading) * (i % 2 ? 0.14 : -0.14),
      pz = z + Math.cos(heading) * i * 0.7 - Math.sin(heading) * (i % 2 ? 0.14 : -0.14);
    m.position.set(px, domeHeight(px, pz) + 0.05, pz);
    m.rotation.z = -heading;
  });
}
export function domeRipple(d, lx, lz, y, t) {
  d.dome.material.uniforms.uRipple.value.set(TOWN.x + lx, y, TOWN.z + lz);
  d.dome.material.uniforms.uRippleT.value = t;
}
export function animateDome(d, t, dt, { player, seams }) {
  const u = d.dome.material.uniforms;
  u.uTime.value = t;
  u.uSeams.value = seams;
  d.hills.position.set(player.x, 0, player.z);
  d.deer.forEach((m, i) => {
    const p = deerAt(t, i);
    m.position.set(p.x, domeHeight(p.x, p.z), p.z);
    m.rotation.y = p.heading;
    m.userData.legs.forEach(
      (l, k) => (l.rotation.x = Math.sin(t * 5 + (k % 2 ? Math.PI : 0) + (k > 1 ? 1.2 : 0)) * 0.35)
    );
  });
  d.birds.forEach((b, i) => {
    const p = birdAt(t, i),
      q = birdAt(t + 0.1, i);
    b.position.set(p.x, p.y, p.z);
    b.rotation.set(0, Math.atan2(q.x - p.x, q.z - p.z), 0);
    const flap = Math.sin(t * 9 + i) * 0.5;
    b.children[0].rotation.z = flap;
    b.children[1].rotation.z = -flap;
  });
  for (const tr of d.traces) {
    if (tr.life <= 0) {
      tr.material.opacity = 0;
      continue;
    }
    const near = Math.hypot(player.lx - tr.x, player.lz - tr.z) < 4;
    tr.life -= dt * (near ? 12 : 1);
    tr.material.opacity = Math.max(0, Math.min(0.6, tr.life / 8)) * (0.75 + 0.25 * Math.sin(t * 3));
  }
}
