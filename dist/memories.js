// Shared memories: short lines for the moments a beast lived through with you (newest first, a few are kept).
// They are shown on the beast's page in the device's beast storage.
import { dayOf } from './clock.js?v=0.75.0';

const KEEP = 6,
  KEEPSAKES = 12;
// `keep`: a moment that matters (the day you met, a first, a great fight) — 0.74: kept for good in `pet.keeps`
// (oldest first), so the newest few lines never push it out; and the day you met is noted once, in `pet.metDay`.
export function remember(s, pet, text, keep = false) {
  if (!pet || !text) return;
  const day = dayOf(s);
  pet.metDay ??= pet.memories?.length ? pet.memories[pet.memories.length - 1].day : day;
  pet.memories = [{ day, text }, ...(pet.memories || [])].slice(0, KEEP);
  if (keep && !(pet.keeps || []).some(m => m.text === text))
    pet.keeps = [...(pet.keeps || []), { day, text }].slice(0, KEEPSAKES);
}
// The moments that matter, oldest first (saves from before 0.74: the oldest of the few lines it still has).
export const keepsakes = pet => (pet?.keeps?.length ? pet.keeps : [...(pet?.memories || [])].reverse());
// a memory that only the first time counts for
export function rememberFirst(s, pet, key, text) {
  if (!pet) return;
  pet.firsts ??= {};
  if (pet.firsts[key]) return;
  pet.firsts[key] = true;
  remember(s, pet, text, true);
}
