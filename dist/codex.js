// Creature codex: every species the player has seen up close, tamed or bred, with a sample genome for the portrait.
import { phenotype, allSpecies, FAMILY_NAMES } from './genetics.js?v=0.36.5';
import { dayOf } from './clock.js?v=0.36.5';

import { LORE, habitatsOf } from './species.js?v=0.36.5';
import { BS_GENES, BS_IDS } from './bsgenes.js?v=0.36.5';
import { WILD_BEASTS, BEAST_IDS } from './beasts.js?v=0.36.5';
import { give } from './bag.js?v=0.36.5';
export { LORE };

export function normalizeCodex(s) {
  s.codex ??= {};
  s.codex.seen ??= {};
  s.codex.tamed ??= {};
  s.codex.genes ??= {};
  s.codex.beasts ??= {};
  // 0.21: species ids gained a strain; old entries were the first strain of their form
  for (const book of [s.codex.seen, s.codex.tamed])
    for (const k of Object.keys(book))
      if (/^(sea|deep|land|flora)-\d$/.test(k)) {
        book[k + '-0'] ??= book[k];
        delete book[k];
      }
  return s.codex;
}
// Record a creature: kind = 'seen' | 'tamed'. Returns true when this is a new codex entry.
export function recordCreature(s, genome, kind = 'seen') {
  const c = normalizeCodex(s),
    p = phenotype(genome),
    d = dayOf(s);
  let fresh = false;
  if (!c.seen[p.species]) {
    c.seen[p.species] = { day: d, count: 0, genome: JSON.parse(JSON.stringify(genome)) };
    fresh = true;
  }
  c.seen[p.species].count++;
  if (kind === 'tamed' && !c.tamed[p.species]) {
    c.tamed[p.species] = { day: d };
    fresh = true;
  }
  return fresh;
}
// Keep the codex in step with owned creatures (old saves, hatchlings, imports).
export function syncOwned(s) {
  const fresh = [];
  for (const p of s.tamed || []) {
    const sp = phenotype(p.genome).species;
    if (!normalizeCodex(s).tamed[sp] && recordCreature(s, p.genome, 'tamed')) fresh.push(sp);
  }
  return fresh;
}
export function codexProgress(s) {
  const c = s.codex || {};
  return {
    seen: Object.keys(c.seen || {}).length,
    tamed: Object.keys(c.tamed || {}).length,
    total: allSpecies().length
  };
}
export function codexEntries(s) {
  const c = normalizeCodex(s);
  return allSpecies().map(sp => ({
    ...sp,
    familyName: FAMILY_NAMES[sp.family],
    seen: c.seen[sp.id] || null,
    tamed: c.tamed[sp.id] || null,
    lore: LORE[sp.id],
    rare: sp.strain === 3,
    habitats: habitatsOf(sp.id)
  }));
}

// ---------- 比斯基因 and wild 御獸 (0.22) ----------
export function recordGene(s, id) {
  const c = normalizeCodex(s);
  if (!BS_GENES[id] || c.genes[id]) return false;
  c.genes[id] = { day: dayOf(s) };
  return true;
}
export function recordBeast(s, id) {
  const c = normalizeCodex(s);
  if (!WILD_BEASTS[id]) return false;
  const fresh = !c.beasts[id];
  c.beasts[id] ??= { day: dayOf(s), count: 0 };
  c.beasts[id].count++;
  return fresh;
}
export const geneEntries = s => BS_IDS.map(id => ({ id, ...BS_GENES[id], seen: normalizeCodex(s).genes[id] || null }));
export const beastEntries = s =>
  BEAST_IDS.map(id => ({ id, ...WILD_BEASTS[id], seen: normalizeCodex(s).beasts[id] || null }));
// ---------- collection rewards (0.18) ----------
// Seeing and taming species pays off: supplies at first, then a title and a lasting perk per completed family.
// a family counts as mastered once eight of its sixteen species are tamed
const familyDone = (s, fam) => allSpecies().filter(x => x.family === fam && s.codex?.tamed?.[x.id]).length >= 8;
export const CODEX_REWARDS = [
  { id: 'seen4', name: '初見', need: '見過 6 種生物', check: s => codexProgress(s).seen >= 6, give: { bait: 10 } },
  {
    id: 'seen8',
    name: '觀察者',
    need: '見過 16 種生物',
    check: s => codexProgress(s).seen >= 16,
    give: { contract: 2 }
  },
  {
    id: 'seen12',
    name: '湖的筆記',
    need: '見過 32 種生物',
    check: s => codexProgress(s).seen >= 32,
    give: { crystal: 10 }
  },
  {
    id: 'sea',
    name: '淺海之友',
    need: '馴化 8 種淺海種',
    perk: '投餌時信任多 +5%',
    check: s => familyDone(s, 'sea'),
    give: { crystal: 6 }
  },
  {
    id: 'deep',
    name: '深淵潛行者',
    need: '馴化 8 種深淵種',
    perk: '潛水氧氣上限 +30 秒',
    check: s => familyDone(s, 'deep'),
    give: { metal: 12 }
  },
  {
    id: 'land',
    name: '島嶼牧者',
    need: '馴化 8 種陸棲種',
    perk: '島上採集量 +1',
    check: s => familyDone(s, 'land'),
    give: { wood: 20 }
  },
  {
    id: 'flora',
    name: '綠潮守護者',
    need: '馴化 8 種植生突變',
    perk: '御獸工作產量 +20%',
    check: s => familyDone(s, 'flora'),
    give: { fiber: 20 }
  },
  {
    id: 'all',
    name: '湖的記錄者',
    need: '見過全部 64 種生物',
    check: s => codexProgress(s).seen >= codexProgress(s).total,
    give: { crystal: 20, contract: 3 }
  }
];
export function codexRewards(s) {
  const c = normalizeCodex(s);
  c.claimed ??= [];
  return CODEX_REWARDS.map(r => ({ ...r, done: !!r.check(s), claimed: c.claimed.includes(r.id) }));
}
// Claim one: the items go to the bag (contract scrolls to the scroll count). Perks apply from then on.
export function claimCodex(s, id) {
  const c = normalizeCodex(s),
    r = CODEX_REWARDS.find(x => x.id === id);
  c.claimed ??= [];
  if (!r) return { ok: false, error: '沒有這項收集獎勵。' };
  if (c.claimed.includes(id)) return { ok: false, error: '已經領過了。' };
  if (!r.check(s)) return { ok: false, error: `還沒達成：${r.need}。` };
  c.claimed.push(id);
  for (const [k, v] of Object.entries(r.give)) {
    if (k === 'contract') s.contracts = (s.contracts || 0) + v;
    else give(s, { [k]: v }); // 0.36: what the bag cannot hold goes home to storage
  }
  return { ok: true, message: `獲得稱號「${r.name}」${r.perk ? '：' + r.perk : ''}。`, reward: r };
}
export const hasPerk = (s, id) => !!s.codex?.claimed?.includes(id) && CODEX_REWARDS.some(r => r.id === id && r.perk);
export const titles = s => CODEX_REWARDS.filter(r => s.codex?.claimed?.includes(r.id)).map(r => r.name);
