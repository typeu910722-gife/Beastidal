// Diploid genome: 16 independent loci, two 8-bit alleles per locus.
// 256^32 possible ordered encodings; rendered phenotypes deliberately share traits.
export const LOCI = [
  'body',
  'fin',
  'tail',
  'horn',
  'eyes',
  'pattern',
  'hue',
  'glow',
  'size',
  'speed',
  'armor',
  'affinity',
  'temper',
  'fertility',
  'lure',
  'ability',
  // Added in 0.10. Older genomes have no lineage locus and read as the classic sea family ([0, 0]).
  'lineage',
  // Added in 0.21: the strain within a form picks one of four species (64 base species in all).
  'strain'
];
// Four families of four forms. The first allele of 'lineage' picks the family, the first allele of 'body' the form,
// so existing creatures (lineage absent → 0) keep their original classic species.
export const FAMILIES = ['sea', 'deep', 'land', 'flora'];
export const FAMILY_NAMES = { sea: '淺海種', deep: '深淵種', land: '陸棲種', flora: '植生突變' };
// 0.21: sixteen species per family — four forms × four strains (index = form * 4 + strain). Strain 3 is rare.
export const SPECIES = {
  sea: [
    '骨刃鰭獸',
    '銀梭鰭獸',
    '赤鬃鰭獸',
    '雷紋鰭獸',
    '裂翼魔魟',
    '月影魔魟',
    '砂紋魔魟',
    '焰緣魔魟',
    '星眸觸母',
    '霧鈴觸母',
    '琉璃觸母',
    '夜燈觸母',
    '晶甲靈龜',
    '苔背靈龜',
    '潮紋靈龜',
    '金棱靈龜'
  ],
  deep: [
    '淵鱗海龍',
    '黑潮海龍',
    '冥火海龍',
    '骨冠海龍',
    '千腕觸獸',
    '寒淵觸獸',
    '墨霧觸獸',
    '虹腕觸獸',
    '潮鎧蟹獸',
    '熔殼蟹獸',
    '棘王蟹獸',
    '幽光蟹獸',
    '渦殼螺獸',
    '沉鐘螺獸',
    '稜晶螺獸',
    '深歌螺獸'
  ],
  land: [
    '礁岩蜥獸',
    '沙丘蜥獸',
    '赤斑蜥獸',
    '雷鱗蜥獸',
    '岸角靈鹿',
    '霜角靈鹿',
    '林影靈鹿',
    '晶角靈鹿',
    '風翼鷗獸',
    '暴羽鷗獸',
    '雪喉鷗獸',
    '夜哨鷗獸',
    '苔甲犰獸',
    '岩甲犰獸',
    '鐵背犰獸',
    '曜晶犰獸'
  ],
  flora: [
    '藻鰭花獸',
    '蕨鰭花獸',
    '蓮冠花獸',
    '棘藤花獸',
    '花翼葉魟',
    '枯葉葉魟',
    '楓紅葉魟',
    '荊棘葉魟',
    '苔光燈母',
    '孢雲燈母',
    '螢蕊燈母',
    '蜜露燈母',
    '森甲樹龜',
    '根鬚樹龜',
    '果實樹龜',
    '古木樹龜'
  ]
};
export const FORMS = SPECIES.sea;
export const LINEAGE_BASE = { sea: 20, deep: 150, land: 195, flora: 235 };
export function familyOf(allele = 0) {
  return allele < 128 ? 'sea' : allele < 176 ? 'deep' : allele < 216 ? 'land' : 'flora';
}
export const speciesId = (family, form, strain = 0) => `${family}-${form}-${strain}`;
export function allSpecies() {
  return FAMILIES.flatMap(f =>
    SPECIES[f].map((name, i) => ({
      id: speciesId(f, Math.floor(i / 4), i % 4),
      family: f,
      form: Math.floor(i / 4),
      strain: i % 4,
      name
    }))
  );
}
// Old saves: give every genome the lineage locus so breeding and validation see 17 loci.
export function normalizeGenome(g) {
  if (g && !Array.isArray(g.lineage)) g.lineage = [0, 0];
  if (g && !Array.isArray(g.strain)) g.strain = [0, 0];
  return g;
}
export const ABILITIES = ['拾荒者', '守護者', '產珊者', '深潛者'];
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function makeGenome(seed, form, family = 'sea', strain) {
  const r = seeded(seed),
    g = {};
  for (const key of LOCI) g[key] = [Math.floor(r() * 256), Math.floor(r() * 256)];
  if (form !== undefined) g.body = [form * 64 + 20, form * 64 + 20];
  g.lineage = [LINEAGE_BASE[family] ?? 20, LINEAGE_BASE[family] ?? 20];
  if (strain !== undefined) g.strain = [strain * 64 + 20, strain * 64 + 20];
  g.temper = [50 + Math.floor(r() * 100), 50 + Math.floor(r() * 100)];
  return g;
}
export function phenotype(g) {
  const v = k => (g[k][0] + g[k][1]) / 2 / 255,
    lin = g.lineage || [0, 0],
    family = familyOf(lin[0]),
    form = Math.min(3, Math.floor(g.body[0] / 64)),
    strain = Math.min(3, Math.floor((g.strain || [0, 0])[0] / 64));
  return {
    family,
    secondFamily: familyOf(lin[1]),
    species: speciesId(family, form, strain),
    strain,
    // plant mutants moved ashore in 0.21: land and flora live on the islands and the foothills
    habitat: family === 'land' || family === 'flora' ? 'land' : 'sea',
    // Plant growth also shows up as a recessive trait when only the second lineage allele is floral.
    flora: family === 'flora' ? 1 : familyOf(lin[1]) === 'flora' ? 0.4 : 0,
    body: form,
    secondary: Math.min(3, Math.floor(g.body[1] / 64)),
    fusion: Math.floor(g.body[0] / 64) !== Math.floor(g.body[1] / 64) ? 1 : 0,
    fin: Math.min(3, Math.floor(v('fin') * 4)),
    tail: Math.min(3, Math.floor(v('tail') * 4)),
    horn: Math.floor(v('horn') * 4),
    eyes: 2 + Math.floor(v('eyes') * 3),
    pattern: Math.min(3, Math.floor(v('pattern') * 4)),
    // each strain keeps to its own band of colour, so the four species of a form look apart
    hue: (v('hue') * 0.3 + strain * 0.25) % 1,
    glow: Math.min(1, 0.15 + v('glow') * 0.85 + (strain === 3 ? 0.3 : 0)),
    size: 0.75 + v('size') * 0.9 + (strain === 3 ? 0.15 : 0),
    speed: Math.round(20 + v('speed') * 80),
    armor: Math.round(20 + v('armor') * 80),
    affinity: Math.round(20 + v('affinity') * 80),
    temper: v('temper'),
    // 0 docile … 1 savage: hot temper, deep-sea blood and heavy horns all show in the face (brows, fangs, scars)
    fierce:
      Math.round(
        Math.max(
          0,
          Math.min(
            1,
            (v('temper') - 0.4) * 2.5 +
              (family === 'deep' ? 0.65 : 0) +
              (familyOf(lin[1]) === 'deep' && family !== 'deep' ? 0.2 : 0) +
              (v('horn') >= 0.75 ? 0.2 : 0)
          )
        ) * 100
      ) / 100,
    fertility: v('fertility'),
    lure: v('lure'),
    ability: Math.min(3, Math.floor(v('ability') * 4))
  };
}
export function geneName(g) {
  const p = phenotype(g),
    colors = ['赤潮', '琥珀', '青芽', '碧海', '琉光', '暮紫', '緋霧'];
  const prefix = colors[Math.min(6, Math.floor(p.hue * 7))];
  const feature = p.horn > 1 ? '角' : p.glow > 0.6 ? '燈' : p.fin > 1 ? '翼' : '紋';
  return (
    prefix +
    feature +
    SPECIES[p.family][p.body * 4 + p.strain] +
    (p.fusion || p.family !== p.secondFamily ? '・混種' : '')
  );
}
export function dnaCode(g) {
  let a = 2166136261;
  for (const k of LOCI) {
    // Keep pre-0.10 codes stable: a missing or classic [0,0] lineage does not enter the hash.
    if (k === 'lineage' && (!g[k] || (g[k][0] === 0 && g[k][1] === 0))) continue;
    for (const v of g[k]) {
      a ^= v;
      a = Math.imul(a, 16777619);
    }
  }
  return (a >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
export function crossGenome(parentA, parentB, rng = Math.random, mutationRate = 0.045) {
  normalizeGenome(parentA);
  normalizeGenome(parentB);
  const genome = {};
  let mutations = 0;
  for (const k of LOCI) {
    genome[k] = [parentA[k][rng() < 0.5 ? 0 : 1], parentB[k][rng() < 0.5 ? 0 : 1]];
    for (let i = 0; i < 2; i++)
      if (rng() < mutationRate) {
        const old = genome[k][i];
        genome[k][i] = (old + 1 + Math.floor(rng() * 255)) % 256;
        mutations++;
      }
  }
  return { genome, mutations };
}
export function describeGenes(g) {
  const p = phenotype(g);
  return [
    p.fusion
      ? SPECIES[p.family][p.body * 4 + p.strain] + ' × ' + SPECIES[p.secondFamily][p.secondary * 4 + p.strain]
      : SPECIES[p.family][p.body * 4 + p.strain],
    FAMILY_NAMES[p.family] + (p.secondFamily !== p.family ? ' × ' + FAMILY_NAMES[p.secondFamily] : ''),
    ['短鰭', '羽鰭', '翼鰭', '絲鰭'][p.fin],
    ['扇尾', '雙尾', '長尾', '棘尾'][p.tail],
    p.horn ? `${p.horn + 1} 組骨棘` : '晶觸角',
    p.glow > 0.6 ? '高生物光' : '微光',
    p.fierce >= 0.55 ? '性情兇猛' : p.fierce >= 0.35 ? '性情警戒' : '性情溫順'
  ];
}
export function genomeValid(g) {
  return (
    g &&
    LOCI.every(
      k =>
        ((k === 'lineage' || k === 'strain') && g[k] === undefined) ||
        (Array.isArray(g[k]) && g[k].length === 2 && g[k].every(v => Number.isInteger(v) && v >= 0 && v <= 255))
    )
  );
}
