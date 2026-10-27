// 0.70: the country under the dome — places worth the walk between the pass, the town and the shell. Each has
// something to read the first time (most of them one more crack in the illusion), and the orchard and the river bend
// give a little every day. Pure: reads and changes the state, returns what to show.
import { dayOf, isNight } from './clock.js?v=0.78.0';
import { give } from './bag.js?v=0.78.0';
import { toWorld, PASS, ORCHARD, OLD_TREE } from './dome.js?v=0.78.0';

// local coordinates (see dome.js); `daily`: what it gives once a day; `once`: what it gives the first time
export const SPOTS = [
  {
    id: 'pass',
    name: '嘯岳的山口',
    x: PASS.x + 3,
    z: PASS.z - 3,
    hint: ['整個穹頂都在腳下 · 按 E 眺望', '眺望'],
    first: '從這裡看得見整個穹頂：中間是港城，河從東邊繞過去，遠處的山……還是那麼遠。小路從腳下彎彎地通到城門外。',
    again: '風從山口吹上來，聞起來像剛洗過的床單。這裡的風，連味道都是新的。'
  },
  {
    id: 'orchard',
    name: '無人照料的果園',
    x: ORCHARD.x,
    z: ORCHARD.z + 15,
    hint: ['樹上掛滿果子 · 按 E 摘果子', '摘'],
    daily: { food: 4, water: 1 },
    first: '蘋果樹排得整整齊齊。每一顆果子都一樣大，連被蟲咬過的缺口，都在同一個位置。',
    again: '你摘了幾顆果子。明天，枝頭又會掛滿一模一樣的果子。',
    done: '今天的果子摘過了。枝頭空著，明天才會再長出來。'
  },
  {
    id: 'reeds',
    name: '河灣的蘆葦叢',
    x: 145,
    z: 40,
    hint: ['蘆葦和沖上岸的枯枝 · 按 E 採集', '採集'],
    daily: { fiber: 4, wood: 2 },
    first: '河灣堆著被沖上岸的枯枝。蘆葦長得很好，整整齊齊，好像每天都有人來修剪過。',
    again: '你割了一束蘆葦，撿了幾根枯枝。',
    done: '今天已經採過了。剩下的蘆葦太嫩，明天再來。'
  },
  {
    id: 'shed',
    name: '山坡上的牧舍',
    x: 92,
    z: -62,
    hint: ['門沒有鎖 · 按 E 進去看看', '看看'],
    once: { metal: 3, fiber: 2 },
    first:
      '牧舍裡的工具擺得整整齊齊，像從來沒人用過。牆上釘著一張紙：「No.0098：羊群今天又少了一隻。管理區說這是正常的。我下週就畢業了。」',
    again: '牧舍空著。那張紙還釘在牆上，字跡被曬得有點淡了。'
  },
  {
    id: 'tree',
    name: '刻滿編號的老樹',
    x: OLD_TREE.x,
    z: OLD_TREE.z + 4,
    hint: ['樹皮上刻滿了字 · 按 E 細看', '細看'],
    once: { crystal: 1 },
    first: '樹皮上密密麻麻刻滿了編號：No.0021、No.0098、No.0156……最新的一個，刻痕還是白的：No.0411。',
    again: '你又數了一次。樹上沒有 0412。還沒有。'
  },
  {
    id: 'stars',
    name: '觀星石',
    x: 60,
    z: 205,
    hint: ['平整的大石頭 · 按 E 躺下', '躺下'],
    night: true,
    once: { crystal: 2 },
    day: '一塊平整的大石頭，上面刻著「觀星」兩個字。白天什麼也看不到，晚上再來。',
    first: '你躺在石頭上看星星。那三顆排成一列的星星……在東邊、正中、西邊各出現了一次，一模一樣，像是貼上去的。',
    again: '星星一格一格地排著。你不想再數了。'
  }
];
export const SPOT_HINTS = Object.fromEntries(SPOTS.map(p => ['c:' + p.id, p.hint]));

export function normalizeCountry(s) {
  s.country ??= {};
  s.country.seen ??= [];
  s.country.day ??= {};
  return s.country;
}
// What the interaction list gets: one point per place, ids prefixed so they never clash with the town's.
export function countryPoints(s) {
  normalizeCountry(s);
  return SPOTS.map(p => ({ id: 'c:' + p.id, name: p.name, ...toWorld(p) }));
}
// Using a place. Returns { ok, title, text, got, first, all } — `all` once every place has been seen.
export function visitSpot(s, id) {
  const c = normalizeCountry(s),
    p = SPOTS.find(p => p.id === id || 'c:' + p.id === id);
  if (!p) return { ok: false, error: '這裡什麼也沒有。' };
  if (p.night && !isNight(s)) return { ok: true, title: p.name, text: p.day, got: {} };
  const first = !c.seen.includes(p.id),
    today = dayOf(s);
  let got = {},
    text = first ? p.first : p.again;
  if (first) {
    c.seen.push(p.id);
    if (p.once) got = { ...got, ...p.once };
    s.log.unshift({ day: today, title: '原野 · ' + p.name, text: p.first });
    s.log = s.log.slice(0, 70);
  }
  if (p.daily) {
    if (c.day[p.id] === today) {
      if (!first) text = p.done;
    } else {
      c.day[p.id] = today;
      for (const [k, v] of Object.entries(p.daily)) got[k] = (got[k] || 0) + v;
    }
  }
  if (Object.keys(got).length) give(s, got);
  const all = first && c.seen.length === SPOTS.length;
  if (all) {
    give(s, { crystal: 3 });
    got.crystal = (got.crystal || 0) + 3;
    s.log.unshift({
      day: today,
      title: '原野 · 走遍了',
      text: '穹頂下的每個角落都走過了。地方很美，可是每個地方，都像是照著同一張圖畫出來的。'
    });
  }
  return { ok: true, title: p.name, text, got, first, all };
}
