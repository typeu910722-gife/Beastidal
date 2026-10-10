// The backpack holds a limited number of things in all. What does not fit waits in the storage of the raft's
// desk: deposit there when the bag is full, and enlarge the bag at the desk with materials. While you are home,
// building and crafting can draw on the desk's storage as well as the bag.
import { homePos, nearFacility } from './fortress.js?v=0.14.0';
export const CARRY = ['wood', 'metal', 'fiber', 'crystal', 'food', 'water', 'bait'];
// supplies you keep on you when depositing
export const KEEP = ['food', 'water', 'bait'];
export const BAG_LEVELS = [
  { cap: 40 },
  { cap: 60, cost: { wood: 8, fiber: 6 } },
  { cap: 85, cost: { wood: 12, fiber: 8, metal: 4 } },
  { cap: 115, cost: { wood: 16, metal: 8, crystal: 3 } },
  { cap: 150, cost: { wood: 22, metal: 12, crystal: 6 } }
];
const HOME_RANGE = 27;

export const bagUsed = s => CARRY.reduce((n, k) => n + (s.resources[k] || 0), 0);
export const bagCap = s => BAG_LEVELS[Math.min(s.bagLevel || 0, BAG_LEVELS.length - 1)].cap;
export const bagRoom = s => Math.max(0, bagCap(s) - bagUsed(s));
// home is the raft, or the warship once the base has gone to sea (see fortress.js)
export const atHome = s => {
  const h = homePos(s);
  return Math.hypot(s.player.x - h.x, s.player.z - h.z) <= HOME_RANGE;
};
export const nearDesk = s =>
  nearFacility(
    s,
    s.buildings.find(b => b.type === 'desk' && !b.stowed)
  );

export function normalizeBag(s) {
  s.bagLevel ??= 0;
  s.storage ??= {};
  for (const k of CARRY) s.storage[k] ??= 0;
  return s;
}
// Loading a save from before the limit: anything beyond the bag's room moves to the desk (materials first).
export function migrateBag(s) {
  normalizeBag(s);
  let over = bagUsed(s) - bagCap(s);
  for (const k of [...CARRY.filter(k => !KEEP.includes(k)), ...KEEP]) {
    if (over <= 0) break;
    const n = Math.min(over, s.resources[k] || 0);
    s.resources[k] -= n;
    s.storage[k] += n;
    over -= n;
  }
  return s;
}

// What can be spent right now: the bag, plus the desk's storage while you are home.
export const funds = (s, k) => (s.resources[k] || 0) + (atHome(s) ? s.storage?.[k] || 0 : 0);
export const canAfford = (s, cost) => Object.entries(cost).every(([k, v]) => funds(s, k) >= v);
export function spend(s, cost) {
  if (!canAfford(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) {
    const fromBag = Math.min(v, s.resources[k] || 0);
    s.resources[k] -= fromBag;
    if (v > fromBag) s.storage[k] -= v - fromBag;
  }
  return true;
}
// Gathered things go into the bag as far as it has room; returns what went in.
export function stow(s, items) {
  const got = {};
  let room = bagRoom(s);
  for (const [k, v] of Object.entries(items)) {
    const n = Math.max(0, Math.min(v, room));
    s.resources[k] = (s.resources[k] || 0) + n;
    room -= n;
    if (n) got[k] = n;
  }
  return got;
}
// Rewards are never lost: what the bag cannot hold is sent home to the desk's storage.
export function give(s, items) {
  normalizeBag(s);
  const got = stow(s, items);
  for (const [k, v] of Object.entries(items)) if (v > (got[k] || 0)) s.storage[k] += v - (got[k] || 0);
  return got;
}
export const bagFullError = '背包滿了。回避難所，把物資存到書桌上。';

// At the desk: put every material from the bag into storage (food, water and bait stay with you).
export function deposit(s) {
  normalizeBag(s);
  if (!nearDesk(s)) return { ok: false, error: '請走到木筏的書桌旁。' };
  let n = 0;
  for (const k of CARRY) {
    if (KEEP.includes(k) || !s.resources[k]) continue;
    n += s.resources[k];
    s.storage[k] += s.resources[k];
    s.resources[k] = 0;
  }
  return n
    ? { ok: true, message: `存入 ${n} 件物資。背包 ${bagUsed(s)} / ${bagCap(s)}` }
    : { ok: false, error: '背包裡沒有可存放的材料。' };
}
// At the desk: refill the bag with supplies (food, water, bait) from storage, as far as it has room.
export function takeSupplies(s) {
  normalizeBag(s);
  if (!nearDesk(s)) return { ok: false, error: '請走到木筏的書桌旁。' };
  const want = Object.fromEntries(KEEP.map(k => [k, s.storage[k]]).filter(([, v]) => v > 0));
  if (!Object.keys(want).length) return { ok: false, error: '書桌上沒有補給。' };
  if (!bagRoom(s)) return { ok: false, error: '背包已經滿了。' };
  const got = stow(s, want);
  let n = 0;
  for (const [k, v] of Object.entries(got)) {
    s.storage[k] -= v;
    n += v;
  }
  return { ok: true, message: `取出 ${n} 份補給。背包 ${bagUsed(s)} / ${bagCap(s)}` };
}
export const nextBag = s => BAG_LEVELS[(s.bagLevel || 0) + 1] || null;
export function upgradeBag(s) {
  normalizeBag(s);
  const next = nextBag(s);
  if (!next) return { ok: false, error: '背包已經是最大了。' };
  if (!nearDesk(s)) return { ok: false, error: '請走到木筏的書桌旁。' };
  if (!spend(s, next.cost)) return { ok: false, error: '升級背包的材料不足。' };
  s.bagLevel++;
  return { ok: true, message: `背包加大了：可以裝 ${bagCap(s)} 件。` };
}
