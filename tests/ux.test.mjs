import assert from 'node:assert/strict';
import { promptText, PAD, TOUCH } from '../dist/prompts.js';
import { TUTORIAL, startTutorialState, advanceTutorial, tutorialActive } from '../dist/tutorial.js';
import { createState } from '../dist/rules.js';
let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('ok -', name);
};

test('keyboard wording is untouched', () => {
  const t = '靠近漂流物，按 E 打撈。按空白鍵驅離，WASD 駕艇。';
  assert.equal(promptText(t, 'keyboard'), t);
});
test('touch wording names on-screen buttons', () => {
  assert.equal(promptText('靠近漂流木箱，按 E 打撈吧。', 'touch'), '靠近漂流木箱，點互動鈕打撈吧。');
  assert.equal(promptText('按 B 打開建造', 'touch'), '點「建造」打開建造');
  assert.equal(promptText('用 WASD 步行', 'touch'), '用搖桿步行');
  assert.ok(!/按 [A-Z](?![A-Za-z0-9])/.test(promptText('按 Q 登岸，按 K 打開，按 H 返航', 'touch')));
});
test('gamepad wording uses pad buttons and is idempotent', () => {
  const once = promptText('掌舵中：WASD 航行，按空白鍵發射艦砲，按 Q 離開舵輪', 'gamepad');
  assert.equal(once, '掌舵中：左搖桿 航行，按 RT 發射艦砲，按 LT 離開舵輪');
  assert.equal(promptText(once, 'gamepad'), once);
  assert.equal(promptText('按 K 打開御獸遠航', 'gamepad'), '按 Select 打開御獸遠航');
  for (const k of Object.keys(TOUCH))
    assert.ok(PAD[k] || k === 'SPACE' || k === 'ESC', 'every touch prompt has a pad equivalent: ' + k);
});
test('unknown keys are left alone', () => {
  assert.equal(promptText('按 Z 什麼也沒有', 'touch'), '按 Z 什麼也沒有');
});

test('tutorial walks move → salvage → board → build and then hands over', () => {
  const s = createState(5);
  const t = startTutorialState(s);
  assert.ok(tutorialActive(s));
  assert.deepEqual(advanceTutorial(s), []);
  t.moved = 9;
  assert.deepEqual(advanceTutorial(s), [0]);
  s.player.mode = 'foot';
  assert.deepEqual(advanceTutorial(s), [], 'boarding early does not skip salvaging');
  s.salvaged = 1;
  assert.deepEqual(advanceTutorial(s), [1, 2], 'already on the raft: board step completes at once');
  s.expanded = 1;
  assert.deepEqual(advanceTutorial(s), [3]);
  assert.ok(!tutorialActive(s));
  assert.equal(TUTORIAL.length, 4);
});
test('old saves without tutorial state never show it', () => {
  const s = createState(6);
  assert.ok(!tutorialActive(s));
  assert.deepEqual(advanceTutorial(s), []);
});
test('every tutorial step is phrased for the keyboard so it can be rewritten', () => {
  for (const st of TUTORIAL) assert.notEqual(promptText(st.text, 'touch'), st.text, st.id);
});
console.log(`${passed} UX tests passed.`);
