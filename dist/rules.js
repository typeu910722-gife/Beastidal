import { limitError } from './ship.js?v=0.12.1';
import { dayOf } from './clock.js?v=0.12.1';
import { normalizeExpansion } from './expansion.js?v=0.12.1';
import { normalizeHousing, freePen } from './housing.js?v=0.12.1';
import { dockingSpots } from './navigation.js?v=0.12.1';
import { makeGenome, phenotype, geneName, crossGenome, seeded, genomeValid, clamp } from './genetics.js?v=0.12.1';
export const SAVE_KEY = 'tidal-rebirth-save-v1';
export const RESOURCE_NAMES = {
  wood: '漂流木',
  metal: '廢金屬',
  fiber: '纖維',
  crystal: '異晶',
  food: '口糧',
  water: '淡水',
  bait: '誘餌'
};
export const RESOURCE_ICONS = { wood: '▱', metal: '⬡', fiber: '⌁', crystal: '◇', food: '◒', water: '♧', bait: '◉' };
export const RECIPES = {
  floor: {
    name: '浮動地基',
    icon: '▦',
    cost: { wood: 4, fiber: 1 },
    desc: '接在木筏邊緣，拓展生活空間。',
    kind: 'floor'
  },
  shelter: {
    name: '帆布避難所',
    icon: '⌂',
    cost: { wood: 10, fiber: 4, metal: 2 },
    desc: '遮風避雨，返航後恢復體力。',
    kind: 'structure'
  },
  collector: {
    name: '集水蒸餾器',
    icon: '♧',
    cost: { wood: 6, fiber: 4, metal: 2 },
    desc: '每 35 秒儲存 2 份淡水，上限 20；點擊設施取水。',
    kind: 'structure'
  },
  pen: {
    name: '海洋展示池',
    icon: '◎',
    cost: { wood: 10, metal: 6, fiber: 4 },
    desc: '讓 3 隻馴化生物入住海上展場。',
    kind: 'water',
    hidden: true
  },
  hatchery: {
    name: '基因孵化台',
    icon: '♧',
    cost: { wood: 8, metal: 8, crystal: 3 },
    desc: '配對、重組、突變，孵育全新生命。',
    kind: 'structure',
    hidden: true
  },
  beacon: {
    name: '遠洋訊號塔',
    icon: '♜',
    cost: { wood: 12, metal: 10, crystal: 5 },
    desc: '點亮海上的家，完成第一章。',
    kind: 'structure'
  }
};
Object.assign(RECIPES, {
  upperfloor: {
    name: '二樓地板',
    icon: '▦',
    cost: { wood: 8, metal: 3 },
    desc: '在既有地基上增加第二層，需要樓梯抵達。',
    kind: 'upper'
  },
  stairs: {
    name: '連層樓梯',
    icon: '▤',
    cost: { wood: 8, metal: 2 },
    desc: '點擊上下樓；放在有二樓地板的地基。',
    kind: 'stairs'
  },
  chair: {
    name: '木製休息椅',
    icon: '♧',
    cost: { wood: 3, fiber: 1 },
    desc: '消耗 1 口糧恢復 15 體力。',
    kind: 'furniture'
  },
  table: {
    name: '工作桌',
    icon: '▱',
    cost: { wood: 5, metal: 1 },
    desc: '製作誘餌，並和信任你的野生御獸締結契約。',
    kind: 'furniture'
  },
  lamp: {
    name: '晶光立燈',
    icon: '✦',
    cost: { wood: 2, metal: 2, crystal: 1 },
    desc: '照亮家中的角落，可切換明暗。',
    kind: 'furniture'
  },
  // Fixed: was already on the raft when the protagonist woke up. Can be moved, never built or scrapped.
  desk: {
    name: '漂流書桌',
    icon: '▭',
    cost: {},
    desc: '醒來時就在木筏上的書桌。一台壞掉的筆電，和一台還在閃著微光的隨身裝置。',
    kind: 'furniture',
    fixed: true
  },
  dock: {
    name: '船隻停靠站',
    icon: '⚓',
    cost: { wood: 24, metal: 16, fiber: 10 },
    desc: '大型船隻的繫泊碼頭。需先占領一座島嶼；戰艦融合的必要設施。',
    kind: 'water',
    // blueprint: stays out of the build menu (no spoilers) until the first island is claimed
    unlock: s => (s.occupied || []).length > 0
  }
});
export function uid(prefix = 'c') {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
export function createState(seed = Date.now() >>> 0) {
  const r = seeded(seed);
  return {
    version: 1,
    seed,
    elapsed: 0,
    player: { x: 7, z: 10, heading: 0 },
    resources: { wood: 3, metal: 1, fiber: 2, crystal: 0, food: 4, water: 5, bait: 0 },
    vitals: { health: 100, food: 100, water: 100 },
    buildings: [
      { type: 'floor', x: 0, z: 0, rot: 0 },
      { type: 'floor', x: 1, z: 0, rot: 0 },
      { type: 'floor', x: 0, z: 1, rot: 0 },
      { type: 'floor', x: 1, z: 1, rot: 0 },
      { type: 'desk', x: 1, z: 1, rot: 0 }
    ],
    device: { owned: false, laptop: false },
    salvaged: 0,
    expanded: 0,
    secret: false,
    buoyFound: false,
    tamed: [],
    eggs: [],
    wild: initialWild(seed),
    loot: initialLoot(r),
    lastSupply: 0,
    lastLoot: 0,
    lastPassive: 0,
    completed: false,
    discoverySeen: false,
    log: [
      {
        day: 1,
        title: '沒有打卡的第二次人生',
        text: '畢業後第一份工作的第 37 天。機車、雨、砂石車的喇叭，然後是一片寂靜。我從漂流木旁醒來，遠處沒有陸地。'
      }
    ]
  };
}
function initialLoot(r) {
  const coords = [
    [9, 8],
    [4, 14],
    [-4, 10],
    [-9, 2],
    [-6, -8],
    [5, -11],
    [14, -5],
    [19, 9],
    [22, -19],
    [-19, -13],
    [28, 19],
    [-24, 24]
  ];
  for (let i = 0; i < 32; i++) {
    let a = r() * Math.PI * 2,
      d = 24 + r() * 100;
    coords.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  return coords.map(([x, z], i) => ({ id: 'loot-' + i, x, z, kind: i % 5, spin: r() * 6 }));
}
function initialWild(seed) {
  return [
    [16, 3, 0],
    [5, -20, 1],
    [-16, 12, 2],
    [-17, -18, 3],
    [34, 22, 0],
    [-36, -30, 1],
    [52, -20, 0],
    [25, 52, 2]
  ].map(([x, z, form], i) => {
    // a couple of deep-sea species and one plant mutant among the first creatures a new player meets
    const genome = makeGenome(seed + i * 1531, form, i === 5 || i === 7 ? 'deep' : i === 3 ? 'flora' : 'sea');
    if (i === 6) genome.temper = [245, 245];
    return { id: 'wild-' + i, x, z, homeX: x, homeZ: z, genome, trust: 0, phase: i * 1.3, hostile: i === 6 };
  });
}
export { dayOf };
export function count(s, t) {
  return s.buildings.filter(b => b.type === t).length;
}
export function canPay(s, cost) {
  return Object.entries(cost).every(([k, v]) => s.resources[k] >= v);
}
export function pay(s, cost) {
  if (!canPay(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) s.resources[k] -= v;
  return true;
}
export function log(s, title, text) {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
}
export function lootYield(kind) {
  return [
    { wood: 5, fiber: 2 },
    { metal: 4, wood: 2 },
    { food: 3, water: 3, fiber: 1 },
    { crystal: 2, metal: 2, wood: 2 },
    { wood: 4, metal: 2, fiber: 3 }
  ][kind % 5];
}
export function salvage(s, id) {
  const i = s.loot.findIndex(l => l.id === id);
  if (i < 0) return { ok: false, error: '已回收這件物資。' };
  const l = s.loot[i];
  if (Math.hypot(l.x - s.player.x, l.z - s.player.z) > 10.5)
    return { ok: false, error: '再靠近一點，打撈距離為 10 公尺。' };
  const rewards = lootYield(l.kind);
  for (const [k, v] of Object.entries(rewards)) s.resources[k] += v;
  s.loot.splice(i, 1);
  s.salvaged++;
  return { ok: true, rewards };
}
export function buildError(s, type, x, z, level = 0) {
  const recipe = RECIPES[type];
  if (!recipe) return '未知設施。';
  if (!Number.isInteger(x) || !Number.isInteger(z) || Math.abs(x) > 10 || Math.abs(z) > 10)
    return '請建在避難所的有效範圍內。';
  if (recipe.hidden && !s.secret) return '尚未解讀研究浮標。';
  {
    const lim = limitError(s, type);
    if (lim) return lim;
  }
  if (!canPay(s, recipe.cost)) return '物資不足，先打撈更多材料。';
  if (Math.hypot(s.player.x - 1.8, s.player.z - 1.8) > 27) return '請先回到避難所附近建造。';
  if (![0, 1].includes(level)) return '只有一樓與二樓。';
  if ((type === 'pen' || type === 'floor' || type === 'stairs') && level !== 0) return '此設施只能建在一樓。';
  if (type === 'upperfloor') {
    if (!s.buildings.some(b => b.type === 'floor' && b.x === x && b.z === z)) return '二樓需要下方地基支撐。';
    if (s.buildings.some(b => b.type === 'upperfloor' && b.x === x && b.z === z)) return '此處已有二樓。';
    return null;
  }
  if (type === 'stairs') {
    if (
      !s.buildings.some(b => b.type === 'floor' && b.x === x && b.z === z) ||
      !s.buildings.some(b => b.type === 'upperfloor' && b.x === x && b.z === z)
    )
      return '需在上下層地板都有的格位建樓梯。';
    if (s.buildings.some(b => b.type !== 'floor' && b.type !== 'upperfloor' && b.x === x && b.z === z))
      return '樓梯需要空出的格位。';
    return null;
  }
  const here = s.buildings.filter(b => b.x === x && b.z === z && (b.level || 0) === level),
    adjacent = s.buildings.some(b => b.type === 'floor' && Math.abs(b.x - x) + Math.abs(b.z - z) === 1);
  if (recipe.kind === 'floor' || recipe.kind === 'water') {
    if (here.length) return '這一格已經有設施。';
    if (!adjacent) return '需要緊鄰一格浮動地基。';
  } else {
    if (!here.some(b => b.type === (level ? 'upperfloor' : 'floor'))) return '請放在木筏地基上。';
    if (here.some(b => b.type !== 'floor' && b.type !== 'upperfloor')) return '這一格已經有設施。';
  }
  if (type === 'hatchery' && !count(s, 'pen')) return '先建造一座海洋展示池。';
  if (!dockingSpots({ ...s, buildings: [...s.buildings, { type, x, z, rot: 0, level }] }).length)
    return '請保留至少一個可登岸的木筏邊緣。';
  return null;
}
export function placeBuilding(s, type, x, z, rot = 0, level = 0) {
  if (RECIPES[type]?.fixed) return { ok: false, error: '這件物品無法建造。' };
  if (type === 'upperfloor') level = 1;
  const error = buildError(s, type, x, z, level);
  if (error) return { ok: false, error };
  pay(s, RECIPES[type].cost);
  s.buildings.push({ type, x, z, rot, level });
  if (type === 'floor') s.expanded++;
  if (type === 'pen') normalizeHousing(s);
  log(s, '建造：' + RECIPES[type].name, RECIPES[type].desc);
  return { ok: true };
}
export function craftBait(s) {
  if (!s.secret) return { ok: false, error: '先調查研究浮標。' };
  if (!pay(s, { food: 1, fiber: 1 })) return { ok: false, error: '需要 1 口糧與 1 纖維。' };
  s.resources.bait += 3;
  return { ok: true };
}
// Feeding and contracts live in taming.js (0.12).
export { feed } from './taming.js?v=0.12.1';
export function breed(s, aId, bId, rng = Math.random) {
  normalizeHousing(s);
  normalizeExpansion(s);
  if (!s.secret || !count(s, 'hatchery')) return { ok: false, error: '需要基因孵化台。' };
  if (aId === bId) return { ok: false, error: '請選擇兩隻不同的親代。' };
  const a = s.tamed.find(x => x.id === aId),
    b = s.tamed.find(x => x.id === bId);
  if (!a || !b) return { ok: false, error: '請選擇已馴化的親代。' };
  if (a.bond < 35 || b.bond < 35) return { ok: false, error: '兩隻親代都需要羈絆 35，才能安心配對。' };
  if (s.eggs.length >= count(s, 'hatchery') * 2)
    return { ok: false, error: '孵化台正在使用中。每台可同時孵育 2 顆卵。' };
  if (s.tamed.length + s.eggs.length >= count(s, 'pen') * 3)
    return { ok: false, error: '展示池沒有幼體空間。請增建展示池。' };
  if (!pay(s, { crystal: 1, food: 2 })) return { ok: false, error: '雜交需要 1 異晶與 2 口糧。' };
  const { genome, mutations } = crossGenome(a.genome, b.genome, rng);
  const egg = {
    id: uid('child'),
    genome,
    name: geneName(genome),
    generation: 1 + Math.max(a.generation, b.generation),
    parents: [a.id, b.id],
    parentNames: [a.name, b.name],
    mutations,
    bond: 10,
    stamina: 100,
    health: 100,
    role: 'exhibit',
    penId: freePen(s),
    readyAt: s.elapsed + 30,
    duration: 30
  };
  s.eggs.push(egg);
  log(s, '一個新的可能', a.name + ' × ' + b.name + '。卵中的微光，正在寫下新的生命。');
  return { ok: true, egg };
}
export function useSupply(s, type) {
  if (!['food', 'water'].includes(type) || s.resources[type] <= 0) return { ok: false, error: '背包裡沒有這項補給。' };
  if (s.vitals[type] >= 98) return { ok: false, error: '目前不需要補充。' };
  s.resources[type]--;
  s.vitals[type] = clamp(s.vitals[type] + 35, 0, 100);
  return { ok: true };
}
export function tickSystems(s, dt, safe = false, rng = Math.random) {
  normalizeHousing(s);
  s.elapsed += dt;
  const events = [];
  if (!safe) {
    s.vitals.water = clamp(s.vitals.water - dt * 0.047, 0, 100);
    s.vitals.food = clamp(s.vitals.food - dt * 0.032, 0, 100);
    if (s.vitals.food < 5 || s.vitals.water < 5) s.vitals.health = Math.max(0, s.vitals.health - dt * 0.25);
  }
  if (count(s, 'shelter') && Math.hypot(s.player.x - 1.8, s.player.z - 1.8) < 12)
    s.vitals.health = Math.min(100, s.vitals.health + dt * 1.3);
  if (s.elapsed - s.lastSupply >= 35) {
    s.lastSupply = s.elapsed;
    for (const b of s.buildings) if (b.type === 'collector') b.waterStored = Math.min(20, (b.waterStored || 0) + 2);
  }
  if (s.elapsed - s.lastPassive >= 55) {
    s.lastPassive = s.elapsed;
    for (const pet of s.tamed) {
      const p = phenotype(pet.genome);
      if (p.ability === 0) s.resources.wood += 1 + Math.floor(p.affinity / 40);
      if (p.ability === 2) s.resources.crystal++;
      if (p.ability === 3) s.resources.metal++;
    }
    if (s.tamed.length) s.resources.food += Math.ceil(s.tamed.length / 3);
  }
  const hatched = s.eggs.filter(e => e.readyAt <= s.elapsed);
  s.eggs = s.eggs.filter(e => e.readyAt > s.elapsed);
  for (const e of hatched) {
    const p = { ...e };
    delete p.readyAt;
    delete p.duration;
    s.tamed.push(p);
    events.push({ type: 'hatch', pet: p });
    log(s, '誕生：' + p.name, `第 ${p.generation} 代，發生 ${p.mutations} 處新突變。牠繼承了兩個親代的部分基因。`);
  }
  if (s.elapsed - s.lastLoot > 12 && s.loot.length < 44) {
    s.lastLoot = s.elapsed;
    const a = rng() * Math.PI * 2,
      d = 15 + rng() * 48;
    s.loot.push({
      id: uid('loot'),
      x: s.player.x + Math.sin(a) * d,
      z: s.player.z + Math.cos(a) * d,
      kind: Math.floor(rng() * 5),
      spin: rng() * 6
    });
  }
  if (!s.completed && count(s, 'shelter') && count(s, 'collector') && count(s, 'beacon') && s.expanded >= 2) {
    s.completed = true;
    events.push({ type: 'chapter' });
    log(s, '第一章完成：海上的家', '訊號塔亮了。這裡不再只是一塊漂流木。下一段人生，交給我自己。');
  }
  return events;
}
export function validateSave(s) {
  if (!s || s.version !== 1 || !s.player || !s.resources || !s.vitals) return false;
  if (!Number.isFinite(s.elapsed) || s.elapsed < 0) return false;
  if (!Number.isFinite(s.player.x) || !Number.isFinite(s.player.z)) return false;
  if (!Object.keys(RESOURCE_NAMES).every(k => Number.isFinite(s.resources[k]) && s.resources[k] >= 0)) return false;
  if (!['health', 'food', 'water'].every(k => Number.isFinite(s.vitals[k]) && s.vitals[k] >= 0 && s.vitals[k] <= 100))
    return false;
  if (!Array.isArray(s.buildings) || !s.buildings.some(b => b.type === 'floor') || s.buildings.length > 600)
    return false;
  if (
    !s.buildings.every(
      b =>
        RECIPES[b.type] && Number.isInteger(b.x) && Number.isInteger(b.z) && Math.abs(b.x) <= 10 && Math.abs(b.z) <= 10
    )
  )
    return false;
  for (const key of ['tamed', 'eggs', 'wild'])
    if (
      !Array.isArray(s[key]) ||
      s[key].length > 2000 ||
      !s[key].every(p => typeof p.id === 'string' && genomeValid(p.genome))
    )
      return false;
  if (
    !Array.isArray(s.loot) ||
    s.loot.length > 500 ||
    !s.loot.every(
      l =>
        typeof l.id === 'string' &&
        Number.isFinite(l.x) &&
        Number.isFinite(l.z) &&
        Number.isInteger(l.kind) &&
        l.kind >= 0 &&
        l.kind <= 4
    )
  )
    return false;
  if (!Array.isArray(s.log) || !s.log.every(l => typeof l.title === 'string' && typeof l.text === 'string'))
    return false;
  return true;
}
