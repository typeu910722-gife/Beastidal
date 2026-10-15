// 0.47 抵達新生之界: 慈光港, the first town past the mountains. Chapter two, part one.
// Everything here is free and gentle, and the town is full of signs of life — but the only person you ever see is
// the guide. The rules of the town live here; town-models.js draws it, game.js wires it up. See docs/STORY.md.
import { dayOf, isNight } from './clock.js?v=0.54.0';
import { give } from './bag.js?v=0.54.0';
import { TOWN, toWorld, toLocal, countryWalkable } from './dome.js?v=0.54.0';
export { TOWN, toWorld };

// The town sits in its own corner of the world, like the garden maze and the cabin, in the open country under the
// dome (dome.js). Local coordinates are metres from the plaza's centre; +z is south, towards the gate.
export const TOWN_NAME = '慈光港';
export const GUIDE_NAME = '晴';
export const WALL = 46; // the town wall's half-width; the gate is the gap in its south side
export const GATE_HALF = 4.5;

// Buildings are solid boxes (local centre, width along x, depth along z). `door` is where you stand to use one.
export const BUILDINGS = [
  { id: 'welcome', name: '新生歡迎中心', x: 0, z: -32, w: 24, d: 12, h: 9, door: { x: 0, z: -24 } },
  { id: 'apartment', name: '居民公寓', x: 31, z: 8, w: 14, d: 26, h: 14, door: { x: 22.5, z: 8 } },
  { id: 'ration', name: '配給站', x: -30, z: -8, w: 12, d: 10, h: 5, door: { x: -22.5, z: -8 } },
  { id: 'kiosk', name: '家書亭', x: -26, z: 18, w: 5, d: 5, h: 4, door: { x: -22, z: 18 } },
  { id: 'admin', name: '管理區', x: 32, z: -31, w: 14, d: 12, h: 11, door: { x: 24, z: -31 } },
  { id: 'diner', name: '空無一人的餐館', x: -30, z: 35, w: 12, d: 8, h: 5, door: { x: -30, z: 30 } },
  // houses along the wall: windows lit, doors shut
  { id: 'house-1', x: 12, z: 38, w: 9, d: 7, h: 6 },
  { id: 'house-2', x: 30, z: 37, w: 9, d: 8, h: 7 },
  { id: 'house-3', x: -14, z: 38, w: 8, d: 7, h: 6 },
  { id: 'house-4', x: -38, z: -30, w: 8, d: 10, h: 7 },
  { id: 'house-5', x: -14, z: -40, w: 10, d: 6, h: 6 },
  { id: 'house-6', x: 14, z: -40, w: 10, d: 6, h: 6 }
];
export const STATUE = { x: 0, z: 0, r: 2.6 };
export const STELE = { x: 12, z: 20, r: 0.9 };
export const BOARD = { x: -10, z: -18, r: 0.8 };
// 嘯岳 will not come in; it waits just outside the gate, and from there carries you back over the mountains
export const XIAOYUE_WAITS = { x: 8, z: 54 };
export const ARRIVE_AT = { x: 0, z: 52 };

// Where you can walk, in world coordinates: the streets inside the wall, out through the gate, and the open country
// under the dome (0.48).
export function townWalkable(x, z, pad = 0.35, open = false) {
  const p = toLocal(x, z);
  if (!countryWalkable(p.x, p.z, pad, open)) return false;
  // the wall: a band round the town, open only at the gate
  const W = WALL,
    t = 0.5 + pad,
    inX = Math.abs(p.x) < W + t,
    inZ = p.z > -W - t && p.z < W + t;
  if (inX && inZ) {
    const onWall =
      Math.abs(Math.abs(p.x) - W) < t ||
      Math.abs(p.z + W) < t ||
      (Math.abs(p.z - W) < t && Math.abs(p.x) > GATE_HALF - pad);
    if (onWall) return false;
  }
  for (const b of BUILDINGS)
    if (Math.abs(p.x - b.x) < b.w / 2 + pad && Math.abs(p.z - b.z) < b.d / 2 + pad) return false;
  for (const c of [STATUE, STELE, BOARD]) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + pad) return false;
  return true;
}
export const insideWalls = s => {
  const p = toLocal(s.player.x, s.player.z);
  return Math.abs(p.x) < WALL && Math.abs(p.z) < WALL;
};

// ---------- state ----------
export function normalizeTown(s) {
  s.town ??= {};
  const t = s.town;
  t.visited ??= false;
  t.met ??= false; // talked to the guide: holds the resident card and the handbook
  t.room ??= false;
  t.rationDay ??= 0; // the last day a ration was taken
  t.rations ??= 0;
  t.stele ??= false;
  t.letters ??= 0; // letters read
  t.letterFrom ??= 0; // the day the first letter arrived (set when you meet the guide)
  t.adminSeen ??= false; // the light in the admin block at night: the end of part one
  t.seen ??= [];
  return t;
}
const fail = error => ({ ok: false, error });
const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};

// Into town over the mountains, and back to the lake on 嘯岳's back.
export function enterTown(s) {
  const t = normalizeTown(s);
  s.townReturn ??= { x: s.player.x, z: s.player.z };
  s.inTown = true;
  s.inCave = false;
  Object.assign(s.player, { ...toWorld(ARRIVE_AT), heading: Math.PI, level: 0, mode: 'foot' });
  if (s.expedition) Object.assign(s.expedition, { mounted: false, diving: false, depth: 0 });
  const first = !t.visited;
  if (first) {
    t.visited = true;
    log(
      s,
      '新生之界 · ' + TOWN_NAME,
      '山下是一座港城。街道乾淨，窗戶都亮著燈，門口擺著鞋子——可是一個人都沒有。城門上刻著：「歡迎回家。」'
    );
  }
  return { ok: true, first };
}
export function leaveTown(s) {
  if (!s.inTown) return fail('你不在新生之界。');
  s.inTown = false;
  const back = s.townReturn || { x: 0, z: 0 };
  Object.assign(s.player, { x: back.x, z: back.z, mode: 'foot', level: 0 });
  s.townReturn = null;
  return { ok: true, message: '嘯岳背著你越過山脊，回到了湖岸。' };
}

// ---------- the guide ----------
export const GUIDE_AT = { x: 0, z: -21 };
export const GUIDE_SCRIPT = {
  first: [
    ['晴', '歡迎回家，0412 號。……啊，抱歉。我是說——歡迎來到新生之界。'],
    ['晴', '我是引路人，晴。從今天起，你在這裡的生活，由我們來照顧。'],
    ['你', '你……知道我是誰？'],
    ['晴', '當然。你吃了很多苦——從那天早上的雨開始。'],
    ['', '（我從來沒有跟任何人說過那天在下雨。）'],
    ['晴', '這裡的每一位居民，都是被選中的人。這裡不會再有痛苦。'],
    ['晴', '這是你的居民證，和新生者手冊。公寓 0412 號房已經為你準備好了；配給站每天都能免費領取口糧和水。'],
    ['晴', '還有——你的家人寫了信給你。到家書亭就能讀。'],
    ['你', '家人？可是我已經……'],
    ['晴', '在新生之界，沒有什麼是真正失去的。']
  ],
  again: [
    [['晴', '住得還習慣嗎？有任何需要，都可以來找我。']],
    [['晴', '別擔心其他居民。大家只是還不習慣見面而已。']],
    [['晴', '你的家人很好。我們每週都會去看他們。']],
    [['晴', '慈愛組織，與你同在。']],
    [['晴', '晚上請早點休息。管理區？那裡只是辦公室，沒什麼好看的。']]
  ],
  xiaoyue: [['嘯岳', '這裡的味道不對。像研究員的盒子，像沒有風的湖。我不進去——我在城外等你。']]
};
export function meetGuide(s) {
  const t = normalizeTown(s);
  if (!t.met) {
    t.met = true;
    t.letterFrom = dayOf(s);
    give(s, { food: 4, water: 4 });
    log(
      s,
      '引路人 · ' + GUIDE_NAME,
      '她叫我 0412——和夢裡那個聲音說的數字一樣。她還知道那天早上在下雨。我領到了居民證和新生者手冊。'
    );
    return { ok: true, script: 'first' };
  }
  const lines = GUIDE_SCRIPT.again;
  return { ok: true, lines: lines[dayOf(s) % lines.length] };
}

// ---------- the room, the rations, the stele, the letters ----------
export function useRoom(s) {
  const t = normalizeTown(s);
  if (!t.met) return fail('門上的名牌寫著「0412」。門鎖著——也許該先去歡迎中心。');
  if (!t.room) {
    t.room = true;
    log(s, '公寓 0412 號房', '房間很乾淨，床鋪好了，衣櫃裡的衣服是我的尺寸。窗台上有一盆剛澆過水的花。');
    return { ok: true, first: true, message: '0412 號房是你的了。晚上可以在這裡睡到天亮。' };
  }
  return { ok: true, message: isNight(s) ? '夜深了，可以睡了。' : '房間和早上離開時一模一樣。花又被澆過了。' };
}
export const RATION = { food: 3, water: 3 };
export function takeRation(s) {
  const t = normalizeTown(s);
  if (!t.met) return fail('窗口後面沒有人。櫃台上寫著：「請先完成居民登記。」');
  if (t.rationDay === dayOf(s)) return fail('今天的配給已經領過了。明天再來。');
  t.rationDay = dayOf(s);
  t.rations++;
  const got = give(s, RATION);
  if (t.rations === 1) log(s, '配給站', '窗口後面沒有人，配給卻已經裝好袋了。口糧的味道很淡，淡得像……醫院的流質。');
  return { ok: true, rewards: got, message: '領到今天的配給：口糧 3、淡水 3。一毛錢都不用付。' };
}
// Messages from other residents. They can be read, not answered — not yet (part three).
export const STELE_POSTS = [
  ['No.0388', '第 3 天。有人晚上也會聽到嗶嗶聲嗎？'],
  ['No.0251', '配給站的口糧，味道跟醫院的流質一模一樣。'],
  ['No.0409', '我在湖邊住了 40 天才翻過山。你們呢？'],
  ['No.0197', '公寓很好。可是我從來沒在走廊遇過任何人。'],
  ['No.0330', '晴小姐說我女兒過得很好。我好想她。'],
  ['No.0172', '有沒有人知道，「山的另一邊」再過去是什麼？'],
  ['No.0156', '別相信——'],
  ['', '（No.0156 的留言後半段被磨掉了，刻痕很新。）']
];
export function readStele(s) {
  const t = normalizeTown(s);
  const first = !t.stele;
  if (first) {
    t.stele = true;
    log(s, '留言碑', '石碑上刻滿了其他居民的留言。他們都在這座城裡——可是我一個人也沒見過。有一則留言被磨掉了。');
  }
  return { ok: true, first, posts: STELE_POSTS };
}
export const BOARD_LINES = [
  '慈愛公告 · 第 1 號',
  '新生之界歡迎每一位被選中的居民。',
  '配給、住所、醫療，全部免費。',
  '請不要擔心家人——我們每週都會探望他們。',
  '請居民不要進入管理區。',
  '慈愛組織，與你同在。'
];
// The family letters: one a week from the day you met the guide. Each is warm, and each has something wrong with it.
export const LETTERS = [
  {
    from: '媽媽',
    text: '孩子，你在那邊好嗎？慈愛的晴小姐說你很快就能適應。家裡一切都好，你不用擔心。你出門前說到公司再打給我，媽一直在等那通電話。現在知道你過得好，就夠了。',
    wake: '（那則訊息……我根本沒有寄出去。媽怎麼會知道我要說什麼？）'
  },
  {
    from: '媽媽',
    text: '醫生說你的狀況越來越好，報告上說你在那邊交到朋友了，還有一張你在湖邊笑的照片。媽媽把它貼在冰箱上。慈愛的人每週都來，費用的事你不要放在心上。',
    wake: '（湖邊笑的照片。夢裡那個溫和的聲音，也說過一模一樣的話。）'
  },
  {
    from: '媽媽',
    text: '他們說，你在那邊不會再痛了。媽媽有時候會想，如果你醒過來，會不會反而比較痛？……對不起，媽媽不該這樣寫。你在那邊快樂就好。',
    wake: '（「醒過來」。如果我已經死了，要從哪裡醒過來？）'
  }
];
export const lettersReady = s => {
  const t = normalizeTown(s);
  if (!t.met) return 0;
  return Math.min(LETTERS.length, 1 + Math.floor((dayOf(s) - t.letterFrom) / 7));
};
export function readLetter(s) {
  const t = normalizeTown(s);
  if (!t.met) return fail('亭子裡的信箱都上了鎖。每一格都貼著一個編號。');
  const ready = lettersReady(s);
  if (t.letters >= ready)
    return t.letters >= LETTERS.length
      ? fail('信箱是空的。')
      : fail(`0412 號信箱是空的。下一封信大約在第 ${t.letterFrom + t.letters * 7} 天送到。`);
  const letter = LETTERS[t.letters++];
  log(s, '家書 · ' + letter.from, letter.text);
  return { ok: true, letter, n: t.letters };
}
// The diner: a meal half eaten, still warm. Nobody there.
export function lookDiner(s) {
  const t = normalizeTown(s);
  if (!t.seen.includes('diner')) {
    t.seen.push('diner');
    log(s, '空無一人的餐館', '桌上有一碗吃到一半的湯，還在冒煙。椅子是拉開的，好像有人剛剛站起來。');
  }
  return { ok: true, message: '桌上有一碗吃到一半的湯，還在冒煙。椅子是拉開的，好像有人剛剛站起來。' };
}
// The admin block: locked. At night, after the first letter, its light is the end of part one.
export function lookAdmin(s) {
  const t = normalizeTown(s);
  if (!isNight(s)) return { ok: true, message: '「管理區 · 僅限職員」。門是鎖著的，窗戶貼著霧面紙。' };
  if (!t.adminSeen && t.letters > 0) {
    t.adminSeen = true;
    t.adminDay = dayOf(s); // part two (chapter2.js) counts from here
    log(
      s,
      '第二章（上）完 · 慈光',
      '深夜，管理區的門縫裡透出白光。裡面有人在說話，一個聲音很冷，我好像在哪裡聽過。整座城只有這裡，真的有人。'
    );
    return { ok: true, end: true, message: '門縫裡透出白光，裡面有人在說話。……那個冰冷的聲音，我在夢裡聽過。' };
  }
  return { ok: true, message: '門縫裡透出白光。裡面有人在說話，聽不清楚。' };
}

// What the town can be used for, as interaction points (world coordinates).
export function townPoints(s) {
  const t = normalizeTown(s);
  const P = (id, name, p) => ({ id, name, ...toWorld(p) });
  const by = id => BUILDINGS.find(b => b.id === id).door;
  return [
    P('guide', '引路人 · ' + GUIDE_NAME, GUIDE_AT),
    P('room', t.room ? '公寓 0412 號房' : '居民公寓', by('apartment')),
    P('ration', '配給站', by('ration')),
    P('kiosk', '家書亭', by('kiosk')),
    P('stele', '留言碑', { x: STELE.x, z: STELE.z + 1.8 }),
    P('board', '慈愛公告板', { x: BOARD.x, z: BOARD.z + 1.6 }),
    P('diner', '空無一人的餐館', by('diner')),
    P('admin', '管理區 · 僅限職員', by('admin')),
    P('xiaoyue', '嘯岳 · 回到湖區', { x: XIAOYUE_WAITS.x - 2.5, z: XIAOYUE_WAITS.z - 1 })
  ];
}

// What the interaction card says for each place: the subtitle, and the verb on the button.
export const TOWN_HINTS = {
  guide: ['慈愛組織的引路人 · 按 E 交談', '交談'],
  room: ['你的房間 · 按 E 進門', '進門'],
  ration: ['每日免費配給 · 按 E 領取', '領取'],
  kiosk: ['0412 號信箱 · 按 E 查看', '查看'],
  stele: ['居民的留言 · 按 E 閱讀', '閱讀'],
  board: ['慈愛組織的公告 · 按 E 閱讀', '閱讀'],
  diner: ['門開著，燈也亮著 · 按 E 看看', '看看'],
  admin: ['門是鎖著的 · 按 E 靠近', '靠近'],
  xiaoyue: ['牠在城門外等你 · 按 E 回到湖區', '回去'],
  // 0.50: past the dome
  outpost: ['廢棄的前哨站 · 按 E 聽錄音', '聽'],
  rift: ['發光的裂縫 · 按 E 進入', '進入'],
  tear: ['嘯岳撕開的裂口', '查看']
};
// Chapter two, part one, for the story tab.
export function townObjectives(s) {
  if (!s.town?.visited) return [];
  const t = normalizeTown(s);
  return [
    [`抵達新生之界 · ${TOWN_NAME}`, true],
    [`和引路人${GUIDE_NAME}交談（新生歡迎中心前）`, t.met],
    ['入住居民公寓 0412 號房', t.room],
    ['到配給站領取配給', t.rations > 0],
    ['讀廣場上的留言碑', t.stele],
    ['到家書亭讀家人的信', t.letters > 0],
    ['夜裡，管理區還亮著燈……', t.adminSeen]
  ];
}
