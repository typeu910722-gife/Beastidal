// Gear (0.23): four tools made at the work table that stay with you once made. They open the lake up a step at
// a time — the rod for fishing, the mask for longer dives, the hook for steeper shores, the saddle for the ride.
export const GEAR = {
  rod: {
    name: '魚竿',
    icon: '🎣',
    desc: '在船上或岸邊垂釣。按 E 拋竿，上鉤時再按一次。',
    cost: { wood: 6, fiber: 6, nails: 2 }
  },
  mask: { name: '潛水面罩', icon: '🤿', desc: '潛水氧氣上限 +40 秒。', cost: { glass: 1, leather: 1, rope: 1 } },
  hook: { name: '攀爬鉤', icon: '🪝', desc: '能爬上更陡的岸壁與更高的山麓。', cost: { metal: 5, rope: 2 } },
  saddle: {
    name: '鞍具',
    icon: '🐎',
    desc: '騎乘速度 +30%，夥伴騎乘時耐力消耗減半。',
    cost: { leather: 2, cloth: 1, nails: 2 }
  }
};
export const GEAR_IDS = Object.keys(GEAR);
export const hasGear = (s, id) => !!s.gear?.[id];
export function normalizeGear(s) {
  s.gear ??= {};
  return s;
}
export const MASK_OXYGEN = 40;
export const SADDLE_SPEED = 1.3;
// the hook lets you up slopes to 2.4 (1.6 without) and ground to 140 m (90 without)
export const HOOK_SLOPE = 2.4,
  HOOK_HEIGHT = 140;
