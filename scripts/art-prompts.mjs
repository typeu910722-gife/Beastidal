// Writes docs/art-prompts.md: one prompt per picture the game can show (see dist/art.js for the keys).
//   node scripts/art-prompts.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { allSpecies, FAMILY_NAMES } from '../dist/genetics.js';
import { LORE } from '../dist/species.js';
import { WILD_BEASTS } from '../dist/beasts.js';
import { LOOKS } from '../dist/beast-look.js';
import { LAKE_ISLANDS, LANDMARKS } from '../dist/lake.js';

const STYLE =
  'dark fantasy, semi-realistic digital painting, cinematic lighting, deep teal and violet shadows with crimson and amber rim light, volumetric mist, intricate detail, 8k, sharp focus';
const NEG = 'cartoon, chibi, flat shading, text, watermark, blurry, extra limbs, low detail';
const ELEMENT = {
  ember: 'lava-red glowing cracks across dark scales, embers rising, a molten glow in its open maw',
  bone: 'bone plates and exposed ridges of pale bone, dark hide, dull red light in the cracks',
  storm: 'blue-white lightning crawling through its scales, electric sparks, crystal shards on its back',
  venom: 'acid-green glowing sacs and spines, dripping venom, sickly green mist',
  frost: 'ice shards and frost rime, pale blue inner light, cold breath hanging in the air',
  shadow: 'a body half made of black-violet smoke, purple glowing eyes, torn ribbons of darkness',
  crystal: 'translucent violet crystals growing from its back, prismatic glints, pale inner glow',
  verdant: 'bark skin, medusa-like tendril hair, a crown bloom, glowing pollen'
};
const PLAN = {
  dragon:
    'a hulking upright dragon-beast, hunched, digitigrade legs, long tail, swept horns, back blades, rows of teeth',
  wraith: 'a tall gaunt hooded wraith, long arms ending in claws, a skull face in the dark of the hood',
  dryad: 'a slender plant dryad, bark-skinned, long fingers, root-like feet'
};
const lines = [];
const add = (key, prompt, note = '') => lines.push(`### \`${key}\`\n${note ? note + '\n\n' : ''}> ${prompt}\n`);
lines.push(`# 比斯泰德 · 插圖提示詞 / Art prompts

每張圖產好後存成 \`dist/art/<key>.webp\`（或 .jpg / .png），再執行 \`node scripts/art-manifest.mjs\`，遊戲就會顯示。
沒有的圖會自動用 3D 模型或純版面代替，可以一張一張補。

建議尺寸：標題 2560×1440；御獸與屬性圖 1536×1024（橫）；圖鑑生物 1024×512（2:1 橫）；介紹與工作室 1600×900；島嶼與地標 1536×1024。

每個提示詞後面都接上同一段風格：

> **風格：** ${STYLE}
>
> **負面：** ${NEG}

---

## 標題與頁面
`);
add(
  'title',
  `wide establishing shot of a drowned inland sea at dusk, a small raft with a lone figure, a ruined sunken city's spires breaking the surface in the distance, a monstrous silhouette beneath the water, fog, the left third of the frame dark and empty for text, ${STYLE}`,
  '標題畫面主視覺（左側三分之一留暗給文字）'
);
add(
  'intro',
  `a young office worker on a scooter at a rainy crossroads at dawn, headlights of a gravel truck filling the frame, motion blur, the moment before impact, melancholic, ${STYLE}`,
  '遊戲介紹頁'
);
add(
  'studio',
  `a small indie game studio desk at night, lake-blue monitor glow, sketches of sea beasts pinned to the wall, a cup of tea, warm lamp, ${STYLE}`,
  '關於 YZPJ'
);
lines.push('\n## 野生御獸（12）\n');
for (const [id, b] of Object.entries(WILD_BEASTS)) {
  add(
    `beast-${id}`,
    `${b.name} — ${b.lore} full-body monster portrait, ${b.kind === 'sea' ? 'half-surfaced in dark water' : b.kind === 'merchant' ? 'on the deck of a drifting merchant barge' : 'on a misty island shore'}, ${STYLE}`,
    `${b.icon} ${b.name}`
  );
}
lines.push('\n## 契闊進化的御獸（依屬性，8）\n');
for (const [id, l] of Object.entries(LOOKS))
  add(
    `look-${id}-${l.plan}`,
    `${PLAN[l.plan]}, ${ELEMENT[id]}, full-body monster portrait, three-quarter view, ${STYLE}`,
    `屬性 ${id} · 身形 ${l.plan}`
  );
lines.push('\n## 圖鑑生物（64）\n\n圖鑑用 2:1 橫圖；生物是「一般動物只多一點變異」，不要畫成御獸那麼誇張。\n');
for (const sp of allSpecies())
  add(
    `species-${sp.id}`,
    `${sp.name} (${FAMILY_NAMES[sp.family]}) — ${LORE[sp.id] || ''} a creature study, natural animal anatomy with one subtle mutation, side view, wildlife illustration on a dark lake background, ${STYLE}`,
    `${sp.name} · ${FAMILY_NAMES[sp.family]}`
  );
lines.push('\n## 島嶼與地標\n');
for (const i of LAKE_ISLANDS)
  add(
    `island-${i.id}`,
    `${i.name}, a low flat island in a mountain-ringed lake, seen from the water, ${STYLE}`,
    i.name
  );
for (const [id, l] of Object.entries(LANDMARKS))
  add(
    `landmark-${id}`,
    `${l.name}, ${l.under ? 'a sunken ruin seen through clear dark water, shafts of light' : 'a ruin on the lake shore, mist'}, ${STYLE}`,
    l.name
  );
mkdirSync('docs', { recursive: true });
writeFileSync('docs/art-prompts.md', lines.join('\n'));
console.log(`docs/art-prompts.md: ${lines.length - 1} prompts`);
