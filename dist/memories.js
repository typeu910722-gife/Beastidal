// Shared memories: short lines for the moments a beast lived through with you (newest first, a few are kept).
// They are shown on the beast's page in the device's beast storage.
import { dayOf } from './clock.js?v=0.14.0';

const KEEP = 6;
export function remember(s, pet, text) {
  if (!pet || !text) return;
  pet.memories = [{ day: dayOf(s), text }, ...(pet.memories || [])].slice(0, KEEP);
}
// a memory that only the first time counts for
export function rememberFirst(s, pet, key, text) {
  if (!pet) return;
  pet.firsts ??= {};
  if (pet.firsts[key]) return;
  pet.firsts[key] = true;
  remember(s, pet, text);
}
