// The warship's upgrade tiers. Tier 1 is the ship the fusion makes, and it keeps the numbers the game always had,
// so saves from before tiers existed play exactly as they did. Each tier sails faster, reloads the cannon sooner,
// takes less damage in a fight and carries more in the hold.
// Pure data and arithmetic, so the rules, combat and the panels can all read it without importing each other.

export const SHIP_MAX_TIER = 3;
export const SHIP_TIERS = {
  1: { speed: 1, cooldown: 1, armor: 0, cargo: 300 },
  2: { speed: 1.15, cooldown: 0.8, armor: 0.15, cargo: 420 },
  3: { speed: 1.3, cooldown: 0.6, armor: 0.3, cargo: 560 }
};
// Cost to go from `tier` to `tier + 1`.
export const shipUpgradeCost = tier => ({ wood: 20 + tier * 15, metal: 12 + tier * 10, crystal: 4 + tier * 4 });

// A tier number is always 1..SHIP_MAX_TIER, whatever the save holds.
export const clampTier = t => Math.min(SHIP_MAX_TIER, Math.max(1, Math.floor(Number(t)) || 1));
export const shipTier = s => clampTier(s.ship?.tier);
export const shipStats = s => SHIP_TIERS[shipTier(s)];
export const cargoCapacity = s => shipStats(s).cargo;
// The warship takes 40 % of a hit at tier 1; armor cuts that further.
export const hullDamageFactor = s => 0.4 * (1 - shipStats(s).armor);
