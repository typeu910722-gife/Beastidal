// 嘯岳之契 (The Pact of Xiaoyue): an optional main line hidden under the lake.
// 起 a sealed slab under the Great Gate → 承 three keys (tide / stone / bone), the lore of who built the mountains →
// 轉 (0.31) the ancient sabre-tooth sleeps at the heart of the corrupted garden in the crystal cave. It does not stir
// for a lone visitor; come carrying three 御獸 contracts and their scent tears it awake in a frenzy. Beat it down
// and it comes back to itself and speaks → 合 a pact of ten contract scrolls → it carries you over the mountains (the
// hook for chapter two). Nothing here is required to keep playing; every step is reached only by exploring.
import { LANDMARKS, landNear, groundAt } from './lake.js?v=0.64.0';
import { dayOf } from './clock.js?v=0.64.0';
import { makeGenome } from './genetics.js?v=0.64.0';
import { CAVE } from './cave-maze.js?v=0.64.0';

export const PACT_ID = 'ancient-xiaoyue';
export const PACT_NAME = '嘯岳';
export const KEYS = {
  tide: { name: '潮之鑰', where: '沉沒神殿的潮紋祭台' },
  stone: { name: '岩之鑰', where: '腐化花園迷宮深處的岩紋石壁' },
  bone: { name: '骨之鑰', where: '深海守望者的體內' }
};
// 0.31: ten contract scrolls — one contract cannot hold something this old
export const PACT_CONTRACTS = 10;
export const WAKE_TEAM = 3; // 御獸 contracts you must carry for it to wake
// where it sleeps: on the south side of the dais at the garden's heart, facing the way in
export const SLEEP_AT = { x: CAVE.x, z: CAVE.z + 3.6 };
export const FRENZY_HP = 1500;
// Where things are (game coordinates).
export const SEAL_AT = { x: LANDMARKS.greatGate.x, z: LANDMARKS.greatGate.z - 14 };
export const TIDE_AT = { x: LANDMARKS.sunkTemple.x, z: LANDMARKS.sunkTemple.z };
export const BEAST_HOME = landNear(LANDMARKS.centralRuins.x - 18, LANDMARKS.centralRuins.z + 6, {
  min: 3,
  max: 50,
  maxSlope: 0.35
});
export const DUEL = { hp: FRENZY_HP, yieldAt: 0.05 };

const fail = error => ({ ok: false, error });
const log = (s, title, text) => s.log.unshift({ day: dayOf(s), title, text });
export function normalizeStory(s) {
  s.story ??= {};
  const st = s.story;
  st.stage ??= 0; // 0 unknown · 1 seal read · 2 seal opened · 3 woken and calm · 5 pact · 6 crossed
  st.keys ??= [];
  st.trials ??= [];
  st.seen ??= [];
  st.duel ??= null;
  // 0.31: before the pact it lies in the garden's heart; saves that had it awake on the central island send it back
  if (st.stage < 5) {
    if (!st.beast || !st.beast.cave) {
      if (st.stage === 3 || st.stage === 4) {
        st.stage = 2;
        st.trials = [];
        log(s, '嘯岳', '嘯岳回到了異晶洞窟——那裡已經長成一座腐化的花園。牠在最深處又睡著了。');
      }
      st.beast = { x: SLEEP_AT.x, z: SLEEP_AT.z, hp: FRENZY_HP, maxHp: FRENZY_HP, cave: true };
      st.sleeping = true;
      st.duel = null;
    }
    st.sleeping ??= true;
  }
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
      st.stage = 2;
      log(
        s,
        '封印解除',
        '三枚鑰匙沒入凹槽。湖底傳來不屬於我的心跳——不是從這裡，而是從右岸半島的方向。異晶洞窟裡，有什麼睡得很沉的東西翻了個身。'
      );
      return { ok: true, story: 'awaken', message: '三枚鑰匙沒入凹槽——心跳聲從異晶洞窟的方向傳來。' };
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
  // 0.31: the frenzy, the calm, the pact of ten
  sleepHint: [['', '（牠睡得很沉，四周的花藤跟著牠的呼吸起伏。我一個人的氣息，好像吵不醒牠。）']],
  frenzyWake: [
    ['', '你身上三張契約同時發燙。花園裡的藤蔓一齊轉向你。'],
    ['嘯岳', '……契……約……的……味道……'],
    ['', '牠睜開眼——那不是清醒的眼神。腐化的紫光從牠的牙縫間溢出來。']
  ],
  frenzyLose: [['', '嘯岳的咆哮把你掀翻在花叢裡。等你爬起來，牠已經伏回石台上，又睡著了。']],
  calm: [
    ['嘯岳', '……我咬到了什麼？……是你，還有你的御獸。'],
    ['嘯岳', '這座花園在我睡著的時候爛掉了。裂縫的氣味滲進來，鑽進我的夢裡。我分不清誰是敵人。'],
    ['嘯岳', '你沒有逃，也沒有殺我。上一個人類想用一張紙綁住我——他叫自己「研究員」。湖替我收下了他。'],
    ['你', '……你知道我是怎麼來的？'],
    ['嘯岳', '你以為那頭巨大的鐵獸撞上你，是意外？裂縫在挑選聽得懂野獸的人。你們每一個，都是被選中的。'],
    ['嘯岳', '我太老了，一張契約撐不住我。拿十張來。這一次，不是綁住我——是我選擇你。']
  ],
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
  ready: [['嘯岳', '十張契約……你真的帶來了。好。這一次，不是綁住我——是我選擇你。']],
  notReady: [['嘯岳', '十張。少一張，契約就會在我身上燒成灰。']],
  joined: [
    ['嘯岳', '這座湖是牢，也是盾。山外沒有路……但我能越過去。'],
    ['嘯岳', '等你準備好，帶我到湖岸的山腳下。我會讓你看看，那些人到底在擋什麼。']
  ],
  // 0.46: over the ridge lies not a sea but a continent — and a gentle voice that has been waiting for you
  cross: [
    ['', '嘯岳背起你，躍上山脊。風很冷，冷得像那天早上的雨。'],
    ['', '山的另一側沒有海。是一片望不見盡頭的大陸——平原、河流，地平線上有城市的燈火。'],
    ['', '天上那道紫色的裂縫緩緩合上，像有人拉上了布幕。'],
    ['廣播', '「恭喜您完成適應期。歡迎來到——新生之界。」'],
    ['廣播', '「這裡沒有病痛，沒有債務，沒有失去。您的家人一切安好。慈愛組織，與您同在。」'],
    ['你', '……我的家人？'],
    ['嘯岳', '這個聲音。研究員那個會發光的盒子裡，也有一模一樣的聲音。'],
    ['嘯岳', '築山的人想擋住的是裂縫。可是說話的這些人……他們把湖當成了籠子的門。'],
    ['嘯岳', '還不是時候。等你準備好了，我們再下去。']
  ]
};
export const nearBeast = (s, r = 9) =>
  !!s.story?.beast &&
  !!s.inCave === !!s.story.beast.cave &&
  Math.hypot(s.player.x - s.story.beast.x, s.player.z - s.story.beast.z) < r;

// The fight is combat.js's (SPECIAL.frenzy); this ends it when 嘯岳 is beaten down — it comes back to itself.
export function winDuel(s) {
  const st = normalizeStory(s).story;
  if (!st.duel) return null;
  st.duel = null;
  st.sleeping = false;
  if (st.beast) {
    st.beast.hp = st.beast.maxHp;
    st.beast.yielded = false;
    delete st.beast.ai;
  }
  if (st.stage < 3) st.stage = 3;
  if (!st.trials.includes('might')) st.trials.push('might');
  log(s, '嘯岳 · 清醒', '狂暴的紫光從牠眼裡退去。牠看著我，像是第一次看見我。');
  return { ok: true, won: true, script: 'calm', message: '嘯岳眼裡的紫光退去了。' };
}
export const duelActive = s => !!s.story?.duel;
export const awakeAndCalm = s => normalizeStory(s).story.stage >= 3 && normalizeStory(s).story.stage < 5;
// ---------- 合: the pact ----------
export function sealPact(s) {
  const st = normalizeStory(s).story;
  if (st.stage >= 5) return fail('嘯岳已經與你締約了。');
  if (st.stage < 3) return fail('牠還在沉睡，或還沒有清醒過來。');
  if ((s.contracts || 0) < PACT_CONTRACTS)
    return fail(`需要 ${PACT_CONTRACTS} 份契約書（你有 ${s.contracts || 0} 份）。到工作桌製作。`);
  s.contracts -= PACT_CONTRACTS;
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
      '第一章 完 · 適應期結束',
      '山外不是海，是一片大陸。天上的聲音叫它「新生之界」，還說我的家人一切安好——它怎麼會知道我有家人？第二章 · 新生之界。'
    );
  }
  return { ok: true };
}

// ---------- every frame ----------
// Returns events for the game: hint toasts, the beast's wind-up and its swipe.
export function tickStory(s, dt, { diving, active, team } = {}) {
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
  // 0.31: the sleeper in the garden's heart wakes only for someone carrying three 御獸 contracts
  if (st.sleeping && st.beast?.cave && s.inCave && st.stage < 5 && !st.duel) {
    const dist = Math.hypot(s.player.x - st.beast.x, s.player.z - st.beast.z);
    if (dist < 13) {
      if ((team || 0) >= WAKE_TEAM) {
        st.sleeping = false;
        st.duel = { frenzy: true, next: s.elapsed + 2, windupAt: null };
        Object.assign(st.beast, { hp: FRENZY_HP, maxHp: FRENZY_HP, yieldAt: DUEL.yieldAt, yielded: false });
        delete st.beast.ai;
        ev.push({ type: 'frenzy-wake', script: 'frenzyWake' });
      } else if (!st.seen.includes('sleep')) {
        st.seen.push('sleep');
        ev.push({ type: 'script', script: 'sleepHint' });
      }
    }
  }
  if (st.duel && st.beast) {
    const b = st.beast,
      dist = Math.hypot(s.player.x - b.x, s.player.z - b.z);
    if (dist > 40 || s.player.mode !== 'foot' || !!s.inCave !== !!b.cave) {
      st.duel = null;
      b.hp = b.maxHp;
      delete b.ai;
      Object.assign(b, { x: SLEEP_AT.x, z: SLEEP_AT.z });
      st.sleeping = true;
      ev.push({ type: 'duel-off', text: '你逃出了花園的心臟。嘯岳的咆哮漸漸平息，又沉沉睡去。' });
      return ev;
    }
    // 0.28: 嘯岳's swipes, pounces and roars come from combat.js; losing is still decided here
    if (s.vitals.health < 25) {
      st.duel = null;
      b.hp = b.maxHp;
      b.yielded = false;
      delete b.ai;
      Object.assign(b, { x: SLEEP_AT.x, z: SLEEP_AT.z });
      st.sleeping = true;
      ev.push({ type: 'duel-lost', script: 'frenzyLose' });
    }
  }
  return ev;
}
// Objectives for the story tab, in order.
export function objectives(s) {
  const st = normalizeStory(s).story,
    k = id => st.keys.includes(id);
  if (st.stage === 0)
    return st.keys.includes('bone') ? [['一枚刻著獸牙的骨片……湖底大拱門附近，好像有同樣的紋路。', false]] : [];
  const list = [['解讀湖底大拱門前的封印石板', true]];
  if (st.stage >= 1 && st.stage < 3)
    for (const [id, v] of Object.entries(KEYS)) list.push([`${v.name} · ${v.where}`, k(id)]);
  if (st.stage === 1) list.push(['把三枚鑰匙放回封印石板', false]);
  if (st.stage >= 2) list.push(['嘯岳沉睡在異晶洞窟——腐化花園迷宮的中心', true]);
  if (st.stage >= 2) list.push([`帶著至少 ${WAKE_TEAM} 張御獸契約靠近牠，撐過牠的狂暴`, st.stage >= 3]);
  if (st.stage >= 3) list.push([`以 ${PACT_CONTRACTS} 份契約書締結契約`, st.stage >= 5]);
  if (st.stage >= 5) list.push(['帶嘯岳到環湖的山腳，越過群山', st.stage >= 6]);
  return list;
}
export const beastGround = s => (s.story?.beast ? groundAt(s.story.beast.x, s.story.beast.z) : 0);
