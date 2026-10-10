// Every item in the world (0.21): the seven materials and supplies, the contract scroll, what creatures leave
// behind, and what the work table makes from them. 48 in all. Names and glyphs feed the grids and the HUD.
export const ITEMS = {
  // materials and supplies
  wood: { name: '漂流木', glyph: '▱', cat: 'material' },
  metal: { name: '廢金屬', glyph: '⬡', cat: 'material' },
  fiber: { name: '纖維', glyph: '⌁', cat: 'material' },
  crystal: { name: '異晶', glyph: '◇', cat: 'material' },
  food: { name: '口糧', glyph: '◒', cat: 'supply' },
  water: { name: '淡水', glyph: '♧', cat: 'supply' },
  bait: { name: '誘餌', glyph: '◉', cat: 'supply' },
  contract: { name: '契約書', glyph: '📜', cat: 'special' },
  // sea drops
  finblade: { name: '鰭刃', glyph: '🔪', cat: 'drop', note: '骨刃鰭獸背上的骨鰭，鋒利得能削木。' },
  raywing: { name: '魟翼膜', glyph: '🪁', cat: 'drop', note: '魔魟翼緣的薄膜，又輕又韌。' },
  slime: { name: '觸母黏液', glyph: '🫧', cat: 'drop', note: '帶著微光的黏液，乾了會變成膠。' },
  shellplate: { name: '龜甲片', glyph: '🐢', cat: 'drop', note: '靈龜脫落的甲片，含有異晶。' },
  silverscale: { name: '銀鱗', glyph: '✦', cat: 'drop', note: '淺海種的鱗片，月光下像銀幣。' },
  coralbit: { name: '珊瑚碎片', glyph: '🪸', cat: 'drop', note: '珊瑚灘的碎珊瑚，磨成粉能染色。' },
  // deep drops
  deepscale: { name: '淵鱗', glyph: '🐉', cat: 'drop', note: '深淵種的厚鱗，比鐵還硬。' },
  fang: { name: '深海牙', glyph: '🦷', cat: 'drop', note: '海龍的牙，能當鑽頭用。' },
  sucker: { name: '腕足吸盤', glyph: '🐙', cat: 'drop', note: '觸獸的吸盤，黏在船底也拔不下來。' },
  crabclaw: { name: '蟹鉗', glyph: '🦀', cat: 'drop', note: '蟹獸的鉗，能夾碎廢金屬。' },
  spiralshell: { name: '螺殼', glyph: '🐚', cat: 'drop', note: '螺獸的殼，每一圈都是一年。' },
  glowsac: { name: '幽光囊', glyph: '💡', cat: 'drop', note: '深海種的發光囊，能亮好幾天。' },
  inksac: { name: '墨囊', glyph: '🫙', cat: 'drop', note: '觸獸的墨，寫在紙上永不褪色。' },
  // land drops
  hide: { name: '獸皮', glyph: '🟫', cat: 'drop', note: '陸棲種的皮，鞣過就是皮革。' },
  lizardscale: { name: '蜥鱗', glyph: '🦎', cat: 'drop', note: '蜥獸的鱗，拼起來像一件鎧甲。' },
  antler: { name: '鹿角', glyph: '🦌', cat: 'drop', note: '靈鹿的角，角尖結著異晶。' },
  feather: { name: '羽毛', glyph: '🪶', cat: 'drop', note: '鷗獸的羽，擋得住暴雨。' },
  armorplate: { name: '甲片', glyph: '🛡', cat: 'drop', note: '犰獸的背甲，又輕又硬。' },
  bone: { name: '獸骨', glyph: '🦴', cat: 'drop', note: '能磨成針、也能熬湯。' },
  fat: { name: '獸脂', glyph: '🧈', cat: 'drop', note: '能點燈，也能做藥膏。' },
  // flora drops
  vine: { name: '藤蔓', glyph: '🌿', cat: 'drop', note: '植生突變身上的藤，比繩子還韌。' },
  spore: { name: '孢子', glyph: '🍄', cat: 'drop', note: '燈母的孢子，潮濕處會發芽。' },
  nectar: { name: '花蜜', glyph: '🍯', cat: 'drop', note: '甜得發膩，御獸最愛。' },
  leaf: { name: '葉片', glyph: '🍃', cat: 'drop', note: '葉魟的大葉，可以織布。' },
  root: { name: '樹根', glyph: '🪵', cat: 'drop', note: '樹龜背上的根，燒起來很久。' },
  fruit: { name: '果實', glyph: '🍈', cat: 'drop', note: '樹龜背上結的果，又甜又多汁。' },
  moss: { name: '苔蘚', glyph: '🌱', cat: 'drop', note: '能止血的青苔。' },
  // crafted at the work table
  cookedfish: { name: '烤魚', glyph: '🐟', cat: 'craft', note: '比口糧更頂飽。' },
  stew: { name: '燉肉湯', glyph: '🍲', cat: 'craft', note: '熱呼呼的一鍋，連御獸都想喝。' },
  jam: { name: '果實醬', glyph: '🫐', cat: 'craft', note: '保存很久的甜醬。' },
  salve: { name: '急救藥膏', glyph: '🩹', cat: 'craft', note: '苔蘚和花蜜熬的藥，抹上就不痛。' },
  rope: { name: '繩索', glyph: '🪢', cat: 'craft', note: '纖維搓成的粗繩。' },
  leather: { name: '皮革', glyph: '🧳', cat: 'craft', note: '鞣過的獸皮，做鞍具的材料。' },
  cloth: { name: '布料', glyph: '🧵', cat: 'craft', note: '纖維和葉片織成的布。' },
  charcoal: { name: '木炭', glyph: '⚫', cat: 'craft', note: '悶燒的漂流木，火力穩定。' },
  nails: { name: '鐵釘', glyph: '📍', cat: 'craft', note: '廢金屬敲成的釘子。' },
  glass: { name: '玻璃', glyph: '🔲', cat: 'craft', note: '晶粉燒成的透明板。' },
  crystaldust: { name: '晶粉', glyph: '✨', cat: 'craft', note: '異晶磨成的粉，微微發光。' },
  torch: { name: '火把', glyph: '🔥', cat: 'craft', note: '獸脂浸過的木棒。' },
  lantern: { name: '提燈', glyph: '🏮', cat: 'craft', note: '幽光囊做芯的燈，照亮船艙。' }
};
export const ITEM_KEYS = Object.keys(ITEMS);
export const BASE_RESOURCES = ['wood', 'metal', 'fiber', 'crystal', 'food', 'water', 'bait'];
// everything that rides in the bag (the contract scroll has its own count)
export const CARRYABLE = ITEM_KEYS.filter(k => k !== 'contract');
export const ITEM_NAMES = Object.fromEntries(ITEM_KEYS.map(k => [k, ITEMS[k].name]));
export const ITEM_GLYPHS = Object.fromEntries(ITEM_KEYS.map(k => [k, ITEMS[k].glyph]));
// what the work table makes: cost → gives n
export const CRAFTS = {
  cookedfish: { cost: { food: 1, wood: 1 }, n: 2 },
  stew: { cost: { fat: 1, food: 2, water: 1 }, n: 2 },
  jam: { cost: { fruit: 3 }, n: 2 },
  salve: { cost: { moss: 2, nectar: 1 }, n: 1 },
  rope: { cost: { fiber: 3 }, n: 1 },
  leather: { cost: { hide: 2 }, n: 1 },
  cloth: { cost: { fiber: 4, leaf: 2 }, n: 1 },
  charcoal: { cost: { wood: 3 }, n: 2 },
  nails: { cost: { metal: 1 }, n: 4 },
  crystaldust: { cost: { crystal: 1 }, n: 3 },
  glass: { cost: { crystaldust: 1, metal: 1 }, n: 1 },
  torch: { cost: { wood: 1, fat: 1 }, n: 2 },
  lantern: { cost: { glass: 1, metal: 2, glowsac: 1 }, n: 1 }
};
export const costLabel = cost =>
  Object.entries(cost)
    .map(([k, v]) => `${ITEM_NAMES[k] || k} ${v}`)
    .join('、');
