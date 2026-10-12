// The corrupted garden (0.31): the crystal cave grown into a maze of thorn hedges, rotten blooms and sick crystal.
// A 19 × 19 grid of 8 m cells (152 m across, centred on CAVE); the middle 7 × 7 (56 m) is one open hall where 嘯岳
// sleeps, with stone pillars and fallen walls to hide behind from its blows (0.36 / 0.36.3: grown twice).
// The entrance is on the south side (+z). The maze is fixed (seeded), carved with a backtracker and then given a
// few extra openings so it loops instead of punishing every wrong turn.
// Coordinates here are local to the cave's centre; add CAVE.x / CAVE.z for the world.
// the cave is its own pocket of the world, far outside the basin
export const CAVE = { x: 2600, z: -2600, r: 76 };
export const MAZE_N = 19;
export const MAZE_CELL = 8;
export const MAZE_HALF = (MAZE_N * MAZE_CELL) / 2; // 76
const MID = (MAZE_N - 1) / 2; // 9: the middle column (the entrance) and row
export const HALL = { i0: 6, i1: 12, j0: 6, j1: 12, r: 27 }; // the sleeping hall (cells), and its open radius
// cover in the hall: stone pillars and toppled wall pieces (local x, z, radius). Claws and pounces do not pass
// through them; the thorns that rise from the ground do.
export const HALL_COVER = [
  ...[0, 1, 2, 3, 4, 5].map(k => {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    return { x: Math.sin(a) * 12.5, z: Math.cos(a) * 12.5, r: 1.4, kind: 'pillar' };
  }),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    return { x: Math.sin(a) * 21, z: Math.cos(a) * 21, r: 2, kind: 'wall', a };
  })
];
// does a straight line from a to b (local) pass behind cover?
export function coverBetween(ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az,
    l2 = dx * dx + dz * dz || 1;
  return HALL_COVER.some(c => {
    const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2));
    return Math.hypot(ax + dx * t - c.x, az + dz * t - c.z) < c.r * 0.9;
  });
}
const PAD = 0.75; // half a hedge plus a body's width
let seed = 0x5eed;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// h[j][i]: the wall on the north edge of cell (i, j), j = 0..N · v[j][i]: the wall on the west edge, i = 0..N
const h = Array.from({ length: MAZE_N + 1 }, () => Array(MAZE_N).fill(true)),
  v = Array.from({ length: MAZE_N }, () => Array(MAZE_N + 1).fill(true));
const inHall = (i, j) => i >= HALL.i0 && i <= HALL.i1 && j >= HALL.j0 && j <= HALL.j1;
function open(i, j, di, dj) {
  if (di === 1) v[j][i + 1] = false;
  else if (di === -1) v[j][i] = false;
  else if (dj === 1) h[j + 1][i] = false;
  else h[j][i] = false;
}
{
  const seen = Array.from({ length: MAZE_N }, () => Array(MAZE_N).fill(false)),
    stack = [[MID, MAZE_N - 1]];
  seen[MAZE_N - 1][MID] = true;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1],
      next = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].filter(([di, dj]) => {
        const a = i + di,
          b = j + dj;
        return a >= 0 && b >= 0 && a < MAZE_N && b < MAZE_N && !seen[b][a];
      });
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [di, dj] = next[Math.floor(rnd() * next.length)];
    open(i, j, di, dj);
    seen[j + dj][i + di] = true;
    stack.push([i + di, j + dj]);
  }
  // the hall is one room
  for (let j = HALL.j0; j <= HALL.j1; j++)
    for (let i = HALL.i0; i <= HALL.i1; i++) {
      if (i < HALL.i1) v[j][i + 1] = false;
      if (j < HALL.j1) h[j + 1][i] = false;
    }
  // a few loops
  for (let k = 0; k < 30; k++) {
    const i = 1 + Math.floor(rnd() * (MAZE_N - 2)),
      j = 1 + Math.floor(rnd() * (MAZE_N - 2));
    if (inHall(i, j)) continue;
    if (rnd() < 0.5) v[j][i] = false;
    else h[j][i] = false;
  }
  h[MAZE_N][MID] = false; // the entrance
}
export const MAZE_WALLS = { h, v };
const cellOf = (x, z) => [Math.floor((x + MAZE_HALF) / MAZE_CELL), Math.floor((z + MAZE_HALF) / MAZE_CELL)];
const nodeWall = (ni, nj) =>
  (nj > 0 && v[nj - 1]?.[ni]) ||
  (nj < MAZE_N && v[nj]?.[ni]) ||
  (ni > 0 && h[nj]?.[ni - 1]) ||
  (ni < MAZE_N && h[nj]?.[ni]);
// the antechamber outside the entrance, where you come in and leave
export const ENTRANCE = { x: 0, z: MAZE_HALF + 2.4 };
export function mazeWalkable(x, z, pad = PAD) {
  // the entrance passage, from the middle of the south row out to the antechamber
  if (Math.abs(x) < MAZE_CELL / 2 - pad && z > MAZE_HALF - 1.6 && z < MAZE_HALF + 4.2) return true;
  if (Math.abs(x) > MAZE_HALF - pad || Math.abs(z) > MAZE_HALF - pad) return false;
  const [i, j] = cellOf(x, z),
    fx = x + MAZE_HALF - i * MAZE_CELL,
    fz = z + MAZE_HALF - j * MAZE_CELL;
  if (fx < pad && v[j][i]) return false;
  if (fx > MAZE_CELL - pad && v[j][i + 1]) return false;
  if (fz < pad && h[j][i]) return false;
  if (fz > MAZE_CELL - pad && h[j + 1][i]) return false;
  // the posts where hedges meet
  const ni = fx < pad ? i : fx > MAZE_CELL - pad ? i + 1 : -1,
    nj = fz < pad ? j : fz > MAZE_CELL - pad ? j + 1 : -1;
  if (ni >= 0 && nj >= 0 && nodeWall(ni, nj)) return false;
  // the sleeper's dais, and the cover in the hall, are solid
  if (Math.hypot(x, z) < 2.4) return false;
  for (const c of HALL_COVER) if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
  return true;
}
export const cellCentre = (i, j) => ({ x: -MAZE_HALF + (i + 0.5) * MAZE_CELL, z: -MAZE_HALF + (j + 0.5) * MAZE_CELL });
// the farthest dead ends from the entrance (for the stone-key wall and the sealed chest)
export const DEAD_ENDS = (() => {
  const dist = Array.from({ length: MAZE_N }, () => Array(MAZE_N).fill(-1)),
    q = [[MID, MAZE_N - 1]];
  dist[MAZE_N - 1][MID] = 0;
  while (q.length) {
    const [i, j] = q.shift();
    for (const [di, dj, wall] of [
      [1, 0, () => v[j][i + 1]],
      [-1, 0, () => v[j][i]],
      [0, 1, () => h[j + 1][i]],
      [0, -1, () => h[j][i]]
    ]) {
      const a = i + di,
        b = j + dj;
      if (a < 0 || b < 0 || a >= MAZE_N || b >= MAZE_N || wall() || dist[b][a] >= 0) continue;
      dist[b][a] = dist[j][i] + 1;
      q.push([a, b]);
    }
  }
  const ends = [];
  for (let j = 0; j < MAZE_N; j++)
    for (let i = 0; i < MAZE_N; i++) {
      if (inHall(i, j)) continue;
      const walls = [h[j][i], h[j + 1][i], v[j][i], v[j][i + 1]].filter(Boolean).length;
      if (walls === 3) ends.push({ i, j, d: dist[j][i], ...cellCentre(i, j) });
    }
  return ends.sort((a, b) => b.d - a.d);
})();
