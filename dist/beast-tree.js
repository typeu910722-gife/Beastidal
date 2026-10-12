// 御獸 skill trees and personalities (0.29).
//
// Skill tree: every level a beast gains gives it a skill point (level 10 → 9 points). Points go into three
// branches, each learned in order:
//   牙 Fang — harder hits, crits, a fourth combo strike, breaking a foe's guard
//   甲 Hide — less damage taken, a sharper counter when hardened, mending in a fight, a longer dodge for its rider
//   靈 Gift — faster skill cooldowns, stronger skills, cheaper stamina, and a third skill from its genes
// Respeccing costs crystal at the contract desk.
//
// Personality: each beast is born with one, read from its genome so it never changes. It nudges how it fights and
// lives with you (and what it says on the card): brave, cautious, curious, lazy, loyal, hot-tempered, gentle,
// greedy.
import { seeded, dnaCode } from './genetics.js?v=0.40.0';

export const TREE = {
  fang: {
    name: '牙',
    full: '牙之道',
    icon: '🦷',
    nodes: [
      { name: '銳牙', desc: '攻擊力 +8%', atk: 0.08 },
      { name: '要害', desc: '爆擊率 +8%', crit: 0.08 },
      { name: '破甲', desc: '重擊與第三段必定打斷敵人蓄力，傷害 +10%', atk: 0.1, breaker: true },
      { name: '狂襲', desc: '連段多一擊（第四段），攻擊力 +10%', atk: 0.1, combo4: true },
      { name: '獸王之牙', desc: '對破綻中的敵人傷害 ×2（原為 ×1.5）', cost: 2, openMul: 2 }
    ]
  },
  hide: {
    name: '甲',
    full: '甲之道',
    icon: '🛡',
    nodes: [
      { name: '厚皮', desc: '受到的傷害 -8%', guard: 0.08 },
      { name: '反鱗', desc: '硬化時反擊傷害 ×2', counter: 2 },
      { name: '韌性', desc: '受到的傷害 -10%，被擊倒時保留 1 點體力一次', guard: 0.1, lastStand: true },
      { name: '戰鬥癒合', desc: '戰鬥中每秒恢復 1 點體力', regen: 1 },
      { name: '不動之甲', desc: '騎乘時閃避的無敵時間 ×1.6，受到的傷害再 -10%', cost: 2, guard: 0.1, iframes: 1.6 }
    ]
  },
  gift: {
    name: '靈',
    full: '靈之道',
    icon: '✦',
    nodes: [
      { name: '共鳴', desc: '技能冷卻 -12%', cd: 0.12 },
      { name: '節息', desc: '攻擊與技能的耐力消耗 -20%', sta: 0.2 },
      { name: '覺醒', desc: '解鎖第三個技能（按 3），來自牠的基因', third: true },
      { name: '靈壓', desc: '技能威力 +20%，冷卻再 -10%', skill: 0.2, cd: 0.1 },
      { name: '萬象', desc: '技能冷卻再 -15%，每次施放回復 6 耐力', cost: 2, cd: 0.15, refund: 6 }
    ]
  }
};
export const BRANCHES = Object.keys(TREE);
export const RESPEC_COST = { crystal: 6 };

export function normalizeTree(p) {
  p.tree ??= { fang: 0, hide: 0, gift: 0 };
  for (const b of BRANCHES) p.tree[b] = Math.max(0, Math.min(TREE[b].nodes.length, p.tree[b] | 0));
  return p;
}
const spentOn = p =>
  BRANCHES.reduce((sum, b) => sum + TREE[b].nodes.slice(0, p.tree[b]).reduce((t, n) => t + (n.cost || 1), 0), 0);
export function treePoints(p) {
  normalizeTree(p);
  return Math.max(0, (p.level || 1) - 1 - spentOn(p));
}
export function learn(p, branch) {
  if (!p || p.kind === 'creature') return { ok: false, error: '生物沒有技能樹。' };
  normalizeTree(p);
  const nodes = TREE[branch]?.nodes;
  if (!nodes) return { ok: false, error: '沒有這條路。' };
  const i = p.tree[branch];
  if (i >= nodes.length) return { ok: false, error: '這條路已經走到底了。' };
  const cost = nodes[i].cost || 1;
  if (treePoints(p) < cost) return { ok: false, error: `需要 ${cost} 點技能點。升級可以獲得技能點。` };
  p.tree[branch]++;
  return { ok: true, node: nodes[i], message: `${p.name} 學會了「${nodes[i].name}」：${nodes[i].desc}` };
}
export function respec(p) {
  normalizeTree(p);
  if (!spentOn(p)) return { ok: false, error: '還沒有學任何技能。' };
  p.tree = { fang: 0, hide: 0, gift: 0 };
  return { ok: true, message: `${p.name} 的技能點全部歸還了。` };
}
// Everything the learned nodes add up to (and the personality's nudge), for combat.js.
export function perks(p) {
  const out = {
    atk: 0,
    crit: 0,
    guard: 0,
    counter: 1,
    regen: 0,
    iframes: 1,
    cd: 0,
    sta: 0,
    skill: 0,
    refund: 0,
    openMul: 1.5
  };
  if (!p) return out;
  normalizeTree(p);
  for (const b of BRANCHES)
    for (const n of TREE[b].nodes.slice(0, p.tree[b])) {
      for (const k of ['atk', 'crit', 'guard', 'regen', 'cd', 'sta', 'skill', 'refund']) if (n[k]) out[k] += n[k];
      if (n.counter) out.counter = n.counter;
      if (n.iframes) out.iframes = n.iframes;
      if (n.openMul) out.openMul = n.openMul;
      if (n.breaker) out.breaker = true;
      if (n.combo4) out.combo4 = true;
      if (n.lastStand) out.lastStand = true;
      if (n.third) out.third = true;
    }
  const t = PERSONALITY[personalityOf(p)]?.mods || {};
  for (const [k, v] of Object.entries(t)) out[k] = (out[k] || 0) + v;
  out.cd = Math.min(0.6, out.cd);
  out.guard = Math.min(0.6, out.guard);
  return out;
}

/* ---------------------------------------------------------------- personality */
export const PERSONALITY = {
  brave: {
    name: '勇猛',
    icon: '🔥',
    desc: '總是衝在最前面。攻擊力 +6%，但比較少閃開。',
    mods: { atk: 0.06, guard: -0.04 },
    lines: ['{n} 對著遠方低吼，好像在找架打。', '{n} 把胸膛挺得高高的。']
  },
  cautious: {
    name: '謹慎',
    icon: '🌙',
    desc: '先看清楚再出手。受到的傷害 -8%。',
    mods: { guard: 0.08 },
    lines: ['{n} 豎著耳朵，盯著水面的動靜。', '{n} 繞著你走了一圈，確認四周安全。']
  },
  curious: {
    name: '好奇',
    icon: '🔍',
    desc: '什麼都想聞一聞。跟著你時偶爾叼回漂流物。',
    mods: {},
    finds: true,
    lines: ['{n} 把鼻子湊到一塊浮木上嗅來嗅去。', '{n} 好像發現了什麼，回頭看你。']
  },
  lazy: {
    name: '慵懶',
    icon: '💤',
    desc: '能躺就不站。休息時耐力恢復 ×1.5，戰鬥技能冷卻 +8%。',
    mods: { cd: -0.08 },
    restMul: 1.5,
    lines: ['{n} 打了一個好長的哈欠。', '{n} 趴下來，尾巴懶洋洋地拍著水。']
  },
  loyal: {
    name: '忠誠',
    icon: '🤝',
    desc: '寸步不離。羈絆成長 ×1.5，會替你吸引敵人的注意。',
    mods: { guard: 0.04 },
    bondMul: 1.5,
    taunt: true,
    lines: ['{n} 緊緊跟在你身邊。', '{n} 把頭靠過來蹭了蹭你。']
  },
  fierce: {
    name: '暴躁',
    icon: '⚡',
    desc: '一點就燃。爆擊率 +8%，技能冷卻 -6%。',
    mods: { crit: 0.08, cd: 0.06 },
    lines: ['{n} 不耐煩地甩著尾巴。', '{n} 對一隻路過的魚齜牙咧嘴。']
  },
  gentle: {
    name: '溫柔',
    icon: '🌸',
    desc: '捨不得你受傷。戰鬥中偶爾為你恢復一點體力。',
    mods: {},
    mends: true,
    lines: ['{n} 輕輕碰了碰你的手。', '{n} 安靜地看著夕陽。']
  },
  greedy: {
    name: '貪吃',
    icon: '🍖',
    desc: '永遠吃不飽。餵食時羈絆 ×2，擊倒敵人時常多掉一點東西。',
    mods: {},
    feedMul: 2,
    loot: true,
    lines: ['{n} 盯著你的背包，口水都流下來了。', '{n} 肚子咕嚕咕嚕地叫。']
  }
};
export const PERSONALITY_IDS = Object.keys(PERSONALITY);
export function personalityOf(p) {
  if (!p) return null;
  if (!PERSONALITY[p.personality]) {
    const r = seeded(parseInt(dnaCode(p.genome), 16) ^ 0x5bd1e995);
    p.personality = PERSONALITY_IDS[Math.floor(r() * PERSONALITY_IDS.length)];
  }
  return p.personality;
}
export const personality = p => PERSONALITY[personalityOf(p)];
export function personalityLine(p) {
  const t = personality(p);
  if (!t) return '';
  return t.lines[Math.floor(Math.random() * t.lines.length)].replace('{n}', p.name);
}

// Each frame while a partner is out with you (not in a fight): now and then it says something in character, and a
// curious one sometimes brings back something it found. Returns { line, find } or null.
const FINDS = [{ wood: 2 }, { fiber: 2 }, { bait: 3 }, { metal: 1 }, { crystal: 1 }];
export function tickPersona(s, dt, rng = Math.random) {
  const p = (s.tamed || []).find(t => t.id === s.expedition?.activeId);
  if (!p || s.combat?.engaged || s.inCave) return null;
  const st = (s.persona ??= { talk: s.elapsed + 90, find: s.elapsed + 120 });
  if (s.elapsed >= st.find && personality(p)?.finds && !s.expedition.mounted) {
    st.find = s.elapsed + 100 + rng() * 80;
    if (rng() < 0.7) return { find: FINDS[Math.floor(rng() * FINDS.length)], name: p.name };
  }
  if (s.elapsed >= st.talk) {
    st.talk = s.elapsed + 140 + rng() * 120;
    return { line: personalityLine(p) };
  }
  return null;
}
