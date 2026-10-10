// 0.18 content: beast jobs, lake events and codex collection rewards.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { makeGenome, allSpecies } from '../dist/genetics.js';
import { normalizeExpansion, oxygenMax } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { normalizeJobs, setJob, tickJobs, guardFactor, JOB_EVERY, jobRate } from '../dist/jobs.js';
import { normalizeEvents, tickEvents, startEvent, trade, claimTreasure, EVENTS } from '../dist/lake-events.js';
import { normalizeCodex, codexRewards, claimCodex, hasPerk } from '../dist/codex.js';
import { groundAt } from '../dist/lake.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const seq = (...v) => {
  let i = 0;
  return () => v[i++ % v.length];
};
function base() {
  const s = normalizeTravel(createState(1818));
  for (const k of Object.keys(s.resources)) s.resources[k] = 100;
  s.secret = true;
  s.tamed = [
    {
      id: 'land1',
      name: '陸',
      genome: makeGenome(3, 0, 'land'),
      generation: 0,
      parents: [],
      bond: 50,
      stamina: 100,
      health: 100
    },
    {
      id: 'sea1',
      name: '海',
      genome: makeGenome(4, 0, 'sea'),
      generation: 0,
      parents: [],
      bond: 50,
      stamina: 100,
      health: 100
    }
  ];
  normalizeExpansion(s);
  normalizeJobs(s);
  normalizeEvents(s);
  return s;
}

test('Jobs: resting beasts work in cycles and bring the haul to the storage box', () => {
  const s = base();
  assert.ok(setJob(s, 'land1', 'lumber').ok);
  assert.ok(setJob(s, 'sea1', 'fish').ok);
  assert.equal(tickJobs(s), null); // not a full cycle yet
  const wood = s.storage.wood || 0;
  s.elapsed += JOB_EVERY;
  const haul = tickJobs(s);
  assert.ok(haul.wood >= 1 && haul.food >= 1);
  assert.equal(s.storage.wood, wood + haul.wood);
  // habitat matters: a sea beast felling trees works at half the rate
  const fit = jobRate(s, s.tamed[0]);
  setJob(s, 'sea1', 'lumber');
  assert.ok(jobRate(s, s.tamed[1]) < fit);
});
test('Jobs: a deployed partner cannot work, and guards soften hostile hits', () => {
  const s = base();
  s.expedition.activeId = 'land1';
  assert.equal(setJob(s, 'land1', 'mine').ok, false);
  assert.equal(guardFactor(s), 1);
  setJob(s, 'sea1', 'guard');
  assert.ok(Math.abs(guardFactor(s) - 0.85) < 1e-9);
});
test('Events: the first one waits a few minutes, then events start, run their course and end', () => {
  const s = base();
  assert.equal(tickEvents(s, 1).length, 0);
  s.elapsed = s.nextEventAt + 1;
  const [start] = tickEvents(s, 1, seq(0.1, 0.5, 0.7, 0.2, 0.9, 0.3));
  assert.equal(start.type, 'start');
  assert.ok(EVENTS[s.lakeEvent.kind]);
  assert.ok(groundAt(s.lakeEvent.x, s.lakeEvent.z) < -3, 'events happen on open water');
  s.elapsed = s.lakeEvent.until + 1;
  const [end] = tickEvents(s, 1);
  assert.equal(end.type, 'end');
  assert.equal(s.lakeEvent, null);
  assert.ok(s.nextEventAt > s.elapsed + 200);
});
test('Merchant: trades need you nearby and enough goods, and each offer works once', () => {
  const s = base();
  const ev = startEvent(s, 'merchant', seq(0.3, 0.6, 0.1, 0.8, 0.4));
  assert.equal(ev.offers.length, 3);
  assert.equal(trade(s, 0).ok, false); // too far
  Object.assign(s.player, { x: ev.x + 4, z: ev.z, mode: 'boat' });
  assert.ok(trade(s, 0).ok);
  assert.equal(trade(s, 0).ok, false);
});
test('Crystal tide and migration add their crates and herd, and take them away at the end', () => {
  const s = base();
  startEvent(s, 'tide', seq(0.2, 0.5, 0.8));
  assert.equal(s.loot.filter(l => l.event).length, 6);
  s.elapsed = s.lakeEvent.until + 1;
  tickEvents(s, 1);
  assert.equal(s.loot.filter(l => l.event).length, 0);
  const ev = startEvent(s, 'migration', seq(0.1, 0.4, 0.7, 0.9));
  const herd = s.wild.filter(w => w.event === ev.id);
  assert.equal(herd.length, 7);
  herd[0].follow = true; // one came to trust you
  s.elapsed += 60;
  tickEvents(s, 1);
  assert.notEqual(herd[1].homeX, herd[1].x); // the herd moves along
  s.elapsed = ev.until + 1;
  tickEvents(s, 1);
  assert.deepEqual(
    s.wild.filter(w => w.event === ev.id).map(w => w.id),
    [herd[0].id]
  );
});
test('Treasure: only a dive reaches it, and it pays out once', () => {
  const s = base();
  const ev = startEvent(s, 'treasure', seq(0.4, 0.6, 0.2));
  Object.assign(s.player, { x: ev.x, z: ev.z, mode: 'boat' });
  assert.equal(claimTreasure(s).ok, false);
  s.expedition.diving = true;
  const c = s.contracts || 0;
  assert.ok(claimTreasure(s).ok);
  assert.equal(s.contracts, c + 1);
  assert.equal(claimTreasure(s).ok, false);
});
test('Codex rewards: milestones unlock in order, pay once, and family sets grant perks', () => {
  const s = base();
  normalizeCodex(s);
  assert.ok(codexRewards(s).every(r => !r.done));
  const sp = allSpecies();
  for (const x of sp.slice(0, 4)) s.codex.seen[x.id] = { day: 1, count: 1 };
  assert.ok(claimCodex(s, 'seen4').ok);
  assert.equal(claimCodex(s, 'seen4').ok, false);
  assert.equal(claimCodex(s, 'seen8').ok, false);
  // tame every deep-sea species: the dive perk applies
  assert.equal(oxygenMax(s), 90);
  for (const x of sp.filter(x => x.family === 'deep')) s.codex.tamed[x.id] = { day: 1 };
  assert.ok(claimCodex(s, 'deep').ok);
  assert.ok(hasPerk(s, 'deep'));
  assert.equal(oxygenMax(s), 120);
});
console.log(`content tests: ${n} passed`);
