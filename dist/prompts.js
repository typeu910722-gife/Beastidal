// Input-aware wording. Game text is written for keyboard ("按 E 打撈"); this rewrites it for the device in hand.
// Gamepad mapping follows game.js gamepad(): A interact, X build, Y creatures, LB bag, RB journal, LT dock,
// RT repel/attack, Select expedition, L3 home, R3 view, D-pad ←/→ ride/dive, Start pause, B back.
export const PAD = {
  E: 'Ⓐ',
  B: 'Ⓧ',
  C: 'Ⓨ',
  I: 'LB',
  J: 'RB',
  Q: 'LT',
  K: 'Select',
  H: 'L3',
  V: 'R3',
  T: '十字鍵←',
  G: '十字鍵→',
  F: 'RT',
  R: 'Ⓧ',
  SPACE: 'RT',
  ESC: 'Ⓑ'
};
export const TOUCH = {
  E: '點互動鈕',
  B: '點「建造」',
  C: '點「共生研究」',
  I: '點「背包」',
  J: '點「航海日誌」',
  Q: '點「登岸／登艇」鈕',
  K: '點「御獸遠航」',
  H: '點「導航回避難所」',
  V: '點視角鈕',
  T: '點「騎乘」',
  G: '點「潛水」',
  F: '點「攻擊」',
  R: '點「旋轉」',
  SPACE: '點「驅離」',
  ESC: '點右上 Ⅱ'
};
export const MODES = ['keyboard', 'touch', 'gamepad'];

export function promptText(text, mode) {
  if (!text || mode === 'keyboard' || !MODES.includes(mode)) return text;
  const touch = mode === 'touch',
    say = k => (touch ? TOUCH[k] : PAD[k] && '按 ' + PAD[k]);
  return String(text)
    .replace(/按\s?空白鍵\s?/g, () => (touch ? TOUCH.SPACE : '按 RT '))
    .replace(/按\s?Esc\s?/g, () => (touch ? TOUCH.ESC : '按 Ⓑ '))
    .replace(/按\s?([A-Z])(?![A-Za-z0-9])(\s?)/g, (all, k, space) => {
      const s = say(k);
      return s ? s + (touch ? '' : space) : all;
    })
    .replace(touch ? /\s?WASD\s?/g : /WASD\s?/g, touch ? '搖桿' : '左搖桿 ')
    .replace(/按住\s?Shift/g, touch ? '開啟「加速」' : '左搖桿推到底')
    .replace(/Shift/g, touch ? '「加速」' : '左搖桿推到底');
}
// Rewrites every text node under a DOM element (used for panels built from keyboard-worded HTML).
export function promptDom(root, mode) {
  if (!root || mode === 'keyboard') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = promptText(n.nodeValue, mode);
    if (t !== n.nodeValue) n.nodeValue = t;
  }
}
