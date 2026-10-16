// 嘯岳之契: the optional main line, played end to end through the real rules.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { breed } from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion, explore, attack, EXPLORE } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import {
  normalizeStory,
  objectives,
  sealPact,
  canCross,
  finishCrossing,
  tickStory,
  pactPet,
  PACT_ID,
  DUEL,
  winDuel,
  SLEEP_AT,
  PACT_CONTRACTS,
  WAKE_TEAM,
  FRENZY_HP
} from '../dist/story.js';
import { tickCombat, basicAttack, resetCombat, combatActive } from '../dist/combat.js';
import { canWalk } from '../dist/navigation.js';
import { CAVE, ENTRANCE, HALL, HALL_COVER, coverBetween, mazeWalkable, MAZE_HALF } from '../dist/cave-maze.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
function ready() {
  const s = normalizeTravel(createState(4242));
  for (const k of Object.keys(s.resources)) s.resources[k] = 200;
  s.secret = true;
  s.tamed = [
    {
      id: 'p1',
      name: '夥伴',
      genome: makeGenome(9, 1, 'sea'),
      generation: 0,
      parents: [],
      bond: 65,
      stamina: 100,
      health: 100,
      penId: null
    }
  ];
  normalizeExpansion(s);
  normalizeStory(s);
  s.expedition.activeId = 'p1';
  return s;
}
const site = id => EXPLORE.find(p => p.id === id);
function diveTo(s, id) {
  const p = site(id);
  Object.assign(s.player, { x: p.x, z: p.z, mode: 'boat' });
  s.inCave = false;
  s.expedition.mounted = true;
  s.expedition.diving = true;
}

test('The line stays hidden until you find it, and the keys need the seal first', () => {
  const s = ready();
  assert.equal(objectives(s).length, 0);
  diveTo(s, 'key-tide');
  assert.equal(explore(s, 'key-tide').ok, false);
  assert.equal(s.story.keys.length, 0);
  const hint = tickStory(s, 0.1, { diving: true });
  assert.equal(hint.length, 0); // far from the gate: no hint
  diveTo(s, 'pact-seal');
  assert.ok(tickStory(s, 0.1, { diving: true }).some(e => e.type === 'hint'));
});

test('Seal → three keys → the seal opens (0.31: 嘯岳 sleeps in the cave); the watcher always drops the bone key', () => {
  const s = ready();
  diveTo(s, 'pact-seal');
  const r = explore(s, 'pact-seal');
  assert.ok(r.ok && r.story === 'seal');
  assert.equal(s.story.stage, 1);
  assert.equal(explore(s, 'pact-seal').ok, false); // keys missing
  diveTo(s, 'key-tide');
  assert.ok(explore(s, 'key-tide').ok);
  assert.equal(explore(s, 'key-tide').ok, false); // only once
  // the stone key is in the crystal cave
  s.expedition.diving = false;
  s.expedition.mounted = false;
  const stone = site('key-stone');
  Object.assign(s.player, { x: stone.x, z: stone.z, mode: 'foot' });
  s.inCave = true;
  assert.ok(explore(s, 'key-stone').ok);
  s.inCave = false;
  // defeat the watcher with the partner: the bone key drops
  const b = s.expedition.boss;
  Object.assign(s.player, { x: b.x, z: b.z, mode: 'boat' });
  let r2,
    i = 0;
  while (!b.defeated && i++ < 80) {
    s.elapsed += 4;
    s.tamed[0].stamina = 100;
    r2 = attack(s);
    assert.ok(r2.ok);
  }
  assert.ok(b.defeated);
  assert.ok(r2.note);
  assert.deepEqual([...s.story.keys].sort(), ['bone', 'stone', 'tide']);
  diveTo(s, 'pact-seal');
  const w = explore(s, 'pact-seal');
  assert.ok(w.ok && w.story === 'awaken');
  assert.equal(s.story.stage, 2);
  assert.ok(s.story.beast.cave && s.story.sleeping, 'it sleeps in the garden');
});

// in the garden's heart, a few steps from the sleeper
function inGarden() {
  const s = ready();
  Object.assign(s.story, { stage: 2, keys: ['tide', 'stone', 'bone'] });
  normalizeStory(s);
  s.inCave = true;
  Object.assign(s.player, { x: SLEEP_AT.x, z: SLEEP_AT.z + 5, mode: 'foot' });
  resetCombat(s);
  return s;
}
function calm() {
  const s = inGarden();
  Object.assign(s.story, { stage: 3, sleeping: false });
  return s;
}
test('The cave is a maze: walls block, the entrance leads to the heart', () => {
  const s = ready();
  s.inCave = true;
  s.player.mode = 'foot';
  assert.ok(canWalk(s, CAVE.x + ENTRANCE.x, CAVE.z + ENTRANCE.z));
  assert.equal(canWalk(s, CAVE.x, CAVE.z), false, 'the dais is solid');
  assert.ok(canWalk(s, SLEEP_AT.x, SLEEP_AT.z + 2));
  assert.equal(canWalk(s, CAVE.x + 80, CAVE.z), false, 'outside the hedges');
});
test('0.36: the great hall is wide, and its pillars stand between you and the claws of 嘯岳', () => {
  assert.ok(HALL.i1 - HALL.i0 + 1 >= 7, 'a 7 × 7 cell hall');
  assert.ok(MAZE_HALF >= 76);
  // open floor across the hall, the cover itself solid
  assert.ok(mazeWalkable(0, 6) && mazeWalkable(-16, -4) && mazeWalkable(4, -17));
  for (const c of HALL_COVER) assert.equal(mazeWalkable(c.x, c.z), false);
  // a pillar between the beast and you blocks the line; open floor does not
  const p = HALL_COVER[0];
  assert.ok(coverBetween(p.x * 0.5, p.z * 0.5, p.x * 1.4, p.z * 1.4));
  assert.equal(coverBetween(0, 3, 0, 6), false);
});
test('Alone it does not stir; carrying three 御獸 contracts tears it awake in a frenzy', () => {
  const s = inGarden(),
    st = s.story;
  assert.ok(st.sleeping);
  let ev = tickStory(s, 0.1, { team: 1 });
  assert.ok(st.sleeping && !st.duel);
  assert.ok(
    ev.some(e => e.type === 'script' && e.script === 'sleepHint'),
    'a quiet hint, once'
  );
  ev = tickStory(s, 0.1, { team: WAKE_TEAM });
  assert.ok(ev.some(e => e.type === 'frenzy-wake'));
  assert.ok(st.duel?.frenzy && !st.sleeping);
  assert.equal(st.beast.maxHp, FRENZY_HP);
  assert.ok(combatActive(s), 'the fight runs inside the cave');
});
test('The frenzy fights with telegraphed moves; beaten down it comes back to itself and speaks', () => {
  const s = inGarden(),
    st = s.story;
  tickStory(s, 0.1, { team: WAKE_TEAM });
  const env = { rng: () => 0, canReach: () => true, canMove: () => true };
  let ev = [];
  for (let i = 0; i < 80 && !ev.some(e => e.type === 'telegraph' && e.id === 'duel'); i++) {
    s.elapsed += 0.05;
    ev = tickCombat(s, 0.05, env);
  }
  assert.ok(ev.some(e => e.type === 'telegraph' && e.id === 'duel' && e.line));
  st.beast.hp = Math.round(FRENZY_HP * DUEL.yieldAt) + 1;
  delete st.beast.ai;
  Object.assign(s.player, { x: st.beast.x, z: st.beast.z + 2.5 });
  s.elapsed += 3;
  const r = basicAttack(s, true, env);
  assert.ok(r.events.some(e => e.type === 'duelwon'));
  const w = winDuel(s);
  assert.ok(w.won && w.script === 'calm');
  assert.equal(st.stage, 3);
  assert.ok(!st.sleeping && !st.duel);
});
test('Losing, or running from the garden, puts it back to sleep', () => {
  const s = inGarden(),
    st = s.story;
  tickStory(s, 0.1, { team: WAKE_TEAM });
  s.vitals.health = 20;
  assert.ok(tickStory(s, 0.1, { team: WAKE_TEAM }).some(e => e.type === 'duel-lost' && e.script === 'frenzyLose'));
  assert.ok(st.sleeping && !st.duel);
  s.vitals.health = 100;
  tickStory(s, 0.1, { team: WAKE_TEAM });
  assert.ok(st.duel);
  s.inCave = false;
  assert.ok(tickStory(s, 0.1, { team: WAKE_TEAM }).some(e => e.type === 'duel-off'));
  assert.ok(st.sleeping);
});
test('The pact takes ten contract scrolls; the ancient beast cannot be bred', () => {
  const s = calm();
  s.contracts = PACT_CONTRACTS - 1;
  assert.equal(sealPact(s).ok, false);
  s.contracts = PACT_CONTRACTS + 2;
  assert.ok(sealPact(s).ok);
  assert.equal(s.contracts, 2);
  const x = pactPet(s);
  assert.ok(x && x.ancient && x.name === '嘯岳');
  assert.equal(s.story.stage, 5);
  assert.equal(breed(s, PACT_ID, 'p1').ok, false);
  assert.equal(sealPact(s).ok, false);
  // asleep, it cannot be bound
  const t = inGarden();
  t.contracts = 20;
  assert.equal(sealPact(t).ok, false);
});
test('Old saves with 嘯岳 awake on the central island send it back to sleep in the garden', () => {
  const s = ready();
  s.story = {
    stage: 4,
    keys: ['tide', 'stone', 'bone'],
    trials: ['side', 'might'],
    seen: [],
    beast: { x: 0, z: 0, hp: 900, maxHp: 900 }
  };
  normalizeStory(s);
  assert.equal(s.story.stage, 2);
  assert.ok(s.story.beast.cave && s.story.sleeping);
});
test('The crossing needs Xiaoyue deployed on the basin shore, and it closes chapter one', () => {
  const s = calm();
  s.contracts = PACT_CONTRACTS;
  sealPact(s);
  s.inCave = false;
  const x = pactPet(s);
  assert.equal(canCross(s, s.tamed[0], true).ok, false);
  assert.equal(canCross(s, x, false).ok, false);
  assert.ok(canCross(s, x, true).ok);
  finishCrossing(s);
  assert.equal(s.story.stage, 6);
  assert.ok(objectives(s).every(([, done]) => done));
  // saves round-trip
  const loaded = normalizeStory(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.story.stage, 6);
});
console.log(`story tests: ${n} passed`);
test('0.61.13: when the frenzy turns past half strength it says so, once', () => {
  const s = inGarden(),
    st = s.story;
  tickStory(s, 0.1, { team: WAKE_TEAM });
  const env = { rng: () => 0.5, canReach: () => true, canMove: () => true };
  st.beast.hp = FRENZY_HP * 0.4;
  let told = 0;
  for (let i = 0; i < 60; i++) {
    s.elapsed += 0.05;
    told += tickCombat(s, 0.05, env).filter(e => e.type === 'phase2' && e.id === 'duel').length;
  }
  assert.equal(told, 1);
});
