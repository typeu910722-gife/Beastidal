// First-person hands (0.32). Whenever you use something — pick a thing up, eat, drink, throw bait, draw and use a
// contract scroll, open a carry cage, call a beast out of its contract, evolve one, cast a line — two hands come up
// into view and do it, then drop out of sight again. They hang off the camera and draw on top of the world, so a
// wall or a hull never cuts through them.
import * as T from './vendor/three.module.min.js';

const ease = x => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;
function std(color, extra = {}) {
  // drawn in the transparent pass (last, after the water and the sky), on top of everything
  const m = new T.MeshStandardMaterial({ color, roughness: 0.7, transparent: true, opacity: 1, ...extra });
  m.depthTest = false;
  m.depthWrite = false;
  return m;
}
function part(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new T.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.renderOrder = 999;
  m.frustumCulled = false;
  parent.add(m);
  return m;
}
// an arm: a shirt sleeve, a wrist, a hand with a thumb
function makeArm(side, skin, sleeve) {
  const arm = new T.Group();
  part(arm, new T.CylinderGeometry(0.045, 0.055, 0.42, 10), sleeve, [0, 0, 0.21], [Math.PI / 2, 0, 0]);
  part(arm, new T.CylinderGeometry(0.034, 0.038, 0.08, 10), skin, [0, 0, -0.02], [Math.PI / 2, 0, 0]);
  const hand = new T.Group();
  hand.position.set(0, 0, -0.1);
  arm.add(hand);
  part(hand, new T.BoxGeometry(0.075, 0.03, 0.09), skin, [0, 0, 0]);
  for (let i = 0; i < 4; i++)
    part(
      hand,
      new T.CapsuleGeometry(0.009, 0.045, 3, 6),
      skin,
      [(i - 1.5) * 0.018, -0.004, -0.07],
      [Math.PI / 2 + 0.25, 0, 0]
    );
  part(hand, new T.CapsuleGeometry(0.01, 0.035, 3, 6), skin, [side * 0.045, 0, -0.02], [Math.PI / 2, 0, side * 0.9]);
  arm.userData.hand = hand;
  return arm;
}
function makeProps() {
  const props = {},
    parchment = std(0xe8d8b0, { roughness: 0.9, side: T.DoubleSide }),
    rune = std(0xffe2a0, { emissive: 0xffc860, emissiveIntensity: 1.1, side: T.DoubleSide }),
    wood = std(0x7a5534),
    metal = std(0x9aa2a8, { metalness: 0.6, roughness: 0.35 });
  // a contract scroll: two rollers and an unrolled sheet with burning runes
  const scroll = new T.Group();
  part(scroll, new T.PlaneGeometry(0.22, 0.16), parchment, [0, 0, 0]);
  for (let i = 0; i < 5; i++)
    part(scroll, new T.PlaneGeometry(0.16 - i * 0.02, 0.008), rune, [0, 0.05 - i * 0.022, 0.001]);
  part(scroll, new T.RingGeometry(0.025, 0.032, 24), rune, [0, -0.035, 0.002]);
  for (const x of [-0.115, 0.115]) part(scroll, new T.CylinderGeometry(0.012, 0.012, 0.19, 8), wood, [x, 0, 0]);
  const glow = part(
    scroll,
    new T.PlaneGeometry(0.26, 0.2),
    new T.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide
    }),
    [0, 0, -0.01]
  );
  scroll.userData.glow = glow;
  props.scroll = scroll;
  // a carry cage
  const cage = new T.Group();
  part(cage, new T.BoxGeometry(0.16, 0.012, 0.12), metal, [0, -0.06, 0]);
  part(cage, new T.BoxGeometry(0.16, 0.012, 0.12), metal, [0, 0.06, 0]);
  for (const x of [-0.075, 0.075])
    for (const z of [-0.055, 0.055]) part(cage, new T.CylinderGeometry(0.005, 0.005, 0.12, 6), metal, [x, 0, z]);
  for (let i = 0; i < 5; i++)
    part(cage, new T.CylinderGeometry(0.003, 0.003, 0.12, 4), metal, [-0.06 + i * 0.03, 0, 0.055]);
  const door = new T.Group();
  door.position.set(-0.075, 0, -0.055);
  cage.add(door);
  for (let i = 0; i < 4; i++)
    part(door, new T.CylinderGeometry(0.003, 0.003, 0.12, 4), metal, [0.02 + i * 0.035, 0, 0]);
  cage.userData.door = door;
  props.cage = cage;
  // bait: a small silver fish
  const bait = new T.Group();
  part(
    bait,
    new T.SphereGeometry(0.03, 10, 8),
    std(0xb8c4c8, { metalness: 0.4, roughness: 0.3 }),
    [0, 0, 0],
    [0, 0, 0],
    [0.6, 0.7, 1.6]
  );
  part(bait, new T.ConeGeometry(0.025, 0.04, 4), std(0x9aa8ad), [0, 0, 0.06], [-Math.PI / 2, 0, 0], [1, 1, 0.3]);
  props.bait = bait;
  // a ration brick and a water bottle
  const food = new T.Group();
  part(food, new T.BoxGeometry(0.09, 0.05, 0.06), std(0xb08a50, { roughness: 0.95 }));
  part(food, new T.BoxGeometry(0.092, 0.012, 0.062), std(0x5a7a5a), [0, 0.012, 0]);
  props.food = food;
  const water = new T.Group();
  part(
    water,
    new T.CylinderGeometry(0.03, 0.032, 0.14, 12),
    std(0x8fd0e0, { transparent: true, opacity: 0.85, roughness: 0.1 })
  );
  part(water, new T.CylinderGeometry(0.012, 0.012, 0.03, 8), std(0x3a6a7a), [0, 0.085, 0]);
  props.water = water;
  // a bundle of whatever you picked up
  const item = new T.Group();
  part(item, new T.BoxGeometry(0.08, 0.06, 0.08), wood, [0, 0, 0], [0.3, 0.4, 0]);
  part(item, new T.CylinderGeometry(0.012, 0.012, 0.12, 6), std(0xa8957a), [0.02, 0.02, 0], [0, 0, 1.2]);
  props.item = item;
  // a fishing rod
  const rod = new T.Group();
  part(rod, new T.CylinderGeometry(0.006, 0.014, 0.9, 6), wood, [0, 0.45, 0]);
  part(rod, new T.TorusGeometry(0.025, 0.008, 6, 12), metal, [0.02, 0.08, 0], [0, Math.PI / 2, 0]);
  props.rod = rod;
  return props;
}
// each action: a duration, the prop (in the right hand) and how the arms move with time k (0 → 1)
const ACTIONS = {
  pickup: { dur: 0.75, prop: 'item', propFrom: 0.45 },
  eat: { dur: 0.95, prop: 'food' },
  drink: { dur: 0.95, prop: 'water' },
  feed: { dur: 0.8, prop: 'bait', propUntil: 0.55 },
  contract: { dur: 1.45, prop: 'scroll', twoHands: true, glow: 0xffd27a, burn: true },
  evolve: { dur: 1.7, prop: 'scroll', twoHands: true, glow: 0xc080ff, burn: true },
  summon: { dur: 1.2, prop: 'scroll', twoHands: true, glow: 0xffe8a0 },
  cage: { dur: 1.0, prop: 'cage' },
  fish: { dur: 0.85, prop: 'rod' }
};
export class ViewModel {
  constructor(camera) {
    this.camera = camera;
    this.root = new T.Group();
    this.root.visible = false;
    camera.add(this.root);
    const skin = std(0xe0b090, { roughness: 0.8 }),
      sleeve = std(0xf2f0ea, { roughness: 0.85 });
    this.right = makeArm(1, skin, sleeve);
    this.left = makeArm(-1, skin, sleeve);
    this.root.add(this.right, this.left);
    this.props = makeProps();
    for (const p of Object.values(this.props)) {
      p.visible = false;
      this.right.userData.hand.add(p);
    }
    this.light = new T.PointLight(0xffd27a, 0, 1.5, 2);
    this.light.position.set(0, -0.1, -0.4);
    this.root.add(this.light);
    this.act = null;
  }
  play(name) {
    const a = ACTIONS[name];
    if (!a) return;
    this.act = { name, a, t: 0 };
    this.root.visible = true;
    for (const [k, p] of Object.entries(this.props)) p.visible = k === a.prop;
    const p = this.props[a.prop];
    p.position.set(0, 0.03, -0.08);
    p.rotation.set(0, 0, 0);
    p.scale.setScalar(1);
    if (a.prop === 'scroll') {
      // held up and tilted toward you so you read it
      p.position.set(0.05, 0.07, -0.12);
      p.rotation.set(0.25, 0, 0);
      p.userData.glow.material.color.set(a.glow || 0xffd27a);
    }
    if (a.prop === 'rod') p.rotation.set(-0.4, 0, 0);
  }
  get busy() {
    return !!this.act;
  }
  update(dt, enabled = true) {
    if (!this.act) return;
    if (!enabled) {
      this.act = null;
      this.root.visible = false;
      return;
    }
    const A = this.act,
      a = A.a;
    A.t += dt;
    const k = Math.min(1, A.t / a.dur),
      up = ease(k / 0.22) * (1 - ease((k - 0.82) / 0.18)); // raise, act, lower
    const R = this.right,
      L = this.left,
      p = this.props[a.prop],
      bob = Math.sin(A.t * 9) * 0.004;
    // resting pose, below the view: the arms rise into it
    R.position.set(0.17, lerp(-0.42, -0.2, up) + bob, -0.42);
    R.rotation.set(-0.15, 0.12, 0);
    L.position.set(-0.17, lerp(-0.42, -0.22, a.twoHands ? up : 0), -0.44);
    L.rotation.set(-0.15, -0.12, 0);
    L.visible = !!a.twoHands;
    this.light.intensity = 0;
    const mid = ease((k - 0.25) / 0.45);
    switch (A.name) {
      case 'pickup': {
        // reach out and down, close the hand, pull it back with the thing
        const reach = Math.sin(Math.min(1, k / 0.6) * Math.PI);
        R.position.z -= reach * 0.18;
        R.position.y -= reach * 0.1;
        R.rotation.x = -0.15 - reach * 0.6;
        p.visible = k > a.propFrom;
        break;
      }
      case 'eat':
      case 'drink':
        // bring it up to the mouth (and tip the bottle)
        R.position.x = lerp(0.17, 0.05, mid);
        R.position.y += mid * 0.12;
        R.position.z = lerp(-0.42, -0.2, mid);
        R.rotation.x = -0.15 + mid * (A.name === 'drink' ? 1.1 : 0.6);
        break;
      case 'feed': {
        // wind back, then flick it forward; it leaves the hand on the throw
        const wind = ease(k / 0.35),
          throwK = ease((k - 0.35) / 0.2);
        R.rotation.x = -0.15 + wind * 0.9 - throwK * 1.6;
        R.position.y += wind * 0.05;
        R.position.z -= throwK * 0.1;
        if (k > a.propUntil) {
          // the bait flies off in an arc
          const f = (k - a.propUntil) / (1 - a.propUntil);
          p.position.set(0, 0.03 + f * 0.25 - f * f * 0.5, -0.08 - f * 1.4);
          p.scale.setScalar(Math.max(0.01, 1 - f));
        }
        break;
      }
      case 'contract':
      case 'evolve':
      case 'summon': {
        // draw the scroll and open it in both hands; it glows, and (contract / evolve) burns into light
        R.position.x = lerp(0.17, 0.1, mid);
        L.position.x = lerp(-0.17, -0.1, mid);
        R.position.y += mid * 0.08;
        L.position.y += mid * 0.08;
        R.rotation.z = -mid * 0.3;
        L.rotation.z = mid * 0.3;
        const glow = ease((k - 0.4) / 0.3) * (1 - ease((k - 0.85) / 0.15));
        p.userData.glow.material.opacity = glow * 0.3;
        p.position.x = -0.1 * mid;
        p.scale.setScalar(1 + mid * 0.15);
        this.light.color.set(a.glow || 0xffd27a);
        this.light.intensity = glow * 1.4;
        if (a.burn && k > 0.72) p.scale.setScalar(Math.max(0.01, (1 + mid * 0.15) * (1 - (k - 0.72) / 0.2)));
        break;
      }
      case 'cage': {
        // hold the cage out and swing its door open
        R.position.z -= mid * 0.12;
        R.position.x = lerp(0.17, 0.08, mid);
        p.userData.door.rotation.y = -ease((k - 0.45) / 0.25) * 1.7;
        this.light.color.set(0xa8f0ff);
        this.light.intensity = ease((k - 0.5) / 0.15) * (1 - ease((k - 0.75) / 0.2)) * 2.5;
        break;
      }
      case 'fish': {
        // the cast: back over the shoulder, then whip forward
        const back = ease(k / 0.35),
          fwd = ease((k - 0.35) / 0.25);
        p.rotation.x = -0.4 + back * 1.1 - fwd * 1.9;
        R.position.y += back * 0.06;
        break;
      }
    }
    if (k >= 1) {
      this.act = null;
      this.root.visible = false;
    }
  }
}
