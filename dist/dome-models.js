// 0.48 穹頂: the open country under the New World's dome, drawn — rolling ground, woods, the river and its footbridge,
// deer on their circles, the flock on its figure of eight, far hills that never come nearer, and the shell itself:
// invisible, except for a ripple of hexagons where you touch it and its seams at sunset. Rules: dome.js.
import * as T from './vendor/three.module.min.js';
import {
  TOWN,
  DOME_R,
  OUTER_R,
  domeHeight,
  riverX,
  RIVER_HALF,
  BRIDGE,
  TREES,
  DEER,
  birdAt,
  deerAt
} from './dome.js?v=0.68.0';
import { grainTexture } from './realism.js?v=0.68.0';
import { OUTPOST, RIFT, TEAR_AT } from './chapter3.js?v=0.68.0';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

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
  for (let z = -DOME_R; z <= DOME_R; z += 6) if (Math.hypot(riverX(z), z) < DOME_R - 2) pts.push(z);
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
      uRippleT: { value: -99 },
      uOutside: { value: 0 }, // 0.50: seen from outside, the shell shows its panels
      uTear: { value: 0 } // 0.50: where 嘯岳 tore it, due south at the foot
    },
    vertexShader: `varying vec3 vP;varying vec3 vL;
void main(){vL=position;vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uSeams;uniform float uTime;uniform vec3 uRipple;uniform float uRippleT;uniform float uOutside;uniform float uTear;
varying vec3 vP;varying vec3 vL;
float hexEdge(vec2 p){vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(p,r)-h,b=mod(p-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
 g=abs(g);return .5-max(dot(g,normalize(r)),g.x);}
void main(){vec3 d=normalize(vL);float az=atan(d.x,d.z),el=asin(clamp(d.y,0.,1.));vec2 uv=vec2(az*24.,el*24.);
 float line=1.-smoothstep(.0,.035,hexEdge(uv));
 float age=uTime-uRippleT;float rip=exp(-length(vP-uRipple)/9.)*clamp(1.-age/1.8,0.,1.)*(.6+.4*sin(age*14.));
 // the tear: a jagged gap at the foot of the shell, its lips burning violet
 float w=(.024+.006*sin(el*90.+3.))*(1.-el/.11),gap=abs(az)-w;
 if(uTear>.5&&el<.11&&gap<0.)discard;
 float lip=uTear*exp(-max(gap,0.)*260.)*step(el,.13);
 float a=line*(uSeams*.4*smoothstep(0.,.12,d.y)+rip*.95+uOutside*.45)+uOutside*.06+lip*.9;
 if(a<.003)discard;
 vec3 c=mix(vec3(1.,.86,.6),vec3(.75,.95,1.),rip);c=mix(c,vec3(.62,.66,.72),uOutside*(1.-line));c=mix(c,vec3(.8,.4,1.),lip);
 gl_FragColor=vec4(c,min(a,1.));}`
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

// 0.50: outside the shell — researcher K.'s abandoned outpost and the first layer of the rift
function outsideProps() {
  const g = new T.Group(),
    rust = mat(0x6b5446, { roughness: 0.8, metalness: 0.4 }),
    dark = mat(0x2c2a2e, { roughness: 0.7, metalness: 0.5 });
  const O = OUTPOST;
  const shack = new T.Group();
  shack.position.set(O.x, 0, O.z);
  shack.rotation.y = -0.4;
  const walls = new T.Mesh(new T.BoxGeometry(6, 3, 4.5), rust);
  walls.position.y = 1.5;
  shack.add(walls);
  const roof = new T.Mesh(new T.BoxGeometry(6.8, 0.25, 5.3), dark);
  roof.position.y = 3.15;
  roof.rotation.z = 0.08;
  shack.add(roof);
  const mast = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 7, 6), dark);
  mast.position.set(2.4, 3.5, -1.6);
  shack.add(mast);
  const dish = new T.Mesh(new T.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), dark);
  dish.position.set(2.4, 6.6, -1.6);
  dish.rotation.x = 1.1;
  shack.add(dish);
  const desk = new T.Mesh(new T.BoxGeometry(1.6, 0.9, 0.8), dark);
  desk.position.set(-0.6, 0.45, 2.7);
  shack.add(desk);
  const screen = new T.Mesh(
    new T.PlaneGeometry(0.7, 0.45),
    new T.MeshStandardMaterial({ color: 0x0b1a1c, emissive: 0x6fe3d6, emissiveIntensity: 1.2 })
  );
  screen.position.set(-0.6, 1.25, 2.72);
  shack.add(screen);
  for (const [x, z] of [
    [-3.6, 1],
    [-3.9, -0.6],
    [3.4, 2.4]
  ]) {
    const crate = new T.Mesh(new T.BoxGeometry(0.9, 0.8, 0.9), rust);
    crate.position.set(x, 0.4, z);
    crate.rotation.y = x;
    shack.add(crate);
  }
  shack.traverse(o => o.isMesh && (o.castShadow = o.receiveShadow = true));
  g.add(shack);
  // the rift: a jagged seam of violet light in the ground, crystal splinters hanging over it
  const R = RIFT,
    glow = new T.MeshStandardMaterial({ color: 0x1a0624, emissive: 0xb35cff, emissiveIntensity: 2.2 });
  const shards = [];
  for (let i = -6; i <= 6; i++) {
    const seg = new T.Mesh(
      new T.BoxGeometry(2.6 + Math.abs(Math.sin(i * 1.7)) * 1.4, 0.06, 0.25 + Math.cos(i) * 0.15),
      glow
    );
    seg.position.set(R.x + i * 2.3, 0.04, R.z + Math.sin(i * 0.9) * 1.8);
    seg.rotation.y = 0.35 + Math.sin(i * 2.1) * 0.35;
    g.add(seg);
  }
  const crystal = new T.MeshStandardMaterial({
    color: 0x9b6bd6,
    emissive: 0x7b3fd0,
    emissiveIntensity: 1,
    roughness: 0.2
  });
  for (let i = 0; i < 9; i++) {
    const c = new T.Mesh(new T.OctahedronGeometry(0.35 + (i % 3) * 0.2), crystal);
    c.position.set(R.x + (i - 4) * 3, 2 + (i % 4), R.z + Math.cos(i * 1.3) * 2);
    c.userData.phase = i;
    g.add(c);
    shards.push(c);
  }
  const light = new T.PointLight(0xb35cff, 600, 40, 1.6);
  light.position.set(R.x, 3, R.z);
  g.add(light);
  g.userData.shards = shards;
  wasteland(g);
  return g;
}

// 0.54: the wasteland itself — scorched ground, rocks and boulders, fragments of the shell blown out by the tear,
// violet cracks that run back to the rift, and a low mist that glows.
function wasteland(g) {
  let seed = 9071;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const clear = (x, z, r) =>
    Math.hypot(x - OUTPOST.x, z - OUTPOST.z) > r + 7 &&
    Math.hypot(x - RIFT.x, z - RIFT.z) > r + 12 &&
    !(Math.abs(x - TEAR_AT.x) < r + 7 && z < TEAR_AT.z + 40);
  // the ground: a ring from the shell out past the horizon, rough and stained
  const geo = new T.RingGeometry(DOME_R + 0.6, OUTER_R + 260, 180, 24);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position,
    col = new Float32Array(pos.count * 3),
    c = new T.Color(),
    ash = new T.Color(0x6e6870),
    rust = new T.Color(0x86705f),
    violet = new T.Color(0x5d4180);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      d = Math.hypot(x, z),
      n = 0.5 + 0.5 * Math.sin(x * 0.07 + Math.sin(z * 0.05) * 3) * Math.cos(z * 0.06 - x * 0.02);
    // past the walkable edge the land heaves up into ridges that hide the horizon line
    pos.setY(i, d > OUTER_R + 10 ? Math.min(28, (d - OUTER_R - 10) * 0.12) * (0.6 + n) : 0);
    c.copy(ash).lerp(rust, n * 0.7);
    c.lerp(violet, Math.max(0, 1 - Math.hypot(x - RIFT.x, z - RIFT.z) / 90) * 0.8);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const grain = grainTexture().clone();
  grain.repeat.set(120, 120);
  grain.needsUpdate = true;
  // a detail map: ash blotches, light grit and a web of dried cracks, tiled small
  const dc = document.createElement('canvas');
  dc.width = dc.height = 256;
  const dx = dc.getContext('2d');
  dx.fillStyle = '#b8b2b8';
  dx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 256,
      y = rnd() * 256,
      r = 6 + rnd() * 30,
      gr = dx.createRadialGradient(x, y, 0, x, y, r);
    const v = rnd() < 0.6 ? '60,52,62' : '220,210,200';
    gr.addColorStop(0, `rgba(${v},${0.18 + rnd() * 0.25})`);
    gr.addColorStop(1, `rgba(${v},0)`);
    dx.fillStyle = gr;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) dx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  for (let i = 0; i < 1600; i++) {
    dx.fillStyle = rnd() < 0.5 ? 'rgba(40,36,44,0.35)' : 'rgba(235,228,220,0.3)';
    dx.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  dx.strokeStyle = 'rgba(45,38,50,0.55)';
  for (let i = 0; i < 26; i++) {
    let x = rnd() * 256,
      y = rnd() * 256,
      a = rnd() * 6.3;
    dx.lineWidth = 0.6 + rnd() * 1.2;
    dx.beginPath();
    dx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      a += (rnd() - 0.5) * 1.2;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      dx.lineTo(x, y);
    }
    dx.stroke();
  }
  const detail = new T.CanvasTexture(dc);
  detail.wrapS = detail.wrapT = T.RepeatWrapping;
  detail.colorSpace = T.SRGBColorSpace;
  detail.repeat.set(160, 160);
  detail.anisotropy = 4;
  const ground = new T.Mesh(
    geo,
    mat(0xffffff, {
      map: detail,
      vertexColors: true,
      roughness: 1,
      bumpMap: grain,
      bumpScale: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
  );
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  g.add(ground);
  // rocks: small ones underfoot, boulders towards the edge, a wall of crags past it
  const rockGeo = new T.IcosahedronGeometry(1, 1);
  {
    const p = rockGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 0.75 + 0.5 * Math.abs(Math.sin(p.getX(i) * 5.1 + p.getY(i) * 3.7 + p.getZ(i) * 4.3));
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k);
    }
    rockGeo.computeVertexNormals();
  }
  const rocks = [];
  // scattered stones, rock outcrops in clusters, and the crags past the edge
  for (let n = 0; rocks.length < 900 && n < 6000; n++) {
    const a = rnd() * Math.PI * 2,
      d = DOME_R + 6 + rnd() * (OUTER_R - DOME_R - 10),
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      sc = 0.12 + rnd() * rnd() * 0.7;
    if (clear(x, z, sc)) rocks.push({ x, z, sc, ry: rnd() * 6.3, tilt: rnd() * 0.4 });
  }
  for (let k = 0; k < 40; k++) {
    const a = rnd() * Math.PI * 2,
      d = DOME_R + 25 + rnd() * (OUTER_R - DOME_R - 30),
      cx = Math.cos(a) * d,
      cz = Math.sin(a) * d;
    if (!clear(cx, cz, 6)) continue;
    for (let i = 0; i < 6; i++) {
      const sc = (i ? 0.5 + rnd() * 1.2 : 1.6 + rnd() * 1.6) * (d > OUTER_R - 40 ? 1.6 : 1);
      rocks.push({ x: cx + (rnd() - 0.5) * 7, z: cz + (rnd() - 0.5) * 7, sc, ry: rnd() * 6.3, tilt: rnd() * 0.5 });
    }
  }
  for (let n = 0; n < 160; n++) {
    const a = rnd() * Math.PI * 2,
      d = OUTER_R - 4 + rnd() * 70;
    rocks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, sc: 3 + rnd() * 6, ry: rnd() * 6.3, tilt: rnd() * 0.4 });
  }
  const rockMesh = new T.InstancedMesh(rockGeo, mat(0x8a8590, { roughness: 0.95, flatShading: true }), rocks.length),
    o = new T.Object3D();
  rocks.forEach((r, i) => {
    o.position.set(r.x, r.sc * 0.25, r.z);
    o.rotation.set(r.tilt, r.ry, r.tilt * 0.5);
    o.scale.setScalar(r.sc);
    o.updateMatrix();
    rockMesh.setMatrixAt(i, o.matrix);
  });
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  g.add(rockMesh);
  // gravel and pebbles underfoot: plain low-poly stones, thick round the paths you walk
  const pebbles = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    mat(0x77707a, { roughness: 1, flatShading: true }),
    2400
  );
  let np = 0;
  for (let n = 0; np < 2400 && n < 9000; n++) {
    const a = rnd() * Math.PI * 2,
      d = DOME_R + 3 + Math.pow(rnd(), 1.6) * (OUTER_R - DOME_R),
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      sc = 0.05 + rnd() * rnd() * 0.3;
    if (Math.hypot(x - RIFT.x, z - RIFT.z) < 8) continue;
    o.position.set(x, sc * 0.2, z);
    o.rotation.set(rnd(), rnd() * 6.3, rnd());
    o.scale.set(sc * (1 + rnd()), sc * 0.6, sc);
    o.updateMatrix();
    pebbles.setMatrixAt(np++, o.matrix);
  }
  pebbles.count = np;
  pebbles.receiveShadow = true;
  g.add(pebbles);
  // fragments of the shell, thrown outward from the tear: hexagonal panels, half sunk in the ash
  const panelGeo = new T.CylinderGeometry(1, 1, 0.06, 6);
  const panels = new T.InstancedMesh(
    panelGeo,
    new T.MeshStandardMaterial({
      color: 0x9fd6e8,
      emissive: 0x3a8fb0,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.15,
      transparent: true,
      opacity: 0.75
    }),
    46
  );
  for (let i = 0; i < 46; i++) {
    const a = Math.PI / 2 + (rnd() - 0.5) * 1.1,
      d = DOME_R + 3 + rnd() * rnd() * 60,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      sc = 0.4 + rnd() * 1.2;
    o.position.set(x, 0.05 + sc * 0.25, z);
    o.rotation.set((rnd() - 0.5) * 1.6, rnd() * 6.3, (rnd() - 0.5) * 1.6);
    o.scale.set(sc, 1, sc);
    o.updateMatrix();
    panels.setMatrixAt(i, o.matrix);
  }
  panels.castShadow = true;
  g.add(panels);
  // cracks of violet light, wandering out from the rift and the tear
  const parts = [];
  const crack = (x, z, a, len, w) => {
    for (let k = 0; k < len; k++) {
      const step = 1.6 + rnd() * 2.2;
      a += (rnd() - 0.5) * 0.9;
      const nx = x + Math.cos(a) * step,
        nz = z + Math.sin(a) * step;
      if (Math.hypot(nx, nz) < DOME_R + 1.5) return;
      const seg = new T.BoxGeometry(step + 0.3, 0.04, w * (1 - k / len) + 0.04);
      seg.rotateY(-a);
      seg.translate((x + nx) / 2, 0.06, (z + nz) / 2);
      parts.push(seg);
      if (rnd() < 0.12 && k < len - 3) crack(nx, nz, a + (rnd() < 0.5 ? 0.8 : -0.8), (len - k) >> 1, w * 0.6);
      x = nx;
      z = nz;
    }
  };
  for (let i = 0; i < 14; i++) crack(RIFT.x, RIFT.z, rnd() * Math.PI * 2, 10 + ((rnd() * 18) | 0), 0.35);
  for (let i = 0; i < 5; i++)
    crack(TEAR_AT.x, TEAR_AT.z + 3, Math.PI / 2 + (rnd() - 0.5) * 2, 6 + ((rnd() * 8) | 0), 0.18);
  const veins = new T.Mesh(
    mergeGeometries(parts),
    new T.MeshStandardMaterial({ color: 0x1a0624, emissive: 0xa050ff, emissiveIntensity: 1.4 })
  );
  g.add(veins);
  // the mist: soft violet billows hanging low over the ground, thickest by the rift
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const cx = cv.getContext('2d'),
    grad = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = grad;
  cx.fillRect(0, 0, 128, 128);
  const puff = new T.CanvasTexture(cv);
  const mist = [];
  for (let i = 0; i < 26; i++) {
    const nearRift = i < 10,
      a = rnd() * Math.PI * 2,
      d = nearRift ? rnd() * 22 : DOME_R + 20 + rnd() * (OUTER_R - DOME_R),
      x = nearRift ? RIFT.x + Math.cos(a) * d : Math.cos(a) * d,
      z = nearRift ? RIFT.z + Math.sin(a) * d : Math.sin(a) * d;
    const m = new T.Sprite(
      new T.SpriteMaterial({
        map: puff,
        color: nearRift ? 0xb070ff : 0x8a6aa8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
        fog: false
      })
    );
    const sc = nearRift ? 10 + rnd() * 8 : 18 + rnd() * 20;
    m.scale.set(sc, sc * 0.35, 1);
    m.position.set(x, sc * 0.12, z);
    m.userData = { phase: rnd() * 6.3, base: nearRift ? 0.32 : 0.16, x, z };
    g.add(m);
    mist.push(m);
  }
  g.userData.mist = mist;
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
  const props = outsideProps();
  props.visible = false;
  group.add(props);
  return { group, hills, deer, birds, dome, traces: tr.trails, props, ground: outside };
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
export function animateDome(d, t, dt, { player, seams, cracked = false, outside = false }) {
  const u = d.dome.material.uniforms;
  u.uTime.value = t;
  u.uSeams.value = seams;
  u.uTear.value = cracked ? 1 : 0;
  u.uOutside.value += ((outside ? 1 : 0) - u.uOutside.value) * Math.min(1, dt * 2);
  // once the shell is torn, what lies beyond it is the real wasteland, not more meadow
  d.props.visible = cracked;
  d.ground.material.color.setHex(cracked ? 0x4a4550 : 0x5a7044);
  d.ground.position.y = cracked ? -0.05 : -0.4;
  if (cracked)
    for (const m of d.props.userData.mist) {
      const u = m.userData;
      m.material.opacity = u.base * (0.65 + 0.35 * Math.sin(t * 0.3 + u.phase));
      m.position.x = u.x + Math.sin(t * 0.05 + u.phase) * 4;
    }
  for (const c of d.props.userData.shards) {
    c.position.y = 2 + (c.userData.phase % 4) + Math.sin(t + c.userData.phase) * 0.3;
    c.rotation.y = t * 0.6 + c.userData.phase;
  }
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
