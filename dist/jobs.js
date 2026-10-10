// Beast jobs (0.18): a resting partner can be given work at your land — felling driftwood, mining, foraging,
// fishing or standing guard. Every cycle working beasts bring their haul to the desk's storage box. Land beasts
// are better at land work, sea beasts at fishing; bond and temperament scale the haul.
import { phenotype } from './genetics.js?v=0.19.0';
import { hasPerk } from './codex.js?v=0.19.0';

export const JOBS = {
  lumber: { name: '伐木', icon: '🪓', out: { wood: 2 }, land: true, note: '帶回漂流木' },
  mine: {
    name: '採礦',
    icon: '⛏',
    out: { metal: 1 },
    extra: { crystal: 0.25 },
    land: true,
    note: '帶回廢金屬，偶爾有異晶'
  },
  forage: {
    name: '採集',
    icon: '🌿',
    out: { fiber: 2 },
    extra: { bait: 0.3 },
    land: true,
    note: '帶回纖維，偶爾找到誘餌'
  },
  fish: { name: '捕魚', icon: '🐟', out: { food: 2 }, land: false, note: '帶回口糧' },
  guard: { name: '看守', icon: '🛡', out: {}, note: '敵對生物的傷害降低 15%（最多 45%）' }
};
export const JOB_EVERY = 90; // seconds per work cycle
const fail = error => ({ ok: false, error });

export function normalizeJobs(s) {
  s.jobsAt ??= s.elapsed;
  for (const p of s.tamed || []) {
    if (p.job && !JOBS[p.job]) p.job = null;
    p.jobCarry ??= {};
  }
  return s;
}
export const working = s => (s.tamed || []).filter(p => p.job && p.id !== s.expedition?.activeId);
// How well this beast suits this job: habitat fit, bond and a little of its own nature.
export function jobRate(s, p) {
  const job = JOBS[p.job];
  if (!job) return 0;
  const ph = phenotype(p.genome),
    land = ph.habitat === 'land',
    fit = job.land === undefined ? 1 : job.land === land ? 1 : 0.5;
  return fit * (0.6 + (p.bond || 0) / 100) * (0.85 + ph.affinity / 400) * (hasPerk(s, 'flora') ? 1.2 : 1);
}
export function setJob(s, petId, job) {
  normalizeJobs(s);
  const p = s.tamed.find(t => t.id === petId);
  if (!p) return fail('找不到這隻御獸。');
  if (job && !JOBS[job]) return fail('沒有這種工作。');
  if (job && s.expedition?.activeId === petId) return fail('牠正在出戰。先讓牠回去休息，再分派工作。');
  p.job = job || null;
  p.jobCarry = {};
  return { ok: true, message: job ? `${p.name} 開始${JOBS[job].name}。` : `${p.name} 放下工作，好好休息。` };
}
// Each cycle: returns the haul ({ wood: 3, … }) added to the desk's storage, or null when nothing came in.
export function tickJobs(s) {
  normalizeJobs(s);
  if (s.elapsed - s.jobsAt < JOB_EVERY) return null;
  s.jobsAt = s.elapsed;
  s.storage ??= {};
  const haul = {};
  for (const p of working(s)) {
    const job = JOBS[p.job],
      r = jobRate(s, p);
    for (const [k, v] of Object.entries({ ...job.out, ...job.extra })) {
      p.jobCarry[k] = (p.jobCarry[k] || 0) + v * r;
      const whole = Math.floor(p.jobCarry[k]);
      if (whole > 0) {
        p.jobCarry[k] -= whole;
        s.storage[k] = (s.storage[k] || 0) + whole;
        haul[k] = (haul[k] || 0) + whole;
      }
    }
  }
  return Object.keys(haul).length ? haul : null;
}
// Guards at home soften every hostile hit (15 % each, up to 45 %).
export const guardFactor = s => 1 - Math.min(0.45, working(s).filter(p => p.job === 'guard').length * 0.15);
