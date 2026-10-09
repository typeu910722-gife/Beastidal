// Realistic atmosphere: physically-inspired sky, Gerstner ocean, moving sun, image-based lighting and quality presets.
import * as T from './vendor/three.module.min.js';
import{ISLANDS}from'./islands.js?v=0.7';

export const QUALITY={
 high:{label:'寫實',octaves:5,pixelRatio:2,shadow:2048,soft:true,rings:150,segments:192,envSize:256,envEvery:1.5},
 balanced:{label:'平衡',octaves:4,pixelRatio:1.5,shadow:2048,soft:true,rings:110,segments:144,envSize:128,envEvery:3},
 low:{label:'效能',octaves:3,pixelRatio:1,shadow:1024,soft:false,rings:70,segments:96,envSize:64,envEvery:6}
};
const SETTINGS_KEY='beastidal-settings-v1';
export function loadSettings(mobile){let s={};try{s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}catch{}if(!QUALITY[s.quality])s.quality=mobile?'balanced':'high';return s;}
export function saveSettings(s){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch{}}

// Day/night phase (0..1 over the 480 s loop) -> sun direction, aligned with the HUD clock
// (phase 0 = 06:30, sunrise 06:00, noon 12:00, sunset 18:00). The sun rises in the east (+x).
export function sunAt(phase){const hours=6.5+phase*24,a=(hours-6)/24*Math.PI*2;return new T.Vector3(Math.cos(a),Math.sin(a)*.95,-.42).normalize();}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function dayAmount(sun){return smooth(-.18,.12,sun.y);}
// JS mirror of the shader's horizon radiance; used for fog so meshes melt into the sky.
export function horizonColor(sun,storm,out=new T.Color()){const day=dayAmount(sun),golden=Math.exp(-Math.abs(sun.y-.02)*9)*.45;const r=.015+(.55-.015)*day,g=.025+(.72-.025)*day,b=.05+(.92-.05)*day;out.setRGB(r+(1.1*Math.max(day,.25)-r)*golden,g+(.48*Math.max(day,.25)-g)*golden,b+(.18*Math.max(day,.25)-b)*golden);const grey=(.15+.85*day)*storm*.75;out.r=out.r*(1-storm*.75)+.32*grey;out.g=out.g*(1-storm*.75)+.36*grey;out.b=out.b*(1-storm*.75)+.40*grey;return out;}

const SKY_GLSL=`
uniform vec3 uSunDir;uniform float uStorm;
vec3 skyRadiance(vec3 dir){
 vec3 s=uSunDir;float day=smoothstep(-.18,.12,s.y);float y=max(dir.y,0.);
 vec3 zen=mix(vec3(.004,.008,.022),vec3(.09,.25,.62),day),hor=mix(vec3(.015,.025,.05),vec3(.55,.72,.92),day);
 float golden=exp(-abs(s.y-.02)*9.);vec2 dh=normalize(dir.xz+1e-4),sh=normalize(s.xz+1e-4);float toward=pow(max(dot(dh,sh)*.5+.5,0.),3.);
 hor=mix(hor,vec3(1.1,.48,.18)*max(day,.25),golden*toward*.9);zen=mix(zen,zen*vec3(1.,.78,.86),golden*.4);
 vec3 col=mix(hor,zen,pow(y,.5));float mu=max(dot(dir,s),0.);
 col+=vec3(1.,.78,.5)*(pow(mu,6.)*.35+pow(mu,64.)*1.4)*day*(1.-uStorm*.85);
 return mix(col,vec3(.32,.36,.40)*(.15+.85*day),uStorm*.75);
}`;
const NOISE_GLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
#ifndef OCTAVES
#define OCTAVES 5
#endif
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<OCTAVES;i++){v+=noise(p)*a;p=p*2.03+vec2(17.3,9.1);a*=.5;}return v;}`;

export function makeSky(quality=QUALITY.high){
 return new T.Mesh(new T.SphereGeometry(900,48,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,defines:{OCTAVES:quality.octaves},
  uniforms:{uSunDir:{value:new T.Vector3(0,1,0)},uStorm:{value:0},uTime:{value:0},uNight:{value:0},uFog:{value:new T.Color()}},
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform float uTime;uniform float uNight;uniform vec3 uFog;varying vec3 vP;${SKY_GLSL}${NOISE_GLSL}
 void main(){vec3 dir=normalize(vP);vec3 col=skyRadiance(dir);float day=smoothstep(-.18,.12,uSunDir.y);float mu=dot(dir,uSunDir);
  col+=vec3(28.,24.,18.)*smoothstep(.99955,.99975,mu)*day*(1.-uStorm*.9);
  vec3 moon=-uSunDir;col+=vec3(.9,.95,1.)*smoothstep(.9996,.9998,dot(dir,moon))*(1.-day)*(1.-uStorm);
  float h=dir.y;vec2 uv=dir.xz/(max(.06,h)*1.4)+vec2(uTime*.004,uTime*.0015);
  float cov=mix(.56,.30,uStorm);float c=smoothstep(cov,cov+.28,fbm(uv*.7))*smoothstep(.0,.18,h);
  float lit=.55+.45*pow(max(mu,0.),3.);vec3 cloud=mix(vec3(.02,.025,.04),vec3(.95,.93,.9)*lit,day);cloud=mix(cloud,vec3(.22,.24,.27)*(.2+.8*day),uStorm);
  float golden=exp(-abs(uSunDir.y-.02)*9.);cloud=mix(cloud,cloud*vec3(1.3,.75,.5),golden*.6);col=mix(col,cloud,c*.85);
  float stars=step(.9975,hash(floor(dir.xz/(h+.3)*420.)))*smoothstep(.05,.3,h)*(1.-day)*(1.-c)*(1.-uStorm);col+=stars*.8;
  col=mix(uFog,col,smoothstep(-.02,.16,h));
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`}));
}

// Concentric ring grid: dense near the camera, sparse at the horizon. Re-centred every frame.
function oceanGeometry(rings,segments){const pos=[0,0,0],idx=[];for(let i=1;i<=rings;i++){const r=1600*Math.pow(i/rings,2.3)+i*.05;for(let j=0;j<segments;j++){const a=(j+(i%2)*.5)/segments*Math.PI*2;pos.push(Math.cos(a)*r,0,Math.sin(a)*r);}}
 for(let j=0;j<segments;j++)idx.push(0,1+(j+1)%segments,1+j);
 for(let i=0;i<rings-1;i++)for(let j=0;j<segments;j++){const a=1+i*segments+j,b=1+i*segments+(j+1)%segments,c=a+segments,d=b+segments;idx.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeBoundingSphere();g.boundingSphere.radius=1e5;return g;}

const WAVES=`
const int NW=5;
vec4 W[NW];
void setupWaves(){W[0]=vec4(.92,.38,.055,42.);W[1]=vec4(.42,.91,.05,27.);W[2]=vec4(-.6,.8,.045,17.);W[3]=vec4(.98,-.2,.035,11.);W[4]=vec4(-.31,-.95,.03,7.5);}
`;
const waterVertex=`uniform float uTime;uniform float uStorm;uniform vec4 uHome;varying vec3 vWorld;varying vec3 vNormalW;varying float vCrest;
${WAVES}
void main(){setupWaves();vec3 p=(modelMatrix*vec4(position,1.)).xyz;vec2 g=p.xz;
 vec2 hd=abs(g-uHome.xy)-uHome.zw;float calm=mix(.45,1.,smoothstep(0.,14.,length(max(hd,0.))));
 float amp=calm*(1.+uStorm*1.6);vec3 t=vec3(1.,0.,0.),b=vec3(0.,0.,1.);vec3 off=vec3(0.);float crest=0.;
 for(int i=0;i<NW;i++){vec4 w=W[i];float k=6.28318/w.w,c=sqrt(9.8/k);vec2 d=normalize(w.xy);float f=k*(dot(d,g)-c*uTime*.55);float st=w.z*amp,a=st/k;float sf=sin(f),cf=cos(f);
  off+=vec3(d.x*a*cf,a*sf,d.y*a*cf);t+=vec3(-d.x*d.x*st*sf,d.x*st*cf,-d.x*d.y*st*sf);b+=vec3(-d.x*d.y*st*sf,d.y*st*cf,-d.y*d.y*st*sf);crest+=sf*st;}
 float fade=1.-smoothstep(160.,520.,length(p.xz-cameraPosition.xz));p+=off*fade;vWorld=p;vNormalW=normalize(cross(b,t));vCrest=crest/(amp*.215)*fade;
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
const waterFrag=`uniform float uTime;uniform float uNight;uniform vec3 uBoat;uniform float uHeading;uniform float uSpeed;uniform vec4 uHome;uniform vec3 uFog;uniform float uFogDensity;uniform vec4 uIslands[${ISLANDS.length}];uniform float uSunPower;
varying vec3 vWorld;varying vec3 vNormalW;varying float vCrest;
${SKY_GLSL}${NOISE_GLSL}
float rh(vec2 p,float t){return fbm(p*.55+vec2(t*.21,t*.13))*.6+noise(p*1.9-vec2(t*.33,-t*.27))*.4;}
vec2 ripple(vec2 p,float t){float e=.12,h=rh(p,t);return vec2(rh(p+vec2(e,0.),t)-h,rh(p+vec2(0.,e),t)-h)/e;}
void main(){
 vec3 V=cameraPosition-vWorld;float dist=length(V);V/=dist;vec2 p=vWorld.xz;
 float detail=1.-smoothstep(25.,180.,dist);vec2 rp=ripple(p,uTime)*detail*mix(.22,.4,uStorm);
 vec3 n=normalize(vNormalW+vec3(-rp.x,0.,-rp.y));
 float NdV=max(dot(n,V),0.);float F=.02+.98*pow(1.-NdV,5.);
 vec3 R=reflect(-V,n);R.y=max(R.y,.015);vec3 refl=skyRadiance(normalize(R));
 float day=smoothstep(-.18,.12,uSunDir.y);vec3 deep=vec3(.002,.018,.032),shallow=vec3(.02,.20,.19);
 float sh=0.;for(int i=0;i<${ISLANDS.length};i++){vec4 isl=uIslands[i];float e=length((p-isl.xy)/isl.zw);sh=max(sh,1.-smoothstep(1.,1.9,e));}
 vec2 hd=abs(p-uHome.xy)-uHome.zw;float homeD=length(max(hd,0.));sh=max(sh,(1.-smoothstep(0.,6.,homeD))*.35);
 vec3 L=normalize(uSunDir.y>-.05?uSunDir:-uSunDir);float sunlit=max(L.y,0.)*mix(.08,1.,day);
 vec3 body=mix(deep,shallow,sh)*(.25+.75*sunlit)+vec3(.004,.014,.022)*(1.-day);
 float cr=max(vCrest,0.)*.15;float sss=pow(max(dot(V,-L),0.),4.)*cr*1.6+cr*.35;body+=vec3(.02,.16,.13)*sss*sunlit;
 vec3 col=mix(body,refl,F);
 vec3 H=normalize(L+V);float NdH=max(dot(n,H),0.);float rough=mix(.05,.12,uStorm);float a2=rough*rough;float dd=NdH*NdH*(a2-1.)+1.;float ggx=a2/(3.14159*dd*dd);
 vec3 sunCol=mix(vec3(.25,.32,.5)*.12,mix(vec3(1.,.55,.3),vec3(1.,.93,.82),smoothstep(.0,.35,uSunDir.y)),day);
 col+=sunCol*min(ggx,400.)*F*uSunPower*max(dot(n,L),0.)*.35*(1.-uStorm*.8);
 float foam=smoothstep(.6,.9,vCrest)*smoothstep(.5,.8,noise(p*2.3+uTime*.5))*(.25+uStorm);
 for(int i=0;i<${ISLANDS.length};i++){vec4 isl=uIslands[i];float e=length((p-isl.xy)/isl.zw);foam+=(1.-smoothstep(.0,.12,abs(e-1.08-.03*sin(uTime*1.3+p.x))))*(.45+.55*noise(p*3.+uTime));}
 foam+=(1.-smoothstep(.08,.7,homeD))*step(0.,max(hd.x,hd.y))*(.35+.4*noise(p*4.+uTime*.8));
 vec2 d=p-uBoat.xz;vec2 fw=vec2(sin(uHeading),cos(uHeading));float aft=-dot(d,fw),side=abs(dot(d,vec2(fw.y,-fw.x)));
 foam+=(1.-smoothstep(.04,.45,abs(side-(.52+aft*.2))))*smoothstep(0.,1.6,aft)*(1.-smoothstep(3.,14.,aft))*min(1.,uSpeed*.25)*(.5+.5*noise(p*3.));
 foam=clamp(foam,0.,1.)*detail;col=mix(col,vec3(.75,.8,.8)*(.08+.92*sunlit)+refl*.15,foam*.85);
 float fog=1.-exp(-dist*uFogDensity);col=mix(col,uFog,fog);
 gl_FragColor=vec4(col,mix(.86,1.,F));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export function makeWater(quality){
 const m=new T.Mesh(oceanGeometry(quality.rings,quality.segments),new T.ShaderMaterial({transparent:true,depthWrite:false,defines:{OCTAVES:quality.octaves},
  uniforms:{uTime:{value:0},uNight:{value:0},uStorm:{value:0},uCamera:{value:new T.Vector3()},uBoat:{value:new T.Vector3()},uHeading:{value:0},uSpeed:{value:0},uHome:{value:new T.Vector4(1.8,1.8,3.6,3.6)},uSunDir:{value:new T.Vector3(0,1,0)},uFog:{value:new T.Color()},uFogDensity:{value:.0045},uSunPower:{value:1},uIslands:{value:ISLANDS.map(i=>new T.Vector4(i.x,i.z,i.rx,i.rz))}},
  vertexShader:waterVertex,fragmentShader:waterFrag}));
 m.frustumCulled=false;m.renderOrder=1;return m;
}

// Tileable value-noise grain used as bump/roughness detail on sand, rock and wood.
let grain;
export function grainTexture(){if(grain)return grain;const n=128,d=new Uint8Array(n*n*4);let seed=91;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;const base=Array.from({length:32*32},r);const at=(x,y)=>base[((y+32)%32)*32+(x+32)%32];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const fx=x/4,fy=y/4,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;const v=(at(ix,iy)*(1-tx)+at(ix+1,iy)*tx)*(1-ty)+(at(ix,iy+1)*(1-tx)+at(ix+1,iy+1)*tx)*ty;const g=Math.round((v*.6+r()*.4)*255);const i=(y*n+x)*4;d[i]=d[i+1]=d[i+2]=g;d[i+3]=255;}
 grain=new T.DataTexture(d,n,n,T.RGBAFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;return grain;}

// Drives sun light, fog, sky and image-based lighting from the game clock.
export class Atmosphere{
 constructor(world,quality){this.world=world;this.quality=quality;this.sunDir=new T.Vector3(0,1,0);this.lastEnvSun=new T.Vector3(9,9,9);this.envTimer=0;this.fog=new T.Color();this.pmrem=new T.PMREMGenerator(world.renderer);this.envScene=new T.Scene();this.envSky=makeSky(quality);this.envSky.scale.setScalar(.1);this.envScene.add(this.envSky);this.envTarget=null;this.lastStorm=0;}
 update(dt,phase,storm,anchor,env){const w=this.world,sun=this.sunDir.copy(sunAt(phase)),day=dayAmount(sun);
  horizonColor(sun,storm,this.fog);
  for(const m of[w.sky.material,w.water.material,this.envSky.material]){m.uniforms.uSunDir.value.copy(sun);m.uniforms.uStorm.value=storm;if(m.uniforms.uFog)m.uniforms.uFog.value.copy(this.fog);}
  w.water.material.uniforms.uSunPower.value=day>0?Math.min(1,sun.y*6+.2):.15;
  const light=sun.y>-.05?sun:sun.clone().negate();w.sun.position.copy(anchor).addScaledVector(light,90);w.sun.target.position.copy(anchor);w.sun.target.updateMatrixWorld();
  const warm=smooth(0,.4,sun.y);w.sun.color.setRGB(1,.62+.33*warm,.38+.5*warm);if(day<.05)w.sun.color.setRGB(.55,.65,.9);
  w.sun.intensity=(day*3.4+(1-day)*.7)*(1-storm*.55);w.ambient.intensity=(.5+day*.35)*(1-storm*.25);w.ambient.color.copy(this.fog).lerp(new T.Color(1,1,1),.35);w.ambient.groundColor.setRGB(.05,.09,.11);
  w.scene.environmentIntensity=(.3+day*.7)*(1-storm*.35);
  if(env){this.envTimer-=dt;if(this.envTimer<=0&&(this.lastEnvSun.distanceTo(sun)>.04||Math.abs(this.lastStorm-storm)>.05)){this.envTimer=this.quality.envEvery;this.lastEnvSun.copy(sun);this.lastStorm=storm;this.envSky.material.uniforms.uTime.value=w.sky.material.uniforms.uTime.value;const rt=this.pmrem.fromScene(this.envScene,0,.1,100,{size:this.quality.envSize});if(this.envTarget)this.envTarget.dispose();this.envTarget=rt;w.scene.environment=rt.texture;}}
  return{sun,day,fog:this.fog};
 }
}
