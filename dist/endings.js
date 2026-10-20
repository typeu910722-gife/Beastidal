// 0.76 第四章（下）· 橋前的選擇. After the last day, the bridge asks you to choose: walk across and wake in the hospital
// bed, stay and become the next 晴, or take the third way — wake No.0388, free 晴, carve the truth on the stele and
// shut 「畢業」 off at the bottom of the rift — after which Mum tears the second document up with the pen. Each ending
// closes on an epilogue written from your own save: what each beast does after, by its bond; what you did with the
// last day; the numbers of the whole journey. Pure: reads and changes the state, returns the lines to play.
import { dayOf } from './clock.js?v=0.77.0';
import { keepsakes } from './memories.js?v=0.77.0';
import { journey, firstFriend } from './farewell.js?v=0.77.0';
import { PACT_ID } from './story.js?v=0.77.0';
import { normalizeChapter4, choiceOpen, thirdNext, THIRD_STEPS, ENDING_NAMES } from './chapter4.js?v=0.77.0';

const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};

export const CHOICE_LINES = [
  ['', '橋還在。這一次，橋的另一頭很安靜。'],
  ['嘯岳', '「最後一天，過完了。」'],
  ['嘯岳', '「不管你選哪一邊，我都在這裡。」']
];

export const ENDING_SCRIPTS = {
  cross: [
    ['', '你站在橋頭。這一次，你沒有再替自己找理由。'],
    ['嘯岳', '「上一次，我在這裡看著她走。」'],
    ['嘯岳', '「這次換我送你。」'],
    ['', '嘯岳陪你走到橋的正中央，停了下來。牠過不去。'],
    ['嘯岳', '「去吧。我記得你。」'],
    ['', '白光。消毒水的味道。很重、很重的眼皮。'],
    ['媽媽', '「……你醒了？你醒了！醫生——醫生！」'],
    ['', '你的腿動不了。你知道，可能很久都動不了。可是她握著你的手，在哭，也在笑。'],
    ['', '床邊的桌上，放著那份文件。日期那一欄，被她劃掉了。']
  ],
  stay: [
    ['', '你轉過身，背對著橋。'],
    ['管理者', '「明智的選擇，0412。」'],
    ['', '從那天起，你在慈光港的廣場上發居民證。你笑著。照片一張一張寄回去。'],
    ['', '……'],
    ['媽媽', '「今天的照片裡，你又在湖邊笑了。」'],
    ['媽媽', '「醫生說，費用組織會一直付。……媽媽不知道該不該高興。」'],
    ['媽媽', '「媽媽會一直來。你在那邊，要快樂喔。」'],
    ['', '她對著照片說話。照片裡的你在笑。病床上的你，聽見了。'],
    ['嘯岳', '「你留下來了。……那我不用再等了。我就在你旁邊。」']
  ],
  third: [
    ['', '橋的另一頭，病房的燈亮著。'],
    ['媽媽', '「我收到一封信。寄件人寫著 0412。上面，是留言碑上的每一個字。」'],
    ['', '她拿起那支筆。不是要簽名。'],
    ['', '她把第二份文件，從中間撕開。'],
    ['媽媽', '「我不會再讓任何人，替我決定你的解脫。」'],
    ['', '你走過了橋。0388 在另一邊等你；晴留在慈光港，替還醒著的人帶路。'],
    ['嘯岳', '「這次，你會回來嗎？」'],
    ['你', '「會。橋不會再關上了。」'],
    ['', '嘯岳仰起頭，長長地叫了一聲。整座湖都聽見了。']
  ]
};

export const THIRD_START = [
  ['', '你沒有走上橋，也沒有轉身。'],
  ['你', '「他給我的兩條路，我都不要。」'],
  ['嘯岳', '「汐當年也想過第三條路。她沒有走完。」'],
  ['嘯岳', '「這次，我陪你走完。」'],
  ['', 'K. 的主控權限還在。0388 還醒著。晴還在。留言碑上，還有空的地方。']
];

export const THIRD_SCRIPTS = {
  k0388: [
    ['終端機', '主控權限確認。載體 0388：狀態「待畢業」。'],
    ['', '你把 0388 的狀態改成「維持」，然後打開了通訊。'],
    ['0388', '「……有人在嗎？我在留言碑上寫了好久，一直沒有人回。」'],
    ['你', '「我看到了。我是 0412。我們一起出去。」'],
    ['0388', '「……好。我在橋那邊等你。」']
  ],
  qing: {
    truth: [
      ['', '你用主控權限打開了 B-01。冷氣湧出來，槽裡的光一點一點暗下去。'],
      ['終端機', '載體 0001：意識封存，解除。'],
      ['晴', '「……0412？我睡了多久？」'],
      ['晴', '「我發了好多張居民證。每一張，都是一個人的『畢業』。」'],
      ['晴', '「這次讓我幫你帶路。真正的路。」']
    ],
    forget: [
      ['', '你用主控權限，刪掉了 B-01 的「備用」指令。'],
      ['', '那天晚上，晴第一次離開了廣場。她走進玻璃槽大廳，看著那個空槽，看了很久。'],
      ['晴', '「這是……替我準備的？」'],
      ['晴', '「我一直以為，我是在幫大家。」'],
      ['晴', '「這次讓我幫你帶路。真正的路。」']
    ]
  },
  stele: [
    ['', '你在留言碑最下面，0388 的字旁邊，刻下了你知道的一切。'],
    ['', '「畢業」是什麼。第二份文件是什麼。照片是怎麼寄出去的。'],
    ['', '刻完的時候，天亮了。廣場上有人停下來，讀了很久。'],
    ['', '有人開始在下面，刻上自己的編號。']
  ],
  graduation: [
    ['', '你、嘯岳、晴，還有通訊裡 0388 的聲音，一起走到裂縫的最深處。'],
    ['晴', '「『畢業』的程序在這裡。每一個被收回的意識，都是從這裡斷開的。」'],
    ['', '你用 K. 的主控權限，把它關掉了。'],
    ['管理者', '「你知道這樣做，組織要付出多少嗎？」'],
    ['你', '「那是你們的帳。不是我們的命。」'],
    ['', '管理者沒有再說話。從那天起，他的聲音再也沒有出現過。']
  ]
};
const THIRD_LOG = {
  k0388: ['第三條路 · 0388', '我用 K. 的主控權限，把 0388 的狀態改成「維持」。他說，他在橋那邊等我。'],
  qing: ['第三條路 · 晴', '我打開了玻璃槽 B-01。晴說，這次讓她帶路，真正的路。'],
  stele: ['第三條路 · 留言碑', '我把知道的一切刻上了留言碑。有人開始在下面，刻上自己的編號。'],
  graduation: ['第三條路 · 畢業', '我在裂縫最深處關掉了「畢業」。管理者的聲音，再也沒有出現過。']
};

// What each beast does after you, by the bond between you.
const AFTER = {
  cross: [
    n => `${n}每天傍晚都會回到木筏上，趴在你以前睡的地方。`,
    n => `${n}偶爾會游到停靠站，看一眼，然後回到湖裡。`,
    n => `${n}回到了湖裡，慢慢習慣了沒有你的日子。`
  ],
  stay: [
    n => `${n}一直在你身邊。你在廣場發居民證的時候，牠就趴在你腳邊。`,
    n => `${n}有時陪你到廣場，有時自己去湖裡游。`,
    n => `${n}慢慢跟你熟了起來。你們還有很多時間。`
  ],
  third: [
    n => `${n}每天傍晚都回到木筏上。你回來的那天，牠第一個衝過來。`,
    n => `${n}在停靠站等你。你回來的時候，牠繞著你游了好幾圈。`,
    n => `${n}在湖裡長大了。你回來的時候，牠認了你好一會兒，才靠過來。`
  ]
};
const XIAOYUE_AFTER = {
  cross: '嘯岳回到了山腳，趴在湖邊，又開始等。下一個從裂縫掉下來的人，牠會第一個找到。',
  stay: '嘯岳不再守著山腳了。牠睡在慈光港的城門外，離你很近。',
  third: '嘯岳還是守在山腳。但這一次，牠知道你會回來。'
};

// The epilogue, from the save: the journey, the last day, and each beast after you.
export function epilogue(s, path) {
  const c = normalizeChapter4(s),
    j = journey(s),
    // the journey in numbers (what is zero is left out)
    parts = [
      j.sailed ? `航行了 ${j.sailed} 公里` : '',
      j.beasts ? `和 ${j.beasts} 隻御獸締約` : '',
      j.islands ? `在 ${j.islands} 座島上插過旗` : '',
      j.built ? `親手蓋了 ${j.built} 樣東西` : ''
    ].filter(Boolean),
    lines = [['', parts.length ? `第 ${j.days} 天。你${parts.join('，')}。` : `第 ${j.days} 天。`]];
  if (c.lastMemories.length) {
    lines.push(['', '最後一天——']);
    for (const m of c.lastMemories.slice(0, 5)) lines.push(['', m.text]);
  } else lines.push(['', '最後一天，你只是一直看著湖。']);
  const beasts = (s.tamed || [])
    .filter(p => p.kind !== 'creature' && p.id !== PACT_ID)
    .sort((a, b) => (b.bond || 0) - (a.bond || 0))
    .slice(0, 4);
  const first = firstFriend(s);
  for (const p of beasts) {
    const b = p.bond || 0,
      tier = b >= 70 ? 0 : b >= 30 ? 1 : 2;
    let t = AFTER[path][tier](p.name);
    if (p === first) t += '牠是第一個。在那張網子裡，你是第一個停下來的人。';
    lines.push(['', t]);
    const k = keepsakes(p)[0];
    if (tier === 0 && k) lines.push([p.name, `「第 ${k.day} 天。我記得。」`]);
  }
  if ((s.tamed || []).some(p => p.id === PACT_ID)) lines.push(['', XIAOYUE_AFTER[path]]);
  lines.push(['', `結局 · ${ENDING_NAMES[path]}`]);
  return lines;
}

function reach(s, path) {
  const c = normalizeChapter4(s);
  c.ending = path;
  log(
    s,
    `結局 · ${ENDING_NAMES[path]}`,
    path === 'cross'
      ? '我走過了橋。嘯岳說：「這次換我送你。」我在病床上醒來，媽媽握著我的手。'
      : path === 'stay'
        ? '我留了下來，在慈光港的廣場上發居民證。照片一張一張寄回去，媽媽對著照片說話。'
        : '0388 醒了，晴自由了，真相刻在留言碑上，「畢業」被關掉了。媽媽用那支筆，撕開了第二份文件。'
  );
  return { ok: true, ending: path, name: ENDING_NAMES[path], lines: ENDING_SCRIPTS[path], epilogue: epilogue(s, path) };
}

// Choose at the bridge. 'cross' and 'stay' end the story; 'third' sets out on the third way.
export function choose(s, path) {
  const c = normalizeChapter4(s);
  if (!choiceOpen(s)) return { ok: false, error: '現在還不是做選擇的時候。' };
  if (path === 'cross' || path === 'stay') return reach(s, path);
  if (path !== 'third') return { ok: false, error: '沒有這條路。' };
  if (c.path === 'third') return { ok: true, again: true, next: thirdNext(s) };
  c.path = 'third';
  log(s, '第三條路', '我沒有走上橋，也沒有轉身。叫醒 0388、放出晴、把真相刻上留言碑、關掉「畢業」。');
  return { ok: true, lines: THIRD_START, next: thirdNext(s) };
}

// One step of the third way, done where it happens (in order). The last one reaches the ending.
export function doThird(s, id) {
  if (thirdNext(s) !== id) return null;
  const c = normalizeChapter4(s);
  c.third.push(id);
  log(s, ...THIRD_LOG[id]);
  const lines =
    id === 'qing' ? THIRD_SCRIPTS.qing[s.chapter2?.choice === 'forget' ? 'forget' : 'truth'] : THIRD_SCRIPTS[id];
  if (id === 'graduation') {
    const e = reach(s, 'third');
    return { ...e, lines: [...lines, ...e.lines] };
  }
  return { ok: true, lines, next: thirdNext(s), step: THIRD_STEPS.findIndex(([x]) => x === id) + 1 };
}
// what the third way still asks of you, for the bridge's choice
export const thirdLeft = s => THIRD_STEPS.filter(([id]) => !normalizeChapter4(s).third.includes(id)).map(([, t]) => t);
