// Wild low-tier 御獸 (0.22): twelve things that are not creatures any more. Most will come at you; three are
// friendly and can be fed rations until they trust you. A hostile one has to be worn down in a fight — the lower
// its strength, the better a contract's odds — and even bound it stays modest (a low level cap). The skeleton
// kind only ever rides on the drifting merchant's boat.
import { makeGenome } from './genetics.js?v=0.53.0';

export const WILD_BEASTS = {
  flamemaw: {
    name: '焰喉蜥王',
    icon: '🔥',
    kind: 'land',
    base: ['land', 0, 2],
    genes: ['fire', 'hardbody'],
    hp: 90,
    cap: 3,
    lore: '喉嚨裡燒著火的蜥獸。牠走過的沙會結成玻璃。'
  },
  stormray: {
    name: '雷鰭魟',
    icon: '⚡',
    kind: 'sea',
    base: ['sea', 1, 3],
    genes: ['lightning', 'bladefin'],
    hp: 80,
    cap: 3,
    lore: '翼緣走著電弧的魔魟。暴風雨的夜裡牠會浮上來，和閃電一起發光。'
  },
  ironshell: {
    name: '鐵甲龜翁',
    icon: '🛡',
    kind: 'sea',
    base: ['sea', 3, 1],
    genes: ['hardbody', 'boneplates', 'twinheart'],
    hp: 120,
    cap: 4,
    friendly: true,
    lore: '殼硬得像鐵的老龜。牠不打架，只是慢慢游，看起來什麼都見過。'
  },
  whipdragon: {
    name: '鞭尾海龍',
    icon: '🐉',
    kind: 'sea',
    base: ['deep', 0, 1],
    genes: ['whiptail', 'finclaw', 'greatjaw'],
    hp: 110,
    cap: 3,
    lore: '尾巴像一條鞭、鰭變成爪的海龍。被牠纏上的小艇都沒能回來。'
  },
  gillskink: {
    name: '鰓蜥',
    icon: '🫁',
    kind: 'land',
    base: ['land', 0, 1],
    genes: ['landgill', 'camouflage'],
    hp: 60,
    cap: 3,
    friendly: true,
    lore: '長出鰓的蜥獸，在岸上和水裡一樣自在。膽子小，餵牠點東西就會跟著你。'
  },
  frostdeer: {
    name: '霜息鹿',
    icon: '❄',
    kind: 'land',
    base: ['land', 1, 1],
    genes: ['frostbreath', 'crystalhorn', 'coldheart'],
    hp: 85,
    cap: 4,
    friendly: true,
    lore: '呼吸會結霜的靈鹿。牠站過的地方留下一圈白霜，角在夜裡發光。'
  },
  venomcrab: {
    name: '毒棘蟹魔',
    icon: '🌵',
    kind: 'sea',
    base: ['deep', 2, 2],
    genes: ['venomspine', 'stoneskin', 'venomfang'],
    hp: 130,
    cap: 3,
    lore: '全身長滿毒棘的蟹獸，殼硬得砲彈都彈開。被牠刺到會腫一整天。'
  },
  lampwraith: {
    name: '夜燈魘母',
    icon: '🌙',
    kind: 'sea',
    base: ['sea', 2, 3],
    genes: ['lure', 'ghosteyes', 'echo'],
    hp: 70,
    cap: 3,
    lore: '傘下掛著一盞燈的觸母。跟著那盞燈游過去的，都沒再浮上來。'
  },
  stonepangolin: {
    name: '石皮犰王',
    icon: '🗿',
    kind: 'land',
    base: ['land', 3, 1],
    genes: ['stoneskin', 'tailclub', 'sandburrow'],
    hp: 140,
    cap: 4,
    lore: '皮膚石化的犰獸，尾巴末端是一顆骨錘。牠滾下坡時整座島都在震。'
  },
  sporetreant: {
    name: '孢雲樹妖',
    icon: '🍄',
    kind: 'land',
    base: ['flora', 3, 2],
    genes: ['sporecloud', 'barkskin', 'vinewhip'],
    hp: 150,
    cap: 4,
    lore: '背上長著一片樹林的樹龜，受驚時噴出整片孢子雲。山麓的人說牠是山的脾氣。'
  },
  bonegull: {
    name: '骨翼鷗魔',
    icon: '🦇',
    kind: 'land',
    base: ['land', 2, 3],
    genes: ['bonewings', 'nightsight', 'burst'],
    hp: 65,
    cap: 3,
    lore: '翅膀只剩骨頭的鷗獸，夜裡在遺跡上空盤旋。牠的叫聲像有人在笑。'
  },
  skeleton: {
    name: '骷髏御獸',
    icon: '💀',
    kind: 'merchant',
    base: ['deep', 0, 2],
    genes: ['boneplates', 'ghosteyes', 'coldheart'],
    hp: 100,
    cap: 2,
    lore: '流浪商船上養的東西：只剩骨頭還在動的海龍。商人說牠是「看門狗」。'
  }
};
export const BEAST_IDS = Object.keys(WILD_BEASTS);
export const BEAST_SPAWN_P = 0.07; // chance that a spawn in a zone is a wild beast instead of a creature
export const isWildBeast = w => !!w?.beast;
export function makeWildBeast(id, rng = Math.random) {
  const b = WILD_BEASTS[id],
    [family, form, strain] = b.base,
    genome = makeGenome(Math.floor(rng() * 1e9), form, family, strain);
  genome.bs = [...b.genes];
  // a touch of menace in the face for the hostile ones
  if (!b.friendly) genome.temper = [230, 230];
  return { beast: id, genome, hp: b.hp, maxHp: b.hp, hostile: !b.friendly, trust: 0, feeds: 0 };
}
// which beasts a zone may spawn
export const beastsFor = zoneKind => BEAST_IDS.filter(id => WILD_BEASTS[id].kind === zoneKind);
// Contract odds on a wild beast: a friendly one by trust, a hostile one by how worn down it is.
export function beastChance(w) {
  const b = WILD_BEASTS[w.beast];
  if (!b) return 0;
  if (b.friendly) return Math.round(w.trust || 0);
  return Math.round(Math.max(5, Math.min(90, (1 - (w.hp ?? b.hp) / b.hp) * 100)));
}
export const FIRST_BEAST_LINE = '（……那是什麼鬼東西？！那不是生物，那是——牠身上的東西不該長在任何生物身上。）';
export const COMPUTER_LINE =
  '（……這裡竟然也有電腦？！一艘漂在湖上的破船，船艙裡居然亮著一台電腦。這片湖到底還藏了什麼。）';
