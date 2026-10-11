// Sculpted skins (0.30). A standing 御獸's body is not a pile of spheres and tubes any more: its parts — pelvis,
// torso, muscles, neck, head, limbs, tail — are signed-distance primitives melted together with a smooth union, and
// the surface is pulled out of that field with naive surface nets into one continuous, seamless mesh. Normals come
// from the field's gradient (so the skin is smooth), each vertex is weighted to the bones of the parts nearest it
// (so it bends like a skinned model), and a cylindrical UV lets the hide's texture and scale map wrap it.
//
// prims: [{ a:[x,y,z], b?:[x,y,z], ra, rb?, bone, squash?:[sx,sy,sz] }] in body space; a sphere when b is absent,
// a tapered capsule otherwise; squash stretches a primitive around a (an ellipsoid / a flattened limb).
import * as T from './vendor/three.module.min.js';

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
function primDist(q, x, y, z) {
  let px = x - q.a[0],
    py = y - q.a[1],
    pz = z - q.a[2],
    m = 1;
  if (q.squash) {
    px /= q.squash[0];
    py /= q.squash[1];
    pz /= q.squash[2];
    m = q.smin;
  }
  if (!q.b) return (Math.sqrt(px * px + py * py + pz * pz) - q.ra) * m;
  const bx = q.ba[0],
    by = q.ba[1],
    bz = q.ba[2],
    h = clamp01((px * bx + py * by + pz * bz) * q.inv),
    dx = px - bx * h,
    dy = py - by * h,
    dz = pz - bz * h;
  return (Math.sqrt(dx * dx + dy * dy + dz * dz) - (q.ra + (q.rb - q.ra) * h)) * m;
}
function prepare(prims) {
  return prims.map(p => {
    const q = { ...p, rb: p.rb ?? p.ra };
    if (q.squash) q.smin = Math.min(...q.squash);
    if (q.b) {
      let ba = [p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]];
      if (q.squash) ba = [ba[0] / q.squash[0], ba[1] / q.squash[1], ba[2] / q.squash[2]];
      q.ba = ba;
      q.inv = 1 / Math.max(1e-6, ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]);
    }
    const r = Math.max(q.ra, q.rb) * (q.squash ? Math.max(...q.squash) : 1) + 0.12,
      xs = [p.a[0], (p.b || p.a)[0]],
      ys = [p.a[1], (p.b || p.a)[1]],
      zs = [p.a[2], (p.b || p.a)[2]];
    q.box = [
      Math.min(...xs) - r,
      Math.min(...ys) - r,
      Math.min(...zs) - r,
      Math.max(...xs) + r,
      Math.max(...ys) + r,
      Math.max(...zs) + r
    ];
    return q;
  });
}
// polynomial smooth minimum: melts two surfaces together over a band of width k
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
function field(qs, k) {
  return (x, y, z) => {
    let d = 1e9;
    for (const q of qs) {
      const b = q.box;
      if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) continue;
      d = smin(d, primDist(q, x, y, z), q.k ?? k);
    }
    return d;
  };
}

// Naive surface nets over a grid of the field, sampled coarse-to-fine so only cells near the surface are refined.
export function sculpt(prims, { cell = 0.03, blend = 0.07, boneCount = 1 } = {}) {
  const qs = prepare(prims),
    f = field(qs, blend);
  let x0 = 1e9,
    y0 = 1e9,
    z0 = 1e9,
    x1 = -1e9,
    y1 = -1e9,
    z1 = -1e9;
  for (const q of qs) {
    x0 = Math.min(x0, q.box[0]);
    y0 = Math.min(y0, q.box[1]);
    z0 = Math.min(z0, q.box[2]);
    x1 = Math.max(x1, q.box[3]);
    y1 = Math.max(y1, q.box[4]);
    z1 = Math.max(z1, q.box[5]);
  }
  const nx = Math.ceil((x1 - x0) / cell) + 2,
    ny = Math.ceil((y1 - y0) / cell) + 2,
    nz = Math.ceil((z1 - z0) / cell) + 2,
    at = (i, j, k) => (k * ny + j) * nx + i,
    vals = new Float32Array(nx * ny * nz).fill(1),
    B = 4; // coarse block size
  for (let k = 0; k < nz; k += B)
    for (let j = 0; j < ny; j += B)
      for (let i = 0; i < nx; i += B) {
        const cx = x0 + (i + B / 2) * cell,
          cy = y0 + (j + B / 2) * cell,
          cz = z0 + (k + B / 2) * cell;
        if (Math.abs(f(cx, cy, cz)) > cell * B * 1.2) {
          // far from the surface: the whole block takes the centre's sign
          const v = Math.sign(f(cx, cy, cz)) || 1;
          for (let kk = k; kk < Math.min(nz, k + B + 1); kk++)
            for (let jj = j; jj < Math.min(ny, j + B + 1); jj++)
              for (let ii = i; ii < Math.min(nx, i + B + 1); ii++)
                if (vals[at(ii, jj, kk)] === 1) vals[at(ii, jj, kk)] = v * cell * 2;
          continue;
        }
        for (let kk = k; kk < Math.min(nz, k + B + 1); kk++)
          for (let jj = j; jj < Math.min(ny, j + B + 1); jj++)
            for (let ii = i; ii < Math.min(nx, i + B + 1); ii++)
              vals[at(ii, jj, kk)] = f(x0 + ii * cell, y0 + jj * cell, z0 + kk * cell);
      }
  // one vertex per cube that the surface crosses, at the mean of its edge crossings
  const vIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1),
    cubeAt = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i,
    pos = [],
    E = [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
      [0, 2],
      [1, 3],
      [4, 6],
      [5, 7],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7]
    ],
    C = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1]
    ],
    cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          cv[c] = vals[at(i + C[c][0], j + C[c][1], k + C[c][2])];
          if (cv[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0,
          sy = 0,
          sz = 0,
          n = 0;
        for (const [a, b] of E) {
          if (cv[a] < 0 === cv[b] < 0) continue;
          const t = cv[a] / (cv[a] - cv[b]);
          sx += C[a][0] + (C[b][0] - C[a][0]) * t;
          sy += C[a][1] + (C[b][1] - C[a][1]) * t;
          sz += C[a][2] + (C[b][2] - C[a][2]) * t;
          n++;
        }
        vIndex[cubeAt(i, j, k)] = pos.length / 3;
        pos.push(x0 + (i + sx / n) * cell, y0 + (j + sy / n) * cell, z0 + (k + sz / n) * cell);
      }
  // a quad across every grid edge where the sign changes, joining the four cubes around it
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, d, c, a, c, b);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const inside = vals[at(i, j, k)] < 0;
        if (inside !== vals[at(i + 1, j, k)] < 0)
          quad(
            vIndex[cubeAt(i, j - 1, k - 1)],
            vIndex[cubeAt(i, j, k - 1)],
            vIndex[cubeAt(i, j, k)],
            vIndex[cubeAt(i, j - 1, k)],
            !inside
          );
        if (inside !== vals[at(i, j + 1, k)] < 0)
          quad(
            vIndex[cubeAt(i - 1, j, k - 1)],
            vIndex[cubeAt(i - 1, j, k)],
            vIndex[cubeAt(i, j, k)],
            vIndex[cubeAt(i, j, k - 1)],
            !inside
          );
        if (inside !== vals[at(i, j, k + 1)] < 0)
          quad(
            vIndex[cubeAt(i - 1, j - 1, k)],
            vIndex[cubeAt(i, j - 1, k)],
            vIndex[cubeAt(i, j, k)],
            vIndex[cubeAt(i - 1, j, k)],
            !inside
          );
      }
  // smooth normals from the field, a wrapped UV, and bone weights from the nearest parts
  const N = pos.length / 3,
    nor = new Float32Array(N * 3),
    uv = new Float32Array(N * 2),
    si = new Uint16Array(N * 4),
    sw = new Float32Array(N * 4),
    e = cell * 0.5;
  for (let v = 0; v < N; v++) {
    const x = pos[v * 3],
      y = pos[v * 3 + 1],
      z = pos[v * 3 + 2];
    let gx = f(x + e, y, z) - f(x - e, y, z),
      gy = f(x, y + e, z) - f(x, y - e, z),
      gz = f(x, y, z + e) - f(x, y, z - e);
    const L = Math.hypot(gx, gy, gz) || 1;
    nor[v * 3] = gx / L;
    nor[v * 3 + 1] = gy / L;
    nor[v * 3 + 2] = gz / L;
    uv[v * 2] = Math.atan2(x, z) / (Math.PI * 2) + 0.5;
    uv[v * 2 + 1] = y / 2.4;
    const w = new Float32Array(boneCount);
    let dmin = 1e9;
    const ds = qs.map(q => {
      const d = primDist(q, x, y, z);
      if (d < dmin) dmin = d;
      return d;
    });
    qs.forEach((q, i) => {
      if (ds[i] < dmin + 0.18) w[q.bone || 0] += Math.exp(-(ds[i] - dmin) / 0.035);
    });
    const order = [...w.keys()].sort((a, b) => w[b] - w[a]).slice(0, 4);
    const tot = order.reduce((t, b) => t + w[b], 0) || 1;
    order.forEach((b, s) => {
      si[v * 4 + s] = b;
      sw[v * 4 + s] = w[b] / tot;
    });
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new T.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
