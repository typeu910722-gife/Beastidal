// The protagonist's body: a rigged, animated character model (models/protagonist.glb). It loads in the background;
// until it arrives (or if it fails to), the procedural figure from human.js stands in. Each figure made with
// human.js is "dressed" by dressHuman(): the model is cloned with its own skeleton and mixer, and animateHuman()
// then drives the model's clips (idle / walk / run) instead of the procedural joints. Poses the clips do not cover
// (sitting in the boat, riding a beast) are set bone by bone on top of the idle clip.
import * as T from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from './vendor/addons/utils/SkeletonUtils.js';

// Two looks, both office workers in shirt and suit (Microsoft Rocketbox, MIT). Their rigs were renamed to Mixamo bone
// names and given Idle / Walk / Run clips offline (retargeted from Mixamo motions), so the code below treats both
// the same way.
export const LOOKS = {
  male: { url: 'protagonist.glb', height: 1.78 },
  female: { url: 'protagonist-female.glb', height: 1.68 }
};
const loaded = {},
  pending = {},
  failed = {};
let base = './models/';
const waiting = new Map(); // figure -> look it is waiting for

function loadLook(look) {
  if (loaded[look]) return Promise.resolve(loaded[look]);
  if (pending[look]) return pending[look];
  const spec = LOOKS[look];
  pending[look] = new GLTFLoader()
    .loadAsync(base + spec.url)
    .then(gltf => {
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(scene);
      const clips = gltf.animations.filter(c => /^(idle|walk|run)$/i.test(c.name));
      return (loaded[look] = { scene, clips, fit: spec.height / Math.max(0.1, box.max.y - box.min.y) });
    })
    .catch(err => {
      failed[look] = true;
      console.warn(`Protagonist model "${look}" unavailable, keeping the procedural figure.`, err);
      return null;
    });
  return pending[look];
}
// Which way a rig faces in its file: +1 for +z, -1 for -z (from where its left leg sits).
function facing(scene) {
  scene.updateMatrixWorld(true);
  const l = new T.Vector3(),
    r = new T.Vector3();
  let L = null,
    R = null;
  scene.traverse(o => {
    if (o.isBone && /LeftUpLeg$/.test(o.name)) L = o;
    if (o.isBone && /RightUpLeg$/.test(o.name)) R = o;
  });
  if (!L || !R) return -1;
  L.getWorldPosition(l);
  R.getWorldPosition(r);
  return l.x > r.x ? 1 : -1; // facing +z, your left is +x
}
// Back-compat entry point: start loading the default look (the world calls this once).
export function loadProtagonist(url) {
  if (typeof document === 'undefined') return Promise.resolve(null);
  if (url) base = url.replace(/[^/]*$/, '');
  return loadLook('male');
}

// Give a human.js figure a real body (now, or as soon as that look has loaded). Calling it again with another
// look swaps the body.
export function dressHuman(h, look = 'male') {
  if (!LOOKS[look]) look = 'male';
  if (h.userData.model?.look === look) return h;
  if (typeof document === 'undefined') return h;
  waiting.set(h, look);
  loadLook(look).then(data => {
    if (waiting.get(h) !== look) return; // asked for another look meanwhile
    waiting.delete(h);
    if (data) attach(h, look, data);
  });
  return h;
}

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
for (const s of ['Left', 'Right']) BONES.push(s + 'UpLeg', s + 'Leg', s + 'Foot', s + 'Arm', s + 'ForeArm', s + 'Hand');
function attach(h, look, { scene, clips, fit }) {
  if (h.userData.model) {
    h.userData.model.mixer.stopAllAction();
    h.remove(h.userData.model.root);
    h.userData.model = null;
  }
  const m = cloneSkinned(scene);
  m.scale.multiplyScalar(fit);
  if (facing(scene) < 0) m.rotation.y = Math.PI; // the game's forward is +z
  m.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // skinned bounds do not follow the animation
    }
  });
  const bones = {};
  m.traverse(o => {
    const name = o.name.replace(/^mixamorig:?/, '');
    if (o.isBone && BONES.includes(name)) bones[name] = o;
  });
  const mixer = new T.AnimationMixer(m),
    action = name => {
      const clip = clips.find(c => c.name.toLowerCase() === name);
      if (!clip) return null;
      const a = mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(0);
      return a;
    };
  const actions = { idle: action('idle'), walk: action('walk'), run: action('run') };
  if (actions.idle) actions.idle.setEffectiveWeight(1);
  h.add(m);
  h.userData.J.hips.visible = false;
  // how high the hip joint sits when standing (figure units), to seat the model at a fixed height
  h.updateMatrixWorld(true);
  const hipH = bones.Hips ? h.worldToLocal(bones.Hips.getWorldPosition(new T.Vector3())).y : 0.95;
  h.userData.model = {
    look,
    root: m,
    mixer,
    actions,
    bones,
    hipH,
    t: 0,
    idle: { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0, next: 2 }
  };
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const AX = new T.Vector3(1, 0, 0),
  AY = new T.Vector3(0, 1, 0),
  AZ = new T.Vector3(0, 0, 1),
  hq = new T.Quaternion(),
  pq = new T.Quaternion(),
  rq = new T.Quaternion();
// Rotate a bone about an axis of the *figure's* frame (x right-to-left, y up, z forward), on top of whatever the
// clip set this frame, so poses work on any rig whatever its bone axes.
function bend(h, bone, axis, angle) {
  if (!bone || !angle) return;
  bone.parent.updateWorldMatrix(true, false);
  h.getWorldQuaternion(hq);
  bone.parent.getWorldQuaternion(pq);
  pq.premultiply(hq.invert()); // parent rotation in the figure's frame
  rq.setFromAxisAngle(axis, angle);
  bone.quaternion.premultiply(pq.clone().invert().multiply(rq).multiply(pq));
}

// Small signs of life while standing still, layered on the idle clip: breathing, a slow shift of weight from foot
// to foot, and now and then a glance around. weight 0..1 fades it out as the figure starts to walk.
function idleLife(h, md, dt, weight) {
  if (weight < 0.02) return;
  const B = md.bones,
    t = md.t,
    I = md.idle;
  // pick somewhere new to look every few seconds, and ease the head toward it
  I.next -= dt;
  if (I.next <= 0) {
    const glance = Math.random() < 0.6;
    I.toYaw = glance ? (Math.random() * 2 - 1) * 0.7 : 0;
    I.toPitch = glance ? (Math.random() * 2 - 1) * 0.15 - 0.05 : 0;
    I.next = 2.5 + Math.random() * 4;
  }
  const ease = 1 - Math.exp(-dt * 2.2);
  I.yaw += (I.toYaw - I.yaw) * ease;
  I.pitch += (I.toPitch - I.pitch) * ease;
  const breathe = Math.sin(t * 1.7),
    sway = Math.sin(t * 0.45);
  bend(h, B.Spine1, AX, breathe * 0.025 * weight);
  bend(h, B.Spine, AZ, sway * 0.03 * weight);
  bend(h, B.Neck, AY, I.yaw * 0.4 * weight);
  bend(h, B.Head, AY, I.yaw * 0.6 * weight);
  bend(h, B.Head, AX, I.pitch * weight);
  for (const s of ['Left', 'Right']) {
    const side = s === 'Left' ? 1 : -1;
    bend(h, B[s + 'Arm'], AZ, (-side * 0.04 + breathe * 0.015 * side) * weight);
  }
}

// Returns true when the model handled this frame (otherwise human.js animates the procedural figure).
export function animateModel(h, dt, { speed = 0, mode = 'walk' } = {}) {
  const md = h.userData.model;
  if (!md) return false;
  const A = md.actions,
    B = md.bones,
    seated = mode === 'sit' || mode === 'row' || mode === 'ride';
  const run = seated ? 0 : smooth(3.2, 4.4, speed),
    move = seated ? 0 : smooth(0.08, 0.9, speed),
    w = { idle: 1 - move, walk: move * (1 - run), run: move * run };
  for (const k of ['idle', 'walk', 'run']) if (A[k]) A[k].setEffectiveWeight(w[k]);
  // match the stride to the ground speed (the clips walk ~1.6 m/s and run ~4.6 m/s)
  if (A.walk) A.walk.setEffectiveTimeScale(Math.min(1.8, Math.max(0.6, speed / 1.6)));
  if (A.run) A.run.setEffectiveTimeScale(Math.min(1.6, Math.max(0.7, speed / 4.6)));
  md.mixer.update(dt);
  md.t += dt;
  md.root.position.y = 0;
  if (seated) {
    const ride = mode === 'ride',
      row = mode === 'row' ? Math.sin(md.t * 2.2) * Math.min(1, speed * 0.4) : 0;
    // hips on the seat (the hip joint 0.28 above the figure's origin, whatever the model's size); thighs forward,
    // knees bent so the feet rest on the boards in front instead of sinking through them; hands on the knees (or
    // pulling an oar), a slight forward lean. Axes are the figure's own: x across (to its left), z forward.
    md.root.position.y = ride ? 0 : 0.28 - md.hipH;
    bend(h, B.Spine, AX, 0.12 + row * 0.25);
    for (const s of ['Left', 'Right']) {
      const side = s === 'Left' ? 1 : -1;
      bend(h, B[s + 'UpLeg'], AX, -1.5);
      bend(h, B[s + 'UpLeg'], AZ, side * (ride ? 0.45 : 0.08));
      bend(h, B[s + 'Leg'], AX, ride ? 1.4 : 1.45);
      bend(h, B[s + 'Foot'], AX, ride ? 0 : -0.2);
      bend(h, B[s + 'Arm'], AX, -(0.4 + row * 0.5));
      bend(h, B[s + 'ForeArm'], AX, -(0.55 - row * 0.3));
    }
    idleLife(h, md, dt, 0.5);
  } else idleLife(h, md, dt, 1 - move);
  return true;
}
