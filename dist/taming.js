// Taming, 0.12: feed the same wild beast again and again (each feeding costs more bait: 1, 3, 5, 7 …). Every
// feeding raises trust by a random 8–30 %, and by the 6th feeding (common) to 10th (rarest) it is certain to reach
// 100 %. About 1 in 110 beasts that appear (0.9 %) is unusually tame: one feeding gives +90 %. At 100 % it follows
// you. Contract scrolls, made at the raft's work table and carried in the bag, bind a beast anywhere (success
// chance = trust %). Forcing a contract below 60 % trust can send the beast into a frenzy: 1.2× speed and attack,
// chasing you for 6–17 seconds.
import { phenotype, geneName } from './genetics.js?v=0.16.0';
import { freePen, normalizeHousing, beastRoom, BEAST_CAPACITY } from './housing.js?v=0.16.0';
import { spend } from './bag.js?v=0.16.0';
import { remember } from './memories.js?v=0.16.0';
import { nearFacility } from './fortress.js?v=0.16.0';

export const RARITY = ['常見', '少見', '稀有', '罕見', '傳說'];
export const FRENZY = { power: 1.2, min: 6, max: 17, below: 60 };
export const TRUST_GAIN = { min: 8, max: 30, tame: 90, tameChance: 0.009 };
// Rolled once when a wild beast appears.
export const rollTame = (rng = Math.random) => rng() < TRUST_GAIN.tameChance;

// Rarity tier 0–4: shallow-sea beasts are common; land, deep and plant lineages are rarer; strong bioluminescence
// and mixed blood add a tier each.
export function rarityOf(genome) {
  const p = phenotype(genome),
    base = { sea: 0, land: 1, deep: 2, flora: 3 }[p.family] ?? 0;
  return Math.min(4, base + (p.glow > 0.85 ? 1 : 0) + (p.fusion || p.family !== p.secondFamily ? 1 : 0));
}
export const feedsNeeded = genome => 6 + rarityOf(genome);
// bait for the next feeding: 1, 3, 5, 7 …
export const baitCost = w => 2 * (w.feeds || 0) + 1;
export const frenzied = (w, elapsed) => (w.frenzyUntil || 0) > elapsed;

// Old saves: trust built under the old rules turns into the equivalent number of feedings.
export function normalizeTaming(s) {
  s.contracts ??= 0;
  for (const w of s.wild || []) {
    w.trust ??= 0;
    if (w.feeds === undefined) w.feeds = Math.round((w.trust / 100) * feedsNeeded(w.genome));
    if (w.trust >= 100) w.follow = true;
  }
  return s;
}

export function feed(s, id, rng = Math.random) {
  if (!s.secret) return { ok: false, error: '你還不知道如何接近牠。試著調查研究浮標。' };
  const w = s.wild.find(w => w.id === id);
  if (!w) return { ok: false, error: '生物已離開。' };
  if (Math.hypot(w.x - s.player.x, w.z - s.player.z) > 11) return { ok: false, error: '請靠近生物身旁，再投餌。' };
  if (frenzied(w, s.elapsed)) return { ok: false, error: '牠正在狂暴，先拉開距離！' };
  if (w.follow) return { ok: false, error: '牠已經完全信任你了。帶著契約書，在牠旁邊按 X 締結。' };
  normalizeTaming(s);
  const cost = baitCost(w);
  if ((s.resources.bait || 0) < cost)
    return { ok: false, error: `第 ${w.feeds + 1} 次投餌需要 ${cost} 份誘餌（目前 ${s.resources.bait || 0} 份）。` };
  s.resources.bait -= cost;
  w.feeds++;
  w.lastFeed = s.elapsed;
  const need = feedsNeeded(w.genome),
    before = w.trust,
    gain = w.tame ? TRUST_GAIN.tame : TRUST_GAIN.min + Math.floor(rng() * (TRUST_GAIN.max - TRUST_GAIN.min + 1));
  w.tame = false; // the bonus is for the first feeding only
  w.trust = w.feeds >= need ? 100 : Math.min(100, w.trust + gain);
  const got = w.trust - before;
  if (w.trust >= 100) {
    w.follow = true;
    return { ok: true, trust: 100, gain: got, follow: true };
  }
  return { ok: true, trust: w.trust, gain: got, next: baitCost(w), left: need - w.feeds };
}

// Contract scrolls are made at the raft's work table and carried in the bag; one is used up per attempt.
export const CONTRACT_COST = { fiber: 2, crystal: 1 };
export function craftContract(s, table) {
  if (!s.secret) return { ok: false, error: '還不知道怎麼和牠們締結契約。先調查研究浮標。' };
  if (!table) return { ok: false, error: '需要木筏上的工作桌。' };
  if (!nearFacility(s, table)) return { ok: false, error: '請站在工作桌旁。' };
  if (!spend(s, CONTRACT_COST)) return { ok: false, error: '製作契約書需要 2 纖維與 1 異晶。' };
  s.contracts = (s.contracts || 0) + 1;
  return { ok: true, message: `契約書 +1（背包裡共 ${s.contracts} 份）` };
}

// Use a contract scroll on a wild beast that trusts you, anywhere: success chance = trust %.
export function contract(s, id, rng = Math.random) {
  normalizeHousing(s);
  if ((s.contracts || 0) < 1) return { ok: false, error: '背包裡沒有契約書。到木筏的工作桌製作。' };
  if (!beastRoom(s)) return { ok: false, error: `御獸倉庫已滿（${BEAST_CAPACITY} 隻）。` };
  const w = s.wild.find(w => w.id === id);
  if (!w) return { ok: false, error: '生物已離開。' };
  if (Math.hypot(w.x - s.player.x, w.z - s.player.z) > 12) return { ok: false, error: '請靠近牠再締結契約。' };
  if (frenzied(w, s.elapsed)) return { ok: false, error: '牠正在狂暴，先拉開距離！' };
  if (!(w.trust > 0)) return { ok: false, error: '牠還不信任你，先投餌。' };
  s.contracts--;
  const chance = w.trust;
  if (rng() * 100 < chance) {
    const pet = {
      id: w.id,
      genome: w.genome,
      name: geneName(w.genome),
      generation: 0,
      parents: [],
      mutations: 0,
      bond: 10,
      stamina: 100,
      health: 100,
      role: 'exhibit',
      penId: freePen(s)
    };
    remember(s, pet, `締結契約。牠的信任度是 ${chance}%。`);
    s.tamed.push(pet);
    s.wild = s.wild.filter(c => c !== w);
    return { ok: true, tamed: pet, chance };
  }
  w.follow = false;
  if (chance < FRENZY.below) {
    const secs = Math.round(FRENZY.min + rng() * (FRENZY.max - FRENZY.min));
    w.frenzyUntil = s.elapsed + secs;
    w.trust = Math.max(0, chance - 30);
    return { ok: false, frenzy: true, seconds: secs, chance, error: '契約失敗！牠陷入狂暴，正朝你衝過來！' };
  }
  w.trust = Math.max(0, chance - 15);
  return { ok: false, chance, error: `契約失敗，牠退縮了。信任度降到 ${w.trust}%。` };
}
