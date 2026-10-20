// The 64 base species (0.21): four families × four forms × four strains. Sea and deep species (32) live in the
// water, land and plant-mutant species (32) ashore. Each has its own lore, rarity, home waters or shores, and
// what it leaves behind when it falls. The genome decides which species a creature is (see genetics.js).
import { FAMILIES, SPECIES, speciesId } from './genetics.js?v=0.75.0';
import { LANDMARKS, LAKE_CENTER, LAKE_ISLANDS } from './lake.js?v=0.75.0';

export const LORE = {
  // 淺海種
  'sea-0-0': '骨質鰭條像刀刃一樣立在背上。成群出現時，會用鰭刃切開浪頭，替後面的同伴減少阻力。',
  'sea-0-1': '全身覆著細密的銀鱗，陽光下像一枚梭子射過水面。湖邊的孩子說牠能追上任何小艇。',
  'sea-0-2': '背鬃是赤紅色的，受驚時會整排豎起。漁人把牠當作風暴前的警訊。',
  'sea-0-3': '鰭刃之間流動著細小的電光，深夜能在水下照出一條短短的路。極少見。',
  'sea-1-0': '展翼時寬度可達三公尺。翼尖的裂口能分開水流，讓牠在浪下幾乎不發出聲音地滑行。',
  'sea-1-1': '翼面有一層淡淡的月白色，只在夜裡浮上來。據說牠跟著月亮的倒影遷徙。',
  'sea-1-2': '翼上的砂色斑紋能完全融入淺灘的湖底。常常是你踩到了才發現牠。',
  'sea-1-3': '翼緣像被火燒過一樣泛著橘光。只有舊水門附近的深槽裡才偶爾見到。',
  'sea-2-0': '傘緣的光點其實是眼睛。夜裡牠們會浮上海面，用整片傘蓋接收星光。',
  'sea-2-1': '傘下掛著一圈會響的囊，在霧裡發出像鈴一樣的聲音，替同伴指路。',
  'sea-2-2': '傘體透明得像琉璃，能看見裡面流動的光。珊瑚灘上常有牠們聚集。',
  'sea-2-3': '夜裡整隻亮起暖黃色的光，像一盞沉在水裡的燈。見過的人屈指可數。',
  'sea-3-0': '甲殼上的異晶會吸收月光，再在黎明時慢慢釋放。漂流者常把牠當作夜裡的燈塔。',
  'sea-3-1': '殼上長滿苔蘚，浮在水面時像一塊漂流的草皮。性情最溫和的淺海種。',
  'sea-3-2': '殼紋記錄著潮汐的起落。老漁人靠牠殼上的紋路判斷下一次大潮。',
  'sea-3-3': '殼的棱線鍍著一層金色的異晶，陽光下耀眼得睜不開眼。珊瑚灘的傳說。',
  // 深淵種
  'deep-0-0': '只在離岸很遠的深水出沒。轉身時整條身體像一道暗色的浪，鬚鬚能感覺到幾公尺外的心跳。',
  'deep-0-1': '通體墨黑，跟著湖心的黑潮巡游。船底掠過時只看得到一道更暗的影子。',
  'deep-0-2': '鰓縫會透出暗紅的光，像在水裡燒著一團冥火。深淵最兇的獵手之一。',
  'deep-0-3': '頭骨外露成冠，是深淵的王。沉城的石碑上刻著牠的樣子。',
  'deep-1-0': '十條腕足各自有獨立的神經。牠能一邊觀察你，一邊用其中兩條腕把漂流物偷偷拖走。',
  'deep-1-1': '腕足冰冷，被纏住的地方會結上一層薄霜。只在最深的寒水裡出現。',
  'deep-1-2': '受驚時噴出整片墨霧，能讓方圓十公尺的水全暗下來。',
  'deep-1-3': '腕足上流著七色的光，像一道沉在水底的彩虹。沉城廣場的夜裡偶爾可見。',
  'deep-2-0': '鉗子能夾碎廢金屬。殼上的棘刺越多，代表牠在深海越老、越不好惹。',
  'deep-2-1': '殼像剛從熔爐裡撈出來一樣泛著暗紅，摸起來竟然是溫的。',
  'deep-2-2': '背上的棘刺長得像一頂王冠，東神殿的石階是牠的地盤。',
  'deep-2-3': '殼縫裡透出幽綠的光，在黑暗裡像一盞走動的燈。極為罕見。',
  'deep-3-0': '螺殼的每一圈都是一年的紀錄。牠會調整殼內的氣體，在不同深度之間緩慢升降。',
  'deep-3-1': '殼撞上石頭時會發出鐘一樣的低鳴。沉城的住民據說以此報時。',
  'deep-3-2': '殼上結滿了異晶的稜面，光打上去會散成一片碎彩。',
  'deep-3-3': '夜裡會發出低低的歌聲，整座沉城都聽得見。沒有人知道牠在唱什麼。',
  // 陸棲種
  'land-0-0': '海底隆起後第一批爬上礁島的生物。頸部的皮褶張開時，代表牠正在曬太陽，而不是生氣。',
  'land-0-1': '顏色和沙灘一樣，趴著不動就找不到。喜歡在正午的沙丘上打盹。',
  'land-0-2': '背上有赤色的斑點，越老越紅。右岸半島的岩縫是牠的家。',
  'land-0-3': '鱗片之間會閃出細小的電弧，雨天時整隻像在發光。船屋島的稀客。',
  'land-1-0': '角尖凝結的異晶在夜裡會發光。據說只要跟著牠走，就能找到島上的淡水。',
  'land-1-1': '角上結著一層白霜，連夏天也不化。只在最高的山麓上出現。',
  'land-1-2': '毛色像林蔭一樣斑駁，在樹影裡幾乎看不見。',
  'land-1-3': '整對角都是透明的異晶，走動時叮噹作響。半島的傳說。',
  'land-2-0': '在風暴來臨前會成群飛向陸地。看到牠們往島上飛，最好也跟著上岸。',
  'land-2-1': '羽毛能擋住最猛的暴雨，常在風暴中迎風站著。',
  'land-2-2': '喉部一圈雪白的羽毛，叫聲清亮，能傳過半個湖。',
  'land-2-3': '夜裡在遺跡的高處站崗，眼睛反射著異晶的光。極少見。',
  'land-3-0': '甲片之間長滿苔蘚。受驚時會縮成一顆布滿青苔的球，看起來就像一塊石頭。',
  'land-3-1': '甲片像岩石一樣粗糙，滾下坡時能撞斷小樹。',
  'land-3-2': '背甲帶著鐵的光澤，連廢金屬都啃得動。',
  'land-3-3': '背甲鑲著黑色的曜晶，在月光下閃著暗紫色。中央遺跡島上的傳說。',
  // 植生突變
  'flora-0-0': '異晶讓海藻在牠的鰭上生根。牠走過的岸邊，常會留下一串會發芽的種子。',
  'flora-0-1': '鰭變成了蕨葉，走動時沙沙作響。喜歡潮濕的岸邊石縫。',
  'flora-0-2': '頭頂開著一朵蓮，花開時表示牠正在休息。',
  'flora-0-3': '全身爬滿帶刺的藤，靠近時要小心。山麓深處才有。',
  'flora-1-0': '翼面的紋路和葉脈一模一樣，白天會攤在岸上曬太陽，像一片巨大的葉子。',
  'flora-1-1': '翼面枯黃，像秋天的落葉，趴在落葉堆裡誰也認不出來。',
  'flora-1-2': '入秋後翼面會轉成楓紅，是半島上最漂亮的景色。',
  'flora-1-3': '翼緣長滿荊棘，連野獸都不敢碰。半島深處的稀客。',
  'flora-2-0': '傘頂開著會發光的花。花粉落進湖裡，能讓周圍的水母一起亮起來。',
  'flora-2-1': '傘頂噴出的孢子像一朵雲，吸進去會打噴嚏，但很香。',
  'flora-2-2': '花蕊夜裡會發出螢光，一群聚在一起像一片會動的星空。',
  'flora-2-3': '傘底滴著甜甜的蜜露，蜂群跟著牠到處走。極為罕見。',
  'flora-3-0': '背上長出了一整片小森林。年紀越大，樹就越高；據說最老的一隻背著一座島。',
  'flora-3-1': '背上的根鬚垂到地面，走到哪裡就扎根到哪裡，一動不動時像一棵老樹。',
  'flora-3-2': '背上的樹會結果，果實成熟時整座山麓的鳥都會飛來。',
  'flora-3-3': '背上的樹比牠自己還老。山裡的人說，牠是這片湖最早的住民。'
};
// what each species leaves behind: the family's two materials, plus a little of what it fed on
export const DROPS = {
  sea: [
    ['finblade', 'silverscale'],
    ['raywing', 'silverscale'],
    ['slime', 'coralbit'],
    ['shellplate', 'coralbit']
  ],
  deep: [
    ['deepscale', 'fang'],
    ['sucker', 'inksac'],
    ['crabclaw', 'deepscale'],
    ['spiralshell', 'glowsac']
  ],
  land: [
    ['lizardscale', 'hide'],
    ['antler', 'hide'],
    ['feather', 'bone'],
    ['armorplate', 'fat']
  ],
  flora: [
    ['vine', 'spore'],
    ['leaf', 'nectar'],
    ['spore', 'nectar'],
    ['root', 'fruit']
  ]
};
const EXTRA = { sea: 'food', deep: 'crystal', land: 'food', flora: 'moss' };
export const RARITY_OF_STRAIN = [0, 0, 1, 2]; // strain 3 is the rare one in every line
export function allSpeciesInfo() {
  return FAMILIES.flatMap(f =>
    SPECIES[f].map((name, i) => {
      const form = Math.floor(i / 4),
        strain = i % 4,
        id = speciesId(f, form, strain);
      return { id, family: f, form, strain, name, lore: LORE[id], rare: strain === 3 };
    })
  );
}
export const speciesInfo = id => allSpeciesInfo().find(x => x.id === id);
// Roll what a fallen creature leaves (keys → counts).
export function rollDrops(p, rng = Math.random) {
  const [a, b] = DROPS[p.family]?.[p.body] || ['hide', 'bone'],
    out = {};
  out[a] = 1 + (rng() < 0.5 ? 1 : 0);
  if (rng() < 0.6) out[b] = 1;
  if (rng() < 0.5) out[EXTRA[p.family]] = (out[EXTRA[p.family]] || 0) + 1;
  if (p.strain === 3) out.crystal = (out.crystal || 0) + 2;
  return out;
}
// ---------- where things live ----------
// A zone: a circle on the lake (sea) or a shore (land) with its pool of species, weighted, and a few rare ones
// that only turn up there. s = strain, f = form.
const pool = (family, list) => list.map(([f, s, w]) => ({ family, form: f, strain: s, w }));
const rare = (family, list) => list.map(([f, s, p]) => ({ family, form: f, strain: s, p }));
const isl = id => LAKE_ISLANDS.find(i => i.id === id);
export const ZONES = [
  {
    id: 'shallows',
    name: '初醒淺灘',
    kind: 'sea',
    x: 0,
    z: 0,
    r: 90,
    cap: 7,
    pool: pool('sea', [
      [0, 0, 3],
      [1, 0, 2],
      [2, 0, 2],
      [3, 0, 2],
      [0, 1, 2],
      [3, 1, 2]
    ]),
    rare: rare('sea', [[0, 3, 0.04]])
  },
  {
    id: 'centre',
    name: '湖心深水',
    kind: 'sea',
    ...LAKE_CENTER,
    r: 110,
    cap: 7,
    pool: [
      ...pool('deep', [
        [0, 0, 3],
        [1, 0, 2],
        [0, 1, 2],
        [3, 0, 2]
      ]),
      ...pool('sea', [
        [2, 1, 1],
        [1, 1, 1]
      ])
    ],
    rare: rare('deep', [[0, 3, 0.03]])
  },
  {
    id: 'sunkcity',
    name: '沉城水域',
    kind: 'sea',
    x: LANDMARKS.plaza.x,
    z: LANDMARKS.plaza.z,
    r: 90,
    cap: 6,
    pool: pool('deep', [
      [1, 1, 2],
      [1, 2, 2],
      [3, 1, 2],
      [3, 2, 2],
      [2, 0, 1]
    ]),
    rare: rare('deep', [
      [1, 3, 0.04],
      [3, 3, 0.03]
    ])
  },
  {
    id: 'coral',
    name: '珊瑚灘',
    kind: 'sea',
    x: LANDMARKS.coral.x,
    z: LANDMARKS.coral.z,
    r: 70,
    cap: 6,
    pool: pool('sea', [
      [2, 2, 3],
      [3, 2, 2],
      [3, 0, 2],
      [2, 0, 1]
    ]),
    rare: rare('sea', [
      [3, 3, 0.05],
      [2, 3, 0.02]
    ])
  },
  {
    id: 'easttemple',
    name: '東神殿外海',
    kind: 'sea',
    x: LANDMARKS.eastTemple.x,
    z: LANDMARKS.eastTemple.z,
    r: 70,
    cap: 6,
    pool: [
      ...pool('deep', [
        [2, 2, 3],
        [2, 1, 2],
        [0, 2, 1]
      ]),
      ...pool('sea', [[1, 2, 2]])
    ],
    rare: rare('deep', [[2, 3, 0.04]])
  },
  {
    id: 'watergate',
    name: '舊水門',
    kind: 'sea',
    x: LANDMARKS.waterGate.x,
    z: LANDMARKS.waterGate.z,
    r: 70,
    cap: 5,
    pool: pool('sea', [
      [1, 1, 3],
      [1, 2, 3],
      [0, 2, 2]
    ]),
    rare: rare('sea', [[1, 3, 0.05]])
  },
  {
    id: 'boathouse',
    name: '船屋灣',
    kind: 'sea',
    x: LANDMARKS.boathouse.x,
    z: LANDMARKS.boathouse.z,
    r: 60,
    cap: 5,
    pool: pool('sea', [
      [0, 1, 3],
      [2, 1, 3],
      [3, 1, 1]
    ]),
    rare: rare('sea', [[2, 3, 0.04]])
  },
  {
    id: 'palm',
    name: '船屋島',
    kind: 'land',
    island: 'palm',
    x: isl('palm').x,
    z: isl('palm').z,
    r: 45,
    cap: 4,
    pool: [
      ...pool('land', [
        [0, 0, 3],
        [0, 1, 2],
        [2, 0, 2]
      ]),
      ...pool('flora', [[0, 0, 2]])
    ],
    rare: rare('land', [[0, 3, 0.04]])
  },
  {
    id: 'crystal',
    name: '右岸半島',
    kind: 'land',
    island: 'crystal',
    x: isl('crystal').x,
    z: isl('crystal').z,
    r: 60,
    cap: 5,
    pool: [
      ...pool('land', [
        [1, 0, 3],
        [1, 1, 2],
        [3, 0, 2],
        [3, 1, 1],
        [0, 2, 1]
      ]),
      ...pool('flora', [
        [1, 0, 2],
        [1, 1, 1]
      ])
    ],
    rare: [...rare('land', [[1, 3, 0.04]]), ...rare('flora', [[1, 3, 0.03]])]
  },
  {
    id: 'ruins',
    name: '中央遺跡島',
    kind: 'land',
    island: 'ruins',
    x: isl('ruins').x,
    z: isl('ruins').z,
    r: 60,
    cap: 5,
    pool: [
      ...pool('land', [
        [2, 1, 2],
        [2, 2, 2],
        [3, 2, 2],
        [1, 2, 1]
      ]),
      ...pool('flora', [
        [2, 0, 2],
        [2, 1, 1]
      ])
    ],
    rare: [
      ...rare('land', [
        [2, 3, 0.04],
        [3, 3, 0.03]
      ])
    ]
  },
  {
    id: 'foothills',
    name: '環湖山麓',
    kind: 'land',
    r: Infinity, // every shore that is not an island
    cap: 5,
    pool: [
      ...pool('flora', [
        [3, 0, 3],
        [3, 1, 2],
        [0, 1, 2],
        [2, 2, 1]
      ]),
      ...pool('land', [
        [0, 2, 2],
        [1, 1, 1]
      ])
    ],
    rare: rare('flora', [
      [3, 3, 0.03],
      [2, 3, 0.03],
      [0, 3, 0.03]
    ])
  }
];
export const zoneOf = id => ZONES.find(z => z.id === id);
// every species has at least one home: any not listed above joins its family's default zone, sparingly
const HOME = { sea: 'shallows', deep: 'centre', land: 'ruins', flora: 'foothills' };
for (const sp of allSpeciesInfo())
  if (!ZONES.some(z => [...z.pool, ...z.rare].some(p => speciesId(p.family, p.form, p.strain) === sp.id))) {
    const z = zoneOf(HOME[sp.family]),
      entry = { family: sp.family, form: sp.form, strain: sp.strain };
    if (sp.rare) z.rare.push({ ...entry, p: 0.02 });
    else z.pool.push({ ...entry, w: 1 });
  }
// Which species turns up: a rare roll first, then the weighted pool.
export function pickSpecies(zone, rng = Math.random, mods = null) {
  const fam = mods?.family || {},
    rareMul = mods?.rare ?? 1;
  for (const r of zone.rare) if (rng() < r.p * rareMul) return { ...r, rare: true };
  const weights = zone.pool.map(p => p.w * (fam[p.family] ?? 1)),
    total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < zone.pool.length; i++) if ((roll -= weights[i]) < 0) return zone.pool[i];
  return zone.pool[0];
}
// Where a species is found, for the codex (zones listing it).
export function habitatsOf(id) {
  const out = [];
  for (const z of ZONES)
    if ([...z.pool, ...z.rare].some(p => speciesId(p.family, p.form, p.strain) === id)) out.push(z.name);
  return out;
}
