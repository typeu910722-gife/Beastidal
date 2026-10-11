// 0.25: action combat, the contract cap and the team, letting creatures and beasts go, discarding, aquariums.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { makeGenome } from '../dist/genetics.js';
import { normalizeExpansion, commandPet } from '../dist/expansion.js';
import {
  normalizeTaming,
  toggleTeam,
  releaseCreature,
  cookCreature,
  dissolveContract,
  tickDissolve,
  normalizeTeam,
  contractsFull,
  teamOf,
  MAX_CONTRACTS,
  TEAM_SIZE
} from '../dist/taming.js';
import {
  beastSkills,
  basicAttack,
  useSkill,
  dodge,
  tickCombat,
  combatActive,
  resetCombat,
  grantXp,
  levelCap,
  xpFor,
  MAX_LEVEL
} from '../dist/combat.js';
import { discard } from '../dist/bag.js';
import { SPECIAL } from '../dist/combat.js';
import { tankSlots, tankRoom, TANK_CAP } from '../dist/cabin.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const fixed = v => () => v;
let ids = 0;
const pet = (kind = 'beast', bs = [], extra = {}) => {
  const genome = makeGenome(100 + ids, 0, 'sea');
  genome.bs = bs;
  return {
    id: 'p' + ids++,
    genome,
    name: 'pet' + ids,
    generation: 1,
    parents: [],
    bond: 50,
    stamina: 100,
    health: 100,
    kind,
    ...extra
  };
};
function world() {
  const s = createState(25);
  s.tamed = [];
  normalizeExpansion(s);
  normalizeTaming(s);
  resetCombat(s);
  Object.assign(s.player, { x: 0, z: 0, heading: 0, mode: 'boat' });
  s.wild = [];
  s.elapsed = 100;
  return s;
}
const foe = (s, x, z, extra = {}) => {
  const w = {
    id: 'w' + ids++,
    x,
    z,
    homeX: x,
    homeZ: z,
    phase: 0,
    heading: 0,
    genome: makeGenome(7, 0, 'sea'),
    trust: 0,
    feeds: 0,
    hostile: true,
    ...extra
  };
  w.genome.bs = [];
  s.wild.push(w);
  return w;
};
const out = (s, p) => {
  s.tamed.push(p);
  p.team = true;
  s.expedition.activeId = p.id;
  return p;
};

test('Skills come from the BS genes; beasts with few genes fall back on a dash and a roar', () => {
  assert.deepEqual(beastSkills(pet('beast', ['fire', 'hardbody'])), ['flame', 'guard']);
  assert.deepEqual(beastSkills(pet('beast', ['fire', 'magmacore', 'regen'])), ['flame', 'heal']);
  assert.deepEqual(beastSkills(pet('beast', [])), ['dash', 'roar']);
});
test('Only a beast fights: a creature out with you does not start a fight', () => {
  const s = world();
  foe(s, 3, 3);
  out(s, pet('creature'));
  assert.equal(combatActive(s), false);
  assert.equal(basicAttack(s).ok, false);
  s.tamed = [];
  out(s, pet('beast'));
  assert.equal(combatActive(s), true);
});
test('Basic attacks chain into a combo, hit what is in the arc, and a kill grants experience', () => {
  const s = world(),
    p = out(s, pet('beast', ['fire'])),
    w = foe(s, 0, 2.5);
  w.hp = w.maxHp = 500;
  const env = { rng: fixed(0.5) };
  const a = basicAttack(s, false, env);
  assert.ok(a.ok && a.hits === 1 && a.combo === 1);
  assert.equal(basicAttack(s, false, env).ok, false); // still recovering from the swing
  s.elapsed += 0.4;
  const b = basicAttack(s, false, env);
  assert.equal(b.combo, 2);
  assert.ok(w.hp < 500);
  // a heavy blow knocks it back
  s.elapsed += 0.7;
  const before = Math.hypot(w.x, w.z);
  assert.ok(basicAttack(s, true, env).ok);
  assert.ok(Math.hypot(w.x, w.z) > before);
  // finish it off
  w.hp = 1;
  s.elapsed += 1.2;
  const k = basicAttack(s, false, env);
  assert.ok(k.events.some(e => e.type === 'kill'));
  assert.ok(!s.wild.includes(w));
  assert.ok(p.xp > 0 || p.level > 1);
});
test('Foes telegraph, then strike whatever is still inside; a dodge in time evades it', () => {
  const s = world();
  s.tamed = [];
  const w = foe(s, 0, 2);
  const env = { rng: fixed(0) };
  let ev = [];
  for (let i = 0; i < 40 && !ev.some(e => e.type === 'telegraph'); i++) {
    s.elapsed += 0.05;
    ev = tickCombat(s, 0.05, env);
  }
  const tel = ev.find(e => e.type === 'telegraph');
  assert.ok(tel, 'a windup is shown before the bite');
  assert.equal(w.ai.state, 'windup');
  const hp = s.vitals.health;
  s.elapsed = w.ai.until + 0.01;
  ev = tickCombat(s, 0.05, env);
  assert.ok(ev.some(e => e.type === 'hit' && e.target === 'player'));
  assert.ok(s.vitals.health < hp);
  assert.equal(w.ai.state, 'recover'); // 破綻: open for a moment
  // next time, dodge during the windup
  s.elapsed = w.ai.until + 0.01;
  tickCombat(s, 0.05, env);
  for (let i = 0; i < 60 && w.ai.state !== 'windup'; i++) {
    s.elapsed += 0.05;
    tickCombat(s, 0.05, env);
  }
  assert.equal(w.ai.state, 'windup');
  s.elapsed = w.ai.until - 0.2; // dodge late in the windup, as the red shape fills
  const d = dodge(s, 0, 0);
  assert.ok(d.ok && Math.hypot(d.dx, d.dz) > 3);
  const health = s.vitals.health;
  s.elapsed = w.ai.until + 0.01;
  ev = tickCombat(s, 0.05, env);
  assert.ok(ev.some(e => e.type === 'evade'));
  assert.equal(s.vitals.health, health);
});
test('Skills cost stamina, go on cooldown, and the paddle still sends an ordinary foe running', () => {
  const s = world(),
    p = out(s, pet('beast', ['fire'])),
    w = foe(s, 0, 3);
  w.hp = w.maxHp = 400;
  const r = useSkill(s, 0, { rng: fixed(0.5) });
  assert.ok(r.ok && r.skill === 'flame');
  assert.ok(p.stamina < 100);
  assert.match(useSkill(s, 0).error, /冷卻/);
  assert.ok(w.dot, 'flame leaves it burning');
  w.fleeUntil = s.elapsed + 5;
  w.ai = { state: 'windup', until: s.elapsed + 0.1 };
  tickCombat(s, 0.05, {});
  assert.equal(w.ai.state, 'approach');
});
test('Levels: experience raises a beast, and a wild low-tier beast stops at its cap', () => {
  const p = pet('beast');
  assert.equal(levelCap(p), MAX_LEVEL);
  assert.equal(grantXp({}, p, xpFor(1)), 1);
  assert.equal(p.level, 2);
  const wildOne = pet('beast', [], { wildBeast: 'x', cap: 3 });
  grantXp({}, wildOne, 9999);
  assert.equal(wildOne.level, 3);
  assert.equal(grantXp({}, wildOne, 50), 0);
});
test('Contracts: at most 10 御獸, at most 3 carried; creatures follow but never ride or fight', () => {
  const s = world();
  for (let i = 0; i < MAX_CONTRACTS; i++) s.tamed.push(pet('beast'));
  assert.ok(contractsFull(s));
  normalizeTeam(s);
  assert.equal(teamOf(s).length, TEAM_SIZE);
  const extra = s.tamed.find(p => !p.team);
  assert.match(toggleTeam(s, extra.id).error, /3/);
  assert.match(commandPet(s, extra.id, 'follow').error || '', /身上|帶/);
  assert.ok(toggleTeam(s, teamOf(s)[0].id).ok);
  assert.ok(toggleTeam(s, extra.id).ok);
  const c = pet('creature');
  s.tamed.push(c);
  assert.equal(toggleTeam(s, c.id).ok, false);
  assert.ok(commandPet(s, c.id, 'follow').ok);
  assert.equal(commandPet(s, c.id, 'ride').ok, false);
});
test('Letting go: creatures can be released or cooked; a dissolved contract frenzies for 60–80 s and then rots away', () => {
  const s = world();
  const a = pet('creature'),
    b = pet('creature'),
    beast = pet('beast');
  s.tamed.push(a, b, beast);
  assert.ok(releaseCreature(s, a.id, { x: 5, z: 5 }).ok);
  assert.ok(s.wild.some(w => w.id === a.id && !w.hostile));
  const food = s.resources.food || 0;
  const r = cookCreature(s, b.id);
  assert.ok(r.ok && (s.resources.food || 0) > food);
  assert.equal(cookCreature(s, beast.id).ok, false);
  assert.equal(releaseCreature(s, beast.id).ok, false);
  const d = dissolveContract(s, beast.id, fixed(0.5), { x: 3, z: 0 });
  assert.ok(d.ok && d.seconds >= 60 && d.seconds <= 80);
  assert.ok(!s.tamed.includes(beast));
  const w = s.wild.find(x => x.formerBeast);
  assert.ok(w.hostile && w.frenzyUntil > s.elapsed);
  s.elapsed += d.seconds;
  assert.equal(tickDissolve(s).length, 0);
  assert.ok(w.dissolving && !w.hostile);
  s.elapsed += 4.5;
  assert.equal(tickDissolve(s).length, 1);
  assert.ok(!s.wild.includes(w));
});
test('Discarding: items and contract scrolls can be thrown away, from the bag or the box', () => {
  const s = world();
  s.resources.wood = 5;
  s.contracts = 2;
  assert.equal(discard(s, 'wood', 3).moved, 3);
  assert.equal(s.resources.wood, 2);
  assert.equal(discard(s, 'contract', 9).moved, 2);
  assert.equal(s.contracts, 0);
  s.resources.metal = 0;
  assert.equal(discard(s, 'metal', 1).ok, false);
});
test('Aquariums on 1F hold three water creatures each; the rest wait in storage', () => {
  const s = world();
  s.ship = { cabin: { items: [] } };
  const water = Array.from({ length: tankRoom(s) + 2 }, () => pet('creature'));
  const plan = tankSlots(s, water);
  assert.equal(Object.keys(plan).length, tankRoom(s));
  const perTank = {};
  for (const v of Object.values(plan)) perTank[v.tank.id] = (perTank[v.tank.id] || 0) + 1;
  assert.ok(Object.values(perTank).every(k => k <= TANK_CAP));
});
test('深海守望者 telegraphs slams, waves and rams; a dodge evades it, and it can be brought down', () => {
  const s = world(),
    b = s.expedition.boss;
  out(s, pet('beast', ['fire']));
  Object.assign(b, { x: 0, z: 6, hp: 480, maxHp: 480, defeated: false });
  delete b.ai;
  const env = { rng: fixed(0) };
  let ev = [];
  for (let i = 0; i < 60 && !ev.some(e => e.type === 'telegraph'); i++) {
    s.elapsed += 0.05;
    ev = tickCombat(s, 0.05, env);
  }
  const tel = ev.find(e => e.type === 'telegraph');
  assert.ok(tel && tel.id === 'boss' && tel.big && tel.line, 'the watcher winds up with a warning');
  assert.ok(Object.values(SPECIAL.boss.moves).some(m => m.shape === tel.move));
  const hp = s.vitals.health;
  s.elapsed = b.ai.until - 0.2;
  dodge(s, 0, 0);
  s.elapsed = b.ai.until + 0.01;
  ev = tickCombat(s, 0.05, env);
  assert.ok(ev.some(e => e.type === 'evade' || e.type === 'dodged'));
  assert.equal(s.vitals.health, hp);
  assert.equal(b.ai.state, 'recover');
  // bring it down while it is open
  b.hp = 3;
  Object.assign(b, { x: 0, z: 2.5 });
  s.elapsed += 1.2;
  const r = basicAttack(s, true, env);
  assert.ok(
    r.events.some(e => e.type === 'bossdown'),
    'the last blow brings it down'
  );
});
console.log(`\n${n} combat tests passed`);
