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
  trySide,
  startDuel,
  answerOath,
  trialsDone,
  sealPact,
  canCross,
  finishCrossing,
  tickStory,
  pactPet,
  PACT_ID,
  DUEL
} from '../dist/story.js';

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

test('Seal → three keys → awakening; the watcher always drops the bone key', () => {
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
  assert.equal(s.story.stage, 3);
  assert.ok(s.story.beast);
});

function awake() {
  const s = ready();
  Object.assign(s.story, {
    stage: 3,
    keys: ['tide', 'stone', 'bone'],
    beast: { x: 0, z: 0, hp: DUEL.hp, maxHp: DUEL.hp }
  });
  const st = s.story;
  Object.assign(s.player, { x: st.beast.x + 4, z: st.beast.z, mode: 'foot' });
  return s;
}
test('Trial of side-by-side needs a partner at bond 60', () => {
  const s = awake();
  s.tamed[0].bond = 40;
  assert.equal(trySide(s, s.tamed[0]).ok, false);
  s.tamed[0].bond = 60;
  assert.ok(trySide(s, s.tamed[0]).ok);
  assert.ok(s.story.trials.includes('side'));
});
test('Trial of might: the swipe is telegraphed, stepping away dodges, and it yields at 30 %', () => {
  const s = awake(),
    st = s.story;
  assert.ok(startDuel(s, s.tamed[0]).ok);
  // wind-up then a swipe while standing close: hit
  const hp = s.vitals.health;
  s.elapsed += 1.5;
  assert.ok(tickStory(s, 0.1, { active: s.tamed[0] }).some(e => e.type === 'windup'));
  s.elapsed += 1.5;
  const hit = tickStory(s, 0.1, { active: s.tamed[0] }).find(e => e.type === 'swipe');
  assert.ok(hit.hit);
  assert.ok(s.vitals.health < hp);
  // next one: step back out of reach before it lands
  s.elapsed += DUEL.every - DUEL.windup + 0.1;
  tickStory(s, 0.1, { active: s.tamed[0] });
  s.player.x = st.beast.x + DUEL.reach + 2;
  s.elapsed += DUEL.windup + 0.1;
  const miss = tickStory(s, 0.1, { active: s.tamed[0] }).find(e => e.type === 'swipe');
  assert.equal(miss.hit, false);
  // the partner wears it down; it backs off instead of dying
  let r,
    i = 0;
  while (!st.trials.includes('might') && i++ < 200) {
    s.elapsed += 4;
    s.tamed[0].stamina = 100;
    r = attack(s);
    assert.ok(r.ok, r.error);
  }
  assert.ok(r.won);
  assert.equal(st.duel, null);
  assert.equal(st.beast.hp, st.beast.maxHp);
});
test('Trial of the oath: only "partner" is accepted; a wrong answer makes it wait a minute', () => {
  const s = awake();
  assert.equal(answerOath(s, 'weapon').ok, false);
  assert.equal(answerOath(s, 'friend').ok, false); // still turned away
  s.elapsed += 61;
  assert.ok(answerOath(s, 'friend').ok);
});
test('The pact needs all trials, a contract scroll and crystal; the ancient beast cannot be bred', () => {
  const s = awake();
  s.contracts = 1;
  assert.equal(sealPact(s).ok, false);
  s.story.trials = ['side', 'might', 'oath'];
  assert.ok(trialsDone(s));
  const crystal = s.resources.crystal;
  assert.ok(sealPact(s).ok);
  assert.equal(s.contracts, 0);
  assert.ok(s.resources.crystal < crystal);
  const x = pactPet(s);
  assert.ok(x && x.ancient && x.name === '嘯岳');
  assert.equal(s.story.stage, 5);
  assert.equal(breed(s, PACT_ID, 'p1').ok, false);
  assert.equal(sealPact(s).ok, false);
});
test('The crossing needs Xiaoyue deployed on the basin shore, and it closes chapter one', () => {
  const s = awake();
  s.contracts = 1;
  s.story.trials = ['side', 'might', 'oath'];
  sealPact(s);
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
