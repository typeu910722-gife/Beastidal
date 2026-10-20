// The dark-fantasy look of a 御獸 (0.26). A creature stays an animal; a beast is something else:
//   · its skin darkens and takes an element's cast; a rim of coloured light outlines it; its hide breaks into
//     scales (a bump from a Voronoi field) and some of the grooves between them burn — lava, lightning, venom,
//     violet shadow — pulsing slowly.
//   · its eyes glow.
//   · an aura drifts off it: embers, ash, sparks, spores, frost, black smoke, crystal glints, pollen.
//   · its element grows on it: great swept horns and back blades and a molten maw for the dragons; smoke ribbons
//     for the wraiths; tendril hair crowned with a flower for the dryads; crystal or ice shards; venom sacs.
// Land beasts are rebuilt upright (creatures.js `upright`): a dragon, a wraith or a dryad, picked by the element.
import * as T from './vendor/three.module.min.js';
import { bsOf } from './bsgenes.js?v=0.74.0';
import { phenotype } from './genetics.js?v=0.74.0';
import { taper, addMesh, creatureDetail } from './creatures.js?v=0.74.0';

const GENE_ELEMENT = {
  fire: 'ember',
  magmacore: 'ember',
  heatsense: 'ember',
  lightning: 'storm',
  staticfur: 'storm',
  electricgill: 'storm',
  magnetsense: 'storm',
  frostbreath: 'frost',
  frostscale: 'frost',
  coldheart: 'frost',
  venomfang: 'venom',
  venomspine: 'venom',
  inkjet: 'venom',
  vinewhip: 'verdant',
  barkskin: 'verdant',
  photoskin: 'verdant',
  honeygland: 'verdant',
  sporecloud: 'verdant',
  tendrils: 'verdant',
  ghosteyes: 'shadow',
  nightsight: 'shadow',
  camouflage: 'shadow',
  echo: 'shadow',
  lure: 'shadow',
  resonant: 'shadow',
  scenttrail: 'shadow',
  crystalhorn: 'crystal',
  crystalcore: 'crystal',
  hardbody: 'bone',
  stoneskin: 'bone',
  boneplates: 'bone',
  tailclub: 'bone',
  greatjaw: 'bone',
  whiptail: 'bone',
  bonewings: 'bone'
};
// plan: the upright body a land beast grows into. shade multiplies the skin; rim/vein/eye are light colours.
export const LOOKS = {
  ember: {
    plan: 'dragon',
    wings: true,
    shade: 0x7a5a50,
    rim: 0xff4a1e,
    vein: 0xff6a14,
    veinAmt: 2.6,
    rimAmt: 1.1,
    eye: 0xffb040,
    aura: 'ember',
    adorn: ['horns', 'blades', 'maw']
  },
  bone: {
    plan: 'dragon',
    shade: 0x76665e,
    rim: 0xd0502e,
    vein: 0xff4a22,
    veinAmt: 1.1,
    rimAmt: 0.9,
    eye: 0xff5030,
    aura: 'ash',
    adorn: ['horns', 'blades']
  },
  storm: {
    plan: 'dragon',
    wings: true,
    shade: 0x56627a,
    rim: 0x5ab8ff,
    vein: 0x8fe0ff,
    veinAmt: 1.9,
    rimAmt: 1.2,
    eye: 0xb8f0ff,
    aura: 'spark',
    adorn: ['horns', 'shards']
  },
  venom: {
    plan: 'dragon',
    shade: 0x5e6852,
    rim: 0x9be36a,
    vein: 0xb6ff4a,
    veinAmt: 1.7,
    rimAmt: 1.0,
    eye: 0xd8ff60,
    aura: 'spore',
    adorn: ['blades', 'sacs']
  },
  frost: {
    plan: 'wraith',
    shade: 0x74849a,
    rim: 0x9fdcff,
    vein: 0xbff0ff,
    veinAmt: 1.4,
    rimAmt: 1.3,
    eye: 0xd0f4ff,
    aura: 'frost',
    adorn: ['ribbons', 'ice'],
    ribbon: 0xcfe6ff
  },
  shadow: {
    plan: 'wraith',
    shade: 0x44384f,
    rim: 0xa060ff,
    vein: 0x9a50ff,
    veinAmt: 1.7,
    rimAmt: 1.5,
    eye: 0xd8b0ff,
    aura: 'smoke',
    adorn: ['ribbons'],
    ribbon: 0x170d24
  },
  crystal: {
    plan: 'wraith',
    shade: 0x625c78,
    rim: 0xc1b2ee,
    vein: 0xd8c8ff,
    veinAmt: 1.6,
    rimAmt: 1.2,
    eye: 0xf0e0ff,
    aura: 'glint',
    adorn: ['ribbons', 'crystals'],
    ribbon: 0x6a5a98
  },
  verdant: {
    plan: 'dryad',
    shade: 0x627058,
    rim: 0xc070ff,
    vein: 0xa8e060,
    veinAmt: 1.3,
    rimAmt: 1.1,
    eye: 0xf0a0ff,
    aura: 'pollen',
    adorn: ['tendrils', 'bloom']
  }
};
export function lookOf(genome) {
  for (const g of bsOf(genome)) if (GENE_ELEMENT[g]) return { id: GENE_ELEMENT[g], ...LOOKS[GENE_ELEMENT[g]] };
  const id = { land: 'bone', sea: 'storm', deep: 'shadow', flora: 'verdant' }[phenotype(genome).family] || 'shadow';
  return { id, ...LOOKS[id] };
}
// The top of the body along its length, read from the skin itself (bins along z → highest point near the
// midline), so parts sit on the back of every species — fish, serpents, squid, turtles — not where a guess says.
function backLine(m) {
  if (m.userData.backLine) return m.userData.backLine;
  const body = m.userData.body || m,
    v = new T.Vector3(),
    pts = [];
  body.updateMatrix();
  for (const o of body.children) {
    if (!o.isMesh || o.material?.transparent || o.userData.eye || o.userData.tooth) continue;
    o.updateMatrix();
    const a = o.geometry?.attributes?.position;
    if (!a) continue;
    for (let i = 0; i < a.count; i += 2) {
      v.fromBufferAttribute(a, i).applyMatrix4(o.matrix);
      pts.push(v.x, v.y, v.z);
    }
  }
  if (!pts.length) return null;
  let z0 = Infinity,
    z1 = -Infinity;
  for (let i = 2; i < pts.length; i += 3) ((z0 = Math.min(z0, pts[i])), (z1 = Math.max(z1, pts[i])));
  const N = 16,
    top = new Array(N).fill(-Infinity);
  for (let i = 0; i < pts.length; i += 3) {
    const b = Math.min(N - 1, Math.floor(((pts[i + 2] - z0) / (z1 - z0 || 1)) * N));
    if (Math.abs(pts[i]) < 0.12 && pts[i + 1] > top[b]) top[b] = pts[i + 1];
  }
  for (let b = 0; b < N; b++) if (top[b] === -Infinity) top[b] = top[b - 1] ?? 0;
  return (m.userData.backLine = { z0, z1, top, N });
}
// Where things go on a body. Upright bodies carry their spine line in info.spine ([[y0, z0], [y1, z1]]).
export function bodyAnchors(m) {
  const u = m.userData,
    info = u.info || {},
    len = info.len || 1.4,
    top = info.top || 0.5,
    mouth = info.mouth?.at,
    upright = !!info.upright,
    front = mouth ? mouth[2] : len * 0.55,
    mouthY = mouth ? mouth[1] : top * 0.4,
    back = info.back ? info.back[2] : -len * 0.4,
    line = upright ? null : backLine(m),
    sp = info.spine || [
      [1.0, -0.21],
      [1.72, -0.12]
    ];
  return {
    body: u.body || m,
    len,
    top,
    front,
    mouthY,
    back,
    upright,
    mouth,
    head: info.head || [0, top * 0.8, front * 0.8],
    // a point along the back, f = 0 (rump / tail end) → 1 (shoulders / neck)
    spine: f =>
      upright
        ? [0, sp[0][0] + (sp[1][0] - sp[0][0]) * f, sp[0][1] + (sp[1][1] - sp[0][1]) * f]
        : line
          ? (() => {
              const z = line.z0 + (0.18 + 0.6 * f) * (line.z1 - line.z0),
                bin = Math.min(line.N - 1, Math.floor(((z - line.z0) / (line.z1 - line.z0 || 1)) * line.N));
              return [0, line.top[bin] - 0.02, z];
            })()
          : [0, top * 0.93, -len * 0.3 + (front * 0.75 + len * 0.3) * f],
    // the rotation that turns a part modelled pointing +y to point out of the back
    out: upright ? [-Math.PI / 2 + 0.45, 0, 0] : [-0.35, 0, 0],
    // a scale for parts on small sea bodies
    k: upright ? 1 : Math.max(0.6, Math.min(1.25, len / 2.4))
  };
}

/* ---------------------------------------------------------------- the skin shader */
const NOISE = `
uniform float uBeastT, uRimAmt, uVeinAmt, uBeastScale, uBeastBump;
uniform vec3 uRimColor, uVeinColor;
varying vec3 vBeastP;
vec3 beastHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
vec2 beastVoronoi(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int l = -1; l <= 1; l++) {
        vec3 g = vec3(float(l), float(j), float(k));
        vec3 r = g + beastHash(i + g) - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
  return vec2(sqrt(d1), sqrt(d2));
}
float beastN(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float beastNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(beastN(i), beastN(i + vec3(1, 0, 0)), f.x), mix(beastN(i + vec3(0, 1, 0)), beastN(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(beastN(i + vec3(0, 0, 1)), beastN(i + vec3(1, 0, 1)), f.x), mix(beastN(i + vec3(0, 1, 1)), beastN(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;
function inject(mt, U, flat) {
  if (mt.userData.beastLook) return;
  mt.userData.beastLook = true;
  const prev = mt.onBeforeCompile,
    prevKey = mt.customProgramCacheKey;
  mt.onBeforeCompile = (sh, r) => {
    prev?.call(mt, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBeastP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBeastP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec3 beastN0 = normal; // the surface before the scales, for the rim
        vec2 beastV = beastVoronoi(vBeastP * uBeastScale);
        float beastEdge = beastV.y - beastV.x;
        ${
          flat
            ? ''
            : `{
          float h = smoothstep(0.0, 0.22, beastEdge);
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1);
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * uBeastBump;
          normal = normalize(abs(det) * normal - grad);
        }`
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          float rim = pow(1.0 - clamp(dot(normalize(beastN0), normalize(vViewPosition)), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += uRimColor * rim * uRimAmt;
          // only some of the grooves burn: the ones inside slow-drifting patches
          float mask = smoothstep(0.52, 0.8, beastNoise(vBeastP * 1.3 + vec3(0.0, uBeastT * 0.04, 0.0)));
          float crack = (1.0 - smoothstep(0.0, 0.045, beastEdge)) * mask;
          float pulse = 0.7 + 0.3 * sin(uBeastT * 2.2 + vBeastP.y * 3.0 + vBeastP.z * 2.0);
          totalEmissiveRadiance += uVeinColor * crack * pulse * uVeinAmt;
        }`
      );
  };
  mt.customProgramCacheKey = () => (prevKey ? prevKey.call(mt) : '') + '|beast' + (flat ? 'F' : 'B');
  mt.needsUpdate = true;
}

/* ---------------------------------------------------------------- the scales */
// A tileable normal map of scales: a Voronoi height field (each cell a domed scale, grooves between), its slopes
// turned into normals. Baked once per detail level; the shader's vein cracks still come from the same kind of
// cells in object space, so burning grooves line up with grooves.
let scaleMap = null;
function scaleNormalMap(detail) {
  if (scaleMap) return scaleMap;
  const N = detail === 'low' ? 128 : 256,
    cells = 9,
    pts = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) pts.push([(i + 0.2 + rnd() * 0.6) / cells, (j + 0.2 + rnd() * 0.6) / cells]);
  const hgt = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = x / N,
        v = y / N;
      let d1 = 9,
        d2 = 9;
      for (const [px, py] of pts)
        for (let ox = -1; ox <= 1; ox++)
          for (let oy = -1; oy <= 1; oy++) {
            const dx = u - (px + ox),
              dy = v - (py + oy),
              d = Math.sqrt(dx * dx + dy * dy);
            if (d < d1) {
              d2 = d1;
              d1 = d;
            } else if (d < d2) d2 = d;
          }
      const edge = d2 - d1; // 0 on a groove
      hgt[y * N + x] = Math.min(1, edge * cells * 2.2) ** 0.6 - d1 * cells * 0.35;
    }
  const data = new Uint8Array(N * N * 4),
    amp = 2.4;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const h = (xx, yy) => hgt[((yy + N) % N) * N + ((xx + N) % N)],
        dx = (h(x + 1, y) - h(x - 1, y)) * amp,
        dy = (h(x, y + 1) - h(x, y - 1)) * amp,
        len = Math.hypot(dx, dy, 1),
        i = (y * N + x) * 4;
      data[i] = Math.round((-dx / len) * 127 + 128);
      data[i + 1] = Math.round((-dy / len) * 127 + 128);
      data[i + 2] = Math.round((1 / len) * 127 + 128);
      data[i + 3] = 255;
    }
  scaleMap = new T.DataTexture(data, N, N, T.RGBAFormat);
  scaleMap.wrapS = scaleMap.wrapT = T.RepeatWrapping;
  scaleMap.anisotropy = 4;
  scaleMap.needsUpdate = true;
  return scaleMap;
}

/* ---------------------------------------------------------------- the aura */
const AURA = {
  smoke: { color: 0x221432, size: 0.55, rise: 1.3, speed: 0.11, grow: 1.4, opacity: 0.5, blend: 'normal' },
  ember: { color: 0xff7a26, size: 0.07, rise: 1.7, speed: 0.33, grow: -0.5, opacity: 1, blend: 'add' },
  ash: { color: 0xff5530, size: 0.05, rise: 1.1, speed: 0.22, grow: -0.4, opacity: 0.7, blend: 'add' },
  spark: { color: 0x9ee8ff, size: 0.06, rise: 0.5, speed: 0.8, grow: 0, opacity: 1, blend: 'add', flicker: 1 },
  spore: { color: 0xb6ff4a, size: 0.09, rise: 0.7, speed: 0.14, grow: 0.3, opacity: 0.7, blend: 'add' },
  frost: { color: 0xe0f6ff, size: 0.07, rise: 0.4, speed: 0.12, grow: 0, opacity: 0.8, blend: 'add' },
  glint: { color: 0xe8dcff, size: 0.06, rise: 0.3, speed: 0.2, grow: 0, opacity: 1, blend: 'add', flicker: 0.6 },
  pollen: { color: 0xffc8ff, size: 0.08, rise: 0.6, speed: 0.13, grow: 0.2, opacity: 0.8, blend: 'add' }
};
const AURA_VERT = `
uniform float uT, uRise, uSpeed, uSize, uVH, uFlicker, uGrow;
attribute float aSeed;
varying float vA;
#include <fog_pars_vertex>
void main() {
  float life = fract(uT * uSpeed + aSeed * 7.13);
  vec3 p = position;
  p.y += life * uRise;
  p.x += sin(uT * 0.9 + aSeed * 31.0) * 0.14 * life;
  p.z += cos(uT * 0.7 + aSeed * 17.0) * 0.14 * life;
  vA = smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.55, 1.0, life));
  vA *= mix(1.0, step(0.45, fract(sin(floor(uT * 14.0 + aSeed * 50.0)) * 43758.5)), uFlicker);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float sc = length(modelMatrix[0].xyz);
  gl_PointSize = uSize * sc * max(0.2, 1.0 + uGrow * life) * (0.6 + 0.8 * fract(aSeed * 3.7)) * projectionMatrix[1][1] * uVH * 0.5 / max(0.1, -mvPosition.z);
  #include <fog_vertex>
}`;
const AURA_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
#include <fog_pars_fragment>
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, a * a * vA * uOpacity);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const vh = new T.Vector2();
function makeAura(a, look, detail) {
  const k = AURA[look.aura];
  if (!k) return null;
  const N = detail === 'low' ? 16 : detail === 'balanced' ? 28 : 44,
    pos = new Float32Array(N * 3),
    seed = new Float32Array(N);
  let s = 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < N; i++) {
    if (a.upright) {
      pos[i * 3] = (rnd() - 0.5) * 0.8;
      pos[i * 3 + 1] = 0.15 + rnd() * (look.aura === 'smoke' ? 1.4 : 2.0);
      pos[i * 3 + 2] = (rnd() - 0.5) * 0.6;
    } else {
      pos[i * 3] = (rnd() - 0.5) * 0.9 * a.k;
      pos[i * 3 + 1] = rnd() * a.top;
      pos[i * 3 + 2] = -a.len * 0.4 + rnd() * (a.front + a.len * 0.4);
    }
    seed[i] = rnd();
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
  const U = {
    uT: { value: 0 },
    uRise: { value: k.rise * (a.upright ? 1 : a.k) },
    uSpeed: { value: k.speed },
    uSize: { value: k.size },
    uVH: { value: 800 },
    uFlicker: { value: k.flicker || 0 },
    uGrow: { value: k.grow },
    uColor: { value: new T.Color(k.color) },
    uOpacity: { value: k.opacity }
  };
  const mat = new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {}]),
    vertexShader: AURA_VERT,
    fragmentShader: AURA_FRAG,
    transparent: true,
    depthWrite: false,
    fog: true,
    blending: k.blend === 'add' ? T.AdditiveBlending : T.NormalBlending
  });
  Object.assign(mat.uniforms, U);
  const pts = new T.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.noLook = true;
  pts.onBeforeRender = r => {
    r.getDrawingBufferSize(vh);
    U.uVH.value = vh.y;
  };
  pts.userData.auraU = U;
  return pts;
}

/* ---------------------------------------------------------------- what grows on it */
const lowDetail = () => creatureDetail() === 'low';
const phys = o => (lowDetail() ? new T.MeshStandardMaterial(o) : new T.MeshPhysicalMaterial(o));
function boneMat() {
  const m = phys({ color: 0x2e2622, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  m.userData.beastShade = true; // already dark
  return m;
}
function glowMat(color, intensity = 1.4, extra = {}) {
  return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3, ...extra });
}
const add = (v, w, k = 1) => [v[0] + w[0] * k, v[1] + w[1] * k, v[2] + w[2] * k];
function hornsOn(a, body) {
  const m = boneMat(),
    h = a.head,
    k = a.k;
  for (const s of [-1, 1]) {
    const b = add(h, [s * 0.09, 0.08, -0.04], k);
    addMesh(
      body,
      taper(
        [b, add(b, [s * 0.12, 0.22, -0.12], k), add(b, [s * 0.2, 0.33, -0.38], k), add(b, [s * 0.16, 0.3, -0.62], k)],
        0.065 * k,
        0.006,
        14,
        8
      ),
      m
    );
  }
}
function bladesOn(a, body) {
  const m = boneMat(),
    g = new T.ConeGeometry(0.075, 0.34, 4);
  for (let i = 0; i < 6; i++) {
    const f = (i + 0.5) / 6,
      big = 0.55 + Math.sin(f * Math.PI) * 0.6,
      b = addMesh(body, g, m, a.spine(f), a.out, [big * a.k, big * a.k, big * 0.28 * a.k]);
    b.position.y += 0.1 * big * a.k * (a.upright ? 0 : 1);
  }
}
function shardsOn(a, body, color, glow, sway) {
  const m = new T.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    }),
    g = new T.OctahedronGeometry(0.08, 0);
  for (let i = 0; i < 7; i++) {
    const f = (i + 0.5) / 7,
      big = 0.6 + Math.sin(f * Math.PI) * 0.7,
      p = a.spine(f),
      side = i % 2 ? 1 : -1,
      sh = addMesh(
        body,
        g,
        m,
        [p[0] + side * 0.06 * a.k, p[1], p[2]],
        [a.out[0], 0, side * 0.35],
        [big * 0.7 * a.k, big * 2.4 * a.k, big * 0.7 * a.k]
      );
    sh.userData.noLook = true;
  }
  sway.push({ pulse: m, base: 0.9, amp: 0.35, speed: 3.1 });
}
function sacsOn(a, body, color, sway) {
  const m = glowMat(color, 1.1, { transparent: true, opacity: 0.85 }),
    g = new T.SphereGeometry(0.07, 12, 8);
  for (let i = 0; i < 5; i++) {
    const p = a.spine((i + 0.7) / 6),
      side = i % 2 ? 1 : -1,
      sc = a.upright ? 1 : a.k;
    addMesh(
      body,
      g,
      m,
      [p[0] + side * 0.12 * sc, p[1] - (a.upright ? 0 : 0.06 * sc), p[2] + (a.upright ? 0.03 : 0)],
      null,
      sc * (0.8 + (i % 3) * 0.25)
    ).userData.noLook = true;
  }
  sway.push({ pulse: m, base: 1.1, amp: 0.5, speed: 1.4 });
}
function mawOn(a, body, color, sway) {
  if (!a.mouth) return;
  const m = glowMat(color, 2.4);
  const g = addMesh(
    body,
    new T.SphereGeometry(0.055 * a.k, 12, 8),
    m,
    add(a.mouth, [0, 0, -0.06 * a.k]),
    null,
    [1.3, 0.8, 1.6]
  );
  g.userData.noLook = true;
  g.castShadow = false;
  sway.push({ pulse: m, base: 2.2, amp: 1.0, speed: 2.4 });
}
let ribbonAlpha = null;
function ribbonTexture() {
  if (ribbonAlpha || typeof document === 'undefined') return ribbonAlpha;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const x = c.getContext('2d');
  for (let y = 0; y < 128; y++) {
    const fade = 1 - y / 128;
    for (let i = 0; i < 64; i++) {
      // ragged, torn edges that eat further in toward the tip
      const edge = Math.abs(i - 32) / 32,
        torn = 0.55 + 0.45 * fade + Math.sin(y * 0.35 + i * 0.2) * 0.08;
      const v = edge < torn ? Math.round(255 * Math.pow(fade, 0.7) * (1 - Math.pow(edge / torn, 3))) : 0;
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.fillRect(i, y, 1, 1);
    }
  }
  ribbonAlpha = new T.CanvasTexture(c);
  return ribbonAlpha;
}
function ribbonsOn(a, body, color, sway) {
  const mat = new T.MeshBasicMaterial({
    color,
    alphaMap: ribbonTexture(),
    transparent: true,
    opacity: 0.8,
    side: T.DoubleSide,
    depthWrite: false
  });
  const roots = a.upright
    ? [
        [-0.17, 1.72, -0.12, 1.5],
        [0.17, 1.72, -0.12, 1.5],
        [0, 1.78, -0.16, 1.7],
        [-0.1, 1.25, -0.16, 1.1],
        [0.1, 1.25, -0.16, 1.1]
      ]
    : [0.15, 0.35, 0.55, 0.75, 0.9].map((f, i) => {
        const p = a.spine(f);
        return [(i % 2 ? 1 : -1) * 0.08 * a.k, p[1], p[2], 1.3 * a.k];
      });
  roots.forEach(([x, y, z, L], i) => {
    const w = (a.upright ? 0.2 : 0.18 * a.k) * (0.8 + (i % 3) * 0.2),
      g = new T.PlaneGeometry(w, L, 1, 12);
    g.translate(0, -L / 2, 0);
    const r = new T.Mesh(g, mat);
    r.position.set(x, y, z);
    // upright: hang down the back; on a swimmer: trail out behind
    r.rotation.set(a.upright ? 0.28 : Math.PI / 2 - 0.3, (x > 0 ? 1 : x < 0 ? -1 : 0) * 0.25, 0);
    r.userData.noLook = true;
    r.renderOrder = 2;
    body.add(r);
    sway.push({ ribbon: r, base: Float32Array.from(g.attributes.position.array), L, phase: i * 1.7 });
  });
}
function tendrilsOn(a, body, sway) {
  const m = phys({ color: 0x2a3a22, roughness: 0.5, clearcoat: 0.3 }),
    tip = glowMat(0xe080ff, 1.6),
    tipG = new T.SphereGeometry(0.022, 8, 6),
    h = a.head,
    k = a.k,
    N = 13;
  for (let i = 0; i < N; i++) {
    // fanned round the back and sides of the head, like a medusa's hair
    const ang = Math.PI + (i / (N - 1) - 0.5) * Math.PI * 1.55,
      dx = Math.sin(ang),
      dz = Math.cos(ang),
      grp = new T.Group();
    grp.position.set(...add(h, [dx * 0.08, 0.06 + (i % 3) * 0.02, dz * 0.08 - 0.02], k));
    body.add(grp);
    const L = (0.8 + (i % 4) * 0.12) * k,
      pts = [
        [0, 0, 0],
        [dx * 0.16 * L, 0.1 * L, dz * 0.16 * L],
        [dx * 0.32 * L, 0.02 * L, dz * 0.32 * L],
        [dx * 0.4 * L, -0.24 * L, dz * 0.4 * L],
        [dx * 0.36 * L, -0.52 * L, dz * 0.36 * L + 0.05 * L * Math.sin(i)]
      ];
    addMesh(grp, taper(pts, 0.026 * k, 0.006, 12, 6), m);
    addMesh(grp, tipG, tip, pts[4], null, k).userData.noLook = true;
    sway.push({ obj: grp, ax: 0.12, az: 0.1, speed: 1.1 + (i % 5) * 0.13, phase: i * 0.9 });
  }
}
function bloomOn(a, body, sway) {
  const petal = phys({
      color: 0xa860d0,
      emissive: 0x6a1aa0,
      emissiveIntensity: 0.6,
      roughness: 0.45,
      side: T.DoubleSide
    }),
    heart = glowMat(0xffd0ff, 1.8),
    k = a.k,
    at = add(a.head, [0, 0.16, -0.02], k),
    g = new T.SphereGeometry(0.06, 10, 6),
    grp = new T.Group();
  grp.position.set(...at);
  body.add(grp);
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2,
      p = addMesh(
        grp,
        g,
        petal,
        [Math.cos(t) * 0.07 * k, 0.02 * k, Math.sin(t) * 0.07 * k],
        [Math.sin(t) * 0.7, 0, -Math.cos(t) * 0.7],
        [0.9 * k, 0.35 * k, 1.8 * k]
      );
    p.rotation.y = -t;
    p.userData.noLook = true;
  }
  addMesh(grp, new T.SphereGeometry(0.04 * k, 10, 8), heart, [0, 0.04 * k, 0]).userData.noLook = true;
  sway.push({ pulse: heart, base: 1.6, amp: 0.6, speed: 1.2 }, { obj: grp, ax: 0.05, az: 0.05, speed: 0.8, phase: 0 });
}
function adorn(a, look, sway) {
  const body = a.body;
  for (const what of look.adorn)
    if (what === 'horns') hornsOn(a, body);
    else if (what === 'blades') bladesOn(a, body);
    else if (what === 'maw') mawOn(a, body, look.vein, sway);
    else if (what === 'shards') shardsOn(a, body, 0x9ec8ff, look.vein, sway);
    else if (what === 'crystals') shardsOn(a, body, 0xd8ccff, look.vein, sway);
    else if (what === 'ice') shardsOn(a, body, 0xe8f8ff, 0x8fd0ff, sway);
    else if (what === 'sacs') sacsOn(a, body, look.vein, sway);
    else if (what === 'ribbons') ribbonsOn(a, body, look.ribbon || 0x170d24, sway);
    else if (what === 'tendrils') tendrilsOn(a, body, sway);
    else if (what === 'bloom') bloomOn(a, body, sway);
}

/* ---------------------------------------------------------------- public */
// Give a built beast mesh its look. Safe to call again. Returns the state animateCreature updates each frame.
export function applyBeastLook(m, genome, look = lookOf(genome)) {
  if (m.userData.beastLook) return m.userData.beastLook;
  const detail = creatureDetail(),
    a = bodyAnchors(m),
    sway = [];
  adorn(a, look, sway);
  const U = {
    uBeastT: { value: 0 },
    uRimColor: { value: new T.Color(look.rim) },
    uRimAmt: { value: look.rimAmt * 0.75 },
    uVeinColor: { value: new T.Color(look.vein) },
    uVeinAmt: { value: look.veinAmt * 0.65 },
    uBeastScale: { value: a.upright ? 11 : 9 },
    uBeastBump: { value: 0.022 }
  };
  const shade = new T.Color(look.shade),
    eye = new T.Color(look.eye);
  m.traverse(o => {
    if (!o.isMesh || o === m.userData.perch || o.userData.bsMark || o.userData.noLook) return;
    const mt = o.material;
    if (!mt?.isMeshStandardMaterial) return;
    if (o.userData.eye) {
      // the iris burns in the element's colour
      mt.emissive = eye.clone();
      mt.emissiveMap = mt.map || null;
      mt.emissiveIntensity = 1.3;
      mt.needsUpdate = true;
      return;
    }
    if (o.userData.tooth) return;
    if (!mt.userData.beastShade) {
      mt.color.multiply(shade);
      mt.userData.beastShade = true;
    }
    // real scales: the normal map over the skin, finer along a body than around it
    if (!mt.normalMap && (mt.map || mt.userData.sculpted)) {
      mt.normalMap = scaleNormalMap(detail);
      if (mt.userData.sculpted) {
        // the sculpt wraps its UV round the body (u) and up it (v = height / 2.4)
        mt.normalMap = mt.normalMap.clone();
        mt.normalMap.repeat.set(7, 5);
        mt.normalMap.needsUpdate = true;
      } else mt.normalMap.repeat.set(a.upright ? 2 : 4, a.upright ? 1 : 1.5);
      mt.normalScale = new T.Vector2(0.75, 0.75);
      mt.needsUpdate = true;
    }
    inject(mt, U, true);
  });
  const aura = makeAura(a, look, detail);
  if (aura) m.add(aura);
  const state = {
    look,
    update(t) {
      U.uBeastT.value = t;
      if (aura) aura.userData.auraU.uT.value = t;
      for (const s of sway) {
        if (s.pulse) s.pulse.emissiveIntensity = s.base + Math.sin(t * s.speed) * s.amp;
        else if (s.obj) {
          s.obj.rotation.x = Math.sin(t * s.speed + s.phase) * s.ax;
          s.obj.rotation.z = Math.cos(t * s.speed * 0.8 + s.phase) * s.az;
        } else if (s.ribbon) {
          const p = s.ribbon.geometry.attributes.position,
            b = s.base;
          for (let i = 0; i < p.count; i++) {
            const v = -b[i * 3 + 1] / s.L; // 0 at the root, 1 at the tip
            p.array[i * 3] = b[i * 3] + Math.sin(t * 2.1 + v * 4 + s.phase) * 0.09 * v;
            p.array[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 1.7 + v * 3.2 + s.phase) * 0.12 * v * v;
          }
          p.needsUpdate = true;
        }
      }
    }
  };
  m.userData.beastLook = state;
  return state;
}
