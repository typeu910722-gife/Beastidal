// 0.50 第三章（上）橋: past the dome. The tear 嘯岳 made (or makes now, if you chose to forget) lets you out into the
// wasteland under the real sky. Researcher K.'s abandoned outpost holds three recordings: the rift is a bridge
// between 比斯泰德 and our world, 慈愛組織 sends minds across it, and K. was looking for the way back. Then the first
// layer of the rift — a trial for your beasts (a short auto-battle: you choose the tactic each round) — and at its
// core, a glimpse of the hospital room on the other side. See docs/STORY.md.
import { dayOf } from './clock.js?v=0.50.0';
import { give } from './bag.js?v=0.50.0';
import { allyPower, grantXp, normalizeLevel } from './combat.js?v=0.50.0';
import { toLocal, outsideDome } from './dome.js?v=0.50.0';

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
  warden: { name: '裂縫守門者', hp: 3.0, atk: 14 }
};
const WAVES = [
  ['shard', 'shard'],
  ['husk', 'shard', 'husk'],
  ['warden', 'shard']
];
export function startTrial(s, seed = Date.now() % 2147483646 || 1) {
  const c = normalizeChapter3(s);
  if (c.logs < K_LOGS.length) return fail('裂縫的光太刺眼，看不清裡面。先去附近的前哨站看看，也許有人留下了什麼。');
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
      members,
      power,
      tough,
      wave: 0,
      foes: makeWave(0, power, tough),
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
function makeWave(i, power, tough) {
  const kinds = WAVES[i],
    weight = kinds.reduce((a, k) => a + FOES[k].atk, 0);
  return kinds.map(k => {
    const f = FOES[k],
      hp = Math.round(power * f.hp * 0.9);
    return {
      kind: k,
      name: f.name,
      hp,
      maxHp: hp,
      atk: Math.max(1, Math.round((tough * 0.2 * (1 + 0.2 * i) * f.atk) / weight))
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
    if (b.wave + 1 >= WAVES.length) b.over = 'won';
    else {
      b.wave++;
      b.foes = makeWave(b.wave, b.power, b.tough);
      b.sealUsed = false;
      b.log.push(`第 ${b.wave + 1} 波`);
    }
  }
  return b;
}
export const WAVE_COUNT = WAVES.length;
// After the fight: what it costs and what it gives. Beasts never die; downed ones come back tired.
export function finishTrial(s, b) {
  const c = normalizeChapter3(s);
  for (const m of b.members) {
    const p = s.tamed.find(t => t.id === m.id);
    if (p) p.health = Math.max(10, Math.round((m.hp / m.maxHp) * 100));
  }
  if (b.over !== 'won') {
    log(s, '裂縫 · 第一層', '裂縫把我們吐了出來。御獸都受了傷，但都還活著。休息一下再來。');
    return { ok: true, won: false };
  }
  const ups = [];
  for (const m of b.members) {
    const p = s.tamed.find(t => t.id === m.id);
    if (p && grantXp(s, p, 60)) ups.push(p.name);
  }
  c.trials++;
  const first = c.trials === 1;
  if (first) c.shards++;
  const rewards = give(s, { crystal: 8, metal: 4 });
  log(
    s,
    '裂縫 · 第一層',
    first
      ? '守門者碎成一地晶塵。裂縫深處有一塊發光的碎片——核心的一角。'
      : '又清了一次第一層。裂縫裡的晶骸好像永遠殺不完。'
  );
  return { ok: true, won: true, first, ups, rewards };
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
    '裂縫的核心讓我看見了病房：瘦下去的我，握著我的手睡著的媽媽。原體還活著。碎片只有一塊，裂縫還有更深的層。第三章（下）——敬請期待。'
  );
  return { ok: true, script: CORE_VISION };
}

// Points of interest outside (local coordinates), for the game's target list.
export function outsidePoints(s) {
  const c = normalizeChapter3(s);
  if (!tornOpen(s)) return [];
  return [
    { id: 'outpost', name: '研究員 K. 的前哨站', ...OUTPOST },
    { id: 'rift', name: c.trials ? '裂縫 · 第一層（核心）' : '裂縫 · 第一層', ...RIFT },
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
  return list;
}
