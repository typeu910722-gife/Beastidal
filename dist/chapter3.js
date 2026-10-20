// 0.50 第三章（上）橋: past the dome. The tear 嘯岳 made (or makes now, if you chose to forget) lets you out into the
// wasteland under the real sky. Researcher K.'s abandoned outpost holds three recordings: the rift is a bridge
// between 比斯泰德 and our world, 慈愛組織 sends minds across it, and K. was looking for the way back. Then the first
// layer of the rift — a trial for your beasts (a short auto-battle: you choose the tactic each round) — and at its
// core, a glimpse of the hospital room on the other side. See docs/STORY.md.
import { dayOf } from './clock.js?v=0.72.0';
import { give } from './bag.js?v=0.72.0';
import { allyPower, grantXp, normalizeLevel } from './combat.js?v=0.72.0';
import { toLocal, outsideDome } from './dome.js?v=0.72.0';

// Places outside the shell (local to the town's plaza; the tear is due south at the shell).
export const OUTPOST = { x: 42, z: 352 };
export const RIFT = { x: -56, z: 396 };
export const TEAR_AT = { x: 0, z: 296 }; // just outside the tear

export function normalizeChapter3(s) {
  s.chapter3 ??= {};
  const c = s.chapter3;
  c.torn ??= false; // the forget branch: 嘯岳 has torn the shell now
  c.outside ??= false; // been outside the shell
  c.logs ??= 0; // K.'s recordings heard
  c.trials ??= 0; // rift trials won
  c.vision ??= false; // seen the core's vision: the end of part one
  c.shards ??= 0;
  // 0.51: the deeper layers
  c.cleared ??= c.trials ? [1] : []; // layers cleared at least once
  c.qing ??= false; // found No.0001's card in the second layer
  c.qingTalk ??= false; // (forget branch) 晴 has told you herself
  c.bridge ??= false; // the three shards made a bridge: the end of chapter three
  return c;
}
const log = (s, title, text) => {
  s.log.unshift({ day: dayOf(s), title, text });
  s.log = s.log.slice(0, 70);
};
const fail = error => ({ ok: false, error });
export const started = s => (s.chapter2?.stage || 0) >= 5;
export const tornOpen = s => s.chapter2?.choice === 'truth' || !!s.chapter3?.torn;

// The forget branch: 嘯岳 remembers, and tears the shell open when you ask.
export const TEAR_SCRIPT = [
  ['嘯岳', '你不記得昨晚。可是我記得：你在發抖，那個女人放你走，城裡的燈全熄了。'],
  ['嘯岳', '你說過你想知道真相。……再說一次。'],
  ['你', '我想知道真相。'],
  ['嘯岳', '那就抓緊。'],
  ['', '嘯岳撲向城門外的空氣。爪子底下，傳來玻璃碎裂的聲音——天空裂開一道縫，縫後是紫色的裂縫。']
];
export function tearShell(s) {
  const c = normalizeChapter3(s);
  if (!started(s)) return fail('……');
  if (tornOpen(s)) return fail('穹頂已經撕開了。裂口在城門南邊，穹頂的盡頭。');
  c.torn = true;
  log(s, '裂口', '嘯岳又撕開了穹頂。我忘了昨晚，可是牠記得。裂口在城門南邊，穹頂的盡頭。');
  return { ok: true, script: TEAR_SCRIPT };
}
// Stepping outside for the first time.
export function noteOutside(s) {
  const c = normalizeChapter3(s);
  if (c.outside || !tornOpen(s)) return null;
  const p = toLocal(s.player.x, s.player.z);
  if (!outsideDome(p.x, p.z)) return null;
  c.outside = true;
  const text =
    '走出裂口，腳下是乾裂的灰土。回頭看，穹頂是一座看不到頂的六角形外殼，裡面的草原、森林、天空，全是投影。這邊的天空，有那道紫色的裂縫。';
  log(s, '穹頂外', text);
  return text;
}

// ---------- Researcher K.'s outpost ----------
export const K_LOGS = [
  [
    [
      '錄音 · 研究員 K.',
      '「紀錄一。我是研究員 K.，慈愛組織前導觀測員。我的工作，是確認載體能不能在這片大陸上活下去。」'
    ],
    ['錄音 · 研究員 K.', '「湖區的適應期很順利。御獸會主動靠近載體——牠們聽得懂我們。這不在計畫裡。」']
  ],
  [
    ['錄音 · 研究員 K.', '「紀錄二。裂縫不是自然的傷口。它是一座橋——一端是比斯泰德，一端是我們的世界。」'],
    [
      '錄音 · 研究員 K.',
      '「組織把人的意識，從那座橋送過來，裝進這邊培育的身體。家屬以為那是電腦模擬。董事會說，這是慈悲。」'
    ]
  ],
  [
    ['錄音 · 研究員 K.', '「紀錄三。我想要的『路』，是回去的路。意識能過來，就能回去。」'],
    ['錄音 · 研究員 K.', '「原體還活著的人——還來得及。我要進裂縫，找到核心。如果你聽到這段……別讓他們『畢業』你。」'],
    ['', '錄音到這裡就斷了。桌上留著一張手繪的地圖：前哨站西邊的地面上，畫著一道裂縫，旁邊寫著「第一層」。']
  ]
];
export function readK(s) {
  const c = normalizeChapter3(s);
  if (c.logs >= K_LOGS.length) return { ok: true, again: true, lines: K_LOGS[K_LOGS.length - 1] };
  const lines = K_LOGS[c.logs++];
  const summary = [
    'K. 是慈愛組織的前導觀測員。他發現御獸聽得懂載體。',
    '裂縫是一座橋，一端是比斯泰德，一端是我們的世界。組織把意識從橋上送過來，家屬以為那是模擬。',
    'K. 想找的是回去的路：意識能過來，就能回去。原體還活著的人，還來得及。他進了裂縫。'
  ][c.logs - 1];
  log(s, `研究員 K. · 紀錄 ${c.logs}`, summary);
  return { ok: true, lines, n: c.logs };
}

// ---------- the rift trial: a short auto-battle ----------
// Your team: the partner out with you first, then your strongest-bonded beasts, up to three. Creatures cannot fight.
export const TEAM_MAX = 3;
export function pickTeam(s) {
  const beasts = (s.tamed || []).filter(p => p.kind !== 'creature' && (p.health ?? 100) > 0);
  const active = beasts.find(p => p.id === s.expedition?.activeId);
  const rest = beasts.filter(p => p !== active).sort((a, b) => (b.bond || 0) - (a.bond || 0));
  return [active, ...rest].filter(Boolean).slice(0, TEAM_MAX);
}
const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const TACTICS = {
  strike: { name: '猛攻', atk: 1, take: 1 },
  guard: { name: '守勢', atk: 0.45, take: 0.4, heal: 0.1 },
  seal: { name: '契印技', atk: 2.2, take: 0.8, all: true }
};
const FOES = {
  shard: { name: '裂縫晶骸', hp: 0.9, atk: 7 },
  husk: { name: '空殼載體', hp: 1.0, atk: 9 },
  warden: { name: '裂縫守門者', hp: 3.0, atk: 14 },
  // 0.51: deeper down
  mirror: { name: '鏡像載體', hp: 1.4, atk: 11 },
  khusk: { name: '空殼 · 研究員 K.', hp: 3.6, atk: 16 }
};
// Each layer: its waves, and how hard it bites (a share of your team's health a round) and holds (rounds of strikes).
export const LAYERS = {
  1: {
    name: '第一層',
    bite: 0.2,
    hold: 0.9,
    waves: [
      ['shard', 'shard'],
      ['husk', 'shard', 'husk'],
      ['warden', 'shard']
    ]
  },
  2: {
    name: '第二層',
    bite: 0.2,
    hold: 0.95,
    waves: [
      ['husk', 'husk'],
      ['shard', 'husk', 'shard', 'husk'],
      ['mirror', 'husk']
    ]
  },
  3: {
    name: '第三層',
    bite: 0.19,
    hold: 0.9,
    waves: [
      ['husk', 'shard', 'husk'],
      ['mirror', 'mirror'],
      ['khusk', 'shard', 'shard']
    ]
  }
};
// Which layers are open: the first after K.'s recordings; the second after the core's vision; the third after the
// second, once you have No.0001's card.
export function layerOpen(s, layer) {
  const c = normalizeChapter3(s);
  if (layer === 1) return c.logs >= K_LOGS.length;
  if (layer === 2) return c.vision;
  if (layer === 3) return c.cleared.includes(2) && c.qing;
  return false;
}
export function startTrial(s, seed = Date.now() % 2147483646 || 1, layer = 1) {
  const c = normalizeChapter3(s);
  if (!LAYERS[layer]) return fail('……');
  if (layer === 1 && c.logs < K_LOGS.length)
    return fail('裂縫的光太刺眼，看不清裡面。先去附近的前哨站看看，也許有人留下了什麼。');
  if (!layerOpen(s, layer)) return fail('更深的地方還過不去。');
  const team = pickTeam(s);
  if (!team.length) return fail('一個人進不去。帶上至少一隻締結契約、還有體力的御獸。');
  const members = team.map(p => {
    normalizeLevel(p);
    const pw = allyPower(s, p),
      maxHp = Math.round(60 + p.level * 12 + (p.ancient ? 80 : 0) + (p.awakened ? 30 : 0));
    return { id: p.id, name: p.name, hp: maxHp, maxHp, atk: pw.atk, def: pw.def, seal: !!(p.awakened || p.ancient) };
  });
  // the rift sizes itself to whoever walks in: foes' health to your team's strength, their bite to its toughness
  const power = members.reduce((a, m) => a + m.atk, 0),
    tough = members.reduce((a, m) => a + m.maxHp, 0); // the team's total health
  return {
    ok: true,
    battle: {
      seed,
      layer,
      members,
      power,
      tough,
      wave: 0,
      foes: makeWave(layer, 0, power, tough),
      sealUsed: false,
      round: 0,
      log: [],
      over: null
    }
  };
}
// Each wave's health is a number of rounds of your team's strikes; its bite, a share of your team's health a round
// (rising wave by wave). So any team — one beast or three, 嘯岳 or not — faces the same fight: pure 猛攻 loses,
// bracing when someone is hurt and saving the 契印技 for a crowd wins.
function makeWave(layer, i, power, tough) {
  const L = LAYERS[layer],
    kinds = L.waves[i],
    weight = kinds.reduce((a, k) => a + FOES[k].atk, 0);
  return kinds.map(k => {
    const f = FOES[k],
      hp = Math.round(power * f.hp * L.hold);
    return {
      kind: k,
      name: f.name,
      hp,
      maxHp: hp,
      atk: Math.max(1, Math.round((tough * L.bite * (1 + 0.2 * i) * f.atk) / weight))
    };
  });
}
export const canSeal = b => !b.sealUsed && b.members.some(m => m.seal && m.hp > 0);
// One round: your beasts strike (or brace, or loose a 契印技 on every foe), then the foes answer.
export function trialRound(b, tactic) {
  if (b.over) return b;
  const t = TACTICS[tactic];
  if (!t || (tactic === 'seal' && !canSeal(b))) return b;
  const r = rng(b.seed + b.round * 7919 + 1);
  b.round++;
  b.log = [];
  if (tactic === 'seal') b.sealUsed = true;
  const alive = () => b.members.filter(m => m.hp > 0),
    foes = () => b.foes.filter(f => f.hp > 0);
  for (const m of alive()) {
    const targets = t.all ? foes() : foes().slice(0, 1);
    for (const f of targets) {
      const dmg = Math.max(1, Math.round(m.atk * t.atk * (0.85 + r() * 0.3)));
      f.hp = Math.max(0, f.hp - dmg);
      b.log.push(`${m.name} → ${f.name} -${dmg}`);
    }
  }
  if (t.heal) for (const m of alive()) m.hp = Math.min(m.maxHp, Math.round(m.hp + m.maxHp * t.heal));
  for (const f of foes()) {
    const team = alive();
    if (!team.length) break;
    // they go for whoever looks strongest, so the damage spreads across the team
    const m = team.reduce((a, x) => (x.hp > a.hp ? x : a)),
      dmg = Math.max(1, Math.round((f.atk * t.take * (0.85 + r() * 0.3)) / (1 + m.def * 0.05)));
    m.hp = Math.max(0, m.hp - dmg);
    b.log.push(`${f.name} → ${m.name} -${dmg}`);
  }
  if (!alive().length) b.over = 'lost';
  else if (!foes().length) {
    if (b.wave + 1 >= LAYERS[b.layer || 1].waves.length) b.over = 'won';
    else {
      b.wave++;
      b.foes = makeWave(b.layer || 1, b.wave, b.power, b.tough);
      b.sealUsed = false;
      b.log.push(`第 ${b.wave + 1} 波`);
    }
  }
  return b;
}
export const WAVE_COUNT = 3; // every layer has three waves
// After the fight: what it costs and what it gives. Beasts never die; downed ones come back tired.
export function finishTrial(s, b) {
  const c = normalizeChapter3(s);
  for (const m of b.members) {
    const p = s.tamed.find(t => t.id === m.id);
    if (p) p.health = Math.max(10, Math.round((m.hp / m.maxHp) * 100));
  }
  const layer = b.layer || 1,
    title = '裂縫 · ' + LAYERS[layer].name;
  if (b.over !== 'won') {
    log(s, title, '裂縫把我們吐了出來。御獸都受了傷，但都還活著。休息一下再來。');
    return { ok: true, won: false, layer };
  }
  const ups = [];
  for (const m of b.members) {
    const p = s.tamed.find(t => t.id === m.id);
    if (p && grantXp(s, p, 50 + layer * 20)) ups.push(p.name);
  }
  c.trials++;
  const first = !c.cleared.includes(layer);
  if (first) {
    c.cleared.push(layer);
    c.shards++;
  }
  const rewards = give(s, { crystal: 4 + layer * 4, metal: 2 + layer * 2 });
  let script = null;
  if (first && layer === 2) {
    c.qing = true;
    script = QING_CARD;
  } else if (first && layer === 3) script = K_END;
  log(s, title, first ? FIRST_CLEAR[layer] : '又清了一次。裂縫裡的東西好像永遠殺不完。');
  return { ok: true, won: true, first, ups, rewards, layer, script };
}
const FIRST_CLEAR = {
  1: '守門者碎成一地晶塵。裂縫深處有一塊發光的碎片——核心的一角。',
  2: '鏡像載體倒下的地方，有一張居民證：No.0001 · 晴。還有第二塊碎片。',
  3: '空殼裡的 K. 終於停了下來。第三塊碎片落在他手邊——三塊都到齊了。'
};
// 0.51: 晴 was the first. Her card in the second layer (and in the forget branch, her own words in town).
export const QING_CARD = [
  ['', '鏡像載體的殘骸旁邊，掉著一張居民證。照片上的人在笑——是晴。'],
  ['', '編號：No.0001。發證日期，是十一年前。'],
  ['', '背面黏著一張小小的錄音晶片。'],
  ['錄音 · 晴', '「我是 No.0001。第一個成功的載體。」'],
  ['錄音 · 晴', '「原體在一間療養院裡，十一年了。只要我替組織工作，費用就不會停。」'],
  ['錄音 · 晴', '「所以我笑，我發居民證，我把一個一個的人送去『畢業』。……對不起。」'],
  ['', '晴也是載體。她也有一個躺在某張病床上、等著別人付錢的身體。']
];
export const QING_CONFESS = [
  ['晴', '……你找到我的居民證了，對吧。'],
  ['晴', '我是 No.0001。第一個。我的原體在療養院躺了十一年。'],
  ['晴', '我幫你忘記那一晚，不是為了組織。是因為我知道記得有多痛。'],
  ['晴', '裂縫最深的地方，K. 還在。他沒有回去成。……你要小心。']
];
export function qingConfession(s) {
  const c = normalizeChapter3(s);
  if (!c.qing || c.qingTalk || s.chapter2?.choice !== 'forget') return null;
  c.qingTalk = true;
  log(s, '晴 · No.0001', '晴親口告訴我：她是第一個載體，原體在療養院躺了十一年。她替組織工作，是為了讓費用不要停。');
  return QING_CONFESS;
}
// 0.51: in the third layer, what is left of K.
export const K_END = [
  ['空殼 · 研究員 K.', '「……載體……0412……你帶著……碎片……」'],
  ['空殼 · 研究員 K.', '「我走到了核心。可是我的原體……在我進來的那一週……就被『維持結束』了。」'],
  ['空殼 · 研究員 K.', '「橋還在。走過去的人……會失去這一邊的身體。御獸……留在這邊。」'],
  ['空殼 · 研究員 K.', '「……快一點。他們……會停止付錢。」'],
  ['', '空殼的眼睛暗了下去。三塊碎片在背包裡一起發燙。']
];

// 0.51: three shards make the bridge — and the one who runs the place speaks for the first time.
export const BRIDGE_SCENE = [
  ['', '三塊碎片在裂縫的核心拼成一塊。光從裂縫裡升起來，在空中搭成一座細細的橋。'],
  ['', '橋的另一頭，是那間病房。監測器的聲音，第一次這麼清楚。'],
  ['廣播', '「……0412 號。你走得比任何人都遠。」'],
  ['管理者', '「我是這裡的管理者。新生之界，是我建的。」'],
  ['管理者', '「你要回去，我不攔你。可是你要知道：回去的是意識。這具身體、你的御獸、嘯岳——都留在這一邊。」'],
  ['管理者', '「你的原體撐不了太久了。你媽媽前天簽了第二份文件。」'],
  ['嘯岳', '……你要走，我送你到橋頭。'],
  ['', '我站在橋前面。一邊是病床上的我，一邊是嘯岳。']
];
export function bridgeReady(s) {
  const c = normalizeChapter3(s);
  return c.cleared.includes(3) && !c.bridge;
}
export function crossBridge(s) {
  const c = normalizeChapter3(s);
  if (!c.cleared.includes(3)) return fail('碎片還不夠。');
  if (c.bridge) return { ok: true, again: true };
  c.bridge = true;
  log(
    s,
    '第三章 完 · 橋的兩端',
    '三塊碎片在核心拼成了一座橋，另一頭是病房。管理者第一次開口：回去的是意識，這具身體、御獸和嘯岳都會留下。媽媽前天簽了第二份文件。第四章——敬請期待。'
  );
  return { ok: true, script: BRIDGE_SCENE };
}

// ---------- the core's vision: the end of part one ----------
export const CORE_VISION = [
  ['', '碎片在手心發燙。裂縫的光一下子變得很安靜。'],
  ['', '我看見一個房間。白色的天花板，點滴，心電監測器——嗶。嗶。嗶。'],
  ['', '床上躺著一個人。那是我。更瘦，更蒼白，可是那是我。'],
  ['', '床邊的椅子上，媽媽睡著了，手還握著床上那隻手。'],
  ['媽媽', '「……你今天，好像又動了一下。」'],
  ['嘯岳', '那就是橋的另一頭。'],
  ['嘯岳', '碎片只有一塊。要走過去，還不夠。裂縫還有更深的地方。'],
  ['', '我握緊碎片。還來得及。']
];
export function seeCore(s) {
  const c = normalizeChapter3(s);
  if (!c.trials) return null;
  if (c.vision) return { ok: true, again: true };
  c.vision = true;
  log(
    s,
    '第三章（上）完 · 橋',
    '裂縫的核心讓我看見了病房：瘦下去的我，握著我的手睡著的媽媽。原體還活著。碎片只有一塊，裂縫還有更深的層。'
  );
  return { ok: true, script: CORE_VISION };
}

// Points of interest outside (local coordinates), for the game's target list.
export function outsidePoints(s) {
  const c = normalizeChapter3(s);
  if (!tornOpen(s)) return [];
  return [
    { id: 'outpost', name: '研究員 K. 的前哨站', ...OUTPOST },
    { id: 'rift', name: c.bridge ? '裂縫的核心 · 橋' : '裂縫', ...RIFT },
    { id: 'tear', name: '穹頂的裂口', ...TEAR_AT }
  ];
}

export function chapter3Objectives(s) {
  if (!started(s)) return [];
  const c = normalizeChapter3(s);
  const list = [];
  if (s.chapter2?.choice === 'forget') list.push(['回到城門外，找嘯岳', tornOpen(s)]);
  list.push(['走出穹頂的裂口（城門南邊，穹頂的盡頭）', c.outside]);
  if (c.outside) list.push([`聽完研究員 K. 的錄音（${c.logs}/${K_LOGS.length}）`, c.logs >= K_LOGS.length]);
  if (c.logs >= K_LOGS.length) list.push(['帶御獸通過裂縫 · 第一層', c.trials > 0]);
  if (c.trials > 0) list.push(['觸碰裂縫的核心', c.vision]);
  if (c.vision) list.push(['第三章（上）完 · 橋', true]);
  // 0.51: part two
  if (c.vision) list.push(['帶御獸通過裂縫 · 第二層', c.cleared.includes(2)]);
  if (c.qing && s.chapter2?.choice === 'forget') list.push(['回慈光港，問晴', c.qingTalk]);
  if (c.cleared.includes(2)) list.push(['帶御獸通過裂縫 · 第三層', c.cleared.includes(3)]);
  if (c.cleared.includes(3)) list.push([`用三塊碎片搭起橋（${c.shards}/3）`, c.bridge]);
  if (c.bridge) list.push(['第三章 完 · 橋的兩端', true]);
  return list;
}
