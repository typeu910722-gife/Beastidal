// 0.72 the rift fought in real time: its waves come out as foes on the wasteland, you and your beast fight them with
// the lake's combat, and the trial settles as before.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { makeGenome } from '../dist/genetics.js';
import { enterTown, toWorld } from '../dist/town.js';
import { normalizeChapter3, K_LOGS, LAYERS, RIFT } from '../dist/chapter3.js';
import { combatActive, tickCombat, basicAttack, foeStats, normalizeCombat } from '../dist/combat.js';
import { startRiftFight, tickRiftFight, riftFoes, riftStatus, ARENA_R, endRiftFight } from '../dist/rift-fight.js';
import { storyPanel } from '../dist/storynav.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const ready = (level = 4, genes) => {
  const s = normalizeTravel(createState(72));
  normalizeExpansion(s);
  enterTown(s);
  s.chapter2 = { stage: 5, since: 1, choice: 'truth' };
  const c = normalizeChapter3(s);
  c.outside = true;
  c.logs = K_LOGS.length;
  const g = makeGenome(7201, 1, 'land');
  if (genes) g.bs = genes;
  s.tamed = [{ id: 'p1', name: '小牙', genome: g, bond: 60, health: 100, level, xp: 0 }];
  s.expedition.activeId = 'p1';
  Object.assign(s.player, toWorld({ x: RIFT.x, z: RIFT.z + 14 }), { mode: 'foot', heading: Math.PI });
  return s;
};
const near = (s, f) => Math.hypot(f.x - s.player.x, f.z - s.player.z);
// a player who walks up to the nearest foe and keeps swinging (no dodging, no skills)
function play(s, seconds = 600) {
  const env = { rng: Math.random };
  const dt = 0.1;
  let last = null;
  for (let t = 0; t < seconds && s.rift?.active; t += dt) {
    s.elapsed += dt;
    const pet = s.tamed[0];
    pet.stamina = Math.min(100, (pet.stamina ?? 100) + dt * 0.12); // as expansion.js regains it
    tickCombat(s, dt, env);
    const foes = riftFoes(s);
    if (foes.length) {
      const f = foes.reduce((a, b) => (near(s, a) < near(s, b) ? a : b)),
        d = near(s, f);
      s.player.heading = Math.atan2(f.x - s.player.x, f.z - s.player.z);
      if (d > 2.6) {
        s.player.x += Math.sin(s.player.heading) * 4 * dt;
        s.player.z += Math.cos(s.player.heading) * 4 * dt;
      } else basicAttack(s, false, env);
    }
    const e = tickRiftFight(s);
    if (e && e.type !== 'wave') last = e;
  }
  return last;
}

test('The rift needs K.’s recordings and a beast out with you', () => {
  const s = ready();
  normalizeChapter3(s).logs = 1;
  assert.ok(!startRiftFight(s, 1).ok);
  normalizeChapter3(s).logs = K_LOGS.length;
  s.expedition.activeId = null;
  assert.match(startRiftFight(s, 1).error, /御獸/);
});

test('A wave comes out as foes you can fight: combat is on in the New World while the trial is', () => {
  const s = ready();
  assert.ok(!combatActive(s));
  const r = startRiftFight(s, 1);
  assert.ok(r.ok && r.foes === LAYERS[1].waves[0].length);
  assert.ok(combatActive(s));
  for (const f of riftFoes(s)) {
    assert.ok(f.hostile && f.maxHp >= 20);
    assert.equal(foeStats(f).bite, f.riftBite);
  }
  assert.match(riftStatus(s).title, /第一層 · 第 1\/3 波/);
  assert.match(storyPanel(s).title, /第 1\/3 波/);
});

test('Clearing a wave brings the next; clearing the last wins the layer and its shard', () => {
  const s = ready();
  startRiftFight(s, 1);
  for (let w = 0; w < 3; w++) {
    assert.equal(s.rift.wave, w);
    s.wild = s.wild.filter(f => !f.rift);
    const e = tickRiftFight(s);
    if (w < 2) assert.equal(e.type, 'wave');
    else {
      assert.equal(e.type, 'won');
      assert.ok(e.first && e.won);
    }
  }
  const c = normalizeChapter3(s);
  assert.ok(c.cleared.includes(1) && c.shards === 1 && !s.rift);
  assert.ok(!riftFoes(s).length);
});

test('Walking away from the rift leaves the fight; your beast falling loses it, and it comes back tired', () => {
  const s = ready();
  startRiftFight(s, 1);
  const centre = toWorld(RIFT);
  s.player.x = centre.x + ARENA_R + 2;
  s.player.z = centre.z;
  assert.equal(tickRiftFight(s).type, 'left');
  assert.ok(!s.rift && !riftFoes(s).length);
  const t = ready();
  startRiftFight(t, 1);
  t.tamed[0].health = 0;
  t.expedition.activeId = null; // what combat.js does when it falls
  const e = tickRiftFight(t);
  assert.equal(e.type, 'lost');
  assert.ok(t.tamed[0].health >= 10 && t.expedition.activeId === 'p1');
  assert.ok(!normalizeChapter3(t).cleared.includes(1));
});

test('A load mid-fight is a retreat (no foes left behind)', () => {
  const s = ready();
  startRiftFight(s, 1);
  endRiftFight(s, 'left');
  assert.ok(!s.rift && !s.wild.some(w => w.rift));
  normalizeCombat(s);
});

test('Played in real time by someone who just walks up and swings, a level-4 beast clears the first layer', () => {
  let wins = 0,
    time = 0;
  for (let i = 0; i < 5; i++) {
    const s = ready(4);
    startRiftFight(s, 1);
    const t0 = s.elapsed,
      e = play(s);
    if (e?.type === 'won') {
      wins++;
      time += s.elapsed - t0;
    }
  }
  console.log(
    `   first layer, level 4, no dodging: ${wins}/5 won, ${wins ? Math.round(time / wins) : '-'} s on average`
  );
  assert.ok(wins >= 3, `only ${wins}/5 won`);
});

console.log(`${n} rift tests passed.`);
