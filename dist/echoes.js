// 0.46 適應期的裂痕: the first cracks in "I was reborn". Nothing here says it out loud yet.
// The truth (docs/STORY.md): 慈愛組織 told the family their son lives on in a painless computer simulation. In
// fact his mind was uploaded into a clone grown on the real continent of 比斯泰德; the lake is the adaptation zone.
// Two kinds of clue leak through:
//   · echoes — voices from the hospital room where his original body is kept alive, heard in sleep;
//   · the laptop — once its three parts are found, it recovers data that should not exist on a dead man's laptop.
import { dayOf } from './clock.js?v=0.65.0';

// Each echo unlocks with progress and is heard the next time you sleep: one per night, the earliest unlocked one.
export const ECHOES = [
  {
    id: 'monitor',
    when: () => true,
    voice: '……',
    line: '嗶。嗶。嗶。——很規律的電子音，像是從很遠的地方傳來。',
    wake: '（又是那個聲音。這片湖上沒有任何會發出這種聲音的東西。）'
  },
  {
    id: 'nurse',
    when: s => !!s.buoyFound,
    voice: '陌生的女聲',
    line: '「血壓九十、六十，血氧九十四。……他今天眉頭皺了一下，你有看到嗎？」',
    wake: '（醒來的時候，額頭上好像還留著一隻手的溫度。）'
  },
  {
    id: 'mother',
    when: s => (s.tamed || []).length > 0,
    voice: '媽媽',
    line: '「醫生說再這樣下去，費用……慈愛那邊的人說，他們全部負擔。一毛都不用我們出。」',
    wake: '（媽……？轉生之後，我已經很久沒有想起她的聲音了。）'
  },
  {
    id: 'consent',
    when: s => !!s.device?.laptop,
    voice: '溫和的男聲',
    line: '「這是家屬同意書，第三頁請簽在這裡。參與者編號 0412。請放心，NW 計畫只是讓他在電腦模擬的世界裡，過沒有痛苦的生活。」',
    wake: '（0412。筆電開機畫面的角落，好像也有這串數字。）'
  },
  {
    id: 'report',
    when: s => dayOf(s) >= 5 || !!s.ship,
    voice: '溫和的男聲',
    line: '「這是他本週的狀態報告。您看這張——他在湖邊笑得很開心。模擬世界裡，他交到朋友了。」',
    wake: '（我在湖邊笑……有人在看著我嗎？還是只是夢？）'
  },
  {
    id: 'carrier',
    when: s => !!s.echoes?.repaired,
    voice: '冰冷的聲音',
    line: '「0412 號載體，適應率 71%，意識錨定穩定。原體維持基本生命徵象即可，不需要治療。家屬端報告照常生成。」',
    wake: '（載體。原體。……這不是醫院的聲音。這個聲音，離我很近。）'
  },
  {
    id: 'finger',
    when: s => (s.story?.stage || 0) >= 3,
    voice: '媽媽',
    line: '「他們說你的手指今天動了一下。報告上寫著『神經反應改善』。媽媽每天都來，你一定要醒過來喔。」',
    wake: '（我的手指……我低頭看自己的手。它一直都在動啊。）'
  },
  {
    id: 'gate',
    when: s => (s.story?.stage || 0) >= 5,
    voice: '冰冷的聲音',
    line: '「0412 號適應期即將結束。準備開放新生之界接入。——別讓他知道山的另一邊是真的。」',
    wake: '（山的另一邊。嘯岳說過，牠能越過群山。）'
  }
];

// The laptop's three missing parts and where each turns up.
export const LAPTOP_PARTS = {
  power: { name: '電源模組', where: '漂流寶箱' },
  memory: { name: '記憶晶片', where: '棕櫚環礁的漂流者寶箱' },
  antenna: { name: '訊號天線', where: '沉城遺島的御獸文明石碑' }
};
const PART_SOURCE = { 'palm-cache': 'memory', archive: 'antenna' };

// What the repaired laptop recovers. The protagonist reads it as a broken machine scrambling its data.
export const RESTORED_LINES = [
  '磁碟修復完成 · 可讀取 98%。',
  '系統標頭：NWP-0412 · 適應期監測 · 終端已連線。',
  '────────────',
  '[已還原郵件] 寄件人：慈愛組織 · 家屬關懷專員',
  '主旨：關於令郎參與 NW 計畫之說明',
  '「……本計畫以電腦模擬環境，使病患在無痛狀態下延續生活。醫療費用由本會全額負擔，',
  '並每週提供狀態報告予家屬……」（以下無法讀取）',
  '────────────',
  '未寄出的訊息：「媽，我到公司再打給你。」',
  '訊息狀態：已讀。',
  '────────────',
  'GPS：衛星訊號 0。本地網路「NWP-LAKE」已連線。',
  '星圖比對：觀測資料吻合，誤差 0.00%。非模擬資料。'
];

export function normalizeEchoes(s) {
  s.echoes ??= {};
  const e = s.echoes;
  e.heard ??= [];
  e.parts ??= [];
  e.repaired ??= false;
  // saves from before 0.46 that already opened these places get their parts
  const done = s.expedition?.collected || [];
  for (const [site, part] of Object.entries(PART_SOURCE))
    if (done.includes(site) && !e.parts.includes(part)) e.parts.push(part);
  return e;
}
const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};

// Called when you wake from a night's sleep: the next unlocked echo you have not heard yet, or null.
export function echoOnWake(s) {
  const e = normalizeEchoes(s);
  const next = ECHOES.find(x => !e.heard.includes(x.id) && x.when(s));
  if (!next) return null;
  e.heard.push(next.id);
  log(s, '回聲 · ' + next.voice, next.line);
  return next;
}
export const heardEchoes = s => ECHOES.filter(x => normalizeEchoes(s).heard.includes(x.id));

// A part turns up: from the first drift chest (power), or from a site explored (memory / antenna).
export function findPart(s, part) {
  const e = normalizeEchoes(s);
  if (!LAPTOP_PARTS[part] || e.parts.includes(part)) return null;
  e.parts.push(part);
  const have = e.parts.length;
  const text = `找到筆電的${LAPTOP_PARTS[part].name}（${have}/3）。${have === 3 ? '零件湊齊了，回書桌修好它。' : ''}`;
  log(s, '筆電零件', text);
  return text;
}
export const partForSite = id => PART_SOURCE[id] || null;
export const missingParts = s => Object.keys(LAPTOP_PARTS).filter(k => !normalizeEchoes(s).parts.includes(k));

export function repairLaptop(s) {
  const e = normalizeEchoes(s);
  if (e.repaired) return { ok: false, error: '筆電已經修好了。' };
  const missing = missingParts(s);
  if (missing.length) return { ok: false, error: `還缺：${missing.map(k => LAPTOP_PARTS[k].name).join('、')}。` };
  e.repaired = true;
  log(
    s,
    '筆電修好了',
    '磁碟救回來了，但裡面的東西不對勁：一封寄給家屬的信、一則「已讀」的訊息、一張和這片天空完全吻合的星圖。壞掉的電腦連星星都在亂講——應該吧。'
  );
  return { ok: true, lines: RESTORED_LINES };
}
