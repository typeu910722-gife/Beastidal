// 0.48 穹頂: the New World looks like open country — rolling meadows, woods, a river, far hills, a sky with weather.
// It is a dome: 慈愛組織's laboratory on the continent of 比斯泰德, its sky projected on the inside of the shell.
// This module is the land under it (in metres, local to the town's plaza; +z is south) and the cracks in the
// illusion. town.js puts the town in it; town-models.js draws it. See docs/STORY.md.
import { dayOf, hourOf } from './clock.js?v=0.64.0';
import { domeCracked } from './chapter2.js?v=0.64.0';

export const TOWN = { x: 3000, z: 3000 }; // the plaza's centre, in world coordinates
export const DOME_R = 290; // the shell's radius: an invisible wall where the land seems to go on
// 0.50: outside the shell, once it is torn: the wasteland under the real sky, out to here
export const OUTER_R = 470;
// where 嘯岳 tore the shell, south of the gate
export const TEAR = { half: 6 };
export const inTear = (lx, lz) => lz > 0 && Math.abs(lx) < TEAR.half && Math.abs(Math.hypot(lx, lz) - DOME_R) < 4;
export const outsideDome = (lx, lz) => Math.hypot(lx, lz) > DOME_R;
export const toWorld = p => ({ x: TOWN.x + p.x, z: TOWN.z + p.z });
export const toLocal = (x, z) => ({ x: x - TOWN.x, z: z - TOWN.z });

// The river runs north–south east of the town; a footbridge crosses it.
export const riverX = lz => 122 + 34 * Math.sin(lz * 0.012 + 0.6);
export const RIVER_HALF = 5;
export const BRIDGE = { z: 118, half: 2.2 };
export const onBridge = (lx, lz) => Math.abs(lz - BRIDGE.z) < BRIDGE.half && Math.abs(lx - riverX(lz)) < RIVER_HALF + 3;
export const inRiver = (lx, lz) =>
  Math.abs(lx - riverX(lz)) < RIVER_HALF && !onBridge(lx, lz) && Math.hypot(lx, lz) < DOME_R;

// The town and the road out of its gate lie flat; the country rolls around them and rises towards the shell.
const flatness = (lx, lz) => {
  const dx = Math.max(0, Math.abs(lx) - 52),
    dz = Math.max(0, lz < 0 ? -lz - 52 : lz - 64),
    road = Math.abs(lx) < 12 && lz > 0 && lz < 160 ? 0 : 1;
  return Math.min(1, Math.hypot(dx, dz) / 30) * (road ? 1 : Math.min(1, Math.max(0, (lz - 140) / 20)));
};
export function domeHeight(lx, lz) {
  const hills =
    3.4 * Math.sin(lx * 0.021 + 1.3) * Math.cos(lz * 0.017 - 0.4) +
    1.9 * Math.sin(lx * 0.047 + lz * 0.031) +
    1.1 * Math.sin(lz * 0.081 - lx * 0.023 + 2.1) +
    2.2;
  const d = Math.hypot(lx, lz),
    rim = Math.max(0, Math.min(d, DOME_R) - 190) * 0.06,
    // past the shell the land flattens into the wasteland (0.50)
    edge = 1 - Math.min(1, Math.max(0, (d - DOME_R - 4) / 22));
  let h = (Math.max(0, hills) + rim) * flatness(lx, lz) * edge;
  // the river cuts a channel; the bridge's ends stay level with the banks
  const r = Math.abs(lx - riverX(lz));
  if (r < RIVER_HALF + 6)
    h = h * Math.min(1, Math.max(0, (r - RIVER_HALF) / 6)) - 1.6 * Math.min(1, Math.max(0, (RIVER_HALF + 1 - r) / 2));
  return h;
}
export const domeGround = (x, z) => {
  const p = toLocal(x, z);
  return onBridge(p.x, p.z) ? Math.max(0.6, domeHeight(p.x, p.z)) : Math.max(-1.4, domeHeight(p.x, p.z));
};

// Woods: clusters of trees, laid out once so collisions and models agree.
export const WOODS = [
  { x: -125, z: -70, r: 48, n: 70 },
  { x: -70, z: 150, r: 42, n: 55 },
  { x: 175, z: -120, r: 50, n: 70 },
  { x: -185, z: 115, r: 40, n: 45 },
  { x: 35, z: -175, r: 46, n: 60 },
  { x: 200, z: 140, r: 36, n: 40 }
];
export const TREES = (() => {
  let seed = 4120;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const out = [];
  for (const w of WOODS)
    for (let i = 0; i < w.n; i++) {
      const a = rnd() * Math.PI * 2,
        r = Math.sqrt(rnd()) * w.r,
        x = w.x + Math.cos(a) * r,
        z = w.z + Math.sin(a) * r;
      if (Math.abs(x - riverX(z)) < RIVER_HALF + 4 || Math.hypot(x, z) > DOME_R - 12) continue;
      out.push({ x, z, s: 0.75 + rnd() * 0.6, kind: rnd() < 0.6 ? 'pine' : 'broad' });
    }
  return out;
})();
export const TRUNK_R = 0.45;
export function treeAt(lx, lz, pad = 0) {
  for (const t of TREES)
    if (Math.abs(t.x - lx) < 2 && Math.abs(t.z - lz) < 2 && Math.hypot(t.x - lx, t.z - lz) < TRUNK_R * t.s + pad)
      return t;
  return null;
}

// Out in the open country, under the shell (the walls and buildings are town.js's).
// `open`: the shell has been torn, and its tear lets you out into the wasteland (0.50)
export function countryWalkable(lx, lz, pad = 0.35, open = false) {
  const d = Math.hypot(lx, lz);
  if (d > (open ? OUTER_R : DOME_R) - pad) return false;
  if (open && Math.abs(d - DOME_R) < 0.6 + pad && !inTear(lx, lz)) return false;
  if (inRiver(lx, lz)) return false;
  return d > DOME_R || !treeAt(lx, lz, pad);
}
export const nearShell = (lx, lz, by = 3.5, open = false) =>
  Math.abs(Math.hypot(lx, lz) - DOME_R) < by && !(open && inTear(lx, lz));

// The flock: nine birds that fly the very same figure of eight every forty seconds.
export const BIRD_PERIOD = 40;
export function birdAt(t, i) {
  const k = ((t / BIRD_PERIOD + i * 0.012) % 1) * Math.PI * 2,
    s = Math.sin(k),
    c = Math.cos(k),
    d = 1 + s * s;
  return {
    x: -30 + (95 * c) / d + Math.sin(i * 2.3) * 3,
    y: 38 + Math.sin(k * 2) * 4 + Math.cos(i * 1.7) * 1.5,
    z: -40 + (95 * s * c) / d + Math.cos(i * 2.9) * 3
  };
}
// Deer that graze along the edges of the woods, each walking its own circle forever.
export const DEER = [
  { x: -125, z: -70, r: 58, period: 160 },
  { x: 175, z: -120, r: 60, period: 190 },
  { x: -70, z: 150, r: 52, period: 140 },
  { x: 35, z: -175, r: 55, period: 175 }
];
export function deerAt(t, i) {
  const d = DEER[i],
    k = (t / d.period) * Math.PI * 2 + i;
  return { x: d.x + Math.cos(k) * d.r, z: d.z + Math.sin(k) * d.r, heading: Math.atan2(-Math.sin(k), Math.cos(k)) };
}

// At sunset, for a few minutes, the shell's seams show faintly in the sky: 0..1.
export function duskSeams(s) {
  const h = hourOf(s);
  const up = Math.min(1, Math.max(0, (h - 17.5) / 0.5)),
    down = Math.min(1, Math.max(0, (19.2 - h) / 0.6));
  return Math.min(up, down);
}

// ---------- the cracks in the illusion, noted once each ----------
export const CLUES = {
  norift: ['天空', '天上的紫色裂縫……不見了。在湖上，它一直都在那裡。'],
  hills: ['遠山', '那排山……我走了這麼久，它們一點也沒有變近。'],
  wall: ['看不見的牆', '前面明明還有路……可是我走不過去。空氣裡閃過一圈六角形的光。'],
  birds: ['鳥群', '那群鳥又飛過去了。同一個方向，同一個高度……跟剛才一模一樣。'],
  seams: ['夕陽', '夕陽下，天空好像有一格一格的線。眨一下眼，又不見了。'],
  deer: ['鹿', '那頭鹿又從同一棵樹旁邊走過去了。牠每天走的，都是同一條路嗎？']
};
export function normalizeDome(s) {
  s.dome ??= {};
  s.dome.clues ??= [];
  s.dome.out ??= 0; // seconds spent out in the open country
  s.dome.far ??= 0; // the farthest you have walked from the plaza
  return s.dome;
}
export function noteClue(s, id) {
  const d = normalizeDome(s);
  if (!CLUES[id] || d.clues.includes(id)) return null;
  d.clues.push(id);
  const [title, text] = CLUES[id];
  s.log.unshift({ day: dayOf(s), title: '新生之界 · ' + title, text });
  s.log = s.log.slice(0, 70);
  return text;
}
// Called every frame in the New World: the clues that come from simply being here. Returns texts newly noted.
export function tickDome(s, dt) {
  const d = normalizeDome(s),
    p = toLocal(s.player.x, s.player.z),
    out = [];
  const add = id => {
    const t = noteClue(s, id);
    if (t) out.push({ id, text: t });
  };
  add('norift');
  const outside = Math.abs(p.x) > 48 || Math.abs(p.z) > 48;
  if (outside) d.out += dt;
  const r = Math.hypot(p.x, p.z);
  d.far = Math.max(d.far, r);
  if (d.far > 170) add('hills');
  if (d.out > 150 && hourOf(s) > 7 && hourOf(s) < 17.5) add('birds');
  if (d.out > 300) add('deer');
  if (duskSeams(s) > 0.6) add('seams');
  if (nearShell(p.x, p.z, 3.5, domeCracked(s))) add('wall');
  return out;
}
