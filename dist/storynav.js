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
} from './town.js?v=0.61.8';
import { chapter2Objectives, normalizeChapter2, graduated, guideGone } from './chapter2.js?v=0.61.8';
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
} from './chapter3.js?v=0.61.8';
import { isNight } from './clock.js?v=0.61.8';

const door = id => BUILDINGS.find(b => b.id === id).door;
const at = (p, name, night = false) => ({ ...toWorld(p), name, night });
// The one place the story wants you at now (world coordinates), or null.
export function nextGoal(s) {
  const t = s.town || {};
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
  if (c3.bridge) return null;
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
  const three = chapter3Objectives(s),
    two = [...townObjectives(s), ...chapter2Objectives(s)];
  const inThree = three.length > 0;
  const list = inThree ? three : two;
  const open = list.filter(([, d]) => !d);
  const goal = nextGoal(s);
  return {
    chapter: inThree ? 'CHAPTER 03 · 裂縫之外' : 'CHAPTER 02 · 新生之界',
    title: open.length ? open[0][0] : list.length ? list[list.length - 1][0] : '慈光港',
    quests: [...list.filter(([, d]) => d).slice(-1), ...open.slice(0, 2)],
    goal,
    goalText: goal
      ? `下一步：${goal.name} · ${bearing(s, goal)} ${Math.round(Math.hypot(goal.x - s.player.x, goal.z - s.player.z))} m${goal.night && !isNight(s) ? '（夜裡）' : ''}`
      : ''
  };
}
