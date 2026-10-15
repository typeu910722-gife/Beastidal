// 0.46 適應期的裂痕: echoes heard in sleep, the laptop's three parts, and the new end of chapter one.
import assert from 'node:assert/strict';
import { createState, salvage, TREASURE_KIND } from '../dist/rules.js';
import { normalizeExpansion, explore, EXPLORE } from '../dist/expansion.js';
import { normalizeTravel } from '../dist/navigation.js';
import { normalizeStory, finishCrossing, SCRIPT } from '../dist/story.js';
import {
  ECHOES,
  LAPTOP_PARTS,
  echoOnWake,
  heardEchoes,
  findPart,
  missingParts,
  normalizeEchoes,
  repairLaptop
} from '../dist/echoes.js';
import { DAY } from '../dist/clock.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};
const fresh = () => {
  const s = normalizeTravel(createState(4242));
  normalizeExpansion(s);
  return s;
};

test('A fresh save hears only the monitor, one echo per night, and never the same one twice', () => {
  const s = fresh();
  assert.equal(echoOnWake(s).id, 'monitor');
  assert.equal(echoOnWake(s), null); // nothing else unlocked yet
  assert.equal(heardEchoes(s).length, 1);
  assert.equal(s.log[0].title, '回聲 · ……');
});

test('Echoes unlock with progress and skip ahead past ones still locked', () => {
  const s = fresh();
  echoOnWake(s);
  s.elapsed = DAY * 5; // day 6: the weekly report is unlocked, the nurse (buoy) is not
  assert.equal(echoOnWake(s).id, 'report');
  s.buoyFound = true;
  assert.equal(echoOnWake(s).id, 'nurse');
  s.tamed.push({ id: 'x' });
  s.device.laptop = true;
  assert.equal(echoOnWake(s).id, 'mother');
  assert.equal(echoOnWake(s).id, 'consent');
  assert.equal(echoOnWake(s), null);
  normalizeStory(s).story.stage = 5;
  assert.equal(echoOnWake(s).id, 'finger');
  assert.equal(echoOnWake(s).id, 'gate');
  // the carrier echo waits for the repaired laptop
  assert.equal(echoOnWake(s), null);
  s.echoes.repaired = true;
  assert.equal(echoOnWake(s).id, 'carrier');
  assert.equal(heardEchoes(s).length, ECHOES.length);
});

test('The first drift chest holds the power module; ordinary drifts do not', () => {
  const s = fresh();
  s.loot = [
    { id: 'a', x: s.player.x, z: s.player.z, kind: 0 },
    { id: 'b', x: s.player.x, z: s.player.z, kind: TREASURE_KIND },
    { id: 'c', x: s.player.x, z: s.player.z, kind: TREASURE_KIND }
  ];
  assert.equal(salvage(s, 'a').part, null);
  const r = salvage(s, 'b');
  assert.ok(r.ok && r.part.includes('電源模組'));
  for (const k of Object.keys(s.resources)) s.resources[k] = 0; // make room in the bag
  const again = salvage(s, 'c');
  assert.ok(again.ok, again.error);
  assert.equal(again.part, null); // only once
  assert.deepEqual(normalizeEchoes(s).parts, ['power']);
});

test('Exploring the castaway chest and the stele gives the other two parts', () => {
  const s = fresh();
  for (const id of ['palm-cache', 'archive']) {
    const site = EXPLORE.find(p => p.id === id);
    Object.assign(s.player, { x: site.x, z: site.z, mode: 'foot' });
    const r = explore(s, id);
    assert.ok(r.ok, r.error);
    assert.ok(r.part);
  }
  assert.deepEqual(missingParts(s), ['power']);
});

test('The laptop needs all three parts, then recovers what should not be there', () => {
  const s = fresh();
  assert.equal(repairLaptop(s).ok, false);
  for (const k of Object.keys(LAPTOP_PARTS)) findPart(s, k);
  assert.equal(findPart(s, 'power'), null);
  const r = repairLaptop(s);
  assert.ok(r.ok);
  assert.ok(r.lines.some(l => l.includes('慈愛組織')));
  assert.ok(r.lines.some(l => l.includes('非模擬資料')));
  assert.equal(repairLaptop(s).ok, false);
});

test('Old saves that already opened those sites get their parts', () => {
  const s = fresh();
  s.expedition.collected = ['palm-cache', 'archive'];
  delete s.echoes;
  assert.deepEqual(normalizeEchoes(s).parts.sort(), ['antenna', 'memory']);
});

test('Over the ridge: a continent, the broadcast, and the end of chapter one', () => {
  const s = fresh();
  normalizeStory(s).story.stage = 5;
  assert.ok(SCRIPT.cross.some(([who, line]) => who === '廣播' && line.includes('新生之界')));
  finishCrossing(s);
  assert.equal(s.story.stage, 6);
  assert.equal(s.log[0].title, '第一章 完 · 適應期結束');
});

console.log(`\n${n} echo tests passed.`);
