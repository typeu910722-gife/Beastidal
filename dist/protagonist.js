// The protagonist's body: a rigged, animated character model (models/protagonist.glb). It loads in the background;
// until it arrives (or if it fails to), the procedural figure from human.js stands in. Each figure made with
// human.js is "dressed" by dressHuman(): the model is cloned with its own skeleton and mixer, and animateHuman()
// then drives the model's clips (idle / walk / run) instead of the procedural joints. Poses the clips do not cover
// (sitting in the boat, riding a beast) are set bone by bone on top of the idle clip.
import * as T from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from './vendor/addons/utils/SkeletonUtils.js';

const HEIGHT = 1.76; // metres, soles to crown
let source = null,
  clips = [],
  fit = 1,
  failed = false;
const waiting = new Set();

export function loadProtagonist(url = './models/protagonist.glb') {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new GLTFLoader().loadAsync(url).then(
    gltf => {
      source = gltf.scene;
      clips = gltf.animations;
      source.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(source);
      fit = HEIGHT / Math.max(0.1, box.max.y - box.min.y);
      for (const h of waiting) attach(h);
      waiting.clear();
      return source;
    },
    err => {
      failed = true;
      console.warn('Protagonist model unavailable, keeping the procedural figure.', err);
      return null;
    }
  );
}

// Give a human.js figure the real body (now, or as soon as the model has loaded).
export function dressHuman(h) {
  if (source) attach(h);
  else if (!failed) waiting.add(h);
  return h;
}

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
for (const s of ['Left', 'Right']) BONES.push(s + 'UpLeg', s + 'Leg', s + 'Foot', s + 'Arm', s + 'ForeArm', s + 'Hand');
function attach(h) {
  if (h.userData.model) return;
  const m = cloneSkinned(source);
  m.scale.multiplyScalar(fit);
  m.rotation.y = Math.PI; // the model faces -z; the game's forward is +z
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
  h.userData.model = { root: m, mixer, actions, bones, rest: {} };
  for (const [k, b] of Object.entries(bones)) h.userData.model.rest[k] = b.quaternion.clone();
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const q = new T.Quaternion(),
  e = new T.Euler();
// rotate a bone by extra Euler angles (radians) on top of whatever the clip set this frame
function bend(bone, x = 0, y = 0, z = 0) {
  if (!bone) return;
  q.setFromEuler(e.set(x, y, z));
  bone.quaternion.multiply(q);
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
  md.root.position.y = 0;
  if (seated) {
    const ride = mode === 'ride',
      row = mode === 'row' ? Math.sin((md.t = (md.t || 0) + dt) * 2.2) * Math.min(1, speed * 0.4) : 0;
    // hips drop to the seat; thighs forward, knees folded, hands forward on the knees (or pulling an oar).
    // Bone axes in this rig (model facing +z): thigh -x swings forward, knee +x folds, left arm -x / right arm +x
    // swing forward, spine +x leans forward.
    md.root.position.y = ride ? 0 : -0.74;
    for (const s of ['Left', 'Right']) {
      const side = s === 'Left' ? 1 : -1;
      bend(B[s + 'UpLeg'], -1.5, 0, -side * (ride ? 0.5 : 0.08));
      bend(B[s + 'Leg'], ride ? 1.4 : 1.7, 0, 0);
      bend(B[s + 'Arm'], -side * (0.6 + row * 0.5), 0, 0);
      bend(B[s + 'ForeArm'], -side * (0.8 - row * 0.4), 0, 0);
    }
    bend(B.Spine, 0.12 + row * 0.25, 0, 0);
  }
  return true;
}
