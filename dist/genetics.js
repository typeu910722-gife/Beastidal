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
  'lineage'
];
// Four families of four forms. The first allele of 'lineage' picks the family, the first allele of 'body' the form,
// so existing creatures (lineage absent → 0) keep their original classic species.
export const FAMILIES = ['sea', 'deep', 'land', 'flora'];
export const FAMILY_NAMES = { sea: '淺海種', deep: '深淵種', land: '陸棲種', flora: '植生突變' };
export const SPECIES = {
  sea: ['骨刃鰭獸', '裂翼魔魟', '星眸觸母', '晶甲靈龜'],
  deep: ['淵鱗海龍', '千腕觸獸', '潮鎧蟹獸', '渦殼螺獸'],
  land: ['礁岩蜥獸', '岸角靈鹿', '風翼鷗獸', '苔甲犰獸'],
  flora: ['藻鰭花獸', '花翼葉魟', '苔光燈母', '森甲樹龜']
};
export const FORMS = SPECIES.sea;
export const LINEAGE_BASE = { sea: 20, deep: 150, land: 195, flora: 235 };
export function familyOf(allele = 0) {
  return allele < 128 ? 'sea' : allele < 176 ? 'deep' : allele < 216 ? 'land' : 'flora';
}
export const speciesId = (family, form) => `${family}-${form}`;
export function allSpecies() {
  return FAMILIES.flatMap(f => SPECIES[f].map((name, form) => ({ id: speciesId(f, form), family: f, form, name })));
}
// Old saves: give every genome the lineage locus so breeding and validation see 17 loci.
export function normalizeGenome(g) {
  if (g && !Array.isArray(g.lineage)) g.lineage = [0, 0];
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
export function makeGenome(seed, form, family = 'sea') {
  const r = seeded(seed),
    g = {};
  for (const key of LOCI) g[key] = [Math.floor(r() * 256), Math.floor(r() * 256)];
  if (form !== undefined) g.body = [form * 64 + 20, form * 64 + 20];
  g.lineage = [LINEAGE_BASE[family] ?? 20, LINEAGE_BASE[family] ?? 20];
  g.temper = [50 + Math.floor(r() * 100), 50 + Math.floor(r() * 100)];
  return g;
}
export function phenotype(g) {
  const v = k => (g[k][0] + g[k][1]) / 2 / 255,
    lin = g.lineage || [0, 0],
    family = familyOf(lin[0]),
    form = Math.min(3, Math.floor(g.body[0] / 64));
  return {
    family,
    secondFamily: familyOf(lin[1]),
    species: speciesId(family, form),
    habitat: family === 'land' ? 'land' : 'sea',
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
    hue: v('hue'),
    glow: 0.15 + v('glow') * 0.85,
    size: 0.75 + v('size') * 0.9,
    speed: Math.round(20 + v('speed') * 80),
    armor: Math.round(20 + v('armor') * 80),
    affinity: Math.round(20 + v('affinity') * 80),
    temper: v('temper'),
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
  return prefix + feature + SPECIES[p.family][p.body] + (p.fusion || p.family !== p.secondFamily ? '・混種' : '');
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
    p.fusion ? SPECIES[p.family][p.body] + ' × ' + SPECIES[p.secondFamily][p.secondary] : SPECIES[p.family][p.body],
    FAMILY_NAMES[p.family] + (p.secondFamily !== p.family ? ' × ' + FAMILY_NAMES[p.secondFamily] : ''),
    ['短鰭', '羽鰭', '翼鰭', '絲鰭'][p.fin],
    ['扇尾', '雙尾', '長尾', '棘尾'][p.tail],
    p.horn ? `${p.horn + 1} 組骨棘` : '晶觸角',
    p.glow > 0.6 ? '高生物光' : '微光'
  ];
}
export function genomeValid(g) {
  return (
    g &&
    LOCI.every(
      k =>
        (k === 'lineage' && g[k] === undefined) ||
        (Array.isArray(g[k]) && g[k].length === 2 && g[k].every(v => Number.isInteger(v) && v >= 0 && v <= 255))
    )
  );
}
