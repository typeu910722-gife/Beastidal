// 0.74 第四章（下）· 牽絆: what you would leave behind, told from your own save. A beast you sit down with tells you,
// through the contract, the moments it kept of you (the day you met, its firsts, the great fights) and how long you
// have been together — and the deeper the bond, the more it senses you might be leaving. Walking the raft, the things
// you built bring back the day you built them. Nothing here is written for everyone: it is all your game. Pure.
import { dayOf } from './clock.js?v=0.75.0';
import { keepsakes } from './memories.js?v=0.75.0';
import { personalityOf } from './beast-tree.js?v=0.75.0';

// how it ends, by temperament, when the bond is deep (it senses you might go)
const LAST_WORDS = {
  brave: '「你要去的地方，有我可以打的東西嗎？……沒有的話，你一個人，要小心。」',
  cautious: '「外面很危險。你走的時候，我會一直看著那個方向。」',
  curious: '「橋的另一邊，有什麼？……你回來的時候，要告訴我。」',
  lazy: '「……你要走的話，我就在這裡睡一下，等你。睡很久也沒關係。」',
  loyal: '「你去哪裡，我就去哪裡。……我去不了的話，我就在這裡等。」',
  fierce: '「誰要把你帶走？……告訴我，我去咬他。」',
  gentle: '「你今天看起來好累。……不管你決定什麼，都不是你的錯。」',
  greedy: '「我把今天的魚留一條給你。……明天也會留。你會回來吃的，對吧？」'
};
const days = (s, p) => Math.max(1, dayOf(s) - (p.metDay ?? dayOf(s)) + 1);
// the first beast you ever had: the one you cut out of the drifting net
export const firstFriend = s => (s.tamed || []).find(p => keepsakes(p).some(m => m.text.includes('漂流漁網'))) || null;

// What a beast says when you sit down with it. Returns [[speaker, text], …].
export function heartToHeart(s, p) {
  const keeps = keepsakes(p),
    bond = Math.round(p.bond || 0),
    n = days(s, p),
    lines = [['', `${p.name}靠了過來，把頭抵在你的手心。契約的另一頭，傳來牠的聲音。`]];
  const first = keeps[0];
  if (first) lines.push([p.name, `「第 ${first.day} 天。你還記得嗎？」`], ['', `${first.text}`]);
  // one more moment it kept — the latest great one, if there is one besides the first
  const more = keeps.length > 1 ? keeps[keeps.length - 1] : null;
  if (more) lines.push([p.name, `「還有第 ${more.day} 天。」`], ['', more.text]);
  lines.push([p.name, n > 1 ? `「我們一起過了 ${n} 天。」` : '「我們才剛認識一天。」']);
  if ((p.level || 1) >= 5) lines.push(['', `牠現在是 Lv${p.level} 了。當初那麼小的一隻。`]);
  if (firstFriend(s) === p) lines.push([p.name, '「我是第一個。在那張網子裡，你是第一個停下來的人。」']);
  if (bond >= 70) {
    lines.push(['', '牠一直看著你的臉。牠聽得懂——你可能要走了。']);
    lines.push([p.name, LAST_WORDS[personalityOf(p)] || LAST_WORDS.loyal]);
  } else if (bond >= 30) {
    lines.push(['', '牠蹭了蹭你，好像在問：你要去哪裡？']);
    lines.push([p.name, '「……你還會帶我出去嗎？」']);
  } else lines.push(['', '牠還不太懂，你為什麼看起來這麼難過。牠把一片葉子推到你腳邊。']);
  return lines;
}

// Walking the raft: what each thing you built brings back (`milestone` is the stats milestone it was noted under).
export const HOME_MEMORIES = {
  shelter: { milestone: 'shelter', text: '你在這裡蓋好了避難所。那天晚上，第一次睡得著。' },
  collector: { milestone: 'collector', text: '你蓋好了集水器。第一口乾淨的水，比什麼都好喝。' },
  beacon: { milestone: 'beacon', text: '你點亮了訊號塔。湖的另一邊，第一次有光回應你。' },
  pen: { milestone: 'pen', text: '你蓋好了第一座展示池。牠在池子裡轉了好幾圈，像是在說：這是我家。' },
  dock: { milestone: 'dock', text: '你蓋好了停靠站。從這裡出發，回到這裡。' },
  desk: { milestone: 'device', text: '你在這張書桌上拿起了隨身裝置。那時候，你還以為一切只是一場夢。' }
};
// The kinds of thing on your raft that have a memory (and the day, from the stats), in the order you built them.
export function homeMemories(s) {
  const ms = s.stats?.milestones || {},
    here = new Set((s.buildings || []).filter(b => !b.stowed && !b.ship).map(b => b.type));
  return Object.entries(HOME_MEMORIES)
    .filter(([type]) => here.has(type))
    .map(([type, m]) => ({
      type,
      day: ms[m.milestone] && !ms[m.milestone].before ? ms[m.milestone].day : null,
      text: m.text
    }))
    .sort((a, b) => (a.day ?? 999) - (b.day ?? 999));
}
export const homeLine = m => (m.day ? `第 ${m.day} 天。${m.text}` : m.text);
// A few numbers from the whole journey, for the last look back.
export function journey(s) {
  const st = s.stats || {};
  return {
    days: dayOf(s),
    sailed: Math.round((st.sailed || 0) / 1000),
    beasts: (s.tamed || []).filter(p => p.kind !== 'creature').length,
    creatures: (s.tamed || []).filter(p => p.kind === 'creature').length,
    islands: (s.occupied || []).length,
    built: (s.buildings || []).filter(b => !b.stowed).length
  };
}
