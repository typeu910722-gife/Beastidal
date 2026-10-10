// Route guidance (0.19): a water route from here to a map marker that steers round islands and shallows.
// A* over a 5 m grid of the basin (navigable = deep enough for the vessel), then pulled straight wherever the
// line of sight stays on water. Pure functions over lake.js, so the map UI and tests share them.
import { groundAt, HS, ORIGIN } from './lake.js?v=0.19.0';
import { FINE } from './lake-data.js?v=0.19.0';

export const CELL = 5;
// the baked basin in game metres
export const BOUNDS = {
  x0: (FINE.x0 - ORIGIN.x) * HS,
  z0: (FINE.z0 - ORIGIN.z) * HS,
  w: (FINE.nx - 1) * FINE.step * HS,
  h: (FINE.nz - 1) * FINE.step * HS
};
const NX = Math.floor(BOUNDS.w / CELL) + 1,
  NZ = Math.floor(BOUNDS.h / CELL) + 1;
// how much water a hull needs under it
export const DRAFT = { boat: 1.2, ship: 3.5, mount: 0.8, foot: 0 };
const grids = new Map();
function grid(draft) {
  if (grids.has(draft)) return grids.get(draft);
  const g = new Uint8Array(NX * NZ);
  for (let iz = 0; iz < NZ; iz++)
    for (let ix = 0; ix < NX; ix++)
      g[iz * NX + ix] = groundAt(BOUNDS.x0 + ix * CELL, BOUNDS.z0 + iz * CELL) < -draft ? 1 : 0;
  grids.set(draft, g);
  return g;
}
const cellOf = (x, z) => ({
  ix: Math.round((x - BOUNDS.x0) / CELL),
  iz: Math.round((z - BOUNDS.z0) / CELL)
});
const inside = (ix, iz) => ix >= 0 && iz >= 0 && ix < NX && iz < NZ;
// nearest navigable cell within r cells (rings outward)
function snap(g, ix, iz, r = 12) {
  for (let d = 0; d <= r; d++)
    for (let dz = -d; dz <= d; dz++)
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue;
        const x = ix + dx,
          z = iz + dz;
        if (inside(x, z) && g[z * NX + x]) return { ix: x, iz: z };
      }
  return null;
}
// is the straight segment all water (with a little margin so the hull does not scrape the shore)?
export function clearLine(ax, az, bx, bz, draft = DRAFT.boat) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (groundAt(ax + (bx - ax) * t, az + (bz - az) * t) >= -(draft + 0.4)) return false;
  }
  return true;
}
// Returns waypoints [{x,z}, …] from (ax,az) to (bx,bz), or null when no water route exists.
export function findRoute(ax, az, bx, bz, draft = DRAFT.boat) {
  const g = grid(draft),
    s0 = cellOf(ax, az),
    g0 = cellOf(bx, bz);
  if (!inside(s0.ix, s0.iz) || !inside(g0.ix, g0.iz)) return null;
  const start = snap(g, s0.ix, s0.iz),
    goal = snap(g, g0.ix, g0.iz);
  if (!start || !goal) return null;
  const si = start.iz * NX + start.ix,
    gi = goal.iz * NX + goal.ix;
  if (si === gi)
    return [
      { x: ax, z: az },
      { x: bx, z: bz }
    ];
  const dist = new Float32Array(NX * NZ).fill(Infinity),
    from = new Int32Array(NX * NZ).fill(-1),
    closed = new Uint8Array(NX * NZ),
    h = i => {
      const dx = Math.abs((i % NX) - goal.ix),
        dz = Math.abs(Math.floor(i / NX) - goal.iz);
      return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
    };
  // binary heap keyed by f
  const heap = [],
    key = [];
  const push = (i, f) => {
    heap.push(i);
    key.push(f);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (key[p] <= key[k]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      [key[p], key[k]] = [key[k], key[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop(),
      lk = key.pop();
    if (heap.length) {
      heap[0] = last;
      key[0] = lk;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1,
          r = l + 1;
        let m = k;
        if (l < heap.length && key[l] < key[m]) m = l;
        if (r < heap.length && key[r] < key[m]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        [key[m], key[k]] = [key[k], key[m]];
        k = m;
      }
    }
    return top;
  };
  dist[si] = 0;
  push(si, h(si));
  let found = false,
    expanded = 0;
  while (heap.length) {
    const i = pop();
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === gi) {
      found = true;
      break;
    }
    if (++expanded > 60000) break;
    const ix = i % NX,
      iz = Math.floor(i / NX);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = ix + dx,
          nz = iz + dz;
        if (!inside(nx, nz)) continue;
        const j = nz * NX + nx;
        if (!g[j] || closed[j]) continue;
        // no cutting corners between two blocked orthogonal cells
        if (dx && dz && (!g[iz * NX + nx] || !g[nz * NX + ix])) continue;
        const nd = dist[i] + (dx && dz ? 1.4142 : 1);
        if (nd < dist[j]) {
          dist[j] = nd;
          from[j] = i;
          push(j, nd + h(j));
        }
      }
  }
  if (!found) return null;
  const cells = [];
  for (let i = gi; i !== -1; i = from[i])
    cells.push({ x: BOUNDS.x0 + (i % NX) * CELL, z: BOUNDS.z0 + Math.floor(i / NX) * CELL });
  cells.reverse();
  // a marker on land or in the shallows ends the route at the last navigable cell beside it
  const raw = [{ x: ax, z: az }, ...cells];
  if (groundAt(bx, bz) < -(draft + 0.4)) raw.push({ x: bx, z: bz });
  // string pulling: keep only the corners that a straight run cannot skip
  const out = [raw[0]];
  let k = 0;
  while (k < raw.length - 1) {
    let j = raw.length - 1;
    while (j > k + 1 && !clearLine(raw[k].x, raw[k].z, raw[j].x, raw[j].z, draft)) j--;
    out.push(raw[j]);
    k = j;
  }
  return out;
}
export const routeLength = pts => {
  let d = 0;
  for (let i = 1; i < (pts?.length || 0); i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return d;
};
