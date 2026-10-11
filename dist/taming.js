// Taming, 0.22. Two systems now live side by side:
//   生物 (creatures): fed bait until they trust you (each feeding costs more: 1, 3, 5, 7 …; by the 6th–10th it is
//     certain), then carried home in an 外出籠 (carry cage). Aboard they rest, work and breed. Breeding can
//     surface 比斯基因 (BS DNA); a creature carrying three or more can be bound by a contract scroll into a 御獸.
//   御獸 (beasts): the bound ones, and the twelve wild low-tier kinds. Friendly wild beasts are fed rations and
//     bound by trust; hostile ones must be worn down in a fight — the weaker, the better the odds — and stay
//     modest even bound. A failed contract can send anything into a frenzy: 1.2× speed and bite, hunting you for
//     10–20 seconds, and nothing frenzied can be repelled.
import { phenotype, geneName } from './genetics.js?v=0.24.0';
import { freePen, normalizeHousing, beastRoom, BEAST_CAPACITY } from './housing.js?v=0.24.0';
import { spend } from './bag.js?v=0.24.0';
import { remember } from './memories.js?v=0.24.0';
import { nearFacility } from './fortress.js?v=0.24.0';
import { hasPerk } from './codex.js?v=0.24.0';
import { tally } from './stats.js?v=0.24.0';
import { bsOf, canEvolve, EVOLVE_GENES } from './bsgenes.js?v=0.24.0';
import { WILD_BEASTS, beastChance, isWildBeast } from './beasts.js?v=0.24.0';
import { trustBonus } from './skills.js?v=0.24.0';

export const RARITY = ['常見', '少見', '稀有', '罕見', '傳說'];
export const FRENZY = { power: 1.2, min: 10, max: 20, below: 60 };
export const TRUST_GAIN = { min: 8, max: 30, tame: 90, tameChance: 0.009 };
export const CAGE_TRUST = 50;
// Rolled once when a wild beast appears.
export const rollTame = (rng = Math.random) => rng() < TRUST_GAIN.tameChance;

// Rarity tier 0–4: shallow-sea beasts are common; land, deep and plant lineages are rarer; strong bioluminescence
// and mixed blood add a tier each.
export function rarityOf(genome) {
  const p = phenotype(genome),
    base = { sea: 0, land: 1, deep: 2, flora: 3 }[p.family] ?? 0;
  return Math.min(
    4,
    base +
      (p.strain === 3 ? 2 : p.strain === 2 ? 1 : 0) +
      (p.glow > 0.85 ? 1 : 0) +
      (p.fusion || p.family !== p.secondFamily ? 1 : 0)
  );
}
export const feedsNeeded = genome => 6 + rarityOf(genome);
// bait for the next feeding: 1, 3, 5, 7 …
export const baitCost = w => 2 * (w.feeds || 0) + 1;
export const frenzied = (w, elapsed) => (w.frenzyUntil || 0) > elapsed;
// anything frenzied counts as hostile
export const dangerous = (w, elapsed) => !!w.hostile || frenzied(w, elapsed);
export const isBeast = p => p.kind !== 'creature';

// Old saves: trust built under the old rules turns into the equivalent number of feedings; everything owned
// before 0.22 was bound by contract, so it counts as a 御獸.
export function normalizeTaming(s) {
  s.contracts ??= 0;
  for (const w of s.wild || []) {
    w.trust ??= 0;
    if (w.feeds === undefined) w.feeds = Math.round((w.trust / 100) * feedsNeeded(w.genome));
    if (w.trust >= 100) w.follow = true;
    if (w.beast && WILD_BEASTS[w.beast]) {
      w.maxHp ??= WILD_BEASTS[w.beast].hp;
      w.hp ??= w.maxHp;
    }
  }
  for (const p of s.tamed || []) p.kind ??= 'beast';
  return s;
}
function startFrenzy(s, w, rng) {
  const secs = Math.round(FRENZY.min + rng() * (FRENZY.max - FRENZY.min));
  w.frenzyUntil = s.elapsed + secs;
  return secs;
}
export function feed(s, id, rng = Math.random) {
  if (!s.secret) return { ok: false, error: '你還不知道如何接近牠。試著調查研究浮標。' };
  const w = s.wild.find(w => w.id === id);
  if (!w) return { ok: false, error: '生物已離開。' };
  if (Math.hypot(w.x - s.player.x, w.z - s.player.z) > 11) return { ok: false, error: '請靠近生物身旁，再投餌。' };
  if (frenzied(w, s.elapsed)) return { ok: false, error: '牠正在狂暴，先拉開距離！' };
  if (w.follow)
    return {
      ok: false,
      error:
        '牠已經完全信任你了。' + (isWildBeast(w) ? '帶著契約書，在牠旁邊按 X 締結。' : '拿出外出籠，按 X 帶牠回船上。')
    };
  normalizeTaming(s);
  // wild beasts: the friendly ones take rations, the hostile ones take nothing but a fight
  if (isWildBeast(w)) {
    const b = WILD_BEASTS[w.beast];
    if (!b.friendly) return { ok: false, error: '牠只想咬你。先在戰鬥裡消耗牠的體力，再試契約。' };
    if ((s.resources.food || 0) < 1) return { ok: false, error: '友善的御獸吃口糧，不吃誘餌。背包裡沒有口糧。' };
    s.resources.food--;
    w.feeds++;
    const gain = 12 + Math.floor(rng() * 14);
    w.trust = Math.min(100, w.trust + gain);
    tally(s, 'feed');
    if (w.trust >= 100) w.follow = true;
    return { ok: true, trust: w.trust, gain, follow: w.follow, beast: true };
  }
  const cost = baitCost(w);
  if ((s.resources.bait || 0) < cost)
    return { ok: false, error: `第 ${w.feeds + 1} 次投餌需要 ${cost} 份誘餌（目前 ${s.resources.bait || 0} 份）。` };
  s.resources.bait -= cost;
  w.feeds++;
  w.lastFeed = s.elapsed;
  const need = feedsNeeded(w.genome),
    before = w.trust,
    gain =
      (w.tame ? TRUST_GAIN.tame : TRUST_GAIN.min + Math.floor(rng() * (TRUST_GAIN.max - TRUST_GAIN.min + 1))) +
      (hasPerk(s, 'sea') ? 5 : 0) +
      trustBonus(s) +
      (w.event ? 10 : 0); // migrating herds are calmer around people
  tally(s, 'feed');
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
function makePet(s, w, kind, extra = {}) {
  return {
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
    penId: freePen(s),
    kind,
    ...extra
  };
}
// 外出籠: carry a trusting wild creature (not a wild beast) home. No roll — trust is the whole requirement.
export function cageCreature(s, id) {
  normalizeHousing(s);
  normalizeTaming(s);
  if ((s.resources.cage || 0) < 1) return { ok: false, error: '背包裡沒有外出籠。到工作桌製作。' };
  const w = s.wild.find(w => w.id === id);
  if (!w) return { ok: false, error: '生物已離開。' };
  if (isWildBeast(w)) return { ok: false, error: '御獸進不了外出籠，只能用契約書。' };
  if (Math.hypot(w.x - s.player.x, w.z - s.player.z) > 12) return { ok: false, error: '請靠近牠再使用外出籠。' };
  if (frenzied(w, s.elapsed)) return { ok: false, error: '牠正在狂暴，先拉開距離！' };
  if (!(w.trust >= CAGE_TRUST))
    return { ok: false, error: `牠還不夠信任你（需要 ${CAGE_TRUST}%，目前 ${Math.round(w.trust)}%）。` };
  if (!beastRoom(s)) return { ok: false, error: `御獸倉庫已滿（${BEAST_CAPACITY} 隻）。` };
  s.resources.cage--;
  const pet = makePet(s, w, 'creature');
  remember(s, pet, `進了外出籠，跟你回到船上。信任度 ${Math.round(w.trust)}%。`);
  s.tamed.push(pet);
  s.wild = s.wild.filter(c => c !== w);
  tally(s, 'cage');
  return { ok: true, tamed: pet };
}
// Use a contract scroll on a wild thing: a wild beast (by trust or by how worn down it is), or a creature that
// already carries three BS genes. Success binds it as a 御獸.
export function contract(s, id, rng = Math.random) {
  normalizeHousing(s);
  normalizeTaming(s);
  if ((s.contracts || 0) < 1) return { ok: false, error: '背包裡沒有契約書。到木筏的工作桌製作。' };
  if (!beastRoom(s)) return { ok: false, error: `御獸倉庫已滿（${BEAST_CAPACITY} 隻）。` };
  const w = s.wild.find(w => w.id === id);
  if (!w) return { ok: false, error: '生物已離開。' };
  if (Math.hypot(w.x - s.player.x, w.z - s.player.z) > 12) return { ok: false, error: '請靠近牠再締結契約。' };
  if (frenzied(w, s.elapsed)) return { ok: false, error: '牠正在狂暴，先拉開距離！' };
  let chance,
    hostile = false;
  if (isWildBeast(w)) {
    const b = WILD_BEASTS[w.beast];
    hostile = !b.friendly;
    chance = beastChance(w);
    if (b.friendly && !(w.trust > 0)) return { ok: false, error: '牠還不信任你，先餵牠口糧。' };
  } else {
    if (!canEvolve(w.genome))
      return {
        ok: false,
        error: `普通生物不能直接契約。先用外出籠帶回船上，配種出 ${EVOLVE_GENES} 種比斯基因，再契闊進化。`
      };
    if (!(w.trust > 0)) return { ok: false, error: '牠還不信任你，先投餌。' };
    chance = w.trust;
  }
  s.contracts--;
  if (rng() * 100 < chance) {
    const b = w.beast ? WILD_BEASTS[w.beast] : null,
      pet = makePet(s, w, 'beast', b ? { name: b.name, wildBeast: w.beast, cap: b.cap } : { evolved: true });
    remember(
      s,
      pet,
      b
        ? `締結契約。${b.friendly ? '牠把頭靠了過來。' : '牠喘著氣，終於低下了頭。'}`
        : `締結契約。牠的信任度是 ${chance}%。`
    );
    s.tamed.push(pet);
    s.wild = s.wild.filter(c => c !== w);
    tally(s, 'tame');
    return { ok: true, tamed: pet, chance };
  }
  w.follow = false;
  if (hostile || chance < FRENZY.below) {
    const secs = startFrenzy(s, w, rng);
    w.trust = Math.max(0, chance - 30);
    return { ok: false, frenzy: true, seconds: secs, chance, error: '契約失敗！牠陷入狂暴，正朝你衝過來！' };
  }
  w.trust = Math.max(0, chance - 15);
  return { ok: false, chance, error: `契約失敗，牠退縮了。信任度降到 ${w.trust}%。` };
}
// 契闊進化: bind a captive creature that carries three BS genes. Odds follow the bond (at least 30%).
export function evolve(s, petId, rng = Math.random) {
  normalizeTaming(s);
  const p = s.tamed.find(t => t.id === petId);
  if (!p) return { ok: false, error: '找不到這隻生物。' };
  if (p.kind !== 'creature') return { ok: false, error: '牠已經是御獸了。' };
  if (!canEvolve(p.genome))
    return {
      ok: false,
      error: `需要至少 ${EVOLVE_GENES} 種比斯基因（目前 ${bsOf(p.genome).length} 種）。到孵化台配種看看。`
    };
  if ((s.contracts || 0) < 1) return { ok: false, error: '背包裡沒有契約書。' };
  s.contracts--;
  const chance = Math.max(30, Math.round(p.bond));
  if (rng() * 100 < chance) {
    p.kind = 'beast';
    p.evolved = true;
    remember(s, p, '契闊進化：契約書的光流進牠身上的每一道突變。牠不再只是生物了。');
    tally(s, 'evolve');
    return { ok: true, chance, message: `${p.name} 契闊進化成御獸了！` };
  }
  p.bond = Math.max(0, p.bond - 10);
  return { ok: false, chance, error: `契闊失敗（${chance}%）。牠退開了，羈絆 -10。` };
}
