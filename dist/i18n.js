// Runtime localisation. Chinese is the source language; the English dictionary (i18n/en.js) is keyed by the Chinese
// text itself, so code stays readable and untranslated text simply falls back to Chinese.
//
// tr(text) translates a whole string by, in order:
//   1. an exact dictionary match (also ignoring leading/trailing separators such as "·" or "："),
//   2. an auto-generated creature name (colour + feature + species),
//   3. a template key with {0}, {1}… blanks; captured values are translated recursively (names, places),
//   4. splitting at separators (·, ：, ，, 、, ／ …) and translating each piece.
// localize(root) / watch() apply tr() to DOM text and to title / aria-label / alt / placeholder attributes,
// so every panel, toast and label is covered without touching the code that builds them.
import EN from './i18n/en.js?v=0.15.0';
import { SPECIES, FAMILIES } from './genetics.js?v=0.15.0';

const KEY = 'beastidal-lang';
const CJK = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;
export const LANGS = { zh: '繁體中文', en: 'English' };
export function detectLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved in LANGS) return saved;
  } catch {}
  const nav = (globalThis.navigator?.language || 'zh').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}
export let LANG = typeof window === 'undefined' ? 'zh' : detectLang();
export function setLang(lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
}
// For tests: switch language without storage.
export function useLang(lang) {
  LANG = lang;
  cache.clear();
}

const SEP = /^[\s·・：:，,、；;]+|[\s·・：:，,、；;]+$/g;
const norm = s => s.replace(SEP, '');
const exact = new Map(),
  patterns = [];
for (const [zh, en] of Object.entries(EN)) {
  exact.set(zh, en);
  const n = norm(zh);
  if (n && !exact.has(n)) exact.set(n, en.replace(SEP, ''));
  // templates need some literal text, otherwise "{0}" would match (and recurse on) everything
  if (/\{\d+\}/.test(zh) && n.replace(/\{\d+\}/g, '')) {
    const order = [],
      source = n
        .split(/(\{\d+\})/)
        .map(part => {
          const m = part.match(/^\{(\d+)\}$/);
          if (m) {
            order.push(Number(m[1]));
            return '(.+?)';
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('');
    patterns.push({
      re: new RegExp('^' + source + '$'),
      order,
      en: en.replace(SEP, ''),
      weight: n.replace(/\{\d+\}/g, '').length
    });
  }
}
patterns.sort((a, b) => b.weight - a.weight);

// Auto names: 7 colours × 4 features × 16 species (+ hybrid suffix), see genetics.geneName().
const COLORS = {
  赤潮: 'Red-tide',
  琥珀: 'Amber',
  青芽: 'Sprout',
  碧海: 'Azure',
  琉光: 'Lumen',
  暮紫: 'Dusk',
  緋霧: 'Rose-mist'
};
const FEATURES = { 角: 'Horned', 燈: 'Lantern', 翼: 'Winged', 紋: 'Striped' };
const speciesEn = {};
for (const f of FAMILIES) for (const zh of SPECIES[f]) speciesEn[zh] = EN[zh] || zh;
const NAME = new RegExp(
  `^(${Object.keys(COLORS).join('|')})(${Object.keys(FEATURES).join('|')})(${Object.keys(speciesEn).join('|')})(・混種)?$`
);

const PUNCT = {
  '：': ': ',
  '，': ', ',
  '、': ', ',
  '；': '; ',
  '。': '. ',
  '！': '! ',
  '？': '? ',
  '（': ' (',
  '）': ')',
  '／': ' / ',
  '・': ' · '
};
const cache = new Map();
function core(s) {
  if (exact.has(s)) return exact.get(s);
  const n = norm(s);
  if (n !== s && exact.has(n)) {
    const lead = s.slice(0, s.indexOf(n)),
      tail = s.slice(s.indexOf(n) + n.length);
    return punct(lead) + exact.get(n) + punct(tail);
  }
  const name = s.match(NAME);
  if (name) return `${COLORS[name[1]]} ${FEATURES[name[2]]} ${speciesEn[name[3]]}${name[4] ? ' (hybrid)' : ''}`;
  for (const p of patterns) {
    const m = n.match(p.re);
    if (!m) continue;
    const lead = s.slice(0, s.indexOf(n)),
      tail = s.slice(s.indexOf(n) + n.length);
    const filled = p.en.replace(/\{(\d+)\}/g, (_, i) => {
      const at = p.order.indexOf(Number(i));
      if (at < 0) return '';
      return m[at + 1] === s ? s : tr(m[at + 1]);
    });
    return punct(lead) + filled + punct(tail);
  }
  // split at separators and translate each piece
  const parts = s.split(/(\s*[·・|｜／/]\s*|[：，、；。！？（）]|\s+)/);
  if (parts.length > 1) {
    let changed = false;
    const out = parts.map((p, i) => {
      if (i % 2) return CJK.test(p) ? punct(p) : p;
      if (!CJK.test(p)) return p;
      const t = core(p);
      if (t !== p) changed = true;
      return t;
    });
    if (changed) return out.join('').replace(/\s{2,}/g, ' ');
  }
  return s;
}
const punct = s => s.replace(/[：，、；。！？（）／・]/g, c => PUNCT[c]);
export function tr(text) {
  if (LANG === 'zh' || !text || !CJK.test(text)) return text;
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const lead = text.match(/^\s*/)[0],
    tail = text.match(/\s*$/)[0],
    out = lead + core(text.trim()) + tail;
  if (cache.size > 5000) cache.clear();
  cache.set(text, out);
  return out;
}

// DOM: translate text nodes and labelled attributes. `post` lets the game re-word key hints for touch / gamepad.
const ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE']);
let post = t => t;
export function setPostProcess(fn) {
  post = fn;
}
function localizeText(node) {
  const v = node.nodeValue;
  if (!v || !CJK.test(v) || SKIP.has(node.parentNode?.nodeName) || node.parentNode?.closest?.('[data-no-i18n]')) return;
  const t = post(tr(v));
  if (t !== v) node.nodeValue = t;
}
function localizeAttrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (!v || !CJK.test(v)) continue;
    // only write a change: rewriting an untranslatable value would wake the observer again, forever
    const t = tr(v);
    if (t !== v) el.setAttribute(a, t);
  }
}
export function localize(root) {
  if (LANG === 'zh' || !root) return;
  if (root.nodeType === 3) return localizeText(root);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) localizeAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? localizeText(n) : localizeAttrs(n);
}
export function watch(root = document.body) {
  if (LANG === 'zh') return;
  document.documentElement.lang = 'en';
  document.title = tr(document.title);
  localize(root);
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') localizeText(m.target);
      else if (m.type === 'attributes') localizeAttrs(m.target);
      else for (const n of m.addedNodes) localize(n);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
