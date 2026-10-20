// 0.70: the chart of the New World for the minimap and the big map — the country under the dome drawn once onto a
// canvas (ground by height, the river, the woods, the trail from the pass, the road, the town's walls and buildings,
// the shell), and past the shell the wasteland once it has been torn open. Same shape as lake-map.js's chart:
// { canvas, x0, z0, w, h } in world metres.
import {
  TOWN,
  DOME_R,
  OUTER_R,
  TEAR,
  domeHeight,
  riverX,
  RIVER_HALF,
  BRIDGE,
  TREES,
  TRAIL,
  OBSTACLES
} from './dome.js?v=0.76.0';
import { BUILDINGS, WALL, GATE_HALF } from './town.js?v=0.76.0';

const cache = {};
export function domeChart(torn = false) {
  if (typeof document === 'undefined') return null;
  const key = torn ? 'torn' : 'shut';
  if (cache[key]) return cache[key];
  const R = torn ? OUTER_R + 20 : DOME_R + 16,
    S = 1, // pixels per metre (the minimap shows about half a pixel per metre, the big map a little more)
    n = Math.round(R * 2 * S),
    c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d'),
    im = g.createImageData(n, n),
    mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  for (let py = 0; py < n; py++)
    for (let px = 0; px < n; px++) {
      const x = px / S - R,
        z = py / S - R,
        d = Math.hypot(x, z);
      let col;
      if (d > DOME_R) col = torn ? mix([74, 69, 80], [52, 46, 60], (d - DOME_R) / 160) : [10, 32, 40];
      else if (Math.abs(x - riverX(z)) < RIVER_HALF) col = [70, 128, 140];
      else {
        const h = domeHeight(x, z);
        col = mix([108, 138, 84], [150, 148, 102], (h - 2) / 10);
        if (Math.abs(x - riverX(z)) < RIVER_HALF + 3) col = mix(col, [150, 136, 104], 0.5);
      }
      im.data.set([col[0], col[1], col[2], 255], (py * n + px) * 4);
    }
  g.putImageData(im, 0, 0);
  const P = (x, z) => [(x + R) * S, (z + R) * S];
  // woods
  g.fillStyle = '#2f4f30';
  for (const t of TREES) {
    const [px, py] = P(t.x, t.z);
    g.beginPath();
    g.arc(px, py, (t.kind === 'fruit' ? 2.2 : t.kind === 'old' ? 5 : 3) * S * t.s, 0, Math.PI * 2);
    g.fill();
  }
  // the trail and the road
  g.strokeStyle = '#a58c66';
  g.lineWidth = 2.4 * S;
  g.lineJoin = g.lineCap = 'round';
  g.beginPath();
  TRAIL.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...P(p.x, p.z)));
  g.stroke();
  g.fillStyle = '#b3a17f';
  g.fillRect(...P(-7, WALL), 14 * S, 89 * S);
  // the bridge
  {
    const x = riverX(BRIDGE.z),
      len = RIVER_HALF * 2 + 6;
    g.fillStyle = '#7a5a3c';
    g.fillRect(...P(x - len / 2, BRIDGE.z - BRIDGE.half), len * S, BRIDGE.half * 2 * S);
  }
  // the shed and the stone
  g.fillStyle = '#8d6a47';
  for (const o of OBSTACLES)
    if (o.r) {
      g.beginPath();
      g.arc(...P(o.x, o.z), o.r * S, 0, Math.PI * 2);
      g.fill();
    } else g.fillRect(...P(o.x - o.hx, o.z - o.hz), o.hx * 2 * S, o.hz * 2 * S);
  // the town: paving, walls with the gate, buildings
  g.fillStyle = '#c4bdae';
  g.fillRect(...P(-WALL, -WALL), WALL * 2 * S, WALL * 2 * S);
  g.strokeStyle = '#6f6a60';
  g.lineWidth = 1.6 * S;
  g.beginPath();
  g.moveTo(...P(-GATE_HALF, WALL));
  g.lineTo(...P(-WALL, WALL));
  g.lineTo(...P(-WALL, -WALL));
  g.lineTo(...P(WALL, -WALL));
  g.lineTo(...P(WALL, WALL));
  g.lineTo(...P(GATE_HALF, WALL));
  g.stroke();
  for (const b of BUILDINGS) {
    g.fillStyle = b.id === 'admin' ? '#7d8a96' : b.name ? '#a3765a' : '#8f7a68';
    g.fillRect(...P(b.x - b.w / 2, b.z - b.d / 2), b.w * S, b.d * S);
  }
  g.fillStyle = '#e8dfc8';
  g.beginPath();
  g.arc(...P(0, 0), 3 * S, 0, Math.PI * 2);
  g.fill();
  // the shell, and its tear
  g.strokeStyle = '#9ce8d1aa';
  g.lineWidth = 1.5 * S;
  g.beginPath();
  if (torn) {
    const a = Math.asin(TEAR.half / DOME_R);
    g.arc(...P(0, 0), DOME_R * S, Math.PI / 2 + a, Math.PI / 2 - a + Math.PI * 2);
  } else g.arc(...P(0, 0), DOME_R * S, 0, Math.PI * 2);
  g.stroke();
  return (cache[key] = { canvas: c, x0: TOWN.x - R, z0: TOWN.z - R, w: R * 2, h: R * 2 });
}
