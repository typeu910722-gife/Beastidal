// 0.61 契合: fighting from inside your beast — the bond forms and lets go, foes go for the beast and never your body,
// a held guard halves your blows outside a 破綻, a perfect dodge opens a counter, and mashing breaks the rhythm.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTaming } from '../dist/taming.js';
import {
  tickCombat,
  resetCombat,
  basicAttack,
  dodge,
  moveSync,
  syncOn,
  syncLive,
  SYNC,
  normalizeCombat
} from '../dist/combat.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
let ids = 0;
function world() {
  const s = createState(25);
  s.tamed = [];
  normalizeExpansion(s);
  normalizeTaming(s);
  resetCombat(s);
  Object.assign(s.player, { x: 0, z: 0, heading: 0, mode: 'boat' });
  s.wild = [];
  s.elapsed = 100;
  const genome = makeGenome(300, 0, 'sea');
  genome.bs = [];
  const p = { id: 'p1', genome, name: '測試獸', generation: 1, parents: [], bond: 50, stamina: 100, health: 100 };
  p.kind = 'beast';
  p.team = true;
  s.tamed.push(p);
  s.expedition.activeId = p.id;
  return { s, p };
}
const foe = (s, x, z, extra = {}) => {
  const genome = makeGenome(7, 0, 'sea');
  genome.bs = [];
  const w = { id: 'w' + ids++, x, z, homeX: x, homeZ: z, phase: 0, heading: 0, genome, trust: 0, hostile: true };
  Object.assign(w, extra);
  s.wild.push(w);
  return w;
};
const rng = () => 0.5;
const enter = s => {
  const ev = tickCombat(s, 0.016, { sync: true, rng });
  s.elapsed += SYNC.enter + 0.01;
  return ev;
};

test('The bond forms when a fight starts (only with env.sync), and lets go after the last foe', () => {
  const { s } = world();
  const w = foe(s, 0, 8);
  assert.equal(
    tickCombat(s, 0.016, { rng }).some(e => e.type === 'sync-on'),
    false
  );
  const ev = enter(s);
  assert.ok(ev.some(e => e.type === 'sync-on'));
  assert.ok(syncOn(s) && syncLive(s));
  s.wild = s.wild.filter(x => x !== w);
  let off = [];
  for (let i = 0; i < 40; i++) {
    s.elapsed += 0.1;
    off = off.concat(tickCombat(s, 0.1, { sync: true, rng }));
  }
  assert.ok(off.some(e => e.type === 'sync-off' && e.why === 'done'));
  assert.equal(syncOn(s), false);
});

test('Inside the beast you move it, within the tether; your body stays put', () => {
  const { s } = world();
  foe(s, 0, 12);
  enter(s);
  const c = normalizeCombat(s),
    x0 = c.ax;
  for (let i = 0; i < 10; i++) moveSync(s, 1, 0, 0.1, Math.PI / 2);
  assert.ok(c.ax > x0 + 5, 'it ran');
  assert.equal(s.player.x, 0);
  for (let i = 0; i < 100; i++) moveSync(s, 1, 0, 0.1, 0);
  assert.ok(Math.hypot(c.ax, c.az) <= SYNC.tether + 1e-6);
});

test('Foes go for the beast, never your entranced body, and hit it harder; it no longer fights on its own', () => {
  const { s, p } = world();
  const w = foe(s, 0, 2.5);
  enter(s);
  const c = normalizeCombat(s);
  // put the beast right beside your body, so a blow at it would catch you too
  c.ax = 0;
  c.az = 1;
  const before = s.vitals.health;
  let ev = [];
  for (let i = 0; i < 60; i++) {
    s.elapsed += 0.05;
    ev = ev.concat(tickCombat(s, 0.05, { sync: true, rng }));
  }
  assert.ok(
    ev.some(e => e.type === 'hit' && e.target === 'ally'),
    'the beast was struck'
  );
  assert.equal(s.vitals.health, before, 'your body was not');
  assert.ok(p.health < 100);
  assert.equal(
    ev.some(e => e.type === 'swing'),
    false,
    'no blows of its own'
  );
  assert.ok(w.hp === undefined || w.hp === w.maxHp);
});

test('A foe holding its guard takes half; in its 破綻 it takes it all', () => {
  const { s } = world();
  const w = foe(s, 0, 2.2);
  enter(s);
  const c = normalizeCombat(s);
  c.ax = 0;
  c.az = 0;
  c.aim = 0;
  w.hp = w.maxHp = 1000;
  w.ai = { state: 'approach', until: 0, next: 1e9 };
  const a = basicAttack(s, false, { rng: () => 0.9 }).events.find(e => e.type === 'hit');
  assert.ok(a.guarded);
  s.elapsed += 2;
  c.combo = { n: 0, until: -1 };
  w.ai.state = 'recover';
  w.ai.until = s.elapsed + 5;
  const b = basicAttack(s, false, { rng: () => 0.9 }).events.find(e => e.type === 'hit');
  assert.ok(!b.guarded && b.amount >= a.amount * 1.8, `${a.amount} → ${b.amount}`);
});

test('A dodge just before the blow lands is perfect, and the next blow is a counter', () => {
  const { s, p } = world();
  const w = foe(s, 0, 2.4);
  enter(s);
  const c = normalizeCombat(s);
  c.ax = 0;
  c.az = 0;
  w.hp = w.maxHp = 1000;
  // let it wind up a bite at the beast
  let ev = [];
  for (let i = 0; i < 40 && w.ai?.state !== 'windup'; i++) {
    s.elapsed += 0.05;
    tickCombat(s, 0.05, { sync: true, rng });
  }
  assert.equal(w.ai.state, 'windup');
  s.elapsed = w.ai.until - 0.1;
  assert.ok(dodge(s, 1, 0).ok);
  s.elapsed = w.ai.until + 0.01;
  ev = tickCombat(s, 0.01, { sync: true, rng });
  assert.ok(ev.some(e => e.type === 'perfect'));
  assert.equal(p.health, 100);
  // step back in and strike
  c.ax = w.x;
  c.az = w.z - 2;
  c.aim = 0;
  c.cd.basic = 0;
  const hit = basicAttack(s, false, { rng: () => 0.9 }).events.find(e => e.type === 'hit');
  assert.ok(hit && hit.counter && !hit.guarded);
});

test('A blow timed to the end of the last keeps the rhythm; mashing through the recovery breaks it', () => {
  const { s } = world();
  const w = foe(s, 0, 2.2);
  enter(s);
  const c = normalizeCombat(s);
  c.ax = 0;
  c.az = 0;
  c.aim = 0;
  w.hp = w.maxHp = 5000;
  w.ai = { state: 'approach', until: 0, next: 1e9 };
  const env = { rng: () => 0.9 };
  basicAttack(s, false, env);
  s.elapsed = c.cd.basic + 0.1;
  const timed = basicAttack(s, false, env).events.find(e => e.type === 'swing');
  assert.ok(timed.beat);
  // mash: press during the recovery, then again when it ends
  basicAttack(s, false, env);
  s.elapsed = c.cd.basic + 0.05;
  const mashed = basicAttack(s, false, env).events.find(e => e.type === 'swing');
  assert.equal(mashed.beat, false);
});

test('When the beast falls the bond breaks, and then the foes come for you', () => {
  const { s, p } = world();
  foe(s, 0, 2.5);
  enter(s);
  p.health = 1;
  const c = normalizeCombat(s);
  c.ax = 0;
  c.az = 1;
  let ev = [];
  for (let i = 0; i < 80 && syncOn(s); i++) {
    s.elapsed += 0.05;
    ev = ev.concat(tickCombat(s, 0.05, { sync: true, rng }));
  }
  assert.ok(ev.some(e => e.type === 'ko'));
  for (let i = 0; i < 5; i++) {
    s.elapsed += 0.05;
    ev = ev.concat(tickCombat(s, 0.05, { sync: true, rng }));
  }
  assert.ok(ev.some(e => e.type === 'sync-off' && e.why === 'ko'));
  assert.equal(syncOn(s), false);
});

console.log(`${n} sync tests passed.`);
