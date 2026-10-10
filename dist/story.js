// 嘯岳之契 (The Pact of Xiaoyue): an optional main line hidden under the lake.
// 起 a sealed slab under the Great Gate → 承 three keys (tide / stone / bone) → 轉 the ancient sabre-tooth wakes and
// speaks → 合 three trials and a pact → it carries you over the mountains (the hook for chapter two).
// Nothing here is required to keep playing; every step is reached only by exploring.
import { LANDMARKS, landNear, groundAt } from './lake.js?v=0.18.0';
import { spend } from './bag.js?v=0.18.0';
import { dayOf } from './clock.js?v=0.18.0';
import { makeGenome } from './genetics.js?v=0.18.0';

export const PACT_ID = 'ancient-xiaoyue';
export const PACT_NAME = '嘯岳';
export const KEYS = {
  tide: { name: '潮之鑰', where: '沉沒神殿的潮紋祭台' },
  stone: { name: '岩之鑰', where: '異晶洞窟深處的岩紋石壁' },
  bone: { name: '骨之鑰', where: '深海守望者的體內' }
};
export const TRIALS = {
  side: { name: '並肩', hint: '帶著一隻羈絆 60 以上的出戰夥伴站到嘯岳面前。' },
  might: { name: '力量', hint: '與夥伴一起和嘯岳交手，讓牠退後。牠蓄力時快退開。' },
  oath: { name: '誓言', hint: '回答牠的問題：你要牠成為你的什麼？' }
};
export const PACT_COST = { crystal: 20 };
// Where things are (game coordinates).
export const SEAL_AT = { x: LANDMARKS.greatGate.x, z: LANDMARKS.greatGate.z - 14 };
export const TIDE_AT = { x: LANDMARKS.sunkTemple.x, z: LANDMARKS.sunkTemple.z };
export const BEAST_HOME = landNear(LANDMARKS.centralRuins.x - 18, LANDMARKS.centralRuins.z + 6, {
  min: 3,
  max: 50,
  maxSlope: 0.35
});
export const DUEL = { hp: 900, yieldAt: 0.3, every: 4.6, windup: 1.3, damage: 9, reach: 8 };

const fail = error => ({ ok: false, error });
const log = (s, title, text) => s.log.unshift({ day: dayOf(s), title, text });
export function normalizeStory(s) {
  s.story ??= {};
  const st = s.story;
  st.stage ??= 0; // 0 unknown · 1 seal read · 2 keys gathered · 3 awake · 4 trials passed · 5 pact · 6 crossed
  st.keys ??= [];
  st.trials ??= [];
  st.seen ??= [];
  st.duel ??= null;
  st.oathWait ??= -999;
  return s;
}
export const storyStage = s => normalizeStory(s).story.stage;
export const hasKey = (s, k) => normalizeStory(s).story.keys.includes(k);
export const pactPet = s => s.tamed.find(p => p.id === PACT_ID);

// ---------- 起 / 承: exploring the story sites ----------
export function storyExplore(s, site) {
  const st = normalizeStory(s).story;
  if (site.id === 'pact-seal') {
    if (st.stage === 0) {
      st.stage = 1;
      log(
        s,
        '封印石板',
        '石板上刻著一頭長牙的巨獸。裝置翻譯了一部分：「牙之王——嘯岳，眠於此門之下。以潮、岩、骨三鑰為鎖，以湖為牢。後來者，若你聽得懂野獸的語言，就別讓牠醒來。」最後一句的筆跡，和研究浮標裡的紀錄一模一樣。'
      );
      return { ok: true, story: 'seal', message: '石板上有三個凹槽……還有一段眼熟的筆跡。' };
    }
    if (st.stage === 1) {
      if (st.keys.length < 3) {
        const missing = Object.entries(KEYS)
          .filter(([k]) => !st.keys.includes(k))
          .map(([, v]) => v.name);
        return fail(`凹槽還空著：${missing.join('、')}。`);
      }
      st.stage = 3;
      st.beast = { x: BEAST_HOME.x, z: BEAST_HOME.z, hp: DUEL.hp, maxHp: DUEL.hp };
      log(s, '封印解除', '三枚鑰匙沒入凹槽。湖底傳來不屬於我的心跳。一道金光沿著湖底竄向中央遺跡島。');
      return { ok: true, story: 'awaken', message: '三枚鑰匙沒入凹槽——湖底傳來低沉的心跳。' };
    }
    return fail('封印已經解開了。');
  }
  if (site.id === 'key-tide' || site.id === 'key-stone') {
    const key = site.id === 'key-tide' ? 'tide' : 'stone';
    if (st.keys.includes(key)) return fail('這裡的鑰匙已經取走了。');
    if (st.stage < 1) return fail('祭台上有一個發光的凹槽形狀……你還不明白它的意思。');
    st.keys.push(key);
    const vision =
      key === 'tide'
        ? '觸碰潮之鑰的瞬間，眼前閃過一段不屬於你的記憶：人們在湖邊搬運巨石，一座座山在他們身後升起。——這些山，是人造的。'
        : '岩之鑰的記憶湧入：築山的人望著山外漆黑的天空，那裡有一道紫色的裂縫。「把湖圍起來，牠才能睡得安穩，裂縫也進不來。」';
    log(s, KEYS[key].name, vision);
    return { ok: true, story: 'key', key, message: `取得${KEYS[key].name}。${vision}` };
  }
  return fail('什麼也沒有發生。');
}
// The watcher drops the bone key whenever it falls, before or after the seal is found.
export function onWatcherDown(s) {
  const st = normalizeStory(s).story;
  if (st.keys.includes('bone')) return null;
  st.keys.push('bone');
  const text =
    st.stage >= 1
      ? '守望者沉下前，吐出一枚刻著獸牙的骨鑰。牠不是在守護寶藏——牠在守護某個存在的沉睡。'
      : '守望者沉下前，吐出一枚刻著獸牙的骨片。這紋路……好像在湖底見過。';
  log(s, KEYS.bone.name, text);
  return text;
}

// ---------- 轉: the awakened beast speaks ----------
// Dialogue scripts: [speaker, line]. The game shows them one card at a time.
export const SCRIPT = {
  wake: [
    ['嘯岳', '……又一個從裂縫那頭掉下來的人類。'],
    ['嘯岳', '上一個也是。他叫自己「研究員」，帶著會發光的盒子，想用一張紙把我綁住。'],
    ['嘯岳', '他失敗了。湖替我收下了他。'],
    ['你', '……你知道我是怎麼來的？'],
    ['嘯岳', '你以為那頭巨大的鐵獸撞上你，是意外？裂縫在挑選聽得懂野獸的人。你們每一個，都是被選中的。'],
    ['嘯岳', '我不服從弱者。想要我的牙，就證明三件事：並肩、力量、誓言。']
  ],
  side: [['嘯岳', '你身邊那個小傢伙，眼神很穩。牠信你，比你信自己還多。——並肩，算你過了。']],
  sideFail: [['嘯岳', '你一個人來？在這片湖上，一個人走不遠。帶著真正信任你的夥伴再來。']],
  mightStart: [['嘯岳', '讓我後退。牠壓低身子的時候，記得躲開。']],
  mightWin: [['嘯岳', '……夠了。很久沒有誰能讓我後退一步。']],
  mightLose: [['嘯岳', '還不夠。回去喘口氣，再來。']],
  oathAsk: [['嘯岳', '最後一個問題。告訴我，你要我成為你的什麼？']],
  oathMount: [['嘯岳', '我不是你的船。']],
  oathWeapon: [['嘯岳', '我的牙，不為別人的仇恨而長。']],
  oathFriend: [['嘯岳', '……夥伴。很久沒有人這樣說了。']],
  ready: [['嘯岳', '好。拿出你的契約。這一次，不是綁住我——是我選擇你。']],
  joined: [
    ['嘯岳', '這座湖是牢，也是盾。山外沒有路……但我能越過去。'],
    ['嘯岳', '等你準備好，帶我到湖岸的山腳下。我會讓你看看，那些人到底在擋什麼。']
  ],
  cross: [
    ['', '嘯岳背起你，躍上山脊。風很冷，冷得像那天早上的雨。'],
    ['', '山的另一側沒有海。只有一片被撕開的天空，紫色的裂縫從地平線一直延伸到頭頂。'],
    ['嘯岳', '看清楚了嗎？築山的人不是要困住我們——是要把那東西擋在外面。'],
    ['嘯岳', '研究員想要的不是我。他想要的是一條路。'],
    ['嘯岳', '還不是時候。等你準備好了，我們再出發。']
  ]
};
export const nearBeast = (s, r = 9) =>
  !!s.story?.beast && !s.inCave && Math.hypot(s.player.x - s.story.beast.x, s.player.z - s.story.beast.z) < r;

// Trial 1: arrive with a partner at bond 60.
export function trySide(s, active) {
  const st = normalizeStory(s).story;
  if (st.trials.includes('side')) return { ok: true, script: 'side' };
  if (!active || active.bond < 60) return { ok: false, script: 'sideFail' };
  st.trials.push('side');
  return { ok: true, script: 'side' };
}
// Trial 2: the duel. The beast winds up before each swipe; stepping out of reach dodges it.
export function startDuel(s, active) {
  const st = normalizeStory(s).story;
  if (st.trials.includes('might')) return fail('力量的試煉已經通過了。');
  if (!active || active.bond < 30) return fail('需要一隻羈絆 30 以上的出戰夥伴一起應戰。');
  st.beast.hp = st.beast.maxHp;
  st.duel = { next: s.elapsed + 2.5, windupAt: null };
  return { ok: true, script: 'mightStart' };
}
// Called by the attack command when the duel is on and the beast is the nearest foe.
export function hitBeast(s, damage) {
  const st = normalizeStory(s).story,
    b = st.beast;
  b.hp = Math.max(0, b.hp - damage);
  if (b.hp <= b.maxHp * DUEL.yieldAt) {
    st.duel = null;
    st.trials.push('might');
    b.hp = b.maxHp;
    return { ok: true, won: true, script: 'mightWin', message: '嘯岳收起爪子，後退了一步。' };
  }
  return { ok: true, message: `命中嘯岳！還差 ${Math.ceil(b.hp - b.maxHp * DUEL.yieldAt)} 才能讓牠退後。` };
}
export const duelActive = s => !!s.story?.duel;
// Trial 3: the oath. Only "partner" is accepted; a wrong answer makes it turn away for a minute.
export function answerOath(s, choice) {
  const st = normalizeStory(s).story;
  if (st.trials.includes('oath')) return { ok: true, script: 'oathFriend' };
  if (s.elapsed < st.oathWait) return fail(`嘯岳別過頭去。等 ${Math.ceil(st.oathWait - s.elapsed)} 秒再問牠。`);
  if (choice === 'friend') {
    st.trials.push('oath');
    return { ok: true, script: 'oathFriend' };
  }
  st.oathWait = s.elapsed + 60;
  return { ok: false, script: choice === 'mount' ? 'oathMount' : 'oathWeapon' };
}
export const trialsDone = s => ['side', 'might', 'oath'].every(t => normalizeStory(s).story.trials.includes(t));

// ---------- 合: the pact ----------
export function sealPact(s) {
  const st = normalizeStory(s).story;
  if (st.stage >= 5) return fail('嘯岳已經與你締約了。');
  if (!trialsDone(s)) return fail('三個試煉還沒全部通過。');
  if ((s.contracts || 0) < 1) return fail('需要一份契約書。到工作桌製作。');
  if (!spend(s, PACT_COST)) return fail('締約需要 20 異晶，讓契約能承受遠古的力量。');
  s.contracts--;
  const genome = makeGenome(2718281, 2, 'land');
  s.tamed.push({
    id: PACT_ID,
    name: PACT_NAME,
    genome,
    ancient: true,
    generation: 0,
    parents: [],
    mutations: 0,
    bond: 70,
    stamina: 100,
    health: 100,
    role: 'exhibit',
    penId: null,
    lastTrain: -999,
    lastAttack: -999,
    awakened: true
  });
  st.stage = 5;
  st.beast = null;
  log(s, '嘯岳之契', '這一次，不是綁住牠。是牠選擇了我。牠是第一頭會說話的御獸。');
  return { ok: true, script: 'joined', message: '嘯岳成為你的御獸！' };
}
// The crossing: on the basin shore with Xiaoyue deployed.
export function canCross(s, active, onShore) {
  const st = normalizeStory(s).story;
  if (st.stage < 5) return fail('還沒有能越過群山的夥伴。');
  if (active?.id !== PACT_ID) return fail('先派出嘯岳。');
  if (s.player.mode !== 'foot' || !onShore) return fail('帶嘯岳登上環湖的山腳（不是島嶼）。');
  return { ok: true };
}
export function finishCrossing(s) {
  const st = normalizeStory(s).story;
  if (st.stage < 6) {
    st.stage = 6;
    log(
      s,
      '第一章 完 · 沉湖之誓',
      '山外沒有海，只有被撕開的天空。築山的人不是要困住我們，而是要把裂縫擋在外面。第二章 · 裂縫之外——敬請期待。'
    );
  }
  return { ok: true };
}

// ---------- every frame ----------
// Returns events for the game: hint toasts, the beast's wind-up and its swipe.
export function tickStory(s, dt, { diving, active } = {}) {
  const st = normalizeStory(s).story,
    ev = [];
  // a quiet hook the first time you dive near the gate
  if (
    diving &&
    st.stage === 0 &&
    !st.seen.includes('glow') &&
    Math.hypot(s.player.x - SEAL_AT.x, s.player.z - SEAL_AT.z) < 70
  ) {
    st.seen.push('glow');
    ev.push({ type: 'hint', text: '（大拱門前……那塊石板在發光？）' });
  }
  if (st.duel && st.beast) {
    const d = st.duel,
      b = st.beast,
      dist = Math.hypot(s.player.x - b.x, s.player.z - b.z);
    if (dist > 40 || s.player.mode !== 'foot') {
      st.duel = null;
      b.hp = b.maxHp;
      ev.push({ type: 'duel-off', text: '你離開了戰場。嘯岳收起架勢。' });
      return ev;
    }
    if (!d.windupAt && s.elapsed >= d.next - DUEL.windup) {
      d.windupAt = s.elapsed;
      ev.push({ type: 'windup', text: '嘯岳壓低身子——快退開！' });
    }
    if (d.windupAt && s.elapsed >= d.next) {
      d.windupAt = null;
      d.next = s.elapsed + DUEL.every;
      if (dist < DUEL.reach) {
        s.vitals.health = Math.max(0, s.vitals.health - DUEL.damage);
        if (active) active.health = Math.max(0, active.health - 6);
        ev.push({ type: 'swipe', hit: true, text: '嘯岳的爪擊掃過！' });
        if (s.vitals.health < 25) {
          st.duel = null;
          b.hp = b.maxHp;
          ev.push({ type: 'duel-lost', script: 'mightLose' });
        }
      } else ev.push({ type: 'swipe', hit: false, text: '閃開了！' });
    }
  }
  return ev;
}
// Objectives for the story tab, in order.
export function objectives(s) {
  const st = normalizeStory(s).story,
    k = id => st.keys.includes(id),
    t = id => st.trials.includes(id);
  if (st.stage === 0)
    return st.keys.includes('bone') ? [['一枚刻著獸牙的骨片……湖底大拱門附近，好像有同樣的紋路。', false]] : [];
  const list = [['解讀湖底大拱門前的封印石板', true]];
  if (st.stage >= 1 && st.stage < 3)
    for (const [id, v] of Object.entries(KEYS)) list.push([`${v.name} · ${v.where}`, k(id)]);
  if (st.stage === 1) list.push(['把三枚鑰匙放回封印石板', false]);
  if (st.stage >= 3) list.push(['喚醒嘯岳', true]);
  if (st.stage >= 3) for (const [id, v] of Object.entries(TRIALS)) list.push([`試煉 · ${v.name}：${v.hint}`, t(id)]);
  if (st.stage >= 3) list.push(['以契約書與 20 異晶締結契約', st.stage >= 5]);
  if (st.stage >= 5) list.push(['帶嘯岳到環湖的山腳，越過群山', st.stage >= 6]);
  return list;
}
export const beastGround = s => (s.story?.beast ? groundAt(s.story.beast.x, s.story.beast.z) : 0);
