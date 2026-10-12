// Pacing guard: the playtest bot (scripts/pacing.mjs) plays the real rules from a new game to the warship's
// helm. Every seed must get there, without the bag jamming, in a span that keeps the early game brisk but not
// trivial. A focused bot is about three times faster than a person, so 8–40 bot minutes is roughly 25–120 real.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

let passed = 0;
for (const seed of [3, 7, 11, 23]) {
  const out = execFileSync(process.execPath, ['scripts/pacing.mjs', '--quiet', String(seed)], { encoding: 'utf8' });
  const reached = out.match(/reached "(\w+)" at (\d+):(\d+)/),
    full = Number(out.match(/bag full (\d+)×/)?.[1] ?? NaN),
    minutes = Number(reached?.[2]) + Number(reached?.[3]) / 60;
  assert.equal(reached?.[1], 'helm', `seed ${seed} got stuck:\n${out}`);
  assert.ok(minutes >= 8 && minutes <= 40, `seed ${seed}: ${minutes.toFixed(1)} min to the helm`);
  assert.ok(full <= 10, `seed ${seed}: the bag jammed ${full} times`);
  console.log(`ok - seed ${seed}: helm at ${minutes.toFixed(1)} bot minutes, bag full ${full}×`);
  passed++;
}
console.log(`${passed} pacing runs passed.`);
