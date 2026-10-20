// Action combat (0.25). Fights are fought by your 御獸, in real time:
//   · a basic attack (F) chains into a three-hit combo; hold F for a heavy blow. Every swing is an arc in front of
//     the beast and hits whatever stands in it — riding, the arc follows your heading; on foot or in the boat the
//     beast dashes to its target and swings there.
//   · two skills (1 / 2) come from the beast's 比斯基因: fire breath, chain lightning, a frost wave, venom, a tail
//     sweep, hardening, regeneration, a dash, crystal spikes, a crushing bite, a stunning roar.
//   · a dodge (Space) dashes you clear with a moment of invulnerability.
// Enemies fight back with telegraphed attacks: a red shape on the ground (an arc for a bite, a ring for a sweep, a
// lane for a charge, a lead line for a spit) fills up during the windup; whatever is still inside when it fills is
// hit. After striking they are open for a moment (破綻) and take extra damage.
// Pure logic over the save: game.js feeds input and movement checks in, world.js draws the events that come out.
import { phenotype } from './genetics.js?v=0.65.0';
import { bsOf, geneStats } from './bsgenes.js?v=0.65.0';
import { WILD_BEASTS } from './beasts.js?v=0.65.0';
import { rollDrops } from './species.js?v=0.65.0';
import { give } from './bag.js?v=0.65.0';
import { tally } from './stats.js?v=0.65.0';
import { damageBonus } from './skills.js?v=0.65.0';
import { remember } from './memories.js?v=0.65.0';
import { perks, personality, normalizeTree } from './beast-tree.js?v=0.65.0';
import { hullDamageFactor } from './warship.js?v=0.65.0';

export const ENGAGE = 20; // foes this close to the player start a fight
export const AI_RANGE = 34;
export const COMBO_WINDOW = 0.95;
export const DODGE = { dist: 4.2, iframes: 0.45, cd: 1.1 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const frenzied = (w, t) => (w.frenzyUntil || 0) > t;
export const dangerousFoe = (w, t) => !!w.hostile || frenzied(w, t);
// 0.40: the sea has two layers. Under water only what swims down there can reach you (and you it); on the surface
// the deep ones cannot.
export const onLayer = (s, w) => !!w.under === !!s.expedition?.diving;

// ---------- skills ----------
export const SKILLS = {
  flame: {
    name: '火焰吐息',
    icon: '🔥',
    cd: 9,
    sta: 14,
    color: 0xff6a2a,
    shape: 'cone',
    range: 6.5,
    arc: 1.25,
    mul: 1.4,
    burn: [3, 5]
  },
  thunder: {
    name: '連鎖雷擊',
    icon: '⚡',
    cd: 10,
    sta: 14,
    color: 0x8fe0ff,
    shape: 'chain',
    range: 9,
    mul: 1.5,
    stun: 0.8,
    jumps: 2
  },
  frost: { name: '冰霜波', icon: '❄', cd: 9, sta: 12, color: 0xbfe8ff, shape: 'ring', range: 5.5, mul: 1.0, slow: 4 },
  venom: {
    name: '毒液噴射',
    icon: '🧪',
    cd: 7,
    sta: 10,
    color: 0x9be36a,
    shape: 'shot',
    range: 16,
    mul: 0.8,
    poison: [5, 5]
  },
  tail: {
    name: '迴旋尾擊',
    icon: '🌀',
    cd: 6,
    sta: 10,
    color: 0xe8d8a8,
    shape: 'ring',
    range: 3.9,
    mul: 1.3,
    knock: 3
  },
  guard: { name: '硬化', icon: '🛡', cd: 12, sta: 10, color: 0xb8c0c8, shape: 'self', guard: 3 },
  heal: { name: '再生', icon: '💚', cd: 15, sta: 8, color: 0x7fe0a8, shape: 'self', heal: [30, 15] },
  dash: { name: '突進', icon: '💨', cd: 7, sta: 12, color: 0xffffff, shape: 'lane', range: 7.5, width: 1.9, mul: 1.6 },
  crystal: {
    name: '晶刺爆發',
    icon: '💎',
    cd: 11,
    sta: 16,
    color: 0xc1b2ee,
    shape: 'burst',
    range: 12,
    radius: 3.1,
    delay: 0.6,
    mul: 2.0
  },
  jaw: { name: '巨顎咬殺', icon: '🦈', cd: 9, sta: 14, color: 0xf0f0f0, shape: 'bite', range: 4.5, mul: 2.4 },
  roar: { name: '震懾咆哮', icon: '📣', cd: 12, sta: 10, color: 0xffd0ff, shape: 'ring', range: 7, mul: 0.4, stun: 1.4 }
};
const GENE_SKILL = {
  fire: 'flame',
  magmacore: 'flame',
  heatsense: 'flame',
  lightning: 'thunder',
  staticfur: 'thunder',
  electricgill: 'thunder',
  magnetsense: 'thunder',
  frostbreath: 'frost',
  frostscale: 'frost',
  coldheart: 'frost',
  venomfang: 'venom',
  venomspine: 'venom',
  sporecloud: 'venom',
  inkjet: 'venom',
  whiptail: 'tail',
  vinewhip: 'tail',
  tailclub: 'tail',
  tendrils: 'tail',
  hardbody: 'guard',
  stoneskin: 'guard',
  boneplates: 'guard',
  barkskin: 'guard',
  camouflage: 'guard',
  sandburrow: 'guard',
  regen: 'heal',
  twinheart: 'heal',
  photoskin: 'heal',
  honeygland: 'heal',
  landgill: 'heal',
  divebladder: 'heal',
  burst: 'dash',
  springlegs: 'dash',
  finclaw: 'dash',
  bladefin: 'dash',
  hydrofoil: 'dash',
  vortexfin: 'dash',
  glide: 'dash',
  bonewings: 'dash',
  suckerfeet: 'dash',
  crystalhorn: 'crystal',
  crystalcore: 'crystal',
  greatjaw: 'jaw',
  lure: 'roar',
  ghosteyes: 'roar',
  nightsight: 'roar',
  resonant: 'roar',
  echo: 'roar',
  scenttrail: 'roar'
};
// A beast's two skills, from its genes in order; beasts with fewer genes fall back on a dash and a roar.
export function beastSkills(p) {
  const out = [];
  for (const g of bsOf(p?.genome)) {
    const k = GENE_SKILL[g];
    if (k && !out.includes(k)) out.push(k);
    if (out.length === 2) break;
  }
  for (const k of ['dash', 'roar']) if (out.length < 2 && !out.includes(k)) out.push(k);
  // 0.29: 靈之道 · 覺醒 wakes a third skill — the next one its genes hold, else a skill it does not have yet
  if (p && p.kind !== 'creature' && perks(p).third) {
    const more = bsOf(p.genome)
      .map(g => GENE_SKILL[g])
      .find(k => k && !out.includes(k));
    out.push(more || ['tail', 'frost', 'guard', 'heal', 'crystal'].find(k => !out.includes(k)));
  }
  return out;
}

// ---------- the beast's strength ----------
export const MAX_LEVEL = 10;
export const levelCap = p => (p.wildBeast ? p.cap || 3 : MAX_LEVEL);
export const xpFor = lv => Math.round(30 * Math.pow(lv, 1.5));
export function normalizeLevel(p) {
  normalizeTree(p);
  p.level ??= 1;
  p.xp ??= 0;
  p.level = Math.max(1, Math.min(levelCap(p), p.level));
  return p;
}
export function allyPower(s, p) {
  const ph = phenotype(p.genome),
    g = geneStats(bsOf(p.genome));
  normalizeLevel(p);
  return {
    atk:
      (10 + ph.armor * 0.06 + ph.speed * 0.05 + g.atk + damageBonus(s) + (p.awakened ? 12 : 0) + (p.ancient ? 20 : 0)) *
      (1 + 0.08 * (p.level - 1)) *
      (1 + perks(p).atk),
    def: g.def,
    reach: 2.6 + ph.size * 0.9
  };
}
export function grantXp(s, p, xp) {
  normalizeLevel(p);
  const cap = levelCap(p);
  if (p.level >= cap) return 0;
  p.xp += xp;
  let up = 0;
  while (p.level < cap && p.xp >= xpFor(p.level)) {
    p.xp -= xpFor(p.level);
    p.level++;
    up++;
  }
  if (p.level >= cap) p.xp = 0;
  return up;
}
// ---------- foes ----------
// A foe's attacks, from what it carries: everything bites; tails sweep; breath and venom spit; burst muscles charge.
export function foeMoves(w) {
  const genes = bsOf(w.genome),
    moves = ['bite'];
  if (genes.some(g => ['whiptail', 'vinewhip', 'tailclub', 'tendrils'].includes(g))) moves.push('sweep');
  if (genes.some(g => ['fire', 'lightning', 'frostbreath', 'venomfang', 'sporecloud', 'lure', 'magmacore'].includes(g)))
    moves.push('spit');
  if (genes.some(g => ['burst', 'springlegs', 'greatjaw', 'hydrofoil', 'bladefin'].includes(g))) moves.push('charge');
  return moves;
}
const MOVE = {
  bite: { windup: 0.7, range: 2.9, mul: 1, recover: 0.9 },
  sweep: { windup: 0.9, range: 3.5, mul: 0.9, recover: 1.0 },
  spit: { windup: 0.85, range: 16, mul: 0.8, recover: 0.8, speed: 12 },
  charge: { windup: 1.0, range: 8.5, width: 1.7, mul: 1.3, recover: 1.2 }
};
export function foeStats(w) {
  const ph = phenotype(w.genome),
    g = geneStats(bsOf(w.genome));
  if (!w.maxHp) w.maxHp = w.beast ? WILD_BEASTS[w.beast]?.hp || 90 : Math.round(40 + ph.armor * 0.4);
  if (!Number.isFinite(w.hp)) w.hp = w.maxHp;
  return {
    bite: (w.beast ? 12 : 7) * (frenzied(w, 0) ? 1 : 1),
    def: g.def,
    speed: (w.beast ? 2.9 : 2.3) + ph.speed / 120,
    size: ph.size
  };
}
const COLORS = {
  fire: 0xff6a2a,
  lightning: 0x8fe0ff,
  frostbreath: 0xbfe8ff,
  venomfang: 0x9be36a,
  sporecloud: 0xd8f0a0,
  lure: 0xffe27a,
  magmacore: 0xff4d1a
};
const spitColor = w => COLORS[bsOf(w.genome).find(g => COLORS[g])] || 0xff8a6a;

// ---------- state ----------
export function normalizeCombat(s) {
  s.combat ??= {};
  const c = s.combat;
  c.cd ??= {};
  c.shots = Array.isArray(c.shots) ? c.shots : [];
  c.zones = Array.isArray(c.zones) ? c.zones : [];
  c.combo ??= { n: 0, until: -1 };
  return c;
}
// fresh session: nothing in flight carries over a reload
export function resetCombat(s) {
  s.combat = { cd: {}, shots: [], zones: [], combo: { n: 0, until: -1 } };
  for (const w of s.wild || []) delete w.ai;
  if (s.expedition?.boss) delete s.expedition.boss.ai;
  if (s.story?.beast) delete s.story.beast.ai;
  return s.combat;
}
export const activeBeast = s => {
  const p = (s.tamed || []).find(t => t.id === s.expedition?.activeId);
  return p && p.kind !== 'creature' && (p.health ?? 100) > 0 ? p : null;
};
// Where your beast is: under you when riding, else beside you (combat moves it).
export function allyPos(s) {
  const c = normalizeCombat(s);
  if (s.expedition?.mounted) return { x: s.player.x, z: s.player.z };
  if (!Number.isFinite(c.ax) || dist({ x: c.ax, z: c.az }, s.player) > 16) {
    c.ax = s.player.x - Math.sin(s.player.heading || 0) * 2.4;
    c.az = s.player.z - Math.cos(s.player.heading || 0) * 2.4;
    // (in the garden, never on the far side of a hedge: then at your heels)
    if (s.inCave) {
      c.ax = s.player.x;
      c.az = s.player.z;
    }
  }
  return { x: c.ax, z: c.az };
}
export function foesNear(s, r = ENGAGE, from = s.player) {
  const out = (s.wild || []).filter(
    w => dangerousFoe(w, s.elapsed) && !w.dissolving && onLayer(s, w) && dist(w, from) < r
  );
  const b = s.expedition?.boss;
  if (b && !b.defeated && !s.inCave && dist(b, from) < r + 4) out.push(b);
  // 嘯岳 during the trial of might
  const xb = s.story?.duel && s.story.beast;
  if (xb && !!s.inCave === !!xb.cave && dist(xb, from) < r + 4) {
    xb.id = 'duel';
    xb.duelBeast = true;
    xb.land = true;
    out.push(xb);
  }
  return out;
}
export function combatActive(s) {
  if ((s.inCave && !s.story?.duel) || s.inTown || s.player.mode === 'cabin' || s.player.mode === 'aboard') return false;
  return !!activeBeast(s) && foesNear(s).length > 0;
}
const isBoss = (s, t) => t === s.expedition?.boss;
// the foe your beast goes for: the one you last hit if still close, else the nearest
export function lockTarget(s) {
  const c = normalizeCombat(s),
    from = allyPos(s),
    foes = foesNear(s, ENGAGE + 4);
  const keep = foes.find(f => (f.id || 'boss') === c.target);
  if (keep) return keep;
  const t = foes.sort((a, b) => dist(a, from) - dist(b, from))[0] || null;
  c.target = t ? t.id || 'boss' : null;
  return t;
}
// ---------- dealing damage ----------
function damageFoe(s, t, base, ev, opts = {}) {
  const c = normalizeCombat(s);
  const theirs = t.genome ? foeStats(t).def : 6,
    open = t.ai?.state === 'recover',
    pk = perks(activeBeast(s)),
    crit = (opts.rng || Math.random)() < 0.1 + pk.crit;
  let amount = base * Math.max(0.4, 1 - theirs / 60) * (open ? pk.openMul : 1) * (crit ? 1.5 : 1);
  amount = Math.max(1, Math.round(amount));
  t.hp = (t.hp ?? 60) - amount;
  c.target = t.id || 'boss';
  ev.push({ type: 'hit', target: 'foe', id: t.id || 'boss', x: t.x, z: t.z, amount, crit, weak: open });
  if (opts.knock && !isBoss(s, t) && opts.from) {
    const a = angleTo(opts.from, t),
      nx = t.x + Math.sin(a) * opts.knock,
      nz = t.z + Math.cos(a) * opts.knock;
    if (!opts.canMove || opts.canMove(t, nx, nz)) {
      t.x = nx;
      t.z = nz;
    }
  }
  if (t.ai && opts.stun) t.ai.stunUntil = s.elapsed + opts.stun;
  if (t.ai && opts.slow) t.ai.slowUntil = s.elapsed + opts.slow;
  if (opts.dot) t.dot = { until: s.elapsed + opts.dot[0], dps: opts.dot[1], color: opts.dotColor };
  // a strike interrupts a foe that is winding up only when it is heavy or a stun
  if (t.ai && t.ai.state === 'windup' && (opts.heavy || opts.stun || (pk.breaker && opts.combo3))) {
    t.ai.state = 'recover';
    t.ai.until = s.elapsed + 0.8;
    ev.push({ type: 'interrupt', id: t.id });
  }
  if (t.duelBeast) {
    const yieldAt = t.yieldAt ?? DUEL_YIELD;
    if (t.hp <= t.maxHp * yieldAt && !t.yielded) {
      t.yielded = true;
      t.hp = Math.round(t.maxHp * yieldAt);
      ev.push({ type: 'duelwon' });
    }
    return amount;
  }
  if (t.hp <= 0) killFoe(s, t, ev);
  return amount;
}
function killFoe(s, t, ev) {
  const p = activeBeast(s) || (s.tamed || []).find(x => x.id === s.expedition?.activeId);
  if (isBoss(s, t)) {
    ev.push({ type: 'bossdown' });
    return;
  }
  if (!s.wild.includes(t)) return;
  s.wild = s.wild.filter(w => w !== t);
  const drops = t.released ? {} : rollDrops(phenotype(t.genome));
  if (t.beast) drops.crystal = (drops.crystal || 0) + 3;
  if (p && personality(p)?.loot && Math.random() < 0.5) drops.food = (drops.food || 0) + 1;
  give(s, drops);
  tally(s, t.beast ? 'beastkill' : 'kill');
  let up = 0;
  if (p) {
    p.bond = Math.min(100, (p.bond || 0) + 1);
    up = grantXp(s, p, t.beast ? 25 : 8);
    if (up) remember(s, p, `在戰鬥中成長到 Lv${p.level}。`);
  }
  ev.push({ type: 'kill', id: t.id, x: t.x, z: t.z, beast: t.beast || null, drops, levelUp: up ? p.level : 0 });
}
// shapes
const inArc = (o, dir, r, half, t, pad = 0.4) =>
  dist(o, t) <= r + pad && Math.abs(wrap(angleTo(o, t) - dir)) <= half + Math.atan2(pad, Math.max(0.5, dist(o, t)));
const inRing = (o, r, t, pad = 0.4) => dist(o, t) <= r + pad;
function inLane(o, dir, len, width, t) {
  const dx = t.x - o.x,
    dz = t.z - o.z,
    fx = Math.sin(dir),
    fz = Math.cos(dir),
    along = dx * fx + dz * fz,
    side = Math.abs(dx * fz - dz * fx);
  return along >= -0.5 && along <= len + 0.5 && side <= width / 2 + 0.5;
}
// ---------- your moves ----------
const pk0 = p => perks(p);
function ready(s, key) {
  return (normalizeCombat(s).cd[key] || 0) <= s.elapsed;
}
// Facing: riding, where you steer; otherwise toward the locked foe.
function facing(s, from, target) {
  if (s.expedition?.mounted || !target) return s.player.heading || 0;
  return angleTo(from, target);
}
export function basicAttack(s, heavy = false, env = {}) {
  const c = normalizeCombat(s),
    p = activeBeast(s),
    ev = [];
  if (!p) return { ok: false, error: '需要出戰的御獸。', events: ev };
  if (!ready(s, 'basic')) return { ok: false, quiet: true, events: ev };
  const pk = perks(p),
    sta = (heavy ? 12 : 3) * (1 - pk.sta);
  if ((p.stamina ?? 100) < sta) return { ok: false, error: '御獸累了，先讓牠喘口氣。', events: ev };
  const target = lockTarget(s);
  let from = allyPos(s);
  // not riding: the beast closes in on its target before it swings
  if (!s.expedition?.mounted && target) {
    const d = dist(from, target),
      reach = allyPower(s, p).reach;
    if (d > reach * 0.85 && d < 13) {
      const a = angleTo(target, from);
      c.ax = target.x + Math.sin(a) * reach * 0.7;
      c.az = target.z + Math.cos(a) * reach * 0.7;
      from = { x: c.ax, z: c.az };
      ev.push({ type: 'lunge', x: c.ax, z: c.az });
    }
  }
  const maxCombo = pk.combo4 ? 4 : 3,
    combo = !heavy && c.combo.until > s.elapsed && c.combo.n < maxCombo ? c.combo.n + 1 : 1,
    mul = heavy ? 2.0 : [1, 1, 1.15, 1.7, 1.9][combo],
    pw = allyPower(s, p),
    dir = facing(s, from, target);
  c.combo = { n: heavy ? 0 : combo, until: s.elapsed + COMBO_WINDOW };
  c.cd.basic = s.elapsed + (heavy ? 1.0 : combo >= 3 ? 0.62 : 0.36);
  c.facing = dir;
  p.stamina = Math.max(0, (p.stamina ?? 100) - sta);
  ev.push({ type: 'swing', combo, heavy, x: from.x, z: from.z, dir, reach: pw.reach });
  const knock = heavy ? 3 : combo >= 3 ? 2.4 : 0.5;
  let hits = 0;
  for (const t of foesNear(s, pw.reach + 3, from))
    if (inArc(from, dir, pw.reach, 0.95, t)) {
      damageFoe(s, t, pw.atk * mul, ev, {
        knock,
        from,
        heavy: heavy || combo === maxCombo,
        combo3: combo >= 3,
        canMove: env.canMove,
        rng: env.rng
      });
      hits++;
    }
  if (!hits) ev.push({ type: 'whiff' });
  tally(s, 'strike');
  return { ok: true, hits, combo, events: ev };
}
export function useSkill(s, slot, env = {}) {
  const c = normalizeCombat(s),
    p = activeBeast(s),
    ev = [];
  if (!p) return { ok: false, error: '需要出戰的御獸。', events: ev };
  const key = beastSkills(p)[slot],
    sk = SKILLS[key];
  if (!sk) return { ok: false, error: '沒有這個技能。', events: ev };
  if (!ready(s, 'skill' + slot)) {
    return { ok: false, error: `${sk.name}冷卻中（${Math.ceil(c.cd['skill' + slot] - s.elapsed)} 秒）。`, events: ev };
  }
  if ((p.stamina ?? 100) < sk.sta * (1 - perks(p).sta))
    return { ok: false, error: '御獸累了，先讓牠喘口氣。', events: ev };
  const target = lockTarget(s),
    pw = allyPower(s, p);
  pw.atk *= 1 + pk0(p).skill;
  let from = allyPos(s);
  const dir = facing(s, from, target);
  const pk = perks(p);
  c.cd['skill' + slot] = s.elapsed + sk.cd * (1 - pk.cd);
  p.stamina = Math.min(100, Math.max(0, (p.stamina ?? 100) - sk.sta * (1 - pk.sta)) + pk.refund);
  const base = { from, canMove: env.canMove, rng: env.rng };
  const fx = { type: 'skill', skill: key, x: from.x, z: from.z, dir, color: sk.color, range: sk.range };
  switch (sk.shape) {
    case 'cone':
      for (const t of foesNear(s, sk.range + 2, from))
        if (inArc(from, dir, sk.range, sk.arc / 2, t))
          damageFoe(s, t, pw.atk * sk.mul, ev, { ...base, dot: sk.burn, dotColor: sk.color });
      break;
    case 'ring':
      for (const t of foesNear(s, sk.range + 2, from))
        if (inRing(from, sk.range, t))
          damageFoe(s, t, pw.atk * sk.mul, ev, { ...base, knock: sk.knock, stun: sk.stun, slow: sk.slow });
      break;
    case 'chain': {
      if (!target || dist(from, target) > sk.range) {
        ev.push({ type: 'whiff' });
        break;
      }
      const hit = [target];
      let last = target;
      for (let i = 0; i < sk.jumps; i++) {
        const next = foesNear(s, 7, last).find(f => !hit.includes(f));
        if (!next) break;
        hit.push(next);
        last = next;
      }
      fx.chain = hit.map(t => ({ x: t.x, z: t.z }));
      for (const t of hit) damageFoe(s, t, pw.atk * sk.mul, ev, { ...base, stun: sk.stun });
      break;
    }
    case 'shot':
      c.shots.push({
        id: 'a' + Math.floor(s.elapsed * 1000) + slot,
        side: 'ally',
        x: from.x,
        z: from.z,
        vx: Math.sin(dir) * 15,
        vz: Math.cos(dir) * 15,
        until: s.elapsed + sk.range / 15,
        dmg: pw.atk * sk.mul,
        color: sk.color,
        dot: sk.poison
      });
      break;
    case 'lane': {
      const len = sk.range,
        to = { x: from.x + Math.sin(dir) * len, z: from.z + Math.cos(dir) * len };
      for (const t of foesNear(s, len + 3, from))
        if (inLane(from, dir, len, sk.width, t)) damageFoe(s, t, pw.atk * sk.mul, ev, { ...base, knock: 1.5 });
      fx.tx = to.x;
      fx.tz = to.z;
      c.iframesUntil = s.elapsed + 0.4;
      ev.push({ type: 'dash', x: to.x, z: to.z, ally: true });
      if (!s.expedition?.mounted) {
        c.ax = to.x;
        c.az = to.z;
      }
      break;
    }
    case 'burst': {
      const at =
        target && dist(from, target) <= sk.range
          ? { x: target.x, z: target.z }
          : { x: from.x + Math.sin(dir) * 6, z: from.z + Math.cos(dir) * 6 };
      c.zones.push({
        side: 'ally',
        x: at.x,
        z: at.z,
        r: sk.radius,
        at: s.elapsed + sk.delay,
        start: s.elapsed,
        dmg: pw.atk * sk.mul,
        color: sk.color,
        skill: key
      });
      fx.tx = at.x;
      fx.tz = at.z;
      break;
    }
    case 'bite':
      if (!target || dist(from, target) > sk.range + pw.reach) {
        ev.push({ type: 'whiff' });
        break;
      }
      if (!s.expedition?.mounted) {
        const a = angleTo(target, from);
        c.ax = target.x + Math.sin(a) * 1.4;
        c.az = target.z + Math.cos(a) * 1.4;
      }
      damageFoe(s, target, pw.atk * sk.mul, ev, { ...base, heavy: true, knock: 1 });
      break;
    case 'self':
      if (sk.guard) c.guardUntil = s.elapsed + sk.guard;
      if (sk.heal) {
        p.health = Math.min(100, (p.health ?? 100) + sk.heal[0]);
        s.vitals.health = Math.min(100, s.vitals.health + sk.heal[1]);
        ev.push({ type: 'heal', amount: sk.heal[0], x: from.x, z: from.z });
      }
      break;
  }
  ev.unshift(fx);
  return { ok: true, skill: key, events: ev };
}
// A quick dash with a moment of invulnerability. Returns the offset; the caller moves the player (and boat).
export function dodge(s, dx = 0, dz = 0) {
  const c = normalizeCombat(s);
  if (!ready(s, 'dodge')) return { ok: false, quiet: true };
  let L = Math.hypot(dx, dz);
  if (L < 0.1) {
    // no direction held: hop back from the nearest threat
    const f = foesNear(s, ENGAGE).sort((a, b) => dist(a, s.player) - dist(b, s.player))[0];
    const a = f ? angleTo(f, s.player) : (s.player.heading || 0) + Math.PI;
    dx = Math.sin(a);
    dz = Math.cos(a);
    L = 1;
  }
  c.cd.dodge = s.elapsed + DODGE.cd;
  const ip = s.expedition?.mounted ? perks(activeBeast(s)).iframes : 1;
  c.iframesUntil = s.elapsed + DODGE.iframes * ip;
  return {
    ok: true,
    dx: (dx / L) * DODGE.dist,
    dz: (dz / L) * DODGE.dist,
    events: [{ type: 'dodge', x: s.player.x, z: s.player.z }]
  };
}
// ---------- the great foes (0.28) ----------
// 深海守望者 (the boss, afloat only) and 嘯岳 in the trial of might each have their own moves. Every one is
// telegraphed on the ground — a ring for a slam or a roar, a wide arc for a wave or a swipe, a lane for a ram or a
// pounce — and leaves them open (破綻) for a moment after. Below half strength the watcher gets faster.
export const DUEL_YIELD = 0.3;
export const SPECIAL = {
  boss: {
    name: '深海守望者',
    range: 30,
    speed: 2.2,
    want: 8,
    dmg: 13,
    vessel: true,
    phase2: 0.5,
    moves: {
      slam: {
        shape: 'sweep',
        windup: 1.45,
        range: 7.5,
        mul: 1.1,
        recover: 1.7,
        line: '深海守望者高高躍起——快離開牠身邊！'
      },
      wave: {
        shape: 'bite',
        windup: 1.15,
        range: 13,
        half: 1.05,
        mul: 0.9,
        recover: 1.3,
        line: '守望者甩動長尾，掀起一道巨浪！'
      },
      ram: {
        shape: 'charge',
        windup: 1.25,
        range: 16,
        width: 4.4,
        mul: 1.3,
        min: 5,
        recover: 1.9,
        line: '守望者沉下身子，朝你直衝而來！'
      }
    }
  },
  // 0.31: 嘯岳 torn awake in the corrupted garden — faster, harder, and the garden's thorns answer its roar
  frenzy: {
    name: '嘯岳（狂暴）',
    range: 40,
    speed: 3.7,
    want: 3.8,
    dmg: 13,
    phase2: 0.5,
    moves: {
      swipe: {
        shape: 'bite',
        windup: 1.05,
        range: 8,
        half: 1.0,
        mul: 1,
        recover: 1.2,
        line: '嘯岳壓低身子——爪擊要來了！'
      },
      pounce: {
        shape: 'charge',
        windup: 0.95,
        range: 13,
        width: 3,
        mul: 1.25,
        min: 4,
        recover: 1.5,
        line: '嘯岳弓起背，朝你撲來！'
      },
      roar: { shape: 'sweep', windup: 1.35, range: 7, mul: 0.6, recover: 1.1, stun: true, line: '嘯岳深吸一口氣——' },
      thorns: {
        shape: 'sweep',
        windup: 1.8,
        range: 11,
        mul: 1.4,
        recover: 1.6,
        line: '整座花園的荊棘朝牠腳下收攏——快跑出圈外！'
      }
    }
  },
  duel: {
    name: '嘯岳',
    range: 40,
    speed: 3.1,
    want: 3.6,
    dmg: 9,
    moves: {
      swipe: {
        shape: 'bite',
        windup: 1.3,
        range: 7.5,
        half: 0.95,
        mul: 1,
        recover: 1.4,
        line: '嘯岳壓低身子——爪擊要來了！'
      },
      pounce: {
        shape: 'charge',
        windup: 1.05,
        range: 11,
        width: 2.6,
        mul: 1.2,
        min: 4,
        recover: 1.7,
        line: '嘯岳弓起背，準備撲上來！'
      },
      roar: { shape: 'sweep', windup: 1.5, range: 6, mul: 0.6, recover: 1.2, stun: true, line: '嘯岳深吸一口氣——' }
    }
  }
};
// a warship or a better boat takes the edge off the watcher's blows
const vesselFactor = s => (s.ship ? hullDamageFactor(s) : Math.max(0.35, 1 - (s.expedition?.boatLevel || 0) * 0.15));
function specialTurn(s, w, def, env, ev, dt, rng, p, ally, riding, me) {
  const t = s.elapsed,
    id = w.id || 'boss',
    ai = (w.ai ??= { state: 'approach', until: 0, next: t + 1.2 + rng() });
  if (ai.stunUntil > t) return;
  const phase2 = !!def.phase2 && w.hp < w.maxHp * def.phase2,
    quick = phase2 ? 0.75 : 1,
    onAlly = p && ally && !riding && (dist(w, ally) + 2 < dist(w, me) || (personality(p)?.taunt && dist(w, ally) < 9)),
    target = onAlly ? ally : me,
    d = dist(w, target);
  if (ai.state === 'approach') {
    if (t >= ai.next) {
      const opts = Object.entries(def.moves).filter(([, m]) => d < m.range * 0.92 && (!m.min || d > m.min));
      if (opts.length) {
        const [name, m] = opts[Math.floor(rng() * opts.length)],
          dir = angleTo(w, target);
        Object.assign(ai, {
          state: 'windup',
          move: name,
          dir,
          ox: w.x,
          oz: w.z,
          start: t,
          until: t + m.windup * quick
        });
        w.windup = ai.until;
        w.heading = dir;
        ev.push({
          type: 'telegraph',
          id,
          move: m.shape,
          x: w.x,
          z: w.z,
          dir,
          range: m.range,
          width: m.width || 0,
          half: m.half,
          until: ai.until,
          start: t,
          big: true,
          line: m.line
        });
        return;
      }
    }
    const a = angleTo(w, target),
      step = def.speed * (phase2 ? 1.25 : 1) * dt * (d > def.want ? 1 : -0.5);
    if (Math.abs(d - def.want) > 0.5) {
      const nx = w.x + Math.sin(a) * step,
        nz = w.z + Math.cos(a) * step;
      if (!env.canMove || env.canMove(w, nx, nz)) {
        w.x = nx;
        w.z = nz;
      }
    }
    w.heading = a;
    return;
  }
  if (ai.state === 'windup' && t >= ai.until) {
    const m = def.moves[ai.move],
      o = { x: ai.ox, z: ai.oz },
      dmg = def.dmg * (m.mul || 1) * (phase2 ? 1.2 : 1) * (def.vessel ? vesselFactor(s) : 1);
    w.windup = 0;
    w.struckAt = t;
    ev.push({ type: 'strike', id, move: m.shape, x: w.x, z: w.z, dir: ai.dir, big: true });
    const test = pt =>
      m.shape === 'bite'
        ? inArc(o, ai.dir, m.range, m.half || 0.85, pt, 0.2)
        : m.shape === 'sweep'
          ? inRing(o, m.range, pt, 0.2)
          : inLane(o, ai.dir, m.range, m.width, pt);
    // 0.36: a pillar or a fallen wall between you and the blow takes it (the thorns rise from the ground: no cover)
    const covered = pt => m.shape !== 'sweep' && !!env.cover?.(o, pt);
    const victims = [];
    if (test(me) && !covered(me)) victims.push('player');
    if (p && ally && !riding && test(ally) && !covered(ally)) victims.push('ally');
    if (test(me) && covered(me)) ev.push({ type: 'covered', id });
    for (const v of victims) hurt(s, v, dmg, w, ev);
    // a roar that lands leaves your beast reeling
    if (m.stun && victims.length) normalizeCombat(s).cd.basic = Math.max(normalizeCombat(s).cd.basic || 0, t + 1.2);
    if (m.shape === 'charge') {
      const nx = o.x + Math.sin(ai.dir) * m.range * 0.85,
        nz = o.z + Math.cos(ai.dir) * m.range * 0.85;
      if (!env.canMove || env.canMove(w, nx, nz)) {
        w.x = nx;
        w.z = nz;
      }
    }
    if (!victims.length) ev.push({ type: 'dodged', id });
    ai.state = 'recover';
    ai.until = t + m.recover;
    return;
  }
  if (ai.state === 'recover' && t >= ai.until) {
    ai.state = 'approach';
    ai.next = t + (phase2 ? 0.45 : 0.85) + rng() * 0.8;
  }
}
// ---------- the fight, each frame ----------
// env: { canMove(w, x, z), canReach(w) — can this foe get at the player where they are, rng, autoAlly }
export function tickCombat(s, dt, env = {}) {
  const c = normalizeCombat(s),
    ev = [],
    t = s.elapsed,
    rng = env.rng || Math.random,
    p = activeBeast(s),
    riding = !!s.expedition?.mounted,
    me = { x: s.player.x, z: s.player.z };
  const ally = p ? allyPos(s) : null;
  c.engaged = combatActive(s);
  // damage over time
  for (const w of s.wild || [])
    if (w.dot && w.dot.until > t) {
      w.dotAcc = (w.dotAcc || 0) + w.dot.dps * dt;
      if (w.dotAcc >= 1) {
        const n = Math.floor(w.dotAcc);
        w.dotAcc -= n;
        w.hp = (w.hp ?? 60) - n;
        ev.push({ type: 'hit', target: 'foe', id: w.id, x: w.x, z: w.z, amount: n, dot: true });
        if (w.hp <= 0) killFoe(s, w, ev);
      }
    }
  // foes
  for (const w of [...(s.wild || [])]) {
    if (!dangerousFoe(w, t) || w.dissolving || !onLayer(s, w) || dist(w, me) > AI_RANGE) {
      if (w.ai && w.ai.state === 'windup') delete w.ai;
      continue;
    }
    foeStats(w);
    const ai = (w.ai ??= { state: 'approach', until: 0, next: t + 0.5 + rng() * 0.8 });
    if (ai.stunUntil > t) continue;
    // a foe driven off by the paddle is running away (game.js moves it)
    if (w.fleeUntil > t && !frenzied(w, t)) {
      ai.state = 'approach';
      w.windup = 0;
      continue;
    }
    const slow = ai.slowUntil > t ? 0.5 : 1,
      st = foeStats(w),
      reach = env.canReach ? env.canReach(w) : true;
    // aggro: your beast draws attacks while it is out and nearer than you
    const onAlly =
      p && ally && !riding && (dist(w, ally) + 2 < dist(w, me) || (personality(p)?.taunt && dist(w, ally) < 9));
    const target = onAlly ? ally : me;
    if (!reach && !onAlly) {
      ai.state = 'approach';
      continue;
    }
    const d = dist(w, target);
    if (ai.state === 'approach') {
      const moves = foeMoves(w);
      if (t >= ai.next) {
        let move = null;
        if (moves.includes('spit') && d > 5 && d < MOVE.spit.range) move = 'spit';
        else if (moves.includes('charge') && d > 4 && d < MOVE.charge.range) move = 'charge';
        else if (moves.includes('sweep') && d < MOVE.sweep.range && rng() < 0.5) move = 'sweep';
        else if (d < MOVE.bite.range + st.size * 0.4) move = 'bite';
        if (move) {
          const m = MOVE[move],
            dir = angleTo(w, target);
          ai.state = 'windup';
          ai.move = move;
          ai.dir = dir;
          ai.ox = w.x;
          ai.oz = w.z;
          ai.start = t;
          ai.until = t + m.windup * (slow < 1 ? 1.3 : 1) * (frenzied(w, t) ? 0.85 : 1);
          w.heading = dir;
          w.windup = ai.until; // world.js rears the model up
          ev.push({
            type: 'telegraph',
            id: w.id,
            move,
            x: w.x,
            z: w.z,
            dir,
            range: move === 'bite' ? m.range + st.size * 0.4 : m.range,
            width: m.width || 0,
            until: ai.until,
            start: t
          });
          continue;
        }
      }
      // close in (spitters keep their distance)
      const want = foeMoves(w).includes('spit') ? 8 : MOVE.bite.range * 0.8,
        a = angleTo(w, target),
        step = st.speed * slow * (frenzied(w, t) ? 1.2 : 1) * dt * (d > want ? 1 : -0.6);
      if (Math.abs(d - want) > 0.4) {
        const nx = w.x + Math.sin(a) * step,
          nz = w.z + Math.cos(a) * step;
        if (!env.canMove || env.canMove(w, nx, nz)) {
          w.x = nx;
          w.z = nz;
        }
      }
      w.heading = a;
      continue;
    }
    if (ai.state === 'windup' && t >= ai.until) {
      const m = MOVE[ai.move],
        o = { x: ai.ox, z: ai.oz },
        dmg = st.bite * m.mul * (frenzied(w, t) ? 1.2 : 1);
      w.struckAt = t;
      w.windup = 0;
      ev.push({ type: 'strike', id: w.id, move: ai.move, x: w.x, z: w.z, dir: ai.dir });
      if (ai.move === 'spit') {
        c.shots.push({
          id: 'f' + w.id + Math.floor(t * 100),
          side: 'foe',
          from: w.id,
          x: w.x,
          z: w.z,
          vx: Math.sin(ai.dir) * m.speed,
          vz: Math.cos(ai.dir) * m.speed,
          until: t + m.range / m.speed,
          dmg,
          color: spitColor(w)
        });
      } else {
        const victims = [];
        const test = pt =>
          ai.move === 'bite'
            ? inArc(o, ai.dir, m.range + st.size * 0.4, 0.85, pt, 0.2)
            : ai.move === 'sweep'
              ? inRing(o, m.range, pt, 0.2)
              : inLane(o, ai.dir, m.range, m.width, pt);
        if (test(me)) victims.push('player');
        if (p && ally && !riding && test(ally)) victims.push('ally');
        for (const v of victims) hurt(s, v, dmg, w, ev);
        if (ai.move === 'charge') {
          const nx = o.x + Math.sin(ai.dir) * m.range,
            nz = o.z + Math.cos(ai.dir) * m.range;
          if (!env.canMove || env.canMove(w, nx, nz)) {
            w.x = nx;
            w.z = nz;
          }
        }
        if (!victims.length) ev.push({ type: 'dodged', id: w.id });
      }
      ai.state = 'recover';
      ai.until = t + m.recover;
      continue;
    }
    if (ai.state === 'recover' && t >= ai.until) {
      ai.state = 'approach';
      ai.next = t + 0.5 + rng() * 0.9;
    }
  }
  // 0.29: 戰鬥癒合 mends the beast; a gentle one now and then mends you; the stand of a last-stood beast resets
  if (p && c.engaged) {
    const pk = perks(p),
      per = personality(p);
    if (pk.regen) p.health = Math.min(100, (p.health ?? 100) + pk.regen * dt);
    if (per?.mends && rng() < dt * 0.08 && s.vitals.health < 100) {
      s.vitals.health = Math.min(100, s.vitals.health + 4);
      ev.push({ type: 'mend', name: p.name, x: s.player.x, z: s.player.z });
    }
  } else if (p) p.stoodFast = false;
  // 0.28: the two great foes fight the same way as everything else — telegraphed, dodgeable, open after a blow
  const boss = s.expedition?.boss;
  if (
    boss &&
    !boss.defeated &&
    !s.inCave &&
    !['foot', 'cabin', 'aboard'].includes(s.player.mode) &&
    dist(boss, me) < SPECIAL.boss.range
  )
    specialTurn(s, boss, SPECIAL.boss, env, ev, dt, rng, p, ally, riding, me);
  else if (boss?.ai?.state === 'windup') delete boss.ai;
  const xb = s.story?.duel && s.story.beast;
  if (xb && !!s.inCave === !!xb.cave && s.player.mode === 'foot' && dist(xb, me) < SPECIAL.duel.range) {
    foesNear(s, 0); // tags 嘯岳 as a foe
    specialTurn(s, xb, s.story.duel.frenzy ? SPECIAL.frenzy : SPECIAL.duel, env, ev, dt, rng, p, ally, riding, me);
    s.story.duel.windupAt = xb.ai?.state === 'windup' ? xb.ai.start : null; // world.js rears the model up
  }
  // projectiles
  c.shots = c.shots.filter(sh => {
    sh.x += sh.vx * dt;
    sh.z += sh.vz * dt;
    if (sh.side === 'foe') {
      if (dist(sh, me) < 1.3) {
        hurt(s, 'player', sh.dmg, null, ev);
        ev.push({ type: 'impact', x: sh.x, z: sh.z, color: sh.color });
        return false;
      }
      if (p && ally && !riding && dist(sh, ally) < 1.3) {
        hurt(s, 'ally', sh.dmg, null, ev);
        ev.push({ type: 'impact', x: sh.x, z: sh.z, color: sh.color });
        return false;
      }
    } else {
      const hit = foesNear(s, 30, sh).find(f => dist(f, sh) < 1.4 + (f.genome ? phenotype(f.genome).size * 0.4 : 2));
      if (hit) {
        damageFoe(s, hit, sh.dmg, ev, { dot: sh.dot, dotColor: sh.color, rng });
        ev.push({ type: 'impact', x: sh.x, z: sh.z, color: sh.color });
        return false;
      }
    }
    return t < sh.until;
  });
  // delayed areas (crystal spikes)
  c.zones = c.zones.filter(z => {
    if (t < z.at) return true;
    for (const f of foesNear(s, z.r + 4, z))
      if (inRing(z, z.r, f)) damageFoe(s, f, z.dmg, ev, { from: z, knock: 1.2, heavy: true, rng });
    ev.push({ type: 'erupt', x: z.x, z: z.z, r: z.r, color: z.color });
    return false;
  });
  // your beast, when you are not riding it: keeps beside you, and in a fight goes for the target on its own
  if (p && ally && !riding) {
    const target = c.engaged ? lockTarget(s) : null,
      pw = allyPower(s, p),
      speed = 4.2 + phenotype(p.genome).speed / 40;
    let goal;
    if (target) {
      const a = angleTo(target, ally);
      goal = { x: target.x + Math.sin(a) * pw.reach * 0.75, z: target.z + Math.cos(a) * pw.reach * 0.75 };
    } else {
      goal = { x: me.x - Math.sin(s.player.heading || 0) * 2.4, z: me.z - Math.cos(s.player.heading || 0) * 2.4 };
    }
    const d = dist(ally, goal);
    if (d > 0.3) {
      const k = Math.min(1, (speed * dt) / d),
        nx = ally.x + (goal.x - ally.x) * k,
        nz = ally.z + (goal.z - ally.z) * k,
        can = env.allyCan || (() => true);
      // 0.36.3: walls stop it (in the garden it used to fight straight through the hedges); slide along them
      if (can(nx, nz)) {
        c.ax = nx;
        c.az = nz;
      } else if (can(nx, ally.z)) c.ax = nx;
      else if (can(ally.x, nz)) c.az = nz;
    }
    if (
      target &&
      env.autoAlly !== false &&
      dist({ x: c.ax, z: c.az }, target) < pw.reach + 0.6 &&
      ready(s, 'basic') &&
      t >= (c.autoAt || 0)
    ) {
      c.autoAt = t + 1.5;
      const r = basicAttack(s, false, env);
      ev.push(...r.events.map(e => ({ ...e, auto: true })));
    }
  }
  stepAssist(s, dt, ev, rng);
  return ev;
}
// ---------- 援護召喚 (0.40) ----------
// While you ride (above all under water, where you cannot get off) a second contract can be torn open for a short
// assist: that beast swims out beside you, goes for the foe your mount is on and strikes on its own until its time
// or its stamina runs out, then goes back into its card. One assist at a time, with a cooldown.
export const ASSIST = { time: 25, every: 1.6, sta: 5, min: 25, stop: 12, cd: 20 };
export const assistBeast = s => {
  const a = s.expedition?.assist;
  return a ? (s.tamed || []).find(p => p.id === a.id) || null : null;
};
export function callAssist(s, id) {
  const e = s.expedition,
    c = normalizeCombat(s),
    p = (s.tamed || []).find(x => x.id === id);
  if (!e?.mounted) return { ok: false, error: '騎乘時才能召喚援護。' };
  if (!p || p.kind === 'creature') return { ok: false, error: '只有御獸能援護。' };
  if (p.id === e.activeId) return { ok: false, error: '牠正載著你。' };
  if (e.assist?.id === id) {
    dismissAssist(s);
    return { ok: true, message: `${p.name} 回到契約紙裡。`, back: true };
  }
  if (e.diving && phenotype(p.genome).habitat === 'land')
    return { ok: false, error: `${p.name} 不會游泳，沒辦法下潛援護。` };
  if ((p.bond || 0) < 30) return { ok: false, error: '羈絆 30 才能援護。' };
  if ((p.health ?? 100) < 15 || (p.stamina ?? 100) < ASSIST.min)
    return { ok: false, error: `${p.name} 太累了（援護需要 ${ASSIST.min} 耐力）。` };
  const left = (c.cd.assist || 0) - s.elapsed;
  if (left > 0 && !e.assist) return { ok: false, error: `援護契約還在冷卻（${Math.ceil(left)} 秒）。` };
  const h = s.player.heading || 0;
  e.assist = {
    id,
    until: s.elapsed + ASSIST.time,
    next: s.elapsed + 0.6,
    x: s.player.x + Math.cos(h) * 3,
    z: s.player.z - Math.sin(h) * 3,
    heading: h
  };
  return { ok: true, message: `援護召喚：${p.name} 衝出契約紙，和你一起戰鬥（${ASSIST.time} 秒）。` };
}
export function dismissAssist(s) {
  const e = s.expedition;
  if (!e?.assist) return;
  e.assist = null;
  normalizeCombat(s).cd.assist = s.elapsed + ASSIST.cd;
}
function stepAssist(s, dt, ev, rng) {
  const e = s.expedition,
    a = e?.assist;
  if (!a) return;
  const p = assistBeast(s),
    t = s.elapsed;
  if (!p || !e.mounted || t >= a.until || (p.stamina ?? 100) < ASSIST.stop || (p.health ?? 100) < 10) {
    dismissAssist(s);
    ev.push({ type: 'assistend', id: p?.id, name: p?.name || '' });
    return;
  }
  const pw = allyPower(s, p),
    foes = foesNear(s, ENGAGE + 4, a),
    target = foes.sort((x, y) => dist(x, a) - dist(y, a))[0] || null,
    speed = 6 + phenotype(p.genome).speed / 30;
  let goal;
  if (target) {
    const ang = angleTo(target, a);
    goal = { x: target.x + Math.sin(ang) * pw.reach * 0.7, z: target.z + Math.cos(ang) * pw.reach * 0.7 };
  } else {
    // no foe: it swims at your side
    const h = s.player.heading || 0;
    goal = { x: s.player.x + Math.cos(h) * 3, z: s.player.z - Math.sin(h) * 3 };
  }
  const d = dist(a, goal);
  if (d > 0.3) {
    const k = Math.min(1, (speed * dt) / d);
    a.heading = angleTo(a, goal);
    a.x += (goal.x - a.x) * k;
    a.z += (goal.z - a.z) * k;
  } else if (target) a.heading = angleTo(a, target);
  if (target && t >= a.next && dist(a, target) < pw.reach + 0.8) {
    a.next = t + ASSIST.every;
    p.stamina = Math.max(0, (p.stamina ?? 100) - ASSIST.sta);
    a.heading = angleTo(a, target);
    ev.push({ type: 'swing', combo: 1, heavy: false, x: a.x, z: a.z, dir: a.heading, reach: pw.reach, assist: true });
    const before = s.wild.length;
    damageFoe(s, target, pw.atk * 0.9, ev, { knock: 1, from: a, rng });
    if (s.wild.length < before && target.hp <= 0) {
      const up = grantXp(s, p, target.beast ? 15 : 5);
      if (up) remember(s, p, `援護戰鬥中成長到 Lv${p.level}。`);
    }
  }
}
// Damage to you or your beast, after dodges, guards and defences.
function hurt(s, who, dmg, from, ev) {
  const c = normalizeCombat(s),
    p = activeBeast(s),
    riding = !!s.expedition?.mounted;
  if (c.iframesUntil > s.elapsed && (who === 'player' || riding)) {
    ev.push({ type: 'evade' });
    return 0;
  }
  // riding, the beast under you takes the blow
  const onBeast = who === 'ally' || (riding && p);
  if (onBeast && p) {
    const def = geneStats(bsOf(p.genome)).def,
      guard = c.guardUntil > s.elapsed ? 0.3 : 1,
      pk = perks(p),
      amount = Math.max(1, Math.round(dmg * 0.8 * Math.max(0.35, 1 - def / 50) * guard * (1 - pk.guard)));
    p.health = Math.max(0, (p.health ?? 100) - amount);
    ev.push({
      type: 'hit',
      target: 'ally',
      x: riding ? s.player.x : c.ax,
      z: riding ? s.player.z : c.az,
      amount,
      guarded: guard < 1
    });
    if (guard < 1 && from && (dangerousFoe(from, s.elapsed) || from.duelBeast || isBoss(s, from)))
      damageFoe(s, from, allyPower(s, p).atk * 0.8 * pk.counter, ev, {});
    if (p.health - amount <= 0 && pk.lastStand && !p.stoodFast) {
      p.stoodFast = true;
      p.health = 1;
      ev.push({
        type: 'hit',
        target: 'ally',
        x: riding ? s.player.x : c.ax,
        z: riding ? s.player.z : c.az,
        amount: 0,
        guarded: true
      });
      return 0;
    }
    if (p.health <= 0) {
      ev.push({ type: 'ko', name: p.name, id: p.id });
      remember(s, p, '在戰鬥中倒下了，回到契約裡休息。');
      s.expedition.activeId = null;
      if (riding) {
        s.expedition.mounted = false;
        s.expedition.diving = false;
        const home = s.ship && !s.skiff ? s.ship : s.boat;
        Object.assign(s.player, { x: home.x, z: home.z });
      }
    }
    return amount;
  }
  // guard jobs and guardian beasts at home soften what reaches you (game.js sets playerMul each frame)
  const amount = Math.max(1, Math.round(dmg * (c.playerMul ?? 1)));
  s.vitals.health = Math.max(0, s.vitals.health - amount);
  ev.push({ type: 'hit', target: 'player', x: s.player.x, z: s.player.z, amount });
  return amount;
}
export const cooldownLeft = (s, key) => Math.max(0, (normalizeCombat(s).cd[key] || 0) - s.elapsed);
