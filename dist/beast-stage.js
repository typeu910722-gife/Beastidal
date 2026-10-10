// Live previews of beasts for the device's beast storage: one small offscreen renderer draws every visible beast,
// slowly turning and swimming, into its own 2D canvas each frame.
import * as T from './vendor/three.module.min.js';
import { makeCreature, animateCreature } from './creatures.js?v=0.18.0';

export class BeastStage {
  constructor() {
    this.renderer = null;
    this.models = new Map(); // key -> { mesh, centre, radius }
    this.cells = [];
    this.t = 0;
  }
  ensure() {
    if (this.renderer) return true;
    try {
      this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return false; // no WebGL: the cells keep their plain background
    }
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.scene = new T.Scene();
    this.scene.add(new T.HemisphereLight(0xe8fbff, 0x2f5b66, 2.6));
    const sun = new T.DirectionalLight(0xffe7c2, 2.6);
    sun.position.set(-3, 5, 4);
    this.scene.add(sun);
    this.camera = new T.PerspectiveCamera(30, 1, 0.05, 100);
    return true;
  }
  model(key, genome) {
    let m = this.models.get(key);
    if (m) return m;
    const mesh = makeCreature(genome);
    mesh.visible = false;
    this.scene.add(mesh);
    mesh.updateMatrixWorld(true);
    const sphere = new T.Box3().setFromObject(mesh).getBoundingSphere(new T.Sphere());
    m = { mesh, centre: sphere.center, radius: Math.max(0.3, sphere.radius), phase: Math.random() * 6 };
    this.models.set(key, m);
    return m;
  }
  // cells: [{ canvas, key, genome }]
  show(cells) {
    this.cells = cells;
    if (!cells.length || !this.ensure()) return;
    for (const c of cells) this.model(c.key, c.genome);
  }
  clear() {
    this.cells = [];
  }
  update(dt) {
    if (!this.cells.length || !this.renderer) return;
    this.t += dt;
    for (const c of this.cells) {
      if (!c.canvas.isConnected) continue;
      const m = this.models.get(c.key);
      if (!m) continue;
      for (const o of this.models.values()) o.mesh.visible = o === m;
      m.mesh.rotation.y = -0.6 + Math.sin(this.t * 0.35 + m.phase) * 0.7;
      animateCreature(m.mesh, this.t + m.phase);
      const r = m.radius,
        aspect = c.canvas.width / c.canvas.height;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      const d = (r / Math.sin((this.camera.fov * Math.PI) / 360)) * (aspect < 1 ? 1.15 / aspect : 1.05);
      this.camera.position.set(m.centre.x + d * 0.35, m.centre.y + d * 0.3, m.centre.z + d * 0.88);
      this.camera.lookAt(m.centre);
      if (this.w !== c.canvas.width || this.h !== c.canvas.height) {
        this.w = c.canvas.width;
        this.h = c.canvas.height;
        this.renderer.setSize(this.w, this.h, false);
      }
      this.renderer.render(this.scene, this.camera);
      const ctx = c.canvas.getContext('2d');
      ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
      ctx.drawImage(this.renderer.domElement, 0, 0);
    }
  }
}
