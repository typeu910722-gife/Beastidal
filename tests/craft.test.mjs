// 0.23: gear, skills, fishing, island reclamation with land buildings, and the base rating.
import assert from 'node:assert/strict';
import { createState, craftItem, placeBuilding } from '../dist/rules.js';
import { GEAR_IDS, hasGear, normalizeGear } from '../dist/gear.js';
import {
  SKILLS,
  SKILL_IDS,
  normalizeSkills,
  gainSkill,
  skillLevel,
  learnFrom,
  gatherBonus,
  sailBonus,
  trustBonus,
  damageBonus
} from '../dist/skills.js';
import { tally } from '../dist/stats.js';
import { startFishing, tickFishing, reel, canFishHere, CATCHES } from '../dist/fishing.js';
import {
  LAND_BUILDS,
  normalizePlots,
  plotTargets,
  startClearing,
  tickPlots,
  buildOnPlot,
  removeLandBuild,
  plotsOf,
  PLOTS_PER_ISLAND,
  clearDuration
} from '../dist/reclaim.js';
import { TIERS, ratingScore, ratingTier, tickRating, ratingStars } from '../dist/rating.js';
import { oxygenMax, normalizeExpansion } from '../dist/expansion.js';
import { setClimbing, walkable } from '../dist/lake.js';
import { ITEMS, CRAFTS, CARRYABLE } from '../dist/items.js';

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
  const s = createState(23);
  s.secret = true;
  for (const k of [
    'wood',
    'metal',
    'fiber',
    'crystal',
    'nails',
    'rope',
    'glass',
    'leather',
    'cloth',
    'spore',
    'charcoal'
  ])
    s.resources[k] = 10;
  s.bagLevel = 4;
  normalizeExpansion(s);
  normalizeGear(s);
  normalizeSkills(s);
  normalizePlots(s);
  return s;
}

test('Gear: four tools crafted once at the work table, kept rather than carried, with their effects', () => {
  const s = base();
  assert.equal(GEAR_IDS.length, 4);
  for (const id of GEAR_IDS) assert.ok(ITEMS[id] && CRAFTS[id]?.gear && !CARRYABLE.includes(id), id);
  const o2 = oxygenMax(s);
  const r = craftItem(s, 'mask');
  assert.ok(r.ok && r.gear === 'mask' && hasGear(s, 'mask'));
  assert.equal(oxygenMax(s), o2 + 40);
  assert.equal(craftItem(s, 'mask').ok, false, 'only one');
  s.resources.rope = 0;
  assert.equal(craftItem(s, 'hook').ok, false, 'needs rope');
  // the climbing hook opens steeper ground
  const steep = [];
  for (let x = -600; x < 700 && steep.length < 1; x += 7)
    for (let z = -400; z < 400 && steep.length < 1; z += 7) {
      setClimbing(false);
      const a = walkable(x, z);
      setClimbing(true);
      if (!a && walkable(x, z)) steep.push([x, z]);
    }
  setClimbing(false);
  assert.ok(steep.length, 'somewhere the hook makes the difference');
});
test('Skills: tallies teach, levels follow thresholds, bonuses scale', () => {
  const s = base();
  assert.equal(SKILL_IDS.length, 6);
  assert.equal(skillLevel(s, 'fishing'), 1);
  assert.equal(gainSkill(s, 'fishing', 20), 2);
  assert.equal(gainSkill(s, 'fishing', 5), 0);
  tally(s, 'harvest', 5); // 20 xp → level 2
  assert.equal(skillLevel(s, 'gathering'), 2);
  assert.equal(learnFrom(s, 'nothing'), 0);
  gainSkill(s, 'gathering', 100);
  assert.ok(gatherBonus(s) >= 1);
  gainSkill(s, 'sailing', 1000);
  assert.equal(skillLevel(s, 'sailing'), 10);
  assert.ok(Math.abs(sailBonus(s) - 1.18) < 1e-9);
  gainSkill(s, 'taming', 50);
  assert.equal(trustBonus(s), skillLevel(s, 'taming') - 1);
  assert.equal(damageBonus(s), 0);
  assert.ok(s.skillUps.length >= 3);
  for (const k of SKILL_IDS) assert.ok(SKILLS[k].name && SKILLS[k].perk);
});
test('Fishing: needs the rod and water, bites after a wait, reels within the window, catches by depth', () => {
  const s = base();
  Object.assign(s.player, { x: 0, z: 0, mode: 'boat', heading: 0 });
  assert.equal(canFishHere(s).ok, false);
  s.gear.rod = true;
  assert.ok(canFishHere(s).ok);
  s.expedition.mounted = true;
  assert.equal(canFishHere(s).ok, false);
  s.expedition.mounted = false;
  const r = startFishing(s, seq(0.5));
  assert.ok(r.ok && s.fishing);
  assert.equal(tickFishing(s), null);
  assert.ok(reel(s).early, 'too early');
  startFishing(s, seq(0.5));
  s.elapsed = s.fishing.biteAt;
  assert.equal(tickFishing(s), 'bite');
  const fish = s.resources.fish || 0;
  const got = reel(s, seq(0.1));
  assert.ok(got.ok && CATCHES[got.key]);
  assert.ok(s.resources.fish > fish || got.key !== 'fish');
  startFishing(s, seq(0.5));
  s.elapsed = s.fishing.biteAt + 3;
  tickFishing(s);
  assert.equal(tickFishing(s), 'lost');
  assert.equal(s.fishing, null);
  // deep water: the big ones
  s.gear.rod = true;
  Object.assign(s.player, { x: 150, z: 60 });
  startFishing(s, seq(0.5));
  s.elapsed = s.fishing.biteAt;
  tickFishing(s);
  const deep = reel(s, seq(0.8));
  assert.ok(deep.ok && (deep.key === 'bigfish' || deep.key === 'pearl' || deep.key === 'bait'));
});
test('Reclaim: six plots per claimed island; clearing takes time (faster with helpers), then a building goes up', () => {
  const s = base();
  s.occupied = ['palm'];
  const plots = plotTargets(s);
  assert.equal(plots.length, PLOTS_PER_ISLAND);
  const p = plotsOf('palm')[0];
  assert.ok(walkable(p.x, p.z), 'plot on dry ground');
  Object.assign(s.player, { x: p.x, z: p.z, mode: 'foot' });
  assert.equal(startClearing(s, 'crystal', 0).ok, false, 'not claimed');
  const plain = clearDuration(s);
  s.tamed.push({ id: 'h', job: 'lumber', bond: 50, genome: {}, kind: 'creature' });
  assert.ok(clearDuration(s) < plain);
  assert.ok(startClearing(s, 'palm', 0).ok);
  assert.equal(startClearing(s, 'palm', 0).ok, false, 'already clearing');
  assert.equal(buildOnPlot(s, 'palm', 0, 'well').ok, false, 'not yet');
  s.elapsed += 100;
  const wood = s.resources.wood + (s.storage?.wood || 0);
  const ev = tickPlots(s);
  assert.ok(ev.some(e => e.type === 'cleared'));
  assert.ok(s.resources.wood + (s.storage?.wood || 0) > wood);
  assert.equal(s.plots.palm[0].state, 'cleared');
  assert.ok(Object.keys(LAND_BUILDS).length === 7);
  assert.ok(buildOnPlot(s, 'palm', 0, 'well').ok);
  assert.equal(plotTargets(s)[0].build, 'well');
  s.elapsed += 200;
  const water = s.storage?.water || 0;
  assert.ok(tickPlots(s).some(e => e.type === 'produce'));
  assert.ok((s.storage.water || 0) > water);
  assert.ok(removeLandBuild(s, 'palm', 0).ok);
  assert.equal(s.plots.palm[0].state, 'cleared');
});
test('Rating: the base climbs the tiers as it grows and each tier pays once', () => {
  const s = base();
  assert.equal(ratingTier(s).id, 0);
  assert.equal(tickRating(s).length, 0);
  assert.equal(ratingStars(s), '★☆☆☆☆');
  s.resources.wood = 40;
  const placed = placeBuilding(s, 'floor', 2, 1);
  assert.ok(placed.ok, placed.error);
  assert.ok(s.stats.tally.build >= 1, 'building teaches');
  s.ship = {
    x: 0,
    z: 40,
    heading: 0,
    cargo: {},
    lounge: [],
    cabin: {
      items: Array.from({ length: 10 }, (_, i) => ({ id: 'i' + i, type: 'sofa', floor: 1, x: 0, z: 0, rot: 0 }))
    }
  };
  s.occupied = ['palm', 'crystal'];
  assert.ok(ratingScore(s) >= TIERS[1].at);
  const c = s.contracts || 0;
  const reached = tickRating(s);
  assert.ok(reached.length >= 1 && reached[0].id === 1);
  assert.equal(tickRating(s).length, 0, 'paid once');
  assert.ok((s.contracts || 0) >= c);
});
console.log(`craft tests: ${n} passed`);
