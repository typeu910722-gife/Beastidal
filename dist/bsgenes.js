// 比斯基因 BS DNA (0.22): forty-eight traits no ordinary creature should have — fire, lightning, hardened
// bodies, whip tails, fins turned to claws, gills on land beasts… They appear through breeding mutations (and on
// a few rare wild things). A creature carrying three or more can be bound by contract into a 御獸. Each gene
// carries a small stat change and a visible mark on the body. Combinations are practically endless.
export const BS_GENES = {
  fire: {
    name: '噴火',
    icon: '🔥',
    el: 'fire',
    mark: 'orb',
    color: 0xff6a2a,
    atk: 6,
    desc: '喉嚨裡有一團不會熄的火。吐息能點燃漂流木。'
  },
  lightning: {
    name: '閃電',
    icon: '⚡',
    el: 'storm',
    mark: 'spikes',
    color: 0x7fd8ff,
    atk: 5,
    spd: 4,
    desc: '鱗片之間走著電弧，碰到會麻。'
  },
  hardbody: {
    name: '硬質化身體',
    icon: '🪨',
    el: 'earth',
    mark: 'plates',
    color: 0x8a8f94,
    def: 8,
    spd: -2,
    desc: '肌肉纖維結晶化，摸起來像石頭。'
  },
  whiptail: {
    name: '鞭狀尾巴',
    icon: '🪢',
    el: 'none',
    mark: 'tail',
    color: 0x9a7b5a,
    atk: 4,
    spd: 2,
    desc: '尾巴拉長成一條鞭，甩起來能抽斷小樹。'
  },
  finclaw: {
    name: '鰭爪',
    icon: '🦅',
    el: 'none',
    mark: 'claws',
    color: 0xd9d4c4,
    atk: 5,
    desc: '魚鰭特化成硬爪，能抓住岩壁。'
  },
  landgill: {
    name: '陸鰓',
    icon: '🫁',
    el: 'water',
    mark: 'slits',
    color: 0x4fa8b0,
    hp: 6,
    desc: '陸生生物長出了鰓，能在水裡待很久。'
  },
  frostbreath: {
    name: '冰息',
    icon: '❄',
    el: 'ice',
    mark: 'orb',
    color: 0xbfe8ff,
    atk: 4,
    def: 2,
    desc: '呼出的氣會結霜，碰到的水面馬上凍住。'
  },
  venomfang: {
    name: '毒牙',
    icon: '🦷',
    el: 'poison',
    mark: 'fangs',
    color: 0x9be36a,
    atk: 5,
    desc: '牙根有毒腺，咬一口會讓人發抖。'
  },
  regen: {
    name: '再生',
    icon: '💚',
    el: 'life',
    mark: 'aura',
    color: 0x7fe0a8,
    hp: 10,
    desc: '傷口幾分鐘就癒合，斷掉的鰭會長回來。'
  },
  camouflage: {
    name: '擬態',
    icon: '🫥',
    el: 'none',
    mark: 'aura',
    color: 0xa8b8a0,
    def: 4,
    spd: 2,
    desc: '皮膚會變成周圍的顏色，不動就看不見。'
  },
  echo: {
    name: '回聲定位',
    icon: '📡',
    el: 'none',
    mark: 'orb',
    color: 0xc8c8ff,
    spd: 3,
    desc: '靠叫聲在黑暗裡看見東西。'
  },
  boneplates: {
    name: '骨甲板',
    icon: '🛡',
    el: 'earth',
    mark: 'plates',
    color: 0xe6dcc0,
    def: 7,
    desc: '背上長出一排骨板，像一道牆。'
  },
  lure: {
    name: '誘餌燈',
    icon: '💡',
    el: 'light',
    mark: 'orb',
    color: 0xffe27a,
    atk: 2,
    desc: '頭頂垂著一盞會發光的燈，獵物會自己游過來。'
  },
  glide: {
    name: '滑翔膜',
    icon: '🪁',
    el: 'wind',
    mark: 'wings',
    color: 0xd8e8ff,
    spd: 5,
    desc: '四肢之間張開一層膜，能從高處滑下來。'
  },
  greatjaw: {
    name: '巨顎',
    icon: '🦈',
    el: 'none',
    mark: 'fangs',
    color: 0xf0f0f0,
    atk: 7,
    spd: -1,
    desc: '下顎大得不成比例，一口能咬碎龜殼。'
  },
  burst: {
    name: '瞬爆肌',
    icon: '💥',
    el: 'none',
    mark: 'aura',
    color: 0xffb36b,
    atk: 3,
    spd: 6,
    desc: '肌肉能瞬間爆發，衝刺快得看不清。'
  },
  venomspine: {
    name: '毒棘',
    icon: '🌵',
    el: 'poison',
    mark: 'spikes',
    color: 0xb8f06a,
    atk: 3,
    def: 4,
    desc: '背上的棘帶毒，碰到會腫一整天。'
  },
  magnetsense: {
    name: '磁感',
    icon: '🧭',
    el: 'none',
    mark: 'orb',
    color: 0xa0c0ff,
    spd: 2,
    desc: '能感覺到湖底的金屬，從不迷路。'
  },
  staticfur: {
    name: '靜電毛',
    icon: '🧶',
    el: 'storm',
    mark: 'aura',
    color: 0xdfefff,
    def: 3,
    atk: 2,
    desc: '毛會蓄電，靠近時頭髮都豎起來。'
  },
  magmacore: {
    name: '熔核',
    icon: '🌋',
    el: 'fire',
    mark: 'orb',
    color: 0xff4d1a,
    atk: 5,
    hp: 4,
    desc: '體內有一顆燒紅的核，冬天也冒著熱氣。'
  },
  frostscale: {
    name: '冰鱗',
    icon: '🧊',
    el: 'ice',
    mark: 'plates',
    color: 0xcfefff,
    def: 6,
    desc: '鱗片結成冰，刀砍上去會滑開。'
  },
  divebladder: {
    name: '深潛囊',
    icon: '🫧',
    el: 'water',
    mark: 'orb',
    color: 0x7fd8e8,
    hp: 5,
    spd: 2,
    desc: '多出一個氣囊，能潛到別人去不了的深度。'
  },
  suckerfeet: {
    name: '吸盤足',
    icon: '🐙',
    el: 'none',
    mark: 'claws',
    color: 0xc08ad0,
    def: 3,
    desc: '腳底長出吸盤，能倒著走在船底。'
  },
  inkjet: {
    name: '噴墨',
    icon: '🖤',
    el: 'none',
    mark: 'orb',
    color: 0x2a2a3a,
    spd: 3,
    def: 2,
    desc: '能噴出一團黑墨，趁機溜走。'
  },
  stoneskin: {
    name: '石化皮',
    icon: '🗿',
    el: 'earth',
    mark: 'plates',
    color: 0x6f7570,
    def: 9,
    spd: -3,
    desc: '皮膚硬得像岩石，但轉身慢了。'
  },
  twinheart: {
    name: '雙心',
    icon: '💓',
    el: 'life',
    mark: 'aura',
    color: 0xff8fa0,
    hp: 12,
    desc: '長了兩顆心臟，怎麼跑都不會喘。'
  },
  nightsight: {
    name: '夜視',
    icon: '👁',
    el: 'light',
    mark: 'orb',
    color: 0xd0ffa0,
    atk: 2,
    spd: 2,
    desc: '眼睛在夜裡會反光，黑暗對牠不存在。'
  },
  scenttrail: {
    name: '嗅跡',
    icon: '👃',
    el: 'none',
    mark: 'orb',
    color: 0xe0c090,
    spd: 2,
    desc: '能聞到三天前走過的味道。'
  },
  resonant: {
    name: '共鳴喉',
    icon: '🔊',
    el: 'none',
    mark: 'orb',
    color: 0xffd0ff,
    atk: 3,
    desc: '叫聲會讓水面震出一圈圈波紋。'
  },
  tendrils: {
    name: '捲鬚',
    icon: '🌀',
    el: 'none',
    mark: 'tail',
    color: 0x80c0a0,
    atk: 3,
    def: 2,
    desc: '身側長出會動的捲鬚，能纏住獵物。'
  },
  hydrofoil: {
    name: '水翼',
    icon: '🛶',
    el: 'water',
    mark: 'wings',
    color: 0x9fe0f0,
    spd: 6,
    desc: '鰭變成水翼，能貼著水面飛。'
  },
  sandburrow: {
    name: '沙潛',
    icon: '🏜',
    el: 'earth',
    mark: 'claws',
    color: 0xe0c48a,
    def: 3,
    spd: 1,
    desc: '幾秒鐘就能把自己埋進沙裡。'
  },
  barkskin: {
    name: '樹皮化',
    icon: '🪵',
    el: 'plant',
    mark: 'plates',
    color: 0x8a5a33,
    def: 6,
    hp: 3,
    desc: '皮膚長成樹皮，刀砍上去只留下一道白痕。'
  },
  sporecloud: {
    name: '孢子雲',
    icon: '🍄',
    el: 'plant',
    mark: 'aura',
    color: 0xd8f0a0,
    atk: 3,
    desc: '受驚時噴出一片孢子，吸到會昏昏沉沉。'
  },
  vinewhip: {
    name: '藤鞭',
    icon: '🌿',
    el: 'plant',
    mark: 'tail',
    color: 0x5fa050,
    atk: 5,
    desc: '尾巴長成一條藤，能把人從船上捲下來。'
  },
  crystalhorn: {
    name: '晶角',
    icon: '💎',
    el: 'crystal',
    mark: 'horn',
    color: 0xc1b2ee,
    atk: 5,
    def: 2,
    desc: '角是整塊異晶，夜裡會亮。'
  },
  photoskin: {
    name: '光合皮',
    icon: '☀',
    el: 'plant',
    mark: 'aura',
    color: 0xcfe88a,
    hp: 6,
    desc: '曬太陽就會飽，幾乎不用吃東西。'
  },
  heatsense: {
    name: '熱感',
    icon: '🌡',
    el: 'fire',
    mark: 'orb',
    color: 0xff9a6a,
    atk: 2,
    spd: 2,
    desc: '能看見體溫，黑暗裡也能找到獵物。'
  },
  springlegs: {
    name: '跳躍腿',
    icon: '🦘',
    el: 'none',
    mark: 'claws',
    color: 0xe8d8a8,
    spd: 5,
    atk: 1,
    desc: '後腿像彈簧，一跳能跨過小艇。'
  },
  tailclub: {
    name: '甲殼尾錘',
    icon: '🔨',
    el: 'earth',
    mark: 'tail',
    color: 0x7f6a55,
    atk: 6,
    def: 2,
    desc: '尾巴末端長了一顆骨錘。'
  },
  bladefin: {
    name: '水刃鰭',
    icon: '🗡',
    el: 'water',
    mark: 'spikes',
    color: 0xcfe8f0,
    atk: 6,
    desc: '鰭薄得像刀，游過的水面會裂開。'
  },
  electricgill: {
    name: '電鰓',
    icon: '🔋',
    el: 'storm',
    mark: 'slits',
    color: 0x8fe0ff,
    atk: 4,
    hp: 3,
    desc: '鰓會放電，碰到水裡的東西都會麻。'
  },
  ghosteyes: {
    name: '幽光眼',
    icon: '🌙',
    el: 'light',
    mark: 'orb',
    color: 0xa0ffe0,
    atk: 2,
    def: 2,
    desc: '眼睛發出幽綠的光，看一眼會做惡夢。'
  },
  bonewings: {
    name: '骨翼',
    icon: '🦇',
    el: 'wind',
    mark: 'wings',
    color: 0xe8e0d0,
    spd: 4,
    atk: 3,
    desc: '背上長出一對沒有皮的骨翼，還是能飛。'
  },
  honeygland: {
    name: '蜜腺',
    icon: '🍯',
    el: 'plant',
    mark: 'orb',
    color: 0xffc85a,
    hp: 4,
    desc: '身上滲出蜜，其他生物都想靠近牠。'
  },
  coldheart: {
    name: '寒心',
    icon: '🫀',
    el: 'ice',
    mark: 'aura',
    color: 0xb0d8ff,
    def: 4,
    hp: 4,
    desc: '心臟是冷的，血裡有不結冰的東西。'
  },
  vortexfin: {
    name: '迴旋鰭',
    icon: '🌪',
    el: 'water',
    mark: 'spikes',
    color: 0x80c8e0,
    spd: 4,
    atk: 2,
    desc: '鰭能旋轉，在水裡像一顆螺旋槳。'
  },
  crystalcore: {
    name: '異晶核',
    icon: '🔮',
    el: 'crystal',
    mark: 'orb',
    color: 0xd0a0ff,
    atk: 4,
    def: 4,
    hp: 4,
    desc: '體內結了一顆異晶，整隻微微發光。這就是突變的源頭。'
  }
};
export const BS_IDS = Object.keys(BS_GENES);
export const EVOLVE_GENES = 3; // a creature with this many can be bound into a 御獸
export const MAX_GENES = 6;
export const bsOf = g => (g && Array.isArray(g.bs) ? g.bs.filter(id => BS_GENES[id]) : []);
// genes that suit a family turn up more often in it
const AFFINITY = {
  sea: ['bladefin', 'hydrofoil', 'vortexfin', 'finclaw', 'lure', 'electricgill', 'divebladder', 'lightning'],
  deep: ['inkjet', 'ghosteyes', 'suckerfeet', 'tendrils', 'greatjaw', 'echo', 'coldheart', 'crystalcore'],
  land: ['landgill', 'springlegs', 'sandburrow', 'stoneskin', 'tailclub', 'scenttrail', 'fire', 'whiptail'],
  flora: ['barkskin', 'sporecloud', 'vinewhip', 'photoskin', 'honeygland', 'regen', 'camouflage', 'crystalhorn']
};
// Add one gene the creature does not have yet; family-suited ones twice as likely. Returns the id or null.
export function addRandomGene(genome, rng = Math.random, family = 'sea') {
  const have = new Set(bsOf(genome));
  if (have.size >= MAX_GENES) return null;
  const pool = [...BS_IDS, ...(AFFINITY[family] || [])].filter(id => !have.has(id));
  if (!pool.length) return null;
  const id = pool[Math.floor(rng() * pool.length)];
  genome.bs = [...have, id];
  return id;
}
// The offspring's genes: each parent's genes pass on half the time.
export function inheritGenes(a, b, rng = Math.random) {
  const out = [];
  for (const id of new Set([...bsOf(a), ...bsOf(b)])) if (rng() < 0.5 && out.length < MAX_GENES) out.push(id);
  return out;
}
// Stat changes from a set of genes.
export function geneStats(ids) {
  const t = { atk: 0, def: 0, spd: 0, hp: 0 };
  for (const id of ids) {
    const g = BS_GENES[id];
    if (!g) continue;
    t.atk += g.atk || 0;
    t.def += g.def || 0;
    t.spd += g.spd || 0;
    t.hp += g.hp || 0;
  }
  return t;
}
export const canEvolve = genome => bsOf(genome).length >= EVOLVE_GENES;
export const geneNames = ids => ids.map(id => BS_GENES[id]?.name).filter(Boolean);
export const FIRST_GENE_LINE = '（……噴火？閃電？這鬼世界連這種東西都有。這不是突變，這是……另一種生命的語言。）';
