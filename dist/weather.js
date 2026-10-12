// Weather and seasons (0.24). Four seasons of four days each turn over the year; within them the weather changes
// every few minutes — clear, overcast, rain, fog, thunderstorms, and snow in winter — drawn from a schedule
// fixed by the save's seed, so a reload never changes the sky. Thunderstorms are the storms the lake has always
// had: dangerous at sea, with a warning before they break. Seasons and weather tint the world and lean on
// fishing, spawns, harvests, gardens and dives.
import { dayOf, DAY } from './clock.js?v=0.34.0';
import { seeded } from './genetics.js?v=0.34.0';

export const SEASON_DAYS = 4;
export const SEASONS = {
  spring: { name: '春', icon: '🌱', tint: 0x9fd49a, note: '生物繁盛：植生突變更常見，田圃多產，配種更容易突變。' },
  summer: { name: '夏', icon: '☀', tint: 0xffe9b0, note: '雷雨季：魚咬得快，雷暴也多。' },
  autumn: { name: '秋', icon: '🍂', tint: 0xe8a860, note: '豐收：採集多 1，稀有生物更常出現，多霧。' },
  winter: {
    name: '冬',
    icon: '❄',
    tint: 0xcfe3f5,
    note: '湖面結霜：淺海種少、深淵種多，潛水氧氣 -10 秒，魚咬得慢但大魚多。'
  }
};
export const SEASON_IDS = Object.keys(SEASONS);
export const WEATHER = {
  clear: { name: '晴朗', icon: '☀', storm: 0, fog: 0.0013 },
  cloudy: { name: '多雲', icon: '☁', storm: 0.15, fog: 0.0018 },
  rain: { name: '小雨', icon: '🌧', storm: 0.38, fog: 0.0028, drops: true },
  fog: { name: '濃霧', icon: '🌫', storm: 0.1, fog: 0.014 },
  thunder: { name: '雷暴', icon: '⛈', storm: 0.78, fog: 0.006, drops: true },
  snow: { name: '下雪', icon: '🌨', storm: 0.25, fog: 0.004, drops: true, snow: true }
};
// how likely each kind is, per season
const WEIGHTS = {
  spring: { clear: 5, cloudy: 3, rain: 3, fog: 2, thunder: 1 },
  summer: { clear: 5, cloudy: 2, rain: 2, fog: 0.5, thunder: 3 },
  autumn: { clear: 4, cloudy: 3, rain: 2, fog: 3, thunder: 2 },
  winter: { clear: 3, cloudy: 3, rain: 1, fog: 1, thunder: 1, snow: 3 }
};
export const SLOT = 240; // seconds of one spell of weather
export const STORM_WARN = 30;
export const seasonIndex = s => Math.floor((dayOf(s) - 1) / SEASON_DAYS) % SEASON_IDS.length;
export const seasonOf = s => SEASON_IDS[seasonIndex(s)];
export const season = s => SEASONS[seasonOf(s)];
export const seasonDay = s => ((dayOf(s) - 1) % SEASON_DAYS) + 1;
function kindAtSlot(seed, slot, seasonId) {
  const rng = seeded(((seed || 7) * 7919 + slot * 104729) >>> 0),
    w = WEIGHTS[seasonId],
    total = Object.values(w).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const [k, v] of Object.entries(w)) if ((roll -= v) < 0) return k;
  return 'clear';
}
// The weather at a moment: { kind, start, end } (the first ten minutes of a new game are always clear).
export function weatherAt(s, elapsed = s.elapsed || 0) {
  const slot = Math.floor(elapsed / SLOT),
    day = 1 + Math.floor(elapsed / DAY),
    seasonId = SEASON_IDS[Math.floor((day - 1) / SEASON_DAYS) % SEASON_IDS.length];
  const kind = elapsed < 600 ? 'clear' : kindAtSlot(s.seed, slot, seasonId);
  return { kind, ...WEATHER[kind], start: slot * SLOT, end: (slot + 1) * SLOT };
}
export const weatherKind = s => weatherAt(s).kind;
export const stormAt = s => weatherAt(s).kind === 'thunder';
// The old storm clock, driven by the schedule: 'storm' while a thunderstorm rages, 'warn' in the 30 s before one.
export function stormClock(s, elapsed = s.elapsed || 0) {
  const w = weatherAt(s, elapsed);
  if (w.kind === 'thunder') return { phase: 'storm', left: w.end - elapsed };
  const next = weatherAt(s, w.end);
  if (next.kind === 'thunder' && w.end - elapsed <= STORM_WARN) return { phase: 'warn', left: w.end - elapsed };
  return null;
}
// ---------- what the sky does to play ----------
export function fishingWaitFactor(s) {
  const k = weatherKind(s),
    se = seasonOf(s);
  return (
    (k === 'rain' ? 0.75 : k === 'thunder' ? 1.3 : k === 'snow' ? 1.2 : 1) *
    (se === 'summer' ? 0.85 : se === 'winter' ? 1.3 : 1)
  );
}
export const bigFishFactor = s => (seasonOf(s) === 'winter' ? 1.4 : 1);
export const harvestBonus = s => (seasonOf(s) === 'autumn' ? 1 : 0);
export const gardenBonus = s => (seasonOf(s) === 'spring' ? 1 : 0);
export const oxygenShift = s => (seasonOf(s) === 'winter' ? -10 : 0);
export const mutationFactor = s => (seasonOf(s) === 'spring' ? 1.5 : 1);
// spawn weight multipliers by family and strain, and for rares
export function spawnMods(s) {
  const se = seasonOf(s);
  if (se === 'winter') return { family: { sea: 0.5, deep: 1.6 }, rare: 1 };
  if (se === 'spring') return { family: { flora: 1.6 }, rare: 1 };
  if (se === 'autumn') return { family: {}, rare: 1.6 };
  return { family: {}, rare: 1 };
}
export const describeSky = s => `${season(s).name} · ${weatherAt(s).name}`;
