// Optimisation round 2: where to go next in the New World. In 慈光港, the country and the wasteland the HUD's quest
// panel shows chapter two and three instead of chapter one's raft chores, and the next place to go gets a marker
// with its bearing and distance. Pure: reads the story state, returns what to show.
import {
  townObjectives,
  BUILDINGS,
  toWorld,
  GUIDE_AT,
  STELE,
  BOARD,
  XIAOYUE_WAITS,
  lettersReady
} from './town.js?v=0.76.0';
import { chapter2Objectives, normalizeChapter2, graduated, guideGone } from './chapter2.js?v=0.76.0';
import {
  chapter3Objectives,
  normalizeChapter3,
  started,
  tornOpen,
  K_LOGS,
  OUTPOST,
  RIFT,
  TEAR_AT,
  layerOpen
} from './chapter3.js?v=0.76.0';
import { isNight } from './clock.js?v=0.76.0';
import { INTERIORS, interiorWorld, adminReady, QING_AT } from './interiors.js?v=0.76.0';
import { riftStatus } from './rift-fight.js?v=0.76.0';
import {
  chapter4Objectives,
  normalizeChapter4,
  inPartTwo,
  talksDone,
  homeDone,
  inLastDay,
  choiceOpen,
  thirdNext
} from './chapter4.js?v=0.76.0';
// 0.75: part two's lake steps last until the last day is over
const onLake4 = s => inPartTwo(s) && !normalizeChapter4(s).lastDone;

const door = id => BUILDINGS.find(b => b.id === id).door;
const at = (p, name, night = false) => ({ ...toWorld(p), name, night });
// The one place the story wants you at now (world coordinates), or null.
// 0.71: inside a room, the next thing in it the story wants you at
function insideGoal(s) {
  const room = s.town.inside,
    stage = normalizeChapter2(s).stage,
    pt = id => {
      const q = INTERIORS[room].points.find(p => p.id === id);
      return { ...interiorWorld(room, q), name: q.name, night: false };
    };
  if (room === 'admin' && s.chapter4?.terminal && (!s.chapter4.tank || thirdNext(s) === 'qing')) return pt('tank-b01');
  if (room === 'admin' && stage === 4) {
    if (adminReady(s)) return { ...interiorWorld('admin', QING_AT), name: '晴', night: false };
    const seen = s.town.insideSeen?.admin || [];
    const next = ['screens', 'terminal-a', 'terminal-b', 'tanks', 'terminal-c'].find(id => !seen.includes(id));
    return next ? pt(next) : null;
  }
  if (room === 'diner' && stage === 2) return { ...pt('table'), night: true };
  return pt('door');
}
export function nextGoal(s) {
  const t = s.town || {};
  if (t.inside && INTERIORS[t.inside]) return insideGoal(s);
  if (!t.met && !guideGone(s)) return at(GUIDE_AT, '引路人 · 晴');
  if (!t.room) return at(door('apartment'), '居民公寓');
  if (!t.rations) return at(door('ration'), '配給站');
  if (!t.stele) return at({ x: STELE.x, z: STELE.z + 1.8 }, '留言碑');
  if (!t.letters && lettersReady(s)) return at(door('kiosk'), '家書亭');
  if (!t.adminSeen) return at(door('admin'), '管理區', true);
  const c2 = normalizeChapter2(s);
  if (c2.stage === 1) return graduated(s) ? at({ x: BOARD.x, z: BOARD.z + 1.6 }, '慈愛公告板') : null;
  if (c2.stage === 2) return at(door('diner'), '空無一人的餐館', true);
  if (c2.stage === 3 || c2.stage === 4) return at(door('admin'), '管理區', true);
  if (!started(s)) return null;
  const c3 = normalizeChapter3(s);
  if (!tornOpen(s)) return at({ x: XIAOYUE_WAITS.x - 2.5, z: XIAOYUE_WAITS.z - 1 }, '嘯岳');
  if (!c3.outside) return at(TEAR_AT, '穹頂的裂口');
  if (c3.logs < K_LOGS.length) return at(OUTPOST, '研究員 K. 的前哨站');
  if (c3.qing && s.chapter2?.choice === 'forget' && !c3.qingTalk) return at(GUIDE_AT, '引路人 · 晴');
  if (c3.bridge) {
    // 0.73: chapter four — K.'s terminal, the stele, the tanks, back to the bridge
    const c4 = normalizeChapter4(s);
    if (!c4.terminal) return at(OUTPOST, '研究員 K. 的前哨站 · 終端機');
    if (!c4.stele) return at({ x: STELE.x, z: STELE.z + 1.8 }, '留言碑');
    if (!c4.tank) return at(door('admin'), '管理區 · 玻璃槽大廳');
    if (!c4.manager) return at(RIFT, '裂縫的核心 · 橋');
    // 0.74 part two: what you would leave is on the lake — 嘯岳 takes you back
    if (onLake4(s)) return at({ x: XIAOYUE_WAITS.x - 2.5, z: XIAOYUE_WAITS.z - 1 }, '嘯岳 · 回到湖區');
    // 0.76: the third way, step by step; otherwise the bridge, to choose
    const step = thirdNext(s);
    if (step === 'k0388') return at(OUTPOST, '研究員 K. 的前哨站 · 叫醒 0388');
    if (step === 'qing') return at(door('admin'), '管理區 · 玻璃槽 B-01');
    if (step === 'stele') return at({ x: STELE.x, z: STELE.z + 1.8 }, '留言碑 · 刻下真相');
    if (step === 'graduation') return at(RIFT, '裂縫最深處 · 關掉「畢業」');
    if (choiceOpen(s)) return at(RIFT, '裂縫的核心 · 橋前的選擇');
    return null;
  }
  if (!c3.cleared.includes(1) || !c3.vision || layerOpen(s, 2) || layerOpen(s, 3) || c3.cleared.includes(3))
    return at(RIFT, '裂縫');
  return null;
}
const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
// Bearing from the player as a compass word (+z is south on the map).
export function bearing(s, g) {
  const a = Math.atan2(g.x - s.player.x, -(g.z - s.player.z));
  return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}
// What the HUD's quest panel shows in the New World.
export function storyPanel(s) {
  // 0.72: in a rift fight, the fight
  const rs = riftStatus(s);
  if (rs)
    return { chapter: 'CHAPTER 03 · 裂縫之外', title: rs.title, quests: [[rs.text, false]], goal: null, goalText: '' };
  const four = chapter4Objectives(s),
    three = chapter3Objectives(s),
    two = [...townObjectives(s), ...chapter2Objectives(s)];
  const inFour = four.length > 0,
    inThree = !inFour && three.length > 0;
  let list = inFour ? four : inThree ? three : two;
  // 0.73: back on the lake, the New World's chapter goes on — with the way back over the mountains first
  // (0.74: except in part two of chapter four, whose steps are on the lake)
  const c4 = inFour ? normalizeChapter4(s) : null,
    two4 = inFour && inPartTwo(s),
    // 0.76: after the last day, the bridge is over the mountains again (until an ending)
    final = two4 && c4.lastDone,
    away = !s.inTown && (!two4 || (final && !c4.ending));
  if (away) list = [['騎嘯岳翻過群山，回到新生之界', false], ...list];
  if (two4 && s.inTown && onLake4(s)) list = [['騎嘯岳回到湖區', false], ...list];
  const open = list.filter(([, d]) => !d);
  const goal = away || (two4 && !s.inTown) ? null : nextGoal(s);
  const lakeStep =
    !two4 || s.inTown
      ? ''
      : !talksDone(s)
        ? '下一步：打開選單 › 御獸倉庫，選一隻夥伴，按「說說話」'
        : !homeDone(s)
          ? '下一步：回到木筏上，走近你親手蓋的設施'
          : !normalizeChapter4(s).xiaoyue
            ? '下一步：打開選單 › 御獸倉庫，選嘯岳，按「說說話」'
            : !normalizeChapter4(s).lastDay
              ? '下一步：回避難所睡一晚'
              : inLastDay(s)
                ? '今天是最後一天：看夕陽、回到你的島、騎著夥伴跑一圈、一起釣魚、陪嘯岳坐在山腳'
                : '';
  return {
    chapter: c4?.ending
      ? '終章 · 結局之後'
      : final
        ? '終章 · 橋前的選擇'
        : two4
          ? 'CHAPTER 04 · 牽絆'
          : inFour
            ? 'CHAPTER 04 · 第二份文件'
            : inThree
              ? 'CHAPTER 03 · 裂縫之外'
              : 'CHAPTER 02 · 新生之界',
    title: open.length ? open[0][0] : list.length ? list[list.length - 1][0] : '慈光港',
    quests: [...list.filter(([, d]) => d).slice(-1), ...open.slice(0, 2)],
    goal,
    // 0.77: after an ending there is no next step, only the lake
    goalText: c4?.ending
      ? '比斯泰德還在：想去哪裡，就去哪裡'
      : lakeStep
        ? lakeStep
        : away
          ? '下一步：派出嘯岳，走上環湖的山腳，按 E 翻山'
          : goal
            ? `下一步：${goal.name} · ${bearing(s, goal)} ${Math.round(Math.hypot(goal.x - s.player.x, goal.z - s.player.z))} m${goal.night && !isNight(s) ? '（夜裡）' : ''}`
            : ''
  };
}
