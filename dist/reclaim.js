// Island reclamation and land building (0.23). A claimed island has six plots of wild ground. Clearing one
// takes a while — faster with the building skill, and much faster when beasts with the right job (lumber or
// forage) are working — and yields the wood and fibre cut away. On a cleared plot you raise one of seven land
// buildings that change the island: a well, a garden, a shed, a watchtower, a campfire, a stable or a pier.
import { ISLANDS } from './islands.js?v=0.61.3';
import { landNear } from './lake.js?v=0.61.3';
import { spend, give } from './bag.js?v=0.61.3';
import { tally } from './stats.js?v=0.61.3';
import { buildSpeed } from './skills.js?v=0.61.3';
import { gardenBonus } from './weather.js?v=0.61.3';

export const PLOTS_PER_ISLAND = 6;
export const CLEAR_TIME = 30;
export const LAND_BUILDS = {
  well: {
    name: '水井',
    icon: '💧',
    cost: { wood: 6, metal: 4 },
    desc: '每 90 秒產 3 淡水，放在島上的倉棚。',
    every: 90,
    out: { water: 3 }
  },
  garden: {
    name: '田圃',
    icon: '🌾',
    cost: { wood: 4, fiber: 6, spore: 1 },
    desc: '每 120 秒產 3 口糧與 1 果實。',
    every: 120,
    out: { food: 3, fruit: 1 }
  },
  shed: { name: '倉棚', icon: '🏚', cost: { wood: 12, nails: 2 }, desc: '收納島上的產出；島上採集 +1。' },
  tower: { name: '瞭望台', icon: '🗼', cost: { wood: 14, rope: 1 }, desc: '小地圖看得更遠，稀有生物會標記出來。' },
  fire: { name: '篝火', icon: '🔥', cost: { wood: 5, charcoal: 1 }, desc: '靠近時體力恢復更快。' },
  stable: { name: '獸舍', icon: '🏠', cost: { wood: 10, fiber: 6, leather: 1 }, desc: '在這座島休息的御獸恢復更快。' },
  pier: { name: '棧橋', icon: '⚓', cost: { wood: 10, nails: 3 }, desc: '一座可以停小艇的木棧橋；據點評價 +。' }
};
export const BUILD_IDS = Object.keys(LAND_BUILDS);
const fail = error => ({ ok: false, error });
// plot spots: fixed per island, around its anchor
function plotSpots(isl) {
  const out = [];
  for (let i = 0; i < PLOTS_PER_ISLAND; i++) {
    const a = (i / PLOTS_PER_ISLAND) * Math.PI * 2 + 0.4,
      at = landNear(isl.x + Math.sin(a) * isl.rx * 0.55, isl.z + Math.cos(a) * isl.rz * 0.55, {
        min: 1.5,
        max: 40,
        maxSlope: 0.5
      });
    out.push({ i, x: at.x, z: at.z });
  }
  return out;
}
const spotCache = new Map();
export function plotsOf(islandId) {
  if (!spotCache.has(islandId)) spotCache.set(islandId, plotSpots(ISLANDS.find(i => i.id === islandId)));
  return spotCache.get(islandId);
}
export function normalizePlots(s) {
  s.plots ??= {};
  for (const isl of ISLANDS) {
    s.plots[isl.id] ??= [];
    for (let i = 0; i < PLOTS_PER_ISLAND; i++) s.plots[isl.id][i] ??= { state: 'wild' };
  }
  return s;
}
export const plotId = (isl, i) => `plot:${isl}:${i}`;
// Every plot on claimed islands, with world positions, as HUD targets.
export function plotTargets(s) {
  normalizePlots(s);
  const out = [];
  for (const id of s.occupied || [])
    plotsOf(id).forEach((p, i) => {
      const st = s.plots[id][i];
      out.push({
        id: plotId(id, i),
        type: 'plot',
        island: id,
        index: i,
        x: p.x,
        z: p.z,
        state: st.state,
        build: st.build,
        name:
          st.state === 'wild'
            ? '荒地 · 可開墾'
            : st.state === 'clearing'
              ? '開墾中'
              : st.build
                ? LAND_BUILDS[st.build].name
                : '已開墾的空地'
      });
    });
  return out;
}
const helpers = s =>
  (s.tamed || []).filter(p => ['lumber', 'forage'].includes(p.job) && p.id !== s.expedition?.activeId).length;
// How long clearing takes right now: skill and working beasts shorten it.
export function clearDuration(s) {
  return (CLEAR_TIME * buildSpeed(s)) / (1 + Math.min(2, helpers(s)) * 0.5);
}
export function startClearing(s, island, i) {
  normalizePlots(s);
  const st = s.plots[island]?.[i];
  if (!st) return fail('找不到這塊地。');
  if (!(s.occupied || []).includes(island)) return fail('先占領這座島。');
  if (st.state !== 'wild') return fail('這塊地已經開墾過了。');
  const p = plotsOf(island)[i];
  if (s.player.mode !== 'foot' || Math.hypot(s.player.x - p.x, s.player.z - p.z) > 5) return fail('走到荒地旁再開墾。');
  st.state = 'clearing';
  st.doneAt = s.elapsed + clearDuration(s);
  st.startedAt = s.elapsed;
  return { ok: true, message: `開始開墾，約 ${Math.ceil(clearDuration(s))} 秒${helpers(s) ? '（御獸在幫忙）' : ''}。` };
}
// Each frame: finishes clearings and collects what land buildings produce. Returns messages.
export function tickPlots(s) {
  normalizePlots(s);
  const out = [];
  for (const [island, list] of Object.entries(s.plots))
    list.forEach((st, i) => {
      if (st.state === 'clearing' && s.elapsed >= st.doneAt) {
        st.state = 'cleared';
        delete st.doneAt;
        const got = { wood: 4 + Math.floor(Math.random() * 3), fiber: 3 };
        give(s, got);
        tally(s, 'clear');
        out.push({ type: 'cleared', island, i, got });
      }
      if (st.state === 'built' && LAND_BUILDS[st.build]?.every) {
        st.nextAt ??= s.elapsed + LAND_BUILDS[st.build].every;
        if (s.elapsed >= st.nextAt) {
          st.nextAt = s.elapsed + LAND_BUILDS[st.build].every;
          const o = { ...LAND_BUILDS[st.build].out };
          if (st.build === 'garden') o.food += gardenBonus(s); // spring
          s.storage ??= {};
          for (const [k, v] of Object.entries(o)) s.storage[k] = (s.storage[k] || 0) + v;
          out.push({ type: 'produce', island, i, got: o });
        }
      }
    });
  return out;
}
export function buildOnPlot(s, island, i, type) {
  normalizePlots(s);
  const st = s.plots[island]?.[i],
    def = LAND_BUILDS[type];
  if (!st || !def) return fail('沒有這種建築。');
  if (st.state !== 'cleared') return fail('先把這塊地開墾好。');
  const p = plotsOf(island)[i];
  if (s.player.mode !== 'foot' || Math.hypot(s.player.x - p.x, s.player.z - p.z) > 5) return fail('走到空地旁再建造。');
  if (!spend(s, def.cost)) return fail('材料不夠。');
  st.state = 'built';
  st.build = type;
  st.builtAt = s.elapsed;
  if (def.every) st.nextAt = s.elapsed + def.every;
  tally(s, 'landbuild');
  return { ok: true, message: `${def.name}蓋好了。` };
}
export function removeLandBuild(s, island, i) {
  normalizePlots(s);
  const st = s.plots[island]?.[i];
  if (!st || st.state !== 'built') return fail('這裡沒有建築。');
  give(s, LAND_BUILDS[st.build].cost);
  st.state = 'cleared';
  delete st.build;
  delete st.nextAt;
  return { ok: true, message: '拆除了，材料全退。' };
}
export const landBuilt = (s, island, type) =>
  (s.plots?.[island] || []).some(st => st.state === 'built' && st.build === type);
export const countLandBuilds = s =>
  Object.values(s.plots || {})
    .flat()
    .filter(st => st.state === 'built').length;
export const countCleared = s =>
  Object.values(s.plots || {})
    .flat()
    .filter(st => st.state !== 'wild').length;
