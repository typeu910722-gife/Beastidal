// The first companion (the first ten minutes): a small beast is caught in a drifting net near the raft. You can
// free it and share a little food long before you know how to tame anything; it swims along with you for a
// while, then waits near the raft (already half-trusting) until you can make a contract with it.
import { makeGenome } from './genetics.js?v=0.15.0';

export const RESCUE_ID = 'wild-rescue';
export const RESCUE_AT = { x: 15, z: 17 };
const COMPANY = 240; // seconds it swims along after sharing food
const WAIT_AT = { x: 7, z: 9 }; // then it waits beside the raft

const rescued = s => s.wild.find(w => w.id === RESCUE_ID);
// New games only (and only once): put the tangled beast in the water.
export function spawnRescue(s) {
  if (s.rescue !== undefined) return;
  if (s.secret || s.tamed.length || s.elapsed > 600) {
    s.rescue = 'skipped';
    return;
  }
  s.rescue = 'tangled';
  s.wild.push({
    id: RESCUE_ID,
    x: RESCUE_AT.x,
    z: RESCUE_AT.z,
    homeX: RESCUE_AT.x,
    homeZ: RESCUE_AT.z,
    phase: 1.3,
    genome: makeGenome((s.seed || 1) * 7 + 3, 0, 'sea'),
    trust: 0,
    feeds: 0,
    rescue: 'tangled'
  });
}
const near = (s, w) => Math.hypot(w.x - s.player.x, w.z - s.player.z) <= 10.5;
export function freeRescue(s) {
  const w = rescued(s);
  if (!w || w.rescue !== 'tangled') return { ok: false, error: '這裡沒有被困住的生物。' };
  if (!near(s, w)) return { ok: false, error: '再靠近一點。' };
  w.rescue = 'freed';
  s.rescue = 'freed';
  w.trust = 30;
  return { ok: true, message: '漁網鬆開了。牠沒有逃走，只是怯生生地看著你。' };
}
export function shareFood(s) {
  const w = rescued(s);
  if (!w || w.rescue !== 'freed') return { ok: false, error: '牠現在不需要食物。' };
  if (!near(s, w)) return { ok: false, error: '再靠近一點。' };
  if ((s.resources.food || 0) < 1) return { ok: false, error: '身上沒有口糧了。打撈漂流物找一點吧。' };
  s.resources.food--;
  w.rescue = 'friend';
  s.rescue = 'friend';
  w.trust = 60;
  w.follow = true;
  w.followUntil = s.elapsed + COMPANY;
  return { ok: true, message: '牠小心地吃完了，然後游到你的船邊。牠決定跟著你一會兒。' };
}
// After a while it stops following and waits by the raft (unless its trust is already full).
export function tickRescue(s) {
  const w = rescued(s);
  if (!w || w.rescue !== 'friend' || !w.followUntil || s.elapsed < w.followUntil) return;
  delete w.followUntil;
  if (w.trust >= 100) return;
  w.follow = false;
  w.homeX = WAIT_AT.x;
  w.homeZ = WAIT_AT.z;
}
export const rescueStage = w => w?.rescue || null;
