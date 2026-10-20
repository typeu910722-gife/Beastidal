// Taming, 0.22. Two systems now live side by side:
//   生物 (creatures): fed bait until they trust you (each feeding costs more: 1, 3, 5, 7 …; by the 6th–10th it is
//     certain), then carried home in an 外出籠 (carry cage). Aboard they rest, work and breed. Breeding can
//     surface 比斯基因 (BS DNA); a creature carrying three or more can be bound by a contract scroll into a 御獸.
//   御獸 (beasts): the bound ones, and the twelve wild low-tier kinds. Friendly wild beasts are fed rations and
//     bound by trust; hostile ones must be worn down in a fight — the weaker, the better the odds — and stay
//     modest even bound. A failed contract can send anything into a frenzy: 1.2× speed and bite, hunting you for
//     10–20 seconds, and nothing frenzied can be repelled.
import { phenotype, geneName, makeGenome } from './genetics.js?v=0.73.0';
import { freePen, normalizeHousing, beastRoom, BEAST_CAPACITY } from './housing.js?v=0.73.0';
import { spend, give } from './bag.js?v=0.73.0';
import { remember } from './memories.js?v=0.73.0';
import { nearFacility } from './fortress.js?v=0.73.0';
import { hasPerk } from './codex.js?v=0.73.0';
import { tally } from './stats.js?v=0.73.0';
import { bsOf, canEvolve, EVOLVE_GENES, addRandomGene } from './bsgenes.js?v=0.73.0';
import { WILD_BEASTS, beastChance, isWildBeast } from './beasts.js?v=0.73.0';
import { trustBonus } from './skills.js?v=0.73.0';

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
  for (const p of s.tamed || []) {
    p.kind ??= 'beast';
    // 0.27.1: a 御獸 is one that was evolved by contract (契闊), bound as a wild beast, or is ancient. Saves from
    // before 0.22 called every tamed creature a beast; the rest go back to being creatures.
    if (p.kind === 'beast' && !p.evolved && !p.wildBeast && !p.ancient && !p.beast) {
      p.kind = 'creature';
      p.team = false;
      if (s.expedition?.activeId === p.id && s.expedition.mounted) {
        s.expedition.mounted = false;
        s.expedition.diving = false;
        const home = s.ship && !s.skiff ? s.ship : s.boat;
        if (home) Object.assign(s.player, { x: home.x, z: home.z });
      }
    }
  }
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
// 0.36: the little beast you freed from the net and fed becomes your first 御獸 there and then — a partner to fight
// beside you from the first day, long before cages, breeding and contracts.
export function bondFirstBeast(s, w, rng = Math.random, callOut = true) {
  normalizeHousing(s);
  normalizeTaming(s);
  w.genome.bs ??= [];
  for (let i = 0; i < 8 && bsOf(w.genome).length < EVOLVE_GENES; i++) addRandomGene(w.genome, rng, 'sea');
  const pet = makePet(s, w, 'beast', {
    evolved: true,
    first: true,
    bond: 30,
    team: teamOf(s).length < TEAM_SIZE,
    level: 1,
    xp: 0
  });
  remember(s, pet, '從漂流漁網裡被救出來，吃了你分的口糧，成了你的第一隻御獸。');
  s.tamed.push(pet);
  s.wild = s.wild.filter(c => c !== w);
  s.expedition ??= {};
  if (callOut && pet.team && !s.expedition.mounted) {
    s.expedition.activeId = pet.id;
    s.expedition.order = 'follow';
  }
  tally(s, 'contract');
  return pet;
}
// 0.36.1: saves from before the first beast came out of the net get it now — the net's beast if it is still around
// (waiting by the raft, or brought home as a plain creature), else a young one of the same line. Only once.
export function grantFirstBeast(s, rng = Math.random) {
  if (s.firstBeastGiven) return null;
  if (s.tamed.some(p => p.first)) {
    s.firstBeastGiven = true;
    return null;
  }
  // a new game still on its way to the net: the rescue gives it
  if (s.rescue === 'tangled' || s.rescue === 'freed') return null;
  s.firstBeastGiven = true;
  const home = s.tamed.find(p => p.id === 'wild-rescue');
  if (home) {
    home.first = true;
    if (home.kind === 'creature') {
      home.genome.bs ??= [];
      for (let i = 0; i < 8 && bsOf(home.genome).length < EVOLVE_GENES; i++) addRandomGene(home.genome, rng, 'sea');
      home.kind = 'beast';
      home.evolved = true;
      home.level ??= 1;
      home.xp ??= 0;
      home.team = teamOf(s).length < TEAM_SIZE;
      remember(s, home, '當年從漁網裡救起的小傢伙，終於成了御獸。');
    }
    return home;
  }
  const waiting = s.wild.find(w => w.id === 'wild-rescue');
  const w = waiting || {
    id: 'first-beast',
    x: s.player.x,
    z: s.player.z,
    genome: makeGenome(((s.seed || 1) * 7 + 3) >>> 0, 0, 'sea')
  };
  return bondFirstBeast(s, w, rng, !s.expedition?.activeId);
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
  if (contractsFull(s)) return { ok: false, error: CONTRACTS_FULL };
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
    pet.team = teamOf(s).length < TEAM_SIZE;
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
  if (contractsFull(s)) return { ok: false, error: CONTRACTS_FULL };
  s.contracts--;
  const chance = Math.max(30, Math.round(p.bond));
  if (rng() * 100 < chance) {
    p.kind = 'beast';
    p.evolved = true;
    p.team = teamOf(s).length < TEAM_SIZE;
    p.penId = null; // beasts live on the 御獸艙 / in the contract, not in a display pen
    remember(s, p, '契闊進化：契約書的光流進牠身上的每一道突變。牠不再只是生物了。');
    tally(s, 'evolve');
    return { ok: true, chance, message: `${p.name} 契闊進化成御獸了！` };
  }
  p.bond = Math.max(0, p.bond - 10);
  return { ok: false, chance, error: `契闊失敗（${chance}%）。牠退開了，羈絆 -10。` };
}

// ---------- 0.25: contracts, the team, and letting go ----------
// A bound beast lives in its 御獸契約 (beast contract). You hold at most ten; six ride with you (the team) and only
// those can be called out. The story's ancient beast is bound by its own pact and does not count.
export const MAX_CONTRACTS = 10;
export const TEAM_SIZE = 6; // 0.36: up to six contract cards carried; the rest stay aboard
export const CONTRACTS_FULL = `御獸契約已經滿 ${MAX_CONTRACTS} 張了。先解約一隻，才能再締結新的契約。`;
export const ownedBeasts = s => (s.tamed || []).filter(p => p.kind !== 'creature' && !p.ancient);
export const contractsFull = s => ownedBeasts(s).length >= MAX_CONTRACTS;
// (嘯岳 rides on its own pact card — never in the six, even if an old save marked it as carried)
export const teamOf = s => (s.tamed || []).filter(p => p.kind !== 'creature' && p.team && !p.ancient);
// 0.36.5: the contract cards — 嘯岳's pact card (always carried, not one of the six) and then the team
export const cardsOf = s => [...(s.tamed || []).filter(p => p.ancient), ...teamOf(s)];
// Old saves: the first three beasts (the one out first) ride with you.
export function normalizeTeam(s) {
  const beasts = (s.tamed || []).filter(p => p.kind !== 'creature');
  for (const p of s.tamed || []) if (p.kind === 'creature') p.team = false;
  if (!beasts.some(p => p.team)) {
    const order = [...beasts].sort(
      (a, b) => (b.id === s.expedition?.activeId) - (a.id === s.expedition?.activeId) || (b.bond || 0) - (a.bond || 0)
    );
    order.slice(0, TEAM_SIZE).forEach(p => (p.team = true));
  }
  let n = 0;
  for (const p of beasts) if (p.team && ++n > TEAM_SIZE) p.team = false;
  return s;
}
export function toggleTeam(s, id) {
  const p = (s.tamed || []).find(t => t.id === id);
  if (!p) return { ok: false, error: '找不到這隻御獸。' };
  if (p.kind === 'creature') return { ok: false, error: '生物沒有契約，不能帶在身上。' };
  if (p.team) {
    if (s.expedition?.activeId === id) return { ok: false, error: '牠正在外面，先讓牠回來。' };
    p.team = false;
    return { ok: true, message: `${p.name} 的契約放回御獸艙。` };
  }
  if (teamOf(s).length >= TEAM_SIZE) return { ok: false, error: `身上最多帶 ${TEAM_SIZE} 張御獸契約。先放回一張。` };
  p.team = true;
  return { ok: true, message: `把 ${p.name} 的契約帶在身上。` };
}
const leave = (s, p) => {
  s.tamed = s.tamed.filter(t => t !== p);
  if (s.expedition?.activeId === p.id) {
    s.expedition.activeId = null;
    s.expedition.mounted = false;
    s.expedition.diving = false;
  }
  if (s.ship?.lounge) s.ship.lounge = s.ship.lounge.filter(id => id !== p.id);
};
const near = s => {
  const a = Math.random() * Math.PI * 2;
  return { x: s.player.x + Math.sin(a) * 4, z: s.player.z + Math.cos(a) * 4 };
};
// 放生: a creature goes back to the wild beside you, still a little fond of you.
export function releaseCreature(s, id, at = near(s)) {
  const p = (s.tamed || []).find(t => t.id === id);
  if (!p) return { ok: false, error: '找不到這隻生物。' };
  if (p.kind !== 'creature') return { ok: false, error: '御獸要解約，不能直接放生。' };
  leave(s, p);
  s.wild.push({
    id: p.id,
    x: at.x,
    z: at.z,
    homeX: at.x,
    homeZ: at.z,
    phase: Math.random() * 6,
    heading: 0,
    genome: p.genome,
    trust: 40,
    feeds: 0,
    hostile: false,
    released: true,
    ...(phenotype(p.genome).habitat === 'land' ? { land: true } : {})
  });
  return { ok: true, message: `${p.name} 回到了野外。` };
}
// 煮來吃: rations, scaled by size, and a little of what its family is made of.
export function cookCreature(s, id) {
  const p = (s.tamed || []).find(t => t.id === id);
  if (!p) return { ok: false, error: '找不到這隻生物。' };
  if (p.kind !== 'creature') return { ok: false, error: '御獸不能煮。' };
  const ph = phenotype(p.genome),
    food = 2 + Math.round(ph.size * 3),
    extra = { sea: 'fish', deep: 'fish', land: 'fat', flora: 'fruit' }[ph.family] || 'fish';
  leave(s, p);
  const got = { food, [extra]: 1 };
  give(s, got);
  return { ok: true, got, message: `${p.name} 煮成了一鍋。口糧 +${food}。` };
}
// 解約: the contract breaks and the beast turns on you — a frenzy of 60–80 s — then its body, no longer held together
// by the contract, rots and dissolves away.
export function dissolveContract(s, id, rng = Math.random, at = near(s)) {
  const p = (s.tamed || []).find(t => t.id === id);
  if (!p) return { ok: false, error: '找不到這隻御獸。' };
  if (p.kind === 'creature') return { ok: false, error: '生物沒有契約可以解。' };
  if (p.ancient) return { ok: false, error: '遠古的契約，不是你能解開的。' };
  const secs = Math.round(60 + rng() * 20);
  leave(s, p);
  s.wild.push({
    id: 'rel-' + p.id,
    x: at.x,
    z: at.z,
    homeX: at.x,
    homeZ: at.z,
    phase: 0,
    heading: 0,
    genome: p.genome,
    name: p.name,
    trust: 0,
    feeds: 0,
    hostile: true,
    released: true,
    formerBeast: true,
    frenzyUntil: s.elapsed + secs,
    dissolveAt: s.elapsed + secs,
    maxHp: 80 + (p.level || 1) * 12,
    hp: 80 + (p.level || 1) * 12,
    ...(phenotype(p.genome).habitat === 'land' ? { land: true } : {})
  });
  return { ok: true, seconds: secs, message: `${p.name} 的契約碎了。牠會狂暴 ${secs} 秒，之後潰爛溶解。` };
}
// Each frame: released beasts whose time is up start to dissolve, then vanish. Returns those that finished.
export function tickDissolve(s) {
  const gone = [];
  for (const w of s.wild || [])
    if (w.dissolveAt && s.elapsed >= w.dissolveAt && !w.dissolving) {
      w.dissolving = s.elapsed;
      w.hostile = false;
      w.frenzyUntil = 0;
    }
  s.wild = (s.wild || []).filter(w => {
    if (w.dissolving && s.elapsed - w.dissolving > 4) {
      gone.push(w);
      return false;
    }
    return true;
  });
  return gone;
}
