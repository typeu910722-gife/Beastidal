// Playtest bot: plays the game's real rules the way a focused player would, following the inner monologue's
// next step, and reports how long each milestone takes, how much is spent salvaging, and how often the bag sends
// you home. Run `node scripts/pacing.mjs [seed]` (add `--quiet` for the summary only). Used to tune the pacing.
import {
  createState,
  salvage,
  placeBuilding,
  tickSystems,
  craftBait,
  useSupply,
  RECIPES,
  buildError,
  canPay
} from '../dist/rules.js';
import {
  deposit,
  bagRoom,
  bagUsed,
  bagCap,
  nearDesk,
  upgradeBag,
  nextBag,
  normalizeBag,
  unloadAtHome
} from '../dist/bag.js';
import { takeDevice, normalizeDevice } from '../dist/device.js';
import { monologue } from '../dist/guide.js';
import { feed, craftContract, contract, normalizeTaming } from '../dist/taming.js';
import { trainPet, commandPet, upgradeBoat, normalizeExpansion, tickExpansion } from '../dist/expansion.js';
import { claimIsland, startFusion, tickShip, normalizeShip } from '../dist/ship.js';
import { spawnRescue, freeRescue, shareFood, tickRescue, RESCUE_ID } from '../dist/rescue.js';
import { useFacility, facilityId } from '../dist/facilities.js';
import { ISLANDS, NODES, harvest } from '../dist/islands.js';
import { normalizeTravel } from '../dist/navigation.js';
import { normalizeHousing } from '../dist/housing.js';
import { seeded } from '../dist/genetics.js';

const quiet = process.argv.includes('--quiet');
const seed = Number(process.argv.find(a => /^\d+$/.test(a)) || 7);
const rng = seeded(seed);
const s = normalizeTravel(createState(seed));
normalizeExpansion(s);
normalizeDevice(s);
normalizeBag(s);
spawnRescue(s);
const HOME = { x: 1.8, z: 4.2 };
const stats = { salvages: 0, harvests: 0, homeTrips: 0, travel: 0, idle: 0, deaths: 0, bagFull: 0 };
const milestones = [];
let lastStep = null;
const say = (...a) => quiet || console.log(...a);
const t = () => `${Math.floor(s.elapsed / 60)}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}`;

// time passes: the world ticks and the player eats and drinks when it gets low
function pass(dt, safe = false) {
  while (dt > 0) {
    const step = Math.min(2, dt);
    tickSystems(s, step, safe, rng);
    tickExpansion(s, step, safe);
    tickShip(s);
    tickRescue(s);
    dt -= step;
    for (const k of ['water', 'food']) if (s.vitals[k] < 45 && s.resources[k] > 0) useSupply(s, k);
    if (s.vitals.health <= 0) {
      stats.deaths++;
      s.vitals = { health: 65, food: 50, water: 55 };
    }
  }
}
function travel(x, z, speed = 6) {
  const d = Math.hypot(x - s.player.x, z - s.player.z);
  const dt = d / speed;
  stats.travel += dt;
  pass(dt);
  s.player.x = x;
  s.player.z = z;
}
function goHome() {
  s.player.mode = 'boat';
  travel(HOME.x + 5, HOME.z + 5);
  s.player.mode = 'foot';
  s.player.x = HOME.x;
  s.player.z = HOME.z;
  // landing at home unloads the haul into the desk's storage, as in the game
  if (unloadAtHome(s)) stats.homeTrips++;
}
function goSea() {
  s.player.mode = 'boat';
}
// gather: the nearest drift, unless the bag is full (then home to the desk)
function gatherOnce() {
  if (!bagRoom(s)) {
    stats.bagFull++;
    goHome();
    if (nearDesk(s)) deposit(s);
    if (nextBag(s) && canPay(s, nextBag(s).cost)) upgradeBag(s);
    return;
  }
  goSea();
  const l = [...s.loot].sort(
    (a, b) => Math.hypot(a.x - s.player.x, a.z - s.player.z) - Math.hypot(b.x - s.player.x, b.z - s.player.z)
  )[0];
  if (!l) {
    stats.idle += 5;
    pass(5);
    return;
  }
  travel(l.x, l.z);
  pass(1.5); // reeling it in
  if (salvage(s, l.id).ok) stats.salvages++;
}
function cellFor(type) {
  for (let r = 0; r < 6; r++)
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (!buildError(s, type, x, z, 0)) return { x, z };
  return null;
}
function build(type) {
  goHome();
  if (!canPay(s, RECIPES[type].cost)) return false;
  const c = cellFor(type);
  if (!c) return false;
  return placeBuilding(s, type, c.x, c.z).ok;
}
const pet = () => s.tamed[0];
function act(step) {
  switch (step) {
    case 'salvage':
      return gatherOnce();
    case 'rescue': {
      const w = s.wild.find(w => w.id === RESCUE_ID);
      goSea();
      travel(w.x + 2, w.z);
      freeRescue(s);
      if (!shareFood(s).ok) gatherOnce();
      return;
    }
    case 'device':
      goHome();
      takeDevice(s);
      return;
    case 'buoy':
      goSea();
      travel(17, -11);
      s.secret = true;
      s.buoyFound = true;
      s.resources.bait += 6;
      s.resources.crystal += 3;
      s.resources.fiber += 4;
      return;
    case 'tame': {
      // bait and a contract scroll, then feed the friendliest beast and bind it
      const w =
        s.wild.find(w => w.id === RESCUE_ID) ||
        [...s.wild].filter(w => !w.hostile).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
      if (!(s.contracts > 0)) {
        const table = s.buildings.find(b => b.type === 'table');
        if (!table) return build('table') || gatherOnce();
        goHome();
        s.player.x = table.x * 3.6;
        s.player.z = table.z * 3.6;
        if (!craftContract(s, table).ok) return gatherOnce();
      }
      if (w.trust < 60) {
        if (s.resources.bait < 2 * (w.feeds || 0) + 1) {
          goHome();
          if (!craftBait(s).ok) return gatherOnce();
          return;
        }
        travel(w.x, w.z);
        feed(s, w.id, rng);
        pass(2);
        return;
      }
      travel(w.x, w.z);
      contract(s, w.id, rng);
      normalizeHousing(s);
      return;
    }
    case 'bond': {
      const p = pet();
      const r = trainPet(s, p.id);
      if (!r.ok) gatherOnce();
      else pass(3);
      return;
    }
    case 'scan': {
      const b = s.buildings.find(b => b.type === 'beacon');
      goHome();
      s.player.x = b.x * 3.6;
      s.player.z = b.z * 3.6;
      useFacility(s, facilityId(b), 'signal');
      return;
    }
    case 'claim': {
      const p = pet();
      if (!commandPet(s, p.id, 'follow').ok) return act('bond');
      const CC = { wood: 20, metal: 12, fiber: 8, crystal: 5 };
      goHome();
      if (!canPay(s, CC)) return gatherOnce();
      for (const [k, v] of Object.entries(CC)) {
        const take = Math.min(s.storage[k] || 0, v);
        s.storage[k] -= take;
        s.resources[k] += take;
      }
      const i = ISLANDS.find(v => v.id === 'palm');
      goSea();
      travel(i.x, i.z);
      s.player.mode = 'foot';
      s.player.x = i.x;
      s.player.z = i.z;
      const r = claimIsland(s, 'palm', p);
      // collect what the island offers while here
      for (const n of NODES.filter(n => n.island === 'palm')) {
        s.player.x = n.x;
        s.player.z = n.z;
        if (harvest(s, n.id).ok) stats.harvests++;
      }
      s.player.x = i.x;
      s.player.z = i.z;
      if (!r.ok) gatherOnce();
      return;
    }
    case 'boat':
      goHome();
      if (!upgradeBoat(s).ok) gatherOnce();
      return;
    case 'fuse':
      goHome();
      if (!startFusion(s).ok) gatherOnce();
      return;
    case 'fusing':
      pass(10);
      return;
    default: {
      const type = {
        floor: 'floor',
        floors: 'floor',
        shelter: 'shelter',
        collector: 'collector',
        beacon: 'beacon',
        pen: 'pen',
        pens: 'pen',
        dock: 'dock'
      }[step];
      if (type) {
        if (!build(type)) gatherOnce();
        return;
      }
      return 'stop';
    }
  }
}
const LIMIT_S = 4 * 3600;
let guard = 0;
while (s.elapsed < LIMIT_S && guard++ < 200000) {
  normalizeTaming(s);
  normalizeShip(s);
  const m = monologue(s);
  const step = m?.id;
  if (step !== lastStep) {
    milestones.push({ step, at: s.elapsed, salvages: stats.salvages, trips: stats.homeTrips });
    say(
      `${t()}  → ${step}   (salvaged ${stats.salvages}, home trips ${stats.homeTrips}, bag ${bagUsed(s)}/${bagCap(s)})`
    );
    lastStep = step;
  }
  if (!step || step === 'helm' || act(step) === 'stop') break;
}
const minutes = x => (x / 60).toFixed(1);
console.log(`\nseed ${seed}: reached "${lastStep}" at ${t()} of game time`);
console.log(
  `salvages ${stats.salvages}, island harvests ${stats.harvests}, desk trips ${stats.homeTrips}, bag full ${stats.bagFull}×, travelling ${minutes(stats.travel)} min, waiting for drift ${minutes(stats.idle)} min, collapses ${stats.deaths}`
);
const spans = milestones.map((m, i) => [m.step, minutes((milestones[i + 1]?.at ?? s.elapsed) - m.at)]);
console.log('minutes per step: ' + spans.map(([k, v]) => `${k} ${v}`).join(' · '));
