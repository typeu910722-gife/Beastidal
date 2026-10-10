// The protagonist's skills (0.23): six of them grow from what you actually do — every feeding, catch, harvest,
// fight, build and kilometre sailed. Ten levels each; each level is a small, lasting bonus. Experience comes in
// through the play tallies (stats.js), so nothing has to remember to award it.
export const SKILLS = {
  fishing: { name: '釣魚', icon: '🎣', perk: '上鉤更快、好魚更多', per: '稀有漁獲 +3% / 級' },
  gathering: { name: '採集', icon: '🌿', perk: '採集點產量增加', per: '每 3 級採集 +1' },
  sailing: { name: '航海', icon: '⛵', perk: '船速提升', per: '船速 +2% / 級' },
  taming: { name: '馴獸', icon: '🐾', perk: '投餌信任上升更多', per: '信任 +1% / 級' },
  combat: { name: '戰鬥', icon: '⚔', perk: '夥伴傷害增加', per: '傷害 +1 / 級' },
  building: { name: '建造', icon: '🔨', perk: '開墾與陸地建造更快', per: '開墾 −4% 時間 / 級' }
};
export const SKILL_IDS = Object.keys(SKILLS);
export const MAX_LEVEL = 10;
// xp needed to reach each level (index = level); level 1 at 0
export const THRESHOLDS = [0, 0, 20, 50, 100, 170, 260, 380, 530, 720, 950];
// what each tally key teaches
export const XP = {
  feed: ['taming', 3],
  tame: ['taming', 15],
  cage: ['taming', 10],
  evolve: ['taming', 20],
  fish: ['fishing', 6],
  bigfish: ['fishing', 12],
  harvest: ['gathering', 4],
  kill: ['combat', 8],
  beastkill: ['combat', 20],
  strike: ['combat', 1],
  build: ['building', 10],
  clear: ['building', 12],
  landbuild: ['building', 15],
  sail: ['sailing', 1], // per 50 m
  event: ['sailing', 10]
};
export function normalizeSkills(s) {
  s.skills ??= {};
  for (const k of SKILL_IDS) s.skills[k] ??= 0;
  return s;
}
export const skillXp = (s, k) => s.skills?.[k] || 0;
export function skillLevel(s, k) {
  const xp = skillXp(s, k);
  let lv = 1;
  while (lv < MAX_LEVEL && xp >= THRESHOLDS[lv + 1]) lv++;
  return lv;
}
// Returns the new level when one was reached, else 0.
export function gainSkill(s, k, xp) {
  normalizeSkills(s);
  if (!SKILLS[k] || !(xp > 0)) return 0;
  const before = skillLevel(s, k);
  s.skills[k] = Math.min(THRESHOLDS[MAX_LEVEL], s.skills[k] + xp);
  const after = skillLevel(s, k);
  if (after > before) {
    s.skillUps ??= [];
    s.skillUps.push({ k, level: after });
    return after;
  }
  return 0;
}
// Called by tally(): map a play tally to experience.
export function learnFrom(s, key, n = 1) {
  const x = XP[key];
  if (!x) return 0;
  return gainSkill(s, x[0], x[1] * n);
}
export function skillRows(s) {
  return SKILL_IDS.map(k => {
    const lv = skillLevel(s, k),
      xp = skillXp(s, k),
      next = lv < MAX_LEVEL ? THRESHOLDS[lv + 1] : xp,
      prev = THRESHOLDS[lv];
    return {
      id: k,
      ...SKILLS[k],
      level: lv,
      xp,
      next,
      progress: lv < MAX_LEVEL ? (xp - prev) / Math.max(1, next - prev) : 1
    };
  });
}
// the bonuses
export const gatherBonus = s => Math.floor(skillLevel(s, 'gathering') / 3);
export const sailBonus = s => 1 + (skillLevel(s, 'sailing') - 1) * 0.02;
export const trustBonus = s => skillLevel(s, 'taming') - 1;
export const damageBonus = s => skillLevel(s, 'combat') - 1;
export const buildSpeed = s => 1 - (skillLevel(s, 'building') - 1) * 0.04;
export const fishBonus = s => (skillLevel(s, 'fishing') - 1) * 0.03;
