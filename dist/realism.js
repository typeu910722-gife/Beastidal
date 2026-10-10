// Realistic atmosphere: physically-inspired sky, Gerstner ocean, moving sun, image-based lighting and quality presets.
import * as T from './vendor/three.module.min.js';
import { groundTexture } from './lake-models.js?v=0.17.0';
import { WAVE_SET, WAVE_TIME } from './physics.js?v=0.17.0';
export const TRAIL = 40,
  SPLASHES = 4;

export const QUALITY = {
  high: {
    label: '寫實',
    octaves: 5,
    pixelRatio: 2,
    shadow: 4096,
    soft: true,
    rings: 150,
    segments: 192,
    envSize: 256,
    envEvery: 1.5
  },
  balanced: {
    label: '平衡',
    octaves: 4,
    pixelRatio: 1.5,
    shadow: 2048,
    soft: true,
    rings: 110,
    segments: 144,
    envSize: 128,
    envEvery: 3
  },
  low: {
    label: '效能',
    octaves: 3,
    pixelRatio: 1,
    shadow: 1024,
    soft: false,
    rings: 70,
    segments: 96,
    envSize: 64,
    envEvery: 6
  }
};
const SETTINGS_KEY = 'beastidal-settings-v1';
export function loadSettings(mobile) {
  let s = {};
  try {
    s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
  } catch {}
  if (!QUALITY[s.quality]) s.quality = mobile ? 'balanced' : 'high';
  return s;
}
export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// Day/night phase (0..1 over the day, see clock.js) -> sun direction, aligned with the HUD clock
// (phase 0 = 06:30, sunrise 06:00, noon 12:00, sunset 18:00). The sun rises in the east (+x).
export function sunAt(phase) {
  const hours = 6.5 + phase * 24,
    a = ((hours - 6) / 24) * Math.PI * 2;
  return new T.Vector3(Math.cos(a), Math.sin(a) * 0.95, -0.42).normalize();
}
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function dayAmount(sun) {
  return smooth(-0.18, 0.12, sun.y);
}
// JS mirror of the shader's horizon radiance; used for fog so meshes melt into the sky.
export function horizonColor(sun, storm, out = new T.Color()) {
  const day = dayAmount(sun),
    golden = Math.exp(-Math.abs(sun.y - 0.02) * 9) * 0.22;
  const r = 0.012 + (0.34 - 0.012) * day,
    g = 0.02 + (0.41 - 0.02) * day,
    b = 0.03 + (0.4 - 0.03) * day;
  out.setRGB(
    r + (0.8 * Math.max(day, 0.25) - r) * golden,
    g + (0.4 * Math.max(day, 0.25) - g) * golden,
    b + (0.26 * Math.max(day, 0.25) - b) * golden
  );
  const grey = (0.15 + 0.85 * day) * storm * 0.8;
  out.r = out.r * (1 - storm * 0.8) + 0.2 * grey;
  out.g = out.g * (1 - storm * 0.8) + 0.23 * grey;
  out.b = out.b * (1 - storm * 0.8) + 0.25 * grey;
  return out;
}

// An overcast, slightly sickly sky with the alien rift: a jagged tear of violet light low in the north-east.
// The rift lives in skyRadiance so the sea reflects it and image-based lighting picks up its glow.
const SKY_GLSL = `
uniform vec3 uSunDir;uniform float uStorm;
#ifndef RIFT_GAIN
#define RIFT_GAIN 1.
#endif
// rgb: light added to the sky; a: how much of the dark interior covers the sky behind it
vec4 riftLight(vec3 dir){
 float az=atan(dir.x,dir.z),el=asin(clamp(dir.y,-1.,1.));float u=(az-2.05)/.75;
 if(u<=0.||u>=1.)return vec4(0.);
 // a lens-shaped tear: bright ragged lips, a dark violet interior that slowly churns
 float line=.04+.17*u+.008*sin(u*7.+.4)+.003*sin(u*29.+1.3);
 float hw=.03*pow(sin(u*3.14159),1.4)*(1.+.25*sin(u*41.+uTime*.3)),d=abs(el-line);
 float inside=1.-smoothstep(hw*.55,hw,d);float lip=exp(-pow((d-hw*.85)/(.0015+hw*.18),2.));
 float swirl=.5+.5*sin(u*60.+el*300.+uTime*.8)*sin(u*17.-uTime*.5);
 float pulse=.85+.15*sin(uTime*1.3+u*4.);
 vec3 c=mix(vec3(.05,.01,.1),vec3(.4,.16,.7),swirl*swirl)*inside*1.4;
 c+=vec3(.95,.75,1.)*lip*2.2*pulse;
 c+=vec3(.35,.4,.9)*exp(-d*30.)*.14*sin(u*3.14159)+vec3(.2,.65,.7)*exp(-d*90.)*.18;
 return vec4(c,inside*.92);
}
vec3 skyRadiance(vec3 dir){
 vec3 s=uSunDir;float day=smoothstep(-.18,.12,s.y);float y=max(dir.y,0.);
 vec3 zen=mix(vec3(.003,.006,.012),vec3(.045,.10,.15),day),hor=mix(vec3(.012,.02,.03),vec3(.34,.41,.40),day);
 float golden=exp(-abs(s.y-.02)*9.);vec2 dh=normalize(dir.xz+1e-4),sh=normalize(s.xz+1e-4);float toward=pow(max(dot(dh,sh)*.5+.5,0.),3.);
 hor=mix(hor,vec3(.85,.38,.22)*max(day,.25),golden*toward*.8);zen=mix(zen,zen*vec3(1.,.72,.8),golden*.4);
 vec3 col=mix(hor,zen,pow(y,.55));float mu=max(dot(dir,s),0.);
 col+=vec3(1.,.8,.56)*(pow(mu,6.)*.22+pow(mu,64.)*1.1)*day*(1.-uStorm*.85);
 vec4 rift=riftLight(dir)*RIFT_GAIN*(1.-uStorm*.6);col=col*(1.-rift.a)+rift.rgb*(.6+.4*(1.-day));
 return mix(col,vec3(.2,.23,.25)*(.15+.85*day),uStorm*.8);
}`;
const NOISE_GLSL = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
#ifndef OCTAVES
#define OCTAVES 5
#endif
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<OCTAVES;i++){v+=noise(p)*a;p=p*2.03+vec2(17.3,9.1);a*=.5;}return v;}`;

export function makeSky(quality = QUALITY.high) {
  return new T.Mesh(
    new T.SphereGeometry(900, 48, 24),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      defines: { OCTAVES: quality.octaves },
      uniforms: {
        uSunDir: { value: new T.Vector3(0, 1, 0) },
        uStorm: { value: 0 },
        uTime: { value: 0 },
        uNight: { value: 0 },
        uFog: { value: new T.Color() }
      },
      vertexShader:
        'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uTime;uniform float uNight;uniform vec3 uFog;varying vec3 vP;${SKY_GLSL}${NOISE_GLSL}
 void main(){vec3 dir=normalize(vP);vec3 col=skyRadiance(dir);float day=smoothstep(-.18,.12,uSunDir.y);float mu=dot(dir,uSunDir);
  col+=vec3(28.,24.,18.)*smoothstep(.99955,.99975,mu)*day*(1.-uStorm*.9);
  vec3 moon=-uSunDir;col+=vec3(.9,.95,1.)*smoothstep(.9996,.9998,dot(dir,moon))*(1.-day)*(1.-uStorm);
  vec3 moon2=normalize(vec3(-moon.z,moon.y*.6+.25,moon.x));col+=vec3(1.,.55,.45)*smoothstep(.99985,.99992,dot(dir,moon2))*(1.-day)*(1.-uStorm)*.7;
  // a huge pale planet hangs in the south-west, visible by day; banded, lit from the sun's side
  vec3 P=normalize(vec3(-.62,.30,.72));float R=.11;vec3 tx=normalize(cross(P,vec3(0.,1.,0.))),ty=cross(tx,P);
  vec2 q=vec2(dot(dir,tx),dot(dir,ty))/R;float r2=dot(q,q);
  if(dot(dir,P)>0.&&r2<1.4){vec3 n=normalize(tx*q.x+ty*q.y-P*sqrt(max(1.-r2,0.)));float lit=smoothstep(-.15,.35,dot(n,uSunDir));
   float band=.5+.5*sin(q.y*11.+fbm(q*3.)*3.);vec3 pc=mix(vec3(.42,.40,.46),vec3(.62,.58,.56),band)*(.06+.94*lit);
   float disc=smoothstep(1.,.97,r2);col=mix(col,pc*(.55+.45*day),disc*(1.-uStorm*.85)*.85);
   col+=vec3(.35,.45,.6)*smoothstep(1.4,1.,r2)*(1.-disc)*.12*(1.-uStorm);
  }
  float h=dir.y;vec2 uv=dir.xz/(max(.06,h)*1.4)+vec2(uTime*.004,uTime*.0015);
  float cov=mix(.44,.24,uStorm);float n=fbm(uv*.7);float c=smoothstep(cov,cov+.3,n)*smoothstep(.0,.18,h);
  float lit=.45+.55*pow(max(mu,0.),3.);float under=smoothstep(cov+.1,cov+.45,n);
  vec3 cloud=mix(vec3(.015,.02,.03),mix(vec3(.6,.62,.6),vec3(.26,.29,.3),under)*lit,day);cloud=mix(cloud,vec3(.13,.15,.17)*(.2+.8*day),uStorm);
  cloud+=riftLight(normalize(dir+vec3(0.,-.05,0.))).rgb*.18;
  float golden=exp(-abs(uSunDir.y-.02)*9.);cloud=mix(cloud,cloud*vec3(1.3,.75,.5),golden*.6);col=mix(col,cloud,c*.85);
  float stars=step(.9975,hash(floor(dir.xz/(h+.3)*420.)))*smoothstep(.05,.3,h)*(1.-day)*(1.-c)*(1.-uStorm);col+=stars*.8;
  col=mix(uFog,col,smoothstep(-.02,.16,h));
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`
    })
  );
}

// Concentric ring grid: dense near the camera, sparse at the horizon. Re-centred every frame.
function oceanGeometry(rings, segments) {
  const pos = [0, 0, 0],
    idx = [];
  for (let i = 1; i <= rings; i++) {
    const r = 1600 * Math.pow(i / rings, 2.3) + i * 0.05;
    for (let j = 0; j < segments; j++) {
      const a = ((j + (i % 2) * 0.5) / segments) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let j = 0; j < segments; j++) idx.push(0, 1 + ((j + 1) % segments), 1 + j);
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < segments; j++) {
      const a = 1 + i * segments + j,
        b = 1 + i * segments + ((j + 1) % segments),
        c = a + segments,
        d = b + segments;
      idx.push(a, b, c, b, d, c);
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  g.boundingSphere.radius = 1e5;
  return g;
}

// Generated from physics.js so boats and debris float on exactly this swell.
const WAVES = `
const int NW=${WAVE_SET.length};
vec4 W[NW];
void setupWaves(){${WAVE_SET.map((w, i) => `W[${i}]=vec4(${w.map(v => v.toFixed(4)).join(',')});`).join('')}}
`;
const waterVertex = `uniform float uTime;uniform float uStorm;uniform vec4 uHome;uniform sampler2D uGround;uniform vec4 uGroundBox;varying vec3 vWorld;varying vec3 vNormalW;varying float vCrest;
${WAVES}
void main(){setupWaves();vec3 p=(modelMatrix*vec4(position,1.)).xyz;vec2 g=p.xz;
 vec2 hd=abs(g-uHome.xy)-uHome.zw;float calm=mix(.45,1.,smoothstep(0.,14.,length(max(hd,0.))));
 float gh=texture2D(uGround,(g-uGroundBox.xy)*uGroundBox.zw).r;calm*=mix(.18,1.,smoothstep(-.3,-7.,gh));float amp=calm*(1.+uStorm*1.6);vec3 t=vec3(1.,0.,0.),b=vec3(0.,0.,1.);vec3 off=vec3(0.);float crest=0.;
 for(int i=0;i<NW;i++){vec4 w=W[i];float k=6.28318/w.w,c=sqrt(9.8/k);vec2 d=normalize(w.xy);float f=k*(dot(d,g)-c*uTime*${WAVE_TIME.toFixed(4)});float st=w.z*amp,a=st/k;float sf=sin(f),cf=cos(f);
  off+=vec3(d.x*a*cf,a*sf,d.y*a*cf);t+=vec3(-d.x*d.x*st*sf,d.x*st*cf,-d.x*d.y*st*sf);b+=vec3(-d.x*d.y*st*sf,d.y*st*cf,-d.y*d.y*st*sf);crest+=sf*st;}
 float fade=1.-smoothstep(160.,520.,length(p.xz-cameraPosition.xz));p+=off*fade;vWorld=p;vNormalW=normalize(cross(b,t));vCrest=crest/(amp*.215)*fade;
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
const waterFrag = `uniform float uTime;uniform float uNight;uniform vec3 uBoat;uniform float uHeading;uniform float uSpeed;uniform vec4 uHome;uniform vec3 uFog;uniform float uFogDensity;uniform sampler2D uGround;uniform vec4 uGroundBox;uniform float uSunPower;uniform vec4 uTrail[${TRAIL}];uniform vec4 uSplash[${SPLASHES}];uniform vec2 uHull;
varying vec3 vWorld;varying vec3 vNormalW;varying float vCrest;
${SKY_GLSL}${NOISE_GLSL}
float rh(vec2 p,float t){return fbm(p*.55+vec2(t*.21,t*.13))*.6+noise(p*1.9-vec2(t*.33,-t*.27))*.4;}
vec2 ripple(vec2 p,float t){float e=.12,h=rh(p,t);return vec2(rh(p+vec2(e,0.),t)-h,rh(p+vec2(0.,e),t)-h)/e;}
// Wake from the recorded hull trail. Each trail point radiates a ring whose radius grows at ~0.36x the hull speed,
// so the envelope of the rings opens at asin(.36) ~ 21 deg (Kelvin angle); right behind the hull is churned prop wash.
float wakeField(vec2 p,inout vec2 nOff){float foam=0.,rings=0.;
 for(int i=0;i<${TRAIL};i++){vec4 tr=uTrail[i];if(tr.w<=0.)break;float age=uTime-tr.z;if(age<0.||age>9.)continue;
  vec2 dir=vec2(sin(uHeading),cos(uHeading));if(i>0){vec2 dd=uTrail[i-1].xy-tr.xy;float l=length(dd);if(l>1e-3)dir=dd/l;}
  vec2 rel=p-tr.xy;float d=length(rel)+1e-4;float life=1.-age/9.;float v=min(tr.w,12.);
  float w0=.45+age*.24;float wash=exp(-d*d/(w0*w0))*life*life*min(1.,v*.3);
  float r=.36*v*age,sideAmt=abs(dir.x*rel.y-dir.y*rel.x)/d;
  float ring=exp(-pow((d-r)/(.22+age*.06),2.))*life*min(1.,v*.22)*smoothstep(0.,.3,age)*sideAmt;
  rings+=ring;foam=max(foam,wash*.85);nOff+=rel/d*sin((d-r)*7.)*ring*.12;}
 // Crests pile up only along the envelope (the two Kelvin arms); inside the V they stay as faint transverse ripples.
 foam=max(foam,smoothstep(1.1,3.,rings)*.55);
 vec2 fw=vec2(sin(uHeading),cos(uHeading)),rel=p-uBoat.xz-fw*uHull.x;float bow=exp(-dot(rel,rel)/(uHull.y*uHull.y))*min(1.,uSpeed*.18);foam=max(foam,bow);
 for(int i=0;i<${SPLASHES};i++){vec4 sp=uSplash[i];if(sp.w<=0.)continue;float age=uTime-sp.z;if(age<0.||age>4.)continue;vec2 rl=p-sp.xy;float d=length(rl)+1e-4;float r1=age*3.4,r2=age*2.1;
  float ring=(exp(-pow((d-r1)/.3,2.))+.6*exp(-pow((d-r2)/.25,2.)))*exp(-age*1.1)*sp.w;float core=exp(-d*d/(.7+age))*exp(-age*2.2)*sp.w;
  foam=max(foam,max(ring*.65,core));nOff+=rl/d*sin((d-r1)*9.)*ring*.6;}
 return foam;}
void main(){
 vec3 V=cameraPosition-vWorld;float dist=length(V);V/=dist;vec2 p=vWorld.xz;
 float detail=1.-smoothstep(25.,180.,dist);vec2 rp=ripple(p,uTime)*detail*mix(.22,.4,uStorm);
 vec2 wn=vec2(0.);float wake=dist<160.?wakeField(p,wn):0.;
 vec3 n=normalize(vNormalW+vec3(-rp.x-wn.x,0.,-rp.y-wn.y));
 float NdV=max(dot(n,V),0.);float F=.02+.98*pow(1.-NdV,5.);
 vec3 R=reflect(-V,n);R.y=max(R.y,.015);vec3 refl=skyRadiance(normalize(R));
 float day=smoothstep(-.18,.12,uSunDir.y);vec3 deep=vec3(.001,.009,.014),shallow=vec3(.012,.10,.092);
 float gh=texture2D(uGround,(p-uGroundBox.xy)*uGroundBox.zw).r;float sh=1.-smoothstep(.3,16.,-gh);
 vec2 hd=abs(p-uHome.xy)-uHome.zw;float homeD=length(max(hd,0.));sh=max(sh,(1.-smoothstep(0.,6.,homeD))*.35);
 vec3 L=normalize(uSunDir.y>-.05?uSunDir:-uSunDir);float sunlit=max(L.y,0.)*mix(.08,1.,day);
 vec3 body=mix(deep,shallow,sh)*(.25+.75*sunlit)+vec3(.004,.014,.022)*(1.-day);
 float cr=max(vCrest,0.)*.15;float sss=pow(max(dot(V,-L),0.),4.)*cr*1.6+cr*.35;body+=vec3(.02,.12,.085)*sss*sunlit;
 vec3 col=mix(body,refl,F);
 vec3 H=normalize(L+V);float NdH=max(dot(n,H),0.);float rough=mix(.05,.12,uStorm);float a2=rough*rough;float dd=NdH*NdH*(a2-1.)+1.;float ggx=a2/(3.14159*dd*dd);
 vec3 sunCol=mix(vec3(.25,.32,.5)*.12,mix(vec3(1.,.55,.3),vec3(1.,.93,.82),smoothstep(.0,.35,uSunDir.y)),day);
 col+=sunCol*min(ggx,400.)*F*uSunPower*max(dot(n,L),0.)*.35*(1.-uStorm*.8);
 float foam=smoothstep(.6,.9,vCrest)*smoothstep(.5,.8,noise(p*2.3+uTime*.5))*(.25+uStorm);
 float surf=-gh-.25-.35*sin(uTime*1.3+p.x*.4+p.y*.3);foam+=(1.-smoothstep(0.,1.2,abs(surf)))*step(gh,.6)*(.45+.55*noise(p*3.+uTime));
 foam+=(1.-smoothstep(.08,.7,homeD))*step(0.,max(hd.x,hd.y))*(.35+.4*noise(p*4.+uTime*.8));
 foam+=wake*(.55+.45*noise(p*3.1+uTime*.7));
 foam=clamp(foam,0.,1.)*detail;col=mix(col,vec3(.6,.64,.6)*(.08+.92*sunlit)+refl*.15,foam*.8);
 // a huge shape gliding deep under the raft's waters every couple of minutes
 float lap=mod(uTime,140.);vec2 sc=uHome.xy+vec2(-90.+lap*1.4,30.*sin(uTime*.013)-20.);vec2 sd=(p-sc)*mat2(.94,-.34,.34,.94);
 float shade=exp(-pow(sd.x/18.,2.)-pow(sd.y/5.5,2.))+exp(-pow((sd.x+16.)/6.,2.)-pow(sd.y/2.2,2.))*.7;col*=1.-shade*.55*(1.-uStorm*.5)*smoothstep(0.,20.,lap)*smoothstep(140.,120.,lap);
 float vein=pow(1.-abs(noise(p*.08+vec2(uTime*.01,0.))*2.-1.),26.)*smoothstep(.45,.75,noise(p*.03-uTime*.004));
 col+=vec3(.1,.55,.5)*vein*(.035+.5*(1.-day))*detail*(1.-uStorm*.7);
 float glint=step(.9965,hash(floor(p*2.2+floor(uTime*.4))))*(1.-day)*detail*(1.-uStorm);col+=vec3(.15,.85,.75)*glint*.6;
 float fog=1.-exp(-dist*uFogDensity);col=mix(col,uFog,fog);
 // shallows stay clear enough to see the sand; deep water closes over the lakebed
 float clarity=mix(.6,.985,smoothstep(1.5,22.,-gh));gl_FragColor=vec4(col,mix(clarity,1.,F));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
let GROUND;
export function makeWater(quality) {
  GROUND ??= groundTexture();
  const m = new T.Mesh(
    oceanGeometry(quality.rings, quality.segments),
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      defines: { OCTAVES: quality.octaves, RIFT_GAIN: 0.22 },
      uniforms: {
        uTime: { value: 0 },
        uNight: { value: 0 },
        uStorm: { value: 0 },
        uCamera: { value: new T.Vector3() },
        uBoat: { value: new T.Vector3() },
        uHeading: { value: 0 },
        uSpeed: { value: 0 },
        uHome: { value: new T.Vector4(1.8, 1.8, 3.6, 3.6) },
        uSunDir: { value: new T.Vector3(0, 1, 0) },
        uFog: { value: new T.Color() },
        uFogDensity: { value: 0.0055 },
        uSunPower: { value: 1 },
        uGround: { value: GROUND.texture },
        uGroundBox: { value: GROUND.box },
        uTrail: { value: new Float32Array(TRAIL * 4) },
        uSplash: { value: new Float32Array(SPLASHES * 4) },
        uHull: { value: new T.Vector2(1.9, 0.9) }
      },
      vertexShader: waterVertex,
      fragmentShader: waterFrag
    })
  );
  m.frustumCulled = false;
  m.renderOrder = 1;
  return m;
}

// Tileable value-noise grain used as bump/roughness detail on sand, rock and wood.
let grain;
export function grainTexture() {
  if (grain) return grain;
  const n = 128,
    d = new Uint8Array(n * n * 4);
  let seed = 91;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const base = Array.from({ length: 32 * 32 }, r);
  const at = (x, y) => base[((y + 32) % 32) * 32 + ((x + 32) % 32)];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const fx = x / 4,
        fy = y / 4,
        ix = Math.floor(fx),
        iy = Math.floor(fy),
        tx = fx - ix,
        ty = fy - iy;
      const v =
        (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) +
        (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty;
      const g = Math.round((v * 0.6 + r() * 0.4) * 255);
      const i = (y * n + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = g;
      d[i + 3] = 255;
    }
  grain = new T.DataTexture(d, n, n, T.RGBAFormat);
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.magFilter = T.LinearFilter;
  grain.minFilter = T.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.needsUpdate = true;
  return grain;
}

const DAY_FILL = new T.Color(0.8, 0.9, 0.88),
  NIGHT_FILL = new T.Color(0.32, 0.4, 0.62);
// Drives sun light, fog, sky and image-based lighting from the game clock.
export class Atmosphere {
  constructor(world, quality) {
    this.world = world;
    this.quality = quality;
    this.sunDir = new T.Vector3(0, 1, 0);
    this.lastEnvSun = new T.Vector3(9, 9, 9);
    this.envTimer = 0;
    this.fog = new T.Color();
    this.pmrem = new T.PMREMGenerator(world.renderer);
    this.envScene = new T.Scene();
    this.envSky = makeSky(quality);
    this.envSky.scale.setScalar(0.1);
    this.envScene.add(this.envSky);
    this.envTarget = null;
    this.lastStorm = 0;
  }
  update(dt, phase, storm, anchor, env) {
    const w = this.world,
      sun = this.sunDir.copy(sunAt(phase)),
      day = dayAmount(sun);
    horizonColor(sun, storm, this.fog);
    for (const m of [w.sky.material, w.water.material, this.envSky.material]) {
      m.uniforms.uSunDir.value.copy(sun);
      m.uniforms.uStorm.value = storm;
      if (m.uniforms.uFog) m.uniforms.uFog.value.copy(this.fog);
    }
    w.water.material.uniforms.uSunPower.value = day > 0 ? Math.min(1, sun.y * 6 + 0.2) : 0.15;
    const light = sun.y > -0.05 ? sun : sun.clone().negate();
    w.sun.position.copy(anchor).addScaledVector(light, 90);
    w.sun.target.position.copy(anchor);
    w.sun.target.updateMatrixWorld();
    const warm = smooth(0, 0.4, sun.y);
    w.sun.color.setRGB(1, 0.6 + 0.3 * warm, 0.4 + 0.42 * warm);
    if (day < 0.05) w.sun.color.setRGB(0.55, 0.65, 0.9);
    w.sun.intensity = (day * 3.1 + (1 - day) * 0.55) * (1 - storm * 0.6);
    w.ambient.intensity = (0.62 + day * 0.1) * (1 - storm * 0.3);
    w.ambient.color.copy(this.fog).lerp(day > 0.3 ? DAY_FILL : NIGHT_FILL, 0.3 + 0.25 * (1 - day));
    w.ambient.groundColor.setRGB(0.03, 0.05, 0.05);
    w.scene.environmentIntensity = (0.28 + day * 0.6) * (1 - storm * 0.4);
    if (env) {
      this.envTimer -= dt;
      if (this.envTimer <= 0 && (this.lastEnvSun.distanceTo(sun) > 0.04 || Math.abs(this.lastStorm - storm) > 0.05)) {
        this.envTimer = this.quality.envEvery;
        this.lastEnvSun.copy(sun);
        this.lastStorm = storm;
        this.envSky.material.uniforms.uTime.value = w.sky.material.uniforms.uTime.value;
        const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 100, { size: this.quality.envSize });
        if (this.envTarget) this.envTarget.dispose();
        this.envTarget = rt;
        w.scene.environment = rt.texture;
      }
    }
    return { sun, day, fog: this.fog };
  }
}
