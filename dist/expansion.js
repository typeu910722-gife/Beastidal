import { phenotype, clamp } from './genetics.js?v=0.37.0';
import { NODES, harvest } from './islands.js?v=0.37.0';
import { restPlace } from './ship.js?v=0.37.0';
import { dayOf, dayPhase } from './clock.js?v=0.37.0';
import { remember, rememberFirst } from './memories.js?v=0.37.0';
import { spend, give, stow } from './bag.js?v=0.37.0';
import { LANDMARKS, BOSS_HOME, landNear, mapPoint } from './lake.js?v=0.37.0';
import { islandAt } from './islands.js?v=0.37.0';
import { hasPerk } from './codex.js?v=0.37.0';
import { tally } from './stats.js?v=0.37.0';
import { rollDrops } from './species.js?v=0.37.0';
import { bsOf, geneStats } from './bsgenes.js?v=0.37.0';
import { WILD_BEASTS } from './beasts.js?v=0.37.0';
import { hasGear, MASK_OXYGEN } from './gear.js?v=0.37.0';
import { damageBonus } from './skills.js?v=0.37.0';
import { oxygenShift, stormAt as skyStorm } from './weather.js?v=0.37.0';
import { ITEM_NAMES } from './items.js?v=0.37.0';
import { personality } from './beast-tree.js?v=0.37.0';
import { storyExplore, onWatcherDown, SEAL_AT, TIDE_AT } from './story.js?v=0.37.0';
// The crystal cave is its own pocket of the world, far outside the basin — since 0.31 a corrupted garden maze
// (cave-maze.js), with 嘯岳 asleep at its heart.
import { CAVE, ENTRANCE, DEAD_ENDS, mazeWalkable } from './cave-maze.js?v=0.37.0';
export { CAVE };
const inMaze = (x, z) => ({ x: CAVE.x + x, z: CAVE.z + z });
const KEY_WALL = inMaze(DEAD_ENDS[0].x, DEAD_ENDS[0].z),
  HEART_CHEST = inMaze(DEAD_ENDS[1].x, DEAD_ENDS[1].z);
// the 深淵潛行者 collection perk lengthens every dive
export const oxygenMax = s =>
  Math.max(40, 90 + (hasPerk(s, 'deep') ? 30 : 0) + (hasGear(s, 'mask') ? MASK_OXYGEN : 0) + oxygenShift(s));
const at = (p, o) => landNear(p.x, p.z, o);
const CACHE = at({ x: LANDMARKS.boathouse.x + 4, z: LANDMARKS.boathouse.z - 24 }, { min: 1, maxSlope: 0.5 }),
  ARCHIVE = at(mapPoint(-10, -17), { min: 2, maxSlope: 0.5 }),
  CAVE_DOOR = at(mapPoint(67, 0), { min: 6, max: 60, maxSlope: 1.1 });
export const EXPLORE = [
  {
    id: 'palm-cache',
    name: '漂流者寶箱',
    x: CACHE.x,
    z: CACHE.z,
    kind: 'chest',
    rewards: { wood: 8, food: 5, metal: 3 }
  },
  { id: 'archive', name: '御獸文明石碑', x: ARCHIVE.x, z: ARCHIVE.z, kind: 'ruin', rewards: { crystal: 3 } },
  { id: 'cave-door', name: '晶窟入口', x: CAVE_DOOR.x, z: CAVE_DOOR.z, kind: 'entrance' },
  {
    id: 'cave-exit',
    name: '返回右岸半島',
    x: CAVE.x + ENTRANCE.x,
    z: CAVE.z + ENTRANCE.z + 1.2,
    kind: 'exit',
    cave: true
  },
  {
    id: 'cave-heart',
    name: '晶窟封印寶箱',
    x: HEART_CHEST.x,
    z: HEART_CHEST.z,
    kind: 'chest',
    cave: true,
    rewards: { crystal: 8, metal: 6 }
  },
  {
    id: 'deep-memory',
    name: '湖底記憶核心',
    x: LANDMARKS.plaza.x,
    z: LANDMARKS.plaza.z,
    kind: 'deep',
    deep: true,
    rewards: { crystal: 6, metal: 4 }
  },
  // 嘯岳之契 (story.js): the sealed slab, and the two keys you can reach by exploring
  { id: 'pact-seal', name: '封印石板', x: SEAL_AT.x, z: SEAL_AT.z, kind: 'seal', deep: true, story: true },
  { id: 'key-tide', name: '潮紋祭台', x: TIDE_AT.x, z: TIDE_AT.z, kind: 'relic', deep: true, story: true },
  { id: 'key-stone', name: '岩紋石壁', x: KEY_WALL.x, z: KEY_WALL.z, kind: 'relic', cave: true, story: true }
];
export const STAGES = [
  [0, '初識'],
  [15, '同行'],
  [30, '協戰'],
  [45, '騎乘'],
  [60, '深潛'],
  [85, '契印']
];
export function normalizeExpansion(s) {
  s.expedition ??= {};
  const e = s.expedition;
  e.boatLevel ??= 0;
  e.activeId ??= null;
  e.order ??= 'follow';
  e.oxygen ??= 90;
  // metres below the surface while diving (≤ 0); 0.19 lets you swim freely in three dimensions
  e.depth ??= 0;
  if (e.diving && !(e.depth < 0)) e.depth = -3;
  if (!e.diving) e.depth = 0;
  e.collected ??= [];
  e.boss ??= { x: BOSS_HOME.x, z: BOSS_HOME.z, hp: 480, maxHp: 480, defeated: false, lastAttack: -999 };
  // 0.15 moved the world into the basin: re-home anything left on the new land or in the old cave pocket
  if (!e.boss.defeated && islandAt(e.boss.x, e.boss.z, 3)) Object.assign(e.boss, { x: BOSS_HOME.x, z: BOSS_HOME.z });
  if (s.inCave && !mazeWalkable(s.player.x - CAVE.x, s.player.z - CAVE.z)) {
    s.player.x = CAVE.x + ENTRANCE.x;
    s.player.z = CAVE.z + ENTRANCE.z;
  }
  e.lastStorm ??= s.elapsed;
  e.lastGather ??= s.elapsed;
  e.lastBond ??= s.elapsed;
  s.player.level ??= 0;
  for (const p of [...s.tamed, ...s.eggs]) {
    p.bond ??= 10;
    p.stamina ??= 100;
    p.health ??= 100;
    p.lastTrain ??= -999;
    p.lastAttack ??= -999;
    p.awakened ??= false;
  }
  if (!s.tamed.some(p => p.id === e.activeId)) {
    e.activeId = null;
    e.mounted = false;
    e.diving = false;
  }
  if (!e.mounted) e.diving = false;
  return s;
}
export const activePet = s => s.tamed.find(p => p.id === s.expedition?.activeId);
// 0.24: storms are the thunderstorms of the weather schedule
export const stormAt = s => skyStorm(s);
const fail = error => ({ ok: false, error });
const pay = spend;
const reward = (s, items) => give(s, items || {});
export function trainPet(s, id) {
  normalizeExpansion(s);
  const p = s.tamed.find(p => p.id === id);
  if (!p) return fail('找不到這隻夥伴。');
  if (p.bond >= 100) return fail('羈絆已滿。');
  if (!pay(s, { food: 2, crystal: 1 })) return fail('訓練需要 2 口糧與 1 異晶。');
  p.lastTrain = s.elapsed;
  const per = personality(p),
    gain = Math.round(4 * (per?.feedMul || 1) * (per?.bondMul || 1));
  p.bond = Math.min(100, p.bond + gain);
  p.stamina = Math.min(100, p.stamina + 15);
  p.health = Math.min(100, p.health + 15);
  return {
    ok: true,
    message: `默契訓練完成：羈絆 +${gain}。${per?.feedMul > 1 ? `${p.name} 吃得津津有味。` : ''}`
  };
}
export function commandPet(s, id, order = 'follow') {
  normalizeExpansion(s);
  const p = s.tamed.find(p => p.id === id);
  if (!p) return fail('請先馴化生物。');
  if (s.expedition.mounted) return fail('請先回到小艇解除騎乘。');
  if (order === 'home') {
    s.expedition.activeId = null;
    return { ok: true, message: '夥伴回去休息了。' };
  }
  // 0.25: creatures may follow you, nothing more; a beast must be one of the three contracts you carry
  if (p.kind === 'creature') {
    if (order !== 'follow') return fail('生物只能跟隨，不能採集或戰鬥。契闊進化成御獸後才行。');
    if (p.health < 15) return fail('牠需要休息。');
    s.expedition.activeId = id;
    s.expedition.order = 'follow';
    rememberFirst(s, p, 'out', '第一次跟著你出門。');
    return { ok: true, message: p.name + ' 跟著你。生物不能騎乘，也不能戰鬥。' };
  }
  // a beast never sorted into the team yet (older saves, fresh contracts) joins it while there is room
  if (p.team === undefined && !p.ancient && s.tamed.filter(t => t.kind !== 'creature' && t.team).length < 3)
    p.team = true;
  if (!p.team && !p.ancient) return fail('這張御獸契約不在身上。先在御獸倉庫把牠「帶在身上」（最多 6 張）。');
  if (!['follow', 'gather', 'guard'].includes(order)) return fail('未知指令。');
  if (p.bond < (order === 'guard' ? 30 : 15))
    return fail(order === 'guard' ? '羈絆 30 才能協戰。' : '羈絆 15 才願意跟隨與採集。');
  if (p.health < 15 || p.stamina < 10) return fail('夥伴需要回池休息或訓練照護。');
  s.expedition.activeId = id;
  s.expedition.order = order;
  rememberFirst(s, p, 'out', '第一次跟著你出海。');
  return {
    ok: true,
    message: p.name + '：' + { follow: '跟隨', gather: '協助採集', guard: '守護協戰' }[order] + '。原池名額會保留。'
  };
}
// Where a rider dismounts to: the warship when it is the vessel they rode out from, else the skiff or the raft.
export const rideHome = s => (s.ship && !s.skiff ? s.ship : s.boat);
export function toggleRide(s) {
  normalizeExpansion(s);
  const e = s.expedition,
    p = activePet(s);
  if (e.mounted) {
    if (e.diving) return fail('請先浮上海面。');
    const home = rideHome(s);
    if (Math.hypot(s.player.x - home.x, s.player.z - home.z) > (s.ship && !s.skiff ? 16 : 7))
      return fail(s.ship && !s.skiff ? '請回到戰艦 16 公尺內解除騎乘。' : '請回到停泊的小艇 7 公尺內解除騎乘。');
    e.mounted = false;
    e.diving = false;
    Object.assign(s.player, { x: home.x, z: home.z });
    return { ok: true, message: s.ship && !s.skiff ? '已返回戰艦。' : '已返回小艇。' };
  }
  if (p?.kind === 'creature') return fail('生物不能騎乘。只有御獸可以。');
  if (!p || p.bond < 45) return fail('先派出羈絆 45 的夥伴。');
  if (phenotype(p.genome).habitat === 'land') return fail('陸棲御獸不會游泳，沒辦法下海騎乘；牠會坐在船頭陪你。');
  if (s.player.mode === 'foot') return fail('請先登艇，再騎乘夥伴。');
  if (s.player.mode === 'aboard') return fail('請在駕駛室掌舵時再騎乘出海。');
  if (p.stamina < 25) return fail('騎乘需要至少 25 耐力。');
  e.mounted = true;
  return { ok: true, message: '已騎乘。小艇會留在原地；回到小艇附近即可解除。' };
}
export function toggleDive(s) {
  normalizeExpansion(s);
  const e = s.expedition,
    p = activePet(s);
  if (e.diving) {
    e.diving = false;
    e.depth = 0;
    return { ok: true, message: '已浮上海面。' };
  }
  if (!e.mounted || !p || p.bond < 60) return fail('深潛需要騎乘羈絆 60 的夥伴。');
  if (e.oxygen < 25 || p.stamina < 20) return fail('先浮上水面補充氧氣與耐力。');
  e.diving = true;
  e.depth = -2.5;
  rememberFirst(s, p, 'dive', '第一次帶你潛進深海。');
  return { ok: true, message: '潛向湖底。往哪裡看就往哪裡游，按住空白鍵上浮；氧氣耗盡會自動浮上。' };
}
export function upgradeBoat(s) {
  normalizeExpansion(s);
  const lv = s.expedition.boatLevel;
  if (s.ship) return fail('小艇已融合為戰艦。');
  if (lv >= 3) return fail('船隻已升到最高 3 級。');
  if (
    (s.player.mode === 'foot' && s.inCave) ||
    Math.hypot(s.player.x - 1.8, s.player.z - 1.8) > 20 ||
    s.expedition.mounted
  )
    return fail('請駕艇返回避難所附近升級。');
  const cost = { wood: 12 + lv * 8, metal: 8 + lv * 6, crystal: 2 + lv * 2 };
  if (!pay(s, cost)) return fail('升級材料不足。');
  s.expedition.boatLevel++;
  return { ok: true, message: `小艇升至 ${lv + 1} 級：航速提升，風暴傷害降低。` };
}
export function explore(s, id) {
  normalizeExpansion(s);
  const e = s.expedition,
    site = EXPLORE.find(p => p.id === id);
  if (!site) return fail('找不到探索點。');
  if (!!site.cave !== !!s.inCave) return fail('探索點不在目前區域。');
  if (Math.hypot(site.x - s.player.x, site.z - s.player.z) > 4.5) return fail('請靠近探索點至 4 公尺內。');
  if (site.deep && !e.diving) return fail('此遺物沉在湖底遺城，需要騎乘御獸潛水。');
  if (!site.deep && s.player.mode !== 'foot') return fail('請先登岸。');
  if (site.story) return storyExplore(s, site);
  if (site.kind === 'entrance') {
    s.caveReturn = { x: s.player.x, z: s.player.z };
    s.inCave = true;
    s.player.x = CAVE.x + ENTRANCE.x;
    s.player.z = CAVE.z + ENTRANCE.z;
    s.player.heading = Math.PI;
    s.player.level = 0;
    return { ok: true, message: '進入異晶洞窟——裡面長成了一座腐化的花園迷宮。出口在身後。' };
  }
  if (site.kind === 'exit') {
    s.inCave = false;
    Object.assign(s.player, s.caveReturn || { x: CAVE_DOOR.x, z: CAVE_DOOR.z });
    return { ok: true, message: '已返回海岸。' };
  }
  if (e.collected.includes(id)) return fail('這裡的遺物已經回收。');
  if (id === 'cave-heart' && !e.collected.includes('archive')) return fail('封印需要沉城遺島的御獸石碑知識。');
  e.collected.push(id);
  reward(s, site.rewards);
  const texts = {
    archive: '石碑：御獸不是支配。與生命同行、共戰、深入海淵，才能獲得契印。',
    'cave-heart': '晶窟記錄：雙親的形態基因可以共存，混種生命並非錯誤。',
    'deep-memory': '湖底記憶：擊退深海守望者後，羈絆 85 的夥伴可喚醒契印。',
    'palm-cache': '補給箱中找到漂流者留下的食物與材料。'
  };
  s.log.unshift({ day: dayOf(s), title: site.name, text: texts[id] });
  // exploring together deepens the bond more than training does
  const p = activePet(s);
  if (p) {
    p.bond = Math.min(100, p.bond + 3);
    remember(s, p, `一起找到了${site.name}。`);
  }
  return { ok: true, message: texts[id] + (p ? ` ${p.name} 的羈絆 +3。` : '') };
}
export const dropText = d =>
  Object.entries(d || {})
    .map(([k, v]) => `${ITEM_NAMES[k] || k} +${v}`)
    .join('、');
// A thing counts as dangerous when it is hostile or in a frenzy (a failed contract); nothing frenzied can be repelled.
export const dangerous = (w, elapsed) => !!w.hostile || (w.frenzyUntil || 0) > elapsed;
// 0.22: a quick strike (tap F) or a heavy one (hold F): more damage, more stamina, a longer recovery.
export function attack(s, heavy = false) {
  normalizeExpansion(s);
  const e = s.expedition,
    p = activePet(s);
  if (!p || p.bond < 30) return fail('需要羈絆 30 的出戰夥伴。');
  if (p.kind === 'creature') return fail('牠還只是生物，還不能出戰。配種出比斯基因後契闊進化，才能戰鬥。');
  if (p.health < 15 || p.stamina < (heavy ? 12 : 6)) return fail('夥伴已疲累，請回池休息。');
  if (s.elapsed - p.lastAttack < (p.lastHeavy ? 3.4 : 2)) return fail('攻擊恢復中。');
  p.lastHeavy = heavy;
  const b = e.boss;
  let target =
    !b.defeated && Math.hypot(s.player.x - b.x, s.player.z - b.z) < 17
      ? b
      : s.wild
          .filter(w => dangerous(w, s.elapsed) && Math.hypot(w.x - s.player.x, w.z - s.player.z) < 14)
          .sort(
            (a, b) => Math.hypot(a.x - s.player.x, a.z - s.player.z) - Math.hypot(b.x - s.player.x, b.z - s.player.z)
          )[0];
  if (!target) return fail('附近沒有可攻擊的敵對生物。');
  p.stamina -= heavy ? 12 : 6;
  p.lastAttack = s.elapsed;
  const ph = phenotype(p.genome),
    mine = geneStats(bsOf(p.genome)),
    theirs = geneStats(bsOf(target.genome));
  let damage = Math.round(
    (8 + ph.armor * 0.07 + ph.speed * 0.06 + mine.atk + damageBonus(s) + (p.awakened ? 12 : 0) + (p.ancient ? 20 : 0)) *
      (heavy ? 1.8 : 1)
  );
  damage = Math.max(1, Math.round(damage * Math.max(0.4, 1 - theirs.def / 60)));
  target.hp = (target.hp ?? 60) - damage;
  e.attackFlashUntil = s.elapsed + 0.25;
  e.lunge = { x: target.x, z: target.z, until: s.elapsed + 0.3, heavy };
  e.hitAt = { x: target.x, z: target.z, at: s.elapsed };
  if (target.hp <= 0) {
    if (target === b) {
      onBossDown(s, p);
    } else {
      tally(s, target.beast ? 'beastkill' : 'kill');
      s.wild = s.wild.filter(w => w !== target);
      e.lastDrops = rollDrops(phenotype(target.genome));
      if (target.beast) e.lastDrops.crystal = (e.lastDrops.crystal || 0) + 3;
      reward(s, e.lastDrops);
      p.bond = Math.min(100, p.bond + 1);
    }
    return {
      ok: true,
      message:
        target === b
          ? '擊退巨型海怪！異晶 +12、金屬 +15、口糧 +5。'
          : '擊退敵對生物，掉落 ' + dropText(e.lastDrops) + '。',
      note: target === b ? e.boneNote : null
    };
  }
  return {
    ok: true,
    message: `${heavy ? '重擊' : '攻擊'}造成 ${damage} 傷害；${target.beast ? WILD_BEASTS[target.beast].name : '敵人'}體力 ${Math.ceil(target.hp)}${target.maxHp ? ' / ' + target.maxHp : ''}。`
  };
}
// The deep watcher falls: its story note, the reward and the log (from attack() or from combat.js).
export function onBossDown(s, p) {
  const e = s.expedition,
    b = e.boss;
  if (b.defeated) return null;
  b.defeated = true;
  e.boneNote = onWatcherDown(s);
  if (p) {
    remember(s, p, '並肩擊退了深海守望者。');
    p.bond = Math.min(100, p.bond + 6);
  }
  reward(s, { crystal: 12, metal: 15, food: 5 });
  s.log.unshift({
    day: dayOf(s),
    title: '深海守望者沉入海溝',
    text: '我們並肩度過了風浪。守望者留下的契印回應了夥伴的光。'
  });
  return e.boneNote;
}
export function awaken(s, id) {
  normalizeExpansion(s);
  const p = s.tamed.find(p => p.id === id),
    e = s.expedition;
  if (!p || p.bond < 85) return fail('需要羈絆 85。');
  if (p.awakened) return fail('此夥伴已喚醒契印。');
  if (!e.boss.defeated || !['archive', 'cave-heart', 'deep-memory'].every(id => e.collected.includes(id)))
    return fail('先完成御獸石碑、晶窟封印、深海記憶與守望者挑戰。');
  if (!pay(s, { crystal: 12 })) return fail('契印覺醒需要 12 異晶。');
  p.awakened = true;
  remember(s, p, '契印覺醒，身上亮起了環形靈光。');
  return { ok: true, message: '契印覺醒：戰鬥傷害 +12，夥伴獲得環形靈光。幻獸之路的第一步。' };
}
export function tickExpansion(s, dt, safe = false) {
  normalizeExpansion(s);
  const e = s.expedition,
    p = activePet(s),
    events = [];
  for (const pet of s.tamed) {
    if (pet !== p) {
      const k =
        ({ island: 1.6, lounge: 1.3, hold: 1.3, hall: 1.4, pen: 1, storage: 1 }[restPlace(s, pet)] || 1) *
        (personality(pet)?.restMul || 1);
      pet.stamina = Math.min(100, pet.stamina + dt * 0.7 * k);
      pet.health = Math.min(100, pet.health + dt * 0.45 * k);
    }
  }
  if (e.diving) {
    e.oxygen = Math.max(0, e.oxygen - dt);
    if (e.oxygen === 0) {
      e.diving = false;
      e.depth = 0;
      events.push('氧氣不足，夥伴已帶你浮上海面。');
    }
  } else e.oxygen = Math.min(oxygenMax(s), e.oxygen + dt * 7);
  if (p) {
    p.stamina = clamp(
      p.stamina + dt * (e.diving ? -0.36 : e.mounted ? (hasGear(s, 'saddle') ? -0.06 : -0.12) : 0.12),
      0,
      100
    );
    if (!safe && s.elapsed - e.lastBond >= 60) {
      e.lastBond = s.elapsed;
      p.bond = Math.min(100, p.bond + 0.75 * (personality(p)?.bondMul || 1));
    }
    if (p.stamina <= 1 && e.mounted) {
      e.diving = false;
      e.mounted = false;
      Object.assign(s.player, { x: rideHome(s).x, z: rideHome(s).z });
      s.vitals.health = Math.max(1, s.vitals.health - 8);
      events.push('夥伴力竭，緊急返回小艇；體力 -8。');
    }
    if (!safe && e.order === 'gather' && p.stamina >= 12 && s.elapsed - e.lastGather >= 45) {
      e.lastGather = s.elapsed;
      let got = false;
      if (s.player.mode === 'foot' && !s.inCave) {
        const node = NODES.find(
          n => Math.hypot(n.x - s.player.x, n.z - s.player.z) <= 4 && (s.harvested?.[n.id] || 0) <= s.elapsed
        );
        if (node) got = harvest(s, node.id).ok;
      } else if (!e.diving) {
        const l = s.loot.find(l => Math.hypot(l.x - s.player.x, l.z - s.player.z) < 12);
        if (l) {
          stow(s, l.kind === 3 ? { crystal: 1, metal: 2 } : { wood: 3, fiber: 1 });
          s.loot = s.loot.filter(v => v !== l);
          s.salvaged++;
          got = true;
        }
      }
      if (got) {
        p.stamina -= 8;
        p.bond = Math.min(100, p.bond + 1);
        rememberFirst(s, p, 'gather', '第一次幫你採集物資。');
        events.push('夥伴協助採集，物資已放入背包，羈絆 +1。');
      }
    }
  }
  if (!safe && !s.inCave && !e.diving && stormAt(s) && s.player.mode !== 'foot' && s.elapsed - e.lastStorm > 10) {
    e.lastStorm = s.elapsed;
    s.vitals.health = Math.max(0, s.vitals.health - Math.max(0.5, 5 - (s.ship ? 6 : e.boatLevel) * 1.5));
    events.push(s.ship ? '暴風浪拍打戰艦船身，艦體穩住了。' : '暴風浪拍擊！返回避難所或升級船體可降低風險。');
  }
  const b = e.boss,
    d = Math.hypot(s.player.x - b.x, s.player.z - b.z);
  // 0.28: within reach the watcher fights through combat.js (telegraphed slams, waves and rams); out of it, it
  // drifts back to its trench
  if (d > 45 && !b.defeated) {
    b.x += (BOSS_HOME.x - b.x) * Math.min(1, dt * 0.25);
    b.z += (BOSS_HOME.z - b.z) * Math.min(1, dt * 0.25);
  }
  return events;
}
