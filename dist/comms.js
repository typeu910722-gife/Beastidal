// 0.48 看不見彼此的通訊: residents of the New World can write to each other but never see each other.
// Messages are built from set phrases (a template and a word), so nothing needs moderating and every message reads
// in each player's own language. 慈愛組織 quietly removes messages that use certain words.
// By default the other residents are simulated (they post over the days and answer you); with CONFIG.communityUrl
// set, the stele also shows real players' posts through community.js. This module is pure data and rules, so the
// Cloudflare Worker (worker/community.js) uses the very same lists to validate posts.
import { dayOf } from './clock.js?v=0.53.0';
import { graduated, GRADUATE } from './chapter2.js?v=0.53.0';

export const TEMPLATES = {
  beware: '小心{0}',
  near: '{0}就在這附近',
  hear: '有人聽到{0}嗎？',
  miss: '我想念{0}',
  trust: '別相信{0}',
  seek: '我在找{0}',
  good: '{0}很好',
  why: '為什麼會有{0}？',
  metoo: '{0}……我也是。'
};
// Words residents can write. `banned` ones are removed by 慈愛組織 the day after they are posted.
export const WORDS = {
  family: { text: '家人' },
  mom: { text: '媽媽' },
  qing: { text: '晴' },
  ration: { text: '配給' },
  dream: { text: '夢' },
  lake: { text: '湖' },
  beast: { text: '御獸' },
  rain: { text: '雨' },
  home: { text: '家' },
  sky: { text: '天空' },
  birds: { text: '鳥群' },
  letter: { text: '家書' },
  beep: { text: '嗶嗶聲', banned: true },
  hospital: { text: '醫院', banned: true },
  beyond: { text: '山的另一邊', banned: true },
  dome: { text: '穹頂', banned: true },
  admin: { text: '管理區', banned: true }
};
export const PLAYER_TEMPLATES = Object.keys(TEMPLATES).filter(k => k !== 'metoo');
export const phrase = (t, w) => (TEMPLATES[t] || '{0}').replace('{0}', WORDS[w]?.text || '……');
export const banned = w => !!WORDS[w]?.banned;
export const validPost = (t, w) => PLAYER_TEMPLATES.includes(t) && !!WORDS[w];
export const REMOVED = '本則留言因違反居民守則，已由慈愛組織移除。';
export const POSTS_PER_DAY = 3;

// A small deterministic hash, so the simulated residents behave the same on every load.
const hash = (...xs) => {
  let h = 2166136261;
  for (const x of xs) for (const ch of String(x)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  // a final avalanche, so short ids that differ by a character land far apart
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
// The simulated residents' posts, by days after you first read the stele.
export const RESIDENT_POSTS = [
  { day: 0, who: 'No.0388', t: 'hear', w: 'beep' },
  { day: 0, who: 'No.0197', t: 'good', w: 'ration' },
  { day: 0, who: 'No.0330', t: 'miss', w: 'family' },
  { day: 1, who: 'No.0251', t: 'why', w: 'birds' },
  { day: 1, who: 'No.0409', t: 'seek', w: 'home' },
  { day: 2, who: 'No.0172', t: 'beware', w: 'beyond' },
  { day: 2, who: 'No.0264', t: 'good', w: 'qing' },
  { day: 3, who: 'No.0401', t: 'miss', w: 'mom' },
  { day: 4, who: 'No.0156', t: 'trust', w: 'letter' },
  { day: 5, who: 'No.0318', t: 'near', w: 'dome' },
  { day: 6, who: 'No.0233', t: 'why', w: 'sky' },
  { day: 8, who: 'No.0388', t: 'seek', w: 'dream' }
];
// Replies that come back from a drifting letter, by the word you sent.
export const DRIFT_REPLIES = {
  family: ['No.0330', '我也一直在想我的家人。晴小姐說他們很好，可是我好想親眼看看。'],
  mom: ['No.0401', '我媽媽每週都寫信給我。可是她的字，好像比以前工整了。'],
  qing: ['No.0264', '晴小姐人很好。……她是我在這裡唯一見過的人。你也是嗎？'],
  ration: ['No.0251', '配給的味道你也覺得怪嗎？我以為只有我這樣。'],
  dream: ['No.0388', '我也做夢。夢裡有人一直叫我的編號。'],
  lake: ['No.0409', '我想念湖。在那裡，至少我知道自己在哪裡。'],
  beast: ['No.0172', '我的御獸也不肯進城。牠們是不是知道什麼？'],
  rain: ['No.0197', '這裡的雨，好像只下在城裡。'],
  home: ['No.0409', '家……我已經想不太起來家長什麼樣子了。'],
  sky: ['No.0233', '你有沒有在黃昏的時候，仔細看過天空？'],
  birds: ['No.0251', '那群鳥！我數過，每次都是九隻。'],
  letter: ['No.0156', '再讀一次你的家書。仔細讀。']
};
export const DRIFT_RETURNED = '（漂流信被退回了。信封上蓋著慈愛組織的印章：「內容不符居民守則」。）';

export function normalizeComms(s) {
  s.comms ??= {};
  const c = s.comms;
  c.since ??= null; // the day you first read the stele: the residents' posts count from here
  c.posts ??= []; // your own: { id, t, w, day, removed }
  c.resonated ??= []; // posts you resonated with
  c.drifts ??= []; // { t, w, day, back, read }
  c.warn ??= false; // one of your posts was removed and 晴 has not mentioned it yet
  c.traces ??= 0;
  return c;
}
const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};

// Everything on the stele now: residents' posts revealed so far and your own, newest first.
export function stelePosts(s) {
  const c = normalizeComms(s),
    today = dayOf(s);
  if (c.since == null) c.since = today;
  const out = [];
  for (const [i, p] of RESIDENT_POSTS.entries()) {
    const day = c.since + p.day;
    if (day > today) continue;
    const id = 'r' + i;
    out.push({
      id,
      who: p.who,
      t: p.t,
      w: p.w,
      day,
      removed: banned(p.w) && today > day,
      res: Math.floor(hash(id) * 6) + (today - day) * 2 + (c.resonated.includes(id) ? 1 : 0)
    });
  }
  for (const p of c.posts) {
    // the others answer you: resonance grows by the day, and one of them may write back
    const days = today - p.day;
    out.push({
      ...p,
      who: 'No.0412',
      mine: true,
      res: p.removed ? 0 : Math.floor(days * (1 + hash(p.id, 'r') * 3))
    });
    if (days >= 1 && hash(p.id, 'reply') < 0.6) {
      const who = 'No.0' + (150 + Math.floor(hash(p.id, 'who') * 290));
      out.push({
        id: p.id + '-re',
        who,
        t: 'metoo',
        w: p.w,
        day: p.day + 1,
        removed: banned(p.w) && days >= 2,
        res: days
      });
    }
  }
  // 0.49: once No.0156 has "graduated", every word of theirs is ground away
  if (graduated(s))
    for (const p of out) if (p.who === GRADUATE) Object.assign(p, { graduated: true, removed: true, res: 0 });
  return out.sort((a, b) => b.day - a.day || (a.mine ? -1 : 1));
}
export function postsToday(s) {
  const today = dayOf(s);
  return normalizeComms(s).posts.filter(p => p.day === today).length;
}
export function writePost(s, t, w) {
  const c = normalizeComms(s);
  if (!validPost(t, w)) return { ok: false, error: '選一個句型和一個詞。' };
  if (postsToday(s) >= POSTS_PER_DAY) return { ok: false, error: `今天已經刻了 ${POSTS_PER_DAY} 則留言。明天再來。` };
  const post = { id: `p${dayOf(s)}-${c.posts.length}`, t, w, day: dayOf(s), removed: false };
  c.posts.push(post);
  if (c.posts.length === 1) log(s, '留言碑', `我在石碑上刻下第一則留言：「${phrase(t, w)}」。會有人看到嗎？`);
  return { ok: true, post, message: `刻下了：「${phrase(t, w)}」` };
}
export function resonate(s, id) {
  const c = normalizeComms(s);
  if (c.resonated.includes(id)) return { ok: false, error: '已經共鳴過了。' };
  c.resonated.push(id);
  return { ok: true, message: '你按下了共鳴。石碑上的字微微亮了一下。' };
}
// A drifting letter to a resident chosen at random; the answer comes back a day or two later.
export function sendDrift(s, t, w) {
  const c = normalizeComms(s);
  if (!validPost(t, w)) return { ok: false, error: '選一個句型和一個詞。' };
  if (c.drifts.some(d => !d.read)) return { ok: false, error: '上一封漂流信還沒有回音。' };
  const day = dayOf(s);
  c.drifts.push({ t, w, day, back: day + 1 + Math.floor(hash(day, t, w) * 2), read: false });
  return { ok: true, message: `漂流信寄出去了：「${phrase(t, w)}」。不知道會漂到誰手上。` };
}
export function driftReply(s) {
  const c = normalizeComms(s),
    d = c.drifts.find(x => !x.read);
  if (!d) return null;
  if (dayOf(s) < d.back) return { waiting: true, back: d.back };
  d.read = true;
  const reply = banned(d.w)
    ? ['慈愛組織', DRIFT_RETURNED]
    : DRIFT_REPLIES[d.w] || ['No.0' + (200 + d.day), '……我也是。'];
  log(s, '漂流信 · ' + reply[0], reply[1]);
  return { reply, sent: phrase(d.t, d.w) };
}

// Every so often: remove the banned posts of past days. Returns the removed posts (for a notice).
export function tickComms(s) {
  const c = normalizeComms(s),
    today = dayOf(s),
    removed = [];
  for (const p of c.posts)
    if (!p.removed && banned(p.w) && today > p.day) {
      p.removed = true;
      c.warn = true;
      removed.push(p);
      log(s, '留言碑', `我刻的「${phrase(p.t, p.w)}」不見了。原來的位置只剩一行字：「${REMOVED}」`);
    }
  return removed;
}
export const GUIDE_WARN = [
  ['晴', '對了，0412。留言碑上的事，我聽說了。'],
  ['晴', '有些話，說出來只會讓大家不安喔。這裡的每個人，都是好不容易才不痛了。'],
  ['晴', '你是個溫柔的人，對吧？']
];
// 晴 mentions a removed post once, the next time you talk to her.
export function guideWarning(s) {
  const c = normalizeComms(s);
  if (!c.warn) return null;
  c.warn = false;
  return GUIDE_WARN;
}

// Ghost traces in the open country: faint glowing footprints of someone who stood here a moment ago.
export function noteTrace(s) {
  const c = normalizeComms(s);
  c.traces++;
  if (c.traces === 1) {
    log(s, '殘影', '草地上有一串發著淡光的腳印，走近就散了。剛才，有人站在這裡。');
    return '草地上有一串發著淡光的腳印，走近就散了。剛才，有人站在這裡。';
  }
  return null;
}
