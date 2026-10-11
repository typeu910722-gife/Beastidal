// 0.29: 御獸 skill trees and personalities.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion, trainPet } from '../dist/expansion.js';
import { normalizeTaming } from '../dist/taming.js';
import {
  resetCombat,
  beastSkills,
  allyPower,
  useSkill,
  cooldownLeft,
  basicAttack,
  tickCombat
} from '../dist/combat.js';
import {
  TREE,
  BRANCHES,
  treePoints,
  learn,
  respec,
  perks,
  personalityOf,
  PERSONALITY,
  PERSONALITY_IDS,
  tickPersona
} from '../dist/beast-tree.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
let ids = 0;
const beast = (extra = {}) => {
  const genome = makeGenome(500 + ids, 0, 'sea');
  genome.bs = ['fire', 'hardbody', 'lightning'];
  return {
    id: 'b' + ids++,
    genome,
    name: 'b' + ids,
    generation: 1,
    parents: [],
    bond: 60,
    stamina: 100,
    health: 100,
    kind: 'beast',
    evolved: true,
    level: 1,
    xp: 0,
    ...extra
  };
};
function world() {
  const s = createState(29);
  s.tamed = [];
  normalizeExpansion(s);
  normalizeTaming(s);
  resetCombat(s);
  Object.assign(s.player, { x: 0, z: 0, heading: 0, mode: 'boat' });
  s.wild = [];
  s.elapsed = 100;
  return s;
}

test('Three branches of five; points come from levels and are spent in order, capstones cost two', () => {
  assert.deepEqual(BRANCHES, ['fang', 'hide', 'gift']);
  for (const b of BRANCHES) assert.equal(TREE[b].nodes.length, 5);
  const p = beast();
  assert.equal(treePoints(p), 0);
  assert.equal(learn(p, 'fang').ok, false);
  p.level = 10;
  assert.equal(treePoints(p), 9);
  for (let i = 0; i < 4; i++) assert.ok(learn(p, 'fang').ok);
  assert.equal(treePoints(p), 5);
  assert.ok(learn(p, 'fang').ok, 'the capstone costs 2');
  assert.equal(treePoints(p), 3);
  assert.equal(learn(p, 'fang').ok, false, 'the branch is done');
  assert.ok(respec(p).ok);
  assert.equal(treePoints(p), 9);
  assert.equal(learn({ ...beast(), kind: 'creature', level: 5 }, 'fang').ok, false);
});
test('Perks change the fight: attack, a fourth combo strike, a third skill and faster cooldowns', () => {
  const s = world(),
    p = beast({ level: 10 });
  s.tamed.push(p);
  s.expedition.activeId = p.id;
  const base = allyPower(s, p).atk;
  learn(p, 'fang');
  assert.ok(allyPower(s, p).atk > base);
  assert.equal(beastSkills(p).length, 2);
  learn(p, 'gift');
  learn(p, 'gift');
  learn(p, 'gift');
  assert.equal(beastSkills(p).length, 3, '覺醒 wakes a third skill');
  assert.ok(perks(p).cd > 0 && perks(p).sta > 0);
  s.wild.push({
    id: 'w',
    x: 0,
    z: 3,
    homeX: 0,
    homeZ: 3,
    phase: 0,
    heading: 0,
    genome: makeGenome(9, 0, 'sea'),
    hostile: true,
    hp: 999,
    maxHp: 999
  });
  const r = useSkill(s, 0, { rng: () => 0.5 });
  assert.ok(r.ok);
  const sk = { flame: 9 }[r.skill];
  assert.ok(!sk || cooldownLeft(s, 'skill0') < sk, 'cooldown shortened');
  // four-strike combo with 狂襲
  learn(p, 'fang');
  learn(p, 'fang');
  learn(p, 'fang');
  assert.ok(perks(p).combo4);
  let last;
  for (let i = 0; i < 4; i++) {
    s.elapsed += 0.7;
    last = basicAttack(s, false, { rng: () => 0.5 });
  }
  assert.equal(last.combo, 4);
});
test('Personalities: fixed by the genome, shown with a description, and they nudge life and the fight', () => {
  assert.equal(PERSONALITY_IDS.length, 8);
  for (const id of PERSONALITY_IDS)
    assert.ok(PERSONALITY[id].name && PERSONALITY[id].desc && PERSONALITY[id].lines.length);
  const p = beast(),
    again = { ...p, personality: undefined };
  assert.equal(personalityOf(p), personalityOf(again), 'the same genome, the same personality');
  const seen = new Set();
  for (let i = 0; i < 60; i++) seen.add(personalityOf(beast()));
  assert.ok(seen.size >= 6, 'genomes spread across the personalities');
  // greedy: training bonds twice as fast; brave: more attack
  const s = world(),
    g = beast({ personality: 'greedy', bond: 10 });
  s.tamed.push(g);
  Object.assign(s.resources, { food: 10, crystal: 10 });
  trainPet(s, g.id);
  assert.equal(g.bond, 18);
  assert.ok(perks(beast({ personality: 'brave' })).atk > perks(beast({ personality: 'cautious' })).atk);
  // a curious partner brings things back; every partner talks now and then
  const c = beast({ personality: 'curious' });
  s.tamed.push(c);
  s.expedition.activeId = c.id;
  let found = null,
    said = null;
  for (let i = 0; i < 400 && !(found && said); i++) {
    s.elapsed += 5;
    const e = tickPersona(s, 5, () => 0.1);
    if (e?.find) found = e.find;
    if (e?.line) said = e.line;
  }
  assert.ok(found && said);
});
test('A gentle partner mends you in a fight; 戰鬥癒合 mends the beast', () => {
  const s = world(),
    p = beast({ personality: 'gentle', level: 10, health: 50 });
  s.tamed.push(p);
  s.expedition.activeId = p.id;
  learn(p, 'hide');
  learn(p, 'hide');
  learn(p, 'hide');
  learn(p, 'hide');
  s.vitals.health = 50;
  // a foe held in place (stunned), so the fight goes on without anyone getting hurt
  s.wild.push({
    id: 'w',
    x: 0,
    z: 18,
    homeX: 0,
    homeZ: 18,
    phase: 0,
    heading: 0,
    genome: makeGenome(9, 0, 'sea'),
    hostile: true,
    hp: 999,
    maxHp: 999,
    ai: { state: 'approach', stunUntil: 1e9 }
  });
  let mended = false;
  for (let i = 0; i < 40; i++) {
    s.elapsed += 0.5;
    const ev = tickCombat(s, 0.5, { rng: () => 0.01, autoAlly: false });
    if (ev.some(e => e.type === 'mend')) mended = true;
  }
  assert.ok(mended && s.vitals.health > 50);
  assert.ok(p.health > 50);
});
console.log(`\n${n} tree tests passed`);
