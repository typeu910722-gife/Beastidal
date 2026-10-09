// Taming, 0.12: feed the same wild beast again and again (each feeding costs more bait: 1, 3, 5, 7 …). Its trust
// climbs to 100 % after 6 feedings for common beasts and up to 10 for the rarest. At 100 % it follows you; then a
// contract at the raft's work table binds it (success chance = trust %). Forcing a contract below 60 % trust can
// send the beast into a frenzy: 1.2× speed and attack, chasing you for 6–17 seconds.
import { phenotype, geneName } from './genetics.js?v=0.11.0';
import { freePen, normalizeHousing } from './housing.js?v=0.11.0';

export const RARITY = ['常見', '少見', '稀有', '罕見', '傳說'];
export const FRENZY = { power: 1.2, min: 6, max: 17, below: 60 };

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
  for (const w of s.wild || []) {
    w.trust ??= 0;
    if (w.feeds === undefined) w.feeds = Math.round((w.trust / 100) * feedsNeeded(w.genome));
    if (w.trust >= 100) w.follow = true;
  }
  return s;
}

export function feed(s, id) {
  if (!s.secret) return { ok: false, error: '你還不知道如何接近牠。試著調查研究浮標。' };
  const w = s.wild.find(w => w.id === id);
  if (!w) return { ok: false, error: '生物已離開。' };
  if (Math.hypot(w.x - s.player.x, w.z - s.player.z) > 11) return { ok: false, error: '請靠近生物身旁，再投餌。' };
  if (frenzied(w, s.elapsed)) return { ok: false, error: '牠正在狂暴，先拉開距離！' };
  if (w.follow) return { ok: false, error: '牠已經完全信任你了。帶牠回木筏的工作桌締結契約。' };
  normalizeTaming(s);
  const cost = baitCost(w);
  if ((s.resources.bait || 0) < cost)
    return { ok: false, error: `第 ${w.feeds + 1} 次投餌需要 ${cost} 份誘餌（目前 ${s.resources.bait || 0} 份）。` };
  s.resources.bait -= cost;
  w.feeds++;
  w.lastFeed = s.elapsed;
  const need = feedsNeeded(w.genome);
  w.trust = Math.min(100, Math.round((w.feeds / need) * 100));
  if (w.trust >= 100) {
    w.follow = true;
    return { ok: true, trust: 100, follow: true };
  }
  return { ok: true, trust: w.trust, next: baitCost(w), left: need - w.feeds };
}

// Who can be bound at a work table: beasts following you, and any beast with some trust close to the table.
export function contractCandidates(s, table) {
  return s.wild
    .filter(w => w.trust > 0 && !frenzied(w, s.elapsed))
    .filter(w => w.follow || Math.hypot(w.x - table.x * 3.6, w.z - table.z * 3.6) < 22)
    .sort((a, b) => b.trust - a.trust);
}

export function contract(s, id, table, rng = Math.random) {
  normalizeHousing(s);
  if (!table) return { ok: false, error: '需要木筏上的工作桌。' };
  if (s.player.mode !== 'foot' || Math.hypot(s.player.x - table.x * 3.6, s.player.z - table.z * 3.6) > 5.5)
    return { ok: false, error: '請站在工作桌旁。' };
  if (!s.buildings.some(b => b.type === 'pen')) return { ok: false, error: '先建造海洋展示池，給牠一個家。' };
  if (!freePen(s)) return { ok: false, error: '展示池已滿，請增建展示池。' };
  const w = s.wild.find(w => w.id === id);
  if (!w || !contractCandidates(s, table).includes(w)) return { ok: false, error: '牠不在工作桌附近。' };
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
    s.tamed.push(pet);
    s.wild = s.wild.filter(c => c !== w);
    return { ok: true, tamed: pet, chance };
  }
  const need = feedsNeeded(w.genome);
  w.follow = false;
  if (chance < FRENZY.below) {
    const secs = Math.round(FRENZY.min + rng() * (FRENZY.max - FRENZY.min));
    w.frenzyUntil = s.elapsed + secs;
    w.trust = Math.max(0, chance - 30);
    w.feeds = Math.round((w.trust / 100) * need);
    return { ok: false, frenzy: true, seconds: secs, chance, error: '契約失敗！牠陷入狂暴，正朝你衝過來！' };
  }
  w.trust = Math.max(0, chance - 15);
  w.feeds = Math.round((w.trust / 100) * need);
  return { ok: false, chance, error: `契約失敗，牠退縮了。信任度降到 ${w.trust}%。` };
}
