// Bodies (0.32): everything that moves takes up room. Each frame, after things have moved, overlapping bodies are
// pushed apart — the player, wild creatures and beasts, your fighting partner, the deep watcher, 嘯岳, the warship's
// hull and the parked boat — so nothing walks or swims through anything else. The player, the hull and the boat
// do not get shoved; everything else gives way in proportion to its weight, and only where it is allowed to stand
// (env.canMove: land for land things, water for swimmers, the maze in the cave).
import { phenotype } from './genetics.js?v=0.76.0';

// a rough footprint for a creature or beast at its rendered size
export function bodyRadius(w) {
  const size = w.genome ? phenotype(w.genome).size : 1,
    beast = !!(w.beast || w.formerBeast || (w.kind && w.kind !== 'creature'));
  return size * (beast ? (w.land ? 0.65 : 0.8) : 0.5);
}
const NEAR = 60; // only bodies this close to the player are worth resolving
export function separateBodies(s, env = {}, iterations = 2) {
  if (s.player.mode === 'cabin') return 0;
  const P = s.player,
    bodies = [],
    canMove = env.canMove || (() => true);
  // the player: a person, a boat, or a rider (as wide as the beast under them)
  const pet = (s.tamed || []).find(t => t.id === s.expedition?.activeId),
    pr = s.expedition?.mounted && pet ? bodyRadius(pet) : P.mode === 'boat' ? 1.4 : P.mode === 'foot' ? 0.4 : 0;
  if (pr) bodies.push({ x: P.x, z: P.z, r: pr, fixed: true });
  // the warship's hull, as three circles along its keel; the parked boat
  if (s.ship && !s.inCave) {
    const h = s.ship.heading || 0;
    for (const k of [-8, 0, 8])
      bodies.push({ x: s.ship.x + Math.sin(h) * k, z: s.ship.z + Math.cos(h) * k, r: 3.8, fixed: true });
  }
  if (!s.inCave && s.boat && P.mode !== 'boat' && !(s.ship && !s.skiff))
    bodies.push({ x: s.boat.x, z: s.boat.z, r: 1.4, fixed: true });
  // wild things near you
  for (const w of s.wild || []) {
    if (s.inCave || Math.abs(w.x - P.x) > NEAR || Math.abs(w.z - P.z) > NEAR) continue;
    bodies.push({ ref: w, x: w.x, z: w.z, r: bodyRadius(w), mass: w.beast ? 3 : 1 });
  }
  // the deep watcher pushes, but is not pushed around
  const boss = s.expedition?.boss;
  if (boss && !boss.defeated && !s.inCave && Math.hypot(boss.x - P.x, boss.z - P.z) < NEAR)
    bodies.push({ x: boss.x, z: boss.z, r: 5, fixed: true });
  // 嘯岳, wherever it is in your area
  const xb = s.story?.beast;
  if (xb && !!xb.cave === !!s.inCave && (s.story.stage || 0) < 5 && Math.hypot(xb.x - P.x, xb.z - P.z) < NEAR)
    // (0.35: the body is a big cat at 1.7x — curled up asleep it fills a wide circle)
    bodies.push({
      ref: xb,
      x: xb.x,
      z: xb.z,
      r: s.story.sleeping ? 3.6 : 2.8,
      mass: s.story.sleeping ? Infinity : 6,
      land: true
    });
  // your partner in a fight (combat.js keeps it at combat.ax / az)
  const c = s.combat;
  if (pet && c?.engaged && !s.expedition?.mounted && Number.isFinite(c.ax))
    bodies.push({ ally: c, x: c.ax, z: c.az, r: bodyRadius(pet), mass: 2, land: P.mode === 'foot' });
  let moved = 0;
  for (let it = 0; it < iterations; it++)
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i],
          b = bodies[j];
        if ((a.fixed || a.mass === Infinity) && (b.fixed || b.mass === Infinity)) continue;
        let dx = b.x - a.x,
          dz = b.z - a.z,
          d = Math.hypot(dx, dz);
        const overlap = a.r + b.r - d;
        if (overlap <= 0.001) continue;
        if (d < 1e-4) {
          // exactly on top of each other: part along a fixed direction
          dx = 1;
          dz = 0;
          d = 1;
        }
        const nx = dx / d,
          nz = dz / d,
          wa = a.fixed || a.mass === Infinity ? 0 : 1 / a.mass,
          wb = b.fixed || b.mass === Infinity ? 0 : 1 / b.mass,
          sum = wa + wb;
        if (!sum) continue;
        const pa = (overlap * wa) / sum,
          pb = (overlap * wb) / sum;
        if (pa) moved += shift(a, -nx * pa, -nz * pa, canMove);
        if (pb) moved += shift(b, nx * pb, nz * pb, canMove);
      }
  return moved;
}
function shift(body, dx, dz, canMove) {
  const x = body.x + dx,
    z = body.z + dz;
  const who = body.ref || { land: body.land };
  if (!canMove(who, x, z)) return 0;
  body.x = x;
  body.z = z;
  if (body.ref) {
    body.ref.x = x;
    body.ref.z = z;
  } else if (body.ally) {
    body.ally.ax = x;
    body.ally.az = z;
  }
  return 1;
}
