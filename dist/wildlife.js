// Wild population across the four families (0.10): sea and deep species roam the water, a few land beasts live
// on the islands, and plant mutants turn up rarely anywhere at sea.
import { makeGenome, normalizeGenome, LINEAGE_BASE, phenotype, seeded } from './genetics.js?v=0.9.0';
import { ISLANDS } from './islands.js?v=0.9.0';
import { stepFlee, turnToward } from './physics.js?v=0.9.0';

// Farther from the raft, deeper water: deep species become common past ~60 m.
export function seaFamily(x, z, r = Math.random) {
  const far = Math.hypot(x, z) > 60,
    roll = r();
  return roll < 0.09 ? 'flora' : roll < (far ? 0.52 : 0.26) ? 'deep' : 'sea';
}
export function seaGenome(x, z, r = Math.random) {
  return makeGenome(Math.floor(r() * 1e9), Math.floor(r() * 4), seaFamily(x, z, r));
}
// One land beast per island; replaced if it is tamed.
export function ensureLandBeasts(s, r = Math.random) {
  s.wild ??= [];
  const added = [];
  for (const isl of ISLANDS) {
    if (s.wild.some(w => w.island === isl.id)) continue;
    const a = r() * Math.PI * 2,
      d = 0.15 + r() * 0.3,
      x = isl.x + Math.sin(a) * isl.rx * d,
      z = isl.z + Math.cos(a) * isl.rz * d,
      w = {
        id: `land-${isl.id}-${Math.floor(r() * 1e6)}`,
        island: isl.id,
        x,
        z,
        homeX: x,
        homeZ: z,
        heading: r() * 6.28,
        phase: r() * 6,
        genome: makeGenome(Math.floor(r() * 1e9), Math.floor(r() * 4), 'land'),
        trust: 0,
        hostile: false
      };
    s.wild.push(w);
    added.push(w);
  }
  return added;
}
// Old saves: their wild creatures predate lineage, so give each a family from its id (stable across loads);
// owned creatures keep the classic family so the player's beasts stay the species they tamed.
export function normalizeWildlife(s) {
  for (const w of s.wild || [])
    if (w.genome && !Array.isArray(w.genome.lineage)) {
      const r = seeded([...String(w.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
      const fam = seaFamily(w.x, w.z, r);
      w.genome.lineage = [LINEAGE_BASE[fam], LINEAGE_BASE[fam]];
    }
  for (const p of s.tamed || []) normalizeGenome(p.genome);
  for (const e of s.eggs || []) if (e.genome) normalizeGenome(e.genome);
  return s;
}
const insideIsland = (isl, x, z, k = 0.62) => Math.hypot((x - isl.x) / (isl.rx * k), (z - isl.z) / (isl.rz * k)) < 1;
// Land beasts amble around their spot, flee across the island when startled, and never walk into the sea.
export function stepLandBeast(w, dt, elapsed) {
  const isl = ISLANDS.find(i => i.id === w.island);
  if (!isl) return;
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
  if (!insideIsland(isl, w.x, w.z)) {
    w.x = ox;
    w.z = oz;
    w.vx = 0;
    w.vz = 0;
    w.homeX = w.x;
    w.homeZ = w.z;
  }
}
