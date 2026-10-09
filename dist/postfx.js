// Post-processing: the scene renders into an HDR target, then one full-screen pass adds bloom, tone mapping and a
// colour grade (muted, cold shadows, a little lens fringe, vignette and film grain) for the alien-survival look.
// Bloom uses a bright pass at 1/4 resolution blurred twice (1/4 and 1/8) so glowing crystals and the rift bleed light.
import * as T from './vendor/three.module.min.js';

const FULLSCREEN = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const BRIGHT = `uniform sampler2D tSrc;uniform float uThreshold;varying vec2 vUv;
void main(){vec3 c=texture2D(tSrc,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(uThreshold,uThreshold*2.2,l),1.);}`;
const BLUR = `uniform sampler2D tSrc;uniform vec2 uDir;varying vec2 vUv;
void main(){vec3 c=texture2D(tSrc,vUv).rgb*.227;
 c+=(texture2D(tSrc,vUv+uDir*1.385).rgb+texture2D(tSrc,vUv-uDir*1.385).rgb)*.316;
 c+=(texture2D(tSrc,vUv+uDir*3.231).rgb+texture2D(tSrc,vUv-uDir*3.231).rgb)*.07;gl_FragColor=vec4(c,1.);}`;
const FINAL = `uniform sampler2D tScene;uniform sampler2D tBloomA;uniform sampler2D tBloomB;uniform float uBloom;uniform float uTime;
uniform float uGrain;uniform float uVignette;uniform float uFringe;uniform float uStorm;uniform float uHurt;uniform vec2 uRes;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 c=vUv-.5;float r2=dot(c,c);vec2 off=c*r2*uFringe;
 vec3 col=vec3(texture2D(tScene,vUv+off).r,texture2D(tScene,vUv).g,texture2D(tScene,vUv-off).b);
 col+=(texture2D(tBloomA,vUv).rgb*.6+texture2D(tBloomB,vUv).rgb*.8)*uBloom;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 vec3 g=gl_FragColor.rgb;float l=dot(g,vec3(.2126,.7152,.0722));
 g=mix(vec3(l),g,.78-uStorm*.12);                       // muted
 g=mix(g,g*vec3(.86,1.,1.02),smoothstep(.25,0.,l)*.6);  // cold, green-teal shadows
 g=mix(g,g*vec3(1.04,1.,.94),smoothstep(.4,.9,l)*.3);   // pale highlights
 g=max(g-.004,0.)*1.02;                                 // crushed blacks
 g*=1.-uVignette*smoothstep(.12,.62,r2*1.6);
 g=mix(g,g*vec3(1.25,.55,.5),uHurt*smoothstep(.05,.45,r2*1.6));
 gl_FragColor.rgb=g;
 #include <colorspace_fragment>
 gl_FragColor.rgb+=(h(vUv*uRes+fract(uTime*7.3)*91.)-.5)*uGrain;
}`;

const PRESETS = {
  high: { bloom: true, samples: 4, fringe: 0.012 },
  balanced: { bloom: true, samples: 2, fringe: 0.008 },
  low: null // phones on battery saver: render straight to the screen
};

export class PostFX {
  constructor(renderer, qualityName) {
    this.renderer = renderer;
    this.preset = PRESETS[qualityName] ?? PRESETS.high;
    this.enabled = !!this.preset && renderer.capabilities.isWebGL2;
    this.hurt = 0;
    this.storm = 0;
    if (!this.enabled) return;
    const opts = { type: T.HalfFloatType, depthBuffer: true };
    this.scene = new T.WebGLRenderTarget(1, 1, { ...opts, samples: this.preset.samples });
    this.bright = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
    this.blurA = [this.bright.clone(), this.bright.clone()];
    this.blurB = [this.bright.clone(), this.bright.clone()];
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.brightMat = new T.ShaderMaterial({
      vertexShader: FULLSCREEN,
      fragmentShader: BRIGHT,
      uniforms: { tSrc: { value: null }, uThreshold: { value: 1.1 } },
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
        tBloomA: { value: this.blurA[1].texture },
        tBloomB: { value: this.blurB[1].texture },
        uBloom: { value: this.preset.bloom ? 1 : 0 },
        uTime: { value: 0 },
        uGrain: { value: 0.035 },
        uVignette: { value: 0.42 },
        uFringe: { value: this.preset.fringe },
        uStorm: { value: 0 },
        uHurt: { value: 0 },
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
    }
    const u = this.finalMat.uniforms;
    u.uTime.value += dt;
    u.uStorm.value = this.storm;
    this.hurt = Math.max(0, this.hurt - dt * 1.6);
    u.uHurt.value = this.hurt;
    this.pass(this.finalMat, old);
  }
}
