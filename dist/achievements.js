// Achievements (per save). `steam` ids are the API names to register in Steamworks; the native shell can unlock
// them through window.BeastidalNative.steam.unlock(id). Checks read only save state, so they are safe to re-run.
import { phenotype } from './genetics.js?v=0.15.0';
import { codexProgress } from './codex.js?v=0.15.0';
import { dayOf } from './clock.js?v=0.15.0';

const n = (s, t) => (s.buildings || []).filter(b => b.type === t).length;
const day = s => dayOf(s);
const tamedWith = (s, f) => (s.tamed || []).some(p => f(phenotype(p.genome), p));

export const ACHIEVEMENTS = [
  // survival
  { id: 'first_salvage', icon: '🪵', name: '第一份補給', desc: '打撈第一件漂流物資。', check: s => s.salvaged >= 1 },
  { id: 'salvage_50', icon: '⚓', name: '海上拾荒者', desc: '累計打撈 50 件漂流物資。', check: s => s.salvaged >= 50 },
  { id: 'raft_expand', icon: '🧱', name: '小小的家', desc: '把木筏擴建 2 格。', check: s => s.expanded >= 2 },
  { id: 'shelter', icon: '⛺', name: '遮風避雨', desc: '蓋好帆布避難所。', check: s => n(s, 'shelter') > 0 },
  { id: 'collector', icon: '💧', name: '一滴不剩', desc: '蓋好集水蒸餾器。', check: s => n(s, 'collector') > 0 },
  { id: 'beacon', icon: '📡', name: '點亮航標', desc: '完成第一章：點亮遠洋訊號塔。', check: s => !!s.completed },
  { id: 'floors_20', icon: '🏝️', name: '海上聚落', desc: '浮動地基擴建到 20 格。', check: s => n(s, 'floor') >= 20 },
  {
    id: 'storm',
    icon: '⛈️',
    name: '風暴裡的船',
    desc: '在海上撐過一整場暴風。',
    check: s => (s.stats?.stormsAtSea || 0) >= 1
  },
  { id: 'day_10', icon: '🌅', name: '第十個日出', desc: '在這片海活到第 10 天。', check: s => day(s) >= 10 },
  {
    id: 'unscathed',
    icon: '🛡️',
    name: '毫髮無傷',
    desc: '活到第 5 天且從未昏迷。',
    hidden: true,
    check: s => day(s) >= 5 && !(s.stats?.collapses > 0)
  },
  { id: 'paddle', icon: '🌊', name: '拍水達人', desc: '用船槳驅離 30 次。', check: s => (s.stats?.repels || 0) >= 30 },
  // beasts
  { id: 'buoy', icon: '🧬', name: '共生計畫', desc: '調查研究浮標，得知共生的秘密。', check: s => !!s.buoyFound },
  {
    id: 'first_tame',
    icon: '🤝',
    name: '第一個夥伴',
    desc: '馴化第一隻御獸。',
    check: s => (s.tamed || []).length >= 1
  },
  { id: 'tame_6', icon: '🐾', name: '御獸師', desc: '同時擁有 6 隻御獸。', check: s => (s.tamed || []).length >= 6 },
  {
    id: 'land_friend',
    icon: '🦎',
    name: '陸上的朋友',
    desc: '馴化一隻陸棲御獸。',
    check: s => tamedWith(s, p => p.family === 'land')
  },
  {
    id: 'deep_friend',
    icon: '🐙',
    name: '深淵來客',
    desc: '馴化一隻深淵種御獸。',
    check: s => tamedWith(s, p => p.family === 'deep')
  },
  {
    id: 'flora_friend',
    icon: '🌸',
    name: '會開花的牠',
    desc: '擁有一隻植生突變御獸。',
    check: s => tamedWith(s, p => p.flora >= 1)
  },
  {
    id: 'hybrid',
    icon: '🥚',
    name: '混血新生',
    desc: '孵化第一隻雜交後代。',
    check: s => tamedWith(s, (p, b) => b.generation >= 1)
  },
  {
    id: 'generation_3',
    icon: '🌳',
    name: '血脈延續',
    desc: '培育出第 3 代御獸。',
    check: s => tamedWith(s, (p, b) => b.generation >= 3)
  },
  {
    id: 'cross_family',
    icon: '🔀',
    name: '跨越族群',
    desc: '培育出兩種不同族群混血的御獸。',
    check: s => tamedWith(s, p => p.family !== p.secondFamily)
  },
  {
    id: 'bond_60',
    icon: '💞',
    name: '心意相通',
    desc: '和一隻御獸的羈絆達到 60。',
    check: s => (s.tamed || []).some(p => p.bond >= 60)
  },
  { id: 'ride', icon: '🏄', name: '乘浪而行', desc: '第一次騎乘御獸出海。', check: s => !!s.stats?.flags?.rode },
  { id: 'dive', icon: '🤿', name: '深潛', desc: '騎著御獸潛入深海。', check: s => !!s.stats?.flags?.dove },
  {
    id: 'awaken',
    icon: '✨',
    name: '契印覺醒',
    desc: '喚醒一隻御獸的契印。',
    check: s => (s.tamed || []).some(p => p.awakened)
  },
  // exploration
  {
    id: 'first_island',
    icon: '🗺️',
    name: '新大陸',
    desc: '登上第一座礁島。',
    check: s => (s.visitedIslands || []).length >= 1
  },
  {
    id: 'all_islands',
    icon: '🧭',
    name: '群島旅人',
    desc: '登上全部三座礁島。',
    check: s => (s.visitedIslands || []).length >= 3
  },
  { id: 'claim', icon: '🚩', name: '插旗', desc: '占領第一座島嶼。', check: s => (s.occupied || []).length >= 1 },
  {
    id: 'cave',
    icon: '💎',
    name: '晶窟探險',
    desc: '解開晶窟深處的封印寶箱。',
    check: s => (s.expedition?.collected || []).includes('cave-heart')
  },
  {
    id: 'boss',
    icon: '🐉',
    name: '擊退守望者',
    desc: '擊退東方的巨型深海守望者。',
    check: s => !!s.expedition?.boss?.defeated
  },
  { id: 'warship', icon: '🚢', name: '比斯泰德號', desc: '把家融合成五層遠洋戰艦。', check: s => !!s.ship },
  // codex
  {
    id: 'codex_8',
    icon: '📖',
    name: '圖鑑學徒',
    desc: '在圖鑑記錄 8 個物種。',
    check: s => codexProgress(s).seen >= 8
  },
  {
    id: 'codex_all',
    icon: '🏛️',
    name: '海洋博物誌',
    desc: '在圖鑑記錄全部 16 個物種。',
    check: s => codexProgress(s).seen >= 16
  },
  {
    id: 'codex_tamed_8',
    icon: '🎖️',
    name: '萬獸之友',
    desc: '親手馴化或培育 8 個不同物種。',
    check: s => codexProgress(s).tamed >= 8
  }
].map(a => ({ ...a, steam: 'ACH_' + a.id.toUpperCase() }));

// Unlocks every newly satisfied achievement; returns the new ones (in list order).
export function checkUnlocks(s, now = Date.now()) {
  s.achievements ??= {};
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    let ok = false;
    try {
      ok = !!a.check(s);
    } catch {}
    if (ok) {
      s.achievements[a.id] = { at: now, day: day(s) };
      fresh.push(a);
    }
  }
  return fresh;
}
export const achievementCount = s =>
  Object.keys(s.achievements || {}).filter(id => ACHIEVEMENTS.some(a => a.id === id)).length;
