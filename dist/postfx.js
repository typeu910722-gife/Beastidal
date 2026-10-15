// Post-processing: the scene renders into an HDR target, then one full-screen pass adds bloom, tone mapping and a
// colour grade for the look of the lake — and (0.27) the cinematic finish: a filmic S-curve with teal-violet shadows
// and crimson-amber highlights, a wide three-level bloom so burning eyes and crystals bleed light into the fog, a
// depth of field that softens the far shore around whatever the camera is on, a touch of sharpening on what is in
// focus, a little lens fringe, vignette and film grain.
// Bloom uses a bright pass at 1/4 resolution blurred three times (1/4, 1/8, 1/16); the depth of field blurs the
// scene once at 1/2 resolution and blends it in by distance from the focus.
import * as T from './vendor/three.module.min.js';

const FULLSCREEN = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const BRIGHT = `uniform sampler2D tSrc;uniform float uThreshold;varying vec2 vUv;
void main(){vec3 c=texture2D(tSrc,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(uThreshold,uThreshold*2.2,l),1.);}`;
const BLUR = `uniform sampler2D tSrc;uniform vec2 uDir;varying vec2 vUv;
void main(){vec3 c=texture2D(tSrc,vUv).rgb*.227;
 c+=(texture2D(tSrc,vUv+uDir*1.385).rgb+texture2D(tSrc,vUv-uDir*1.385).rgb)*.316;
 c+=(texture2D(tSrc,vUv+uDir*3.231).rgb+texture2D(tSrc,vUv-uDir*3.231).rgb)*.07;gl_FragColor=vec4(c,1.);}`;
const FINAL = `uniform sampler2D tScene;uniform sampler2D tSoft;uniform sampler2D tDepth;uniform sampler2D tBloomA;uniform sampler2D tBloomB;uniform sampler2D tBloomC;
uniform float uBloom;uniform float uTime;uniform float uGrain;uniform float uVignette;uniform float uFringe;uniform float uStorm;uniform float uHurt;
uniform float uDof;uniform float uFocus;uniform float uNear;uniform float uFar;uniform float uSharpen;uniform float uWarmth;uniform vec2 uRes;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float linDepth(vec2 uv){float z=texture2D(tDepth,uv).x*2.-1.;return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
void main(){
 vec2 c=vUv-.5;float r2=dot(c,c);vec2 off=c*r2*uFringe;vec2 px=1./uRes;
 vec3 col=vec3(texture2D(tScene,vUv+off).r,texture2D(tScene,vUv).g,texture2D(tScene,vUv-off).b);
 // circle of confusion from the distance to the focus: the far shore softens, the near foreground a little
 float coc=0.;
 if(uDof>0.){
  float d=linDepth(vUv);
  float far=smoothstep(0.,1.,(d-uFocus*1.15)/(uFocus*2.6+30.));
  float near=smoothstep(0.,1.,(uFocus*.38-d)/(uFocus*.38))*.6;
  coc=clamp(max(far,near),0.,1.)*uDof;
  col=mix(col,texture2D(tSoft,vUv).rgb,coc);
 }
 // a touch of sharpening on what is in focus
 if(uSharpen>0.){
  vec3 nb=texture2D(tScene,vUv+vec2(px.x,0.)).rgb+texture2D(tScene,vUv-vec2(px.x,0.)).rgb+texture2D(tScene,vUv+vec2(0.,px.y)).rgb+texture2D(tScene,vUv-vec2(0.,px.y)).rgb;
  col+=(col-nb*.25)*uSharpen*(1.-coc);
 }
 col+=(texture2D(tBloomA,vUv).rgb*.45+texture2D(tBloomB,vUv).rgb*.65+texture2D(tBloomC,vUv).rgb*.9)*uBloom;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 vec3 g=gl_FragColor.rgb;float l=dot(g,vec3(.2126,.7152,.0722));
 g=mix(vec3(l),g,1.06-uStorm*.14);                              // a little richer than life
 g=mix(g,g*vec3(.78,.9,1.14),smoothstep(.32,0.,l)*.6);         // teal-violet shadows
 g=mix(g,g*mix(vec3(1.0),vec3(1.1,.96,.88),uWarmth),smoothstep(.42,.95,l)*.4); // crimson-amber highlights
 g=mix(g,g*g*(3.-2.*g),.42);                                    // filmic S-curve
 g=max(g-.006,0.)*1.03;                                         // crushed blacks
 g*=1.-uVignette*smoothstep(.12,.62,r2*1.6);
 g=mix(g,g*vec3(1.25,.55,.5),uHurt*smoothstep(.05,.45,r2*1.6));
 gl_FragColor.rgb=g;
 #include <colorspace_fragment>
 gl_FragColor.rgb+=(h(vUv*uRes+fract(uTime*7.3)*91.)-.5)*uGrain;
}`;

const PRESETS = {
  high: { bloom: true, samples: 4, fringe: 0.012, dof: 1, sharpen: 0.3 },
  balanced: { bloom: true, samples: 2, fringe: 0.008, dof: 0, sharpen: 0.18 },
  low: null // phones on battery saver: render straight to the screen
};

export class PostFX {
  constructor(renderer, qualityName) {
    this.renderer = renderer;
    this.preset = PRESETS[qualityName] ?? PRESETS.high;
    this.enabled = !!this.preset && renderer.capabilities.isWebGL2;
    this.hurt = 0;
    this.storm = 0;
    this.focus = 30; // metres from the camera to what it is looking at (world.js sets it each frame)
    this.warmth = 1; // how far the highlights lean crimson-amber (0 keeps them neutral)
    if (!this.enabled) return;
    const opts = { type: T.HalfFloatType, depthBuffer: true };
    this.scene = new T.WebGLRenderTarget(1, 1, { ...opts, samples: this.preset.samples });
    if (this.preset.dof) {
      this.scene.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
      this.scene.depthTexture.format = T.DepthFormat;
    }
    this.bright = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
    this.blurA = [this.bright.clone(), this.bright.clone()];
    this.blurB = [this.bright.clone(), this.bright.clone()];
    this.blurC = [this.bright.clone(), this.bright.clone()];
    this.soft = this.preset.dof ? [this.bright.clone(), this.bright.clone()] : null;
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.brightMat = new T.ShaderMaterial({
      vertexShader: FULLSCREEN,
      fragmentShader: BRIGHT,
      uniforms: { tSrc: { value: null }, uThreshold: { value: 0.95 } },
      depthTest: false,
      depthWrite: false
    });
    this.blurMat = new T.ShaderMaterial({
      vertexShader: FULLSCREEN,
      fragmentShader: BLUR,
      uniforms: { tSrc: { value: null }, uDir: { value: new T.Vector2() } },
      depthTest: false,
      depthWrite: false
    });
    this.finalMat = new T.ShaderMaterial({
      vertexShader: FULLSCREEN,
      fragmentShader: FINAL,
      uniforms: {
        tScene: { value: this.scene.texture },
        tSoft: { value: this.soft ? this.soft[1].texture : null },
        tDepth: { value: this.scene.depthTexture || null },
        tBloomA: { value: this.blurA[1].texture },
        tBloomB: { value: this.blurB[1].texture },
        tBloomC: { value: this.blurC[1].texture },
        uBloom: { value: this.preset.bloom ? 1 : 0 },
        uTime: { value: 0 },
        uGrain: { value: 0.03 },
        uVignette: { value: 0.4 },
        uFringe: { value: this.preset.fringe },
        uStorm: { value: 0 },
        uHurt: { value: 0 },
        uDof: { value: this.preset.dof },
        uFocus: { value: 30 },
        uNear: { value: 0.1 },
        uFar: { value: 1800 },
        uSharpen: { value: this.preset.sharpen },
        uWarmth: { value: 1 },
        uRes: { value: new T.Vector2(1, 1) }
      },
      depthTest: false,
      depthWrite: false
    });
    this.width = this.height = 0;
  }
  setSize(width, height) {
    if (!this.enabled) return;
    const pr = this.renderer.getPixelRatio(),
      w = Math.max(1, Math.round(width * pr)),
      h = Math.max(1, Math.round(height * pr));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.scene.setSize(w, h);
    const qw = Math.max(1, w >> 2),
      qh = Math.max(1, h >> 2);
    this.bright.setSize(qw, qh);
    for (const t of this.blurA) t.setSize(qw, qh);
    for (const t of this.blurB) t.setSize(Math.max(1, qw >> 1), Math.max(1, qh >> 1));
    for (const t of this.blurC) t.setSize(Math.max(1, qw >> 2), Math.max(1, qh >> 2));
    if (this.soft) for (const t of this.soft) t.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    this.finalMat.uniforms.uRes.value.set(w, h);
  }
  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quad, this.cam);
  }
  blur(src, [a, b], scale) {
    const u = this.blurMat.uniforms;
    u.tSrc.value = src.texture;
    u.uDir.value.set(scale / a.width, 0);
    this.pass(this.blurMat, a);
    u.tSrc.value = a.texture;
    u.uDir.value.set(0, scale / a.height);
    this.pass(this.blurMat, b);
  }
  // 0.28: shed cost when frames run slow — 1: no depth of field · 2: no third bloom level, no sharpening
  degrade(level) {
    if (!this.enabled) return;
    const u = this.finalMat.uniforms;
    if (level >= 1) {
      this.soft = null;
      u.uDof.value = 0;
    }
    if (level >= 2) {
      this.thinBloom = true;
      u.tBloomC.value = this.blurB[1].texture;
      u.uSharpen.value = 0;
    }
  }
  render(scene, camera, dt = 0) {
    const r = this.renderer;
    if (!this.enabled) return r.render(scene, camera);
    const old = r.getRenderTarget();
    r.setRenderTarget(this.scene);
    r.render(scene, camera);
    if (this.preset.bloom) {
      this.brightMat.uniforms.tSrc.value = this.scene.texture;
      this.pass(this.brightMat, this.bright);
      this.blur(this.bright, this.blurA, 1);
      this.blur(this.blurA[1], this.blurB, 1.4);
      if (!this.thinBloom) this.blur(this.blurB[1], this.blurC, 1.6);
    }
    if (this.soft) this.blur(this.scene, this.soft, 1.3);
    const u = this.finalMat.uniforms;
    u.uTime.value += dt;
    u.uStorm.value = this.storm;
    u.uFocus.value += (this.focus - u.uFocus.value) * Math.min(1, dt * 6);
    u.uDof.value = this.soft && !this.handsUp ? this.preset.dof : 0;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uWarmth.value = this.warmth;
    // 0.61.10: the glow eases off through your beast's eyes, where the foe's burning parts are a few metres away
    u.uBloom.value = (this.preset.bloom ? 1 : 0) * (this.bloomK ?? 1);
    this.hurt = Math.max(0, this.hurt - dt * 1.6);
    u.uHurt.value = this.hurt;
    this.pass(this.finalMat, old);
  }
}
