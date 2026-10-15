// What combat looks like (0.25): the red shapes enemies paint on the ground before they strike (filling up as the
// windup runs), their spit in flight, your beast's slashes, and the skills — fire cones, chain lightning, frost and
// tail rings, crystal spikes erupting, a dash streak, a healing column — plus impact flashes.
import * as T from './vendor/three.module.min.js';

const RED = 0xff4433;
const basic = (color, opacity, extra = {}) =>
  new T.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: T.DoubleSide,
    fog: false,
    ...extra
  });
const additive = (color, opacity) => basic(color, opacity, { blending: T.AdditiveBlending });
const flat = (m, y) => {
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
};
export class CombatFX {
  constructor(scene) {
    this.scene = scene;
    this.root = new T.Group();
    scene.add(this.root);
    this.tele = new Map(); // foe id → { group, fill, info }
    this.shots = new Map(); // shot id → mesh
    this.fx = []; // { obj, born, life, kind, ... }
  }
  // a telegraph shape: outline + fill (scaled by windup progress)
  makeShape(info) {
    const g = new T.Group(),
      out = basic(RED, 0.22),
      fil = additive(RED, 0.4);
    let outline, fill;
    if (info.move === 'bite') {
      const half = info.half || 0.85;
      outline = new T.Mesh(new T.CircleGeometry(info.range, 28, Math.PI / 2 - half, half * 2), out);
      fill = new T.Mesh(new T.CircleGeometry(info.range, 28, Math.PI / 2 - half, half * 2), fil);
    } else if (info.move === 'sweep') {
      outline = new T.Mesh(new T.CircleGeometry(info.range, 40), out);
      fill = new T.Mesh(new T.CircleGeometry(info.range, 40), fil);
    } else {
      const w = info.move === 'spit' ? 0.5 : info.width || 1.6,
        geo = new T.PlaneGeometry(w, info.range);
      geo.translate(0, info.range / 2, 0);
      outline = new T.Mesh(geo, out);
      fill = new T.Mesh(geo.clone(), fil);
    }
    // shapes are drawn in the XY plane with +Y forward, laid flat (+Y → +Z, heading 0) and turned to the attack's heading
    for (const m of [outline, fill]) {
      m.rotation.x = Math.PI / 2;
      g.add(m);
    }
    // 0.61.8: a low wall of red light stands on the shape's edge, so it reads from a beast's-eye view too (from low
    // down a shape flat on the ground is only a sliver)
    const H = 1.3,
      wm = this.wallMat(),
      wall = new T.Group();
    if (info.move === 'bite' || info.move === 'sweep') {
      const half = info.move === 'sweep' ? Math.PI : info.half || 0.85,
        cyl = new T.CylinderGeometry(
          info.range,
          info.range,
          H,
          info.move === 'sweep' ? 40 : 24,
          1,
          true,
          -half,
          half * 2
        );
      cyl.translate(0, H / 2, 0);
      wall.add(new T.Mesh(cyl, wm));
    } else {
      const w = info.move === 'spit' ? 0.5 : info.width || 1.6;
      for (const side of [-1, 1]) {
        const pl = new T.PlaneGeometry(info.range, H);
        pl.rotateY(Math.PI / 2);
        pl.translate((side * w) / 2, H / 2, info.range / 2);
        wall.add(new T.Mesh(pl, wm));
      }
      const end = new T.PlaneGeometry(w, H);
      end.translate(0, H / 2, info.range);
      wall.add(new T.Mesh(end, wm));
    }
    g.add(wall);
    g.rotation.y = info.dir;
    g.position.set(info.x, 0, info.z);
    this.root.add(g);
    return { group: g, fill, outline, wall: wm, info };
  }
  // one material per telegraph (its opacity follows that windup), with a shared fade toward the top
  wallMat() {
    if (!CombatFX.fade) {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 64;
      const x = c.getContext('2d'),
        gr = x.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, '#000');
      gr.addColorStop(1, '#fff');
      x.fillStyle = gr;
      x.fillRect(0, 0, 4, 64);
      CombatFX.fade = new T.CanvasTexture(c);
    }
    return basic(RED, 0.2, { alphaMap: CombatFX.fade, blending: T.AdditiveBlending });
  }
  handle(events, now, groundY) {
    for (const e of events) {
      const y = groundY(e.x ?? 0, e.z ?? 0) + 0.08;
      switch (e.type) {
        case 'telegraph': {
          this.clearTele(e.id);
          const t = this.makeShape(e);
          t.group.position.y = y;
          this.tele.set(e.id, t);
          break;
        }
        case 'strike':
        case 'interrupt':
          this.flashTele(e.id, now);
          break;
        case 'swing':
          this.swing(e, y + 0.9, now);
          break;
        case 'skill':
          this.skill(e, groundY, now);
          break;
        case 'hit':
          this.burst(
            e.x,
            y + 1,
            e.z,
            e.target === 'foe' ? (e.crit ? 0xffe27a : 0xffffff) : 0xff5a4a,
            e.crit ? 1.2 : 0.8,
            now
          );
          break;
        case 'impact':
          this.burst(e.x, y + 0.6, e.z, e.color || 0xffffff, 1.1, now);
          break;
        case 'erupt':
          this.erupt(e, groundY, now);
          break;
        case 'dodge':
          this.ring(e.x, y, e.z, 0xbfe8ff, 0.4, 2.6, 0.35, now);
          break;
        case 'heal':
          this.column(e.x, y, e.z, 0x7fe0a8, now);
          break;
        case 'kill':
          this.ring(e.x, y, e.z, 0xffd38c, 0.6, 4, 0.6, now);
          break;
      }
    }
  }
  clearTele(id) {
    const t = this.tele.get(id);
    if (!t) return;
    this.root.remove(t.group);
    this.tele.delete(id);
  }
  flashTele(id, now) {
    const t = this.tele.get(id);
    if (!t) return;
    this.tele.delete(id);
    t.fill.material.opacity = 0.75;
    t.fill.scale.setScalar(1);
    this.fx.push({
      obj: t.group,
      born: now,
      life: 0.22,
      kind: 'fade',
      mats: [t.fill.material, t.outline.material, t.wall].filter(Boolean),
      base: [0.75, 0.22, 0.6]
    });
  }
  swing(e, y, now) {
    const half = e.heavy ? 1.2 : 0.95,
      r0 = Math.max(0.4, e.reach - 1.1),
      geo = new T.RingGeometry(r0, e.reach + 0.2, 24, 1, Math.PI / 2 - half, half * 2),
      color = e.heavy ? 0xffd38c : e.combo === 3 ? 0xffe9b0 : 0xffffff,
      m = new T.Mesh(geo, additive(color, 0.75));
    m.rotation.x = Math.PI / 2 + (e.combo === 2 ? 0.35 : e.combo === 3 ? -0.2 : 0);
    const g = new T.Group();
    g.add(m);
    g.position.set(e.x, y, e.z);
    g.rotation.y = e.dir + (e.combo === 2 ? 0.25 : e.combo === 1 ? -0.25 : 0);
    this.root.add(g);
    this.fx.push({
      obj: g,
      born: now,
      life: e.heavy ? 0.32 : 0.22,
      kind: 'fade',
      mats: [m.material],
      base: [0.75],
      grow: 0.15
    });
  }
  burst(x, y, z, color, size, now) {
    const m = new T.Mesh(new T.SphereGeometry(0.35 * size, 12, 8), additive(color, 0.9));
    m.position.set(x, y, z);
    this.root.add(m);
    this.fx.push({ obj: m, born: now, life: 0.25, kind: 'fade', mats: [m.material], base: [0.9], grow: 2.2 });
  }
  ring(x, y, z, color, r0, r1, life, now) {
    const m = flat(new T.Mesh(new T.RingGeometry(0.85, 1, 48), additive(color, 0.7)), y);
    m.position.x = x;
    m.position.z = z;
    m.scale.setScalar(r0);
    this.root.add(m);
    this.fx.push({ obj: m, born: now, life, kind: 'ring', mats: [m.material], base: [0.7], r0, r1 });
  }
  column(x, y, z, color, now) {
    const m = new T.Mesh(new T.CylinderGeometry(0.8, 1.2, 5, 20, 1, true), additive(color, 0.45));
    m.position.set(x, y + 2.5, z);
    this.root.add(m);
    this.fx.push({ obj: m, born: now, life: 0.9, kind: 'fade', mats: [m.material], base: [0.45], rise: 1.5 });
  }
  skill(e, groundY, now) {
    const y = groundY(e.x, e.z) + 0.1;
    switch (e.skill) {
      case 'flame': {
        const half = 0.62,
          g = new T.Group();
        for (let i = 0; i < 3; i++) {
          const m = new T.Mesh(
            new T.CircleGeometry(e.range * (0.6 + i * 0.2), 24, Math.PI / 2 - half, half * 2),
            additive([0xff3a10, 0xff7a2a, 0xffc060][i], 0.55 - i * 0.12)
          );
          m.rotation.x = Math.PI / 2;
          m.position.y = 0.6 + i * 0.25;
          g.add(m);
        }
        g.position.set(e.x, y, e.z);
        g.rotation.y = e.dir;
        this.root.add(g);
        this.fx.push({
          obj: g,
          born: now,
          life: 0.6,
          kind: 'fade',
          mats: g.children.map(c => c.material),
          base: g.children.map(c => c.material.opacity),
          grow: 0.25
        });
        break;
      }
      case 'thunder': {
        if (!e.chain?.length) break;
        const pts = [new T.Vector3(e.x, y + 1.2, e.z)];
        for (const c of e.chain) {
          const cy = groundY(c.x, c.z) + 1.1,
            last = pts[pts.length - 1];
          for (let k = 1; k <= 4; k++) {
            const f = k / 5;
            pts.push(
              new T.Vector3(
                last.x + (c.x - last.x) * f + (Math.random() - 0.5) * 0.8,
                last.y + (cy - last.y) * f + (Math.random() - 0.5) * 0.8,
                last.z + (c.z - last.z) * f + (Math.random() - 0.5) * 0.8
              )
            );
          }
          pts.push(new T.Vector3(c.x, cy, c.z));
        }
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 1, fog: false })
        );
        this.root.add(line);
        this.fx.push({ obj: line, born: now, life: 0.35, kind: 'fade', mats: [line.material], base: [1] });
        for (const c of e.chain) this.burst(c.x, groundY(c.x, c.z) + 1.1, c.z, 0x8fe0ff, 1.3, now);
        break;
      }
      case 'frost':
      case 'tail':
      case 'roar':
        this.ring(e.x, y, e.z, e.color, 0.6, e.range, e.skill === 'roar' ? 0.7 : 0.45, now);
        if (e.skill === 'frost') this.ring(e.x, y + 0.05, e.z, 0xffffff, 0.3, e.range * 0.8, 0.55, now);
        break;
      case 'dash': {
        const len = Math.hypot(e.tx - e.x, e.tz - e.z) || 1,
          geo = new T.PlaneGeometry(1.6, len);
        geo.translate(0, len / 2, 0);
        const m = new T.Mesh(geo, additive(0xffffff, 0.6));
        m.rotation.x = Math.PI / 2;
        const g = new T.Group();
        g.add(m);
        g.position.set(e.x, y + 0.5, e.z);
        g.rotation.y = Math.atan2(e.tx - e.x, e.tz - e.z);
        this.root.add(g);
        this.fx.push({ obj: g, born: now, life: 0.35, kind: 'fade', mats: [m.material], base: [0.6] });
        break;
      }
      case 'crystal': {
        const zy = groundY(e.tx, e.tz) + 0.06,
          warn = flat(new T.Mesh(new T.CircleGeometry(3.1, 36), additive(0xc1b2ee, 0.25)), zy);
        warn.position.x = e.tx;
        warn.position.z = e.tz;
        this.root.add(warn);
        this.fx.push({ obj: warn, born: now, life: 0.6, kind: 'fade', mats: [warn.material], base: [0.35] });
        break;
      }
      case 'heal':
      case 'guard':
        this.column(e.x, y, e.z, e.color, now);
        break;
      case 'jaw':
        this.ring(e.x, y + 0.5, e.z, 0xffffff, 0.5, 2.5, 0.3, now);
        break;
    }
  }
  erupt(e, groundY, now) {
    const g = new T.Group(),
      y = groundY(e.x, e.z);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2,
        r = i === 0 ? 0 : 1 + (i % 3) * 0.6,
        m = new T.Mesh(
          new T.ConeGeometry(0.28, 2.2 + (i % 2), 5),
          new T.MeshStandardMaterial({
            color: 0xc1b2ee,
            emissive: 0x9a7bff,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 1
          })
        );
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      m.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(m);
    }
    g.position.set(e.x, y, e.z);
    this.root.add(g);
    this.fx.push({
      obj: g,
      born: now,
      life: 0.9,
      kind: 'spikes',
      mats: g.children.map(c => c.material),
      base: g.children.map(() => 1)
    });
  }
  update(s, now, groundY) {
    const c = s.combat || {};
    // telegraphs fill up as the windup runs; gone when the foe is gone or the windup ended unseen
    for (const [id, t] of this.tele) {
      // (the watcher and 嘯岳 are not among the wild: their warnings vanished the frame after they appeared)
      const foe =
        id === 'boss' ? s.expedition?.boss : id === 'duel' ? s.story?.beast : (s.wild || []).find(w => w.id === id);
      if (!foe || !foe.ai || foe.ai.state !== 'windup' || now > t.info.until + 0.1) {
        this.clearTele(id);
        continue;
      }
      const k = Math.min(1, (now - t.info.start) / Math.max(0.01, t.info.until - t.info.start));
      t.fill.scale.setScalar(Math.max(0.02, k));
      t.fill.material.opacity = 0.25 + k * 0.35;
      t.outline.material.opacity = 0.18 + Math.sin(now * 18) * 0.06 + k * 0.1;
      if (t.wall) t.wall.opacity = 0.12 + k * 0.45 + (k > 0.8 ? Math.sin(now * 30) * 0.1 : 0);
    }
    // projectiles in flight
    const live = new Set();
    for (const sh of c.shots || []) {
      live.add(sh.id);
      let m = this.shots.get(sh.id);
      if (!m) {
        m = new T.Group();
        m.add(new T.Mesh(new T.SphereGeometry(0.28, 12, 8), basic(sh.color, 1, { transparent: false })));
        m.add(new T.Mesh(new T.SphereGeometry(0.6, 12, 8), additive(sh.color, 0.45)));
        this.root.add(m);
        this.shots.set(sh.id, m);
      }
      m.position.set(sh.x, groundY(sh.x, sh.z) + 1.1, sh.z);
      m.children[1].scale.setScalar(1 + Math.sin(now * 20) * 0.15);
    }
    for (const [id, m] of this.shots)
      if (!live.has(id)) {
        this.root.remove(m);
        this.shots.delete(id);
      }
    // crystal zones waiting to erupt: their warning circles are in fx; nothing to do here
    // effects
    this.fx = this.fx.filter(f => {
      const k = (now - f.born) / f.life;
      if (k >= 1) {
        this.root.remove(f.obj);
        return false;
      }
      if (f.kind === 'ring') f.obj.scale.setScalar(f.r0 + (f.r1 - f.r0) * Math.sqrt(k));
      if (f.grow) f.obj.scale.setScalar(1 + k * f.grow * (f.kind === 'fade' && f.obj.isMesh ? 1 : 1));
      if (f.rise) f.obj.position.y += f.rise * 0.016;
      if (f.kind === 'spikes')
        f.obj.children.forEach(ch => {
          ch.scale.y = Math.min(1, k * 5);
          ch.position.y = ch.scale.y * 1.1;
        });
      f.mats.forEach((m, i) => (m.opacity = f.base[i] * (1 - k)));
      return true;
    });
  }
  clear() {
    for (const id of [...this.tele.keys()]) this.clearTele(id);
    for (const [, m] of this.shots) this.root.remove(m);
    this.shots.clear();
    for (const f of this.fx) this.root.remove(f.obj);
    this.fx = [];
  }
}
