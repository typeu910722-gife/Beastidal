// 0.73 第四章（上）· 第二份文件. After the bridge, before choosing: what did Mum sign, who else is still awake in
// here, where did 晴 go, and what the one who runs the place wants. K.'s terminal, joined to the core's shards, shows
// the second document — a consent to end the original body's life support, seven days out. Back in 慈光港, No.0388
// answers on the stele; K.'s master code opens the admin block again, and tank B-01 holds what became of 晴. At the
// bridge the manager speaks a second time: whose release it really is. Pure: reads and changes the state.
import { dayOf } from './clock.js?v=0.73.0';
import { give } from './bag.js?v=0.73.0';
import { normalizeChapter3 } from './chapter3.js?v=0.73.0';

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

// ---------- the HUD ----------
export function chapter4Objectives(s) {
  if (!started4(s)) return [];
  const c = normalizeChapter4(s),
    list = [['到前哨站，把碎片接上 K. 的終端機', c.terminal]];
  if (c.terminal) {
    const left = daysLeft(s);
    list.push([c.extended ? '文件上的日期過了 · 管理者讓他們延後' : `原體維持終止 · 還有 ${left} 天`, c.extended]);
    list.push(['回慈光港，看留言碑最下面的字', c.stele]);
    list.push(['用 K. 的主控權限進管理區，到玻璃槽大廳', c.tank]);
    if (c.stele && c.tank) list.push(['回到裂縫的核心 · 橋', c.manager]);
  }
  if (c.manager) list.push(['第四章（上）完 · 第二份文件', true]);
  return list;
}
// expose the chapter-3 state for the goal (the bridge stands in the rift's core)
export const bridgeBuilt = s => !!normalizeChapter3(s).bridge;
