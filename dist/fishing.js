// Fishing (0.23): with a rod in hand, press E on open water (from the boat or a shore) to cast. After a few
// seconds something bites; press E again within the window to hook it. Deep water gives bigger fish, the
// fishing skill shortens the wait and improves the catch, and the odd pearl turns up.
import { groundAt } from './lake.js?v=0.57.0';
import { hasGear } from './gear.js?v=0.57.0';
import { give, bagRoom } from './bag.js?v=0.57.0';
import { tally } from './stats.js?v=0.57.0';
import { fishBonus, skillLevel } from './skills.js?v=0.57.0';
import { fishingWaitFactor, bigFishFactor } from './weather.js?v=0.57.0';

export const BITE_WINDOW = 1.6;
export const CATCHES = {
  fish: { name: '湖魚', w: 60 },
  bigfish: { name: '大湖魚', w: 22, deep: true },
  bait: { name: '誘餌', w: 14 },
  pearl: { name: '湖珍珠', w: 4, deep: true }
};
const fail = error => ({ ok: false, error });
// where you can fish from: afloat (not riding), or standing on a shore next to water
export function canFishHere(s) {
  if (!hasGear(s, 'rod')) return fail('需要魚竿。到工作桌製作。');
  if (s.inCave || s.inTown || s.player.mode === 'cabin' || s.player.mode === 'aboard') return fail('這裡沒辦法垂釣。');
  if (s.expedition?.mounted) return fail('騎乘時不能垂釣。');
  if (s.player.mode === 'foot') {
    const near = [0, 1, 2, 3].some(i => {
      const a = (i * Math.PI) / 2;
      return groundAt(s.player.x + Math.sin(a) * 6, s.player.z + Math.cos(a) * 6) < -1;
    });
    if (!near) return fail('走到水邊再拋竿。');
  }
  if (!bagRoom(s)) return fail('背包滿了。');
  return { ok: true };
}
export function startFishing(s, rng = Math.random) {
  const c = canFishHere(s);
  if (!c.ok) return c;
  const depth = -Math.min(0, groundAt(s.player.x, s.player.z)),
    wait = (4 + rng() * 6) * (1 - 0.04 * (skillLevel(s, 'fishing') - 1)) * fishingWaitFactor(s);
  s.fishing = { at: s.elapsed, biteAt: s.elapsed + wait, depth, hooked: false };
  return { ok: true, message: '拋竿了。等牠咬鉤。' };
}
// Each frame: returns 'bite' when the float goes under, 'lost' when the window passed.
export function tickFishing(s) {
  const f = s.fishing;
  if (!f) return null;
  if (!f.bit && s.elapsed >= f.biteAt) {
    f.bit = true;
    return 'bite';
  }
  if (f.bit && s.elapsed > f.biteAt + BITE_WINDOW) {
    s.fishing = null;
    return 'lost';
  }
  return null;
}
export function reel(s, rng = Math.random) {
  const f = s.fishing;
  if (!f) return fail('還沒拋竿。');
  if (!f.bit) {
    s.fishing = null;
    return { ok: false, error: '太早收竿了，什麼都沒有。', early: true };
  }
  s.fishing = null;
  const bonus = fishBonus(s),
    deep = f.depth > 12;
  let total = 0;
  const pool = Object.entries(CATCHES).map(([k, c]) => {
    const w = c.w * (c.deep ? (deep ? 1.6 : 0.4) * bigFishFactor(s) : 1) * (c.w < 30 ? 1 + bonus * 4 : 1);
    total += w;
    return [k, w];
  });
  let roll = rng() * total,
    key = 'fish';
  for (const [k, w] of pool)
    if ((roll -= w) < 0) {
      key = k;
      break;
    }
  const n = key === 'fish' ? 1 + (rng() < 0.4 ? 1 : 0) : 1;
  give(s, { [key]: n });
  tally(s, key === 'bigfish' || key === 'pearl' ? 'bigfish' : 'fish');
  return { ok: true, key, n, message: `釣到${CATCHES[key].name} ×${n}！` };
}
export function cancelFishing(s) {
  s.fishing = null;
}
