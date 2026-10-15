// Through your beast's eyes (0.61.9). While you are bonded (契合), its forelimbs and the ridge of its snout sit at the
// bottom of the view in its own colours: they breathe and sway as it moves, rake across the screen with each blow of
// a combo (right, left, right, left; both at once on a held heavy blow), snap the jaws up on a skill, lurch aside on
// a dodge and jerk back when it is struck. They hang off the camera and draw on top of the world, like the hands.
import * as T from './vendor/three.module.min.js';

const ease = x => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;
function mat(color, extra = {}) {
  const m = new T.MeshStandardMaterial({ color, roughness: 0.75, transparent: true, opacity: 1, ...extra });
  m.depthTest = false;
  m.depthWrite = false;
  return m;
}
function part(parent, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const o = new T.Mesh(geo, m);
  o.position.set(...pos);
  o.rotation.set(...rot);
  o.scale.set(...scale);
  o.renderOrder = 998;
  o.frustumCulled = false;
  parent.add(o);
  return o;
}
// a forelimb: a forearm tapering to the wrist and flattened like a real one, a ridge of fur tufts along its top, a
// broad paw with a knuckle over each of three long hooked claws (0.61.9: the plain tube read as a sausage)
function makeLimb(side, hide, pale, claw, dark) {
  const g = new T.Group();
  part(g, new T.CylinderGeometry(0.05, 0.095, 0.55, 12), hide, [0, 0, 0.27], [Math.PI / 2, 0, 0], [1.25, 1, 0.8]);
  part(g, new T.CylinderGeometry(0.035, 0.07, 0.5, 10), pale, [0, -0.03, 0.27], [Math.PI / 2, 0, 0], [1.2, 1, 0.6]);
  for (let i = 0; i < 6; i++)
    part(
      g,
      new T.ConeGeometry(0.022 - i * 0.001, 0.07, 5),
      dark,
      [side * 0.01, 0.055 + i * 0.006, 0.05 + i * 0.075],
      [-1.1, 0, side * 0.15]
    );
  const paw = new T.Group();
  paw.position.set(0, 0, -0.02);
  g.add(paw);
  part(paw, new T.SphereGeometry(0.08, 14, 10), hide, [0, 0, 0], [0, 0, 0], [1.3, 0.62, 1.15]);
  part(paw, new T.SphereGeometry(0.055, 10, 8), pale, [0, -0.03, -0.01], [0, 0, 0], [1.3, 0.4, 1]);
  const claws = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.045 + side * 0.006;
    part(paw, new T.SphereGeometry(0.026, 9, 7), hide, [x, 0.008, -0.07], [0, 0, 0], [1, 0.8, 1.2]);
    // a claw: a long cone, bent down at the tip by a second, shorter one
    const c = new T.Group();
    c.position.set(x, 0, -0.095);
    c.rotation.set(-0.25, 0, (i - 1) * -0.1);
    paw.add(c);
    part(c, new T.ConeGeometry(0.016, 0.11, 8), claw, [0, 0, -0.04], [-Math.PI / 2, 0, 0]);
    part(c, new T.ConeGeometry(0.009, 0.05, 6), claw, [0, -0.018, -0.1], [-Math.PI / 2 - 0.9, 0, 0]);
    claws.push(c);
  }
  g.userData.paw = paw;
  g.userData.claws = claws;
  return g;
}
export class BeastView {
  constructor(camera) {
    this.root = new T.Group();
    this.root.visible = false;
    camera.add(this.root);
    this.hide = mat(0x8a7a66);
    this.pale = mat(0xb0a28c, { roughness: 0.95 });
    this.claw = mat(0xf2ead8, { roughness: 0.35, metalness: 0.1, emissive: 0x000000 });
    this.dark = mat(0x5a4c3e, { roughness: 0.9 });
    this.right = makeLimb(1, this.hide, this.pale, this.claw, this.dark);
    this.left = makeLimb(-1, this.hide, this.pale, this.claw, this.dark);
    // the ridge of its snout, low in the middle of the view, and the teeth that show when it bites
    this.snout = new T.Group();
    part(this.snout, new T.SphereGeometry(0.16, 16, 10), this.hide, [0, 0, 0], [0, 0, 0], [1, 0.42, 1.6]);
    this.teeth = new T.Group();
    for (let i = 0; i < 6; i++)
      part(
        this.teeth,
        new T.ConeGeometry(0.011, 0.05, 6),
        this.claw,
        [(i - 2.5) * 0.034, -0.05, -0.14 + Math.abs(i - 2.5) * 0.02],
        [Math.PI, 0, 0]
      );
    this.snout.add(this.teeth);
    this.root.add(this.right, this.left, this.snout);
    this.glow = new T.PointLight(0xffffff, 0, 1.4, 2);
    this.glow.position.set(0, -0.15, -0.5);
    this.root.add(this.glow);
    // 0.61.9: what a skill throws out of it, in the skill's colour — a gout of breath from the snout (flame, frost,
    // venom, a roar), crackling streaks (thunder), motes rising round the paws (hardening, regrowth)
    const puff = document.createElement('canvas');
    puff.width = puff.height = 64;
    const g = puff.getContext('2d'),
      grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new T.CanvasTexture(puff),
      quad = new T.PlaneGeometry(1, 1);
    this.motes = [];
    for (let i = 0; i < 28; i++) {
      const m = new T.Mesh(
        quad,
        new T.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0,
          depthTest: false,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      m.renderOrder = 999;
      m.frustumCulled = false;
      m.visible = false;
      m.userData = { life: 0, max: 1, v: new T.Vector3(), grow: 0, jitter: 0 };
      this.root.add(m);
      this.motes.push(m);
    }
    this.t = 0;
    this.act = null;
    this.beastId = null;
  }
  // its colours, from its body: the largest-looking material for the hide, a lighter shade for the underside
  dress(mesh, id) {
    if (!mesh || this.beastId === id) return;
    this.beastId = id;
    let best = null,
      bestN = 0;
    mesh.traverse(o => {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!o.isMesh || !m?.color) return;
      const n = o.geometry?.attributes?.position?.count || 0;
      if (n > bestN) {
        bestN = n;
        best = m;
      }
    });
    const c = best ? best.color.clone() : new T.Color(0x8a7a66);
    this.hide.color.copy(c);
    this.pale.color.copy(c).lerp(new T.Color(0xf4e6cc), 0.3);
    this.dark.color.copy(c).multiplyScalar(0.62);
  }
  play(kind, e = {}) {
    if (kind === 'enter' || kind === 'leave' || kind === 'ko') {
      this.act = null;
      for (const m of this.motes) m.visible = false;
      return;
    }
    const dur = { slash: e.heavy ? 0.42 : 0.28, skill: 0.55, dodge: 0.32, hurt: 0.3, perfect: 0.4 }[kind];
    if (!dur) return;
    const side = kind === 'slash' && !e.heavy ? ((e.combo || 1) % 2 ? 1 : -1) : 0;
    this.act = { kind, e, t: 0, dur, side, color: e.color ? new T.Color(e.color) : null };
    if (kind === 'skill') this.burst(e.skill, this.act.color || new T.Color(0xffffff));
  }
  burst(skill, color) {
    const self = skill === 'guard' || skill === 'heal',
      zap = skill === 'thunder',
      claws = skill === 'dash' || skill === 'tail' || skill === 'jaw';
    if (claws) return; // those are a lunge and a bite: the paws and teeth carry them
    let n = 0;
    for (const m of this.motes) {
      if (n >= (zap ? 14 : 22)) break;
      n++;
      const u = m.userData,
        r = Math.random,
        side = r() < 0.5 ? -1 : 1;
      m.visible = true;
      m.material.color.copy(color);
      if (self) {
        m.position.set(side * (0.3 + r() * 0.2), -0.3 + r() * 0.1, -0.6 - r() * 0.1);
        u.v.set((r() - 0.5) * 0.05, 0.25 + r() * 0.25, 0);
        u.max = 0.6 + r() * 0.4;
        u.grow = 0.02;
        m.scale.setScalar(0.05 + r() * 0.04);
      } else if (zap) {
        m.position.set((r() - 0.5) * 0.1, -0.2, -0.7);
        u.v.set((r() - 0.5) * 0.9, (r() - 0.3) * 0.6, -2.5 - r() * 2);
        u.max = 0.18 + r() * 0.15;
        u.grow = 0;
        m.scale.set(0.025, 0.18 + r() * 0.12, 1);
      } else {
        // breath: out of the mouth, spreading as it goes
        m.position.set((r() - 0.5) * 0.08, -0.2 + (r() - 0.5) * 0.05, -0.68);
        u.v.set((r() - 0.5) * 0.6, (r() - 0.1) * 0.3, -1.2 - r() * 1.0);
        u.max = 0.35 + r() * 0.3;
        u.grow = 1.4 + r() * 0.8;
        m.scale.setScalar(0.1 + r() * 0.08);
      }
      u.jitter = zap ? 1 : 0;
      u.life = -r() * (zap ? 0.15 : 0.12); // a short stagger so it pours out instead of popping
    }
  }
  tickMotes(dt) {
    for (const m of this.motes) {
      if (!m.visible) continue;
      const u = m.userData;
      u.life += dt;
      if (u.life < 0) {
        m.material.opacity = 0;
        continue;
      }
      const f = u.life / u.max;
      if (f >= 1) {
        m.visible = false;
        continue;
      }
      m.position.addScaledVector(u.v, dt);
      if (u.jitter) {
        m.position.x += (Math.random() - 0.5) * 0.04;
        m.rotation.z = (Math.random() - 0.5) * 1.2;
      } else m.scale.multiplyScalar(1 + u.grow * dt);
      m.material.opacity = (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85) * 0.95;
    }
  }
  // k: how far into its eyes the view is (0 out, 1 fully in); moving: how fast it is going, 0..1
  update(dt, k, moving = 0) {
    this.root.visible = k > 0.6;
    if (k <= 0) this.beastId = null; // dressed afresh next bond (it may have evolved)
    if (!this.root.visible) return;
    this.t += dt;
    const R = this.right,
      L = this.left,
      S = this.snout,
      rise = ease((k - 0.6) / 0.4),
      gait = Math.sin(this.t * 9) * moving,
      breathe = Math.sin(this.t * 2.2) * 0.006;
    // rest: the paws low at either side, the snout low in the middle; all rise in as the bond forms
    const low = lerp(-0.62, 0, rise);
    // (high enough at the sides to clear the bar of tools along the bottom of the screen)
    R.position.set(0.44, -0.2 + low + breathe + gait * 0.025, -0.62 - gait * 0.03);
    L.position.set(-0.44, -0.2 + low + breathe - gait * 0.025, -0.62 + gait * 0.03);
    R.rotation.set(-0.15, 0.25, -0.35);
    L.rotation.set(-0.15, -0.25, 0.35);
    S.position.set(0, -0.42 + low + breathe * 0.6, -0.55);
    S.rotation.set(0.12, 0, 0);
    this.teeth.visible = false;
    this.glow.intensity = 0;
    this.claw.emissive.setRGB(0, 0, 0);
    const A = this.act;
    if (A) {
      A.t += dt;
      const p = Math.min(1, A.t / A.dur);
      switch (A.kind) {
        case 'slash': {
          // wind out, rake across the view, settle back
          const wind = ease(p / 0.25),
            rake = ease((p - 0.2) / 0.35),
            back = ease((p - 0.65) / 0.35),
            swing = (limb, s) => {
              const out = wind * (1 - rake),
                across = rake * (1 - back);
              limb.position.x += s * (out * 0.1 - across * 0.62);
              limb.position.y += out * 0.16 + across * 0.12;
              limb.position.z -= across * 0.22;
              limb.rotation.z += s * (-out * 0.6 + across * 1.1);
              limb.rotation.x -= across * 0.5;
            };
          if (A.side >= 0) swing(R, 1);
          if (A.side <= 0) swing(L, -1);
          if (A.e.heavy || A.e.beat) {
            this.claw.emissive.set(A.e.beat ? 0xffd27a : 0xffffff);
            this.claw.emissiveIntensity = (1 - p) * 0.9;
          }
          break;
        }
        case 'skill': {
          // the snout lifts and the jaws snap, lit in the skill's colour; the paws brace
          const snap = Math.sin(Math.min(1, p / 0.6) * Math.PI);
          S.position.y += snap * 0.12;
          S.position.z -= snap * 0.08;
          S.rotation.x -= snap * 0.35;
          this.teeth.visible = snap > 0.15;
          R.position.y -= snap * 0.05;
          L.position.y -= snap * 0.05;
          if (A.color) {
            this.glow.color.copy(A.color);
            this.claw.emissive.copy(A.color);
            this.claw.emissiveIntensity = snap * 0.8;
          }
          this.glow.intensity = snap * 3;
          break;
        }
        case 'dodge':
        case 'perfect': {
          // a lurch: everything swings down and aside, then back
          const l = Math.sin(p * Math.PI);
          for (const o of [R, L, S]) {
            o.position.y -= l * 0.14;
            o.position.x += l * 0.06;
          }
          if (A.kind === 'perfect') {
            this.claw.emissive.set(0xffffff);
            this.claw.emissiveIntensity = l * 0.7;
          }
          break;
        }
        case 'hurt': {
          // struck: a jerk back and a shudder
          const j = (1 - p) * (1 - p);
          for (const o of [R, L, S]) {
            o.position.z += j * 0.1;
            o.position.y -= j * 0.06;
            o.position.x += Math.sin(A.t * 70) * j * 0.02;
          }
          break;
        }
      }
      if (p >= 1) this.act = null;
    }
    this.tickMotes(dt);
  }
}
