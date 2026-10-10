// Minimap backdrop: the baked basin drawn once to a canvas (water by depth, land by height).
import { HS, ORIGIN } from './lake.js?v=0.16.0';
import { FINE, Q } from './lake-data.js?v=0.16.0';
let cached;
export function lakeMinimap() {
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return (cached = null);
  const { nx, nz, data } = FINE,
    c = document.createElement('canvas');
  c.width = nx;
  c.height = nz;
  const g = c.getContext('2d'),
    im = g.createImageData(nx, nz);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  for (let i = 0; i < nx * nz; i++) {
    const h = data[i] / Q;
    let col;
    if (h < 0) col = mix([58, 138, 140], [9, 34, 52], -h / 60);
    else if (h < 8) col = mix([205, 190, 146], [120, 150, 92], h / 8);
    else if (h < 120) col = mix([96, 132, 78], [118, 112, 104], (h - 8) / 112);
    else col = mix([118, 112, 104], [230, 234, 236], (h - 120) / 160);
    im.data.set([col[0], col[1], col[2], 255], i * 4);
  }
  g.putImageData(im, 0, 0);
  const cell = FINE.step * HS;
  return (cached = {
    canvas: c,
    x0: (FINE.x0 - ORIGIN.x) * HS - cell / 2,
    z0: (FINE.z0 - ORIGIN.z) * HS - cell / 2,
    w: nx * cell,
    h: nz * cell
  });
}
