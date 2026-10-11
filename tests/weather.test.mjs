// 0.24: seasons and weather — a fixed schedule from the seed, storms with a warning, seasonal effects.
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { DAY } from '../dist/clock.js';
import {
  SEASONS,
  SEASON_IDS,
  SEASON_DAYS,
  WEATHER,
  SLOT,
  weatherAt,
  seasonOf,
  stormClock,
  stormAt,
  fishingWaitFactor,
  harvestBonus,
  oxygenShift,
  spawnMods,
  describeSky
} from '../dist/weather.js';
import { oxygenMax, stormAt as expansionStorm } from '../dist/expansion.js';
import { pickSpecies, ZONES } from '../dist/species.js';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓ ' + name);
};

test('Seasons: four of them, four days each, cycling with the calendar', () => {
  assert.equal(SEASON_IDS.length, 4);
  const s = createState(24);
  assert.equal(seasonOf(s), 'spring');
  s.elapsed = DAY * SEASON_DAYS;
  assert.equal(seasonOf(s), 'summer');
  s.elapsed = DAY * SEASON_DAYS * 4;
  assert.equal(seasonOf(s), 'spring');
  for (const id of SEASON_IDS) assert.ok(SEASONS[id].name && SEASONS[id].note);
  assert.ok(describeSky(s).includes(SEASONS.spring.name));
});
test('Weather: a seeded schedule in spells, clear at the very start, every kind with its look; snow only in winter', () => {
  const s = createState(24);
  assert.equal(weatherAt(s, 0).kind, 'clear');
  const a = weatherAt(s, 5000),
    b = weatherAt(s, 5000);
  assert.equal(a.kind, b.kind);
  assert.equal(a.end - a.start, SLOT);
  const kinds = new Set();
  for (let t = 600; t < DAY * 16; t += SLOT) kinds.add(weatherAt(s, t).kind);
  assert.ok(kinds.size >= 4, [...kinds].join());
  for (const k of kinds) assert.ok(WEATHER[k].name);
  for (let t = 600; t < DAY * SEASON_DAYS * 3; t += SLOT)
    assert.notEqual(weatherAt(s, t).kind, 'snow', 'no snow before winter');
  const other = createState(99);
  let diff = 0;
  for (let t = 600; t < DAY * 8; t += SLOT) if (weatherAt(s, t).kind !== weatherAt(other, t).kind) diff++;
  assert.ok(diff > 0, 'seeds differ');
});
test('Storms: the clock warns 30 s before a thunderstorm and runs while it rages; expansion agrees', () => {
  const s = createState(24);
  let t = SLOT * 3;
  while (!(weatherAt(s, t).kind === 'thunder' && weatherAt(s, t - SLOT).kind !== 'thunder') && t < DAY * 40) t += SLOT;
  assert.ok(weatherAt(s, t).kind === 'thunder', 'a thunderstorm exists within the schedule');
  s.elapsed = t + 10;
  assert.ok(stormAt(s) && expansionStorm(s));
  assert.equal(stormClock(s).phase, 'storm');
  s.elapsed = t - 10;
  assert.equal(stormClock(s)?.phase, 'warn');
  s.elapsed = t - 200;
  assert.equal(stormClock(s), null);
});
test('Seasonal effects: autumn harvest, winter air and spawns, summer bites', () => {
  const s = createState(24);
  s.elapsed = DAY * SEASON_DAYS * 2; // autumn
  assert.equal(harvestBonus(s), 1);
  assert.ok(spawnMods(s).rare > 1);
  s.elapsed = DAY * SEASON_DAYS * 3; // winter
  assert.equal(oxygenShift(s), -10);
  assert.equal(oxygenMax(s), 80);
  assert.ok(fishingWaitFactor(s) > 1);
  const mods = spawnMods(s),
    shallows = ZONES.find(z => z.id === 'shallows');
  let deep = 0;
  for (let i = 0; i < 300; i++) {
    const roll = i / 300;
    const sp = pickSpecies(shallows, () => 0.999 - roll * 0.998, mods);
    if (sp.family === 'deep') deep++;
  }
  assert.equal(deep, 0, 'the shallows hold no deep species, even in winter');
  s.elapsed = DAY * SEASON_DAYS; // summer
  assert.ok(fishingWaitFactor(s) < 1);
});
console.log(`weather tests: ${n} passed`);
