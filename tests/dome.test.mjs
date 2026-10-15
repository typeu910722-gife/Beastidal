// 0.48: the open country under the New World's dome, its tells, and the message stele (set phrases, simulated
// residents, removal of forbidden words, drifting letters, the optional online client).
import assert from 'node:assert/strict';
import { createState } from '../dist/rules.js';
import { normalizeExpansion } from '../dist/expansion.js';
import { normalizeTravel, canWalk } from '../dist/navigation.js';
import { DAY } from '../dist/clock.js';
import { enterTown, townWalkable, toWorld } from '../dist/town.js';
import {
  DOME_R,
  TREES,
  BRIDGE,
  riverX,
  domeGround,
  countryWalkable,
  tickDome,
  birdAt,
  BIRD_PERIOD,
  duskSeams
} from '../dist/dome.js';
import {
  WORDS,
  PLAYER_TEMPLATES,
  phrase,
  stelePosts,
  writePost,
  resonate,
  sendDrift,
  driftReply,
  tickComms,
  guideWarning,
  POSTS_PER_DAY,
  validPost
} from '../dist/comms.js';
import { Community } from '../dist/community.js';

let n = 0;
const test = async (name, fn) => {
  await fn();
  n++;
  console.log('✓ ' + name);
};
const fresh = () => {
  const s = normalizeTravel(createState(4242));
  normalizeExpansion(s);
  enterTown(s);
  return s;
};
const noon = d => (d - 1) * DAY + DAY * (5.5 / 24);

await test('The country: the shell bounds it, the river blocks it except at the bridge, trees are solid', () => {
  assert.ok(countryWalkable(0, 150));
  assert.ok(!countryWalkable(0, DOME_R + 1));
  assert.ok(!countryWalkable(riverX(0), 0));
  assert.ok(countryWalkable(riverX(BRIDGE.z), BRIDGE.z));
  const tree = TREES[0];
  assert.ok(!countryWalkable(tree.x, tree.z));
  assert.ok(TREES.length > 200);
  // the town is flat, the country rolls
  assert.equal(domeGround(toWorld({ x: 0, z: 0 }).x, toWorld({ x: 0, z: 0 }).z), 0);
  const p = toWorld({ x: -150, z: 0 });
  assert.ok(Number.isFinite(domeGround(p.x, p.z)));
  // navigation walks out of the gate into the country
  const s = fresh();
  const out = toWorld({ x: 0, z: 120 });
  assert.ok(canWalk(s, out.x, out.z));
  assert.ok(townWalkable(out.x, out.z));
});

await test('The flock flies the same path every forty seconds', () => {
  const a = birdAt(12.3, 2),
    b = birdAt(12.3 + BIRD_PERIOD, 2);
  assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6);
});

await test("The dome's tells are noted once each: no rift, the far hills, the wall, the seams", () => {
  const s = fresh();
  s.elapsed = noon(1);
  assert.deepEqual(
    tickDome(s, 0.2).map(e => e.id),
    ['norift']
  );
  assert.equal(tickDome(s, 0.2).length, 0);
  Object.assign(s.player, toWorld({ x: 0, z: 180 }));
  assert.ok(tickDome(s, 0.2).some(e => e.id === 'hills'));
  Object.assign(s.player, toWorld({ x: 0, z: DOME_R - 1 }));
  assert.ok(tickDome(s, 0.2).some(e => e.id === 'wall'));
  s.elapsed = DAY * (11.6 / 24); // about 18:06
  assert.ok(duskSeams(s) > 0.6);
  assert.ok(tickDome(s, 0.2).some(e => e.id === 'seams'));
  assert.deepEqual(s.dome.clues, ['norift', 'hills', 'wall', 'seams']);
});

await test('Every phrase is a template and a word; the residents post over the days', () => {
  for (const t of PLAYER_TEMPLATES) for (const w of Object.keys(WORDS)) assert.ok(!phrase(t, w).includes('{0}'));
  assert.ok(!validPost('metoo', 'dream') && !validPost('hear', 'nonsense'));
  const s = fresh();
  s.elapsed = noon(1);
  const first = stelePosts(s).length;
  assert.ok(first >= 3);
  s.elapsed = noon(5);
  assert.ok(stelePosts(s).length > first);
  // a resident's banned post shows as removed once a day has passed
  assert.ok(stelePosts(s).some(p => p.w === 'beep' && p.removed));
});

await test('Writing: three a day, others resonate and answer, forbidden words vanish and 晴 mentions it', () => {
  const s = fresh();
  s.elapsed = noon(2);
  for (let i = 0; i < POSTS_PER_DAY; i++) assert.ok(writePost(s, 'hear', i ? 'dream' : 'beep').ok);
  assert.equal(writePost(s, 'hear', 'dream').ok, false);
  assert.equal(tickComms(s).length, 0); // not the same day
  s.elapsed = noon(4);
  const removed = tickComms(s);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].w, 'beep');
  const mine = stelePosts(s).filter(p => p.mine);
  assert.ok(mine.find(p => p.w === 'beep').removed);
  assert.ok(mine.find(p => p.w === 'dream').res > 0);
  assert.ok(guideWarning(s));
  assert.equal(guideWarning(s), null); // once
  const other = stelePosts(s).find(p => !p.mine && !p.removed);
  assert.ok(resonate(s, other.id).ok);
  assert.equal(resonate(s, other.id).ok, false);
});

await test('Drifting letters: one at a time, answered a day or two later; forbidden ones come back stamped', () => {
  const s = fresh();
  s.elapsed = noon(1);
  assert.ok(sendDrift(s, 'miss', 'family').ok);
  assert.equal(sendDrift(s, 'miss', 'mom').ok, false);
  assert.ok(driftReply(s).waiting);
  s.elapsed = noon(4);
  assert.ok(driftReply(s).reply[1].length > 5);
  assert.ok(sendDrift(s, 'beware', 'dome').ok);
  s.elapsed = noon(8);
  assert.equal(driftReply(s).reply[0], '慈愛組織');
});

await test('The online client is off by default and talks JSON to the Worker when configured', async () => {
  assert.deepEqual(await new Community().list(), []);
  const calls = [];
  const fake = async (url, opts) => {
    calls.push([url, opts.method || 'GET', opts.headers['X-Device']]);
    return {
      ok: true,
      json: async () => ({
        posts: [
          { id: 'o1', who: 'No.0100', t: 'hear', w: 'beep', res: 2 },
          { id: 'o2', t: 'x', w: 'y' }
        ]
      })
    };
  };
  const store = new Map();
  const c = new Community({
    url: 'https://example.test/',
    fetchImpl: fake,
    storage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  });
  const list = await c.list();
  assert.equal(list.length, 1); // unknown phrases are dropped
  await c.post('hear', 'dream', 'No.0412');
  assert.equal(calls[1][0], 'https://example.test/api/stele');
  assert.equal(calls[1][1], 'POST');
  assert.match(calls[0][2], /^[0-9a-f]{24}$/);
  assert.equal(calls[0][2], calls[1][2]); // one device id
});

console.log(`\n${n} dome tests passed.`);
