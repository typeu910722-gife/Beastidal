import assert from 'node:assert/strict';
import { createState, validateSave } from '../dist/rules.js';
import { makeGenome, phenotype, genomeValid, dnaCode, crossGenome, seeded, SPECIES } from '../dist/genetics.js';
import { ACHIEVEMENTS, checkUnlocks, achievementCount } from '../dist/achievements.js';
import { recordCreature, syncOwned, codexProgress, codexEntries, LORE } from '../dist/codex.js';
import { ensureLandBeasts, normalizeWildlife, stepLandBeast, seaFamily } from '../dist/wildlife.js';
import { ISLANDS } from '../dist/islands.js';
import { normalizeStats, tickStats, milestoneRows, statsReport } from '../dist/stats.js';
import {
  slotKey,
  metaKey,
  listSlots,
  writeLocal,
  readMeta,
  exportSave,
  importSave,
  activeSlot,
  setActiveSlot
} from '../dist/save-store.js';

const memory = () => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k)
  };
};
let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('ok -', name);
};

test('lineage: old genomes stay classic sea species with unchanged DNA codes', () => {
  const g = makeGenome(4, 2);
  delete g.lineage;
  const before = dnaCode(g);
  assert.ok(genomeValid(g));
  assert.equal(phenotype(g).family, 'sea');
  normalizeWildlife({ tamed: [{ genome: g }] });
  assert.deepEqual(g.lineage, [0, 0]);
  assert.equal(dnaCode(g), before);
  const child = crossGenome(g, makeGenome(5, 1, 'land'), seeded(1), 0).genome;
  assert.ok(genomeValid(child) && Array.isArray(child.lineage));
});
test('every family/form maps to its species', () => {
  for (const fam of Object.keys(SPECIES))
    for (let f = 0; f < 4; f++) assert.equal(phenotype(makeGenome(f, f, fam)).species, `${fam}-${f}`);
  assert.equal(phenotype(makeGenome(1, 0, 'land')).habitat, 'land');
  assert.equal(phenotype(makeGenome(1, 0, 'flora')).flora, 1);
});
test('one land beast per island, staying ashore when startled', () => {
  const s = createState(3);
  ensureLandBeasts(s, seeded(2));
  ensureLandBeasts(s, seeded(3));
  assert.equal(s.wild.filter(w => w.island).length, ISLANDS.length);
  const w = s.wild.find(w => w.island),
    isl = ISLANDS.find(i => i.id === w.island);
  w.vx = 9;
  w.vz = 9;
  w.fleeUntil = 50;
  for (let i = 0; i < 400; i++) stepLandBeast(w, 1 / 30, i / 30);
  assert.ok(Math.hypot((w.x - isl.x) / isl.rx, (w.z - isl.z) / isl.rz) < 0.7, 'still on the island');
});
test('far water favours deep species; old wild creatures get a stable family', () => {
  const near = Array.from({ length: 400 }, (_, i) => seaFamily(5, 5, seeded(i))).filter(f => f === 'deep').length,
    far = Array.from({ length: 400 }, (_, i) => seaFamily(90, 90, seeded(i))).filter(f => f === 'deep').length;
  assert.ok(far > near * 1.5);
  const s = { wild: [{ id: 'wild-3', x: 1, z: 1, genome: (({ lineage, ...g }) => g)(makeGenome(1, 1)) }] };
  normalizeWildlife(s);
  const first = [...s.wild[0].genome.lineage];
  delete s.wild[0].genome.lineage;
  normalizeWildlife(s);
  assert.deepEqual(s.wild[0].genome.lineage, first);
});
test('codex records seen and tamed species once each', () => {
  const s = createState(1);
  assert.equal(recordCreature(s, makeGenome(1, 0, 'deep')), true);
  assert.equal(recordCreature(s, makeGenome(2, 0, 'deep')), false);
  s.tamed.push({ id: 'p', genome: makeGenome(3, 2, 'land'), generation: 0, bond: 10 });
  assert.deepEqual(syncOwned(s), ['land-2']);
  assert.deepEqual(codexProgress(s), { seen: 2, tamed: 1, total: 16 });
  assert.equal(codexEntries(s).length, 16);
  assert.ok(Object.keys(LORE).length === 16);
});
test('achievements unlock from save state only once, with Steam ids', () => {
  const s = createState(2);
  assert.deepEqual(
    checkUnlocks(s, 1).map(a => a.id),
    []
  );
  s.salvaged = 1;
  s.buoyFound = true;
  assert.deepEqual(
    checkUnlocks(s, 2).map(a => a.id),
    ['first_salvage', 'buoy']
  );
  assert.deepEqual(checkUnlocks(s, 3), []);
  assert.equal(achievementCount(s), 2);
  assert.ok(ACHIEVEMENTS.every(a => /^ACH_[A-Z0-9_]+$/.test(a.steam)));
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
  assert.ok(validateSave(s), 'achievements and codex do not break save validation');
});
test('pacing stats time each milestone and export an anonymous report', () => {
  const s = createState(4);
  normalizeStats(s);
  tickStats(s, 30, 5, 'boat');
  s.salvaged = 3;
  assert.deepEqual(tickStats(s, 10, 2, 'boat'), ['salvage']);
  assert.equal(s.stats.milestones.salvage.play, 40);
  assert.ok(milestoneRows(s).find(r => r.id === 'salvage').reached);
  const r = JSON.parse(statsReport(s, '0.10.0'));
  assert.equal(r.milestones.salvage, 40);
  assert.ok(!('email' in r) && !('id' in r));
});
test('save slots: slot 1 keeps legacy keys, others are separate; export round-trips', () => {
  const st = memory();
  assert.equal(slotKey(1), 'tidal-rebirth-save-v1');
  assert.notEqual(slotKey(2), slotKey(1));
  assert.notEqual(metaKey(3), metaKey(1));
  const a = createState(1),
    b = createState(2);
  writeLocal(st, slotKey(1), a, 10, 1);
  writeLocal(st, slotKey(3), b, 20, 3);
  const slots = listSlots(st, validateSave);
  assert.deepEqual(
    slots.map(x => [x.slot, !!x.state, x.savedAt]),
    [
      [1, true, 10],
      [2, false, 0],
      [3, true, 20]
    ]
  );
  assert.equal(readMeta(st, 3).savedAt, 20);
  const back = importSave(exportSave(b, 20), validateSave);
  assert.deepEqual(back.state, b);
  assert.throws(() => importSave('{"not":"a save"}', validateSave));
  assert.equal(activeSlot(st), 1);
  setActiveSlot(st, 3);
  assert.equal(activeSlot(st), 3);
});
console.log(`${passed} progress tests passed.`);
