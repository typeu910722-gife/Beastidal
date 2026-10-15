// Live previews of beasts for the device's beast storage: one small offscreen renderer draws every visible beast,
// slowly turning and swimming, into its own 2D canvas each frame.
import * as T from './vendor/three.module.min.js';
import { makeCreature, animateCreature } from './creatures.js?v=0.47.0';
import { applyGeneMarks } from './bs-models.js?v=0.47.0';
import { makeSabertooth, animateSabertooth } from './story-models.js?v=0.47.0';

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
  // kind: 'creature' or 'beast' shows the BS marks the way the world does; omitted, the plain animal
  model(key, genome, kind) {
    let m = this.models.get(key);
    if (m) return m;
    // 0.36.5: 嘯岳 is drawn as itself, the sabre-tooth, not from its genome
    const saber = key.startsWith('ancient-'),
      mesh = saber ? makeSabertooth() : makeCreature(genome);
    mesh.userData.saber = saber;
    if (kind && !saber) applyGeneMarks(mesh, genome, kind);
    mesh.visible = false;
    this.scene.add(mesh);
    mesh.updateMatrixWorld(true);
    const sphere = new T.Box3().setFromObject(mesh).getBoundingSphere(new T.Sphere());
    m = { mesh, centre: sphere.center, radius: Math.max(0.3, sphere.radius), phase: Math.random() * 6 };
    this.models.set(key, m);
    return m;
  }
  // cells: [{ canvas, key, genome, kind? }]
  show(cells) {
    this.cells = cells;
    if (!cells.length || !this.ensure()) return;
    for (const c of cells) this.model(c.key, c.genome, c.kind);
  }
  clear() {
    this.cells = [];
  }
  // 0.39: a still portrait of a beast's own model (contract cards). Rendered once per beast and look, then cached.
  thumb(key, genome, kind, w = 120, h = 160) {
    this.thumbs ??= new Map();
    if (this.thumbs.has(key)) return this.thumbs.get(key);
    if (!this.ensure()) return null;
    const m = this.model(key, genome, kind);
    for (const o of this.models.values()) o.mesh.visible = o === m;
    // turned three-quarters toward you; framed tight on the front half (a portrait, not a full side view)
    m.mesh.rotation.y = -0.55;
    if (m.mesh.userData.aura) m.mesh.userData.aura.visible = false;
    if (m.mesh.userData.saber) animateSabertooth(m.mesh, 1.3);
    else animateCreature(m.mesh, 1.3);
    m.mesh.updateMatrixWorld(true);
    // (only what is drawn: halos, perches and other hidden extras would make the beast tiny in the frame)
    const box = new T.Box3();
    m.mesh.traverse(o => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      for (let a = o; a; a = a.parent) if (!a.visible) return;
      if (o.material?.transparent && o.material.opacity < 0.6) return;
      box.expandByObject(o);
    });
    if (box.isEmpty()) box.setFromObject(m.mesh);
    const size = box.getSize(new T.Vector3()),
      aim = box.getCenter(new T.Vector3()),
      reach = Math.max(size.x, size.z) * 0.18;
    // a little toward the head (it faces +z before the turn)
    aim.x += Math.sin(m.mesh.rotation.y) * reach;
    aim.z += Math.cos(m.mesh.rotation.y) * reach;
    aim.y += size.y * 0.08;
    const aspect = w / h,
      fit = Math.max(size.y * 0.6, (Math.max(size.x, size.z) * 0.5) / aspect);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const d = fit / Math.tan((this.camera.fov * Math.PI) / 360);
    this.camera.position.set(aim.x + d * 0.42, aim.y + d * 0.16, aim.z + d * 0.9);
    this.camera.lookAt(aim);
    this.renderer.setSize(w, h, false);
    this.w = w;
    this.h = h;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    m.mesh.rotation.y = 0;
    if (m.mesh.userData.aura) m.mesh.userData.aura.visible = true;
    this.thumbs.set(key, url);
    return url;
  }
  update(dt) {
    if (!this.cells.length || !this.renderer) return;
    this.t += dt;
    // a full storage: draw only the cells on screen, and at most 12 of them a frame (round robin)
    const vis = this.cells.filter(c => {
      if (!c.canvas.isConnected) return false;
      const r = c.canvas.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0;
    });
    const per = Math.min(vis.length, 12);
    this.rr = ((this.rr || 0) + per) % Math.max(1, vis.length);
    for (let i = 0; i < per; i++) {
      const c = vis[(this.rr + i) % vis.length];
      const m = this.models.get(c.key);
      if (!m) continue;
      for (const o of this.models.values()) o.mesh.visible = o === m;
      m.mesh.rotation.y = -0.6 + Math.sin(this.t * 0.35 + m.phase) * 0.7;
      if (m.mesh.userData.saber) animateSabertooth(m.mesh, this.t + m.phase);
      else animateCreature(m.mesh, this.t + m.phase);
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
