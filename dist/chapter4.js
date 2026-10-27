// 0.73 第四章（上）· 第二份文件. After the bridge, before choosing: what did Mum sign, who else is still awake in
// here, where did 晴 go, and what the one who runs the place wants. K.'s terminal, joined to the core's shards, shows
// the second document — a consent to end the original body's life support, seven days out. Back in 慈光港, No.0388
// answers on the stele; K.'s master code opens the admin block again, and tank B-01 holds what became of 晴. At the
// bridge the manager speaks a second time: whose release it really is. Pure: reads and changes the state.
import { dayOf } from './clock.js?v=0.78.0';
import { give } from './bag.js?v=0.78.0';
import { normalizeChapter3 } from './chapter3.js?v=0.78.0';
import { homeMemories } from './farewell.js?v=0.78.0';

const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};
export const DEADLINE_DAYS = 7;
export function normalizeChapter4(s) {
  s.chapter4 ??= {};
  const c = s.chapter4;
  c.terminal ??= false; // read the second document at K.'s outpost
  c.deadline ??= 0; // the day the document names
  c.stele ??= false; // No.0388's message, on the stele in 慈光港
  c.tank ??= false; // tank B-01 in the admin block
  c.manager ??= false; // the manager's second word at the bridge: part one's end
  c.extended ??= false; // the date passed, and the manager had them wait
  // 0.74 part two · 牽絆
  c.talked ??= []; // beasts you sat down with
  c.homeSeen ??= []; // things on the raft that brought a day back
  // 0.75
  c.xiaoyue ??= false; // 嘯岳 told you of the one before you
  c.lastDay ??= 0; // the day you woke to the last day (0: not yet)
  c.lastDone ??= false; // that day is over
  c.lastMemories ??= []; // what you did with it: [{ id, text }]
  // 0.76 · the choice at the bridge
  c.path ??= ''; // 'third' once you set out on the third way
  c.third ??= []; // its steps done, in order
  c.ending ??= ''; // 'cross' | 'stay' | 'third'
  return c;
}
export const started4 = s => !!s.chapter3?.bridge;

// ---------- 1 · K.'s terminal, joined to the shards ----------
export const SECOND_DOCUMENT = [
  ['', '三塊碎片貼上前哨站的終端機。螢幕閃了一下，接上了某個很遠的地方。'],
  ['終端機', '慈愛組織 · 家屬文件 · 參與者 0412'],
  ['終端機', '第一份：NW 計畫參與同意書。簽署人：母。'],
  ['終端機', '第二份：原體維持終止同意書。簽署人：母。簽署日期：兩天前。'],
  [
    '終端機',
    '附註：「參與者意識已於新世界安詳生活。原體持續承受痛苦，延長維持並無意義。」執行日期：七天後，上午九點。'
  ],
  ['', '媽媽不是放棄我。她是被告訴：我已經在別的地方，好好地活著了。'],
  ['終端機', '畢業排程：0156（已完成）· 0388 · 0412。'],
  ['終端機', '研究員 K. · 主控權限：有效。'],
  ['嘯岳', '七天。……那個在床上一動也不動的人，0388，也在名單上。']
];
export function readTerminal(s) {
  const c = normalizeChapter4(s);
  if (!started4(s)) return null;
  if (c.terminal)
    return {
      ok: true,
      lines: [['終端機', `原體維持終止 · 執行日期：第 ${c.deadline} 天上午九點。畢業排程：0388 · 0412。`]]
    };
  c.terminal = true;
  c.deadline = dayOf(s) + DEADLINE_DAYS;
  give(s, { crystal: 2 });
  log(
    s,
    '第二份文件',
    `媽媽簽了第二份文件：原體維持終止同意書，執行日期是第 ${c.deadline} 天。組織告訴她，我在新世界過得很好。名單上還有 0388。K. 的主控權限還有效。`
  );
  return { ok: true, lines: SECOND_DOCUMENT, first: true };
}
// How many days are left on the document (0 once the date has passed).
export const daysLeft = s => Math.max(0, (normalizeChapter4(s).deadline || 0) - dayOf(s));
// When the date passes, nothing happens — the manager has them wait. Noted once.
export function tickChapter4(s) {
  const c = normalizeChapter4(s);
  if (!c.terminal || c.extended || c.manager || dayOf(s) < c.deadline) return null;
  c.extended = true;
  log(s, '日期過了', '文件上的日期過了。監測器還在響。終端機上多了一行字：「執行延後 · 核准人：管理者。」他在等我。');
  return '文件上的日期過了……執行延後了。核准人：管理者。';
}

// ---------- 2 · No.0388 on the stele ----------
export const STELE_0388 = [
  ['', '留言碑最下面，多了一行很淺的字，像是用指甲刻的。'],
  ['No.0388', '「有人看得到這行字嗎？我是 0388。我的房間在你的樓下。」'],
  ['No.0388', '「我動不了很久了。可是我聽得到。他們說我下禮拜畢業。」'],
  ['No.0388', '「如果你真的找到了回去的路——幫我跟我女兒說，我一點都不痛。這是我唯一能替她做的事。」'],
  ['', '刻痕的最後，是一個很小的愛心。']
];
export function read0388(s) {
  const c = normalizeChapter4(s);
  if (!c.terminal) return null;
  if (c.stele) return null;
  c.stele = true;
  log(s, 'No.0388', '留言碑上有 0388 刻的字：他動不了，可是聽得到；他要我告訴他女兒，他一點都不痛。');
  return { ok: true, lines: STELE_0388 };
}

// ---------- 3 · tank B-01: what became of 晴 ----------
export const TANK_B01 = {
  truth: [
    ['', '玻璃槽大廳的最左邊，多了一個槽。標籤：B-01 · 0001 · 回收中。'],
    ['', '槽裡漂著的人，是晴。她的眼睛閉著，嘴角好像還帶著那個笑。'],
    ['終端機', '載體 0001：違規協助參與者逃離。處置：意識封存，載體回收。原體維持：繼續（用於家屬報告）。'],
    ['', '她放我走，然後被收回了這裡。可是她的原體，還在療養院裡被「維持」著——好讓報告繼續寄出去。']
  ],
  forget: [
    ['', '玻璃槽大廳的最左邊，有一個空的槽。標籤：B-01 · 0001 · 備用。'],
    ['終端機', '載體 0001：引路人。狀態：服務中。備用載體：已備妥。'],
    ['', '晴還在廣場上笑著發居民證。這個空槽，是替她準備的。等她不再有用的那一天。']
  ]
};
export function seeTankB01(s) {
  const c = normalizeChapter4(s);
  if (!c.terminal) return null;
  const branch = s.chapter2?.choice === 'forget' ? 'forget' : 'truth';
  if (c.tank) return { ok: true, lines: TANK_B01[branch].slice(-1) };
  c.tank = true;
  log(
    s,
    '玻璃槽 B-01',
    branch === 'truth'
      ? '晴被收回了 B-01 號槽：意識封存，載體回收。她的原體還被維持著，只為了讓家屬報告繼續寄出去。'
      : 'B-01 號槽空著，標籤寫著「0001 · 備用」。等晴不再有用的那一天，它就會被裝滿。'
  );
  return { ok: true, lines: TANK_B01[branch], first: true };
}
// K.'s master code: the admin block opens again (any hour) once you have read the terminal.
export const masterAccess = s => normalizeChapter4(s).terminal;

// ---------- 4 · the manager, at the bridge ----------
export const MANAGER_2 = [
  ['', '橋還在。病房的聲音，比上一次更清楚了。'],
  ['管理者', '「你看到第二份文件了。」'],
  ['管理者', '「你媽媽是個好人。她每個禮拜都來，握著那隻手。她累了，0412。她也需要解脫。」'],
  ['管理者', '「你知道『畢業』省下了多少錢嗎？每一個原體，每天的維持費用。董事會很滿意。」'],
  [
    '管理者',
    '「我給你另一條路：留下來。當下一個晴。只要你替我們工作，你的原體就會一直被維持著，你媽媽就會一直收到你在湖邊笑的照片。」'
  ],
  ['你', '……所以「解脫」，是誰的解脫？'],
  ['管理者', '「你慢慢想。我讓他們等你。」'],
  ['嘯岳', '……他說話的時候，沒有味道。像那個盒子。'],
  ['', '橋的另一頭，媽媽在病床邊睡著了。這一次，我看見她手邊有一支筆。']
];
export function managerSpeaks(s) {
  const c = normalizeChapter4(s);
  if (!c.terminal || !c.stele || !c.tank) return null;
  if (c.manager) return { ok: true, again: true };
  c.manager = true;
  log(
    s,
    '第四章（上）完 · 第二份文件',
    '管理者要我留下來，當下一個晴：只要替組織工作，原體就會被維持，媽媽就會繼續收到照片。「解脫」，是誰的解脫？第四章（下）——敬請期待。'
  );
  return { ok: true, lines: MANAGER_2 };
}

// ---------- 0.74 part two · 牽絆: what you would leave ----------
export const inPartTwo = s => !!normalizeChapter4(s).manager;
const beastsOf = s => (s.tamed || []).filter(p => p.kind !== 'creature');
// how many beasts to talk to, and how many places on the raft to walk past
export const talksNeeded = s => Math.min(3, beastsOf(s).length);
export const homeNeeded = s => Math.min(3, homeMemories(s).length);
export function noteTalk(s, id) {
  const c = normalizeChapter4(s);
  if (!c.manager || c.talked.includes(id)) return false;
  c.talked.push(id);
  return true;
}
export function noteHome(s, type) {
  const c = normalizeChapter4(s);
  if (!c.manager || c.homeSeen.includes(type)) return false;
  c.homeSeen.push(type);
  return true;
}
export const talksDone = s => normalizeChapter4(s).talked.length >= talksNeeded(s);
export const homeDone = s => normalizeChapter4(s).homeSeen.length >= homeNeeded(s);
export const partTwoRoundOne = s => inPartTwo(s) && talksDone(s) && homeDone(s);

// ---------- 0.75 · 嘯岳's past ----------
// Long before the organisation, the rift already let people through. One of them heard beasts — she called it by its
// name, built the mountains with the others to close the rift, found the bridge, and went home. She never came back.
export const XIAOYUE_PAST = [
  ['', '嘯岳沒有像平常那樣站起來。牠趴著，看著湖，很久都沒有說話。'],
  ['嘯岳', '你問過我，為什麼一直說「我記得」。'],
  ['嘯岳', '很久以前，在那個盒子還沒有出現的時候，裂縫就已經在了。偶爾，會有人從裡面掉下來。'],
  ['嘯岳', '有一個女孩，叫汐。她聽得懂我。你是第二個。'],
  ['嘯岳', '她和那些築山的人一起，一塊石頭一塊石頭，把群山堆起來，想把裂縫擋住。我幫她搬過最大的那一塊。'],
  ['嘯岳', '後來她找到了橋。她說，另一邊有人在等她。'],
  ['嘯岳', '她走的那天，摸著我的頭說：「你要記得我。」'],
  ['嘯岳', '所以我記得。我在湖邊等了好幾百年。她沒有回來。'],
  ['', '嘯岳終於轉過頭來看你。牠的眼睛，在夕陽裡是金色的。'],
  ['嘯岳', '我不是要你留下來。……我只是想讓你知道：被留下來的那一邊，是什麼感覺。']
];
export const xiaoyueReady = s => {
  const c = normalizeChapter4(s);
  return c.manager && talksDone(s) && homeDone(s) && !c.xiaoyue;
};
export function hearXiaoyue(s) {
  if (!xiaoyueReady(s)) return null;
  normalizeChapter4(s).xiaoyue = true;
  log(
    s,
    '嘯岳記得的人',
    '很久以前，有一個叫汐的女孩聽得懂嘯岳。她和築山的人一起堆起群山，後來走過了橋，再也沒有回來。嘯岳在湖邊等了好幾百年。「你要記得我。」所以牠記得。'
  );
  return { ok: true, lines: XIAOYUE_PAST };
}

// ---------- 0.75 · the last day ----------
// The night after 嘯岳's story you dream of the room at the far end of the bridge — and what going back would cost.
export const COST_DREAM = [
  ['', '你夢見了那間病房。這一次，聲音很清楚。'],
  ['醫生', '「就算醒過來，躺了這麼久，肌肉萎縮得很嚴重。能再走路的機會……不大。」'],
  ['媽媽', '「沒關係。只要他醒過來，我推他。」'],
  ['醫生', '「還有一件事。組織停止支付之後，之前的費用……」'],
  ['媽媽', '「房子我已經在問了。……沒關係的。」'],
  ['', '她說「沒關係」的時候，手一直在抖。'],
  ['', '你醒了。湖面很亮。'],
  ['', '今天，是最後一天。想做什麼都可以。']
];
// After the night: the last day begins. Returns the dream, once.
export function beginLastDay(s) {
  const c = normalizeChapter4(s);
  if (!c.xiaoyue || c.lastDay) return null;
  c.lastDay = dayOf(s);
  log(s, '最後一天', '我夢見了病房：就算醒過來，也許再也走不了路；媽媽說，房子她已經在問了。今天，是最後一天。');
  return { ok: true, lines: COST_DREAM };
}
export const inLastDay = s => {
  const c = normalizeChapter4(s);
  return !!c.lastDay && !c.lastDone && dayOf(s) === c.lastDay;
};
// One memory of the last day (each kind once). Returns its text, or null.
export function noteLastDay(s, id, text) {
  const c = normalizeChapter4(s);
  if (!inLastDay(s) || c.lastMemories.some(m => m.id === id)) return null;
  c.lastMemories.push({ id, text });
  return text;
}
// Each moment of the last day, from where you are and what you are doing:
// ctx { home, hour, island, mounted, mountedFor, foothill, active, xiaoyueOut }
export function tickLastDay(s, ctx) {
  const c = normalizeChapter4(s);
  // the day is over: it is kept, whatever was done with it
  if (c.lastDay && !c.lastDone && dayOf(s) > c.lastDay) {
    c.lastDone = true;
    log(
      s,
      '最後一天 · 過完了',
      c.lastMemories.length
        ? c.lastMemories.map(m => m.text).join(' ')
        : '那一天，我什麼也沒做。只是一直看著湖，好像這樣就能把它記住。'
    );
    return { done: true, count: c.lastMemories.length };
  }
  if (!inLastDay(s)) return null;
  let t = null;
  if (ctx.home && ctx.hour >= 17 && ctx.hour <= 19.6)
    t = noteLastDay(s, 'sunset', '最後一天的夕陽，你坐在木筏的邊上看完了。湖面一點一點變成金色。');
  else if (ctx.island) t = noteLastDay(s, 'island', `你回到了${ctx.island}。你插下的旗子，還在風裡飄。`);
  else if (ctx.mounted && ctx.mountedFor >= 20)
    t = noteLastDay(s, 'ride', `${ctx.active}載著你在湖上跑了一大圈。風很大，你笑出聲來。`);
  else if (ctx.foothill && ctx.xiaoyueOut)
    t = noteLastDay(s, 'foothill', '你和嘯岳坐在山腳，看著湖。牠什麼也沒說，尾巴輕輕掃著你的腳邊。');
  return t ? { memory: t } : null;
}
export const lastDayFish = (s, active, fish) =>
  noteLastDay(s, 'fish', active ? `你和${active}一起釣到了${fish}。牠比你還開心。` : `你一個人釣到了${fish}。`);

// ---------- 0.76 · the choice at the bridge ----------
export const ENDING_NAMES = { cross: '橋的另一頭', stay: '湖邊的微笑', third: '撕開的文件' };
// the third way: wake No.0388, free 晴, carve the truth on the stele, shut 「畢業」 off at the bottom of the rift
export const THIRD_STEPS = [
  ['k0388', '前哨站 · 用主控權限叫醒 0388'],
  ['qing', '管理區 · 玻璃槽 B-01 · 放出晴'],
  ['stele', '留言碑 · 把真相刻上去'],
  ['graduation', '裂縫最深處 · 關掉「畢業」']
];
// the bridge asks you to choose once the last day is over (and until an ending is reached)
export const choiceOpen = s => {
  const c = normalizeChapter4(s);
  return c.lastDone && !c.ending;
};
// the next step of the third way, or null
export const thirdNext = s => {
  const c = normalizeChapter4(s);
  if (c.path !== 'third' || c.ending) return null;
  return THIRD_STEPS.find(([id]) => !c.third.includes(id))?.[0] || null;
};

// ---------- the HUD ----------
export function chapter4Objectives(s) {
  if (!started4(s)) return [];
  const c = normalizeChapter4(s),
    list = [['到前哨站，把碎片接上 K. 的終端機', c.terminal]];
  if (c.terminal) {
    const left = daysLeft(s);
    // 0.77: once the manager has said he will have them wait, the countdown no longer leads the panel
    list.push([
      c.extended
        ? '文件上的日期過了 · 管理者讓他們延後'
        : c.manager
          ? '原體維持終止 · 管理者讓他們等你'
          : `原體維持終止 · 還有 ${left} 天`,
      c.extended || c.manager
    ]);
    list.push(['回慈光港，看留言碑最下面的字', c.stele]);
    list.push(['用 K. 的主控權限進管理區，到玻璃槽大廳', c.tank]);
    if (c.stele && c.tank) list.push(['回到裂縫的核心 · 橋', c.manager]);
  }
  if (c.manager) list.push(['第四章（上）完 · 第二份文件', true]);
  if (c.manager) {
    const t = Math.min(c.talked.length, talksNeeded(s)),
      h = Math.min(c.homeSeen.length, homeNeeded(s));
    if (talksNeeded(s)) list.push([`回到湖區，和夥伴們說說話（${t}/${talksNeeded(s)}）`, talksDone(s)]);
    if (homeNeeded(s)) list.push([`回到木筏上，走一圈你的家（${h}/${homeNeeded(s)}）`, homeDone(s)]);
    if (talksDone(s) && homeDone(s)) {
      list.push(['和嘯岳說說話（御獸倉庫 › 嘯岳）', c.xiaoyue]);
      if (c.xiaoyue) list.push(['睡一晚，迎接最後一天', !!c.lastDay]);
      if (c.lastDay) list.push([`最後一天 · 留下了 ${c.lastMemories.length} 段回憶`, c.lastDone]);
      if (c.lastDone) {
        list.push(['回到橋前，做出選擇', !!(c.ending || c.path)]);
        if (c.path === 'third') for (const [id, t] of THIRD_STEPS) list.push([t, c.third.includes(id)]);
        if (c.ending) list.push([`結局 · ${ENDING_NAMES[c.ending]}`, true]);
      }
    }
  }
  return list;
}
// expose the chapter-3 state for the goal (the bridge stands in the rift's core)
export const bridgeBuilt = s => !!normalizeChapter3(s).bridge;
