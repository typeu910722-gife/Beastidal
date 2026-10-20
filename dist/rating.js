// 據點評價 (0.23): one score for how far your home has come — the raft and its facilities, the warship and its
// furniture, the islands claimed and built up, the beasts and their bonds, the codex. Five tiers, each reached
// once, each paying out and giving the base a new name.
import { countLandBuilds, countCleared } from './reclaim.js?v=0.69.0';
import { codexProgress } from './codex.js?v=0.69.0';
import { give } from './bag.js?v=0.69.0';

export const TIERS = [
  { id: 0, name: '漂流木筏', at: 0 },
  { id: 1, name: '小營地', at: 40, give: { food: 10, water: 10 } },
  { id: 2, name: '湖上據點', at: 120, give: { crystal: 8, contract: 1 } },
  { id: 3, name: '比斯泰德港', at: 260, give: { crystal: 15, contract: 2, metal: 20 } },
  { id: 4, name: '湖之王都', at: 480, give: { crystal: 30, contract: 3 } }
];
export function ratingParts(s) {
  const c = codexProgress(s),
    beasts = (s.tamed || []).filter(p => p.kind !== 'creature'),
    bonds = beasts.reduce((a, p) => a + (p.bond || 0), 0) / 100;
  return [
    { name: '設施', value: (s.buildings || []).filter(b => !b.stowed).length * 3 },
    { name: '戰艦', value: s.ship ? 30 : 0 },
    { name: '船艙擺設', value: (s.ship?.cabin?.items?.length || 0) * 2 },
    { name: '領地', value: (s.occupied || []).length * 15 },
    { name: '開墾與陸地建築', value: countCleared(s) * 4 + countLandBuilds(s) * 8 },
    { name: '御獸', value: beasts.length * 4 + Math.round(bonds * 3) },
    { name: '生物', value: (s.tamed || []).filter(p => p.kind === 'creature').length * 2 },
    { name: '圖鑑', value: c.seen + c.tamed * 2 + Object.keys(s.codex?.genes || {}).length }
  ];
}
export const ratingScore = s => ratingParts(s).reduce((a, p) => a + p.value, 0);
export function ratingTier(s) {
  const score = ratingScore(s);
  let t = TIERS[0];
  for (const tier of TIERS) if (score >= tier.at) t = tier;
  return t;
}
export const ratingStars = s => '★'.repeat(ratingTier(s).id + 1) + '☆'.repeat(4 - ratingTier(s).id);
// Called every so often: pays out any tier newly reached. Returns the tiers reached.
export function tickRating(s) {
  s.ratingTier ??= 0;
  const now = ratingTier(s),
    out = [];
  while (s.ratingTier < now.id) {
    s.ratingTier++;
    const t = TIERS[s.ratingTier];
    for (const [k, v] of Object.entries(t.give || {})) {
      if (k === 'contract') s.contracts = (s.contracts || 0) + v;
      else give(s, { [k]: v }); // 0.36: past the bag's room it goes home to storage
    }
    out.push(t);
  }
  return out;
}
export function nextTier(s) {
  return TIERS.find(t => t.at > ratingScore(s)) || null;
}
