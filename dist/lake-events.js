// Lake events (0.18): every few minutes something happens somewhere on the lake, so the same water never plays
// the same way twice. One event at a time; each lasts a few minutes and leaves when its time is up.
//   漂流商船 a drifting merchant trades three random offers
//   異晶潮   the lake glows: crystal crates surface near you
//   御獸遷徙 a herd of one species crosses the lake; calmer around people (easier to tame)
//   湖心寶藏 a light marks a cache on the lakebed; dive to it
import { waterNear, groundAt } from './lake.js?v=0.19.0';
import { makeGenome, allSpecies } from './genetics.js?v=0.19.0';
import { spend } from './bag.js?v=0.19.0';
import { tally } from './stats.js?v=0.19.0';

export const EVENTS = {
  merchant: { name: '漂流商船', dur: 210, weight: 3, hint: '開船靠近，看看他帶了什麼。' },
  tide: { name: '異晶潮', dur: 130, weight: 2, hint: '湖面發光了，附近浮出了異晶研究箱。' },
  migration: { name: '御獸遷徙', dur: 170, weight: 3, hint: '一群生物正橫越湖面，牠們比平常溫和。' },
  treasure: { name: '湖心寶藏', dur: 260, weight: 2, hint: '湖心亮起一道光柱，騎御獸潛下去看看。' }
};
const TRADES = [
  { give: { wood: 12 }, get: { metal: 5 } },
  { give: { metal: 8 }, get: { crystal: 3 } },
  { give: { food: 6 }, get: { bait: 8 } },
  { give: { crystal: 4 }, get: { metal: 10 } },
  { give: { fiber: 10 }, get: { food: 5, water: 5 } },
  { give: { crystal: 6 }, get: { contract: 2 } },
  { give: { wood: 20, fiber: 6 }, get: { contract: 1 } },
  { give: { bait: 6 }, get: { crystal: 2 } }
];
export const FIRST_EVENT = 240,
  GAP = [300, 600];
const fail = error => ({ ok: false, error });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function normalizeEvents(s) {
  s.lakeEvent ??= null;
  s.nextEventAt ??= s.elapsed + FIRST_EVENT;
  return s;
}
function pick(rng) {
  const all = Object.entries(EVENTS),
    total = all.reduce((a, [, e]) => a + e.weight, 0);
  let r = rng() * total;
  for (const [k, e] of all) if ((r -= e.weight) < 0) return k;
  return all[0][0];
}
function spot(s, rng, min, max, depth = 4) {
  const a = rng() * Math.PI * 2,
    d = min + rng() * (max - min);
  return waterNear(s.player.x + Math.sin(a) * d, s.player.z + Math.cos(a) * d, depth, 200);
}
export function startEvent(s, kind, rng = Math.random) {
  const at = spot(s, rng, 70, 150, kind === 'treasure' ? 25 : 4),
    ev = { kind, x: at.x, z: at.z, until: s.elapsed + EVENTS[kind].dur, id: 'ev-' + Math.floor(rng() * 1e9) };
  if (kind === 'merchant') {
    const pool = [...TRADES];
    ev.offers = Array.from({ length: 3 }, () => ({
      ...pool.splice(Math.floor(rng() * pool.length), 1)[0],
      done: false
    }));
  }
  if (kind === 'tide')
    for (let i = 0; i < 6; i++) {
      const p = spot(s, rng, 25, 70);
      s.loot.push({ id: `${ev.id}-c${i}`, x: p.x, z: p.z, kind: 3, spin: rng() * 6, event: ev.id });
    }
  if (kind === 'migration') {
    const kinds = allSpecies().filter(x => x.family !== 'land'),
      sp = kinds[Math.floor(rng() * kinds.length)],
      a = rng() * Math.PI * 2;
    ev.species = sp.name;
    ev.from = waterNear(at.x - Math.sin(a) * 120, at.z - Math.cos(a) * 120, 4, 200);
    ev.to = waterNear(at.x + Math.sin(a) * 120, at.z + Math.cos(a) * 120, 4, 200);
    for (let i = 0; i < 7; i++) {
      const ox = (rng() - 0.5) * 18,
        oz = (rng() - 0.5) * 18,
        x = ev.from.x + ox,
        z = ev.from.z + oz;
      s.wild.push({
        id: `${ev.id}-w${i}`,
        x,
        z,
        homeX: x,
        homeZ: z,
        ox,
        oz,
        phase: rng() * 6,
        genome: makeGenome(Math.floor(rng() * 1e9), sp.form, sp.family),
        trust: 0,
        hostile: false,
        event: ev.id
      });
    }
  }
  if (kind === 'treasure') ev.ground = groundAt(at.x, at.z);
  s.lakeEvent = ev;
  return ev;
}
// Each frame: start, move and end events. Returns [{ type: 'start' | 'end', ev }].
export function tickEvents(s, dt, rng = Math.random) {
  normalizeEvents(s);
  const out = [],
    ev = s.lakeEvent;
  if (!ev) {
    if (s.elapsed >= s.nextEventAt && !s.inCave) out.push({ type: 'start', ev: startEvent(s, pick(rng), rng) });
    return out;
  }
  if (ev.kind === 'migration') {
    // the herd drifts along its path; anything that has come to trust you stays behind with you
    const k = Math.min(1, 1 - (ev.until - s.elapsed) / EVENTS.migration.dur),
      cx = ev.from.x + (ev.to.x - ev.from.x) * k,
      cz = ev.from.z + (ev.to.z - ev.from.z) * k;
    for (const w of s.wild)
      if (w.event === ev.id && !w.follow) {
        w.homeX = cx + w.ox;
        w.homeZ = cz + w.oz;
      }
  }
  if (s.elapsed >= ev.until) {
    s.loot = s.loot.filter(l => l.event !== ev.id);
    s.wild = s.wild.filter(w => w.event !== ev.id || w.follow);
    s.lakeEvent = null;
    s.nextEventAt = s.elapsed + GAP[0] + rng() * (GAP[1] - GAP[0]);
    out.push({ type: 'end', ev });
  }
  return out;
}
export const eventNear = (s, r = 14) => !!s.lakeEvent && dist(s.player, s.lakeEvent) < r;
export function trade(s, i) {
  const ev = s.lakeEvent;
  if (ev?.kind !== 'merchant') return fail('商船已經離開了。');
  if (!eventNear(s, 16)) return fail('開船靠近商船再交易。');
  const o = ev.offers[i];
  if (!o || o.done) return fail('這筆交易已經完成。');
  if (!spend(s, o.give)) return fail('材料不夠。');
  for (const [k, v] of Object.entries(o.get)) {
    if (k === 'contract') s.contracts = (s.contracts || 0) + v;
    else s.resources[k] = (s.resources[k] || 0) + v;
  }
  o.done = true;
  tally(s, 'event');
  return { ok: true, message: '交易完成。' };
}
export const TREASURE = { crystal: 8, metal: 6, contract: 1 };
export function claimTreasure(s) {
  const ev = s.lakeEvent;
  if (ev?.kind !== 'treasure' || ev.claimed) return fail('這裡已經沒有寶藏了。');
  if (!s.expedition?.diving) return fail('寶藏沉在湖底，騎御獸潛下去。');
  if (!eventNear(s, 9)) return fail('再靠近光柱一點。');
  ev.claimed = true;
  for (const [k, v] of Object.entries(TREASURE)) {
    if (k === 'contract') s.contracts = (s.contracts || 0) + v;
    else s.resources[k] = (s.resources[k] || 0) + v;
  }
  ev.until = Math.min(ev.until, s.elapsed + 8);
  tally(s, 'event');
  return { ok: true, message: '找到湖底寶藏：異晶 +8、金屬 +6、契約書 +1。' };
}
