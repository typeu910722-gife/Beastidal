// Wild population (0.21): every part of the lake and its shores has its own zone with a pool of species and a
// few rare ones found nowhere else. Creatures spawn where the player is heading, keep a modest density, and
// drift away again when left far behind. Sea and deep species roam the water; land species and plant mutants
// live on the islands and along the foot of the mountains.
import { makeGenome, normalizeGenome, LINEAGE_BASE, phenotype, seeded, familyOf } from './genetics.js?v=0.58.0';
import { ISLANDS, onIsland, islandAt } from './islands.js?v=0.58.0';
import { walkable, landNear, waterNear, groundAt } from './lake.js?v=0.58.0';
import { stepFlee, turnToward } from './physics.js?v=0.58.0';
import { ZONES, pickSpecies } from './species.js?v=0.58.0';
import { rollTame } from './taming.js?v=0.58.0';
import { makeWildBeast, beastsFor, BEAST_SPAWN_P } from './beasts.js?v=0.58.0';
import { addRandomGene } from './bsgenes.js?v=0.58.0';
import { spawnMods } from './weather.js?v=0.58.0';

export const WILD_CAP = 40;
export const DESPAWN_RANGE = 260;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Farther from the raft, deeper water: deep species become common past ~60 m (kept for old saves).
export function seaFamily(x, z, r = Math.random) {
  const far = Math.hypot(x, z) > 60,
    roll = r();
  return roll < (far ? 0.52 : 0.26) ? 'deep' : 'sea';
}
export function seaGenome(x, z, r = Math.random) {
  return makeGenome(Math.floor(r() * 1e9), Math.floor(r() * 4), seaFamily(x, z, r), Math.floor(r() * 3));
}
function makeWild(s, zone, sp, x, z, r) {
  const genome = makeGenome(Math.floor(r() * 1e9), sp.form, sp.family, sp.strain),
    deep = sp.family === 'deep';
  // a rare one sometimes already carries a 比斯基因
  if (sp.rare && r() < 0.5) addRandomGene(genome, r, sp.family);
  const w = {
    id: `w-${zone.id}-${Math.floor(r() * 1e9).toString(36)}`,
    zone: zone.id,
    x,
    z,
    homeX: x,
    homeZ: z,
    heading: r() * 6.28,
    phase: r() * 6,
    genome,
    trust: 0,
    tame: rollTame(r),
    hostile: sp.rare ? r() < 0.5 : deep ? r() < 0.3 : false
  };
  if (zone.kind === 'land') {
    if (zone.island) w.island = zone.island;
    else w.land = true;
  }
  return w;
}
// a random spot inside a zone that suits its kind
function spotIn(s, zone, r) {
  for (let k = 0; k < 24; k++) {
    const a = r() * Math.PI * 2,
      d = (zone.island ? 0.15 + r() * 0.6 : Math.sqrt(r())) * (zone.island ? 1 : zone.r);
    let x, z;
    if (zone.island) {
      const isl = ISLANDS.find(i => i.id === zone.island);
      x = isl.x + Math.sin(a) * isl.rx * d;
      z = isl.z + Math.cos(a) * isl.rz * d;
      if (walkable(x, z) && onIsland(x, z)?.id === zone.island) return { x, z };
    } else if (zone.kind === 'land') {
      // the foothills: dry ground near the player that is not an island
      const dd = 30 + r() * 70;
      x = s.player.x + Math.sin(a) * dd;
      z = s.player.z + Math.cos(a) * dd;
      const at = landNear(x, z, { min: 1.5, max: 30, maxSlope: 0.6, radius: 40 });
      if (at && walkable(at.x, at.z) && !onIsland(at.x, at.z) && groundAt(at.x, at.z) < 60) return at;
    } else {
      x = zone.x + Math.sin(a) * d;
      z = zone.z + Math.cos(a) * d;
      const at = waterNear(x, z, 3, 40);
      if (at && groundAt(at.x, at.z) < -3 && !islandAt(at.x, at.z, 2)) return at;
    }
  }
  return null;
}
export function zonesNear(s) {
  const ashore = ['foot', 'cabin', 'aboard'].includes(s.player.mode) && !s.inCave;
  return ZONES.filter(z => {
    if (z.id === 'foothills') return s.player.mode === 'foot' && !onIsland(s.player.x, s.player.z) && !s.inCave;
    if (z.kind === 'land') return dist(s.player, z) < z.r + (ashore ? 40 : 120);
    return dist(s.player, z) < z.r + 60;
  });
}
// Called every few seconds: thins the far-off, fills the nearby zones one creature at a time. Returns the newcomer.
export function spawnWild(s, r = Math.random) {
  s.wild ??= [];
  if (s.inCave || s.inTown || s.player.mode === 'cabin') return null;
  s.wild = s.wild.filter(
    w => w.follow || w.event || w.rescue || w.trust > 0 || dist(w, s.player) < DESPAWN_RANGE || !w.zone
  );
  if (s.wild.length >= WILD_CAP) return null;
  const zones = zonesNear(s).filter(z => s.wild.filter(w => w.zone === z.id).length < z.cap);
  if (!zones.length) return null;
  const zone = zones[Math.floor(r() * zones.length)],
    at = spotIn(s, zone, r);
  if (!at) return null;
  // never right under the player's nose
  if (dist(at, s.player) < 14) return null;
  // 0.22: now and then a zone turns up a wild low-tier 御獸 instead of a creature
  const kinds = beastsFor(zone.kind);
  if (kinds.length && r() < BEAST_SPAWN_P && !s.wild.some(w => w.beast && w.zone === zone.id)) {
    const b = makeWildBeast(kinds[Math.floor(r() * kinds.length)], r),
      w = {
        ...b,
        id: `b-${zone.id}-${Math.floor(r() * 1e9).toString(36)}`,
        zone: zone.id,
        x: at.x,
        z: at.z,
        homeX: at.x,
        homeZ: at.z,
        heading: r() * 6.28,
        phase: r() * 6,
        tame: false
      };
    if (zone.kind === 'land') {
      if (zone.island) w.island = zone.island;
      else w.land = true;
    }
    s.wild.push(w);
    return w;
  }
  const w = makeWild(s, zone, pickSpecies(zone, r, spawnMods(s)), at.x, at.z, r);
  s.wild.push(w);
  return w;
}
// 0.40: under water the sea has its own life. While you dive, sea and deep creatures (now and then a wild beast)
// appear around you at your depth, drift about down there and stay out of reach of the surface — and the surface
// ones stay out of yours. When you come up they stay below (only one that follows you comes up with you).
export const UNDER_CAP = 7;
const UNDER_RANGE = 90;
export function spawnUnder(s, r = Math.random) {
  s.wild ??= [];
  if (!s.expedition?.diving || s.inCave) {
    if (s.wild.some(w => w.under)) {
      for (const w of s.wild) if (w.under && w.follow) delete w.under;
      s.wild = s.wild.filter(w => !w.under);
    }
    return null;
  }
  s.wild = s.wild.filter(w => !w.under || w.follow || dist(w, s.player) < UNDER_RANGE);
  if (s.wild.filter(w => w.under).length >= UNDER_CAP) return null;
  const depth = s.expedition.depth ?? -3;
  for (let k = 0; k < 12; k++) {
    const a = r() * Math.PI * 2,
      d = 12 + r() * 26,
      x = s.player.x + Math.sin(a) * d,
      z = s.player.z + Math.cos(a) * d,
      g = groundAt(x, z);
    if (g > -4 || islandAt(x, z, 2)) continue;
    const zone = ZONES.filter(zn => zn.kind === 'sea').sort(
      (p, q) => dist(p, { x, z }) / p.r - dist(q, { x, z }) / q.r
    )[0];
    if (!zone) return null;
    const y = Math.max(g + 1.4, Math.min(-2.2, depth + (r() - 0.5) * 7));
    let w;
    const kinds = beastsFor('sea');
    if (kinds.length && r() < 0.1 && !s.wild.some(v => v.under && v.beast))
      w = {
        ...makeWildBeast(kinds[Math.floor(r() * kinds.length)], r),
        id: `ub-${Math.floor(r() * 1e9).toString(36)}`,
        zone: zone.id,
        x,
        z,
        homeX: x,
        homeZ: z,
        heading: r() * 6.28,
        phase: r() * 6,
        tame: false
      };
    else {
      w = makeWild(s, zone, pickSpecies(zone, r, spawnMods(s)), x, z, r);
      w.id = 'u' + w.id;
    }
    // (its own count, apart from the surface zones' caps)
    delete w.zone;
    w.under = true;
    w.y = y;
    s.wild.push(w);
    return w;
  }
  return null;
}
// One land beast per island from the start, so the shores are never empty (replaced when tamed).
export function ensureLandBeasts(s, r = Math.random) {
  s.wild ??= [];
  const added = [];
  for (const isl of ISLANDS) {
    if (s.wild.some(w => w.island === isl.id)) continue;
    const zone = ZONES.find(z => z.island === isl.id),
      at = spotIn(s, zone, r) || landNear(isl.x, isl.z, { min: 1.5, maxSlope: 0.6 });
    const w = makeWild(s, zone, pickSpecies(zone, r), at.x, at.z, r);
    w.id = `land-${isl.id}-${Math.floor(r() * 1e6)}`;
    s.wild.push(w);
    added.push(w);
  }
  return added;
}
// Old saves: their wild creatures predate lineage, so give each a family from its id (stable across loads);
// owned creatures keep the classic family so the player's beasts stay the species they tamed. Plant mutants
// moved ashore in 0.21: any still at sea walk to the nearest shore.
export function normalizeWildlife(s) {
  for (const w of s.wild || []) {
    if (w.genome && !Array.isArray(w.genome.lineage)) {
      const r = seeded([...String(w.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
      const fam = seaFamily(w.x, w.z, r);
      w.genome.lineage = [LINEAGE_BASE[fam], LINEAGE_BASE[fam]];
    }
    if (w.genome) normalizeGenome(w.genome);
    if (w.genome && !w.island && !w.land && familyOf(w.genome.lineage[0]) === 'flora') {
      const at = landNear(w.x, w.z, { min: 1.5, max: 40, maxSlope: 0.6, radius: 120 });
      if (at) {
        Object.assign(w, { x: at.x, z: at.z, homeX: at.x, homeZ: at.z });
        const isl = onIsland(at.x, at.z);
        if (isl) w.island = isl.id;
        else w.land = true;
      }
    }
  }
  // saves from before the basin map: land beasts standing where the old islands were walk back ashore
  for (const w of s.wild || []) {
    const isl = w.island && ISLANDS.find(i => i.id === w.island);
    if (isl && !insideIsland(isl, w.x, w.z)) {
      const at = landNear(isl.x, isl.z, { min: 1.5, maxSlope: 0.6 });
      Object.assign(w, { x: at.x, z: at.z, homeX: at.x, homeZ: at.z });
    }
  }
  for (const p of s.tamed || []) normalizeGenome(p.genome);
  for (const e of s.eggs || []) if (e.genome) normalizeGenome(e.genome);
  return s;
}
const insideIsland = (isl, x, z) => walkable(x, z) && onIsland(x, z)?.id === isl.id;
export const ashore = w => !!(w.island || w.land);
// Land beasts amble around their spot, flee across the shore when startled, and never walk into the lake.
export function stepLandBeast(w, dt, elapsed) {
  const isl = w.island ? ISLANDS.find(i => i.id === w.island) : null;
  if (w.island && !isl) return;
  const ox = w.x,
    oz = w.z;
  if (!stepFlee(w, dt, elapsed)) {
    const tx = w.homeX + Math.sin(elapsed * 0.07 + w.phase) * 2.2,
      tz = w.homeZ + Math.cos(elapsed * 0.05 + w.phase) * 2.2,
      dx = tx - w.x,
      dz = tz - w.z,
      len = Math.hypot(dx, dz);
    if (len > 0.3) {
      const speed = 0.35 + phenotype(w.genome).speed / 260;
      w.x += (dx / len) * speed * dt;
      w.z += (dz / len) * speed * dt;
      w.heading = turnToward(w.heading || 0, Math.atan2(dx, dz), dt * 2);
    }
  }
  const ok = isl ? insideIsland(isl, w.x, w.z) : walkable(w.x, w.z);
  if (!ok) {
    w.x = ox;
    w.z = oz;
    w.vx = 0;
    w.vz = 0;
    w.homeX = w.x;
    w.homeZ = w.z;
  }
}
