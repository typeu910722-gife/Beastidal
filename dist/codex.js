// Creature codex: every species the player has seen up close, tamed or bred, with a sample genome for the portrait.
import { phenotype, allSpecies, FAMILY_NAMES } from './genetics.js?v=0.12.1';
import { dayOf } from './clock.js?v=0.12.1';

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
