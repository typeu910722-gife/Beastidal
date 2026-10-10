// Creature codex: every species the player has seen up close, tamed or bred, with a sample genome for the portrait.
import { phenotype, allSpecies, FAMILY_NAMES } from './genetics.js?v=0.18.0';
import { dayOf } from './clock.js?v=0.18.0';

export const LORE = {
  'sea-0': '骨質鰭條像刀刃一樣立在背上。成群出現時，會用鰭刃切開浪頭，替後面的同伴減少阻力。',
  'sea-1': '展翼時寬度可達三公尺。翼尖的裂口能分開水流，讓牠在浪下幾乎不發出聲音地滑行。',
  'sea-2': '傘緣的光點其實是眼睛。夜裡牠們會浮上海面，用整片傘蓋接收星光。',
  'sea-3': '甲殼上的異晶會吸收月光，再在黎明時慢慢釋放。漂流者常把牠當作夜裡的燈塔。',
  'deep-0': '只在離岸很遠的深水出沒。轉身時整條身體像一道暗色的浪，鬚鬚能感覺到幾公尺外的心跳。',
  'deep-1': '十條腕足各自有獨立的神經。牠能一邊觀察你，一邊用其中兩條腕把漂流物偷偷拖走。',
  'deep-2': '鉗子能夾碎廢金屬。殼上的棘刺越多，代表牠在深海越老、越不好惹。',
  'deep-3': '螺殼的每一圈都是一年的紀錄。牠會調整殼內的氣體，在不同深度之間緩慢升降。',
  'land-0': '海底隆起後第一批爬上礁島的生物。頸部的皮褶張開時，代表牠正在曬太陽，而不是生氣。',
  'land-1': '角尖凝結的異晶在夜裡會發光。據說只要跟著牠走，就能找到島上的淡水。',
  'land-2': '在風暴來臨前會成群飛向陸地。看到牠們往島上飛，最好也跟著上岸。',
  'land-3': '甲片之間長滿苔蘚。受驚時會縮成一顆布滿青苔的球，看起來就像一塊石頭。',
  'flora-0': '異晶讓海藻在牠的鰭上生根。牠游過的地方，常會留下一串會發芽的種子。',
  'flora-1': '翼面的紋路和葉脈一模一樣，白天會浮在水面上曬太陽，像一片巨大的葉子。',
  'flora-2': '傘頂開著會發光的花。花粉落進海裡，能讓周圍的水母一起亮起來。',
  'flora-3': '背上長出了一整片小森林。年紀越大，樹就越高；據說最老的一隻背著一座島。'
};

export function normalizeCodex(s) {
  s.codex ??= {};
  s.codex.seen ??= {};
  s.codex.tamed ??= {};
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
    lore: LORE[sp.id]
  }));
}

// ---------- collection rewards (0.18) ----------
// Seeing and taming species pays off: supplies at first, then a title and a lasting perk per completed family.
const familyDone = (s, fam) =>
  allSpecies()
    .filter(x => x.family === fam)
    .every(x => s.codex?.tamed?.[x.id]);
export const CODEX_REWARDS = [
  { id: 'seen4', name: '初見', need: '見過 4 種生物', check: s => codexProgress(s).seen >= 4, give: { bait: 10 } },
  { id: 'seen8', name: '觀察者', need: '見過 8 種生物', check: s => codexProgress(s).seen >= 8, give: { contract: 2 } },
  {
    id: 'seen12',
    name: '湖的筆記',
    need: '見過 12 種生物',
    check: s => codexProgress(s).seen >= 12,
    give: { crystal: 10 }
  },
  {
    id: 'sea',
    name: '淺海之友',
    need: '馴化全部淺海種',
    perk: '投餌時信任多 +5%',
    check: s => familyDone(s, 'sea'),
    give: { crystal: 6 }
  },
  {
    id: 'deep',
    name: '深淵潛行者',
    need: '馴化全部深淵種',
    perk: '潛水氧氣上限 +30 秒',
    check: s => familyDone(s, 'deep'),
    give: { metal: 12 }
  },
  {
    id: 'land',
    name: '島嶼牧者',
    need: '馴化全部陸棲種',
    perk: '島上採集量 +1',
    check: s => familyDone(s, 'land'),
    give: { wood: 20 }
  },
  {
    id: 'flora',
    name: '綠潮守護者',
    need: '馴化全部植生突變',
    perk: '御獸工作產量 +20%',
    check: s => familyDone(s, 'flora'),
    give: { fiber: 20 }
  },
  {
    id: 'all',
    name: '湖的記錄者',
    need: '見過全部 16 種生物',
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
    else s.resources[k] = (s.resources[k] || 0) + v;
  }
  return { ok: true, message: `獲得稱號「${r.name}」${r.perk ? '：' + r.perk : ''}。`, reward: r };
}
export const hasPerk = (s, id) => !!s.codex?.claimed?.includes(id) && CODEX_REWARDS.some(r => r.id === id && r.perk);
export const titles = s => CODEX_REWARDS.filter(r => s.codex?.claimed?.includes(r.id)).map(r => r.name);
