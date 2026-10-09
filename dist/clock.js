// Game time. state.elapsed counts game seconds; one day is 20 real minutes and starts at 06:30.
export const DAY = 1200;
export const dayOf = s => 1 + Math.floor((s.elapsed || 0) / DAY);
// 0..1 through the current day (0 = 06:30)
export const dayPhase = s => ((s.elapsed || 0) % DAY) / DAY;
export const hourOf = s => (6.5 + dayPhase(s) * 24) % 24;
// night runs from about 18:36 to 05:36
export const isNight = s => {
  const h = hourOf(s);
  return h >= 18.6 || h < 5.6;
};
// the next morning at 06:30, in elapsed seconds
export const nextMorning = s => (Math.floor((s.elapsed || 0) / DAY) + 1) * DAY;
