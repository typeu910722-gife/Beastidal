// 0.43: the land up close. Two things the basin lacked when you stood on it:
//  · dressTerrain — the terrain's one grain texture covers the whole map (a texel is ~2 m), so up close the ground
//    was a smear of vertex colour. The shader now paints it by height and slope, at the scale of your feet: sand on
//    the beaches (darker where the waves wet it), grass on the flats, bare rock on the slopes and cliffs, snow on the
//    high ridges — each with its own fine detail and its relief lit by a bump from the same noise. The sketch's
//    vertex colours still tint it region by region. No image files: it is all noise in the shader.
//  · GrassField — a meadow around you: tens of thousands of blades (and some wild flowers) on the dry, gentle
//    ground near the player, swaying in the wind, parting where you walk and thinning out into the distance. It
//    is built in 16 m tiles placed on a world-fixed grid (so it never shifts under you), a couple of tiles a frame.
import * as T from './vendor/three.module.min.js';
import { groundAt, slopeAt } from './lake.js?v=0.77.0';

const NOISE = `
float tl_h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float tl_n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(tl_h(i),tl_h(i+vec2(1.,0.)),f.x),mix(tl_h(i+vec2(0.,1.)),tl_h(i+1.),f.x),f.y);}
// w: the pixel's footprint in p's units — an octave finer than a pixel fades to its mean instead of shimmering
float tl_fbm(vec2 p,int oct,float w){float s=0.,a=.5;for(int i=0;i<5;i++){if(i>=oct)break;
 float k=clamp(1.6-w*2.2,0.,1.);s+=a*mix(.5,tl_n(p),k);p=p*2.03+17.17;w*=2.03;a*=.5;}return s;}
`;

// detail: number of noise octaves (0 leaves the material untouched — the low quality setting)
export function dressTerrain(material, detail = 4) {
  if (!detail) return material;
  material.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 tlPos;varying vec3 tlNrm;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\ntlPos=(modelMatrix*vec4(transformed,1.)).xyz;tlNrm=normalize(mat3(modelMatrix)*objectNormal);'
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 tlPos;varying vec3 tlNrm;float tlRough=-1.;float tlBump=0.;\n${NOISE}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
 {
  int oct=${detail};
  vec2 p=tlPos.xz;float y=tlPos.y;float up=clamp(tlNrm.y,0.,1.);
  // fade the finest detail with distance so it never shimmers
  float far=clamp(length(vViewPosition)/140.,0.,1.);
  // on steep ground the noise runs along the face (across it and up it), so cliffs are not streaked
  vec2 tng=normalize(vec2(-tlNrm.z,tlNrm.x)+1e-4);
  vec2 wall=vec2(dot(tlPos.xz,tng),y);
  float flt=smoothstep(.45,.8,up);
  float fw=length(fwidth(tlPos));                                      // metres per pixel here
  float big=tl_fbm(p*.045,3,fw*.045);                                  // patches tens of metres across
  float mid=tl_fbm(p*.35,oct,fw*.35),fine=tl_fbm(p*2.6,oct,fw*2.6);    // clumps and stones · under your feet
  if(flt<1.){mid=mix(tl_fbm(wall*.35,oct,fw*.35),mid,flt);fine=mix(tl_fbm(wall*2.6,oct,fw*2.6),fine,flt);}
  fine=mix(.5,fine,1.-far);
  float rk=tl_fbm(vec2(dot(tlPos.xz,tng)*.25,y*1.6),oct,fw*1.6);       // rock strata, level bands along the face
  // how much of each: beach, grass, rock, snow
  float sandW=1.-smoothstep(1.1,2.4+big*1.2,y);
  float rockW=smoothstep(.86,.66,up+mid*.08)+smoothstep(55.,95.,y)*.6;
  float snowW=smoothstep(150.,190.,y+big*30.)*smoothstep(.55,.8,up);
  rockW=clamp(rockW,0.,1.);
  vec3 grass=mix(vec3(.055,.105,.03),vec3(.15,.2,.055),mid);
  grass=mix(grass,vec3(.2,.17,.075),smoothstep(.55,.75,big)*.7);     // drier, straw-coloured patches
  grass*=.82+fine*.36;
  vec3 sand=mix(vec3(.36,.3,.19),vec3(.5,.42,.27),fine);
  float wet=1.-smoothstep(.15,.9,y);                                 // the band the waves reach
  sand=mix(sand,sand*.5,wet);
  vec3 rock=mix(vec3(.12,.115,.105),vec3(.27,.25,.22),rk)*(.8+fine*.4);
  rock=mix(rock,rock*vec3(.85,.95,.8),smoothstep(.5,.8,mid)*up);     // a little moss where it is flatter
  vec3 snow=vec3(.78,.82,.88)*(.92+fine*.1);
  vec3 col=grass;
  col=mix(col,sand,sandW);
  col=mix(col,rock,rockW);
  col=mix(col,snow,snowW);
  // under water, only the bed's fine relief (the lake shader colours it)
  float dry=smoothstep(-1.5,.2,y);
  // (on dry land the old map-wide grain texture is left out: stretched at grazing angles it streaked)
  vec3 base=mix(diffuseColor.rgb,vColor.rgb,dry);
  diffuseColor.rgb=mix(base,col*(.55+.9*dot(vColor.rgb,vec3(.333))),.72*dry);
  diffuseColor.rgb*=mix(1.,.86+fine*.28,1.-dry);
  tlRough=mix(mix(.95,.98,rockW),.55,wet*sandW)-snowW*.25;
  // (relief on the rock only: on the flats it streaked at grazing angles, and the meadow covers them anyway)
  tlBump=(rk*.16+mid*.06)*rockW;
  // relief only where a pixel is small enough to show it: at grazing angles and far off its derivatives turn to
  // streaks, so it fades out there
  tlBump*=clamp(1.-fw*3.,0.,1.)*(1.-far);
 }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nif(tlRough>=0.)roughnessFactor=tlRough;'
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
 {
  vec3 dpx=dFdx(-vViewPosition),dpy=dFdy(-vViewPosition);
  float dhx=dFdx(tlBump),dhy=dFdy(tlBump);
  vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);
  float det=dot(dpx,r1);
  vec3 g=sign(det)*(dhx*r1+dhy*r2);
  normal=normalize(abs(det)*normal-g*.8);
 }`
      );
  };
  material.customProgramCacheKey = () => 'terrain-look-' + detail;
  material.needsUpdate = true;
  return material;
}

// ---------- the meadow ----------
export const GRASS = { tile: 16, cell: 0.26, radius: 38 };
const hash = (a, b, k = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(k + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// where grass grows: dry ground above the beach, not a cliff, below the bare heights
export function grassy(x, z) {
  const y = groundAt(x, z);
  return y > 1.5 && y < 70 && slopeAt(x, z, 0.8) < 0.55 ? y : null;
}
function bladeGeo() {
  // a tapered, slightly curved blade: 3 segments, both faces lit like the ground (normals up)
  const pos = [],
    nor = [],
    uv = [],
    idx = [];
  const seg = 3;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg,
      w = 0.028 * (1 - t * 0.9),
      bend = t * t * 0.22;
    pos.push(-w, t, bend, w, t, bend);
    nor.push(0, 1, 0.3, 0, 1, 0.3);
    uv.push(0, t, 1, t);
    if (i < seg) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function flowerGeo() {
  // a thin stem and a small four-petal head facing up; uv.y marks the head (1) from the stem (0)
  const pos = [],
    uv = [],
    idx = [];
  pos.push(-0.012, 0, 0, 0.012, 0, 0, -0.012, 0.42, 0, 0.012, 0.42, 0);
  uv.push(0, 0, 0, 0, 0, 0, 0, 0);
  idx.push(0, 1, 2, 1, 3, 2);
  const c = 4,
    r = 0.07;
  pos.push(0, 0.43, 0);
  uv.push(1, 1);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2,
      rr = k % 2 ? r * 0.45 : r;
    pos.push(Math.cos(a) * rr, 0.42 + (k % 2 ? 0.01 : -0.01), Math.sin(a) * rr);
    uv.push(1, 1);
  }
  for (let k = 0; k < 8; k++) idx.push(c, c + 1 + k, c + 1 + ((k + 1) % 8));
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// wind, the player's wake through the grass and the fade at the edge of the meadow, in the vertex shader
function swayMaterial(base, flower) {
  const u = {
    uTime: { value: 0 },
    uWind: { value: 0.35 },
    uCenter: { value: new T.Vector3() },
    uRadius: { value: 50 }
  };
  base.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;uniform float uWind;uniform vec3 uCenter;uniform float uRadius;varying float gTip;'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
 {
  vec3 root=vec3(instanceMatrix[3][0],instanceMatrix[3][1],instanceMatrix[3][2]);
  float t=${flower ? 'clamp(position.y/.42,0.,1.)' : 'uv.y'};
  gTip=t;
  float d=length(root.xz-uCenter.xz);
  // thin out toward the edge: blades shrink into the ground rather than pop
  float keep=1.-smoothstep(uRadius*.62,uRadius,d);
  transformed*=keep;
  // gusts roll across the meadow
  float ph=dot(root.xz,vec2(.13,.09))-uTime*1.7;
  float gust=sin(ph)*.6+sin(ph*2.3+1.7)*.25+sin(uTime*3.1+root.x*.7)*.15;
  vec2 sway=vec2(.8,.5)*gust*uWind*t*t;
  // pressed aside where you walk
  vec2 away=root.xz-uCenter.xz;float near=1.-smoothstep(.4,1.6,d);
  sway+=normalize(away+1e-4)*near*.9*t;
  transformed.y-=near*.35*t;
  // (the sway is in world space; undo the instance's rotation and scale)
  mat3 r=mat3(instanceMatrix);
  transformed+=inverse(r)*vec3(sway.x,0.,sway.y)*keep;
 }`
      );
    // 0.57: light the blades like the ground they grow from — normals tilted up, and the same on both faces —
    // so a meadow at noon is green, not a field of black spikes wherever a blade turns its back to the sun
    sh.vertexShader = sh.vertexShader.replace(
      '#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\nobjectNormal=normalize(mix(objectNormal,inverse(mat3(instanceMatrix))*vec3(0.,1.,0.),.8));'
    );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <normal_fragment_begin>',
        T.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0')
      )
      .replace('#include <common>', '#include <common>\nvarying float gTip;')
      .replace(
        '#include <color_fragment>',
        flower
          ? '#include <color_fragment>\ndiffuseColor.rgb=mix(vec3(.05,.1,.03),diffuseColor.rgb,step(.97,gTip));'
          : '#include <color_fragment>\ndiffuseColor.rgb*=mix(.45,1.25,gTip*gTip);'
      );
  };
  base.customProgramCacheKey = () => (flower ? 'meadow-flower-2' : 'meadow-blade-2');
  base.userData.sway = u;
  return base;
}

export class GrassField {
  // density: blades per grid cell taken (1 = every cell); 0 turns the meadow off
  constructor(scene, density = 1) {
    this.density = density;
    this.group = new T.Group();
    this.group.name = 'meadow';
    scene.add(this.group);
    this.tiles = new Map();
    if (!density) return;
    this.blade = bladeGeo();
    this.flower = flowerGeo();
    this.bladeMat = swayMaterial(new T.MeshStandardMaterial({ roughness: 0.85, side: T.DoubleSide }), false);
    this.flowerMat = swayMaterial(new T.MeshStandardMaterial({ roughness: 0.7, side: T.DoubleSide }), true);
    this.dm = new T.Object3D();
    this.c = new T.Color();
  }
  buildTile(tx, tz) {
    const { tile } = GRASS,
      n = Math.round(tile / GRASS.cell),
      cell = tile / n,
      blades = [],
      flowers = [];
    // the tile's ground on a 1 m grid (cheap to read back) instead of a terrain lookup per blade
    const N = tile + 3,
      hx = tx * tile - 1,
      hz = tz * tile - 1,
      H = new Float32Array(N * N);
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) H[b * N + a] = groundAt(hx + a, hz + b);
    const at = (x, z) => {
      const fx = x - hx,
        fz = z - hz,
        a = Math.min(N - 2, Math.floor(fx)),
        b = Math.min(N - 2, Math.floor(fz)),
        u = fx - a,
        v = fz - b,
        i = b * N + a;
      return (H[i] * (1 - u) + H[i + 1] * u) * (1 - v) + (H[i + N] * (1 - u) + H[i + N + 1] * u) * v;
    };
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const gx = tx * n + i,
          gz = tz * n + j;
        if (hash(gx, gz, 1) > this.density) continue;
        const x = (gx + hash(gx, gz, 2)) * cell,
          z = (gz + hash(gx, gz, 3)) * cell,
          y = at(x, z);
        if (y < 1.5 || y > 70) continue;
        if (Math.hypot(at(x + 0.8, z) - at(x - 0.8, z), at(x, z + 0.8) - at(x, z - 0.8)) / 1.6 > 0.55) continue;
        // bare patches and denser clumps, so it is a meadow and not a lawn
        const clump = Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * Math.sin(z * 0.17 + Math.sin(x * 0.11) * 2);
        if (clump < -0.55 && hash(gx, gz, 4) < 0.7) continue;
        (hash(gx, gz, 5) < 0.035 ? flowers : blades).push([x, y, z, gx, gz]);
      }
    const g = new T.Group();
    const put = (list, geo, mat, colour, size) => {
      if (!list.length) return;
      const m = new T.InstancedMesh(geo, mat, list.length);
      m.receiveShadow = true;
      m.frustumCulled = true;
      list.forEach(([x, y, z, gx, gz], k) => {
        this.dm.position.set(x, y - 0.05, z);
        this.dm.rotation.set(0, hash(gx, gz, 6) * Math.PI * 2, 0);
        this.dm.scale.setScalar(size(gx, gz));
        this.dm.updateMatrix();
        m.setMatrixAt(k, this.dm.matrix);
        m.setColorAt(k, colour(gx, gz, this.c));
      });
      m.computeBoundingSphere();
      g.add(m);
    };
    put(
      blades,
      this.blade,
      this.bladeMat,
      (a, b, c) => {
        const v = hash(a, b, 7),
          dry = Math.max(0, Math.sin(a * 0.031 + b * 0.017) * 1.4 - 0.5);
        return c.setRGB(0.045 + v * 0.04 + dry * 0.12, 0.09 + v * 0.06 + dry * 0.04, 0.022 + v * 0.015);
      },
      (a, b) => 0.32 + hash(a, b, 8) * hash(a, b, 11) * 0.7
    );
    const PETALS = [
      [0.9, 0.88, 0.8],
      [0.95, 0.78, 0.22],
      [0.62, 0.42, 0.85],
      [0.9, 0.45, 0.5]
    ];
    put(
      flowers,
      this.flower,
      this.flowerMat,
      (a, b, c) => c.setRGB(...PETALS[Math.floor(hash(a, b, 9) * PETALS.length)]),
      (a, b) => 0.8 + hash(a, b, 10) * 0.6
    );
    return g;
  }
  // center: where the camera stands; show: false in the cabin, the cave, menus
  update(dt, center, time, wind, show = true) {
    if (!this.density) return;
    this.group.visible = show;
    if (!show) return;
    for (const m of [this.bladeMat, this.flowerMat]) {
      const u = m.userData.sway;
      u.uTime.value = time;
      u.uWind.value = wind;
      u.uCenter.value.copy(center);
      u.uRadius.value = GRASS.radius;
    }
    const { tile, radius } = GRASS,
      cx = Math.floor(center.x / tile),
      cz = Math.floor(center.z / tile),
      R = Math.ceil(radius / tile);
    // keep the tiles in range; build the nearest missing ones, about 3 ms of work a frame
    const want = [];
    for (let i = -R; i <= R; i++)
      for (let j = -R; j <= R; j++) {
        const x0 = (cx + i) * tile,
          z0 = (cz + j) * tile,
          dx = Math.max(x0 - center.x, 0, center.x - x0 - tile),
          dz = Math.max(z0 - center.z, 0, center.z - z0 - tile);
        if (Math.hypot(dx, dz) < radius) want.push([cx + i, cz + j, Math.hypot(dx, dz)]);
      }
    const keys = new Set(want.map(([a, b]) => a + ',' + b));
    for (const [k, g] of this.tiles)
      if (!keys.has(k)) {
        this.group.remove(g);
        g.children.forEach(m => m.dispose());
        this.tiles.delete(k);
      }
    want.sort((a, b) => a[2] - b[2]);
    const t0 = performance.now();
    for (const [a, b] of want) {
      const k = a + ',' + b;
      if (this.tiles.has(k)) continue;
      const g = this.buildTile(a, b);
      this.tiles.set(k, g);
      this.group.add(g);
      if (performance.now() - t0 > 3) break;
    }
  }
  get count() {
    let n = 0;
    for (const g of this.tiles.values()) for (const m of g.children) n += m.count;
    return n;
  }
}
