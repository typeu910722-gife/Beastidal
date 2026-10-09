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
  I: '點「裝置」',
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
// English wording (applied after translation, see i18n.js).
export const TOUCH_EN = {
  E: 'tap the action button',
  B: 'tap "Build"',
  C: 'tap "Symbiosis lab"',
  I: 'tap "Device"',
  J: 'tap "Logbook"',
  Q: 'tap the land / board button',
  K: 'tap "Expedition"',
  H: 'tap "Navigate home"',
  V: 'tap the view button',
  T: 'tap "Ride"',
  G: 'tap "Dive"',
  F: 'tap "Attack"',
  R: 'tap "Rotate"',
  SPACE: 'tap "Repel"',
  ESC: 'tap Ⅱ (top right)'
};
const PAD_EN = { ...PAD, T: 'D-pad ←', G: 'D-pad →' };
export const MODES = ['keyboard', 'touch', 'gamepad'];

function promptTextEn(text, touch) {
  const cap = (s, first) => (first ? s[0].toUpperCase() + s.slice(1) : s);
  const say = (k, p) => (touch ? cap(TOUCH_EN[k], p === 'P') : PAD_EN[k] && p + 'ress ' + PAD_EN[k]);
  return String(text)
    .replace(/\b([Pp])ress (Space|Esc|[A-Z])(?![A-Za-z0-9])/g, (all, p, k) => say(k.toUpperCase(), p) || all)
    .replace(/\b([Hh])old Shift/g, (_, h) =>
      touch ? cap('turn on "Sprint"', h === 'H') : cap('push the left stick all the way', h === 'H')
    )
    .replace(/\bWASD\b/g, touch ? 'the joystick' : 'the left stick')
    .replace(/\bShift\b/g, touch ? '"Sprint"' : 'left stick (full tilt)');
}

export function promptText(text, mode, lang = 'zh') {
  if (!text || mode === 'keyboard' || !MODES.includes(mode)) return text;
  if (lang === 'en') return promptTextEn(text, mode === 'touch');
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
export function promptDom(root, mode, lang = 'zh') {
  if (!root || mode === 'keyboard') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = promptText(n.nodeValue, mode, lang);
    if (t !== n.nodeValue) n.nodeValue = t;
  }
}
