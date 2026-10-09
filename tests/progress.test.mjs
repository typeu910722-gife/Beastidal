import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createState, validateSave } from '../dist/rules.js';
import { makeGenome, phenotype, genomeValid, dnaCode, crossGenome, seeded, SPECIES } from '../dist/genetics.js';
import { ACHIEVEMENTS, checkUnlocks, achievementCount } from '../dist/achievements.js';
import { recordCreature, syncOwned, codexProgress, codexEntries, LORE } from '../dist/codex.js';
import { ensureLandBeasts, normalizeWildlife, stepLandBeast, seaFamily } from '../dist/wildlife.js';
import { ISLANDS } from '../dist/islands.js';
import { normalizeDevice, takeDevice, readLaptop, tickDevice, DEVICE_APPS } from '../dist/device.js';
import { placeBuilding } from '../dist/rules.js';
import { demolish } from '../dist/construction.js';
import { renamePet } from '../dist/housing.js';
import { makeHuman, animateHuman } from '../dist/human.js';
import { facilityId } from '../dist/facilities.js';
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
test('raft desk: device must be picked up on foot; desk is fixed; old saves get one', () => {
  const s = createState(5);
  assert.equal(s.device.owned, false);
  assert.ok(s.buildings.some(b => b.type === 'desk'));
  assert.ok(validateSave(s));
  assert.equal(takeDevice(s).ok, false, 'still on the boat');
  s.player = { ...s.player, mode: 'foot', x: 3.4, z: 3.2, level: 0 };
  assert.ok(takeDevice(s).ok);
  assert.equal(takeDevice(s).ok, false, 'only once');
  const l = readLaptop(s);
  assert.ok(l.ok && l.first && l.lines.length >= 4);
  assert.equal(readLaptop(s).first, false);
  assert.equal(placeBuilding(s, 'desk', 0, 0).ok, false, 'cannot build another desk');
  const desk = s.buildings.find(b => b.type === 'desk');
  assert.equal(demolish(s, facilityId(desk)).ok, false, 'cannot scrap the desk');
  tickDevice(s, 100, true);
  assert.ok(s.device.battery > 64 && s.device.battery <= 100);
  // a pre-0.11 save that has already been played
  const old = createState(6);
  delete old.device;
  old.buildings = old.buildings.filter(b => b.type !== 'desk');
  old.salvaged = 4;
  normalizeDevice(old);
  assert.equal(old.device.owned, true);
  assert.ok(old.buildings.some(b => b.type === 'desk'));
  assert.ok(DEVICE_APPS.some(a => a.id === 'beasts') && DEVICE_APPS.some(a => a.id === 'status'));
});
test('ferocity: deep-sea and hot-tempered beasts look savage, ordinary sea beasts stay docile', () => {
  const sea = Array.from({ length: 40 }, (_, i) => phenotype(makeGenome(300 + i, i % 4, 'sea')));
  assert.ok(sea.filter(p => p.fierce >= 0.55).length < sea.length / 4);
  const deep = Array.from({ length: 40 }, (_, i) => phenotype(makeGenome(300 + i, i % 4, 'deep')));
  assert.ok(deep.filter(p => p.fierce >= 0.35).length > deep.length * 0.6);
  const g = makeGenome(1, 0, 'sea');
  g.temper = [255, 255];
  assert.ok(phenotype(g).fierce >= 0.9);
  for (const p of [...sea, ...deep]) assert.ok(p.fierce >= 0 && p.fierce <= 1);
});
test('beasts can be renamed from the pen close-up', () => {
  const s = createState(8);
  s.tamed.push({ id: 'p1', genome: makeGenome(3, 0), name: '舊名', generation: 0 });
  assert.equal(renamePet(s, 'p1', '  小  浪  ').name, '小 浪');
  assert.equal(s.tamed[0].name, '小 浪');
  assert.equal(renamePet(s, 'p1', '').ok, false);
  assert.equal(renamePet(s, 'p1', 'x'.repeat(17)).ok, false);
  assert.equal(renamePet(s, 'nope', 'a').ok, false);
});
test('the protagonist rig: feet on the ground when standing, finite poses in every mode', () => {
  const h = makeHuman();
  h.updateMatrixWorld(true);
  const sole = () => {
    let min = Infinity;
    h.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      min = Math.min(min, b.min.y);
    });
    return min;
  };
  assert.ok(Math.abs(sole()) < 0.03, 'soles at y=0, got ' + sole());
  for (const mode of ['walk', 'sit', 'ride', 'row'])
    for (const speed of [0, 1.5, 3, 5])
      for (let i = 0; i < 20; i++) {
        animateHuman(h, 0.05, { speed, mode });
        h.updateMatrixWorld(true);
        h.traverse(o => assert.ok(Number.isFinite(o.matrixWorld.elements[13]), mode));
      }
  assert.equal(h.userData.legs.length, 2);
  assert.equal(h.userData.arms.length, 2);
});
test('offline cache lists every module with the current asset version', () => {
  const sw = readFileSync('dist/sw.js', 'utf8'),
    html = readFileSync('dist/index.html', 'utf8'),
    v = html.match(/game\.js\?v=([\d.]+)/)[1];
  assert.ok(sw.includes(`'beastidal-${v}'`), 'sw VERSION matches index.html');
  for (const f of readdirSync('dist').filter(f => f.endsWith('.js') && f !== 'sw.js'))
    assert.ok(sw.includes(`'./${f}?v=${v}'`), `${f} missing from sw.js`);
  assert.ok(sw.includes(`'./i18n/en.js?v=${v}'`));
  const versions = new Set([...(sw + html).matchAll(/\?v=([\d.]+)/g)].map(m => m[1]));
  assert.deepEqual([...versions], [v], 'stale ?v= query');
});
console.log(`${passed} progress tests passed.`);
