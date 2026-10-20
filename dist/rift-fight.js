// 0.72: the rift's trials fought in real time. The layer's waves (chapter3.js LAYERS) come out of the rift as
// foes on the wasteland around it, and you and your beast fight them with the lake's combat (combat.js): your beast's
// strikes and skills, dodging, its health. Clear the three waves and the trial is won (chapter3.js finishTrial gives
// the same rewards and story as before); your beast falling, or walking away from the rift, ends it. Pure.
import { makeGenome } from './genetics.js?v=0.73.0';
import { LAYERS, layerOpen, normalizeChapter3, finishTrial, K_LOGS, RIFT } from './chapter3.js?v=0.73.0';
import { activeBeast, allyPower, normalizeLevel } from './combat.js?v=0.73.0';
import { toWorld } from './dome.js?v=0.73.0';

export const ARENA_R = 30; // walk farther than this from the rift and you have left the fight
// how each of the rift's things looks and moves (a land body, tinted to crystal) and how tough it is
export const RIFT_FOES = {
  shard: { name: '裂縫晶骸', form: 0, strain: 1, hp: 0.9, bite: 6, size: 0.8 },
  husk: { name: '空殼載體', form: 1, strain: 0, hp: 1, bite: 8, size: 1 },
  warden: { name: '裂縫守門者', form: 2, strain: 3, hp: 2.6, bite: 12, size: 1.5 },
  mirror: { name: '鏡像載體', form: 1, strain: 2, hp: 1.3, bite: 10, size: 1.05 },
  khusk: { name: '空殼 · 研究員 K.', form: 2, strain: 2, hp: 3.2, bite: 14, size: 1.4 }
};
export const riftCentre = () => toWorld(RIFT);
export const riftFoes = s => (s.wild || []).filter(w => w.rift);

// Into the rift: the first wave comes out. Needs a beast out with you.
export function startRiftFight(s, layer = 1) {
  const c = normalizeChapter3(s);
  if (!LAYERS[layer]) return { ok: false, error: '……' };
  if (layer === 1 && c.logs < K_LOGS.length)
    return { ok: false, error: '裂縫的光太刺眼，看不清裡面。先去附近的前哨站看看，也許有人留下了什麼。' };
  if (!layerOpen(s, layer)) return { ok: false, error: '更深的地方還過不去。' };
  const p = activeBeast(s);
  if (!p) return { ok: false, error: '一個人進不去。先叫出一隻締結契約、還有體力的御獸（選單 › 御獸遠航）。' };
  normalizeLevel(p);
  s.rift = { layer, wave: 0, active: true, beast: p.id, startHealth: p.health ?? 100, seed: (s.elapsed * 1000) | 0 };
  spawnWave(s);
  return { ok: true, layer, wave: 0, foes: riftFoes(s).length };
}
// The foes of the current wave, in a ring between you and the rift. Their health is a number of your beast's
// strikes, their bite a share of its health — so any beast faces the same fight.
function spawnWave(s) {
  const r = s.rift,
    L = LAYERS[r.layer],
    kinds = L.waves[r.wave],
    p = (s.tamed || []).find(t => t.id === r.beast),
    atk = p ? allyPower(s, p).atk : 10,
    centre = riftCentre();
  s.wild = (s.wild || []).filter(w => !w.rift);
  kinds.forEach((k, i) => {
    const f = RIFT_FOES[k],
      a = (i / kinds.length) * Math.PI * 2 + r.wave * 0.7,
      hp = Math.max(20, Math.round(atk * 9 * f.hp * L.hold));
    s.wild.push({
      id: `rift-${r.layer}-${r.wave}-${i}`,
      rift: k,
      name: f.name,
      genome: makeGenome(r.seed + r.wave * 97 + i * 13, f.form, 'land', f.strain),
      x: centre.x + Math.sin(a) * 9,
      z: centre.z + 4 + Math.cos(a) * 9,
      heading: a + Math.PI,
      hostile: true,
      land: true,
      phase: i,
      trust: 0,
      maxHp: hp,
      hp,
      riftBite: Math.round(f.bite * (1 + 0.12 * r.wave)),
      riftSize: f.size
    });
  });
}
// Each frame while the fight is on. Returns what happened: 'wave' (the next wave came out), 'won', 'lost' (your
// beast fell), 'left' (you walked away), or null.
export function tickRiftFight(s) {
  const r = s.rift;
  if (!r?.active) return null;
  const centre = riftCentre(),
    p = (s.tamed || []).find(t => t.id === r.beast),
    out = Math.hypot(s.player.x - centre.x, s.player.z - centre.z) > ARENA_R;
  if (!p || (p.health ?? 0) <= 0 || s.expedition?.activeId !== r.beast) return endRiftFight(s, 'lost');
  // you, about to black out: the rift throws you out before you fall (no waking up back on the raft)
  if ((s.vitals?.health ?? 100) <= 15) {
    s.vitals.health = Math.max(s.vitals.health, 30);
    return endRiftFight(s, 'lost');
  }
  if (out) return endRiftFight(s, 'left');
  if (riftFoes(s).length) return null;
  if (r.wave + 1 >= LAYERS[r.layer].waves.length) return endRiftFight(s, 'won');
  r.wave++;
  // between waves the rift's light washes over your beast: a breath, a little health
  p.stamina = Math.min(100, (p.stamina ?? 100) + 40);
  p.health = Math.min(100, (p.health ?? 100) + 15);
  spawnWave(s);
  return { type: 'wave', wave: r.wave, foes: riftFoes(s).map(f => f.name) };
}
// The end: what is left of the rift's things goes back into it, and the trial is settled as before.
export function endRiftFight(s, how) {
  const r = s.rift;
  if (!r) return null;
  s.wild = (s.wild || []).filter(w => !w.rift);
  s.rift = null;
  if (how === 'left') return { type: 'left' };
  const p = (s.tamed || []).find(t => t.id === r.beast),
    hp = Math.max(0, p?.health ?? 0);
  const res = finishTrial(s, {
    layer: r.layer,
    over: how === 'won' ? 'won' : 'lost',
    members: [{ id: r.beast, hp, maxHp: 100 }]
  });
  // a fallen beast comes back to you tired (finishTrial leaves it at 10 health at least)
  if (how === 'lost' && p && !s.expedition.activeId) s.expedition.activeId = p.id;
  return { type: how, ...res };
}
// What the HUD says while you fight.
export function riftStatus(s) {
  const r = s.rift;
  if (!r?.active) return null;
  const left = riftFoes(s);
  return {
    title: `裂縫 · ${LAYERS[r.layer].name} · 第 ${r.wave + 1}/${LAYERS[r.layer].waves.length} 波`,
    text: left.length ? `剩下 ${left.length} 個：${[...new Set(left.map(f => f.name))].join('、')}` : '……',
    left: left.length
  };
}
