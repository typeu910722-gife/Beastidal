// Illustrations (0.27). Hand-made or AI-generated art goes in dist/art/ and is listed in dist/art/manifest.json
// (`node scripts/art-manifest.mjs` rebuilds the list). Wherever a piece exists the game shows it; where it does
// not, the 3D stage or the plain layout stands in, so the folder can fill up one picture at a time.
//
// Keys (file name without the extension; .webp, .jpg or .png):
//   title                  the title screen's key art (the left third stays dark for the text)
//   intro, studio          the 遊戲介紹 and 關於 YZPJ pages
//   beast-<id>             the twelve wild 御獸 (beasts.js WILD_BEASTS ids: flamemaw, stormray, …)
//   look-<element>-<plan>  evolved beasts by element and body: look-ember-dragon, look-shadow-wraith, …
//   species-<id>           the sixty-four species of the codex (species.js ids)
//   island-<id>, landmark-<id>  places, for the chart and the journal
export const ART = {};
let loaded = null;
export function loadArt(version = '') {
  if (loaded) return loaded;
  loaded = fetch('./art/manifest.json' + (version ? '?v=' + version : ''))
    .then(r => (r.ok ? r.json() : []))
    .then(list => {
      for (const f of Array.isArray(list) ? list : []) {
        const key = String(f).replace(/\.[a-z0-9]+$/i, '');
        ART[key] = './art/' + f;
      }
      return ART;
    })
    .catch(() => ART);
  return loaded;
}
export const art = key => ART[key] || null;
// a styled <img> for a key, or '' when there is no picture yet
export const artImg = (key, cls = 'art', alt = '') =>
  ART[key] ? `<img class="${cls}" src="${ART[key]}" alt="${alt}" loading="lazy">` : '';
