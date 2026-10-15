// 0.49 第二章（下）懷疑: the end of chapter two, kept short.
// The day after the admin block's light, a resident "graduates" → the notice board says so → in the empty diner at
// night lies No.0156's resident card with a staff key on its back → inside the admin block: the monitors, the fake
// family reports, the graduation list ("recycled"), a tank holding a body with your face, the truth about contracts
// → 晴 finds you and offers to help you forget. Forget, or demand the truth: either way chapter two ends.
// See docs/STORY.md.
import { dayOf, isNight } from './clock.js?v=0.59.1';

export function normalizeChapter2(s) {
  s.chapter2 ??= {};
  const c = s.chapter2;
  c.stage ??= 0; // 0 before part two · 1 a resident graduated · 2 notice read · 3 holding the key · 4 inside · 5 over
  c.since ??= null; // the day part one ended
  c.choice ??= null; // 'forget' | 'truth'
  if (c.stage === 0 && s.town?.adminSeen) {
    c.stage = 1;
    c.since = s.town.adminDay ?? dayOf(s);
  }
  return c;
}
const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};
const fail = error => ({ ok: false, error });
// No.0156 graduates the day after part one ends.
export const graduated = s => {
  const c = normalizeChapter2(s);
  return c.since != null && dayOf(s) > c.since;
};
export const GRADUATE = 'No.0156';
export const GRADUATED_TEXT = '（這位居民已「畢業」，前往更好的地方。）';

export const NOTICE_2 = [
  '慈愛公告 · 第 2 號',
  `恭喜居民 ${GRADUATE} 完成新生，順利「畢業」，前往更好的地方。`,
  '請大家為他獻上祝福。',
  '畢業是每一位居民的目標。',
  '慈愛組織，與你同在。'
];
export function readNotice(s) {
  const c = normalizeChapter2(s);
  if (!graduated(s)) return { ok: true, lines: null };
  if (c.stage < 2) {
    c.stage = 2;
    log(
      s,
      '慈愛公告 · 第 2 號',
      `${GRADUATE} 「畢業」了。就是在留言碑上寫「別相信——」的那個人。留言碑上他的字，一夜之間全被磨平了。`
    );
  }
  return { ok: true, lines: NOTICE_2, first: c.stage === 2 };
}
// In the empty diner at night: No.0156's resident card, a staff key taped to its back.
export function searchDiner(s) {
  const c = normalizeChapter2(s);
  if (c.stage !== 2) return null;
  if (!isNight(s)) return { ok: true, message: '湯已經涼了。桌子底下好像卡著什麼……太亮了，看不清楚。晚上再來。' };
  c.stage = 3;
  log(
    s,
    `${GRADUATE} 的居民證`,
    `桌子底下卡著一張居民證：${GRADUATE}。背面用膠帶黏著一張白色的卡片，印著太陽徽章——管理區的門禁卡。卡片邊緣刻了一行小字：「去看槽。」`
  );
  return { ok: true, found: true };
}
export const DINER_FIND = [
  ['', '桌子底下卡著一張居民證。照片上的人很瘦，對著鏡頭笑。'],
  ['', `${GRADUATE}。就是留言碑上寫「別相信——」的那個人。`],
  ['', '背面用膠帶黏著一張白色的卡片，印著太陽徽章——管理區的門禁卡。'],
  ['', '卡片邊緣刻了一行很小的字：「去看槽。」']
];

// Inside the admin block. One scene after another; the last asks you to choose.
export const ADMIN_SCENES = [
  ['', '門禁卡一刷，門無聲地滑開。裡面很冷，像醫院。'],
  ['', '牆上一整排螢幕，每一格都是一個房間——公寓的房間。0388 號房的床上躺著一個人，一動也不動。不是在睡覺。'],
  [
    '終端機',
    'NWP 適應監測 · 載體 0412 · 適應率 88%。家屬端週報：自動生成中。附件：〈湖邊微笑_week3.png〉——來源：載體視覺紀錄＋表情合成。'
  ],
  ['', '湖邊笑的照片。媽媽貼在冰箱上的那一張。是他們做出來的。'],
  [
    '終端機',
    `畢業名單 · ${GRADUATE}：適應失敗。狀態：回收。意識資料封存，載體送回培育槽。家屬端：「已安詳離世」通知已寄出。`
  ],
  ['', '走廊盡頭是一排玻璃槽。淡綠色的液體裡，漂著一具一具的身體。'],
  ['', 'B-12 號槽的標籤寫著：「0412 · 備用載體 · 第 2 號」。槽裡那張臉……是我的臉。'],
  ['終端機', '伴生體計畫：以契約連結異晶突變生物與載體，可穩定意識錨定。契約書規格：前導觀測員 K.。'],
  ['你', '我跟御獸的契約……也是他們的實驗？'],
  ['', '我不是轉生的。這個身體，是他們做的。'],
  ['晴', '……0412。這麼晚了，你不該在這裡。'],
  ['晴', '你看到的那些，都是真的。可是你在這裡，不會痛。外面的你，每一天都在痛。'],
  ['晴', '你媽媽每週都去看你。她握著你的手——那隻手，已經不會動了。'],
  ['晴', '我可以幫你忘記今晚。明天早上醒來，你還是那個在湖邊笑的人。']
];
export function enterAdmin(s) {
  const c = normalizeChapter2(s);
  if (c.stage < 3) return null;
  if (c.stage >= 5) return { ok: true, message: '門禁卡已經刷不開了。門上的太陽徽章，暗了。' };
  if (!isNight(s)) return { ok: true, message: '白天門口有人進出的腳步聲。晚上再來。' };
  c.stage = 4;
  return { ok: true, scenes: ADMIN_SCENES };
}
export const ENDINGS = {
  forget: {
    title: '第二章 完 · 遺忘',
    scenes: [
      ['晴', '……晚安，0412。'],
      ['', '醒來的時候，我躺在 0412 號房。窗台上的花又被澆過了。'],
      ['', '日誌裡有幾頁是空白的。最後一頁，是我自己的字：「別相信晴。去城門外找嘯岳。」'],
      ['嘯岳', '你身上有那個盒子的味道。……你忘了什麼，對吧？'],
      ['嘯岳', '沒關係。我記得。']
    ],
    log: '我醒在 0412 號房，日誌少了幾頁。最後一頁是我自己的字：「別相信晴。去城門外找嘯岳。」嘯岳說，牠記得。第三章——敬請期待。'
  },
  truth: {
    title: '第二章 完 · 穹頂之外',
    scenes: [
      ['你', '我要知道真相。'],
      ['廣播', '「0412 號越權存取。啟動記憶調整程序。」'],
      ['晴', '……快走。去城門。別回頭。'],
      ['', '整座城的燈同時熄了。我一路跑到城門，嘯岳已經站了起來。'],
      ['嘯岳', '我說過，這裡的味道不對。抓緊。'],
      ['', '嘯岳撲向城門外的空氣——爪子底下，傳來玻璃碎裂的聲音。'],
      ['', '天空裂開一道縫。縫的另一邊，是那道紫色的裂縫，和真正的、比斯泰德的天空。']
    ],
    log: '晴放走了我。嘯岳撕開了穹頂，縫的另一邊是紫色的裂縫和真正的天空。我不是轉生的——我是 0412 號載體。第三章——敬請期待。'
  }
};
export function choose(s, choice) {
  const c = normalizeChapter2(s);
  if (c.stage !== 4 || !ENDINGS[choice]) return fail('現在沒有要選擇的事。');
  c.stage = 5;
  c.choice = choice;
  const e = ENDINGS[choice];
  log(s, e.title, e.log);
  return { ok: true, ending: e };
}
// After the truth, 晴 is gone and the shell over the gate stays cracked.
export const guideGone = s => s.chapter2?.choice === 'truth';
// 0.50: in the forget branch 嘯岳 tears it later (chapter3.js sets chapter3.torn)
export const domeCracked = s => s.chapter2?.choice === 'truth' || !!s.chapter3?.torn;
export const AFTER_FORGET = [['晴', '你今天氣色很好，0412。昨晚睡得好嗎？']];

export function chapter2Objectives(s) {
  const c = normalizeChapter2(s);
  if (c.stage < 1) return [];
  const list = [[`${GRADUATE} 不見了……公告板上有新的公告`, c.stage >= 2 && graduated(s)]];
  if (c.stage === 1 && !graduated(s)) list[0] = ['（隔天，城裡好像少了一個人）', false];
  if (c.stage >= 2) list.push(['夜裡，到空無一人的餐館找找看', c.stage >= 3]);
  if (c.stage >= 3) list.push(['夜裡，用門禁卡進入管理區', c.stage >= 4]);
  if (c.stage >= 4) list.push(['做出選擇', c.stage >= 5]);
  if (c.stage >= 5) list.push([ENDINGS[c.choice].title, true]);
  return list;
}
